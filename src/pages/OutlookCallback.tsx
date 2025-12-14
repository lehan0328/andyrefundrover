import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const OutlookCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      const error = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      if (error) {
        console.error("Outlook OAuth error:", error, errorDescription);
        toast({
          title: "Connection failed",
          description: errorDescription || "Failed to connect Outlook account",
          variant: "destructive",
        });
        setStatus("error");
        setTimeout(() => navigate("/settings"), 2000);
        return;
      }

      if (!code) {
        toast({
          title: "Connection failed",
          description: "No authorization code received",
          variant: "destructive",
        });
        setStatus("error");
        setTimeout(() => navigate("/settings"), 2000);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error("Please log in to connect Outlook");
        }

        const redirectUri = `${window.location.origin}/outlook-callback`;

        const { data, error: fnError } = await supabase.functions.invoke("outlook-oauth-exchange", {
          body: { code, redirectUri },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (fnError) throw fnError;

        toast({
          title: "Outlook connected",
          description: `Successfully connected ${data.email}`,
        });

        setStatus("success");
        
        // Check if we should return to onboarding
        const returnToOnboarding = sessionStorage.getItem('onboarding_return');
        if (returnToOnboarding) {
          sessionStorage.removeItem('onboarding_return');
          setTimeout(() => navigate("/onboarding"), 1500);
        } else {
          setTimeout(() => navigate("/settings"), 1500);
        }
      } catch (err) {
        console.error("Outlook OAuth exchange error:", err);
        toast({
          title: "Connection failed",
          description: err instanceof Error ? err.message : "Failed to connect Outlook",
          variant: "destructive",
        });
        setStatus("error");
        setTimeout(() => navigate("/settings"), 2000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        {status === "loading" && (
          <>
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Connecting Outlook account...</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="h-8 w-8 mx-auto text-green-500">✓</div>
            <p className="text-foreground">Outlook connected successfully!</p>
            <p className="text-sm text-muted-foreground">Redirecting...</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="h-8 w-8 mx-auto text-destructive">✕</div>
            <p className="text-foreground">Connection failed</p>
            <p className="text-sm text-muted-foreground">Redirecting to settings...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default OutlookCallback;
