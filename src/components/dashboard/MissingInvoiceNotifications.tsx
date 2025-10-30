import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface MissingInvoiceNotification {
  id: string;
  client_name: string;
  company_name: string;
  shipment_id: string | null;
  claim_ids: string[] | null;
  missing_count: number | null;
  description: string | null;
  status: string;
  created_at: string;
}

export const MissingInvoiceNotifications = () => {
  const [notifications, setNotifications] = useState<MissingInvoiceNotification[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from("missing_invoice_notifications")
        .select("*")
        .in("status", ["unread", "invoice_uploaded"])
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching notifications:", error);
        return;
      }

      setNotifications(data || []);
    };

    fetchNotifications();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("missing-invoice-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "missing_invoice_notifications",
        },
        (payload) => {
          const newNotification = payload.new as MissingInvoiceNotification;
          if (newNotification.status === "unread") {
            setNotifications((prev) => [newNotification, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleUploadInvoice = async (notificationId: string, file: File) => {
    if (!user) return;
    
    setUploading(notificationId);
    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create invoice record
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          analysis_status: 'pending'
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Update notification with uploaded invoice using secure database function
      const { data: updateResult, error: updateError } = await supabase
        .rpc('update_notification_invoice_status', {
          p_notification_id: notificationId,
          p_invoice_id: invoice.id
        });

      if (updateError) {
        console.error('Error updating notification status:', updateError);
        throw updateError;
      }

      if (!updateResult) {
        console.error('Failed to update notification - user may not have permission');
        throw new Error('Failed to update notification status');
      }

      console.log('Notification updated successfully for ID:', notificationId);

      toast({
        title: "Success",
        description: "Invoice uploaded successfully",
      });

      // Refresh notifications
      const { data, error } = await supabase
        .from("missing_invoice_notifications")
        .select("*")
        .in("status", ["unread", "invoice_uploaded"])
        .order("created_at", { ascending: false });

      if (!error) {
        setNotifications(data || []);
      }
    } catch (error) {
      console.error('Error uploading invoice:', error);
      toast({
        title: "Error",
        description: "Failed to upload invoice",
        variant: "destructive",
      });
    } finally {
      setUploading(null);
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Shipment</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {notifications.map((notification) => (
          <TableRow key={notification.id}>
            <TableCell>
              {notification.shipment_id ? (
                <div className="text-sm">{notification.shipment_id}</div>
              ) : notification.claim_ids && notification.claim_ids.length > 0 ? (
                <div className="text-sm text-muted-foreground">
                  {notification.claim_ids.length} claim{notification.claim_ids.length > 1 ? 's' : ''}
                </div>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </TableCell>
            <TableCell>
              <div className="space-y-1 max-w-md">
                {notification.description && (
                  <p className="text-sm">{notification.description}</p>
                )}
                {notification.claim_ids && notification.claim_ids.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Claims: {notification.claim_ids.slice(0, 2).join(', ')}
                    {notification.claim_ids.length > 2 && ` +${notification.claim_ids.length - 2} more`}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </p>
              </div>
            </TableCell>
            <TableCell>
              {notification.status === 'invoice_uploaded' ? (
                <Badge variant="secondary" className="text-xs">Invoice Uploaded</Badge>
              ) : (
                <Badge variant="destructive" className="text-xs">Pending</Badge>
              )}
            </TableCell>
            <TableCell className="text-right">
              {notification.status !== 'invoice_uploaded' && notification.status !== 'resolved' && (
                <>
                  <Input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    id={`file-${notification.id}`}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadInvoice(notification.id, file);
                    }}
                    disabled={uploading === notification.id}
                  />
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => document.getElementById(`file-${notification.id}`)?.click()}
                    disabled={uploading === notification.id}
                    className="h-8 text-xs"
                  >
                    {uploading === notification.id ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-3 w-3 mr-1" />
                        Upload Invoice
                      </>
                    )}
                  </Button>
                </>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
