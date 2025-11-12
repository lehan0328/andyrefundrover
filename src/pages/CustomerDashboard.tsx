import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/StatCard";
import { ClaimsChart } from "@/components/dashboard/ClaimsChart";
import { RecentClaims } from "@/components/dashboard/RecentClaims";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, FileText, CheckCircle, Clock, XCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { allClaims } from "@/data/claimsData";
import { isAfter, isWithinInterval, subDays, subMonths, subYears } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const CustomerDashboard = () => {
  const [dateFilter, setDateFilter] = useState("all");
  const [userCompany, setUserCompany] = useState<string | null>(null);
  const { user } = useAuth();

  // Fetch user's company name
  useEffect(() => {
    const fetchUserCompany = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('company_name')
          .eq('id', user.id)
          .single();

        if (data && data.company_name) {
          setUserCompany(data.company_name);
        }
      }
    };

    fetchUserCompany();
  }, [user]);

  const filterByDate = (claimDate: string) => {
    const date = new Date(claimDate);
    const now = new Date();

    switch (dateFilter) {
      case "7days":
        return isAfter(date, subDays(now, 7));
      case "30days":
        return isAfter(date, subDays(now, 30));
      case "3months":
        return isAfter(date, subMonths(now, 3));
      case "year":
        return isAfter(date, subYears(now, 1));
      default:
        return true;
    }
  };

  // Filter claims by user's company and date
  const filteredClaims = allClaims.filter((claim) => {
    const matchesCompany = userCompany ? claim.companyName === userCompany : false;
    const matchesDate = filterByDate(claim.date);
    return matchesCompany && matchesDate;
  });
  
  const totalClaims = filteredClaims.length;
  const approvedClaims = filteredClaims.filter((c) => c.status === "Approved").length;
  const pendingClaims = filteredClaims.filter((c) => c.status === "Pending").length;
  const deniedClaims = filteredClaims.filter((c) => c.status === "Denied").length;
  const submittedClaims = filteredClaims.filter((c) => c.status === "Submitted").length;

  const approvedAmount = filteredClaims
    .filter((c) => c.status === "Approved")
    .reduce((sum, claim) => {
      const amount = parseFloat(claim.actualRecovered.replace(/[$,]/g, '')) || 0;
      return sum + amount;
    }, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const pct = (n: number) => totalClaims > 0 ? ((n / totalClaims) * 100).toFixed(0) : "0";

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{userCompany || "Company"} Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Track your reimbursement claims and recovery progress
          </p>
        </div>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="7days">Last 7 Days</SelectItem>
            <SelectItem value="30days">Last 30 Days</SelectItem>
            <SelectItem value="3months">Last 3 Months</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total Claims"
          value={totalClaims.toString()}
          icon={FileText}
          variant="default"
        />
        <StatCard
          title="Total Submitted"
          value={submittedClaims.toString()}
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="Approved Amount"
          value={formatCurrency(approvedAmount)}
          icon={DollarSign}
          variant="success"
        />
        <StatCard
          title="Pending Claims"
          value={pendingClaims.toString()}
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="Denied Claims"
          value={deniedClaims.toString()}
          icon={XCircle}
          variant="error"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ClaimsChart />
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-6">Claims Breakdown</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium">Approved</span>
              </div>
              <span className="font-bold">{approvedClaims} ({pct(approvedClaims)}%)</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-accent/30">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-amber-600" />
                <span className="font-medium">Pending</span>
              </div>
              <span className="font-bold">{pendingClaims} ({pct(pendingClaims)}%)</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10">
              <div className="flex items-center gap-3">
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="font-medium">Denied</span>
              </div>
              <span className="font-bold">{deniedClaims} ({pct(deniedClaims)}%)</span>
            </div>
          </div>
        </Card>
      </div>

      <RecentClaims limit={5} showAll={false} />
    </div>
  );
};

export default CustomerDashboard;
