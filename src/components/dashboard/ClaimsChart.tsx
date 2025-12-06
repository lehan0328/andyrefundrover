import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

interface MonthlyData {
  month: string;
  approved: number;
  pending: number;
  denied: number;
}

export const ClaimsChart = () => {
  const [data, setData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClaimsData = async () => {
      try {
        // Get claims from the last 6 months
        const sixMonthsAgo = subMonths(new Date(), 5);
        const startDate = startOfMonth(sixMonthsAgo);

        const { data: claims, error } = await supabase
          .from('claims')
          .select('claim_date, status')
          .gte('claim_date', startDate.toISOString().split('T')[0]);

        if (error) {
          console.error('Error fetching claims:', error);
          return;
        }

        // Aggregate by month
        const monthlyMap = new Map<string, { approved: number; pending: number; denied: number }>();

        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
          const monthDate = subMonths(new Date(), i);
          const monthKey = format(monthDate, 'MMM');
          monthlyMap.set(monthKey, { approved: 0, pending: 0, denied: 0 });
        }

        // Count claims by status and month
        claims?.forEach((claim) => {
          const claimDate = new Date(claim.claim_date);
          const monthKey = format(claimDate, 'MMM');
          
          if (monthlyMap.has(monthKey)) {
            const current = monthlyMap.get(monthKey)!;
            const status = claim.status?.toLowerCase() || '';
            
            if (status === 'approved') {
              current.approved++;
            } else if (status === 'pending') {
              current.pending++;
            } else if (status === 'denied' || status === 'rejected') {
              current.denied++;
            }
          }
        });

        // Convert to array
        const chartData: MonthlyData[] = [];
        for (let i = 5; i >= 0; i--) {
          const monthDate = subMonths(new Date(), i);
          const monthKey = format(monthDate, 'MMM');
          const values = monthlyMap.get(monthKey) || { approved: 0, pending: 0, denied: 0 };
          chartData.push({ month: monthKey, ...values });
        }

        setData(chartData);
      } catch (err) {
        console.error('Error in fetchClaimsData:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchClaimsData();
  }, []);

  if (loading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-6">Claims by Month</h3>
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
          Loading...
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-6">Claims by Month</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
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
          <Bar dataKey="approved" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
          <Bar dataKey="pending" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} />
          <Bar dataKey="denied" fill="hsl(var(--destructive))" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};
