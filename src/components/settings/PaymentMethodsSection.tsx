import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

interface PaymentMethodInfo {
  hasPaymentMethod: boolean;
  card: {
    last4: string | null;
    brand: string | null; 
  } | null;
}

function PaymentForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [paymentElementReady, setPaymentElementReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    try {
      // Trigger form validation
      const { error: submitError } = await elements.submit();
      if (submitError) throw new Error(submitError.message);

      // Confirm card setup
      const { setupIntent, error: confirmError } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/settings`,
        },
        redirect: "if_required",
      });

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
      <div className="p-4 border rounded-lg bg-background min-h-[200px]">
        <PaymentElement 
          onReady={() => {
            setPaymentElementReady(true);
          }}
          onLoadError={(error) => {
            console.error("PaymentForm: PaymentElement load error", error);
          }}
        />
      </div>
      <Button type="submit" disabled={!stripe || !paymentElementReady || loading} className="w-full">
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
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [fetchingClientSecret, setFetchingClientSecret] = useState(false);

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

  // Fetch clientSecret when showing add card form
  useEffect(() => {
    const fetchClientSecret = async () => {
      if (!showAddCard || !stripePromise || clientSecret) return;
      
      setFetchingClientSecret(true);
      try {
        const { data, error } = await supabase.functions.invoke("create-setup-intent");
        if (error) throw error;
        
        if (data?.clientSecret) {
          setClientSecret(data.clientSecret);
        }
      } catch (error) {
        console.error("Error creating setup intent:", error);
        toast.error("Failed to initialize payment form");
      } finally {
        setFetchingClientSecret(false);
      }
    };
    
    fetchClientSecret();
  }, [showAddCard, stripePromise, clientSecret]);

  // Also fetch clientSecret if there's no payment method
  useEffect(() => {
    const fetchClientSecretForNew = async () => {
      if (loading || stripeLoading || paymentMethod?.hasPaymentMethod || clientSecret) return;
      if (!stripePromise) return;
      
      setFetchingClientSecret(true);
      try {
        const { data, error } = await supabase.functions.invoke("create-setup-intent");
        if (error) throw error;
        
        if (data?.clientSecret) {
          setClientSecret(data.clientSecret);
        }
      } catch (error) {
        console.error("Error creating setup intent:", error);
      } finally {
        setFetchingClientSecret(false);
      }
    };
    
    fetchClientSecretForNew();
  }, [loading, stripeLoading, paymentMethod, stripePromise, clientSecret]);

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
    setClientSecret(null); // Reset so a new one is fetched next time
    loadPaymentMethod();
  };

  const handleShowAddCard = () => {
    setClientSecret(null); // Reset clientSecret when showing form
    setShowAddCard(true);
  };

  const formatCardBrand = (brand: string | null) => {
    if (!brand) return "Payment Method"; // Fallback for Cash App or others
    
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
          <Button variant="outline" size="sm" onClick={handleShowAddCard}>
            <Plus className="h-4 w-4 mr-1" />
            Update Card
          </Button>
        )}
      </div>

      {paymentMethod?.hasPaymentMethod && paymentMethod.card && !showAddCard ? (
        <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
          <CreditCard className="h-8 w-8 text-primary" />
          <div>
            {/* 3. Update the display logic to handle missing last4 */}
            <p className="font-medium">
              {formatCardBrand(paymentMethod.card.brand)} 
              {paymentMethod.card.last4 ? ` ending in ${paymentMethod.card.last4}` : ""}
            </p>
            <p className="text-sm text-muted-foreground">Default payment method</p>
          </div>
          <Badge variant="secondary" className="ml-auto">Active</Badge>
        </div>
      ) : (
        <>
          {fetchingClientSecret ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading payment form...</span>
            </div>
          ) : clientSecret ? (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              {showAddCard || !paymentMethod?.hasPaymentMethod ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Add a card to enable automatic billing for your weekly reimbursement fees.
                  </p>
                  <PaymentForm onSuccess={handleCardSaved} />
                  {showAddCard && (
                    <Button variant="ghost" onClick={() => setShowAddCard(false)} className="w-full">
                      Cancel
                    </Button>
                  )}
                </div>
              ) : null}
            </Elements>
          ) : (
            <div className="text-center text-muted-foreground py-4">
              Unable to load payment form. Please try again later.
            </div>
          )}
        </>
      )}
    </Card>
  );
}
