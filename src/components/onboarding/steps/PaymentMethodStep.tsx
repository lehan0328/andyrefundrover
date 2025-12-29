import { Loader2, CreditCard, CheckCircle2, AlertCircle, Lock, ShieldCheck } from "lucide-react";
import { Elements } from "@stripe/react-stripe-js";
import { Stripe } from "@stripe/stripe-js";
import OnboardingPaymentForm from "@/components/onboarding/OnboardingPaymentForm";

interface PaymentMethodStepProps {
  paymentMethodAdded: boolean;
  checkingPayment: boolean;
  stripePromise: Promise<Stripe | null> | null;
  clientSecret: string | null;
  stripeError: string | null;
  stripeLoading: boolean;
  fetchingClientSecret: boolean;
  onSuccess: () => void;
}

const PaymentMethodStep = ({
  paymentMethodAdded,
  checkingPayment,
  stripePromise,
  clientSecret,
  stripeError,
  stripeLoading,
  fetchingClientSecret,
  onSuccess
}: PaymentMethodStepProps) => {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10">
          <CreditCard className="h-8 w-8 text-green-600" />
        </div>
        
        <div>
          <h2 className="text-2xl font-bold">Set Up Payment Method</h2>
          
          {/* Optimization: Risk-Free Messaging */}
          <div className="mt-4 bg-green-50 border border-green-100 rounded-lg p-3 max-w-sm mx-auto">
            <div className="flex items-center justify-center gap-2 text-green-700 font-medium mb-1">
              <ShieldCheck className="h-4 w-4" />
              <span>No Upfront Charges</span>
            </div>
            <p className="text-sm text-green-600/90">
              We only charge a success fee when we successfully recover money for you.
            </p>
          </div>
        </div>
      </div>

      {checkingPayment || stripeLoading || fetchingClientSecret ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
        </div>
      ) : paymentMethodAdded ? (
        <div className="border rounded-lg p-8 text-center bg-green-500/5 border-green-500/20 animate-in zoom-in-50 duration-300">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <p className="font-medium text-green-600 text-lg">Payment method secured!</p>
          <p className="text-sm text-muted-foreground mt-1">
            Your card is stored securely. You're ready to start recovering funds.
          </p>
        </div>
      ) : stripeError ? (
        <div className="border rounded-lg p-6 text-center border-destructive/20 bg-destructive/5">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
          <p className="font-medium text-destructive">{stripeError}</p>
          <p className="text-sm text-muted-foreground mt-2">
            You can skip this step and add a payment method later from Settings.
          </p>
        </div>
      ) : stripePromise && clientSecret ? (
        <div className="space-y-6">
          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <OnboardingPaymentForm onSuccess={onSuccess} />
            </Elements>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            <span>Bank-grade encryption via Stripe. Your card details never touch our servers.</span>
          </div>
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-8">
          Payment setup unavailable. Please contact support.
        </div>
      )}
    </div>
  );
};

export default PaymentMethodStep;