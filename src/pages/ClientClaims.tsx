import { FileText } from "lucide-react";
import { Card } from "@/components/ui/card";

const ClientClaims = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Claims</h1>
        <p className="text-muted-foreground mt-2">
          View and track your reimbursement claims
        </p>
      </div>

      <Card className="p-12">
        <div className="text-center">
          <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Claims Yet</h3>
          <p className="text-muted-foreground">
            Your reimbursement claims will appear here once submitted
          </p>
        </div>
      </Card>
    </div>
  );
};

export default ClientClaims;
