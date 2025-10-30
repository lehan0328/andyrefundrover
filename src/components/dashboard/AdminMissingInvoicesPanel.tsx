import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Send, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { allClaims } from "@/data/claimsData";
import { useToast } from "@/hooks/use-toast";

interface ClientMissingInvoices {
  companyName: string;
  clientEmail: string;
  clientName: string;
  missingClaimIds: string[];
}

export const AdminMissingInvoicesPanel = () => {
  const [clientsWithMissingInvoices, setClientsWithMissingInvoices] = useState<
    ClientMissingInvoices[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const checkMissingInvoices = async () => {
      try {
        // Get all uploaded invoices
        const { data: uploadedInvoices, error: invoiceError } = await supabase
          .from("claim_invoices")
          .select("claim_id");

        if (invoiceError) throw invoiceError;

        const uploadedClaimIds = new Set(uploadedInvoices?.map(inv => inv.claim_id) || []);

        // Get all profiles to map companies to users
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("id, email, full_name, company_name");

        if (profileError) throw profileError;

        // Group claims by company and find missing invoices
        const companyMap = new Map<string, ClientMissingInvoices>();

        allClaims.forEach((claim) => {
          if (!uploadedClaimIds.has(claim.id)) {
            const profile = profiles?.find(p => p.company_name === claim.companyName);
            
            if (profile && claim.companyName) {
              if (!companyMap.has(claim.companyName)) {
                companyMap.set(claim.companyName, {
                  companyName: claim.companyName,
                  clientEmail: profile.email,
                  clientName: profile.full_name || "Client",
                  missingClaimIds: [],
                });
              }
              companyMap.get(claim.companyName)!.missingClaimIds.push(claim.id);
            }
          }
        });

        setClientsWithMissingInvoices(Array.from(companyMap.values()));
      } catch (error) {
        console.error("Error checking missing invoices:", error);
        toast({
          title: "Error",
          description: "Failed to load missing invoices data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    checkMissingInvoices();
  }, [toast]);

  const sendNotification = async (client: ClientMissingInvoices) => {
    setSendingTo(client.companyName);
    try {
      const { data, error } = await supabase.functions.invoke(
        "send-missing-invoice-notification",
        {
          body: {
            clientEmail: client.clientEmail,
            clientName: client.clientName,
            companyName: client.companyName,
            missingCount: client.missingClaimIds.length,
            claimIds: client.missingClaimIds,
          },
        }
      );

      if (error) throw error;

      toast({
        title: "Notification Sent",
        description: `Email sent to ${client.clientName} at ${client.companyName}`,
      });
    } catch (error: any) {
      console.error("Error sending notification:", error);
      toast({
        title: "Failed to Send",
        description: error.message || "Could not send notification email",
        variant: "destructive",
      });
    } finally {
      setSendingTo(null);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (clientsWithMissingInvoices.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center justify-center h-32 text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">All clients have uploaded their invoices</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="h-5 w-5 text-amber-600" />
        <h3 className="text-lg font-semibold">Clients with Missing Invoices</h3>
      </div>
      
      <div className="space-y-4">
        {clientsWithMissingInvoices.map((client) => (
          <div
            key={client.companyName}
            className="flex items-center justify-between p-4 border rounded-lg bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
          >
            <div className="flex-1">
              <h4 className="font-semibold text-foreground">{client.companyName}</h4>
              <p className="text-sm text-muted-foreground">{client.clientEmail}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="bg-amber-100 text-amber-900">
                  {client.missingClaimIds.length} Missing Invoice{client.missingClaimIds.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </div>
            <Button
              onClick={() => sendNotification(client)}
              disabled={sendingTo === client.companyName}
              size="sm"
              className="ml-4"
            >
              {sendingTo === client.companyName ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Notification
                </>
              )}
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
};
