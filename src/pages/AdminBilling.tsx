import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DollarSign, CreditCard, Clock, Send, Download } from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { toast } from "sonner";
import { StatCard } from "@/components/dashboard/StatCard";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from 'xlsx';

interface WeeklyBilling {
  companyName: string;
  userId: string;
  weeks: {
    [weekKey: string]: {
      weekDisplay: string;
      weekStart: Date;
      weekEnd: Date;
      totalExpected: number;
      totalRecovered: number;
      totalBilled: number;
      claims: any[];
    };
  };
  totalExpected: number;
  totalRecovered: number;
  totalBilled: number;
}

export default function AdminBilling() {
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyBilling[]>([]);
  const [sentWeeks, setSentWeeks] = useState<Set<string>>(new Set());
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

      // Group by company first, then by week
      const grouped: { [companyKey: string]: WeeklyBilling } = {};
      
      approvedClaims?.forEach((claim: any) => {
        const profile = profileMap.get(claim.user_id);
        const companyName = profile?.company_name || profile?.full_name || 'Unknown';
        const updatedDate = new Date(claim.last_updated);
        const weekStart = startOfWeek(updatedDate, { weekStartsOn: 0 }); // Sunday
        const weekEnd = endOfWeek(updatedDate, { weekStartsOn: 0 });
        const weekKey = format(weekStart, 'yyyy-MM-dd');
        const weekDisplay = `Week of ${format(weekStart, 'MMM dd')}-${format(weekEnd, 'dd, yyyy')}`;
        
        const expectedValue = Number(claim.amount) || 0;
        const actualRecovered = Number(claim.actual_recovered) || 0;
        const billed = actualRecovered * 0.15;

        if (!grouped[companyName]) {
          grouped[companyName] = {
            companyName,
            userId: claim.user_id,
            weeks: {},
            totalExpected: 0,
            totalRecovered: 0,
            totalBilled: 0,
          };
        }

        if (!grouped[companyName].weeks[weekKey]) {
          grouped[companyName].weeks[weekKey] = {
            weekDisplay,
            weekStart,
            weekEnd,
            totalExpected: 0,
            totalRecovered: 0,
            totalBilled: 0,
            claims: [],
          };
        }

        grouped[companyName].weeks[weekKey].claims.push({
          ...claim,
          expectedValue,
          recoveredValue: actualRecovered,
          billedAmount: billed,
        });
        grouped[companyName].weeks[weekKey].totalExpected += expectedValue;
        grouped[companyName].weeks[weekKey].totalRecovered += actualRecovered;
        grouped[companyName].weeks[weekKey].totalBilled += billed;
        
        grouped[companyName].totalExpected += expectedValue;
        grouped[companyName].totalRecovered += actualRecovered;
        grouped[companyName].totalBilled += billed;
        
        // Track sent weeks
        if (claim.bill_sent_at) {
          setSentWeeks(prev => new Set(prev).add(`${companyName}-${weekKey}`));
        }
      });

      setWeeklyData(Object.values(grouped).sort((a, b) => b.totalBilled - a.totalBilled));
    } catch (error) {
      console.error('Error loading billing data:', error);
      toast.error('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const handleSendBill = async (companyName: string, weekKey: string) => {
    try {
      // Update all claims for this company and week to mark as sent
      const companyData = weeklyData.find(c => c.companyName === companyName);
      if (!companyData) return;

      const weekData = companyData.weeks[weekKey];
      if (!weekData) return;

      const { error } = await supabase
        .from('claims')
        .update({ bill_sent_at: new Date().toISOString() })
        .eq('status', 'Approved')
        .eq('user_id', companyData.userId)
        .gte('last_updated', weekData.weekStart.toISOString())
        .lte('last_updated', weekData.weekEnd.toISOString());

      if (error) throw error;

      setSentWeeks(prev => new Set(prev).add(`${companyName}-${weekKey}`));
      toast.success(`Bill for ${companyName} - ${weekData.weekDisplay} sent`);
    } catch (error) {
      console.error('Error sending bill:', error);
      toast.error('Failed to send bill');
    }
  };

  const handleDownloadExcel = (companyData: WeeklyBilling) => {
    const worksheetData: any[] = [];
    
    // Add header
    worksheetData.push([companyData.companyName, '', '', '', '', '']);
    worksheetData.push(['Week', 'Updated Date', 'Shipment ID', 'Expected Value', 'Actual Recovered', 'Billed (15%)']);
    
    // Add data for each week
    Object.entries(companyData.weeks).forEach(([weekKey, weekData]) => {
      weekData.claims.forEach((claim: any) => {
        worksheetData.push([
          weekData.weekDisplay,
          format(new Date(claim.last_updated), "MMM dd, yyyy"),
          claim.shipment_id || 'N/A',
          `$${claim.expectedValue.toFixed(2)}`,
          `$${claim.recoveredValue.toFixed(2)}`,
          `$${claim.billedAmount.toFixed(2)}`
        ]);
      });
    });
    
    // Add totals
    worksheetData.push(['', 'TOTAL', '', `$${companyData.totalExpected.toFixed(2)}`, `$${companyData.totalRecovered.toFixed(2)}`, `$${companyData.totalBilled.toFixed(2)}`]);
    
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Billing');
    
    XLSX.writeFile(workbook, `Billing_${companyData.companyName.replace(/[^a-z0-9]/gi, '_')}.xlsx`);
    toast.success(`Downloaded billing report for ${companyData.companyName}`);
  };

  const totalBilled = weeklyData.reduce((sum, c) => sum + c.totalBilled, 0);
  const totalPaid = weeklyData.reduce((sum, c) => {
    const companySent = Object.keys(c.weeks).every(weekKey => 
      sentWeeks.has(`${c.companyName}-${weekKey}`)
    );
    return companySent ? sum + c.totalBilled : sum;
  }, 0);
  const totalPending = totalBilled - totalPaid;

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading billing data...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Billing - Approved Claims</h1>
        <p className="text-muted-foreground mt-2">
          Weekly summary of approved claims (resolved status). Review and send commission bills to clients.
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

      {/* Company Billing Table */}
      <Card className="p-6">
        <Accordion type="single" collapsible className="w-full">
          {weeklyData.map((companyData) => (
            <AccordionItem key={companyData.companyName} value={companyData.companyName}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="grid grid-cols-5 gap-4 w-full text-left">
                    <div>
                      <p className="text-sm text-muted-foreground">Company</p>
                      <p className="font-semibold">{companyData.companyName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Expected</p>
                      <p className="font-semibold">${companyData.totalExpected.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Recovered</p>
                      <p className="font-semibold">${companyData.totalRecovered.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Billed (15%)</p>
                      <p className="font-semibold text-primary">${companyData.totalBilled.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadExcel(companyData);
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Excel
                      </Button>
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {Object.entries(companyData.weeks)
                  .sort(([, a], [, b]) => b.weekStart.getTime() - a.weekStart.getTime())
                  .map(([weekKey, weekData]) => {
                    const isSent = sentWeeks.has(`${companyData.companyName}-${weekKey}`);
                    return (
                      <div key={weekKey} className="mb-6 last:mb-0">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-primary">{weekData.weekDisplay}</h4>
                          {isSent ? (
                            <Badge variant="default" className="bg-green-500">Sent</Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleSendBill(companyData.companyName, weekKey)}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Send Bill
                            </Button>
                          )}
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Updated Date</TableHead>
                              <TableHead>Shipment ID</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Expected Value</TableHead>
                              <TableHead>Actual Recovered</TableHead>
                              <TableHead>Billed (15%)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {weekData.claims.map((claim: any) => (
                              <TableRow key={claim.id}>
                                <TableCell>
                                  {format(new Date(claim.last_updated), "MMM dd, yyyy")}
                                </TableCell>
                                <TableCell className="font-mono text-sm">
                                  {claim.shipment_id || 'N/A'}
                                </TableCell>
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
                              <TableCell colSpan={3}>Week Total</TableCell>
                              <TableCell>${weekData.totalExpected.toFixed(2)}</TableCell>
                              <TableCell>${weekData.totalRecovered.toFixed(2)}</TableCell>
                              <TableCell className="text-primary">${weekData.totalBilled.toFixed(2)}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    );
                  })}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Card>
    </div>
  );
}
