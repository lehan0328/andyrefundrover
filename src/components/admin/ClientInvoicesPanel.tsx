import { useState, useEffect, Fragment } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Download, FileText, Search, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Json } from "@/integrations/supabase/types";

interface LineItem {
  description?: string;
  item_description?: string;
  quantity?: number | string;
  unit_price?: number | string;
  total?: number | string;
  price?: number | string;
  amount?: number | string;
  sku?: string;
}

interface Invoice {
  id: string;
  file_name: string;
  file_path: string;
  invoice_number: string | null;
  invoice_date: string | null;
  vendor: string | null;
  analysis_status: string | null;
  created_at: string | null;
  line_items: Json | null;
}

interface ClientInvoicesPanelProps {
  clientEmail: string;
}

const ClientInvoicesPanel = ({ clientEmail }: ClientInvoicesPanelProps) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<{ url: string; fileName: string } | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [expandedInvoices, setExpandedInvoices] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    loadInvoices();
  }, [clientEmail]);

  const loadInvoices = async () => {
    if (!clientEmail || clientEmail === "all") {
      setInvoices([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // First, get all user IDs that match this email from profiles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', clientEmail);

      if (profileError) throw profileError;

      if (!profiles || profiles.length === 0) {
        setInvoices([]);
        setLoading(false);
        return;
      }

      const userIds = profiles.map(p => p.id);

      // Now fetch invoices for those users - include line_items
      const { data, error } = await supabase
        .from('invoices')
        .select('id, file_name, file_path, invoice_number, invoice_date, vendor, analysis_status, created_at, line_items')
        .in('user_id', userIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setInvoices(data || []);
    } catch (error: any) {
      console.error('Error loading invoices:', error);
      toast({
        title: "Error",
        description: "Failed to load invoices",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewInvoice = async (invoice: Invoice) => {
    try {
      const { data, error } = await supabase.storage
        .from('invoices')
        .download(invoice.file_path);

      if (error) throw error;

      if (data) {
        const url = URL.createObjectURL(data);
        setPdfBlobUrl(url);
        setSelectedInvoice({ url: invoice.file_path, fileName: invoice.file_name });
      }
    } catch (error: any) {
      console.error('Error viewing invoice:', error);
      toast({
        title: "Error",
        description: "Failed to load invoice preview",
        variant: "destructive"
      });
    }
  };

  const handleDownloadInvoice = async (invoice: Invoice) => {
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
  };

  const toggleInvoiceExpand = (invoiceId: string) => {
    setExpandedInvoices(prev => ({
      ...prev,
      [invoiceId]: !prev[invoiceId]
    }));
  };

  const getLineItems = (invoice: Invoice): LineItem[] => {
    if (!invoice.line_items) return [];
    if (Array.isArray(invoice.line_items)) {
      return invoice.line_items as LineItem[];
    }
    return [];
  };

  const filteredInvoices = invoices.filter(invoice => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    
    // Check invoice-level fields
    if (
      invoice.file_name.toLowerCase().includes(searchLower) ||
      (invoice.invoice_number?.toLowerCase().includes(searchLower)) ||
      (invoice.vendor?.toLowerCase().includes(searchLower))
    ) {
      return true;
    }
    
    // Check line items
    const lineItems = getLineItems(invoice);
    return lineItems.some(item => {
      const description = (item.description || item.item_description || '').toLowerCase();
      const sku = (item.sku || '').toLowerCase();
      return description.includes(searchLower) || sku.includes(searchLower);
    });
  });

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'analyzed':
        return <Badge variant="default" className="text-xs">Analyzed</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="text-xs">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="text-xs">Failed</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Unknown</Badge>;
    }
  };

  if (!clientEmail || clientEmail === "all") {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8">
        <FileText className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-center">Select a client to view their invoices</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b">
        <h3 className="text-base font-semibold mb-3">Client Invoices</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search invoices..."
            className="pl-10 h-9 text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8">
            <FileText className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-center">No invoices found for this client</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs w-8"></TableHead>
                <TableHead className="text-xs">Invoice</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => {
                const lineItems = getLineItems(invoice);
                const hasLineItems = lineItems.length > 0;
                const isExpanded = expandedInvoices[invoice.id];

                return (
                  <Fragment key={invoice.id}>
                    <TableRow 
                      className={hasLineItems ? "cursor-pointer hover:bg-muted/50" : ""}
                      onClick={() => hasLineItems && toggleInvoiceExpand(invoice.id)}
                    >
                      <TableCell className="w-8 p-2">
                        {hasLineItems && (
                          isExpanded ? (
                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                          )
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="truncate max-w-[120px]" title={invoice.invoice_number || invoice.file_name}>
                          {invoice.invoice_number || invoice.file_name}
                        </div>
                        {invoice.vendor && (
                          <div className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                            {invoice.vendor}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {invoice.invoice_date 
                          ? format(new Date(invoice.invoice_date), 'MM/dd/yy')
                          : invoice.created_at 
                            ? format(new Date(invoice.created_at), 'MM/dd/yy')
                            : '-'
                        }
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()} className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleDownloadInvoice(invoice)}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    
                    {/* Expanded Line Items */}
                    {isExpanded && hasLineItems && (
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={4} className="p-2">
                          <div className="rounded border bg-card p-2">
                            <div className="text-xs font-medium text-muted-foreground mb-2">
                              Line Items ({lineItems.length})
                            </div>
                            <div className="space-y-1 max-h-[200px] overflow-auto">
                              {lineItems.map((item, idx) => {
                                const description = item.description || item.item_description || 'No description';
                                const truncatedDesc = description.length > 50 ? description.slice(0, 50) + '...' : description;
                                const unitPrice = item.unit_price ?? item.price;
                                const total = item.total ?? item.amount;
                                
                                return (
                                  <div key={idx} className="flex items-start justify-between text-xs border-b last:border-0 pb-1">
                                    <div className="flex-1 min-w-0">
                                      <div className="truncate text-foreground max-w-[180px]" title={description}>
                                        {truncatedDesc}
                                      </div>
                                      {item.sku && (
                                        <div className="text-[10px] text-muted-foreground font-mono">
                                          SKU: {item.sku}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-right shrink-0 ml-2">
                                      {item.quantity != null && (
                                        <span className="text-muted-foreground">x{item.quantity}</span>
                                      )}
                                      {unitPrice != null && (
                                        <span className="text-muted-foreground">@${Number(unitPrice).toFixed(2)}</span>
                                      )}
                                      {total != null && (
                                        <span className="font-medium">${Number(total).toFixed(2)}</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Invoice Preview Dialog */}
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
          <div className="border rounded-md overflow-hidden bg-muted/20 h-[70vh]">
            {pdfBlobUrl && (
              <iframe
                src={`${pdfBlobUrl}#toolbar=0`}
                className="w-full h-full"
                title={selectedInvoice?.fileName}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientInvoicesPanel;
