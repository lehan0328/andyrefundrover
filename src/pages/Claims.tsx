import { useState, Fragment } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Download, Plus, CalendarIcon, Upload, FileText, ChevronRight, ChevronDown, Eye } from "lucide-react";
import { isAfter, isBefore, subDays, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, format, parse } from "date-fns";
import { allClaims } from "@/data/claimsData";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useSearch } from "@/contexts/SearchContext";

const shipmentLineItems: Record<string, Array<{ sku: string; name: string; qtyExpected: number; qtyReceived: number; discrepancy: number; amount: string }>> = {
  'FBA15XYWZ': [
    { sku: '0Q-I3CT-T8XI', name: 'Afta After Shave Skin Conditioner Original 3 oz (Pack of 5)', qtyExpected: 60, qtyReceived: 52, discrepancy: 8, amount: '$147.00' },
    { sku: 'EF-11M5-8L27', name: 'Afta After Shave Skin Conditioner Original, 3 Fl Oz (Pack of 2)', qtyExpected: 40, qtyReceived: 36, discrepancy: 4, amount: '$98.00' },
  ],
  'AWD2024ABC': [
    { sku: 'S7-TZEI-LK9K', name: 'Air Wick Scented Oil Warmer Plugin Air Freshener, White, 6ct', qtyExpected: 45, qtyReceived: 42, discrepancy: 3, amount: '$108.00' },
    { sku: '7O-G8P5-QTKY', name: 'Air Wick Stick Ups Crisp Breeze Air Freshener, 2 ct (Pack of 12) (Packaging May Vary)', qtyExpected: 30, qtyReceived: 27, discrepancy: 3, amount: '$72.50' },
  ],
  'FBA21CLSD': [
    { sku: '0Q-I3CT-T8XI', name: 'Afta After Shave Skin Conditioner Original 3 oz (Pack of 5)', qtyExpected: 50, qtyReceived: 52, discrepancy: 8, amount: '$147.00' },
    { sku: 'EF-11M5-8L27', name: 'Afta After Shave Skin Conditioner Original, 3 Fl Oz (Pack of 2)', qtyExpected: 50, qtyReceived: 36, discrepancy: 4, amount: '$98.00' },
  ],
};

const randomSkus: Array<{ sku: string; name: string }> = [
  { sku: '1065596880', name: 'Schwarzkopf got2b Glued Styling Spiking Glue 1.25 oz (Pack of 3)' },
  { sku: 'I8-ECV2-DYST', name: 'Got 2B Boosted Thickening Cream 6 Ounce (Pack of 3)' },
  { sku: 'NAD/VITE/2.25OZ', name: 'Nadinola Fade Cream Normal Skin With Vitamin-E 2.25oz' },
  { sku: 'NAD/XSTR/2.25OZ', name: 'Nadinola Fade Cream X-Strength 2.25oz' },
  { sku: 'O9-X8YW-PII8', name: 'Afta Pre-Electric Shave Lotion With Skin Conditioners Original 3 oz (6 pack)' },
  { sku: 'U6-C3CC-AMOY', name: 'Mennen Afta Pre-Electric Shave Lotion, 3 Ounce (Pack of 2)' },
  { sku: '5Z-TUCZ-OAP9', name: 'Aussie Conditioner Leave-In Kids Curly 6.8 Ounce' },
  { sku: 'ZB-VQAT-UWXU', name: 'Palmer\'s Skin Success Anti-Acne Medicated Complexion Bar - 3.50 oz' },
  { sku: 'HO-RVDC-SX31', name: 'Torie and Howard Organic Hard Candy Tin, Pink Grapefruit and Tupelo Honey, 2 Ounce' },
  { sku: 'O7-QL7R-G1NU', name: 'Torie & Howard Natural Fruits Organic Hard Candy, Pomegranate and Nectarine, 2 Ounce' },
  { sku: 'SG/UNSCNT/10OZ/3PK', name: 'Salon Grafix Freezing Hair Spray Mega Hold - 10oz/3pk' },
  { sku: 'SG/UNSCNT/10OZ', name: 'SALON GRAFIX SHAPING HAIR SPRAY SUPER HOLD UNSCENTED -10oz/6pk' },
  { sku: 'YV-36SW-UWOJ', name: 'FDS Baby Powder Feminine Spray, 2 oz (56 g) each (Pack of 3)' },
];

