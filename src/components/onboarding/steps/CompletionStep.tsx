import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, ArrowRight, Mail, Shield, ShoppingCart, CreditCard } from "lucide-react";
import { EmailConnection } from "./ConnectEmailStep";
import { SupplierEmail } from "./SupplierEmailStep";

interface CompletionStepProps {
  amazonConnected: boolean;
  emailConnections: EmailConnection[];
  supplierEmails: SupplierEmail[];
  paymentMethodAdded: boolean;
  onComplete: () => void;
  isSaving: boolean;
}

const CompletionStep = ({
  amazonConnected,
  emailConnections,
  supplierEmails,
  paymentMethodAdded,
  onComplete,
  isSaving
}: CompletionStepProps) => {
  return (
    <div className="text-center space-y-6">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
        <CheckCircle2 className="h-8 w-8 text-green-500" />
      </div>
      <h2 className="text-2xl font-bold">You're All Set!</h2>
      <p className="text-muted-foreground">
        Your account is configured and ready to start recovering your Amazon reimbursements.
      </p>

      <div className="grid gap-3 text-left max-w-md mx-auto">
        {/* 1. Email Accounts Status */}
        <div className={`flex items-center gap-3 p-3 border rounded-lg ${emailConnections.length > 0 ? 'bg-green-500/5 border-green-500/20' : 'bg-muted/40 border-dashed'}`}>
          {emailConnections.length > 0 ? (
            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
          ) : (
            <Mail className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          )}
          <span className={emailConnections.length === 0 ? "text-muted-foreground" : ""}>
            {emailConnections.length > 0 
              ? `${emailConnections.length} email account(s) connected` 
              : "No email accounts connected"}
          </span>
        </div>

        {/* 2. Supplier Emails Status */}
        <div className={`flex items-center gap-3 p-3 border rounded-lg ${supplierEmails.length > 0 ? 'bg-green-500/5 border-green-500/20' : 'bg-muted/40 border-dashed'}`}>
          {supplierEmails.length > 0 ? (
            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
          ) : (
            <Shield className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          )}
          <span className={supplierEmails.length === 0 ? "text-muted-foreground" : ""}>
            {supplierEmails.length > 0 
              ? `${supplierEmails.length} supplier email(s) configured` 
              : "No supplier emails added"}
          </span>
        </div>

        {/* 3. Amazon Status */}
        <div className={`flex items-center gap-3 p-3 border rounded-lg ${amazonConnected ? 'bg-green-500/5 border-green-500/20' : 'bg-muted/40 border-dashed'}`}>
          {amazonConnected ? (
            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
          ) : (
            <ShoppingCart className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          )}
          <span className={!amazonConnected ? "text-muted-foreground" : ""}>
            {amazonConnected ? "Amazon account connected" : "Amazon connection skipped"}
          </span>
        </div>

        {/* 4. Payment Status */}
        <div className={`flex items-center gap-3 p-3 border rounded-lg ${paymentMethodAdded ? 'bg-green-500/5 border-green-500/20' : 'bg-muted/40 border-dashed'}`}>
          {paymentMethodAdded ? (
            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
          ) : (
            <CreditCard className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          )}
          <span className={!paymentMethodAdded ? "text-muted-foreground" : ""}>
            {paymentMethodAdded ? "Payment method saved" : "Payment setup skipped"}
          </span>
        </div>
      </div>

      <Button size="lg" onClick={onComplete} disabled={isSaving} className="w-full max-w-md">
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Finishing setup...
          </>
        ) : (
          <>
            Go to Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );
};

export default CompletionStep;