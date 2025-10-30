import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Bell, CheckCircle, Loader2, RefreshCw } from "lucide-react";
import { formatDistanceToNow, differenceInDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

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
  const [resolving, setResolving] = useState<string | null>(null);
  const [followingUp, setFollowingUp] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

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

  const handleResolve = async (id: string) => {
    if (!user) return;
    
    setResolving(id);
    try {
      const { error } = await supabase
        .from('missing_invoice_notifications')
        .update({ 
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: user.id
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Notification resolved successfully",
      });

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: "resolved" } : n))
      );
    } catch (error) {
      console.error('Error resolving notification:', error);
      toast({
        title: "Error",
        description: "Failed to resolve notification",
        variant: "destructive",
      });
    } finally {
      setResolving(null);
    }
  };

  const handleFollowUp = async (id: string) => {
    if (!user) return;
    
    setFollowingUp(id);
    try {
      const { error } = await supabase
        .from('missing_invoice_notifications')
        .update({ 
          updated_at: new Date().toISOString(),
          status: 'unread'
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Follow-up sent successfully",
      });

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: "unread", updated_at: new Date().toISOString() } : n))
      );
    } catch (error) {
      console.error('Error sending follow-up:', error);
      toast({
        title: "Error",
        description: "Failed to send follow-up",
        variant: "destructive",
      });
    } finally {
      setFollowingUp(null);
    }
  };

  const unreadCount = notifications.filter((n) => n.status === "unread" || n.status === "invoice_uploaded").length;

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
              variant={notification.status === "unread" || notification.status === "invoice_uploaded" ? "destructive" : "default"}
              className="relative"
            >
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="flex items-center justify-between pr-8">
                <div className="flex items-center gap-2 flex-wrap">
                  Missing Invoice Required
                  {notification.status === "invoice_uploaded" && (
                    <Badge variant="secondary">Invoice Uploaded</Badge>
                  )}
                  {notification.status === "resolved" && (
                    <Badge variant="outline">Resolved</Badge>
                  )}
                  {notification.status !== "resolved" && (
                    <Badge variant="destructive">
                      {differenceInDays(new Date(), new Date(notification.created_at))} days due
                    </Badge>
                  )}
                </div>
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
                {notification.status !== 'resolved' && (
                  <div className="mt-4 pt-4 border-t flex gap-2">
                    {notification.status === 'invoice_uploaded' && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleResolve(notification.id)}
                        disabled={resolving === notification.id}
                      >
                        {resolving === notification.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Resolving...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Resolve
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFollowUp(notification.id)}
                      disabled={followingUp === notification.id}
                    >
                      {followingUp === notification.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Following Up...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Follow Up
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          ))
        )}
      </CardContent>
    </Card>
  );
};
