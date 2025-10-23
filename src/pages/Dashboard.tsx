import { DollarSign, FileText, CheckCircle, XCircle, Clock, Filter, CalendarIcon } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { ClaimsChart } from "@/components/dashboard/ClaimsChart";
import { RecentClaims } from "@/components/dashboard/RecentClaims";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { allClaims } from "@/data/claimsData";
import { useState } from "react";

const Dashboard = () => {
  const [dateFilter, setDateFilter] = useState("all");
  
  // Calculate stats from actual claims data
  const totalClaims = allClaims.length;
  const approvedClaims = allClaims.filter(claim => claim.status === "approved");
  const pendingClaims = allClaims.filter(claim => claim.status === "pending");
  const deniedClaims = allClaims.filter(claim => claim.status === "denied");
  const filedClaims = allClaims.filter(claim => claim.status === "filed");
  
  // Calculate approved amount
  const approvedAmount = approvedClaims.reduce((sum, claim) => {
    const amount = parseFloat(claim.amount.replace("$", "").replace(",", ""));
    return sum + amount;
  }, 0);
  
  // Calculate percentages for status breakdown
  const approvedPercentage = Math.round((approvedClaims.length / totalClaims) * 100);
  const pendingPercentage = Math.round((pendingClaims.length / totalClaims) * 100);
  const deniedPercentage = Math.round((deniedClaims.length / totalClaims) * 100);
  const filedPercentage = Math.round((filedClaims.length / totalClaims) * 100);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Track your FBA and AWD reimbursement claims
        </p>
      </div>

      <div className="flex justify-end mb-4">
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[140px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ALL</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="7days">Last 7 Days</SelectItem>
            <SelectItem value="thisMonth">This Month</SelectItem>
            <SelectItem value="lastMonth">Last Month</SelectItem>
            <SelectItem value="30days">Last 30 Days</SelectItem>
            <SelectItem value="60days">Last 60 Days</SelectItem>
            <SelectItem value="90days">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total Claims"
          value={totalClaims.toString()}
          change={`All claims in system`}
          icon={DollarSign}
          variant="default"
        />
        <StatCard
          title="Total Claims Filed"
          value={filedClaims.length.toString()}
          change="Awaiting submission"
          icon={FileText}
          variant="default"
        />
        <StatCard
          title="Approved Amount"
          value={`$${approvedAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          change={`${approvedClaims.length} claims approved`}
          trend="up"
          icon={CheckCircle}
          variant="success"
        />
        <StatCard
          title="Pending Claims"
          value={pendingClaims.length.toString()}
          change="Under review"
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="Denied Claims"
          value={deniedClaims.length.toString()}
          change="Requires attention"
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
                <div className="h-4 w-4 rounded-full bg-blue-500"></div>
                <span className="text-sm font-medium">Filed</span>
              </div>
              <span className="text-sm font-bold">{filedClaims.length} ({filedPercentage}%)</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded-full bg-primary"></div>
                <span className="text-sm font-medium">Approved</span>
              </div>
              <span className="text-sm font-bold">{approvedClaims.length} ({approvedPercentage}%)</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded-full bg-accent"></div>
                <span className="text-sm font-medium">Pending</span>
              </div>
              <span className="text-sm font-bold">{pendingClaims.length} ({pendingPercentage}%)</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded-full bg-destructive"></div>
                <span className="text-sm font-medium">Denied</span>
              </div>
              <span className="text-sm font-bold">{deniedClaims.length} ({deniedPercentage}%)</span>
            </div>
          </div>
        </Card>
      </div>

      <RecentClaims />
    </div>
  );
};

export default Dashboard;
