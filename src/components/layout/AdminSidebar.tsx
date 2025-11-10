import { Shield, Users, Settings, FileText, Receipt, Bell, Truck, DollarSign } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

const navigation = [
  { name: "Admin Dashboard", href: "/admin", icon: Shield },
  { name: "Claims", href: "/admin/claims", icon: FileText },
  { name: "Invoices", href: "/admin/invoices", icon: Receipt },
  { name: "Proof of Delivery", href: "/admin/proof-of-delivery", icon: Truck },
  { name: "Billing", href: "/admin/billing", icon: DollarSign },
  { name: "Notifications", href: "/admin/notifications", icon: Bell },
  { name: "Manage Users", href: "/admin/users", icon: Users },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

export const AdminSidebar = () => {
  const location = useLocation();
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const fetchNotificationCount = async () => {
      const { count } = await supabase
        .from("missing_invoice_notifications")
        .select("*", { count: 'exact', head: true })
        .in("status", ["invoice_uploaded", "proof_of_delivery_uploaded"]);

      setNotificationCount(count || 0);
    };

    fetchNotificationCount();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("admin-notification-count")
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
  }, []);

  return (
    <div className="flex h-screen w-64 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <img src={logo} alt="Auren Logo" className="h-8 w-8" />
        <div>
          <h1 className="text-lg font-bold text-foreground">Auren</h1>
          <p className="text-xs text-muted-foreground">Admin Panel</p>
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
                "flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-glow"
                  : "text-muted-foreground hover:bg-gradient-to-r hover:from-primary/10 hover:to-secondary/10 hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-5 w-5" />
                {item.name}
              </div>
              {item.name === "Notifications" && notificationCount > 0 && (
                <Badge variant="destructive" className="h-5 min-w-5 rounded-full px-1.5 text-xs">
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
