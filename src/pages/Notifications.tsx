import { CustomerSidebar } from "@/components/layout/CustomerSidebar";
import { Header } from "@/components/layout/Header";
import { MissingInvoiceNotifications } from "@/components/dashboard/MissingInvoiceNotifications";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const Notifications = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      const { count, error } = await supabase
        .from("missing_invoice_notifications")
        .select("*", { count: "exact", head: true })
        .eq("status", "unread");

      if (!error && count !== null) {
        setUnreadCount(count);
      }
    };

    fetchUnreadCount();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("notification-page-count")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "missing_invoice_notifications",
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <div className="flex h-screen bg-background">
      <CustomerSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="h-6 px-2 text-sm">
                  {unreadCount} New
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              View and manage your missing invoice notifications
            </p>
            <MissingInvoiceNotifications />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Notifications;
