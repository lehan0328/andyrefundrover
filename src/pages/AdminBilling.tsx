import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DollarSign, CreditCard, Clock, Send } from "lucide-react";
import { format, startOfMonth } from "date-fns";
import { toast } from "sonner";
import { StatCard } from "@/components/dashboard/StatCard";
import { supabase } from "@/integrations/supabase/client";

interface MonthlyBilling {
  month: string;
  monthDate: Date;
  totalExpected: number;
  totalRecovered: number;
  totalBilled: number;
  clients: {
    [clientName: string]: {
      discrepancies: any[];
      totalExpected: number;
      totalRecovered: number;
      totalBilled: number;
    };
  };
}

export default function AdminBilling() {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyBilling[]>([]);
  const [sentMonths, setSentMonths] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
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
        .eq('status', 'resolved')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Get unique user IDs
      const userIds = [...new Set(discrepancies?.map((d: any) => d.shipments?.user_id).filter(Boolean))];
      
      // Fetch profiles for these users
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, company_name, email')
        .in('id', userIds);

      if (profileError) throw profileError;

      // Create a map of user_id to profile
      const profileMap = new Map(profiles?.map(p => [p.id, p]));

      // Group by month and client
      const grouped: { [key: string]: MonthlyBilling } = {};
      
      discrepancies?.forEach((disc: any) => {
        const updatedDate = new Date(disc.updated_at);
        const monthKey = format(startOfMonth(updatedDate), 'yyyy-MM');
        const monthDisplay = format(updatedDate, 'MMMM yyyy');
        const profile = profileMap.get(disc.shipments?.user_id);
        const clientName = profile?.company_name || 'Unknown';
        
        const avgPrice = 18.50;
        const expectedValue = Math.abs(disc.difference) * avgPrice;
        const recoveredValue = expectedValue; // Assuming full recovery for resolved claims
        const billedAmount = recoveredValue * 0.15;

        if (!grouped[monthKey]) {
          grouped[monthKey] = {
            month: monthDisplay,
            monthDate: startOfMonth(updatedDate),
            totalExpected: 0,
            totalRecovered: 0,
            totalBilled: 0,
            clients: {},
          };
        }

        if (!grouped[monthKey].clients[clientName]) {
          grouped[monthKey].clients[clientName] = {
            discrepancies: [],
            totalExpected: 0,
            totalRecovered: 0,
            totalBilled: 0,
          };
        }

        grouped[monthKey].clients[clientName].discrepancies.push({
          ...disc,
          expectedValue,
          recoveredValue,
          billedAmount,
        });
        grouped[monthKey].clients[clientName].totalExpected += expectedValue;
        grouped[monthKey].clients[clientName].totalRecovered += recoveredValue;
        grouped[monthKey].clients[clientName].totalBilled += billedAmount;
        
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

  const handleSendBill = (monthKey: string) => {
    setSentMonths(prev => new Set(prev).add(monthKey));
    toast.success(`Bill for ${monthKey} sent to clients`);
  };

  const totalBilled = monthlyData.reduce((sum, m) => sum + m.totalBilled, 0);
  const totalPaid = monthlyData.filter(m => sentMonths.has(m.month)).reduce((sum, m) => sum + m.totalBilled, 0);
  const totalPending = totalBilled - totalPaid;

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading billing data...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Billing</h1>
        <p className="text-muted-foreground mt-2">
          Review and send monthly commission bills to clients
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Billed"
          value={`$${totalBilled.toFixed(2)}`}
          icon={DollarSign}
        />
        <StatCard
          title="Total Sent"
          value={`$${totalPaid.toFixed(2)}`}
          icon={Send}
          trend="up"
        />
        <StatCard
          title="Pending Review"
          value={`$${totalPending.toFixed(2)}`}
          icon={Clock}
        />
      </div>

      {/* Monthly Billing Table */}
      <Card className="p-6">
        <Accordion type="single" collapsible className="w-full">
          {monthlyData.map((monthData) => {
            const isSent = sentMonths.has(monthData.month);
            return (
              <AccordionItem key={monthData.month} value={monthData.month}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="grid grid-cols-5 gap-4 w-full text-left">
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
                      <div className="flex items-center gap-2">
                        {isSent ? (
                          <Badge variant="default" className="bg-green-500">Sent</Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendBill(monthData.month);
                            }}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Send Bill
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {Object.entries(monthData.clients).map(([clientName, clientData]) => (
                    <div key={clientName} className="mb-6 last:mb-0">
                      <h4 className="font-semibold mb-3 text-primary">{clientName}</h4>
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
                          {clientData.discrepancies.map((disc: any) => (
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
                          <TableRow className="bg-muted/50 font-semibold">
                            <TableCell colSpan={2}>Client Total</TableCell>
                            <TableCell>${clientData.totalExpected.toFixed(2)}</TableCell>
                            <TableCell>${clientData.totalRecovered.toFixed(2)}</TableCell>
                            <TableCell className="text-primary">${clientData.totalBilled.toFixed(2)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </Card>
    </div>
  );
}
