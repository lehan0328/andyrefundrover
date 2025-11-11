import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DollarSign, CreditCard, Clock } from "lucide-react";
import { format, startOfMonth } from "date-fns";
import { toast } from "sonner";
import { StatCard } from "@/components/dashboard/StatCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface MonthlyBilling {
  month: string;
  monthDate: Date;
  totalExpected: number;
  totalRecovered: number;
  totalBilled: number;
  discrepancies: any[];
}

export default function Billing() {
  const { user } = useAuth();
  const [monthlyData, setMonthlyData] = useState<MonthlyBilling[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBillingData();
  }, [user]);

  const loadBillingData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data: discrepancies, error } = await supabase
        .from('shipment_discrepancies')
        .select(`
          *,
          shipments!inner(
            shipment_id,
            last_updated_date,
            user_id
          )
        `)
        .eq('shipments.user_id', user.id)
        .eq('status', 'resolved')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Group by month
      const grouped: { [key: string]: MonthlyBilling } = {};
      
      discrepancies?.forEach((disc: any) => {
        const updatedDate = new Date(disc.updated_at);
        const monthKey = format(startOfMonth(updatedDate), 'yyyy-MM');
        const monthDisplay = format(updatedDate, 'MMMM yyyy');
        
        const avgPrice = 18.50;
        const expectedValue = Math.abs(disc.difference) * avgPrice;
        const recoveredValue = expectedValue;
        const billedAmount = recoveredValue * 0.15;

        if (!grouped[monthKey]) {
          grouped[monthKey] = {
            month: monthDisplay,
            monthDate: startOfMonth(updatedDate),
            totalExpected: 0,
            totalRecovered: 0,
            totalBilled: 0,
            discrepancies: [],
          };
        }

        grouped[monthKey].discrepancies.push({
          ...disc,
          expectedValue,
          recoveredValue,
          billedAmount,
        });
        grouped[monthKey].totalExpected += expectedValue;
        grouped[monthKey].totalRecovered += recoveredValue;
        grouped[monthKey].totalBilled += billedAmount;
      });

      setMonthlyData(Object.values(grouped).sort((a, b) => b.monthDate.getTime() - a.monthDate.getTime()));
    } catch (error) {
      console.error('Error loading billing data:', error);
      toast.error('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const totalBilled = monthlyData.reduce((sum, m) => sum + m.totalBilled, 0);
  const totalExpected = monthlyData.reduce((sum, m) => sum + m.totalExpected, 0);
  const totalRecovered = monthlyData.reduce((sum, m) => sum + m.totalRecovered, 0);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading billing data...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Billing</h1>
        <p className="text-muted-foreground mt-2">
          Track your monthly commission billing
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Expected"
          value={`$${totalExpected.toFixed(2)}`}
          icon={DollarSign}
        />
        <StatCard
          title="Total Recovered"
          value={`$${totalRecovered.toFixed(2)}`}
          icon={CreditCard}
          trend="up"
        />
        <StatCard
          title="Total Billed (15%)"
          value={`$${totalBilled.toFixed(2)}`}
          icon={Clock}
        />
      </div>

      {/* Monthly Billing Table */}
      <Card className="p-6">
        <Accordion type="single" collapsible className="w-full">
          {monthlyData.map((monthData) => (
            <AccordionItem key={monthData.month} value={monthData.month}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="grid grid-cols-4 gap-4 w-full text-left">
                    <div>
                      <p className="font-semibold">{monthData.month}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Expected</p>
                      <p className="font-semibold">${monthData.totalExpected.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Recovered</p>
                      <p className="font-semibold">${monthData.totalRecovered.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Billed (15%)</p>
                      <p className="font-semibold text-primary">${monthData.totalBilled.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Updated Date</TableHead>
                      <TableHead>Shipment ID</TableHead>
                      <TableHead>Expected Value</TableHead>
                      <TableHead>Actual Recovered</TableHead>
                      <TableHead>Billed (15%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthData.discrepancies.map((disc: any) => (
                      <TableRow key={disc.id}>
                        <TableCell>
                          {format(new Date(disc.updated_at), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {disc.shipments?.shipment_id || 'N/A'}
                        </TableCell>
                        <TableCell>${disc.expectedValue.toFixed(2)}</TableCell>
                        <TableCell className="font-semibold">
                          ${disc.recoveredValue.toFixed(2)}
                        </TableCell>
                        <TableCell className="font-semibold text-primary">
                          ${disc.billedAmount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Card>
    </div>
  );
}
