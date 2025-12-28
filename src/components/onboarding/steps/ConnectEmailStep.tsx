import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";

export interface EmailConnection {
  email: string;
  provider: 'gmail' | 'outlook';
}

interface ConnectEmailStepProps {
  emailConnections: EmailConnection[];
  checkingEmails: boolean;
  onConnectGmail: () => void;
  onConnectOutlook: () => void;
  maxAccounts: number;
}

const ConnectEmailStep = ({
  emailConnections,
  checkingEmails,
  onConnectGmail,
  onConnectOutlook,
  maxAccounts
}: ConnectEmailStepProps) => {
  const canAddMoreEmails = emailConnections.length < maxAccounts;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/10 mb-4">
          <Mail className="h-8 w-8 text-blue-500" />
        </div>
        <h2 className="text-2xl font-bold">Connect Your Email</h2>
        <p className="text-muted-foreground mt-2">
          Connect your email accounts to automatically extract invoices from your suppliers.
        </p>
      </div>

      {checkingEmails ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {emailConnections.length > 0 && (
            <div className="space-y-3">
              <Label>Connected Accounts ({emailConnections.length}/{maxAccounts})</Label>
              {emailConnections.map((conn, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg bg-green-500/5 border-green-500/20">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{conn.email}</p>
                    <p className="text-xs text-muted-foreground capitalize">{conn.provider}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {canAddMoreEmails && (
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={onConnectGmail}>
                <Mail className="h-6 w-6 text-red-500" />
                <span>Connect Gmail</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={onConnectOutlook}>
                <Mail className="h-6 w-6 text-blue-500" />
                <span>Connect Outlook</span>
              </Button>
            </div>
          )}

          {emailConnections.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">
              Connect at least one email account to continue
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default ConnectEmailStep;