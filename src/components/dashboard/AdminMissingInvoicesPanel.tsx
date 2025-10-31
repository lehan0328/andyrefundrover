import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { AlertCircle, Send, Loader2, Mail, Check, ChevronsUpDown } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Client {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
}

interface NotificationFormData {
  clientId: string;
  clientEmail: string;
  clientName: string;
  companyName: string;
  shipmentId: string;
  description: string;
}

export const AdminMissingInvoicesPanel = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState<NotificationFormData>({
    clientId: "",
    clientEmail: "",
    clientName: "",
    companyName: "",
    shipmentId: "",
    description: "",
  });

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const { data: customersData, error: customersError } = await supabase
          .from("customers")
          .select("id, company_name, contact_name, email")
          .order("company_name");

        if (customersError) throw customersError;

        if (customersData && customersData.length > 0) {
          setClients(customersData);
        } else {
          // Fallback to profiles if no customers
          const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("id, company_name, full_name, email")
            .not("company_name", "is", null)
            .order("company_name");

          if (profilesError) throw profilesError;

          const profileClients = profilesData?.map((p) => ({
            id: p.id,
            company_name: p.company_name || "",
            contact_name: p.full_name || "",
            email: p.email,
          })) || [];

          setClients(profileClients);
        }
      } catch (error) {
        console.error("Error fetching clients:", error);
      }
    };

    if (dialogOpen) {
      fetchClients();
    }
  }, [dialogOpen]);

  const handleClientSelect = async (clientId: string) => {
    const selectedClient = clients.find((c) => c.id === clientId);
    if (selectedClient) {
      // Try to find a user profile associated with this company
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('company_name', selectedClient.company_name)
        .single();

      setFormData({
        ...formData,
        clientId: selectedClient.id,
        companyName: selectedClient.company_name,
        // Use profile data if available, otherwise fall back to customer data
        clientName: profile?.full_name || selectedClient.contact_name,
        clientEmail: profile?.email || selectedClient.email,
      });
    }
    setClientPopoverOpen(false);
  };

  const sendNotification = async () => {
    if (!formData.clientEmail || !formData.companyName || !formData.shipmentId || !formData.description) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "send-missing-invoice-notification",
        {
          body: {
            clientEmail: formData.clientEmail,
            clientName: formData.clientName || "Client",
            companyName: formData.companyName,
            shipmentId: formData.shipmentId,
            description: formData.description,
            missingCount: 1,
            claimIds: [formData.shipmentId],
          },
        }
      );

      if (error) throw error;

      toast({
        title: "Notification Sent",
      });

      setDialogOpen(false);
      setFormData({
        clientId: "",
        clientEmail: "",
        clientName: "",
        companyName: "",
        shipmentId: "",
        description: "",
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
                <Label>Select Client *</Label>
                <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={clientPopoverOpen}
                      className="w-full justify-between"
                    >
                      {formData.companyName || "Select client..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0 bg-popover" align="start">
                    <Command className="bg-popover">
                      <CommandInput placeholder="Search clients..." />
                      <CommandList>
                        <CommandEmpty>No client found.</CommandEmpty>
                        <CommandGroup>
                          {clients.map((client) => (
                            <CommandItem
                              key={client.id}
                              value={client.company_name}
                              onSelect={() => handleClientSelect(client.id)}
                              className="cursor-pointer"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.clientId === client.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <span className="font-medium">{client.company_name}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shipmentId">Shipment ID *</Label>
                <Input
                  id="shipmentId"
                  placeholder="FBA15XYWZ"
                  value={formData.shipmentId}
                  onChange={(e) =>
                    setFormData({ ...formData, shipmentId: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Please upload invoice for shipment FBA15XYWZ containing Air Wick products..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={4}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Describe what invoices or documents are needed
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