const Claims = () => {
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [claims, setClaims] = useState(allClaims.map(claim => ({ ...claim, invoices: [] as Array<{ url: string; date: string | null; fileName: string }> })));
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>();
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>();
  const [uploadingClaimId, setUploadingClaimId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedInvoice, setSelectedInvoice] = useState<{ url: string; fileName: string } | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const toggleRow = (shipmentId: string) => setExpanded(prev => ({ ...prev, [shipmentId]: !prev[shipmentId] }));
  const { toast } = useToast();

  // Set up PDF.js worker
  GlobalWorkerOptions.workerSrc = pdfjsWorker;

  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      // Extract text from first 3 pages (where invoice date is usually found)
      const maxPages = Math.min(pdf.numPages, 3);
      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + ' ';
      }

      console.log('Extracted PDF text:', fullText.substring(0, 500));
      return fullText;
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      return '';
    }
  };

  const extractInvoiceDate = async (file: File): Promise<string | null> => {
    try {
      let text = '';

      if (file.type === 'application/pdf') {
        text = await extractTextFromPDF(file);
      } else {
        text = await file.text().catch(() => '');
      }

      if (!text) {
        console.log('No text extracted from file');
        return null;
      }

      // Normalize spaces and lowercase for matching while keeping original for capture
      const normalized = text.replace(/\s+/g, ' ').trim();

      // Try to find a labeled date first (common invoice labels)
      const labeledPatterns: RegExp[] = [
        /invoice\s*date\s*[:\-]?\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/i,
        /invoice\s*date\s*[:\-]?\s*([A-Za-z]{3,}\s+\d{1,2},?\s+\d{4})/i,
        /date\s*of\s*issue\s*[:\-]?\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/i,
        /issue\s*date\s*[:\-]?\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/i,
        /tax\s*invoice\s*date\s*[:\-]?\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/i,
        /inv\s*date\s*[:\-]?\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/i,
        /date\s*[:\-]?\s*([A-Za-z]{3,}\s+\d{1,2},?\s+\d{4})/i,
        /date\s*[:\-]?\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/i,
      ];

      const tryParse = (dateStr: string): string | null => {
        const cleaned = dateStr.replace(/\s+/g, ' ').trim().replace(/,/, '');
        const formats = [
          'MM/dd/yyyy','dd/MM/yyyy','M/d/yyyy','d/M/yyyy',
          'yyyy-MM-dd','yyyy/MM/dd','d MMM yyyy','dd MMM yyyy','d MMMM yyyy','dd MMMM yyyy',
          'MMMM d yyyy','MMMM d, yyyy','MMM d yyyy','MMM d, yyyy','dd-MMM-yy','d-MMM-yy','dd-MMM-yyyy','d-MMM-yyyy'
        ];
        for (const fmt of formats) {
          try {
            const p = parse(cleaned, fmt, new Date());
            if (!isNaN(p.getTime()) && p.getFullYear() > 1900 && p.getFullYear() < 2100) {
              return format(p, 'yyyy-MM-dd');
            }
          } catch {}
        }
        // Numeric fallback like 12/31/2024 or 31/12/2024
        const m = cleaned.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
        if (m) {
          const a = parseInt(m[1], 10), b = parseInt(m[2], 10), y = parseInt(m[3].length === 2 ? '20'+m[3] : m[3], 10);
          const mmdd = a <= 12 ? new Date(y, a - 1, b) : new Date(y, b - 1, a);
          if (!isNaN(mmdd.getTime())) return format(mmdd, 'yyyy-MM-dd');
        }
        // Last resort
        const auto = new Date(cleaned);
        if (!isNaN(auto.getTime())) return format(auto, 'yyyy-MM-dd');
        return null;
      };

      for (const pattern of labeledPatterns) {
        const match = normalized.match(pattern);
        if (match) {
          const candidate = match[1] || match[0];
          const parsed = tryParse(candidate);
          if (parsed) {
            console.log('Parsed labeled invoice date:', parsed);
            return parsed;
          }
        }
      }

      // As a fallback, search for any date-like token in the first 1000 chars
      const anyDate = normalized.substring(0, 1000).match(/(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|[A-Za-z]{3,}\s+\d{1,2},?\s+\d{4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2})/);
      if (anyDate) {
        const parsed = tryParse(anyDate[0]);
        if (parsed) return parsed;
      }

      console.log('No valid date found in invoice');
      return null;
    } catch (error) {
      console.error('Error extracting date from invoice:', error);
      return null;
    }
  };

  const handleStatusUpdate = (claimId: string, newStatus: string) => {
    setClaims(prevClaims => 
      prevClaims.map(claim => 
        claim.id === claimId ? { ...claim, status: newStatus } : claim
      )
    );
  };

  const handleInvoiceUpload = async (claimId: string, files: FileList) => {
    try {
      setUploadingClaimId(claimId);
      
      const uploadedInvoices: Array<{ url: string; date: string | null; fileName: string }> = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log('Starting upload for file:', file.name, 'type:', file.type);
        
        // Extract invoice date from PDF or other files
        const invoiceDate = await extractInvoiceDate(file);
        console.log('Extracted invoice date:', invoiceDate);
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${claimId}-${Date.now()}-${i}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('claim-invoices')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error for file:', file.name, uploadError);
          throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
        }

        uploadedInvoices.push({
          url: filePath,
          date: invoiceDate,
          fileName: file.name
        });
      }

      setClaims(prevClaims =>
        prevClaims.map(claim =>
          claim.id === claimId 
            ? { ...claim, invoices: [...claim.invoices, ...uploadedInvoices] } 
            : claim
        )
      );

      toast({
        title: "Invoices uploaded",
        description: `Successfully uploaded ${uploadedInvoices.length} invoice${uploadedInvoices.length > 1 ? 's' : ''}.`,
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload invoice. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingClaimId(null);
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

  const filteredClaims = claims.filter(claim => {
    const searchLower = localSearchQuery.toLowerCase();
    
    // Search in shipment-level fields
    const matchesShipmentSearch = localSearchQuery === "" || 
      claim.itemName.toLowerCase().includes(searchLower) ||
      claim.caseId.toLowerCase().includes(searchLower) ||
      claim.asin.toLowerCase().includes(searchLower) ||
      claim.sku.toLowerCase().includes(searchLower) ||
      claim.shipmentId.toLowerCase().includes(searchLower);
    
    // Search within line items inside shipment
    const lineItems = shipmentLineItems[claim.shipmentId] || [];
    const matchesLineItemSearch = localSearchQuery === "" || lineItems.some(item =>
      item.name.toLowerCase().includes(searchLower) ||
      item.sku.toLowerCase().includes(searchLower)
    );
    
    const matchesSearch = matchesShipmentSearch || matchesLineItemSearch;
    const matchesStatus = statusFilter === "all" || claim.status === statusFilter;
    const matchesDate = filterByDate(claim.date);
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      Approved: "default",
      Pending: "secondary",
      Denied: "destructive",
      Submitted: "outline",
      Closed: "default",
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || "default"}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Claims Management</h1>
          <p className="text-muted-foreground mt-2">
            Monitor and manage all reimbursement claims
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Claim
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
              placeholder="Search by item name, ASIN, SKU, shipment ID..."
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Submitted">Submitted</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Closed">Closed</SelectItem>
              <SelectItem value="Denied">Denied</SelectItem>
            </SelectContent>
          </Select>
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

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Created Date</TableHead>
              <TableHead>Last Update Date</TableHead>
              <TableHead>Shipment ID</TableHead>
              <TableHead>Total Qty Expected</TableHead>
              <TableHead>Total Qty Received</TableHead>
              <TableHead>Discrepancy</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Case ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>Invoice Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClaims.map((claim) => (
              <>
                <TableRow
                  key={claim.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleRow(claim.shipmentId)}
                >
                  <TableCell className="text-muted-foreground">{claim.date}</TableCell>
                  <TableCell className="text-muted-foreground">{claim.lastUpdated || claim.date}</TableCell>
                  <TableCell className="font-mono text-sm">
                    <div className="flex items-center gap-2">
                      {expanded[claim.shipmentId] ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      {claim.shipmentId}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{claim.totalQtyExpected || 0}</TableCell>
                  <TableCell className="font-medium">{claim.totalQtyReceived || 0}</TableCell>
                  <TableCell className="font-semibold text-destructive">{claim.discrepancy || 0}</TableCell>
                  <TableCell className="font-semibold">{claim.amount}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {claim.status === 'Pending' ? '-' : claim.caseId}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Select value={claim.status} onValueChange={(value) => handleStatusUpdate(claim.id, value)}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Submitted">Submitted</SelectItem>
                        <SelectItem value="Approved">Approved</SelectItem>
                        <SelectItem value="Closed">Closed</SelectItem>
                        <SelectItem value="Denied">Denied</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-col gap-2">
                      {claim.invoices.length > 0 ? (
                        <>
                          {claim.invoices.map((invoice, idx) => (
                            <Button
                              key={idx}
                              variant="outline"
                              size="sm"
                              className="gap-2 justify-start"
                              onClick={async () => {
                                try {
                                  const { data, error } = await supabase.storage
                                    .from('claim-invoices')
                                    .download(invoice.url);
                                  
                                  if (error) throw error;
                                  
                                  if (data) {
                                    const url = URL.createObjectURL(data);
                                    setPdfBlobUrl(url);
                                    setSelectedInvoice(invoice);
                                  }
                                } catch (error: any) {
                                  console.error('View error:', error);
                                  toast({
                                    title: "Failed to open PDF",
                                    description: error.message || "Failed to open invoice.",
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              <Eye className="h-4 w-4" />
                              <span className="truncate max-w-[120px]">{invoice.fileName}</span>
                            </Button>
                          ))}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2"
                            disabled={uploadingClaimId === claim.id}
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = '.pdf';
                              input.multiple = true;
                              input.onchange = (e) => {
                                const files = (e.target as HTMLInputElement).files;
                                if (files && files.length > 0) {
                                  handleInvoiceUpload(claim.id, files);
                                }
                              };
                              input.click();
                            }}
                          >
                            <Plus className="h-4 w-4" />
                            Add More
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          disabled={uploadingClaimId === claim.id}
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = '.pdf';
                            input.multiple = true;
                            input.onchange = (e) => {
                              const files = (e.target as HTMLInputElement).files;
                              if (files && files.length > 0) {
                                handleInvoiceUpload(claim.id, files);
                              }
                            };
                            input.click();
                          }}
                        >
                          <Upload className="h-4 w-4" />
                          {uploadingClaimId === claim.id ? 'Uploading...' : 'Upload'}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {claim.invoices.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {claim.invoices.map((invoice, idx) => (
                          <span key={idx} className="text-xs">
                            {invoice.date ? format(new Date(invoice.date), 'MMM dd, yyyy') : '-'}
                          </span>
                        ))}
                      </div>
                    ) : '-'}
                  </TableCell>
                </TableRow>
                {expanded[claim.shipmentId] && (
                  <TableRow className="bg-muted/30">
                    <TableCell colSpan={11}>
                      <div className="border rounded-md p-4 bg-card">
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
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      </Card>

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
