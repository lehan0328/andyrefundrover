import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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
  const { user } = useAuth();

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

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from("missing_invoice_notifications")
      .update({ status: "read" })
      .eq("id", id);

    if (error) {
      console.error("Error marking notification as read:", error);
      return;
    }

    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {notifications.map((notification) => (
        <Alert key={notification.id} variant="destructive" className="relative">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="flex items-center justify-between pr-8">
            Missing Invoice Required
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-2 h-6 w-6 p-0"
              onClick={() => markAsRead(notification.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertTitle>
          <AlertDescription className="space-y-2">
            <div>
              {notification.shipment_id ? (
                <p>
                  <strong>Shipment ID:</strong> {notification.shipment_id}
                </p>
              ) : notification.claim_ids && notification.claim_ids.length > 0 ? (
                <div>
                  <p className="font-semibold">
                    {notification.claim_ids.length} claims require invoices:
                  </p>
                  <ul className="list-disc list-inside ml-2">
                    {notification.claim_ids.map((claimId) => (
                      <li key={claimId}>{claimId}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
            {notification.description && (
              <p className="text-sm">{notification.description}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(notification.created_at), {
                addSuffix: true,
              })}
            </p>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
};
