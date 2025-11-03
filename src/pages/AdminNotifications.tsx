import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Header } from "@/components/layout/Header";
import { AdminMissingInvoiceNotifications } from "@/components/dashboard/AdminMissingInvoiceNotifications";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const AdminNotifications = () => {
  // Mark all uploaded notifications as read when page loads
  useEffect(() => {
    const markAsRead = async () => {
      await supabase
        .from('missing_invoice_notifications')
        .update({ status: 'read' })
        .eq('status', 'invoice_uploaded');
    };
    
    markAsRead();
  }, []);

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Admin Notifications</h1>
              <p className="text-muted-foreground mt-2">
                View and manage all client missing invoice notifications
              </p>
            </div>
            <AdminMissingInvoiceNotifications />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminNotifications;
