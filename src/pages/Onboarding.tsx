import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { Loader2, CheckCircle2, ArrowRight, ArrowLeft, ShieldCheck, Quote } from "lucide-react";
import { cn } from "@/lib/utils";

// Step Components
import WelcomeStep from "@/components/onboarding/steps/WelcomeStep";
import ConnectEmailStep, { EmailConnection } from "@/components/onboarding/steps/ConnectEmailStep";
import SupplierEmailStep, { SupplierEmail } from "@/components/onboarding/steps/SupplierEmailStep";
import ConnectAmazonStep from "@/components/onboarding/steps/ConnectAmazonStep";
import PaymentMethodStep from "@/components/onboarding/steps/PaymentMethodStep";
import CompletionStep from "@/components/onboarding/steps/CompletionStep";

const STORAGE_KEY = "onboarding_current_step";
const MAX_EMAIL_ACCOUNTS = 3;

const STEPS = [
  { id: 1, label: "Welcome", description: "Get started" },
  { id: 2, label: "Connect Email", description: "Sync invoices" },
  { id: 3, label: "Suppliers", description: "Add sources" },
  { id: 4, label: "Amazon", description: "Link Seller Central" },
  { id: 5, label: "Billing", description: "Setup payment" },
  { id: 6, label: "Finish", description: "Ready to go" },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, refreshProfile } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(() => {
    const savedStep = localStorage.getItem(STORAGE_KEY);
    return savedStep ? parseInt(savedStep, 10) : 1;
  });
  
  const [isLoading, setIsLoading] = useState(true);

  // Connection States
  const [amazonConnected, setAmazonConnected] = useState(false);
  const [checkingAmazon, setCheckingAmazon] = useState(true);
  const [emailConnections, setEmailConnections] = useState<EmailConnection[]>([]);
  const [checkingEmails, setCheckingEmails] = useState(true);
  const [supplierEmails, setSupplierEmails] = useState<SupplierEmail[]>([]);
  
  // Supplier Input State
  const [newEmail, setNewEmail] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [selectedEmailAccounts, setSelectedEmailAccounts] = useState<string[]>([]);
  
  // Progress State
  const [savingEmails, setSavingEmails] = useState(false);
  
  // Payment State
  const [paymentMethodAdded, setPaymentMethodAdded] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(true);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [stripeLoading, setStripeLoading] = useState(true);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [fetchingClientSecret, setFetchingClientSecret] = useState(false);

  useEffect(() => {
    checkConnectionStatus();
    
    // Listen for realtime updates to suppliers
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'allowed_supplier_emails',
          filter: `user_id=eq.${user?.id}`
        },
        () => {
          checkConnectionStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, currentStep.toString());
  }, [currentStep]);

  // Fetch Stripe Key
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

  // Fetch Payment Intent Client Secret
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

  const checkConnectionStatus = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Check Amazon
      const { data: amazonData } = await supabase
        .from('amazon_credentials')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      setAmazonConnected(!!amazonData);
      setCheckingAmazon(false);

      // Check Emails
      const { data: gmailData } = await supabase
        .from('gmail_credentials')
        .select('connected_email')
        .eq('user_id', user.id);
      
      const { data: outlookData } = await supabase
        .from('outlook_credentials')
        .select('connected_email')
        .eq('user_id', user.id);
      
      const connections: EmailConnection[] = [
        ...(gmailData || []).map(g => ({ email: g.connected_email, provider: 'gmail' as const })),
        ...(outlookData || []).map(o => ({ email: o.connected_email, provider: 'outlook' as const }))
      ];
      setEmailConnections(connections);
      setCheckingEmails(false);

      // Check Suppliers
      const { data: supplierData } = await supabase
        .from('allowed_supplier_emails')
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

      // Check Payment
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
      const { data, error } = await supabase.functions.invoke('get-amazon-client-id');
      if (error) throw error;
      
      const clientId = data.clientId;
      const redirectUri = `${window.location.origin}/amazon-callback`;
      const state = crypto.randomUUID();
      
      localStorage.setItem('amazon_oauth_state', state);
      
      const params = new URLSearchParams({
        application_id: clientId,
        state: state,
        redirect_uri: redirectUri,
        version: 'beta'
      });

      window.location.href = `https://sellercentral.amazon.com/apps/authorize/consent?${params.toString()}`;
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Could not initialize Amazon connection",
        variant: "destructive",
      });
    }
  };

  const handleConnectGmail = async () => {
    if (emailConnections.length >= MAX_EMAIL_ACCOUNTS) {
      toast({
        title: "Limit Reached",
        description: `You can only connect up to ${MAX_EMAIL_ACCOUNTS} email accounts.`,
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('get-google-client-id');
      if (error) throw error;
      
      const clientId = data.clientId;
      const redirectUri = `${window.location.origin}/gmail-callback`;
      
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        access_type: 'offline',
        prompt: 'consent',
        state: 'onboarding'
      });

      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Could not initialize Gmail connection",
        variant: "destructive",
      });
    }
  };

  const handleConnectOutlook = async () => {
    if (emailConnections.length >= MAX_EMAIL_ACCOUNTS) {
      toast({
        title: "Limit Reached",
        description: `You can only connect up to ${MAX_EMAIL_ACCOUNTS} email accounts.`,
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('get-microsoft-client-id');
      if (error) throw error;

      const clientId = data.clientId;
      const redirectUri = `${window.location.origin}/outlook-callback`;
      const scope = 'offline_access User.Read Mail.Read';

      const params = new URLSearchParams({
        client_id: clientId,
        response_type: 'code',
        redirect_uri: redirectUri,
        response_mode: 'query',
        scope: scope,
        state: 'onboarding'
      });

      window.location.href = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
    } catch (error) {
      console.error('Error initializing Outlook connection:', error);
      toast({
        title: "Connection Failed",
        description: "Could not initialize Outlook connection",
        variant: "destructive",
      });
    }
  };

  const handleAddSupplierEmail = async () => {
    if (!newEmail) return;
    
    if (supplierEmails.some(s => s.email.toLowerCase() === newEmail.toLowerCase())) {
      toast({
        title: "Duplicate Email",
        description: "This supplier email is already in your list",
        variant: "destructive",
      });
      return;
    }

    if (selectedEmailAccounts.length === 0) {
      toast({
        title: "No Account Selected",
        description: "Please select which connected email accounts to scan for this supplier",
        variant: "destructive",
      });
      return;
    }

    try {
      const promises = selectedEmailAccounts.map(async (accountString) => {
        const [sourceProvider, sourceAccountId] = accountString.split(':');
        
        return supabase.from('allowed_supplier_emails').insert({
          user_id: user?.id,
          email: newEmail.toLowerCase(),
          label: newLabel || null,
          source_provider: sourceProvider,
          source_account_id: sourceAccountId,
          status: 'active'
        });
      });

      await Promise.all(promises);

      const newEntries = selectedEmailAccounts.map(accountString => {
        const [sourceProvider, sourceAccountId] = accountString.split(':');
        return {
          email: newEmail,
          label: newLabel,
          sourceProvider: sourceProvider as 'gmail' | 'outlook',
          sourceAccountId,
          isSuggested: false
        };
      });

      setSupplierEmails([...supplierEmails, ...newEntries]);
      setNewEmail("");
      setNewLabel("");
      setSelectedEmailAccounts([]);
      toast({ title: "Supplier added successfully" });
    } catch (error) {
      console.error('Error adding supplier:', error);
      toast({
        title: "Error",
        description: "Failed to add supplier email",
        variant: "destructive",
      });
    }
  };

  const handleRemoveSupplierEmail = async (index: number) => {
    const supplierToRemove = supplierEmails[index];
    try {
      const { error } = await supabase
        .from('allowed_supplier_emails')
        .delete()
        .eq('user_id', user?.id)
        .eq('email', supplierToRemove.email);

      if (error) throw error;

      setSupplierEmails(supplierEmails.filter((_, i) => i !== index));
      toast({ title: "Supplier removed" });
    } catch (error) {
      console.error('Error removing supplier:', error);
      toast({
        title: "Error",
        description: "Failed to remove supplier",
        variant: "destructive",
      });
    }
  };

  const handleCompleteOnboarding = async () => {
    setSavingEmails(true);
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user?.id);

      if (profileError) throw profileError;

      localStorage.removeItem(STORAGE_KEY);
      
      // Refresh the profile in context so the app knows onboarding is done
      await refreshProfile();
      
      toast({
        title: "Setup complete!",
        description: "Your account is now ready to use",
      });
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast({
        title: "Error",
        description: "Failed to complete setup. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingEmails(false);
    }
  };

  const canProceedFromStep = (step: number): boolean => {
    switch (step) {
      case 2:
        return emailConnections.length > 0;
      case 5:
        return paymentMethodAdded;
      default:
        return true;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-background flex flex-col md:flex-row overflow-hidden">
      
      {/* LEFT PANEL: Context & Progress */}
      <div className="hidden md:flex w-[400px] lg:w-[480px] bg-muted/30 border-r p-8 flex-col justify-between relative h-full">
        
        {/* Background decorative blob */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

        <div className="relative z-10">

          {/* Vertical Stepper */}
          <div className="space-y-6 ml-2">
            {STEPS.map((step, index) => {
              const isActive = step.id === currentStep;
              const isCompleted = step.id < currentStep;

              return (
                <div key={step.id} className="flex gap-4 group">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                      isActive ? "border-primary bg-primary text-primary-foreground scale-110" : 
                      isCompleted ? "border-primary bg-primary text-primary-foreground" : 
                      "border-muted-foreground/30 text-muted-foreground"
                    )}>
                      {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <span className="text-xs font-bold">{step.id}</span>}
                    </div>
                    {index !== STEPS.length - 1 && (
                      <div className={cn(
                        "w-[2px] h-10 my-1 transition-colors duration-300",
                        isCompleted ? "bg-primary" : "bg-muted-foreground/20"
                      )} />
                    )}
                  </div>
                  <div className={cn("pt-1 transition-opacity duration-300", isActive ? "opacity-100" : "opacity-60")}>
                    <p className={cn("text-sm font-semibold", isActive && "text-primary")}>{step.label}</p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Form & Action */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto relative">
        <div className="min-h-full flex flex-col items-center justify-center p-6 md:p-12">
          
          <div className="w-full max-w-xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* 1. STEP CONTENT */}
            <div className="bg-card/50 p-1 rounded-xl"> 
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
            </div>

            {/* 2. INLINE NAVIGATION BUTTONS */}
            {currentStep !== 6 && (
              <div className="flex items-center justify-between pt-6 border-t border-border/40">
                <Button 
                    variant="ghost" 
                    onClick={() => setCurrentStep(prev => prev - 1)}
                    disabled={currentStep === 1}
                    className={cn("transition-opacity pl-0 hover:bg-transparent hover:text-primary", currentStep === 1 ? "opacity-0 pointer-events-none" : "opacity-100")}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>

                <div className="flex items-center gap-4">
                   {!canProceedFromStep(currentStep) && (
                      <span className="text-xs text-muted-foreground hidden sm:inline-block animate-pulse">
                         {currentStep === 2 ? "Connect an email to continue" : 
                          currentStep === 5 ? "Add payment to continue" : ""}
                      </span>
                   )}
                   
                   <Button 
                     onClick={() => setCurrentStep(prev => prev + 1)}
                     disabled={!canProceedFromStep(currentStep)}
                     size="lg"
                     className="px-8 shadow-lg shadow-primary/20"
                   >
                     Continue
                     <ArrowRight className="ml-2 h-4 w-4" />
                   </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;