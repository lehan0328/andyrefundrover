import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Send, DollarSign } from "lucide-react";
import { format, startOfMonth } from "date-fns";
import { toast } from "sonner";
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

export function AdminBillingPanel() {
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
            user_id,
            profiles:user_id(company_name, email)
          )
        `)
        .eq('status', 'resolved')
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Group by month and client
      const grouped: { [key: string]: MonthlyBilling } = {};
      
      discrepancies?.forEach((disc: any) => {
        const updatedDate = new Date(disc.updated_at);
        const monthKey = format(startOfMonth(updatedDate), 'yyyy-MM');
        const monthDisplay = format(updatedDate, 'MMMM yyyy');
        const clientName = disc.shipments?.profiles?.company_name || 'Unknown';
        
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

      const sortedData = Object.values(grouped).sort((a, b) => b.monthDate.getTime() - a.monthDate.getTime());
      setMonthlyData(sortedData.slice(0, 3)); // Show only last 3 months on dashboard
    } catch (error) {
      console.error('Error loading billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendBill = (monthKey: string) => {
    setSentMonths(prev => new Set(prev).add(monthKey));
    toast.success(`Bill for ${monthKey} sent to clients`);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold">Monthly Billing Summary</h3>
          <p className="text-sm text-muted-foreground mt-1">Review and send bills to clients</p>
        </div>
        <DollarSign className="h-8 w-8 text-primary" />
      </div>

      {monthlyData.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No billing data available</p>
      ) : (
        <Accordion type="single" collapsible className="w-full">
          {monthlyData.map((monthData) => {
            const isSent = sentMonths.has(monthData.month);
            return (
              <AccordionItem key={monthData.month} value={monthData.month} className="border-b">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="grid grid-cols-5 gap-3 w-full text-left text-sm">
                      <div>
                        <p className="font-semibold">{monthData.month}</p>
                        <p className="text-xs text-muted-foreground">
                          {Object.keys(monthData.clients).length} client(s)
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Expected</p>
                        <p className="font-semibold">${monthData.totalExpected.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Recovered</p>
                        <p className="font-semibold">${monthData.totalRecovered.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Billed (15%)</p>
                        <p className="font-semibold text-primary">${monthData.totalBilled.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center">
                        {isSent ? (
                          <Badge variant="default" className="bg-green-500">Sent</Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendBill(monthData.month);
                            }}
                          >
                            <Send className="h-3 w-3 mr-1" />
                            Send
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pt-2 space-y-4">
                    {Object.entries(monthData.clients).map(([clientName, clientData]) => (
                      <div key={clientName}>
                        <h4 className="font-semibold mb-2 text-primary text-sm">{clientName}</h4>
                        <div className="text-xs space-y-1 pl-4">
                          <p>Expected: ${clientData.totalExpected.toFixed(2)}</p>
                          <p>Recovered: ${clientData.totalRecovered.toFixed(2)}</p>
                          <p>Billed: ${clientData.totalBilled.toFixed(2)}</p>
                          <p className="text-muted-foreground">{clientData.discrepancies.length} discrepancies</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </Card>
  );
}
