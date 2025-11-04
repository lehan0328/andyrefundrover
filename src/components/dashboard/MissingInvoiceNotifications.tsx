import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Loader2, ChevronDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
  const [fileType, setFileType] = useState<'invoice' | 'proof_of_delivery'>('invoice');
  const { user } = useAuth();
  const { toast } = useToast();

  // Render PDF first page as PNG for OCR
  const renderPdfPreview = async (file: File): Promise<string | null> => {
    try {
      const pdfjsLib: any = await import('pdfjs-dist');
      if (pdfjsLib?.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs';
      }
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) return null;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await page.render({ canvasContext: context, viewport }).promise;
      return canvas.toDataURL("image/png");
    } catch (error) {
      console.error("Error rendering PDF preview:", error);
      return null;
    }
  };

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from("missing_invoice_notifications")
        .select("*")
        .eq("status", "unread")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching notifications:", error);
        return;
      }

      setNotifications(data || []);
    };

    fetchNotifications();

    // Subscribe to real-time updates for all changes
    const channel = supabase
      .channel("missing-invoice-notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "missing_invoice_notifications",
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleUploadFile = async (notificationId: string, file: File, uploadFileType: 'invoice' | 'proof_of_delivery') => {
    if (!user) return;
    
    setUploading(notificationId);
    try {
      // Upload file to appropriate storage bucket
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      const bucketName = uploadFileType === 'invoice' ? 'invoices' : 'proof-of-delivery';

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      if (uploadFileType === 'invoice') {
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

        console.log('Invoice created, triggering analysis:', invoice.id);

        // For PDFs, render first page preview for better OCR
        let imageDataUrl: string | undefined;
        if (file.type === 'application/pdf') {
          imageDataUrl = (await renderPdfPreview(file)) || undefined;
        }

        // Trigger invoice analysis in the background with image preview if available
        supabase.functions.invoke('analyze-invoice', {
          body: { invoiceId: invoice.id, imageDataUrl }
        }).then(({ error: analysisError }) => {
          if (analysisError) {
            console.error('Invoice analysis error:', analysisError);
          } else {
            console.log('Invoice analysis started');
          }
        });

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
      } else {
        // For proof of delivery, get notification details
        const { data: notification } = await supabase
          .from('missing_invoice_notifications')
          .select('*')
          .eq('id', notificationId)
          .single();

        if (notification) {
          // Create proof of delivery record
          const { error: podError } = await supabase
            .from('proof_of_delivery')
            .insert({
              user_id: user.id,
              file_name: file.name,
              file_path: filePath,
              file_type: file.type,
              file_size: file.size,
              shipment_id: notification.shipment_id,
              description: notification.description
            });

          if (podError) throw podError;

          // Delete the notification
          const { error: deleteError } = await supabase
            .from('missing_invoice_notifications')
            .delete()
            .eq('id', notificationId);

          if (deleteError) console.error('Error deleting notification:', deleteError);
        }

        toast({
          title: "Success",
          description: "Proof of delivery uploaded successfully",
        });
      }

      // Refresh notifications
      const { data, error } = await supabase
        .from("missing_invoice_notifications")
        .select("*")
        .eq("status", "unread")
        .order("created_at", { ascending: false });

      if (!error) {
        setNotifications(data || []);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: `Failed to upload ${uploadFileType === 'invoice' ? 'invoice' : 'proof of delivery'}`,
        variant: "destructive",
      });
    } finally {
      setUploading(null);
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  const renderTable = () => (
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
        {notifications.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
              No pending notifications
            </TableCell>
          </TableRow>
        ) : (
          notifications.map((notification) => (
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
                <Badge variant="destructive" className="text-xs">Pending</Badge>
              </TableCell>
              <TableCell className="text-right">
                <Input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  id={`file-${notification.id}`}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadFile(notification.id, file, fileType);
                  }}
                  disabled={uploading === notification.id}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="default"
                      size="sm"
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
                          Upload File
                          <ChevronDown className="h-3 w-3 ml-1" />
                        </>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-card z-50">
                    <DropdownMenuItem
                      onClick={() => {
                        setFileType('invoice');
                        document.getElementById(`file-${notification.id}`)?.click();
                      }}
                    >
                      Invoice
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setFileType('proof_of_delivery');
                        document.getElementById(`file-${notification.id}`)?.click();
                      }}
                    >
                      Proof of Delivery
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return renderTable();
};
