import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, X, Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface MissingInvoiceNotification {
  id: string;
  client_name: string;
  client_email: string;
  company_name: string;
  shipment_id: string | null;
  claim_ids: string[] | null;
  missing_count: number | null;
  description: string | null;
  status: string;
  created_at: string;
}

export const AdminMissingInvoiceNotifications = () => {
  const [notifications, setNotifications] = useState<MissingInvoiceNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from("missing_invoice_notifications")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching notifications:", error);
        setLoading(false);
        return;
      }

      setNotifications(data || []);
      setLoading(false);
    };

    fetchNotifications();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("admin-missing-invoice-notifications")
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
  }, []);

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from("missing_invoice_notifications")
      .update({ status: "read" })
      .eq("id", id);

    if (error) {
      console.error("Error marking notification as read:", error);
      return;
    }

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status: "read" } : n))
    );
  };

  const unreadCount = notifications.filter((n) => n.status === "unread").length;

  if (loading) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Missing Invoice Notifications</CardTitle>
          </div>
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount} unread</Badge>
          )}
        </div>
        <CardDescription>
          All notifications across clients requiring invoice uploads
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notifications</p>
        ) : (
          notifications.map((notification) => (
            <Alert
              key={notification.id}
              variant={notification.status === "unread" ? "destructive" : "default"}
              className="relative"
            >
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="flex items-center justify-between pr-8">
                <div className="flex items-center gap-2">
                  Missing Invoice Required
                  {notification.status === "read" && (
                    <Badge variant="outline" className="text-xs">
                      Read
                    </Badge>
                  )}
                </div>
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
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span>{notification.company_name}</span>
                  <span className="text-muted-foreground">
                    ({notification.client_name})
                  </span>
                </div>
                <div>
                  {notification.shipment_id ? (
                    <p className="text-sm">
                      <strong>Shipment ID:</strong> {notification.shipment_id}
                    </p>
                  ) : notification.claim_ids && notification.claim_ids.length > 0 ? (
                    <div>
                      <p className="text-sm font-semibold">
                        {notification.claim_ids.length} claims require invoices:
                      </p>
                      <ul className="list-disc list-inside ml-2 text-sm">
                        {notification.claim_ids.slice(0, 3).map((claimId) => (
                          <li key={claimId}>{claimId}</li>
                        ))}
                        {notification.claim_ids.length > 3 && (
                          <li>+{notification.claim_ids.length - 3} more</li>
                        )}
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
          ))
        )}
      </CardContent>
    </Card>
  );
};
