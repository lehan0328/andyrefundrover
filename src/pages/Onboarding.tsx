import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
  Sparkles
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
  
  const totalSteps = 5;

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
    } catch (error) {
      console.error('Error checking connection status:', error);
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
    if (supplierEmails.length === 0) {
      toast({
        title: "Add supplier emails",
        description: "Please add at least one supplier email address",
        variant: "destructive",
      });
      return;
    }
    
    setSavingEmails(true);
    
    try {
      // Delete existing supplier emails first
      await supabase
        .from('allowed_supplier_emails')
        .delete()
        .eq('user_id', user?.id);
      
      // Insert new supplier emails
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
    switch (step) {
      case 1:
        return true; // Welcome step
      case 2:
        return amazonConnected;
      case 3:
        return emailConnections.length > 0;
      case 4:
        return supplierEmails.length > 0;
      default:
        return true;
    }
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
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold">Welcome to Auren Reimbursements</h1>
              <p className="text-muted-foreground text-lg max-w-md mx-auto">
                Let's set up your account in just a few steps. We'll connect your Amazon seller account and configure invoice syncing.
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
                  Connect Gmail or Outlook to automatically extract invoice PDFs from your emails.
                </p>
                <Badge variant="outline" className="mt-2">
                  {emailConnections.length}/{MAX_EMAIL_ACCOUNTS} accounts connected
                </Badge>
              </div>

              {checkingEmails ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : emailConnections.length > 0 ? (
                <div className="space-y-3">
                  {emailConnections.map((conn, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-green-500/5 border-green-500/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                          <span className="font-medium">{conn.email}</span>
                          <Badge variant="secondary" className="text-xs">
                            {conn.provider === 'gmail' ? 'Gmail' : 'Outlook'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {canAddMoreEmails && (
                    <div className="border rounded-lg p-4 border-dashed">
                      <p className="text-sm text-muted-foreground text-center mb-3">
                        Add another email account (optional)
                      </p>
                      <div className="flex gap-2 justify-center">
                        <Button onClick={handleConnectGmail} variant="outline" size="sm">
                          <Mail className="mr-2 h-4 w-4" />
                          Gmail
                        </Button>
                        <Button onClick={handleConnectOutlook} variant="outline" size="sm">
                          <Mail className="mr-2 h-4 w-4" />
                          Outlook
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border rounded-lg p-6 text-center border-dashed">
                  <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground mb-4">
                    Connect your email to automatically extract invoices
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={handleConnectGmail} size="lg">
                      <Mail className="mr-2 h-4 w-4" />
                      Connect Gmail
                    </Button>
                    <Button onClick={handleConnectOutlook} size="lg" variant="outline">
                      <Mail className="mr-2 h-4 w-4" />
                      Connect Outlook
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Supplier Emails */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">Add Your Supplier Emails</h2>
                <p className="text-muted-foreground mt-2">
                  To protect your privacy, we only look for invoices from email addresses you specify. Add the email addresses your suppliers use to send invoices.
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid gap-3">
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="supplier-email">Supplier Email</Label>
                      <Input
                        id="supplier-email"
                        type="email"
                        placeholder="supplier@company.com"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="supplier-label">Label (optional)</Label>
                      <Input
                        id="supplier-label"
                        placeholder="e.g. Acme Supplies"
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-2">
                      <Label>Monitor from account</Label>
                      <Select value={selectedEmailAccount} onValueChange={setSelectedEmailAccount}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select email account" />
                        </SelectTrigger>
                        <SelectContent>
                          {emailConnections.map((conn) => (
                            <SelectItem key={conn.email} value={`${conn.email}|${conn.provider}`}>
                              {conn.email} ({conn.provider === 'gmail' ? 'Gmail' : 'Outlook'})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button onClick={handleAddSupplierEmail}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add
                      </Button>
                    </div>
                  </div>
                </div>

                {supplierEmails.length > 0 ? (
                  <div className="border rounded-lg divide-y">
                    {supplierEmails.map((supplier, index) => {
                      const linkedAccount = emailConnections.find(c => 
                        `${c.email}|${c.provider}` === `${supplier.sourceAccountId}|${supplier.sourceProvider}` ||
                        c.email === supplier.sourceAccountId
                      );
                      return (
                        <div key={index} className="flex items-center justify-between p-3">
                          <div className="flex items-center gap-3">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{supplier.email}</p>
                              <div className="flex items-center gap-2">
                                {supplier.label && (
                                  <span className="text-sm text-muted-foreground">{supplier.label}</span>
                                )}
                                <Badge variant="secondary" className="text-xs">
                                  via {linkedAccount?.email || supplier.sourceAccountId}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveSupplierEmail(index)}
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="border rounded-lg p-6 text-center border-dashed">
                    <p className="text-muted-foreground">
                      No supplier emails added yet. Add at least one to continue.
                    </p>
                  </div>
                )}

                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  <Shield className="h-4 w-4 inline mr-1" />
                  We will only scan emails from these addresses. Your other emails remain private.
                </p>
              </div>
            </div>
          )}

          {/* Step 5: Complete */}
          {currentStep === 5 && (
            <div className="text-center space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold">You're All Set!</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Your account is configured and ready to go. Click below to start using Auren Reimbursements.
              </p>
              
              <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2 max-w-md mx-auto">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Amazon account connected</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>{emailConnections.length} email account(s) connected</span>
                </div>
                {emailConnections.map((conn, index) => (
                  <div key={index} className="flex items-center gap-2 pl-6 text-sm text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span>{conn.email} ({conn.provider})</span>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>{supplierEmails.length} supplier email(s) configured</span>
                </div>
              </div>

              <Button
                onClick={handleCompleteOnboarding}
                disabled={savingEmails}
                size="lg"
                className="mt-4"
              >
                {savingEmails ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Completing Setup...
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
          {currentStep < 5 && (
            <div className="flex justify-between mt-8 pt-6 border-t">
              <div className="flex gap-2">
                {currentStep > 1 && (
                  <Button
                    variant="outline"
                    onClick={handleBack}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={handleSetupLater}
                >
                  Setup Later
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!canProceedFromStep(currentStep)}
                >
                  {currentStep === 4 ? 'Review Setup' : 'Continue'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Onboarding;
