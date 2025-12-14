import { Fragment, useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Download, CalendarIcon, ChevronRight, ChevronDown, Check, ChevronsUpDown, CheckCircle2, Mail, FolderOpen, FileText, Plus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, parse } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AmazonCaseDialog from "./AmazonCaseDialog";

interface MatchedInvoice {
  id: string;
  invoice_number: string | null;
  invoice_date: string | null;
  vendor: string | null;
  file_name: string;
  file_path: string;
  matching_items: Array<{ description: string; similarity: number }>;
}

interface AmazonCase {
  id: string;
  claim_id: string;
  case_id: string;
  status: string;
  case_type: string;
  opened_at: string;
  closed_at: string | null;
}

interface ClaimsTableContentProps {
  claims: any[];
  filteredClaims: any[];
  expanded: Record<string, boolean>;
  toggleRow: (shipmentId: string) => void;
  sentMessages: Record<string, boolean>;
  handleSendMessage: (claim: any) => void;
  handleStatusUpdate: (claimId: string, newStatus: string) => void;
  matchedInvoices: Record<string, MatchedInvoice[]>;
  shipmentLineItems: Record<string, Array<{ sku: string; name: string; qtyExpected: number; qtyReceived: number; discrepancy: number; amount: string }>>;
  // Filters
  isCustomer: boolean;
  clientFilter: string;
  setClientFilter: (value: string) => void;
  clientComboOpen: boolean;
  setClientComboOpen: (value: boolean) => void;
  uniqueClients: string[];
  localSearchQuery: string;
  setLocalSearchQuery: (value: string) => void;
  dateFilter: string;
  setDateFilter: (value: string) => void;
  customDateFrom: Date | undefined;
  setCustomDateFrom: (value: Date | undefined) => void;
  customDateTo: Date | undefined;
  setCustomDateTo: (value: Date | undefined) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  // For viewing a specific client - hide client dropdown
  hideClientFilter?: boolean;
}

