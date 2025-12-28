import { Loader2, CreditCard, CheckCircle2, AlertCircle, Lock } from "lucide-react";
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
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
          <CreditCard className="h-8 w-8 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold">Set Up Payment Method</h2>
        <p className="text-muted-foreground mt-2">
          Add a card to enable automatic billing when we recover your reimbursements.
        </p>
      </div>

      {checkingPayment || stripeLoading || fetchingClientSecret ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : paymentMethodAdded ? (
        <div className="border rounded-lg p-6 text-center bg-green-500/5 border-green-500/20">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <p className="font-medium text-green-600">Payment method added!</p>
          <p className="text-sm text-muted-foreground mt-1">
            Your card is securely stored for billing.
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
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
            <Lock className="h-4 w-4" />
            <span>Secured by Stripe</span>
          </div>
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <OnboardingPaymentForm onSuccess={onSuccess} />
          </Elements>
        </div>
      ) : (
        <div className="text-center text-muted-foreground">
          Payment setup unavailable. Please contact support.
        </div>
      )}
    </div>
  );
};

export default PaymentMethodStep;