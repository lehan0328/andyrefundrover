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

interface ClaimDetail {
  updatedDate: string;
  shipmentId: string;
  clientName: string;
  expectedValue: number;
  actualRecovered: number;
  billed: number;
}

interface MonthlyBilling {
  month: string;
  monthKey: string;
  monthDate: Date;
  totalExpected: number;
  totalRecovered: number;
  totalBilled: number;
  claims: ClaimDetail[];
}

export function AdminBillingPanel() {
  const [monthlyData, setMonthlyData] = useState<MonthlyBilling[]>([]);
  const [sentMonths, setSentMonths] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBillingData();

    // Subscribe to real-time updates for approved claims
    const channel = supabase
      .channel('billing-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'claims',
          filter: 'status=eq.Approved'
        },
        () => {
          loadBillingData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadBillingData = async () => {
    try {
      setLoading(true);
      
      // Fetch approved claims
      const { data: approvedClaims, error: claimsError } = await supabase
        .from('claims')
        .select('*')
        .eq('status', 'Approved')
        .order('last_updated', { ascending: false });

      if (claimsError) throw claimsError;

      // Fetch user profiles for these claims
      const userIds = [...new Set(approvedClaims?.map(c => c.user_id).filter(Boolean) || [])];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, company_name')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Create a map of user profiles
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Group by month
      const grouped: { [key: string]: MonthlyBilling } = {};
      
      approvedClaims?.forEach((claim: any) => {
        const profile = profileMap.get(claim.user_id);
        const updatedDate = new Date(claim.last_updated);
        const monthKey = format(startOfMonth(updatedDate), 'yyyy-MM');
        const monthDisplay = format(updatedDate, 'MMMM yyyy');
        
        const expectedValue = Number(claim.amount) || 0;
        const actualRecovered = Number(claim.actual_recovered) || 0;
        const billed = actualRecovered * 0.15;

        const claimDetail: ClaimDetail = {
          updatedDate: format(updatedDate, 'MMM dd, yyyy'),
          shipmentId: claim.shipment_id,
          clientName: profile?.company_name || profile?.full_name || 'Unknown',
          expectedValue,
          actualRecovered,
          billed
        };

        if (!grouped[monthKey]) {
          grouped[monthKey] = {
            month: monthDisplay,
            monthKey,
            monthDate: startOfMonth(updatedDate),
            totalExpected: 0,
            totalRecovered: 0,
            totalBilled: 0,
            claims: [],
          };
        }

        grouped[monthKey].totalExpected += expectedValue;
        grouped[monthKey].totalRecovered += actualRecovered;
        grouped[monthKey].totalBilled += billed;
        grouped[monthKey].claims.push(claimDetail);
      });

      const sortedData = Object.values(grouped).sort((a, b) => b.monthDate.getTime() - a.monthDate.getTime());
      setMonthlyData(sortedData.slice(0, 3)); // Show only last 3 months on dashboard
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
            const isSent = sentMonths.has(monthData.monthKey);
            return (
              <AccordionItem key={monthData.monthKey} value={monthData.monthKey} className="border-b">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="grid grid-cols-5 gap-3 w-full text-left text-sm">
                      <div>
                        <p className="font-semibold">{monthData.month}</p>
                        <p className="text-xs text-muted-foreground">
                          {monthData.claims.length} claim(s)
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
                              handleSendBill(monthData.monthKey);
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
                  <div className="pt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Updated Date</TableHead>
                          <TableHead>Shipment ID</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead className="text-right">Expected Value</TableHead>
                          <TableHead className="text-right">Actual Recovered</TableHead>
                          <TableHead className="text-right">Billed (15%)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthData.claims.map((claim, idx) => (
                          <TableRow key={`${claim.shipmentId}-${idx}`}>
                            <TableCell className="text-sm">{claim.updatedDate}</TableCell>
                            <TableCell className="font-mono text-sm">{claim.shipmentId}</TableCell>
                            <TableCell className="text-sm">{claim.clientName}</TableCell>
                            <TableCell className="text-right text-sm">${claim.expectedValue.toFixed(2)}</TableCell>
                            <TableCell className="text-right text-sm">${claim.actualRecovered.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-medium text-sm">${claim.billed.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
