import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

const Settings = () => {
  const { user, isAdmin } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [amazonCredentials, setAmazonCredentials] = useState<any[]>([]);
  const [loadingCredentials, setLoadingCredentials] = useState(true);
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
    }
  }, [user]);

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

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Notifications</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive email updates about claim status changes
                </p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Discrepancy Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when new discrepancies are detected
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
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
    </div>
  );
};

export default Settings;
