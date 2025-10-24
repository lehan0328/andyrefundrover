import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Download, Plus, CalendarIcon, Upload, FileText } from "lucide-react";
import { isAfter, isBefore, subDays, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, format, parse } from "date-fns";
import { allClaims } from "@/data/claimsData";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as pdfjsLib from 'pdfjs-dist';

const Claims = () => {
  const [claims, setClaims] = useState(allClaims.map(claim => ({ ...claim, invoiceUrl: null, invoiceDate: null })));
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>();
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>();
  const [uploadingClaimId, setUploadingClaimId] = useState<string | null>(null);
  const { toast } = useToast();

  // Set up PDF.js worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
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
        // For non-PDF files, try reading as text
        text = await file.text().catch(() => '');
      }
      
      if (!text) {
        console.log('No text extracted from file');
        return null;
      }

      // Common date patterns in invoices
      const datePatterns = [
        /invoice\s+date[:\s]+(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/i,
        /date[:\s]+(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/i,
        /(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})/,
        /(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})/,
        /(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}/i,
        /(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4})/i,
      ];

      for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match) {
          const dateStr = match[1] || match[0];
          console.log('Found date match:', dateStr);
          
          try {
            // Try parsing different date formats
            const formats = [
              'MM/dd/yyyy', 'dd/MM/yyyy', 'yyyy-MM-dd', 'yyyy/MM/dd',
              'MMMM d, yyyy', 'MMMM dd, yyyy',
              'd MMMM yyyy', 'dd MMMM yyyy',
              'd MMM yyyy', 'dd MMM yyyy'
            ];
            
            for (const fmt of formats) {
              try {
                const parsed = parse(dateStr, fmt, new Date());
                if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1900 && parsed.getFullYear() < 2100) {
                  const formattedDate = format(parsed, 'yyyy-MM-dd');
                  console.log('Successfully parsed date:', formattedDate);
                  return formattedDate;
                }
              } catch (e) {
                continue;
              }
            }
          } catch (e) {
            console.error('Error parsing date:', e);
            continue;
          }
        }
      }
      
      console.log('No valid date found in invoice');
    } catch (error) {
      console.error('Error extracting date from invoice:', error);
    }
    return null;
  };

  const handleStatusUpdate = (claimId: string, newStatus: string) => {
    setClaims(prevClaims => 
      prevClaims.map(claim => 
        claim.id === claimId ? { ...claim, status: newStatus } : claim
      )
    );
  };

  const handleInvoiceUpload = async (claimId: string, file: File) => {
    try {
      setUploadingClaimId(claimId);
      
      console.log('Starting upload for file:', file.name, 'type:', file.type);
      
      // Extract invoice date from PDF or other files
      const invoiceDate = await extractInvoiceDate(file);
      console.log('Extracted invoice date:', invoiceDate);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${claimId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('claim-invoices')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('claim-invoices')
        .getPublicUrl(filePath);

      setClaims(prevClaims =>
        prevClaims.map(claim =>
          claim.id === claimId ? { ...claim, invoiceUrl: filePath, invoiceDate } : claim
        )
      );

      toast({
        title: "Invoice uploaded",
        description: invoiceDate 
          ? `Invoice uploaded successfully. Invoice date: ${format(new Date(invoiceDate), 'MMM dd, yyyy')}`
          : "Invoice uploaded successfully. Could not extract invoice date.",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload invoice. Please try again.",
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
    const matchesSearch = searchTerm === "" || 
      claim.caseId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.asin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
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
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by Case ID, ASIN, SKU..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
              <TableHead>Shipment Date</TableHead>
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
              <TableRow key={claim.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell className="text-muted-foreground">{claim.date}</TableCell>
                <TableCell className="font-mono text-sm">{claim.shipmentId}</TableCell>
                <TableCell className="font-medium">{claim.totalQtyExpected || 0}</TableCell>
                <TableCell className="font-medium">{claim.totalQtyReceived || 0}</TableCell>
                <TableCell className="font-semibold text-destructive">{claim.discrepancy || 0}</TableCell>
                <TableCell className="font-semibold">{claim.amount}</TableCell>
                <TableCell className="font-mono text-sm">{claim.caseId}</TableCell>
                <TableCell>
                  <Select value={claim.status} onValueChange={(value) => handleStatusUpdate(claim.id, value)}>
                    <SelectTrigger className="w-[120px]">
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
                <TableCell>
                  {claim.invoiceUrl ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={async () => {
                        const { data } = await supabase.storage
                          .from('claim-invoices')
                          .download(claim.invoiceUrl!);
                        if (data) {
                          const url = URL.createObjectURL(data);
                          window.open(url, '_blank');
                        }
                      }}
                    >
                      <FileText className="h-4 w-4" />
                      View
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={uploadingClaimId === claim.id}
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.pdf,.jpg,.jpeg,.png';
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) {
                            handleInvoiceUpload(claim.id, file);
                          }
                        };
                        input.click();
                      }}
                    >
                      <Upload className="h-4 w-4" />
                      {uploadingClaimId === claim.id ? 'Uploading...' : 'Upload'}
                    </Button>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {claim.invoiceDate ? format(new Date(claim.invoiceDate), 'MMM dd, yyyy') : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default Claims;
