import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, FileText, Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface Invoice {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  upload_date: string;
  user_id: string;
  invoice_date?: string | null;
  invoice_number?: string | null;
  vendor?: string | null;
  analysis_status?: string | null;
}

const Invoices = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const analyzeTriggered = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      fetchInvoices();
    }
  }, [user]);

  // Realtime updates for invoice analysis
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("invoices-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "invoices", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setInvoices((prev) => prev.map((i) => (i.id === (payload.new as any).id ? { ...i, ...(payload.new as any) } : i)));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Auto-analyze PDFs missing dates
  useEffect(() => {
    if (!user || invoices.length === 0) return;
    const candidates = invoices.filter((i) => i.file_type === "application/pdf" && !i.invoice_date);
    candidates.forEach((inv, idx) => {
      if (!analyzingIds.has(inv.id) && !analyzeTriggered.current.has(inv.id)) {
        analyzeTriggered.current.add(inv.id);
        setTimeout(() => analyzeInvoice(inv.id), idx * 500);
      }
    });
  }, [invoices, user, analyzingIds]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("upload_date", { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast({
        title: "Error",
        description: "Failed to load invoices",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = [
        "application/pdf",
        "image/png",
        "image/jpeg",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ];
      
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload PDF, PNG, JPG, or Excel files only",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File too large",
          description: "File size must be less than 10MB",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    try {
      setUploading(true);

      // Upload file to storage
      const filePath = `${user.id}/${Date.now()}_${selectedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("invoices")
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Save metadata to database first
      const { data: invoiceData, error: dbError } = await supabase
        .from("invoices")
        .insert({
          user_id: user.id,
          file_name: selectedFile.name,
          file_path: filePath,
          file_size: selectedFile.size,
          file_type: selectedFile.type,
          analysis_status: "pending",
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Auto-analyze PDF for invoice date extraction
      if (selectedFile.type === "application/pdf") {
        analyzeInvoice(invoiceData.id);
      }

      toast({
        title: "Success",
        description: "Invoice uploaded and analyzed successfully",
      });

      setUploadDialogOpen(false);
      setSelectedFile(null);
      fetchInvoices();
    } catch (error) {
      console.error("Error uploading invoice:", error);
      toast({
        title: "Error",
        description: "Failed to upload invoice",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (invoice: Invoice) => {
    try {
      const { data, error } = await supabase.storage
        .from("invoices")
        .download(invoice.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = invoice.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading invoice:", error);
      toast({
        title: "Error",
        description: "Failed to download invoice",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (invoice: Invoice) => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("invoices")
        .remove([invoice.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("invoices")
        .delete()
        .eq("id", invoice.id);

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Invoice deleted successfully",
      });

      fetchInvoices();
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast({
        title: "Error",
        description: "Failed to delete invoice",
        variant: "destructive",
      });
    }
  };

  const analyzeInvoice = async (invoiceId: string) => {
    setAnalyzingIds((prev) => new Set(prev).add(invoiceId));
    try {
      const { error } = await supabase.functions.invoke("analyze-invoice", {
        body: { invoiceId },
      });
      if (error) {
        console.error("Analyze invoice error:", error);
      }
      // Refresh after a brief delay to see updated results
      setTimeout(() => fetchInvoices(), 3000);
    } catch (e) {
      console.error("Analyze invoice failed:", e);
    } finally {
      setAnalyzingIds((prev) => {
        const next = new Set(prev);
        next.delete(invoiceId);
        return next;
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Invoices</h1>
          <p className="text-muted-foreground mt-1">
            Manage and upload your invoices
          </p>
        </div>
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Upload Invoice
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Invoice</DialogTitle>
              <DialogDescription>
                Upload a PDF, PNG, JPG, or Excel file (max 10MB)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invoice-file">Select File</Label>
                <Input
                  id="invoice-file"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.xls,.xlsx"
                  onChange={handleFileSelect}
                  disabled={uploading}
                />
              </div>
              {selectedFile && (
                <div className="text-sm text-muted-foreground">
                  Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setUploadDialogOpen(false)}
                  disabled={uploading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading}
                >
                  {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Upload
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Invoices</CardTitle>
          <CardDescription>
            Total Invoices Uploaded: {invoices.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No invoices uploaded yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice Name</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead>Date Uploaded</TableHead>
                  <TableHead>File Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.file_name}</TableCell>
                    <TableCell>
                      {invoice.invoice_date ? (
                        (() => {
                          const [y, m, d] = invoice.invoice_date.split('-').map(Number);
                          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                          return `${months[m - 1]} ${String(d).padStart(2, '0')}, ${y}`;
                        })()
                      ) : analyzingIds.has(invoice.id) ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Reading...
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(invoice.upload_date), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>
                      {invoice.file_type.split("/")[1]?.toUpperCase()}
                    </TableCell>
                    <TableCell>{formatFileSize(invoice.file_size)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(invoice)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(invoice)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Invoices;
