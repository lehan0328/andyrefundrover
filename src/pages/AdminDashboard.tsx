import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, TrendingUp, DollarSign } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { allClaims } from "@/data/claimsData";
import { AdminMissingInvoicesPanel } from "@/components/dashboard/AdminMissingInvoicesPanel";

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Simulate loading
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

      <AdminMissingInvoicesPanel />
    </div>
  );
};

export default AdminDashboard;
