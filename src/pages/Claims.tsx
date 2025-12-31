import { useState, Fragment, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Download, CalendarIcon, Upload, FileText, ChevronRight, ChevronDown, Eye, Trash2, Check, ChevronsUpDown, Clock, XCircle, CheckCircle2, DollarSign, RefreshCw } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { isAfter, isBefore, subDays, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, format, parse } from "date-fns";
import { allClaims } from "@/data/claimsData";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useSearch } from "@/contexts/SearchContext";
import { useSearchParams } from "react-router-dom";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


const shipmentLineItems: Record<string, Array<{ sku: string; name: string; qtyExpected: number; qtyReceived: number; discrepancy: number; amount: string }>> = {
  'FBA15XYWZ': [
    { sku: 'B08N5WRWNW-1', name: 'Air Wick Freshmatic Ultra - Refill Fresh Linen', qtyExpected: 60, qtyReceived: 52, discrepancy: 8, amount: '$147.00' },
    { sku: 'B08N5WRWNW-2', name: 'Air Wick Essential Mist Refill Fresh Water 0.67oz', qtyExpected: 40, qtyReceived: 36, discrepancy: 4, amount: '$98.00' },
  ],
  'AWD2024ABC': [
    { sku: 'S7-TZEI-LK9K', name: 'Air Wick Scented Oil Warmer Plugin Air Freshener, White, 6ct', qtyExpected: 45, qtyReceived: 42, discrepancy: 3, amount: '$108.00' },
    { sku: '7O-G8P5-QTKY', name: 'Air Wick Stick Ups Crisp Breeze Air Freshener, 2 ct (Pack of 12) (Packaging May Vary)', qtyExpected: 30, qtyReceived: 27, discrepancy: 3, amount: '$72.50' },
  ],
  'FBA21CLSD': [
    { sku: '0Q-I3CT-T8XI', name: 'Afta After Shave Skin Conditioner Original 3 oz (Pack of 5)', qtyExpected: 50, qtyReceived: 52, discrepancy: 8, amount: '$147.00' },
    { sku: 'EF-11M5-8L27', name: 'Afta After Shave Skin Conditioner Original, 3 Fl Oz (Pack of 2)', qtyExpected: 50, qtyReceived: 36, discrepancy: 4, amount: '$98.00' },
  ],
  'FBA16ABCD': [
    { sku: 'B07XYZ1234', name: 'NOXZEMA ORIGINAL DEEP CLEANSING POWDER', qtyExpected: 150, qtyReceived: 132, discrepancy: 18, amount: '$320.75' },
  ],
};

