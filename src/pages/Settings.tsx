import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Settings = () => {
  const { user } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    company_name: "",
  });

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

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

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Amazon Integration</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Connection Status</Label>
              <p className="text-sm text-muted-foreground">
                Connect your Amazon Seller account to sync shipments
              </p>
            </div>
            <Button 
              onClick={() => {
                const clientId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
                const redirectUri = `${window.location.origin}/amazon-callback`;
                const state = crypto.randomUUID();
                sessionStorage.setItem('amazon_oauth_state', state);
                
                const amazonAuthUrl = `https://sellercentral.amazon.com/apps/authorize/consent?application_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
                window.location.href = amazonAuthUrl;
              }}
              className="w-full"
            >
              Connect to Amazon
            </Button>
            <div className="pt-4 border-t">
              <Button 
                onClick={handleSync}
                disabled={isSyncing}
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
