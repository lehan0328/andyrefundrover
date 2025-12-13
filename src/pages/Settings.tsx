import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2, CheckCircle2, XCircle, Trash2, Mail, RefreshCw, Shield, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface GmailCredential {
  id: string;
  connected_email: string;
  last_sync_at: string | null;
  sync_enabled: boolean;
}

interface SupplierEmail {
  id: string;
  email: string;
  label: string | null;
}

const Settings = () => {
  const { user, isAdmin } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGmailSyncing, setIsGmailSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [amazonCredentials, setAmazonCredentials] = useState<any[]>([]);
  const [gmailCredential, setGmailCredential] = useState<GmailCredential | null>(null);
  const [supplierEmails, setSupplierEmails] = useState<SupplierEmail[]>([]);
  const [newSupplierEmail, setNewSupplierEmail] = useState("");
  const [newSupplierLabel, setNewSupplierLabel] = useState("");
  const [loadingCredentials, setLoadingCredentials] = useState(true);
  const [loadingGmailCredentials, setLoadingGmailCredentials] = useState(true);
  const [loadingSupplierEmails, setLoadingSupplierEmails] = useState(true);
  const [credentialToDelete, setCredentialToDelete] = useState<string | null>(null);
  const [gmailToDisconnect, setGmailToDisconnect] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    company_name: "",
  });

  const getMarketplaceName = (marketplaceId: string) => {
    const marketplaces: Record<string, string> = {
      'ATVPDKIKX0DER': 'United States',
      'A2EUQ1WTGCTBG2': 'Canada',
      'A1AM78C64UM0Y8': 'Mexico',
      'A2Q3Y263D00KWC': 'Brazil',
      'A1PA6795UKMFR9': 'Germany',
      'A1RKKUPIHCS9HS': 'Spain',
      'A13V1IB3VIYZZH': 'France',
      'A1F83G8C2ARO7P': 'United Kingdom',
      'APJ6JRA9NG5V4': 'Italy',
      'A21TJRUUN4KGV': 'India',
      'A39IBJ37TRP1C6': 'Australia',
      'A1VC38T7YXB528': 'Japan',
    };
    return marketplaces[marketplaceId] || marketplaceId;
  };

  useEffect(() => {
    if (user) {
      loadProfile();
      loadAmazonCredentials();
      loadGmailCredentials();
      loadSupplierEmails();
    }
  }, [user]);

  const loadGmailCredentials = async () => {
    try {
      const { data, error } = await supabase
        .from("gmail_credentials")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (error) throw error;
      setGmailCredential(data);
    } catch (error) {
      console.error("Error loading Gmail credentials:", error);
    } finally {
      setLoadingGmailCredentials(false);
    }
  };

  const loadSupplierEmails = async () => {
    try {
      const { data, error } = await supabase
        .from("allowed_supplier_emails")
        .select("id, email, label")
        .eq("user_id", user?.id);

      if (error) throw error;
      setSupplierEmails(data || []);
    } catch (error) {
      console.error("Error loading supplier emails:", error);
    } finally {
      setLoadingSupplierEmails(false);
    }
  };

  const handleAddSupplierEmail = async () => {
    if (!newSupplierEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please enter a supplier email address",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newSupplierEmail.trim())) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("allowed_supplier_emails")
        .insert({
          user_id: user?.id,
          email: newSupplierEmail.trim(),
          label: newSupplierLabel.trim() || null,
        });

      if (error) throw error;

      toast({
        title: "Supplier added",
        description: "Supplier email added. Starting invoice sync...",
      });

      setNewSupplierEmail("");
      setNewSupplierLabel("");
      loadSupplierEmails();
      
      // Trigger Gmail sync after adding supplier email
      handleSyncGmail();
    } catch (error: any) {
      console.error("Error adding supplier email:", error);
      toast({
        title: "Error",
        description: error.message?.includes("duplicate") 
          ? "This email has already been added" 
          : "Failed to add supplier email",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSupplierEmail = async (id: string) => {
    try {
      const { error } = await supabase
        .from("allowed_supplier_emails")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Supplier removed",
        description: "Supplier email removed successfully",
      });

      loadSupplierEmails();
    } catch (error) {
      console.error("Error deleting supplier email:", error);
      toast({
        title: "Error",
        description: "Failed to remove supplier email",
        variant: "destructive",
      });
    }
  };

  const loadAmazonCredentials = async () => {
    try {
      const { data, error } = await supabase
        .from("amazon_credentials")
        .select("*")
        .eq("user_id", user?.id);

      if (error) throw error;

      setAmazonCredentials(data || []);
    } catch (error) {
      console.error("Error loading Amazon credentials:", error);
    } finally {
      setLoadingCredentials(false);
    }
  };

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, email, company_name")
        .eq("id", user?.id)
        .single();

      if (error) throw error;

      setFormData({
        full_name: data.full_name || "",
        email: data.email || "",
        company_name: data.company_name || "",
      });
    } catch (error) {
      console.error("Error loading profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          company_name: formData.company_name,
        })
        .eq("id", user?.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Please log in to sync shipments');
      }

      const { data, error } = await supabase.functions.invoke('sync-amazon-shipments', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      if (error) throw error;
      
      toast({
        title: "Sync successful",
        description: `Synced ${data.synced} of ${data.total} shipments from Amazon`,
      });
    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: "Sync failed",
        description: error.message || "Failed to sync shipments from Amazon",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnectAmazon = async (credentialId: string) => {
    try {
      const { error } = await supabase
        .from('amazon_credentials')
        .delete()
        .eq('id', credentialId);

      if (error) throw error;

      toast({
        title: "Account disconnected",
        description: "Amazon account has been disconnected successfully",
      });

      await loadAmazonCredentials();
    } catch (error) {
      console.error("Error disconnecting Amazon account:", error);
      toast({
        title: "Error",
        description: "Failed to disconnect Amazon account",
        variant: "destructive",
      });
    } finally {
      setCredentialToDelete(null);
    }
  };

  const handleConnectGmail = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-google-client-id');
      
      if (error) throw error;
      
      const clientId = data?.clientId;
      if (!clientId) throw new Error('Google OAuth not configured');
      
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

  const handleSyncGmail = async () => {
    setIsGmailSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Please log in to sync invoices');
      }

      const { data, error } = await supabase.functions.invoke('sync-gmail-invoices', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      if (error) throw error;
      
      toast({
        title: "Sync successful",
        description: `Found ${data.invoicesFound} invoices from ${data.processed} emails`,
      });

      await loadGmailCredentials();
    } catch (error: any) {
      console.error('Gmail sync error:', error);
      toast({
        title: "Sync failed",
        description: error.message || "Failed to sync invoices from Gmail",
        variant: "destructive",
      });
    } finally {
      setIsGmailSyncing(false);
    }
  };

  const handleDisconnectGmail = async () => {
    try {
      const { error } = await supabase
        .from('gmail_credentials')
        .delete()
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "Gmail disconnected",
        description: "Gmail account has been disconnected successfully",
      });

      setGmailCredential(null);
    } catch (error) {
      console.error("Error disconnecting Gmail:", error);
      toast({
        title: "Error",
        description: "Failed to disconnect Gmail account",
        variant: "destructive",
      });
    } finally {
      setGmailToDisconnect(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account and application preferences
        </p>
      </div>

      <div className="grid gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Account Information</h3>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  disabled
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  placeholder="Your company name"
                  value={formData.company_name}
                  onChange={(e) =>
                    setFormData({ ...formData, company_name: e.target.value })
                  }
                />
              </div>
            </div>
          )}
        </Card>


        {!isAdmin && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Amazon Integration</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Synced Amazon Accounts</Label>
                <p className="text-sm text-muted-foreground">
                  Manage your connected Amazon Seller accounts
                </p>
              </div>

              {loadingCredentials ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : amazonCredentials.length > 0 ? (
                <div className="space-y-3">
                  {amazonCredentials.map((credential) => (
                    <div
                      key={credential.id}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Marketplace:</span>
                          <span className="text-sm">
                            {getMarketplaceName(credential.marketplace_id)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              credential.credentials_status === "active"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {credential.credentials_status === "active" ? (
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                            ) : (
                              <XCircle className="h-3 w-3 mr-1" />
                            )}
                            {credential.credentials_status}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setCredentialToDelete(credential.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Seller ID:</span>
                        <span className="text-muted-foreground">{credential.seller_id}</span>
                      </div>
                      {credential.last_sync_at && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Last Synced:</span>
                          <span>
                            {new Date(credential.last_sync_at).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 border rounded-lg border-dashed">
                  <p className="text-sm text-muted-foreground">
                    No Amazon accounts connected yet
                  </p>
                </div>
              )}

              <Button 
                onClick={async () => {
                  try {
                    const { data, error } = await supabase.functions.invoke('get-amazon-client-id');
                    
                    if (error) throw error;
                    
                    const appId = data?.appId;
                    if (!appId) throw new Error('Amazon App ID not configured');
                    
                    const redirectUri = `${window.location.origin}/amazon-callback`;
                    const state = crypto.randomUUID();
                    sessionStorage.setItem('amazon_oauth_state', state);
                    
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
                }}
                className="w-full"
                variant={amazonCredentials.length > 0 ? "outline" : "default"}
              >
                {amazonCredentials.length > 0 ? "Connect Another Account" : "Connect to Amazon"}
              </Button>
              <div className="pt-4 border-t">
                <Button 
                  onClick={handleSync}
                  disabled={isSyncing || amazonCredentials.length === 0}
                  className="w-full"
                  variant="secondary"
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    "Sync Shipments from Amazon"
                  )}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Gmail Integration Card */}
        {!isAdmin && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Gmail Integration</h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Auto-Extract Invoices</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically extract PDF invoices from your Gmail inbox
                </p>
              </div>

              {loadingGmailCredentials ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : gmailCredential ? (
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{gmailCredential.connected_email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setGmailToDisconnect(true)}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {gmailCredential.last_sync_at && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Last Synced:</span>
                      <span>{new Date(gmailCredential.last_sync_at).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 border rounded-lg border-dashed">
                  <Mail className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Connect Gmail to auto-extract invoice PDFs
                  </p>
                  <Button onClick={handleConnectGmail}>
                    Connect Gmail
                  </Button>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Supplier Emails Card - Privacy Settings */}
        {!isAdmin && gmailCredential && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Supplier Email Addresses</h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  To protect your privacy, we only scan for invoices from email addresses you specify. Add your suppliers' email addresses below.
                </p>
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="email"
                    placeholder="supplier@company.com"
                    value={newSupplierEmail}
                    onChange={(e) => setNewSupplierEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSupplierEmail()}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    placeholder="Label (optional)"
                    value={newSupplierLabel}
                    onChange={(e) => setNewSupplierLabel(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSupplierEmail()}
                  />
                </div>
                <Button onClick={handleAddSupplierEmail} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {loadingSupplierEmails ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : supplierEmails.length > 0 ? (
                <div className="border rounded-lg divide-y">
                  {supplierEmails.map((supplier) => (
                    <div key={supplier.id} className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{supplier.email}</p>
                          {supplier.label && (
                            <p className="text-sm text-muted-foreground">{supplier.label}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteSupplierEmail(supplier.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border rounded-lg p-4 text-center border-dashed">
                  <p className="text-sm text-muted-foreground">
                    No supplier emails configured. Add at least one to enable invoice syncing.
                  </p>
                </div>
              )}

              <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <Shield className="h-3 w-3 inline mr-1" />
                We will only scan emails from these addresses. Your other emails remain private.
              </p>
            </div>
          </Card>
        )}

        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={loadProfile} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </div>

      <AlertDialog open={!!credentialToDelete} onOpenChange={() => setCredentialToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Amazon Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect this Amazon account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => credentialToDelete && handleDisconnectAmazon(credentialToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={gmailToDisconnect} onOpenChange={setGmailToDisconnect}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Gmail</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect Gmail? You won't be able to auto-extract invoices anymore.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnectGmail}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Settings;
