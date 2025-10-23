import { DollarSign, FileText, CheckCircle, XCircle, Clock } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { ClaimsChart } from "@/components/dashboard/ClaimsChart";
import { RecentClaims } from "@/components/dashboard/RecentClaims";
import { Card } from "@/components/ui/card";

const Dashboard = () => {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Track your FBA and AWD reimbursement claims
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Claims Filed"
          value="156"
          change="+12% from last month"
          trend="up"
          icon={FileText}
          variant="default"
        />
        <StatCard
          title="Approved Amount"
          value="$28,450"
          change="+8% from last month"
          trend="up"
          icon={CheckCircle}
          variant="success"
        />
        <StatCard
          title="Pending Claims"
          value="23"
          change="15 new this week"
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="Denied Claims"
          value="8"
          change="-3% from last month"
          trend="down"
          icon={XCircle}
          variant="error"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ClaimsChart />
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-6">Claims by Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded-full bg-primary"></div>
                <span className="text-sm font-medium">Approved</span>
              </div>
              <span className="text-sm font-bold">125 (80%)</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded-full bg-accent"></div>
                <span className="text-sm font-medium">Pending</span>
              </div>
              <span className="text-sm font-bold">23 (15%)</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded-full bg-destructive"></div>
                <span className="text-sm font-medium">Denied</span>
              </div>
              <span className="text-sm font-bold">8 (5%)</span>
            </div>
          </div>
        </Card>
      </div>

      <RecentClaims />
    </div>
  );
};

export default Dashboard;
