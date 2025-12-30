import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function GmailCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState("Processing Gmail connection...");

  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      toast({
        variant: "destructive",
        title: "Connection Failed",
        description: "Google access was denied.",
      });
      navigate("/settings");
      return;
    }

    if (!code) {
      navigate("/settings");
      return;
    }

    const exchangeCode = async () => {
      try {
        setStatus("Exchanging security tokens...");
        
        // 1. Exchange OAuth Code
        const { data: exchangeData, error: exchangeError } = await supabase.functions.invoke(
          "gmail-oauth-exchange",
          {
            body: { code },
          }
        );

        if (exchangeError) throw exchangeError;
        if (!exchangeData?.user_email) throw new Error("No email returned from exchange");

        // 2. Trigger Supplier Discovery (Separate Step)
        setStatus("Scanning for potential suppliers...");
        
        const { data: discoveryData, error: discoveryError } = await supabase.functions.invoke(
          "discover-gmail-suppliers",
          {
            body: { 
              account_id: exchangeData.credential_id 
            }
          }
        );

        if (discoveryError) {
          console.error("Discovery error:", discoveryError);
          // We don't fail the whole flow if discovery fails, just warn
          toast({
            variant: "default",
            title: "Connected with warnings",
            description: "Gmail connected, but initial supplier scan failed. You can rescan in settings.",
          });
        } else {
          const count = discoveryData?.suppliersFound || 0;
          if (count > 0) {
            toast({
              title: "Suppliers Found!",
              description: `We found ${count} potential suppliers in your history.`,
            });
            
            // Navigate to dashboard and trigger the Discovery Dialog
            navigate("/dashboard", { 
              state: { 
                showDiscovery: true, 
                provider: "gmail",
                count 
              } 
            });
            return;
          }
        }

        toast({
          title: "Success",
          description: "Gmail account connected successfully.",
        });
        navigate("/settings");

      } catch (err: any) {
        console.error("Error in Gmail callback:", err);
        toast({
          variant: "destructive",
          title: "Connection Error",
          description: err.message || "Failed to connect Gmail account",
        });
        navigate("/settings");
      }
    };

    exchangeCode();
  }, [searchParams, navigate, toast]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <h2 className="text-xl font-semibold text-gray-700">{status}</h2>
      <p className="text-sm text-gray-500">Please do not close this window.</p>
    </div>
  );
}