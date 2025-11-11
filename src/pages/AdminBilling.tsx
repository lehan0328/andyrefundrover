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

interface WeeklyBillingRow {
  weekKey: string;
  weekDisplay: string;
  weekStart: Date;
  weekEnd: Date;
  companyName: string;
  userId: string;
  totalExpected: number;
  totalRecovered: number;
  totalBilled: number;
  claims: any[];
  isSent: boolean;
}

export default function AdminBilling() {
  const [weeklyData, setWeeklyData] = useState<WeeklyBillingRow[]>([]);
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

      // Create flat array of week-company rows
      const rows: WeeklyBillingRow[] = [];
      const sentWeeksMap = new Map<string, boolean>();
      
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

        const rowKey = `${companyName}-${weekKey}`;
        
        // Track sent status
        if (claim.bill_sent_at) {
          sentWeeksMap.set(rowKey, true);
        }

        // Find existing row or create new one
        let existingRow = rows.find(r => r.weekKey === weekKey && r.companyName === companyName);
        
        if (!existingRow) {
          existingRow = {
            weekKey,
            weekDisplay,
            weekStart,
            weekEnd,
            companyName,
            userId: claim.user_id,
            totalExpected: 0,
            totalRecovered: 0,
            totalBilled: 0,
            claims: [],
            isSent: false,
          };
          rows.push(existingRow);
        }

        existingRow.claims.push({
          ...claim,
          expectedValue,
          recoveredValue: actualRecovered,
          billedAmount: billed,
        });
        existingRow.totalExpected += expectedValue;
        existingRow.totalRecovered += actualRecovered;
        existingRow.totalBilled += billed;
      });

      // Update sent status for all rows
      rows.forEach(row => {
        row.isSent = sentWeeksMap.get(`${row.companyName}-${row.weekKey}`) || false;
      });

      // Sort by week (most recent first), then by company
      setWeeklyData(rows.sort((a, b) => {
        const weekDiff = b.weekStart.getTime() - a.weekStart.getTime();
        if (weekDiff !== 0) return weekDiff;
        return a.companyName.localeCompare(b.companyName);
      }));
    } catch (error) {
      console.error('Error loading billing data:', error);
      toast.error('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const handleSendBill = async (row: WeeklyBillingRow) => {
    try {
      const { error } = await supabase
        .from('claims')
        .update({ bill_sent_at: new Date().toISOString() })
        .eq('status', 'Approved')
        .eq('user_id', row.userId)
        .gte('last_updated', row.weekStart.toISOString())
        .lte('last_updated', row.weekEnd.toISOString());

      if (error) throw error;

      // Update the row in state
      setWeeklyData(prev => prev.map(r => 
        r.weekKey === row.weekKey && r.companyName === row.companyName
          ? { ...r, isSent: true }
          : r
      ));
      
      toast.success(`Bill for ${row.companyName} - ${row.weekDisplay} sent`);
    } catch (error) {
      console.error('Error sending bill:', error);
      toast.error('Failed to send bill');
    }
  };

  const handleDownloadExcel = (row: WeeklyBillingRow) => {
    const worksheetData: any[] = [];
    
    // Add header
    worksheetData.push([`${row.companyName} - ${row.weekDisplay}`, '', '', '', '']);
    worksheetData.push(['Updated Date', 'Shipment ID', 'Expected Value', 'Actual Recovered', 'Billed (15%)']);
    
    // Add data
    row.claims.forEach((claim: any) => {
      worksheetData.push([
        format(new Date(claim.last_updated), "MMM dd, yyyy"),
        claim.shipment_id || 'N/A',
        `$${claim.expectedValue.toFixed(2)}`,
        `$${claim.recoveredValue.toFixed(2)}`,
        `$${claim.billedAmount.toFixed(2)}`
      ]);
    });
    
    // Add totals
    worksheetData.push(['TOTAL', '', `$${row.totalExpected.toFixed(2)}`, `$${row.totalRecovered.toFixed(2)}`, `$${row.totalBilled.toFixed(2)}`]);
    
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Billing');
    
    XLSX.writeFile(workbook, `Billing_${row.companyName}_${row.weekKey}.xlsx`);
    toast.success(`Downloaded billing report for ${row.companyName}`);
  };

  const totalBilled = weeklyData.reduce((sum, row) => sum + row.totalBilled, 0);
  const totalPaid = weeklyData.reduce((sum, row) => row.isSent ? sum + row.totalBilled : sum, 0);
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

      {/* Weekly Billing Table */}
      <Card className="p-6">
        <Accordion type="single" collapsible className="w-full">
          {weeklyData.map((row, index) => (
            <AccordionItem key={`${row.companyName}-${row.weekKey}`} value={`${row.companyName}-${row.weekKey}`}>
              <AccordionTrigger className="hover:no-underline">
                <div className="grid grid-cols-6 gap-4 w-full text-left pr-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Week</p>
                    <p className="font-semibold">{row.weekDisplay}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Company</p>
                    <p className="font-semibold">{row.companyName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Expected</p>
                    <p className="font-semibold">${row.totalExpected.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Recovered</p>
                    <p className="font-semibold">${row.totalRecovered.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Billed (15%)</p>
                    <p className="font-semibold text-primary">${row.totalBilled.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadExcel(row);
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Excel
                    </Button>
                    {row.isSent ? (
                      <Badge variant="default" className="bg-green-500">Sent</Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendBill(row);
                        }}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Send
                      </Button>
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
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
                    {row.claims.map((claim: any) => (
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
