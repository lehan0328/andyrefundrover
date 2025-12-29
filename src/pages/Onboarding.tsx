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

// Labels for the vertical stepper
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

  // --- State Management (Same as before) ---
  const [amazonConnected, setAmazonConnected] = useState(false);
  const [checkingAmazon, setCheckingAmazon] = useState(true);
  const [emailConnections, setEmailConnections] = useState<EmailConnection[]>([]);
  const [checkingEmails, setCheckingEmails] = useState(true);
  const [supplierEmails, setSupplierEmails] = useState<SupplierEmail[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [selectedEmailAccounts, setSelectedEmailAccounts] = useState<string[]>([]);
  const [savingEmails, setSavingEmails] = useState(false);
  const [paymentMethodAdded, setPaymentMethodAdded] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(true);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [stripeLoading, setStripeLoading] = useState(true);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [fetchingClientSecret, setFetchingClientSecret] = useState(false);

  // ... (Keep your existing useEffects for data loading here: stripe, clientSecret, channel, checkConnectionStatus) ...
  // [OMITTED FOR BREVITY - PASTE YOUR EXISTING USE EFFECTS HERE]
  
  // Re-adding the core CheckConnectionStatus effect for context
  useEffect(() => {
    checkConnectionStatus();
  }, [user]);

  // Re-adding the Stripe Key effect
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

  // Re-adding the Client Secret effect
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
    localStorage.setItem(STORAGE_KEY, currentStep.toString());
  }, [currentStep]);

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

  // --- Handlers (Keep your existing handlers) ---
  // [OMITTED FOR BREVITY - PASTE YOUR EXISTING HANDLERS HERE: handleConnectAmazon, handleConnectGmail, etc.]
  const handleConnectAmazon = async () => { /* ... existing code ... */ };
  const handleConnectGmail = async () => { /* ... existing code ... */ };
  const handleConnectOutlook = async () => { /* ... existing code ... */ };
  const handleAddSupplierEmail = async () => { /* ... existing code ... */ };
  const handleRemoveSupplierEmail = async (index: number) => { 
      const supplierToRemove = supplierEmails[index];
      try {
        const { error } = await supabase.from('allowed_supplier_emails')
          .delete()
          .eq('user_id', user?.id)
          .eq('email', supplierToRemove.email);
        if (error) throw error;
        setSupplierEmails(supplierEmails.filter((_, i) => i !== index));
        toast({ title: "Supplier removed" });
      } catch (error) {
        toast({ title: "Error", description: "Failed to remove supplier", variant: "destructive" });
      }
  };
  const handleCompleteOnboarding = async () => {
    setSavingEmails(true);
    try {
      await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user?.id);
      localStorage.removeItem(STORAGE_KEY);
      await refreshProfile();
      toast({ title: "Setup complete!", description: "Your account is now ready to use" });
      navigate('/dashboard');
    } catch (error) {
      toast({ title: "Error", description: "Failed to complete setup.", variant: "destructive" });
    } finally {
      setSavingEmails(false);
    }
  };

  const canProceedFromStep = (step: number): boolean => {
    switch (step) {
      case 2: return emailConnections.length > 0;
      case 5: return paymentMethodAdded;
      default: return true;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // --- New Render Logic ---

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* LEFT PANEL: Context & Progress */}
      <div className="w-full md:w-[400px] lg:w-[480px] bg-muted/30 border-r p-8 flex flex-col justify-between relative overflow-hidden">
        
        {/* Background decorative blob */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-12">
            <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">A</div>
            <span className="font-bold text-xl tracking-tight">Auren</span>
          </div>

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

        {/* Dynamic Context Footer */}
        <div className="relative z-10 mt-8 hidden md:block">
            {currentStep === 5 && (
                <div className="bg-background/50 backdrop-blur-sm p-4 rounded-xl border border-border/50">
                    <div className="flex gap-2 text-primary mb-2">
                        <ShieldCheck className="h-5 w-5" />
                        <span className="font-semibold text-sm">Secure & Safe</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        "We use bank-level encryption (AES-256) to store your credentials. 
                        We never sell your data, and we only charge a fee when we successfully recover money for you."
                    </p>
                </div>
            )}
            {currentStep < 5 && (
                <div className="flex gap-4 items-start opacity-70">
                    <Quote className="h-8 w-8 text-primary/20 -mt-2" />
                    <p className="text-sm italic text-muted-foreground">
                        "I recovered $3,200 in my first month using Auren. The automated scanning found invoices I completely forgot about."
                    </p>
                </div>
            )}
        </div>
      </div>

      {/* RIGHT PANEL: Form & Action */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-6 md:p-12 overflow-y-auto">
          <div className="w-full max-w-xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 key={currentStep}">
            
            {/* Main Content Area */}
            <div className="min-h-[400px]">
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

            {/* Navigation Footer */}
            {currentStep !== 6 && (
              <div className="flex items-center justify-between pt-8 border-t">
                <Button 
                    variant="ghost" 
                    onClick={() => setCurrentStep(prev => prev - 1)}
                    disabled={currentStep === 1}
                    className={currentStep === 1 ? "invisible" : ""}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>

                <div className="flex items-center gap-4">
                  {!canProceedFromStep(currentStep) && (
                    <span className="text-xs text-muted-foreground hidden sm:inline-block animate-pulse">
                      {currentStep === 2 ? "Connect an email to continue" : "Setup payment to continue"}
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