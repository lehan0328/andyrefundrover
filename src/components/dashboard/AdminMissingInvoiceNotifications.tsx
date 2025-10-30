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
            <div
              key={notification.id}
              className="border rounded-lg p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap text-sm">
                    <span className="font-medium text-destructive">Missing Invoice Required</span>
                    {notification.status !== "resolved" && (
                      <Badge variant="destructive" className="text-xs">
                        {differenceInDays(new Date(), new Date(notification.created_at))} days due
                      </Badge>
                    )}
                    {notification.status === "invoice_uploaded" && (
                      <Badge variant="secondary" className="text-xs">Invoice Uploaded</Badge>
                    )}
                    {notification.status === "resolved" && (
                      <Badge variant="outline" className="text-xs">Resolved</Badge>
                    )}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">{notification.company_name}</span>
                    <span className="text-muted-foreground"> ({notification.client_name})</span>
                  </div>
                  {notification.shipment_id && (
                    <p className="text-xs text-muted-foreground">
                      Shipment: {notification.shipment_id}
                    </p>
                  )}
                  {notification.claim_ids && notification.claim_ids.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {notification.claim_ids.length} claim{notification.claim_ids.length > 1 ? 's' : ''} require invoice{notification.claim_ids.length > 1 ? 's' : ''}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
              {notification.status !== 'resolved' && (
                <div className="flex gap-2 pt-2 border-t">
                  {notification.status === 'invoice_uploaded' && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleResolve(notification.id)}
                      disabled={resolving === notification.id}
                      className="h-8 text-xs"
                    >
                      {resolving === notification.id ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Resolving...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
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
                    className="h-8 text-xs"
                  >
                    {followingUp === notification.id ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Following Up...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Follow Up
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
