import { useState, useEffect } from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface OnboardingCardFormProps {
  onSuccess: () => void;
}

const OnboardingCardForm = ({ onSuccess }: OnboardingCardFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [cardReady, setCardReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  // Log Stripe initialization state
  useEffect(() => {
    console.log("OnboardingCardForm: Stripe state", { 
      stripeLoaded: !!stripe, 
      elementsLoaded: !!elements,
      cardReady 
    });
  }, [stripe, elements, cardReady]);

  // Timeout fallback - if card doesn't load in 15 seconds, show retry option
  useEffect(() => {
    if (!cardReady && stripe && elements) {
      const timeout = setTimeout(() => {
        if (!cardReady) {
          console.warn("OnboardingCardForm: CardElement timed out");
          setTimedOut(true);
        }
      }, 15000);
      return () => clearTimeout(timeout);
    }
  }, [cardReady, stripe, elements]);

  const handleRetry = () => {
    setTimedOut(false);
    setCardReady(false);
    // Force re-mount by toggling state
    window.location.reload();
  };

  // Get computed colors from CSS variables for Stripe Elements (which run in iframe)
  const getComputedColor = (cssVar: string) => {
    const root = document.documentElement;
    const style = getComputedStyle(root);
    const hslValue = style.getPropertyValue(cssVar).trim();
    if (hslValue) {
      return `hsl(${hslValue})`;
    }
    return undefined;
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: "16px",
        color: getComputedColor("--foreground") || "#1a1a1a",
        backgroundColor: "transparent",
        "::placeholder": {
          color: getComputedColor("--muted-foreground") || "#737373",
        },
        iconColor: getComputedColor("--foreground") || "#1a1a1a",
      },
      invalid: {
        color: getComputedColor("--destructive") || "#dc2626",
        iconColor: getComputedColor("--destructive") || "#dc2626",
      },
    },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    try {
      // Create setup intent
      const { data: setupData, error: setupError } = await supabase.functions.invoke(
        "create-setup-intent"
      );

      if (setupError || !setupData?.clientSecret) {
        throw new Error(setupError?.message || "Failed to create setup intent");
      }

      // Confirm card setup
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error("Card element not found");
      }

      const { error: confirmError, setupIntent } = await stripe.confirmCardSetup(
        setupData.clientSecret,
        {
          payment_method: {
            card: cardElement,
          },
        }
      );

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      if (setupIntent?.payment_method) {
        // Save the payment method
        const { error: saveError } = await supabase.functions.invoke(
          "save-payment-method",
          {
            body: { paymentMethodId: setupIntent.payment_method },
          }
        );

        if (saveError) {
          throw new Error(saveError.message || "Failed to save payment method");
        }

        toast({
          title: "Payment method saved",
          description: "Your card has been securely saved for billing.",
        });

        onSuccess();
      }
    } catch (error) {
      console.error("Error saving card:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save payment method",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading until Stripe is fully initialized
  if (!stripe || !elements) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading payment form...</span>
      </div>
    );
  }

  // Timeout fallback
  if (timedOut && !cardReady) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <p className="text-muted-foreground text-center">
          Payment form is taking longer than expected to load.
        </p>
        <Button onClick={handleRetry} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!cardReady && (
        <div className="flex justify-center items-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">Loading card input...</span>
        </div>
      )}
      <div className="border rounded-lg p-4 bg-background min-h-[50px]">
        <CardElement 
          options={cardElementOptions} 
          onReady={() => {
            console.log("OnboardingCardForm: CardElement ready");
            setCardReady(true);
          }}
          onLoadError={(error) => {
            console.error("OnboardingCardForm: CardElement load error", error);
          }}
          onChange={(event) => {
            if (event.error) {
              console.error("OnboardingCardForm: CardElement error", event.error);
            }
          }}
        />
      </div>
      
      <Button
        type="submit"
        disabled={!stripe || isLoading}
        className="w-full"
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving card...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Save Payment Method
          </>
        )}
      </Button>
    </form>
  );
};

export default OnboardingCardForm;
