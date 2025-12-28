import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { Loader2, ArrowRight, ArrowLeft } from "lucide-react";

// Import new step components
import WelcomeStep from "@/components/onboarding/steps/WelcomeStep";
import ConnectEmailStep, { EmailConnection } from "@/components/onboarding/steps/ConnectEmailStep";
import SupplierEmailStep, { SupplierEmail } from "@/components/onboarding/steps/SupplierEmailStep";
import ConnectAmazonStep from "@/components/onboarding/steps/ConnectAmazonStep";
import PaymentMethodStep from "@/components/onboarding/steps/PaymentMethodStep";
import CompletionStep from "@/components/onboarding/steps/CompletionStep";

const MAX_EMAIL_ACCOUNTS = 3;

const Onboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, refreshProfile } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Step Connection States
  const [amazonConnected, setAmazonConnected] = useState(false);
  const [checkingAmazon, setCheckingAmazon] = useState(true);
  const [emailConnections, setEmailConnections] = useState<EmailConnection[]>([]);
  const [checkingEmails, setCheckingEmails] = useState(true);
  
  // Supplier Email State
  const [supplierEmails, setSupplierEmails] = useState<SupplierEmail[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [selectedEmailAccounts, setSelectedEmailAccounts] = useState<string[]>([]);
  const [savingEmails, setSavingEmails] = useState(false);

  // Payment State
  const [paymentMethodAdded, setPaymentMethodAdded] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(true);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [stripeLoading, setStripeLoading] = useState(true);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [fetchingClientSecret, setFetchingClientSecret] = useState(false);

  const totalSteps = 6;

  // --- Effects & Data Loading ---

  useEffect(() => {
    const fetchStripeKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-stripe-publishable-key");
        if (error) throw error;
        if (data?.publishableKey?.startsWith("pk_")) {
          setStripePromise(loadStripe(data.publishableKey));
        } else {
          setStripeError("Payment setup is temporarily unavailable.");
        }
      } catch (error) {
        console.error("Error fetching Stripe key:", error);
        setStripeError("Could not load payment form.");
      } finally {
        setStripeLoading(false);
      }
    };
    fetchStripeKey();
  }, []);

  useEffect(() => {
    const fetchClientSecret = async () => {
      if (currentStep !== 5 || !stripePromise || paymentMethodAdded || clientSecret) return;
      setFetchingClientSecret(true);
      try {
        const { data, error } = await supabase.functions.invoke("create-setup-intent");
        if (error) throw error;
        if (data?.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          setStripeError("Failed to initialize payment form.");
        }
      } catch (error) {
        console.error("Error creating setup intent:", error);
        setStripeError("Failed to initialize payment form.");
      } finally {
        setFetchingClientSecret(false);
      }
    };
    fetchClientSecret();
  }, [currentStep, stripePromise, paymentMethodAdded, clientSecret]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('onboarding-discovery')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'allowed_supplier_emails',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const newSupplier = payload.new;
        setSupplierEmails(prev => {
          if (prev.some(s => s.email === newSupplier.email)) return prev;
          return [...prev, {
            email: newSupplier.email,
            label: newSupplier.label,
            sourceAccountId: newSupplier.source_account_id,
            sourceProvider: newSupplier.source_provider,
            isSuggested: true
          }];
        });
        toast({ title: "New Supplier Found", description: `Found ${newSupplier.email}` });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, toast]);

  useEffect(() => {
    checkConnectionStatus();
  }, [user]);

  // --- Handlers ---

  const checkConnectionStatus = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Amazon
      const { data: amazonData } = await supabase.from('amazon_credentials').select('id').eq('user_id', user.id).maybeSingle();
      setAmazonConnected(!!amazonData);
      setCheckingAmazon(false);

      // Emails
      const { data: gmailData } = await supabase.from('gmail_credentials').select('connected_email').eq('user_id', user.id);
      const { data: outlookData } = await supabase.from('outlook_credentials').select('connected_email').eq('user_id', user.id);
      
      setEmailConnections([
        ...(gmailData || []).map(g => ({ email: g.connected_email, provider: 'gmail' as const })),
        ...(outlookData || []).map(o => ({ email: o.connected_email, provider: 'outlook' as const }))
      ]);
      setCheckingEmails(false);

      // Suppliers
      const { data: supplierData } = await supabase.from('allowed_supplier_emails')
        .select('email, label, source_account_id, source_provider, status')
        .eq('user_id', user.id);

      if (supplierData) {
        setSupplierEmails(supplierData.map(s => ({
          email: s.email,
          label: s.label || "",
          sourceAccountId: s.source_account_id || "",
          sourceProvider: (s.source_provider as 'gmail' | 'outlook') || 'gmail',
          isSuggested: s.status === 'suggested'
        })));
      }

      // Payment
      const { data: paymentData } = await supabase.functions.invoke("get-payment-method");
      setPaymentMethodAdded(paymentData?.hasPaymentMethod || false);
      setCheckingPayment(false);
    } catch (error) {
      console.error('Error checking status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectAmazon = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('get-amazon-client-id', {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (error) throw error;
      if (!data?.appId) throw new Error('Amazon App ID not configured');
      
      const redirectUri = `${window.location.origin}/amazon-callback`;
      const state = crypto.randomUUID();
      sessionStorage.setItem('amazon_oauth_state', state);
      sessionStorage.setItem('onboarding_return', 'true');
      window.location.href = `https://sellercentral.amazon.com/apps/authorize/consent?application_id=${data.appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    } catch (error) {
      toast({ title: "Connection error", description: "Failed to connect to Amazon", variant: "destructive" });
    }
  };

  const handleConnectGmail = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('get-google-client-id', {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (error) throw error;
      
      sessionStorage.setItem('onboarding_return', 'true');
      const redirectUri = `${window.location.origin}/gmail-callback`;
      const scope = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid';
      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${data?.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
    } catch (error) {
      toast({ title: "Connection error", description: "Failed to connect to Gmail", variant: "destructive" });
    }
  };

  const handleConnectOutlook = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('get-microsoft-client-id', {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (error) throw error;

      sessionStorage.setItem('onboarding_return', 'true');
      const redirectUri = `${window.location.origin}/outlook-callback`;
      const scope = 'https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/User.Read offline_access openid profile email';
      window.location.href = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${data?.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&prompt=consent`;
    } catch (error) {
      toast({ title: "Connection error", description: "Failed to connect to Outlook", variant: "destructive" });
    }
  };

  const handleAddSupplierEmail = () => {
    if (!newEmail.trim()) {
      return toast({ title: "Email required", variant: "destructive" });
    }
    if (selectedEmailAccounts.length === 0) {
      return toast({ title: "Account required", description: "Select an email account to monitor", variant: "destructive" });
    }
    if (supplierEmails.some(s => s.email.toLowerCase() === newEmail.trim().toLowerCase())) {
      return toast({ title: "Duplicate email", variant: "destructive" });
    }

    const newEntries = selectedEmailAccounts.map(account => {
      const [accountId, provider] = account.split('|');
      return {
        email: newEmail.trim(),
        label: newLabel.trim(),
        sourceAccountId: accountId,
        sourceProvider: provider as 'gmail' | 'outlook',
        isSuggested: false
      };
    });

    setSupplierEmails([...supplierEmails, ...newEntries]);
    setNewEmail("");
    setNewLabel("");
    setSelectedEmailAccounts([]);
  };

  const handleRemoveSupplierEmail = (index: number) => {
    setSupplierEmails(supplierEmails.filter((_, i) => i !== index));
  };

  const handleCompleteOnboarding = async () => {
    setSavingEmails(true);
    try {
      await supabase.from('allowed_supplier_emails').delete().eq('user_id', user?.id);
      
      if (supplierEmails.length > 0) {
        await supabase.from('allowed_supplier_emails').insert(supplierEmails.map(s => ({
          user_id: user?.id,
          email: s.email,
          label: s.label || null,
          source_account_id: s.sourceAccountId,
          source_provider: s.sourceProvider,
          status: 'active'
        })));
      }

      await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user?.id);
      await refreshProfile();
      toast({ title: "Setup complete!", description: "Your account is now ready to use" });
      navigate('/dashboard');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast({ title: "Error", description: "Failed to complete setup.", variant: "destructive" });
    } finally {
      setSavingEmails(false);
    }
  };

  // --- Rendering ---

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div 
                key={i} 
                className={`flex-1 h-2 rounded-full mx-1 transition-colors ${i + 1 <= currentStep ? 'bg-primary' : 'bg-muted'}`} 
              />
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Step {currentStep} of {totalSteps}
          </p>
        </div>

        <Card className="p-8">
          {currentStep === 1 && <WelcomeStep />}
          
          {currentStep === 2 && (
            <ConnectEmailStep 
              emailConnections={emailConnections}
              checkingEmails={checkingEmails}
              onConnectGmail={handleConnectGmail}
              onConnectOutlook={handleConnectOutlook}
              maxAccounts={MAX_EMAIL_ACCOUNTS}
            />
          )}

          {currentStep === 3 && (
            <SupplierEmailStep 
              supplierEmails={supplierEmails}
              emailConnections={emailConnections}
              newEmail={newEmail}
              setNewEmail={setNewEmail}
              newLabel={newLabel}
              setNewLabel={setNewLabel}
              selectedEmailAccounts={selectedEmailAccounts}
              setSelectedEmailAccounts={setSelectedEmailAccounts}
              onAddSupplier={handleAddSupplierEmail}
              onRemoveSupplier={handleRemoveSupplierEmail}
            />
          )}

          {currentStep === 4 && (
            <ConnectAmazonStep 
              amazonConnected={amazonConnected}
              checkingAmazon={checkingAmazon}
              onConnectAmazon={handleConnectAmazon}
            />
          )}

          {currentStep === 5 && (
            <PaymentMethodStep 
              paymentMethodAdded={paymentMethodAdded}
              checkingPayment={checkingPayment}
              stripePromise={stripePromise}
              clientSecret={clientSecret}
              stripeError={stripeError}
              stripeLoading={stripeLoading}
              fetchingClientSecret={fetchingClientSecret}
              onSuccess={() => setPaymentMethodAdded(true)}
            />
          )}

          {currentStep === 6 && (
            <CompletionStep 
              amazonConnected={amazonConnected}
              emailConnections={emailConnections}
              supplierEmails={supplierEmails}
              paymentMethodAdded={paymentMethodAdded}
              onComplete={handleCompleteOnboarding}
              isSaving={savingEmails}
            />
          )}

          {/* Navigation Buttons */}
          {currentStep !== 6 && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t">
              {currentStep > 1 ? (
                <Button variant="ghost" onClick={() => setCurrentStep(prev => prev - 1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              ) : <div />}

              <Button onClick={() => setCurrentStep(prev => prev + 1)}>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Onboarding;