const ClaimsTableContent = ({
  claims,
  filteredClaims,
  expanded,
  toggleRow,
  sentMessages,
  handleSendMessage,
  handleStatusUpdate,
  matchedInvoices,
  shipmentLineItems,
  isCustomer,
  clientFilter,
  setClientFilter,
  clientComboOpen,
  setClientComboOpen,
  uniqueClients,
  localSearchQuery,
  setLocalSearchQuery,
  dateFilter,
  setDateFilter,
  customDateFrom,
  setCustomDateFrom,
  customDateTo,
  setCustomDateTo,
  statusFilter,
  setStatusFilter,
  hideClientFilter = false,
}: ClaimsTableContentProps) => {
  const { toast } = useToast();
  const [caseDialogOpen, setCaseDialogOpen] = useState(false);
  const [selectedClaimForCase, setSelectedClaimForCase] = useState<{ id: string; shipmentId: string } | null>(null);
  const [amazonCases, setAmazonCases] = useState<Record<string, AmazonCase[]>>({});

  // Load Amazon cases for all visible claims
  useEffect(() => {
    const loadAllCases = async () => {
      if (filteredClaims.length === 0) return;
      
      const claimIds = filteredClaims.map(c => c.id);
      const { data, error } = await supabase
        .from("amazon_cases")
        .select("*")
        .in("claim_id", claimIds);

      if (error) {
        console.error("Error loading Amazon cases:", error);
        return;
      }

      // Group by claim_id
      const grouped = (data || []).reduce((acc, c) => {
        if (!acc[c.claim_id]) acc[c.claim_id] = [];
        acc[c.claim_id].push(c);
        return acc;
      }, {} as Record<string, AmazonCase[]>);

      setAmazonCases(grouped);
    };

    loadAllCases();
  }, [filteredClaims]);

  const handleOpenCaseDialog = (claim: any) => {
    setSelectedClaimForCase({ id: claim.id, shipmentId: claim.shipmentId });
    setCaseDialogOpen(true);
  };

  const getCaseStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50">Open</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">Pending</Badge>;
      case 'resolved':
        return <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">Resolved</Badge>;
      case 'closed':
        return <Badge variant="outline" className="text-muted-foreground border-muted bg-muted/30">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
    <div className="h-full overflow-auto">
      {!isCustomer && !hideClientFilter && (
        <div className="flex gap-4 mb-6 flex-wrap p-4 border-b">
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
          
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
              placeholder="Search by item name, ASIN, SKU, shipment ID..."
              className="pl-10"
            />
          </div>
          
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
      )}

      {/* Simplified filter bar for specific client view */}
      {hideClientFilter && (
        <div className="flex gap-4 mb-4 flex-wrap p-4 border-b">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
              placeholder="Search claims..."
              className="pl-10"
            />
          </div>
          
          <Select value={dateFilter} onValueChange={(value) => {
            setDateFilter(value);
            if (value !== "custom") {
              setCustomDateFrom(undefined);
              setCustomDateTo(undefined);
            }
          }}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      
      <div className={hideClientFilter ? "px-2" : ""}>
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
          <TabsList className={cn(
            "mb-4",
            hideClientFilter ? "flex flex-wrap gap-1 h-auto" : "grid w-full max-w-md grid-cols-4"
          )}>
            <TabsTrigger value="Pending" className={hideClientFilter ? "text-xs px-3 py-1.5" : ""}>Pending</TabsTrigger>
            <TabsTrigger value="Submitted" className={hideClientFilter ? "text-xs px-3 py-1.5" : ""}>Submitted</TabsTrigger>
            <TabsTrigger value="Approved" className={hideClientFilter ? "text-xs px-3 py-1.5" : ""}>Approved</TabsTrigger>
            <TabsTrigger value="Denied" className={hideClientFilter ? "text-xs px-3 py-1.5" : ""}>Denied</TabsTrigger>
          </TabsList>

          <TabsContent value={statusFilter} className="mt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {!hideClientFilter && <TableHead>Client</TableHead>}
                  <TableHead className={hideClientFilter ? "text-xs" : ""}>Date</TableHead>
                  <TableHead className={hideClientFilter ? "text-xs" : ""}>Shipment ID</TableHead>
                  {!hideClientFilter && <TableHead>Qty Expected</TableHead>}
                  {!hideClientFilter && <TableHead>Qty Received</TableHead>}
                  <TableHead className={hideClientFilter ? "text-xs" : ""}>Discrepancy</TableHead>
                  <TableHead className={hideClientFilter ? "text-xs" : ""}>Expected</TableHead>
                  <TableHead className={hideClientFilter ? "text-xs" : ""}>Recovered</TableHead>
                  <TableHead className={hideClientFilter ? "text-xs" : ""}>Amazon Case</TableHead>
                  <TableHead className={hideClientFilter ? "text-xs" : ""}>Status</TableHead>
                  <TableHead className={hideClientFilter ? "text-xs" : ""}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClaims.map((claim) => (
                  <Fragment key={claim.id}>
                    <TableRow
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleRow(claim.shipmentId)}
                    >
                      {!hideClientFilter && (
                        <TableCell className="font-medium">{claim.companyName}</TableCell>
                      )}
                      <TableCell className={cn("text-muted-foreground", hideClientFilter && "text-xs")}>{claim.date}</TableCell>
                      <TableCell className={cn("font-mono", hideClientFilter ? "text-xs" : "text-sm")}>
                        <div className="flex items-center gap-1">
                          {expanded[claim.shipmentId] ? (
                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span className={hideClientFilter ? "truncate max-w-[80px]" : ""}>{claim.shipmentId}</span>
                        </div>
                      </TableCell>
                      {!hideClientFilter && (
                        <TableCell className="font-medium">{claim.totalQtyExpected || 0}</TableCell>
                      )}
                      {!hideClientFilter && (
                        <TableCell className="font-medium">{claim.totalQtyReceived || 0}</TableCell>
                      )}
                      <TableCell className={cn("font-semibold text-destructive", hideClientFilter && "text-xs")}>{claim.discrepancy || 0}</TableCell>
                      <TableCell className={cn("font-semibold", hideClientFilter && "text-xs")}>{claim.amount}</TableCell>
                      <TableCell className={cn("font-semibold text-green-600", hideClientFilter && "text-xs")}>{claim.actualRecovered}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {amazonCases[claim.id] && amazonCases[claim.id].length > 0 ? (
                          <button
                            onClick={() => handleOpenCaseDialog(claim)}
                            className="flex items-center gap-2 text-left hover:bg-muted/50 rounded px-2 py-1 -mx-2 -my-1 transition-colors"
                          >
                            <span className="font-mono text-xs">#{amazonCases[claim.id][0].case_id}</span>
                            {getCaseStatusBadge(amazonCases[claim.id][0].status)}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenCaseDialog(claim)}
                            className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Add Case</span>
                          </button>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Select value={claim.status} onValueChange={(value) => handleStatusUpdate(claim.id, value)}>
                          <SelectTrigger className="w-[110px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="Submitted">Submitted</SelectItem>
                            <SelectItem value="Approved">Approved</SelectItem>
                            <SelectItem value="Denied">Denied</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <TooltipProvider>
                            {sentMessages[claim.shipmentId] ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 rounded-full"
                                  >
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="z-[100] bg-popover">
                                  <DropdownMenuItem onClick={() => handleSendMessage(claim)}>
                                    <Mail className="h-4 w-4 mr-2" />
                                    Send Another Message
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 rounded-full"
                                    onClick={() => handleSendMessage(claim)}
                                  >
                                    <Mail className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Send Message</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expanded[claim.shipmentId] && (
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={hideClientFilter ? 11 : 12}>
                          <div className="border rounded-md p-4 bg-card space-y-6">
                            {/* Line Items Section */}
                            <div>
                              <div className="text-sm text-muted-foreground mb-3">Items with discrepancies in shipment {claim.shipmentId}</div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b">
                                      <th className="text-left py-2 px-2 font-medium">SKU</th>
                                      <th className="text-left py-2 px-2 font-medium">Product Name</th>
                                      <th className="text-right py-2 px-2 font-medium">Qty Expected</th>
                                      <th className="text-right py-2 px-2 font-medium">Qty Received</th>
                                      <th className="text-right py-2 px-2 font-medium">Discrepancy</th>
                                      <th className="text-right py-2 px-2 font-medium">Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(shipmentLineItems[claim.shipmentId] || []).map((li) => (
                                      <tr key={li.sku} className="border-b last:border-0">
                                        <td className="py-2 px-2 font-mono text-xs">{li.sku}</td>
                                        <td className="py-2 px-2 text-muted-foreground">{li.name}</td>
                                        <td className="py-2 px-2 text-right">{li.qtyExpected}</td>
                                        <td className="py-2 px-2 text-right">{li.qtyReceived}</td>
                                        <td className="py-2 px-2 text-right text-destructive font-semibold">{li.discrepancy}</td>
                                        <td className="py-2 px-2 text-right font-semibold">{li.amount}</td>
                                      </tr>
                                    ))}
                                    {(!shipmentLineItems[claim.shipmentId] || shipmentLineItems[claim.shipmentId].length === 0) && (
                                      <tr>
                                        <td colSpan={6} className="py-2 px-2 text-muted-foreground">No items with discrepancies for this shipment.</td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Matched Invoices Section */}
                            {matchedInvoices[claim.shipmentId] && matchedInvoices[claim.shipmentId].length > 0 && (
                              <div>
                                <div className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
                                  <FileText className="h-4 w-4" />
                                  Matching Invoices (80%+ similarity)
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b">
                                        <th className="text-left py-2 px-2 font-medium">Invoice #</th>
                                        <th className="text-left py-2 px-2 font-medium">Vendor</th>
                                        <th className="text-left py-2 px-2 font-medium">Date</th>
                                        <th className="text-left py-2 px-2 font-medium">File Name</th>
                                        <th className="text-left py-2 px-2 font-medium">Matching Items</th>
                                        <th className="text-left py-2 px-2 font-medium">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {matchedInvoices[claim.shipmentId].map((invoice) => (
                                        <tr key={invoice.id} className="border-b last:border-0">
                                          <td className="py-2 px-2 font-mono text-xs">
                                            {invoice.invoice_number || '-'}
                                          </td>
                                          <td className="py-2 px-2 text-muted-foreground">
                                            {invoice.vendor || '-'}
                                          </td>
                                          <td className="py-2 px-2">
                                            {invoice.invoice_date ? format(parse(invoice.invoice_date, 'yyyy-MM-dd', new Date()), 'MMM dd, yyyy') : '-'}
                                          </td>
                                          <td className="py-2 px-2 text-muted-foreground">
                                            {invoice.file_name}
                                          </td>
                                          <td className="py-2 px-2">
                                            <div className="flex flex-col gap-1">
                                              {invoice.matching_items.slice(0, 2).map((item, idx) => (
                                                <div key={idx} className="text-xs">
                                                  <Badge variant="secondary" className="mr-1">{item.similarity}%</Badge>
                                                  <span className="text-muted-foreground">{item.description.substring(0, 40)}...</span>
                                                </div>
                                              ))}
                                              {invoice.matching_items.length > 2 && (
                                                <span className="text-xs text-muted-foreground">
                                                  +{invoice.matching_items.length - 2} more
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                          <td className="py-2 px-2">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="gap-2"
                                              onClick={async () => {
                                                try {
                                                  const { data, error } = await supabase.storage
                                                    .from('invoices')
                                                    .download(invoice.file_path);
                                                  
                                                  if (error) throw error;
                                                  
                                                  if (data) {
                                                    const url = URL.createObjectURL(data);
                                                    const a = document.createElement('a');
                                                    a.href = url;
                                                    a.download = invoice.file_name;
                                                    document.body.appendChild(a);
                                                    a.click();
                                                    document.body.removeChild(a);
                                                    URL.revokeObjectURL(url);
                                                    toast({
                                                      title: "Download started",
                                                      description: "Invoice is being downloaded.",
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
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </div>
    </div>
    
    {/* Amazon Case Dialog */}
    {selectedClaimForCase && (
      <AmazonCaseDialog
        open={caseDialogOpen}
        onOpenChange={setCaseDialogOpen}
        claimId={selectedClaimForCase.id}
        shipmentId={selectedClaimForCase.shipmentId}
      />
    )}
    </>
  );
};

export default ClaimsTableContent;
