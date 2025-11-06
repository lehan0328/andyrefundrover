import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, TrendingUp, DollarSign, FileText, CheckCircle2 } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { allClaims } from "@/data/claimsData";
import { AdminMissingInvoicesPanel } from "@/components/dashboard/AdminMissingInvoicesPanel";

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [totalRequested, setTotalRequested] = useState(0);
  const [totalResolved, setTotalResolved] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    const fetchNotificationStats = async () => {
      const { data, error } = await supabase
        .from("missing_invoice_notifications")
        .select("status");

      if (error) {
        console.error("Error fetching notifications:", error);
        return;
      }

      if (data) {
        setTotalRequested(data.length);
        setTotalResolved(data.filter(n => n.status === 'resolved').length);
      }
    };

    fetchNotificationStats();
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Calculate statistics from claims data
  const uniqueClientCount = new Set(allClaims.map((c: any) => c.companyName)).size;
  const totalClaims = allClaims.length;
  
  // Calculate estimated reimbursement (pending + submitted claims)
  const estimatedReimbursement = allClaims
    .filter((claim: any) => claim.status === "Pending" || claim.status === "Submitted")
    .reduce((sum, claim: any) => {
      const amount = parseFloat(claim.amount.replace('$', '').replace(',', ''));
      return sum + amount;
    }, 0);
  
  // Calculate total reimbursed (approved claims only)
  const totalReimbursed = allClaims
    .filter((claim: any) => claim.status === "Approved")
    .reduce((sum, claim: any) => {
      const amount = parseFloat(claim.amount.replace('$', '').replace(',', ''));
      return sum + amount;
    }, 0);

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Monitor system activity and key metrics</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Clients"
          value={uniqueClientCount.toString()}
          icon={Users}
          variant="default"
        />
        <StatCard
          title="Total Claims"
          value={totalClaims.toString()}
          icon={TrendingUp}
          variant="default"
        />
        <StatCard
          title="Estimated Reimbursement"
          value={`$${estimatedReimbursement.toLocaleString()}`}
          icon={DollarSign}
          variant="warning"
        />
        <StatCard
          title="Total Reimbursed"
          value={`$${totalReimbursed.toLocaleString()}`}
          icon={TrendingUp}
          variant="success"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <StatCard
          title="Total Requested Documents"
          value={totalRequested.toString()}
          icon={FileText}
          variant="warning"
        />
        <StatCard
          title="Total Resolved Documents"
          value={totalResolved.toString()}
          icon={CheckCircle2}
          variant="success"
        />
      </div>

      <AdminMissingInvoicesPanel />
    </div>
  );
};

export default AdminDashboard;
