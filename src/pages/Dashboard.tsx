import { DollarSign, FileText, CheckCircle, XCircle, Clock, Filter } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { ClaimsChart } from "@/components/dashboard/ClaimsChart";
import { RecentClaims } from "@/components/dashboard/RecentClaims";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { allClaims } from "@/data/claimsData";
import { useState } from "react";
import { isAfter, isSameDay, startOfMonth, endOfMonth, subDays, subMonths } from "date-fns";

const Dashboard = () => {
  const [dateFilter, setDateFilter] = useState("all");
  
  // Filter claims by selected date range
  const filterByDate = (claimDate: string) => {
    if (dateFilter === "all") return true;
    const date = new Date(claimDate);
    const now = new Date();

    switch (dateFilter) {
      case "today":
        return isSameDay(date, now);
      case "7days":
        return isAfter(date, subDays(now, 7));
      case "thisMonth":
        return date >= startOfMonth(now) && date <= endOfMonth(now);
      case "lastMonth":
        const lastMonth = subMonths(now, 1);
        return date >= startOfMonth(lastMonth) && date <= endOfMonth(lastMonth);
      case "30days":
        return isAfter(date, subDays(now, 30));
      case "60days":
        return isAfter(date, subDays(now, 60));
      case "90days":
        return isAfter(date, subDays(now, 90));
      default:
        return true;
    }
  };

  const filteredClaims = allClaims.filter(c => filterByDate(c.date));

  // Calculate stats from filtered claims
  const totalClaims = filteredClaims.length;
  const approvedClaims = filteredClaims.filter(claim => claim.status === "Approved");
  const pendingClaims = filteredClaims.filter(claim => claim.status === "Pending");
  const deniedClaims = filteredClaims.filter(claim => claim.status === "Denied");
  const submittedClaims = filteredClaims.filter(claim => claim.status === "Submitted");
  
  // Calculate approved amount
  const approvedAmount = approvedClaims.reduce((sum, claim) => {
    const amount = parseFloat(claim.amount.replace("$", "").replace(",", ""));
    return sum + amount;
  }, 0);
  
  // Calculate percentages for status breakdown
  const pct = (n: number) => (totalClaims ? Math.round((n / totalClaims) * 100) : 0);
  const approvedPercentage = pct(approvedClaims.length);
  const pendingPercentage = pct(pendingClaims.length);
  const deniedPercentage = pct(deniedClaims.length);
  const submittedPercentage = pct(submittedClaims.length);

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
          title="Total Claims Submitted"
          value={submittedClaims.length.toString()}
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
                <span className="text-sm font-medium">Submitted</span>
              </div>
              <span className="text-sm font-bold">{submittedClaims.length} ({submittedPercentage}%)</span>
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
