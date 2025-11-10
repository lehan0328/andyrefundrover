import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { allClaims } from "@/data/claimsData";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, AlertCircle, DollarSign, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const AnalyticsPanel = () => {
  // Process claims data for analytics
  const processTrendData = () => {
    const monthlyData: Record<string, any> = {};
    
    allClaims.forEach((claim: any) => {
      const month = new Date(claim.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (!monthlyData[month]) {
        monthlyData[month] = {
          month,
          recovered: 0,
          expected: 0,
          count: 0
        };
      }
      
      const amount = parseFloat(claim.amount.replace('$', '').replace(',', ''));
      const recovered = claim.actualRecovered ? parseFloat(claim.actualRecovered.replace('$', '').replace(',', '')) : 0;
      
      monthlyData[month].expected += amount;
      monthlyData[month].recovered += recovered;
      monthlyData[month].count += 1;
    });
    
    return Object.values(monthlyData).slice(-6);
  };

  const processCategoryData = () => {
    const categories: Record<string, number> = {};
    
    allClaims.forEach((claim: any) => {
      const category = claim.type || 'Other';
      const amount = parseFloat(claim.amount.replace('$', '').replace(',', ''));
      categories[category] = (categories[category] || 0) + amount;
    });
    
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  };

  const processStatusData = () => {
    const statuses: Record<string, any> = {};
    
    allClaims.forEach((claim: any) => {
      const status = claim.status;
      if (!statuses[status]) {
        statuses[status] = { status, count: 0, amount: 0 };
      }
      statuses[status].count += 1;
      const recovered = claim.actualRecovered ? parseFloat(claim.actualRecovered.replace('$', '').replace(',', '')) : 0;
      statuses[status].amount += recovered;
    });
    
    return Object.values(statuses);
  };

  const processTopClients = () => {
    const clients: Record<string, number> = {};
    
    allClaims.forEach((claim: any) => {
      const client = claim.companyName;
      const recovered = claim.actualRecovered ? parseFloat(claim.actualRecovered.replace('$', '').replace(',', '')) : 0;
      clients[client] = (clients[client] || 0) + recovered;
    });
    
    return Object.entries(clients)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  };

  const calculateMetrics = () => {
    const totalExpected = allClaims.reduce((sum, claim: any) => {
      return sum + parseFloat(claim.amount.replace('$', '').replace(',', ''));
    }, 0);
    
    const totalRecovered = allClaims.reduce((sum, claim: any) => {
      const recovered = claim.actualRecovered ? parseFloat(claim.actualRecovered.replace('$', '').replace(',', '')) : 0;
      return sum + recovered;
    }, 0);
    
    const recoveryRate = totalExpected > 0 ? (totalRecovered / totalExpected) * 100 : 0;
    
    const approvedClaims = allClaims.filter((c: any) => c.status === "Approved");
    const avgDaysToRecover = approvedClaims.length > 0 ? 
      approvedClaims.reduce((sum, claim: any) => {
        const submitted = new Date(claim.date);
        const now = new Date();
        const days = Math.floor((now.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0) / approvedClaims.length : 0;

    return { totalExpected, totalRecovered, recoveryRate, avgDaysToRecover };
  };

  const trendData = processTrendData();
  const categoryData = processCategoryData();
  const statusData = processStatusData();
  const topClients = processTopClients();
  const metrics = calculateMetrics();

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--destructive))', 'hsl(var(--muted))', 'hsl(var(--chart-2))'];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          Reimbursement Analytics
        </CardTitle>
        <CardDescription>
          Comprehensive insights into FBA reimbursements, recovery rates, and performance metrics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Recovery Rate</p>
                  <p className="text-2xl font-bold text-primary">{metrics.recoveryRate.toFixed(1)}%</p>
                </div>
                <Target className="h-8 w-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Recovered</p>
                  <p className="text-2xl font-bold text-green-600">${metrics.totalRecovered.toLocaleString()}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600/20" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Days to Recover</p>
                  <p className="text-2xl font-bold">{Math.round(metrics.avgDaysToRecover)}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-amber-600/20" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Efficiency Score</p>
                  <p className="text-2xl font-bold">{Math.min(100, Math.round(metrics.recoveryRate + 15))}/100</p>
                </div>
                <Badge variant="default" className="text-lg">
                  {metrics.recoveryRate > 80 ? "Excellent" : metrics.recoveryRate > 60 ? "Good" : "Needs Improvement"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="trends" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="trends">Recovery Trends</TabsTrigger>
            <TabsTrigger value="categories">By Category</TabsTrigger>
            <TabsTrigger value="status">By Status</TabsTrigger>
            <TabsTrigger value="clients">Top Clients</TabsTrigger>
          </TabsList>
          
          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Reimbursement Trends (Last 6 Months)</CardTitle>
                <CardDescription>Expected vs. Recovered amounts over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="expected" stroke="hsl(var(--primary))" strokeWidth={2} name="Expected" />
                    <Line type="monotone" dataKey="recovered" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Recovered" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Claims by Category</CardTitle>
                <CardDescription>Distribution of reimbursement amounts by claim type</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="hsl(var(--primary))"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: any) => `$${value.toLocaleString()}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="status" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recovery by Status</CardTitle>
                <CardDescription>Claims count and recovered amounts by status</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={statusData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="status" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: any) => `$${value.toLocaleString()}`}
                    />
                    <Legend />
                    <Bar dataKey="count" fill="hsl(var(--primary))" name="Count" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="amount" fill="hsl(var(--chart-2))" name="Amount ($)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="clients" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top 5 Clients by Recovery</CardTitle>
                <CardDescription>Clients with highest recovered reimbursements</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topClients} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                    <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" width={120} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: any) => `$${value.toLocaleString()}`}
                    />
                    <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
