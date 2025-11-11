import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { DollarSign, CreditCard, Clock, Send, Download, Check, ChevronsUpDown } from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { toast } from "sonner";
import { StatCard } from "@/components/dashboard/StatCard";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import * as XLSX from 'xlsx';

interface WeeklyBillingRow {
  weekKey: string;
  weekDisplay: string;
  weekStart: Date;
  weekEnd: Date;
  totalExpected: number;
  totalRecovered: number;
  totalBilled: number;
  claims: any[];
  isSent: boolean;
}

interface MonthlyBillingRow {
  monthKey: string;
  monthDisplay: string;
  monthStart: Date;
  monthEnd: Date;
  companyName: string;
  userId: string;
  totalExpected: number;
  totalRecovered: number;
  totalBilled: number;
  weeks: WeeklyBillingRow[];
}

export default function AdminBilling() {
  const [monthlyData, setMonthlyData] = useState<MonthlyBillingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [open, setOpen] = useState(false);

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

      // Group by company and month first
      const monthlyMap = new Map<string, MonthlyBillingRow>();
      
      approvedClaims?.forEach((claim: any) => {
        const profile = profileMap.get(claim.user_id);
        const companyName = profile?.company_name || profile?.full_name || 'Unknown';
        const updatedDate = new Date(claim.last_updated);
        
        // Get month info
        const monthStart = new Date(updatedDate.getFullYear(), updatedDate.getMonth(), 1);
        const monthEnd = new Date(updatedDate.getFullYear(), updatedDate.getMonth() + 1, 0);
        const monthKey = format(monthStart, 'yyyy-MM');
        const monthDisplay = format(monthStart, 'MMMM yyyy');
        
        // Get week info
        const weekStart = startOfWeek(updatedDate, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(updatedDate, { weekStartsOn: 0 });
        const weekKey = format(weekStart, 'yyyy-MM-dd');
        const weekDisplay = `Week of ${format(weekStart, 'MMM dd')}-${format(weekEnd, 'dd, yyyy')}`;
        
        const expectedValue = Number(claim.amount) || 0;
        const actualRecovered = Number(claim.actual_recovered) || 0;
        const billed = actualRecovered * 0.15;

        const monthRowKey = `${companyName}-${monthKey}`;
        
        // Get or create monthly row
        let monthlyRow = monthlyMap.get(monthRowKey);
        if (!monthlyRow) {
          monthlyRow = {
            monthKey,
            monthDisplay,
            monthStart,
            monthEnd,
            companyName,
            userId: claim.user_id,
            totalExpected: 0,
            totalRecovered: 0,
            totalBilled: 0,
            weeks: [],
          };
          monthlyMap.set(monthRowKey, monthlyRow);
        }

        // Find or create week within this month
        let weekRow = monthlyRow.weeks.find(w => w.weekKey === weekKey);
        if (!weekRow) {
          weekRow = {
            weekKey,
            weekDisplay,
            weekStart,
            weekEnd,
            totalExpected: 0,
            totalRecovered: 0,
            totalBilled: 0,
            claims: [],
            isSent: !!claim.bill_sent_at,
          };
          monthlyRow.weeks.push(weekRow);
        }

        // Add claim to week
        weekRow.claims.push({
          ...claim,
          expectedValue,
          recoveredValue: actualRecovered,
          billedAmount: billed,
        });
        weekRow.totalExpected += expectedValue;
        weekRow.totalRecovered += actualRecovered;
        weekRow.totalBilled += billed;

        // Update week sent status
        if (claim.bill_sent_at) {
          weekRow.isSent = true;
        }

        // Update monthly totals
        monthlyRow.totalExpected += expectedValue;
        monthlyRow.totalRecovered += actualRecovered;
        monthlyRow.totalBilled += billed;
      });

      // Convert to array and sort
      const monthlyRows = Array.from(monthlyMap.values());
      monthlyRows.forEach(row => {
        row.weeks.sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime());
      });
      monthlyRows.sort((a, b) => {
        const monthDiff = b.monthStart.getTime() - a.monthStart.getTime();
        if (monthDiff !== 0) return monthDiff;
        return a.companyName.localeCompare(b.companyName);
      });

      setMonthlyData(monthlyRows);
    } catch (error) {
      console.error('Error loading billing data:', error);
      toast.error('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const handleSendBill = async (monthRow: MonthlyBillingRow, weekRow: WeeklyBillingRow) => {
    try {
      const { error } = await supabase
        .from('claims')
        .update({ bill_sent_at: new Date().toISOString() })
        .eq('status', 'Approved')
        .eq('user_id', monthRow.userId)
        .gte('last_updated', weekRow.weekStart.toISOString())
        .lte('last_updated', weekRow.weekEnd.toISOString());

      if (error) throw error;

      // Update the week in state
      setMonthlyData(prev => prev.map(mr => 
        mr.monthKey === monthRow.monthKey && mr.companyName === monthRow.companyName
          ? {
              ...mr,
              weeks: mr.weeks.map(wr =>
                wr.weekKey === weekRow.weekKey ? { ...wr, isSent: true } : wr
              )
            }
          : mr
      ));
      
      toast.success(`Bill for ${monthRow.companyName} - ${weekRow.weekDisplay} sent`);
    } catch (error) {
      console.error('Error sending bill:', error);
      toast.error('Failed to send bill');
    }
  };

  const handleDownloadExcel = (monthRow: MonthlyBillingRow, weekRow: WeeklyBillingRow) => {
    const worksheetData: any[] = [];
    
    // Add header
    worksheetData.push([`${monthRow.companyName} - ${weekRow.weekDisplay}`, '', '', '', '']);
    worksheetData.push(['Updated Date', 'Shipment ID', 'Expected Value', 'Actual Recovered', 'Billed (15%)']);
    
    // Add data
    weekRow.claims.forEach((claim: any) => {
      worksheetData.push([
        format(new Date(claim.last_updated), "MMM dd, yyyy"),
        claim.shipment_id || 'N/A',
        `$${claim.expectedValue.toFixed(2)}`,
        `$${claim.recoveredValue.toFixed(2)}`,
        `$${claim.billedAmount.toFixed(2)}`
      ]);
    });
    
    // Add totals
    worksheetData.push(['TOTAL', '', `$${weekRow.totalExpected.toFixed(2)}`, `$${weekRow.totalRecovered.toFixed(2)}`, `$${weekRow.totalBilled.toFixed(2)}`]);
    
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Billing');
    
    XLSX.writeFile(workbook, `Billing_${monthRow.companyName}_${weekRow.weekKey}.xlsx`);
    toast.success(`Downloaded billing report for ${monthRow.companyName}`);
  };

  const filteredData = selectedCompany === "all" 
    ? monthlyData 
    : monthlyData.filter(row => row.companyName === selectedCompany);

  const uniqueCompanies = Array.from(new Set(monthlyData.map(row => row.companyName))).sort();

  const totalBilled = filteredData.reduce((sum, row) => sum + row.totalBilled, 0);
  const totalPaid = filteredData.reduce((sum, row) => {
    const sentAmount = row.weeks.filter(w => w.isSent).reduce((s, w) => s + w.totalBilled, 0);
    return sum + sentAmount;
  }, 0);
  const totalPending = totalBilled - totalPaid;

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading billing data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Billing - Approved Claims</h1>
          <p className="text-muted-foreground mt-2">
            Weekly summary of approved claims (resolved status). Review and send commission bills to clients.
          </p>
        </div>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-[250px] justify-between"
            >
              {selectedCompany === "all" 
                ? "All Clients" 
                : uniqueCompanies.find((company) => company === selectedCompany) || "Filter by client"}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[250px] p-0">
            <Command>
              <CommandInput placeholder="Search clients..." />
              <CommandList>
                <CommandEmpty>No client found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="all"
                    onSelect={() => {
                      setSelectedCompany("all");
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedCompany === "all" ? "opacity-100" : "opacity-0"
                      )}
                    />
                    All Clients
                  </CommandItem>
                  {uniqueCompanies.map((company) => (
                    <CommandItem
                      key={company}
                      value={company}
                      onSelect={() => {
                        setSelectedCompany(company);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedCompany === company ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {company}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
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
          {filteredData.map((monthRow) => (
            <AccordionItem key={`${monthRow.companyName}-${monthRow.monthKey}`} value={`${monthRow.companyName}-${monthRow.monthKey}`}>
              <AccordionTrigger className="hover:no-underline">
                <div className="grid grid-cols-5 gap-4 w-full text-left pr-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Company</p>
                    <p className="font-semibold">{monthRow.companyName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Month</p>
                    <p className="font-semibold">{monthRow.monthDisplay}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Expected</p>
                    <p className="font-semibold">${monthRow.totalExpected.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Recovered</p>
                    <p className="font-semibold">${monthRow.totalRecovered.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">To Bill</p>
                    <p className="font-semibold text-primary">${monthRow.totalBilled.toFixed(2)}</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Weekly Transactions</h3>
                  {monthRow.weeks.map((weekRow) => (
                    <div key={weekRow.weekKey} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="grid grid-cols-4 gap-4 flex-1">
                          <div>
                            <p className="text-sm text-muted-foreground">Week</p>
                            <p className="font-semibold">{weekRow.weekDisplay}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Expected</p>
                            <p className="font-semibold">${weekRow.totalExpected.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Recovered</p>
                            <p className="font-semibold">${weekRow.totalRecovered.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">To Bill</p>
                            <p className="font-semibold text-primary">${weekRow.totalBilled.toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadExcel(monthRow, weekRow)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Excel
                          </Button>
                          {weekRow.isSent ? (
                            <Badge variant="default" className="bg-green-500">Sent</Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleSendBill(monthRow, weekRow)}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Send
                            </Button>
                          )}
                        </div>
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
                          {weekRow.claims.map((claim: any) => (
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
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Card>
    </div>
  );
}
