import { Badge } from "@/components/ui/badge";
import { Sparkles, Clock, ShoppingCart, Mail, CreditCard, Shield, DollarSign } from "lucide-react";

const WelcomeStep = () => {
  return (
    <div className="text-center space-y-6">
      <div className="flex flex-col items-center gap-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          Takes only 5 minutes
        </Badge>
      </div>
      <h1 className="text-3xl font-bold">Welcome to Auren Reimbursements</h1>
      <p className="text-muted-foreground text-lg max-w-md mx-auto">
        Complete this quick setup to start recovering your Amazon reimbursements automatically.
        <span className="font-medium text-foreground"> Save hours of manual work every week.</span>
      </p>
      <div className="grid gap-4 text-left max-w-md mx-auto pt-4">
        <div className="flex items-start gap-3">
          <Mail className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="font-medium">Connect Email</p>
            <p className="text-sm text-muted-foreground">Auto-extract invoices from Gmail or Outlook</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="font-medium">Privacy First</p>
            <p className="text-sm text-muted-foreground">We only scan emails from suppliers you specify</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <ShoppingCart className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="font-medium">Connect Amazon</p>
            <p className="text-sm text-muted-foreground">Sync your FBA shipments automatically</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <CreditCard className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="font-medium">Set Up Billing</p>
            <p className="text-sm text-muted-foreground">Secure card storage for automatic billing</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <DollarSign className="h-5 w-5 text-green-500 mt-0.5" />
          <div>
            <p className="font-medium text-green-600">Claim Your $100 Credit</p>
            <p className="text-sm text-muted-foreground">New users receive $100 toward their first reimbursements</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeStep;