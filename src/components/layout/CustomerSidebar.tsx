import { LayoutDashboard, FileText, Settings, Receipt, Bell } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Claims", href: "/claims", icon: FileText },
  { name: "Invoices", href: "/invoices", icon: Receipt },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Settings", href: "/settings", icon: Settings },
];

export const CustomerSidebar = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchNotificationCount = async () => {
      const { count, error } = await supabase
        .from("missing_invoice_notifications")
        .select("*", { count: "exact", head: true })
        .eq("status", "unread");

      if (!error && count !== null) {
        setNotificationCount(count);
      }
    };

    fetchNotificationCount();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("sidebar-notification-count")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "missing_invoice_notifications",
        },
        () => {
          fetchNotificationCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <div className="flex h-screen w-64 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <img src={logo} alt="Auren Logo" className="h-8 w-8" />
        <div>
          <h1 className="text-lg font-bold text-foreground">Auren</h1>
          <p className="text-xs text-muted-foreground">Reimbursement</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all relative",
                isActive
                  ? "bg-primary text-primary-foreground shadow-glow"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
              {item.name === "Notifications" && notificationCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="ml-auto h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {notificationCount}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
