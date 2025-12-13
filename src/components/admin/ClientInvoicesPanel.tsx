import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Download, Eye, FileText, Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Invoice {
  id: string;
  file_name: string;
  file_path: string;
  invoice_number: string | null;
  invoice_date: string | null;
  vendor: string | null;
  analysis_status: string | null;
  created_at: string | null;
}

interface ClientInvoicesPanelProps {
  clientName: string;
}

const ClientInvoicesPanel = ({ clientName }: ClientInvoicesPanelProps) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<{ url: string; fileName: string } | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadInvoices();
  }, [clientName]);

  const loadInvoices = async () => {
    if (!clientName || clientName === "all") {
      setInvoices([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // First, get all user IDs that match this company name from profiles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('company_name', clientName);

      if (profileError) throw profileError;

      if (!profiles || profiles.length === 0) {
        setInvoices([]);
        setLoading(false);
        return;
      }

      const userIds = profiles.map(p => p.id);

      // Now fetch invoices for those users
      const { data, error } = await supabase
        .from('invoices')
        .select('id, file_name, file_path, invoice_number, invoice_date, vendor, analysis_status, created_at')
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

  const filteredInvoices = invoices.filter(invoice => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      invoice.file_name.toLowerCase().includes(searchLower) ||
      (invoice.invoice_number?.toLowerCase().includes(searchLower)) ||
      (invoice.vendor?.toLowerCase().includes(searchLower))
    );
  });

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'analyzed':
        return <Badge variant="default">Analyzed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (!clientName || clientName === "all") {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8">
        <FileText className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-center">Select a client to view their invoices</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold mb-4">Client Invoices</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search invoices..."
            className="pl-10"
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
                <TableHead>Invoice #</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-mono text-sm">
                    {invoice.invoice_number || invoice.file_name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {invoice.vendor || '-'}
                  </TableCell>
                  <TableCell>
                    {invoice.invoice_date 
                      ? format(new Date(invoice.invoice_date), 'MMM dd, yyyy')
                      : invoice.created_at 
                        ? format(new Date(invoice.created_at), 'MMM dd, yyyy')
                        : '-'
                    }
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(invoice.analysis_status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleViewInvoice(invoice)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDownloadInvoice(invoice)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
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