const Claims = () => {
  const [searchParams] = useSearchParams();
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [claims, setClaims] = useState<Array<any>>([]);
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [clientFilter, setClientFilter] = useState("all");
  const [clientComboOpen, setClientComboOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState("all");
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>();
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>();
  const [uploadingClaimId, setUploadingClaimId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedInvoice, setSelectedInvoice] = useState<{ url: string; fileName: string } | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [userCompany, setUserCompany] = useState<string | null>(null);
  const [amazonConnected, setAmazonConnected] = useState(false);
  const [checkingAmazonStatus, setCheckingAmazonStatus] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncingClaims, setIsSyncingClaims] = useState(false);
  const toggleRow = (shipmentId: string) => setExpanded(prev => ({ ...prev, [shipmentId]: !prev[shipmentId] }));
  const { toast } = useToast();
  const { user, isCustomer } = useAuth();

  // Set up PDF.js worker
  GlobalWorkerOptions.workerSrc = pdfjsWorker;

  // Fetch user's company name if they are a customer
  useEffect(() => {
    const fetchUserCompany = async () => {
      if (isCustomer && user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('company_name')
          .eq('id', user.id)
          .single();

        if (data && data.company_name) {
          setUserCompany(data.company_name);
          // Automatically filter to user's company for customers
          setClientFilter(data.company_name);
        }
      }
    };

    fetchUserCompany();
  }, [user, isCustomer]);

  // Check for client filter from URL params
  useEffect(() => {
    const clientParam = searchParams.get('client');
    if (clientParam && !isCustomer) {
      setClientFilter(clientParam);
    }
  }, [searchParams, isCustomer]);

  // Load shipment discrepancies and invoices from database on mount
  useEffect(() => {
    loadShipmentDiscrepancies();
    checkAmazonConnection();
  }, [user]);

  const checkAmazonConnection = async () => {
    if (!user) return;
    
    setCheckingAmazonStatus(true);
    try {
      const { data, error } = await supabase
        .from('amazon_credentials')
        .select('id, credentials_status')
        .eq('user_id', user.id)
        .single();
      
      if (!error && data) {
        setAmazonConnected(true);
      }
    } catch (error) {
      console.error('Error checking Amazon connection:', error);
    } finally {
      setCheckingAmazonStatus(false);
    }
  };

  const handleSync = async () => {
    if (!user) return;

    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-amazon-shipments', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: "Sync successful",
        description: `Synced ${data.synced || 0} shipments from Amazon`,
      });

      // Reload data after sync
      await loadShipmentDiscrepancies();
    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: "Sync failed",
        description: error.message || "Failed to sync shipments from Amazon",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncClaims = async () => {
    if (!user) return;

    setIsSyncingClaims(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-amazon-claims', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: "Sync successful",
        description: `Synced ${data.synced || 0} claims from Amazon`,
      });

      // Reload data after sync
      await loadShipmentDiscrepancies();
    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: "Sync failed",
        description: error.message || "Failed to sync claims from Amazon",
        variant: "destructive",
      });
    } finally {
      setIsSyncingClaims(false);
    }
  };

  const loadShipmentDiscrepancies = async () => {
    if (!user) return;

    try {
      // Fetch shipment discrepancies with shipment details
      // Combine this with 'claims' table data
      const { data: claimsData, error: claimsError } = await supabase
        .from('claims')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (claimsError) throw claimsError;

      // Transform data into component format
      if (claimsData) {
         const transformed = claimsData.map((c: any) => ({
            id: c.claim_id,
            shipmentId: c.shipment_id || 'Unknown',
            client: userCompany || 'N/A',
            type: c.shipment_type || 'FBA',
            asin: c.asin || 'N/A',
            sku: c.sku,
            itemName: c.item_name || c.sku,
            amount: `$${c.amount}`,
            actualRecovered: `$${c.actual_recovered}`,
            status: c.status,
            date: c.claim_date,
            lastUpdated: c.last_updated,
            caseId: c.case_id,
            reimbursementId: c.reimbursement_id,
            totalQtyExpected: c.total_qty_expected,
            totalQtyReceived: c.total_qty_received,
            discrepancy: c.discrepancy,
            invoices: [], // TODO: fetch invoices
         }));
         setClaims(transformed);
      }
    } catch (error: any) {
      console.error('Error loading claims:', error);
      toast({
        title: "Error loading claims",
        description: "Failed to load claim data.",
        variant: "destructive",
      });
    }
  };

  const filterByDate = (claimDate: string) => {
    if (dateFilter === "all") return true;
    
    const date = new Date(claimDate);
    const now = new Date();
    
    switch (dateFilter) {
      case "lastWeek":
        const lastWeekStart = startOfWeek(subDays(now, 7));
        const lastWeekEnd = endOfWeek(subDays(now, 7));
        return date >= lastWeekStart && date <= lastWeekEnd;
      case "thisMonth":
        return date >= startOfMonth(now) && date <= endOfMonth(now);
      case "lastMonth":
        const lastMonth = subMonths(now, 1);
        return date >= startOfMonth(lastMonth) && date <= endOfMonth(lastMonth);
      case "30days":
        return isAfter(date, subDays(now, 30));
      case "60days":
        return isAfter(date, subDays(now, 60));
      case "90days":
        return isAfter(date, subDays(now, 90));
      case "custom":
        if (!customDateFrom && !customDateTo) return true;
        if (customDateFrom && customDateTo) {
          return date >= customDateFrom && date <= customDateTo;
        }
        if (customDateFrom) {
          return date >= customDateFrom;
        }
        if (customDateTo) {
          return date <= customDateTo;
        }
        return true;
      default:
        return true;
    }
  };

  const uniqueClients = Array.from(new Set(claims.map(claim => claim.companyName))).sort();

  const filteredClaims = claims.filter(claim => {
    const matchesClientFilter = clientFilter === "all" || claim.companyName === clientFilter;
    const matchesClientSearch = clientSearch === "" || 
      (claim.companyName && claim.companyName.toLowerCase().includes(clientSearch.toLowerCase()));
    
    const searchLower = localSearchQuery.toLowerCase().trim();
    const containsExactWords = (text: string): boolean => {
      if (!searchLower) return true;
      const textLower = (text || '').toLowerCase();
      const regex = new RegExp(`\\b${searchLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return regex.test(textLower);
    };
    
    const matchesShipmentSearch = localSearchQuery === "" || 
      containsExactWords(claim.itemName) ||
      containsExactWords(claim.caseId) ||
      containsExactWords(claim.asin) ||
      containsExactWords(claim.sku) ||
      containsExactWords(claim.shipmentId) ||
      containsExactWords(claim.reimbursementId);
    
    const matchesStatus = statusFilter === "all" || claim.status === statusFilter;
    const matchesDate = filterByDate(claim.date);
    
    return matchesShipmentSearch && matchesStatus && matchesDate && matchesClientFilter && matchesClientSearch;
  });

  const totalClaims = filteredClaims.length;
  const submittedClaims = filteredClaims.filter(c => c.status === "Submitted").length;
  const approvedClaims = filteredClaims.filter(c => c.status === "Approved");
  const approvedAmount = approvedClaims.reduce((sum, c) => {
    const val = typeof c.actualRecovered === 'string' ? parseFloat(c.actualRecovered.replace(/[$,]/g, "")) : c.actualRecovered;
    return sum + (isNaN(val) ? 0 : val);
  }, 0);
  const approvedCount = approvedClaims.length;
  const pendingClaims = filteredClaims.filter(c => c.status === "Pending").length;
  const deniedClaims = filteredClaims.filter(c => c.status === "Denied").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Claims Management</h1>
          <p className="text-muted-foreground mt-2">
            Monitor and manage all reimbursement claims
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total Claims"
          value={totalClaims.toString()}
          icon={FileText}
          variant="default"
        />
        <StatCard
          title="Total Submitted"
          value={submittedClaims.toString()}
          icon={Upload}
          variant="default"
        />
        <StatCard
          title="Approved Amount"
          value={`$${approvedAmount.toFixed(2)}`}
          change={`${approvedCount} claims approved`}
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="Pending Claims"
          value={pendingClaims.toString()}
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="Denied Claims"
          value={deniedClaims.toString()}
          icon={XCircle}
          variant="error"
        />
      </div>

      {isCustomer && amazonConnected && (
        <Card className="p-6 mb-6 border-blue-200 bg-blue-50">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-2">Amazon Account Connected</h3>
              <p className="text-sm text-blue-700 mb-4">
                Sync your latest shipments and claims data from Amazon.
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={handleSync}
                  disabled={isSyncing}
                  variant="default"
                >
                  {isSyncing ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      Syncing Shipments...
                    </>
                  ) : (
                    "Sync Shipments"
                  )}
                </Button>
                <Button 
                  onClick={handleSyncClaims}
                  disabled={isSyncingClaims}
                  variant="outline"
                  className="bg-white"
                >
                  {isSyncingClaims ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Syncing Claims...
                    </>
                  ) : (
                    "Sync Claims"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6">
        {/* Filters and Table (existing code) */}
        <div className="flex gap-4 mb-6 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
              placeholder="Search by item name, ASIN, SKU, shipment ID..."
              className="pl-10"
            />
          </div>
          {!isCustomer && (
            <>
              <div className="relative min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Search client..."
                  className="pl-10"
                />
              </div>
              <Popover open={clientComboOpen} onOpenChange={setClientComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={clientComboOpen}
                    className="w-[200px] justify-between"
                  >
                    {clientFilter === "all" 
                      ? "All Clients" 
                      : uniqueClients.find((client) => client === clientFilter) || "All Clients"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput placeholder="Search client..." />
                    <CommandList>
                      <CommandEmpty>No client found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="all"
                          onSelect={() => {
                            setClientFilter("all");
                            setClientComboOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              clientFilter === "all" ? "opacity-100" : "opacity-0"
                            )}
                          />
                          All Clients
                        </CommandItem>
                        {uniqueClients.map((client) => (
                          <CommandItem
                            key={client}
                            value={client}
                            onSelect={(currentValue) => {
                              setClientFilter(currentValue === clientFilter ? "all" : currentValue);
                              setClientComboOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                clientFilter === client ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {client}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </>
          )}
          <Select value={dateFilter} onValueChange={(value) => {
            setDateFilter(value);
            if (value !== "custom") {
              setCustomDateFrom(undefined);
              setCustomDateTo(undefined);
            }
          }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="lastWeek">Last Week</SelectItem>
              <SelectItem value="thisMonth">This Month</SelectItem>
              <SelectItem value="lastMonth">Last Month</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="60days">Last 60 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
              <SelectItem value="custom">Custom Date</SelectItem>
            </SelectContent>
          </Select>
          {dateFilter === "custom" && (
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[150px] justify-start text-left font-normal",
                      !customDateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customDateFrom ? format(customDateFrom, "MMM dd, yyyy") : "From date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customDateFrom}
                    onSelect={setCustomDateFrom}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[150px] justify-start text-left font-normal",
                      !customDateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customDateTo ? format(customDateTo, "MMM dd, yyyy") : "To date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customDateTo}
                    onSelect={setCustomDateTo}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
        
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-4 mb-6">
            <TabsTrigger value="Pending">Pending</TabsTrigger>
            <TabsTrigger value="Submitted">Submitted</TabsTrigger>
            <TabsTrigger value="Approved">Approved</TabsTrigger>
            <TabsTrigger value="Denied">Denied</TabsTrigger>
          </TabsList>

          <TabsContent value={statusFilter} className="mt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {!isCustomer && <TableHead>Client</TableHead>}
                  <TableHead>Claim Date</TableHead>
                  <TableHead>Last Update</TableHead>
                  <TableHead>Shipment ID</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Discrepancy</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Recovered</TableHead>
                  <TableHead>Case ID</TableHead>
                  <TableHead>Reimbursement ID</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClaims.map((claim) => (
                  <Fragment key={claim.id}>
                    <TableRow
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleRow(claim.shipmentId)}
                    >
                      {!isCustomer && <TableCell className="font-medium">{claim.companyName}</TableCell>}
                      <TableCell className="text-muted-foreground">{claim.date}</TableCell>
                      <TableCell className="text-muted-foreground">{claim.lastUpdated || claim.date}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {claim.shipmentId}
                      </TableCell>
                      <TableCell className="font-medium">{claim.totalQtyExpected || 0}</TableCell>
                      <TableCell className="font-medium">{claim.totalQtyReceived || 0}</TableCell>
                      <TableCell className="font-semibold text-destructive">{claim.discrepancy || 0}</TableCell>
                      <TableCell className="font-semibold">{claim.amount}</TableCell>
                      <TableCell className="font-semibold text-green-600">{claim.actualRecovered}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {claim.caseId || '-'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{claim.reimbursementId || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={
                          claim.status === "Approved" ? "default" :
                          claim.status === "Pending" ? "secondary" :
                          claim.status === "Denied" ? "destructive" :
                          "outline"
                        }>
                          {claim.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Invoice Dialog (existing) */}
      <Dialog open={!!selectedInvoice} onOpenChange={(open) => {
        if (!open) {
          setSelectedInvoice(null);
          if (pdfBlobUrl) {
            URL.revokeObjectURL(pdfBlobUrl);
            setPdfBlobUrl(null);
          }
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{selectedInvoice?.fileName}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                className="gap-2"
                onClick={async () => {
                  if (!selectedInvoice) return;
                  try {
                    const { data, error } = await supabase.storage
                      .from('claim-invoices')
                      .download(selectedInvoice.url);
                    
                    if (error) throw error;
                    
                    if (data) {
                      const url = URL.createObjectURL(data);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = selectedInvoice.fileName;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      toast({
                        title: "Download started",
                        description: "Your invoice is being downloaded.",
                      });
                    }
                  } catch (error: any) {
                    console.error('Download error:', error);
                    toast({
                      title: "Download failed",
                      description: error.message || "Failed to download invoice.",
                      variant: "destructive",
                    });
                  }
                }}
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
            <div className="border rounded-md overflow-hidden bg-muted/20 h-[70vh]">
              {pdfBlobUrl && (
                <iframe
                  src={`${pdfBlobUrl}#toolbar=0`}
                  className="w-full h-full"
                  title={selectedInvoice?.fileName}
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Claims;
