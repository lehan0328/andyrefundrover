import { Button } from "@/components/ui/button";
import { Loader2, ShoppingCart, CheckCircle2 } from "lucide-react";

interface ConnectAmazonStepProps {
  amazonConnected: boolean;
  checkingAmazon: boolean;
  onConnectAmazon: () => void;
}

const ConnectAmazonStep = ({
  amazonConnected,
  checkingAmazon,
  onConnectAmazon
}: ConnectAmazonStepProps) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-500/10 mb-4">
          <ShoppingCart className="h-8 w-8 text-orange-500" />
        </div>
        <h2 className="text-2xl font-bold">Connect Your Amazon Account</h2>
        <p className="text-muted-foreground mt-2">
          Connect your Amazon Seller account to automatically sync your FBA shipments and detect discrepancies.
        </p>
      </div>

      {checkingAmazon ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : amazonConnected ? (
        <div className="border rounded-lg p-6 text-center bg-green-500/5 border-green-500/20">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <p className="font-medium text-green-600">Amazon account connected!</p>
          <p className="text-sm text-muted-foreground mt-1">
            Your Amazon seller account is ready to sync shipments.
          </p>
        </div>
      ) : (
        <div className="border rounded-lg p-6 text-center border-dashed">
          <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">
            Click below to securely connect your Amazon Seller account
          </p>
          <Button onClick={onConnectAmazon} size="lg">
            Connect Amazon Seller Account
          </Button>
        </div>
      )}
    </div>
  );
};

export default ConnectAmazonStep;