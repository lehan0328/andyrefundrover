import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { AlertCircle, Send, Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NotificationFormData {
  clientEmail: string;
  clientName: string;
  companyName: string;
  claimIds: string;
}

export const AdminMissingInvoicesPanel = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState<NotificationFormData>({
    clientEmail: "",
    clientName: "",
    companyName: "",
    claimIds: "",
  });

  const sendNotification = async () => {
    if (!formData.clientEmail || !formData.companyName || !formData.claimIds) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      const claimIdsArray = formData.claimIds
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id.length > 0);

      if (claimIdsArray.length === 0) {
        toast({
          title: "No Claim IDs",
          description: "Please enter at least one claim ID",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke(
        "send-missing-invoice-notification",
        {
          body: {
            clientEmail: formData.clientEmail,
            clientName: formData.clientName || "Client",
            companyName: formData.companyName,
            missingCount: claimIdsArray.length,
            claimIds: claimIdsArray,
          },
        }
      );

      if (error) throw error;

      toast({
        title: "Notification Sent",
        description: `Email sent to ${formData.clientName || formData.companyName}`,
      });

      setDialogOpen(false);
      setFormData({
        clientEmail: "",
        clientName: "",
        companyName: "",
        claimIds: "",
      });
    } catch (error: any) {
      console.error("Error sending notification:", error);
      toast({
        title: "Failed to Send",
        description: error.message || "Could not send notification email",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Missing Invoice Notifications</h3>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Send className="mr-2 h-4 w-4" />
              Send Notification
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Send Missing Invoice Notification</DialogTitle>
              <DialogDescription>
                Manually notify a client about missing invoices for their claims
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  placeholder="ABC Client"
                  value={formData.companyName}
                  onChange={(e) =>
                    setFormData({ ...formData, companyName: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientName">Contact Name</Label>
                <Input
                  id="clientName"
                  placeholder="John Doe"
                  value={formData.clientName}
                  onChange={(e) =>
                    setFormData({ ...formData, clientName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientEmail">Email Address *</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  placeholder="client@company.com"
                  value={formData.clientEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, clientEmail: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="claimIds">Claim IDs (comma-separated) *</Label>
                <Textarea
                  id="claimIds"
                  placeholder="CLM-001, CLM-002, CLM-003"
                  value={formData.claimIds}
                  onChange={(e) =>
                    setFormData({ ...formData, claimIds: e.target.value })
                  }
                  rows={3}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Enter claim IDs separated by commas
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={sending}
              >
                Cancel
              </Button>
              <Button onClick={sendNotification} disabled={sending}>
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Notification
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <p className="text-sm text-muted-foreground">
        Send manual notifications to clients about missing invoices. You can specify which claim IDs need invoices.
      </p>
    </Card>
  );
};
