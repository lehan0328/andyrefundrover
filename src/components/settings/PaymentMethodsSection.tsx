import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

interface PaymentMethodInfo {
  hasPaymentMethod: boolean;
  card: {
    last4: string;
    brand: string;
  } | null;
}

function CardForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

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
    if (!stripe || !elements) return;

    setLoading(true);
    try {
      // First create Stripe customer if needed
      const { error: customerError } = await supabase.functions.invoke("create-stripe-customer");
      if (customerError) {
        console.error("Customer creation error:", customerError);
      }

      // Create setup intent
      const { data: setupData, error: setupError } = await supabase.functions.invoke("create-setup-intent");
      if (setupError) throw new Error(setupError.message);

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not found");

      // Confirm card setup
      const { setupIntent, error: confirmError } = await stripe.confirmCardSetup(
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
        // Save payment method
        const { error: saveError } = await supabase.functions.invoke("save-payment-method", {
          body: { paymentMethodId: setupIntent.payment_method },
        });

        if (saveError) throw new Error(saveError.message);

        toast.success("Card saved successfully!");
        onSuccess();
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save card";
      console.error("Error saving card:", errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border rounded-lg bg-background">
        <CardElement options={cardElementOptions} />
      </div>
      <Button type="submit" disabled={!stripe || loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Card"
        )}
      </Button>
    </form>
  );
}

export function PaymentMethodsSection() {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [stripeLoading, setStripeLoading] = useState(true);

  // Fetch Stripe publishable key from edge function
  useEffect(() => {
    const fetchStripeKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-stripe-publishable-key");
        if (error) throw error;
        if (data?.publishableKey) {
          setStripePromise(loadStripe(data.publishableKey));
        } else {
          console.error("No publishable key returned");
        }
      } catch (error) {
        console.error("Error fetching Stripe publishable key:", error);
      } finally {
        setStripeLoading(false);
      }
    };
    fetchStripeKey();
  }, []);

  const loadPaymentMethod = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("get-payment-method");
      if (error) throw error;
      setPaymentMethod(data);
    } catch (error) {
      console.error("Error loading payment method:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPaymentMethod();
  }, []);

  const handleCardSaved = () => {
    setShowAddCard(false);
    loadPaymentMethod();
  };

  const formatCardBrand = (brand: string) => {
    const brands: Record<string, string> = {
      visa: "Visa",
      mastercard: "Mastercard",
      amex: "American Express",
      discover: "Discover",
    };
    return brands[brand.toLowerCase()] || brand;
  };

  if (loading || stripeLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading payment methods...</span>
        </div>
      </Card>
    );
  }

  if (!stripePromise) {
    return (
      <Card className="p-6">
        <div className="text-muted-foreground">
          Payment methods unavailable. Please contact support.
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Payment Methods</h3>
        </div>
        {paymentMethod?.hasPaymentMethod && !showAddCard && (
          <Button variant="outline" size="sm" onClick={() => setShowAddCard(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Update Card
          </Button>
        )}
      </div>

      {paymentMethod?.hasPaymentMethod && paymentMethod.card && !showAddCard ? (
        <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
          <CreditCard className="h-8 w-8 text-primary" />
          <div>
            <p className="font-medium">
              {formatCardBrand(paymentMethod.card.brand)} ending in {paymentMethod.card.last4}
            </p>
            <p className="text-sm text-muted-foreground">Default payment method</p>
          </div>
          <Badge variant="secondary" className="ml-auto">Active</Badge>
        </div>
      ) : (
        <Elements stripe={stripePromise}>
          {showAddCard || !paymentMethod?.hasPaymentMethod ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Add a card to enable automatic billing for your weekly reimbursement fees.
              </p>
              <CardForm onSuccess={handleCardSaved} />
              {showAddCard && (
                <Button variant="ghost" onClick={() => setShowAddCard(false)} className="w-full">
                  Cancel
                </Button>
              )}
            </div>
          ) : null}
        </Elements>
      )}
    </Card>
  );
}
