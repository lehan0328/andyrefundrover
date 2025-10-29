import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentClaims } from "@/components/dashboard/RecentClaims";
import { ClaimsChart } from "@/components/dashboard/ClaimsChart";
import { DollarSign, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";

const ClientDashboardView = () => {
  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Client Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of reimbursement claims and recovery status
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Claims"
          value="45"
          icon={DollarSign}
          variant="default"
        />
        <StatCard
          title="Approved Claims"
          value="28"
          icon={CheckCircle}
          variant="success"
        />
        <StatCard
          title="Pending Review"
          value="12"
          icon={AlertCircle}
          variant="warning"
        />
        <StatCard
          title="Total Recovered"
          value="$12,450"
          icon={TrendingUp}
          variant="success"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ClaimsChart />
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Average Recovery Time</span>
              <span className="font-semibold">14 days</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Success Rate</span>
              <span className="font-semibold">85%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">This Month</span>
              <span className="font-semibold text-primary">$3,245</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Last Month</span>
              <span className="font-semibold">$2,890</span>
            </div>
          </div>
        </Card>
      </div>

      <RecentClaims limit={5} />
    </div>
  );
};

export default ClientDashboardView;
