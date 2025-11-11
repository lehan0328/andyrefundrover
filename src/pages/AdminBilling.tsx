import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DollarSign, CreditCard, Clock, Send, Download } from "lucide-react";
import { format, startOfMonth } from "date-fns";
import { toast } from "sonner";
import { StatCard } from "@/components/dashboard/StatCard";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from 'xlsx';

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

      // Group by month and client
      const grouped: { [key: string]: MonthlyBilling } = {};
      
      approvedClaims?.forEach((claim: any) => {
        const profile = profileMap.get(claim.user_id);
        const updatedDate = new Date(claim.last_updated);
        const monthKey = format(startOfMonth(updatedDate), 'yyyy-MM');
        const monthDisplay = format(updatedDate, 'MMMM yyyy');
        const clientName = profile?.company_name || profile?.full_name || 'Unknown';
        
        const expectedValue = Number(claim.amount) || 0;
        const actualRecovered = Number(claim.actual_recovered) || 0;
        const billed = actualRecovered * 0.15;

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
          ...claim,
          expectedValue,
          recoveredValue: actualRecovered,
          billedAmount: billed,
        });
        grouped[monthKey].clients[clientName].totalExpected += expectedValue;
        grouped[monthKey].clients[clientName].totalRecovered += actualRecovered;
        grouped[monthKey].clients[clientName].totalBilled += billed;
        
        grouped[monthKey].totalExpected += expectedValue;
        grouped[monthKey].totalRecovered += actualRecovered;
        grouped[monthKey].totalBilled += billed;
        
        // Track sent months
        if (claim.bill_sent_at) {
          setSentMonths(prev => new Set(prev).add(monthKey));
        }
      });

      setMonthlyData(Object.values(grouped).sort((a, b) => b.monthDate.getTime() - a.monthDate.getTime()));
    } catch (error) {
      console.error('Error loading billing data:', error);
      toast.error('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const handleSendBill = async (monthKey: string) => {
    try {
      // Update all claims for this month to mark as sent
      const monthStart = new Date(monthKey + '-01');
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
      
      const { error } = await supabase
        .from('claims')
        .update({ bill_sent_at: new Date().toISOString() })
        .eq('status', 'Approved')
        .gte('last_updated', monthStart.toISOString())
        .lte('last_updated', monthEnd.toISOString());

      if (error) throw error;

      setSentMonths(prev => new Set(prev).add(monthKey));
      toast.success(`Bill for ${monthKey} sent to clients`);
    } catch (error) {
      console.error('Error sending bill:', error);
      toast.error('Failed to send bill');
    }
  };

  const handleDownloadExcel = (monthData: MonthlyBilling) => {
    const worksheetData: any[] = [];
    
    // Add header
    worksheetData.push([monthData.month, '', '', '', '']);
    worksheetData.push(['Updated Date', 'Shipment ID', 'Client', 'Expected Value', 'Actual Recovered', 'Billed (15%)']);
    
    // Add data for each client
    Object.entries(monthData.clients).forEach(([clientName, clientData]) => {
      clientData.discrepancies.forEach((claim: any) => {
        worksheetData.push([
          format(new Date(claim.last_updated), "MMM dd, yyyy"),
          claim.shipment_id || 'N/A',
          clientName,
          `$${claim.expectedValue.toFixed(2)}`,
          `$${claim.recoveredValue.toFixed(2)}`,
          `$${claim.billedAmount.toFixed(2)}`
        ]);
      });
    });
    
    // Add totals
    worksheetData.push(['', '', 'TOTAL', `$${monthData.totalExpected.toFixed(2)}`, `$${monthData.totalRecovered.toFixed(2)}`, `$${monthData.totalBilled.toFixed(2)}`]);
    
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Billing');
    
    XLSX.writeFile(workbook, `Billing_${monthData.month.replace(' ', '_')}.xlsx`);
    toast.success(`Downloaded billing report for ${monthData.month}`);
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
        <h1 className="text-3xl font-bold text-foreground">Admin Billing - Approved Claims</h1>
        <p className="text-muted-foreground mt-2">
          Monthly summary of approved claims (resolved status). Review and send commission bills to clients.
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
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadExcel(monthData);
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Excel
                        </Button>
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
                            <TableHead>Company</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Expected Value</TableHead>
                            <TableHead>Actual Recovered</TableHead>
                            <TableHead>Billed (15%)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {clientData.discrepancies.map((claim: any) => (
                            <TableRow key={claim.id}>
                              <TableCell>
                                {format(new Date(claim.last_updated), "MMM dd, yyyy")}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {claim.shipment_id || 'N/A'}
                              </TableCell>
                              <TableCell className="font-medium">{clientName}</TableCell>
                              <TableCell>
                                <Badge variant="default" className="bg-green-500">Approved</Badge>
                              </TableCell>
                              <TableCell>${claim.expectedValue.toFixed(2)}</TableCell>
                              <TableCell className="font-semibold">
                                ${claim.recoveredValue.toFixed(2)}
                              </TableCell>
                              <TableCell className="font-semibold text-primary">
                                ${claim.billedAmount.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-muted/50 font-semibold">
                            <TableCell colSpan={4}>Client Total</TableCell>
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
