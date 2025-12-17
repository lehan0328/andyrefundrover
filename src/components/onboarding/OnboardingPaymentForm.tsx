import { useState } from "react";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface OnboardingPaymentFormProps {
  onSuccess: () => void;
}

const OnboardingPaymentForm = ({ onSuccess }: OnboardingPaymentFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [paymentElementReady, setPaymentElementReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    try {
      // Trigger form validation and wallet collection
      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw new Error(submitError.message);
      }

      // Confirm the setup
      const { error: confirmError, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/onboarding`,
        },
        redirect: "if_required",
      });

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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border rounded-lg p-4 bg-background min-h-[200px]">
        <PaymentElement 
          onReady={() => {
            setPaymentElementReady(true);
          }}
          onLoadError={(error) => {
            console.error("OnboardingPaymentForm: PaymentElement load error", error);
          }}
        />
      </div>
      
      <Button
        type="submit"
        disabled={!stripe || !paymentElementReady || isLoading}
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

export default OnboardingPaymentForm;
