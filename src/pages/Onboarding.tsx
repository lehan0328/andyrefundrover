import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import OnboardingPaymentForm from "@/components/onboarding/OnboardingPaymentForm";
import { 
  CheckCircle2, 
  Loader2, 
  Mail, 
  Plus, 
  Trash2, 
  ArrowRight, 
  ArrowLeft,
  ShoppingCart,
  Shield,
  Sparkles,
  CreditCard,
  Lock,
  Clock,
  AlertCircle
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SupplierEmail {
  email: string;
  label: string;
  sourceAccountId: string;
  sourceProvider: 'gmail' | 'outlook';
}

interface EmailConnection {
  email: string;
  provider: 'gmail' | 'outlook';
}

const MAX_EMAIL_ACCOUNTS = 3;

const Onboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  
  // Step 2: Amazon connection state
  const [amazonConnected, setAmazonConnected] = useState(false);
  const [checkingAmazon, setCheckingAmazon] = useState(true);
  
  // Step 3: Email connection state
  const [emailConnections, setEmailConnections] = useState<EmailConnection[]>([]);
  const [checkingEmails, setCheckingEmails] = useState(true);
  
  // Step 4: Supplier emails state
  const [supplierEmails, setSupplierEmails] = useState<SupplierEmail[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [selectedEmailAccount, setSelectedEmailAccount] = useState<string>("");
  const [savingEmails, setSavingEmails] = useState(false);

  // Step 5: Payment method state
  const [paymentMethodAdded, setPaymentMethodAdded] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(true);

  // Stripe state
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [stripeLoading, setStripeLoading] = useState(true);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [fetchingClientSecret, setFetchingClientSecret] = useState(false);
  
  const totalSteps = 6;

  // Fetch Stripe publishable key
  useEffect(() => {
    const fetchStripeKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-stripe-publishable-key");
        if (error) throw error;
        
        if (data?.publishableKey && data.publishableKey.startsWith("pk_")) {
          console.log("Loading Stripe with valid key");
          setStripePromise(loadStripe(data.publishableKey));
        } else {
          console.error("Invalid or missing publishable key:", data?.publishableKey ? "Invalid format" : "No key");
          setStripeError("Payment setup is temporarily unavailable.");
        }
      } catch (error) {
        console.error("Error fetching Stripe publishable key:", error);
        setStripeError("Could not load payment form. Please try again later.");
      } finally {
        setStripeLoading(false);
      }
    };
    fetchStripeKey();
  }, []);

  // Fetch clientSecret when entering step 5 (payment step)
  useEffect(() => {
    const fetchClientSecret = async () => {
      if (currentStep !== 5 || !stripePromise || paymentMethodAdded || clientSecret) return;
      
      setFetchingClientSecret(true);
      try {
        const { data, error } = await supabase.functions.invoke("create-setup-intent");
        if (error) throw error;
        
        if (data?.clientSecret) {
          console.log("Got clientSecret for PaymentElement");
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
    checkConnectionStatus();
  }, [user]);

  const checkConnectionStatus = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      // Check Amazon connection
      const { data: amazonData } = await supabase
        .from('amazon_credentials')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setAmazonConnected(!!amazonData);
      setCheckingAmazon(false);
      
      // Check Gmail connections
      const { data: gmailData } = await supabase
        .from('gmail_credentials')
        .select('connected_email')
        .eq('user_id', user.id);
      
      // Check Outlook connections
      const { data: outlookData } = await supabase
        .from('outlook_credentials')
        .select('connected_email')
        .eq('user_id', user.id);
      
      const connections: EmailConnection[] = [
        ...(gmailData || []).map(g => ({ email: g.connected_email, provider: 'gmail' as const })),
        ...(outlookData || []).map(o => ({ email: o.connected_email, provider: 'outlook' as const })),
      ];
      
      setEmailConnections(connections);
      setCheckingEmails(false);
      
      // Load existing supplier emails
      const { data: supplierData } = await supabase
        .from('allowed_supplier_emails')
        .select('email, label, source_account_id, source_provider')
        .eq('user_id', user.id);
      
      if (supplierData) {
        setSupplierEmails(supplierData.map(s => ({ 
          email: s.email, 
          label: s.label || "",
          sourceAccountId: s.source_account_id || "",
          sourceProvider: (s.source_provider as 'gmail' | 'outlook') || 'gmail'
        })));
      }

      // Check payment method
      const { data: paymentData } = await supabase.functions.invoke("get-payment-method");
      setPaymentMethodAdded(paymentData?.hasPaymentMethod || false);
      setCheckingPayment(false);
    } catch (error) {
      console.error('Error checking connection status:', error);
      setCheckingPayment(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectAmazon = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-amazon-client-id');
      
      if (error) throw error;
      
      const appId = data?.appId;
      if (!appId) throw new Error('Amazon App ID not configured');
      
      const redirectUri = `${window.location.origin}/amazon-callback`;
      const state = crypto.randomUUID();
      sessionStorage.setItem('amazon_oauth_state', state);
      sessionStorage.setItem('onboarding_return', 'true');
      
      const amazonAuthUrl = `https://sellercentral.amazon.com/apps/authorize/consent?application_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
      window.location.href = amazonAuthUrl;
    } catch (error) {
      console.error('Error initiating Amazon OAuth:', error);
      toast({
        title: "Connection error",
        description: error instanceof Error ? error.message : "Failed to connect to Amazon",
        variant: "destructive",
      });
    }
  };

  const handleConnectGmail = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-google-client-id');
      
      if (error) throw error;
      
      const clientId = data?.clientId;
      if (!clientId) throw new Error('Google OAuth not configured');
      
      sessionStorage.setItem('onboarding_return', 'true');
      
      const redirectUri = `${window.location.origin}/gmail-callback`;
      const scope = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid';
      
      const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
      window.location.href = googleAuthUrl;
    } catch (error) {
      console.error('Error initiating Gmail OAuth:', error);
      toast({
        title: "Connection error",
        description: error instanceof Error ? error.message : "Failed to connect to Gmail",
        variant: "destructive",
      });
    }
  };

  const handleConnectOutlook = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-microsoft-client-id');
      
      if (error) throw error;
      
      const clientId = data?.clientId;
      if (!clientId) throw new Error('Microsoft OAuth not configured');
      
      sessionStorage.setItem('onboarding_return', 'true');
      
      const redirectUri = `${window.location.origin}/outlook-callback`;
      const scope = 'https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/User.Read offline_access openid profile email';
      
      const microsoftAuthUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&prompt=consent`;
      window.location.href = microsoftAuthUrl;
    } catch (error) {
      console.error('Error initiating Outlook OAuth:', error);
      toast({
        title: "Connection error",
        description: error instanceof Error ? error.message : "Failed to connect to Outlook",
        variant: "destructive",
      });
    }
  };

  const handleAddSupplierEmail = () => {
    if (!newEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please enter a supplier email address",
        variant: "destructive",
      });
      return;
    }

    if (!selectedEmailAccount) {
      toast({
        title: "Account required",
        description: "Please select which email account to monitor",
        variant: "destructive",
      });
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }
    
    // Check for duplicates
    if (supplierEmails.some(s => s.email.toLowerCase() === newEmail.trim().toLowerCase())) {
      toast({
        title: "Duplicate email",
        description: "This email has already been added",
        variant: "destructive",
      });
      return;
    }

    // Parse selected account (format: "id|provider")
    const [accountId, provider] = selectedEmailAccount.split('|');
    
    setSupplierEmails([...supplierEmails, { 
      email: newEmail.trim(), 
      label: newLabel.trim(),
      sourceAccountId: accountId,
      sourceProvider: provider as 'gmail' | 'outlook'
    }]);
    setNewEmail("");
    setNewLabel("");
    setSelectedEmailAccount("");
  };

  const handleRemoveSupplierEmail = (index: number) => {
    setSupplierEmails(supplierEmails.filter((_, i) => i !== index));
  };

  const handleCompleteOnboarding = async () => {
    setSavingEmails(true);
    
    try {
      // Delete existing supplier emails first (if any)
      await supabase
        .from('allowed_supplier_emails')
        .delete()
        .eq('user_id', user?.id);
      
      // Insert new supplier emails if any were added
      if (supplierEmails.length > 0) {
        const { error: insertError } = await supabase
          .from('allowed_supplier_emails')
          .insert(
            supplierEmails.map(s => ({
              user_id: user?.id,
              email: s.email,
              label: s.label || null,
              source_account_id: s.sourceAccountId,
              source_provider: s.sourceProvider,
            }))
          );
        
        if (insertError) throw insertError;
      }
      
      // Mark onboarding as completed
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user?.id);
      
      if (updateError) throw updateError;
      
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

  const handleSetupLater = async () => {
    try {
      // Mark onboarding as completed even though they're skipping
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user?.id);
      
      toast({
        title: "Setup skipped",
        description: "You can complete the setup anytime from Settings.",
      });
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Error skipping onboarding:', error);
      navigate('/dashboard');
    }
  };

  const canProceedFromStep = (step: number): boolean => {
    // All steps can be skipped - users can complete setup later from Settings
    return true;
  };

  const handleNext = () => {
    if (currentStep < totalSteps && canProceedFromStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canAddMoreEmails = emailConnections.length < MAX_EMAIL_ACCOUNTS;

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
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-2 rounded-full mx-1 transition-colors ${
                  i + 1 <= currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Step {currentStep} of {totalSteps}
          </p>
        </div>

        <Card className="p-8">
          {/* Step 1: Welcome */}
          {currentStep === 1 && (
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
                  <ShoppingCart className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Connect Amazon</p>
                    <p className="text-sm text-muted-foreground">Sync your FBA shipments automatically</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Connect Email</p>
                    <p className="text-sm text-muted-foreground">Auto-extract invoices from Gmail or Outlook</p>
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
                  <Shield className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Privacy First</p>
                    <p className="text-sm text-muted-foreground">We only scan emails from suppliers you specify</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Connect Amazon */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-500/10 mb-4">
                  <ShoppingCart className="h-8 w-8 text-orange-500" />
                </div>
                <h2 className="text-2xl font-bold">Connect Your Amazon Account</h2>
                <p className="text-muted-foreground mt-2">
                  Connect your Amazon Seller account to automatically sync your FBA shipments and detect discrepancies.
                </p>
              </div>

              {checkingAmazon ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : amazonConnected ? (
                <div className="border rounded-lg p-6 text-center bg-green-500/5 border-green-500/20">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="font-medium text-green-600">Amazon account connected!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your Amazon seller account is ready to sync shipments.
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg p-6 text-center border-dashed">
                  <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground mb-4">
                    Click below to securely connect your Amazon Seller account
                  </p>
                  <Button onClick={handleConnectAmazon} size="lg">
                    Connect Amazon Seller Account
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Connect Email */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/10 mb-4">
                  <Mail className="h-8 w-8 text-blue-500" />
                </div>
                <h2 className="text-2xl font-bold">Connect Your Email</h2>
                <p className="text-muted-foreground mt-2">
                  Connect your email accounts to automatically extract invoices from your suppliers.
                </p>
              </div>

              {checkingEmails ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  {emailConnections.length > 0 && (
                    <div className="space-y-3">
                      <Label>Connected Accounts ({emailConnections.length}/{MAX_EMAIL_ACCOUNTS})</Label>
                      {emailConnections.map((conn, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 border rounded-lg bg-green-500/5 border-green-500/20"
                        >
                          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{conn.email}</p>
                            <p className="text-xs text-muted-foreground capitalize">{conn.provider}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {canAddMoreEmails && (
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        variant="outline"
                        className="h-auto py-4 flex-col gap-2"
                        onClick={handleConnectGmail}
                      >
                        <Mail className="h-6 w-6 text-red-500" />
                        <span>Connect Gmail</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto py-4 flex-col gap-2"
                        onClick={handleConnectOutlook}
                      >
                        <Mail className="h-6 w-6 text-blue-500" />
                        <span>Connect Outlook</span>
                      </Button>
                    </div>
                  )}

                  {emailConnections.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground">
                      Connect at least one email account to continue
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 4: Configure Supplier Emails */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/10 mb-4">
                  <Shield className="h-8 w-8 text-purple-500" />
                </div>
                <h2 className="text-2xl font-bold">Add Supplier Emails</h2>
                <p className="text-muted-foreground mt-2">
                  For your privacy, we only scan emails from suppliers you specify. Add the email addresses that send you invoices.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="grid gap-3">
                    <div>
                      <Label htmlFor="supplierEmail">Supplier Email Address</Label>
                      <Input
                        id="supplierEmail"
                        type="email"
                        placeholder="supplier@company.com"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="emailAccount">Monitor From Account</Label>
                      <Select value={selectedEmailAccount} onValueChange={setSelectedEmailAccount}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select email account" />
                        </SelectTrigger>
                        <SelectContent>
                          {emailConnections.map((conn, index) => (
                            <SelectItem key={index} value={`${conn.email}|${conn.provider}`}>
                              {conn.email} ({conn.provider})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="supplierLabel">Label (Optional)</Label>
                      <Input
                        id="supplierLabel"
                        placeholder="e.g., Main supplier"
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button onClick={handleAddSupplierEmail} variant="outline" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Supplier Email
                  </Button>
                </div>

                {supplierEmails.length > 0 && (
                  <div className="space-y-2">
                    <Label>Added Suppliers ({supplierEmails.length})</Label>
                    {supplierEmails.map((supplier, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{supplier.email}</p>
                          {supplier.label && (
                            <p className="text-xs text-muted-foreground">{supplier.label}</p>
                          )}
                          <p className="text-xs text-muted-foreground capitalize">
                            via {supplier.sourceProvider}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveSupplierEmail(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {supplierEmails.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-4 border rounded-lg border-dashed">
                    Add at least one supplier email to continue
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Payment Method */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
                  <CreditCard className="h-8 w-8 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold">Set Up Payment Method</h2>
                <p className="text-muted-foreground mt-2">
                  Add a card to enable automatic billing when we recover your reimbursements.
                </p>
              </div>

              {checkingPayment || stripeLoading || fetchingClientSecret ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : paymentMethodAdded ? (
                <div className="border rounded-lg p-6 text-center bg-green-500/5 border-green-500/20">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="font-medium text-green-600">Payment method added!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your card is securely stored for billing.
                  </p>
                </div>
              ) : stripeError ? (
                <div className="border rounded-lg p-6 text-center border-destructive/20 bg-destructive/5">
                  <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
                  <p className="font-medium text-destructive">{stripeError}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    You can skip this step and add a payment method later from Settings.
                  </p>
                </div>
              ) : stripePromise && clientSecret ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
                    <Lock className="h-4 w-4" />
                    <span>Secured by Stripe</span>
                  </div>
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <OnboardingPaymentForm onSuccess={() => {
                      setPaymentMethodAdded(true);
                    }} />
                  </Elements>
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  Payment setup unavailable. Please contact support.
                </div>
              )}
            </div>
          )}

          {/* Step 6: Complete */}
          {currentStep === 6 && (
            <div className="text-center space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold">You're All Set!</h2>
              <p className="text-muted-foreground">
                Your account is configured and ready to start recovering your Amazon reimbursements.
              </p>

              <div className="grid gap-3 text-left max-w-md mx-auto">
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>Amazon account connected</span>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>{emailConnections.length} email account(s) connected</span>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>{supplierEmails.length} supplier email(s) configured</span>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>Payment method saved</span>
                </div>
              </div>

              <Button
                size="lg"
                onClick={handleCompleteOnboarding}
                disabled={savingEmails}
                className="w-full max-w-md"
              >
                {savingEmails ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Finishing setup...
                  </>
                ) : (
                  <>
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Navigation buttons */}
          {currentStep !== 6 && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t">
              {currentStep > 1 ? (
                <Button variant="ghost" onClick={handleBack}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={handleSetupLater}>
                  Setup Later
                </Button>
                {currentStep < totalSteps - 1 ? (
                  <Button
                    onClick={handleNext}
                    disabled={!canProceedFromStep(currentStep)}
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : currentStep === totalSteps - 1 ? (
                  <Button
                    onClick={handleNext}
                    disabled={!canProceedFromStep(currentStep)}
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          )}
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Need help? <Link to="/contact" className="text-primary hover:underline">Contact Support</Link>
        </p>
      </div>
    </div>
  );
};

export default Onboarding;
