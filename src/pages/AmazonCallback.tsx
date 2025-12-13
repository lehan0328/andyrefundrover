import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const AmazonCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('spapi_oauth_code');
      const state = searchParams.get('state');
      const storedState = sessionStorage.getItem('amazon_oauth_state');

      if (!code) {
        setStatus('error');
        toast({
          title: "Authorization failed",
          description: "No authorization code received from Amazon",
          variant: "destructive",
        });
        setTimeout(() => navigate('/settings'), 2000);
        return;
      }

      if (state !== storedState) {
        setStatus('error');
        toast({
          title: "Security error",
          description: "Invalid state parameter",
          variant: "destructive",
        });
        setTimeout(() => navigate('/settings'), 2000);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error('Please log in first');
        }

        const { error } = await supabase.functions.invoke('amazon-oauth-exchange', {
          body: { code },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (error) throw error;

        setStatus('success');
        toast({
          title: "Connected successfully",
          description: "Your Amazon account is now connected",
        });
        
        sessionStorage.removeItem('amazon_oauth_state');
        
        // Check if we should return to onboarding
        const returnToOnboarding = sessionStorage.getItem('onboarding_return');
        if (returnToOnboarding) {
          sessionStorage.removeItem('onboarding_return');
          setTimeout(() => navigate('/onboarding'), 1500);
        } else {
          setTimeout(() => navigate('/settings'), 1500);
        }
      } catch (error: any) {
        console.error('OAuth exchange error:', error);
        setStatus('error');
        toast({
          title: "Connection failed",
          description: error.message || "Failed to connect Amazon account",
          variant: "destructive",
        });
        setTimeout(() => navigate('/settings'), 2000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        {status === 'processing' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <h2 className="text-xl font-semibold">Connecting to Amazon...</h2>
            <p className="text-muted-foreground">Please wait while we complete the connection</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="h-12 w-12 mx-auto rounded-full bg-green-100 flex items-center justify-center">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold">Successfully Connected!</h2>
            <p className="text-muted-foreground">Redirecting to settings...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="h-12 w-12 mx-auto rounded-full bg-red-100 flex items-center justify-center">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold">Connection Failed</h2>
            <p className="text-muted-foreground">Redirecting to settings...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default AmazonCallback;
