import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { allClaims } from "@/data/claimsData";

interface MissingInvoicesAlertProps {
  userCompany: string | null;
}

export const MissingInvoicesAlert = ({ userCompany }: MissingInvoicesAlertProps) => {
  const [missingInvoicesClaims, setMissingInvoicesClaims] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkMissingInvoices = async () => {
      if (!userCompany) {
        setLoading(false);
        return;
      }

      try {
        // Get all claims for this company
        const companyClaims = allClaims.filter(claim => claim.companyName === userCompany);
        
        // Get all invoices uploaded by this user
        const { data: uploadedInvoices, error } = await supabase
          .from("claim_invoices")
          .select("claim_id");

        if (error) throw error;

        const uploadedClaimIds = new Set(uploadedInvoices?.map(inv => inv.claim_id) || []);
        
        // Find claims without invoices
        const claimsWithoutInvoices = companyClaims
          .filter(claim => !uploadedClaimIds.has(claim.id))
          .map(claim => claim.id);

        setMissingInvoicesClaims(claimsWithoutInvoices);
      } catch (error) {
        console.error("Error checking missing invoices:", error);
      } finally {
        setLoading(false);
      }
    };

    checkMissingInvoices();
  }, [userCompany]);

  if (loading || missingInvoicesClaims.length === 0) {
    return null;
  }

  return (
    <Alert variant="destructive" className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
      <AlertCircle className="h-5 w-5 text-amber-600" />
      <AlertTitle className="text-amber-900 dark:text-amber-100 font-semibold">
        Missing Invoices Detected
      </AlertTitle>
      <AlertDescription className="text-amber-800 dark:text-amber-200">
        <div className="space-y-3">
          <p>
            You have <strong>{missingInvoicesClaims.length}</strong> claim(s) that require supporting invoices to be uploaded for reconciliation.
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/invoices")}
              className="bg-white hover:bg-amber-100 border-amber-300 text-amber-900"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Invoices
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/claims")}
              className="text-amber-900 hover:bg-amber-100"
            >
              View Claims
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};
