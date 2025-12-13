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
import { Upload, Download, FileText, Loader2, Trash2, ChevronDown, ChevronRight, Search, Plus, RefreshCw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";

// Render first page of PDF to PNG data URL for OCR on backend
const renderPdfPreview = async (file: File): Promise<string | null> => {
  try {
    const pdfjsLib: any = await import('pdfjs-dist');
    if (pdfjsLib?.GlobalWorkerOptions) {
      // Use CDN worker to avoid bundler issues
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs';
    }
    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width as number;
    canvas.height = viewport.height as number;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    await page.render({ canvasContext: ctx, viewport }).promise;
    return canvas.toDataURL('image/png');
  } catch (e) {
    console.error('PDF preview render failed:', e);
    return null;
  }
};

interface LineItem {
  description: string;
  quantity?: string;
  unit_price?: string;
  total?: string;
}

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
  line_items?: LineItem[] | null;
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
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const analyzeTriggered = useRef<Set<string>>(new Set());
  
  // Supplier dialog state
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [newSupplierEmail, setNewSupplierEmail] = useState("");
  const [newSupplierLabel, setNewSupplierLabel] = useState("");
  const [addingSupplier, setAddingSupplier] = useState(false);
  const [resyncing, setResyncing] = useState(false);

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

  // Auto-analyze PDFs missing or suspicious dates
  useEffect(() => {
    if (!user || invoices.length === 0) return;

    const isSuspicious = (inv: Invoice) => {
      if (!inv.invoice_date) return false;
      const [y, m, d] = inv.invoice_date.split('-').map(Number);
      const invDate = new Date(y, (m || 1) - 1, d || 1);
      const up = new Date(inv.upload_date);
      const diffDays = Math.abs(invDate.getTime() - up.getTime()) / (1000 * 60 * 60 * 24);
      return invDate.getFullYear() < 2000 || diffDays > 365 * 3;
    };

    const candidates = invoices.filter(
      (i) =>
        i.file_type === "application/pdf" &&
        !i.invoice_date &&
        (i.analysis_status === "pending" || i.analysis_status === "needs_review" || !i.analysis_status)
    );

    candidates.forEach((inv, idx) => {
      if (!analyzeTriggered.current.has(inv.id) && !analyzingIds.has(inv.id)) {
        analyzeTriggered.current.add(inv.id);
        setTimeout(() => analyzeInvoice(inv.id), idx * 400);
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
      
      const invoicesWithTypedLineItems = data?.map(invoice => ({
        ...invoice,
        line_items: (invoice.line_items as unknown) as LineItem[] | null
      })) as Invoice[] || [];
      
      setInvoices(invoicesWithTypedLineItems);
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

      // Auto-analyze PDF for invoice date extraction (send first-page preview for OCR)
      if (selectedFile.type === "application/pdf") {
        const preview = await renderPdfPreview(selectedFile);
        analyzeInvoice(invoiceData.id, preview ?? undefined);
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

  const analyzeInvoice = async (invoiceId: string, imageDataUrl?: string) => {
    setAnalyzingIds((prev) => new Set(prev).add(invoiceId));
    try {
      const { error } = await supabase.functions.invoke("analyze-invoice", {
        body: imageDataUrl ? { invoiceId, imageDataUrl } : { invoiceId },
      });
      if (error) {
        console.error("Analyze invoice error:", error);
      }

      // Poll until the backend sets invoice_date or finalizes analysis_status
      const maxMs = 45000; // 45s max wait
      const intervalMs = 1500; // 1.5s between polls
      const start = Date.now();
      let settled = false;

      while (Date.now() - start < maxMs) {
        const { data } = await supabase
          .from("invoices")
          .select("id, invoice_date, analysis_status")
          .eq("id", invoiceId)
          .single();

        if (data?.invoice_date || data?.analysis_status === "completed" || data?.analysis_status === "needs_review") {
          // Update local state immediately
          setInvoices((prev) => prev.map((i) => (i.id === invoiceId ? { ...i, ...(data as any) } : i)));
          settled = true;
          break;
        }
        await new Promise((r) => setTimeout(r, intervalMs));
      }

      if (!settled) {
        // Fallback refresh if we didn't observe a settled state in time
        fetchInvoices();
      }
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

  const toggleExpanded = (invoiceId: string) => {
    setExpandedInvoices((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(invoiceId)) {
        newSet.delete(invoiceId);
      } else {
        newSet.add(invoiceId);
      }
      return newSet;
    });
  };

  const filteredInvoices = invoices.filter((invoice) => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    
    // Search in basic fields
    const matchesBasic =
      invoice.file_name.toLowerCase().includes(searchLower) ||
      invoice.invoice_number?.toLowerCase().includes(searchLower) ||
      invoice.vendor?.toLowerCase().includes(searchLower);

    // Search in line items descriptions
    const matchesLineItems = invoice.line_items?.some((item) =>
      item.description.toLowerCase().includes(searchLower)
    );

    return matchesBasic || matchesLineItems;
  });

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredInvoices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredInvoices.map((i) => i.id)));
    }
  };

  const toggleSelect = (invoiceId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(invoiceId)) {
        next.delete(invoiceId);
      } else {
        next.add(invoiceId);
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} invoice(s)?`)) return;

    setBulkDeleting(true);
    try {
      const toDelete = invoices.filter((i) => selectedIds.has(i.id));
      
      // Delete from storage
      const filePaths = toDelete.map((i) => i.file_path);
      const { error: storageError } = await supabase.storage
        .from("invoices")
        .remove(filePaths);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("invoices")
        .delete()
        .in("id", Array.from(selectedIds));

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: `${selectedIds.size} invoice(s) deleted successfully`,
      });

      setSelectedIds(new Set());
      fetchInvoices();
    } catch (error) {
      console.error("Error bulk deleting invoices:", error);
      toast({
        title: "Error",
        description: "Failed to delete invoices",
        variant: "destructive",
      });
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleAddSupplierEmail = async () => {
    if (!newSupplierEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please enter a supplier email address",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newSupplierEmail.trim())) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setAddingSupplier(true);
    try {
      const { error } = await supabase
        .from("allowed_supplier_emails")
        .insert({
          user_id: user?.id,
          email: newSupplierEmail.trim(),
          label: newSupplierLabel.trim() || null,
        });

      if (error) throw error;

      toast({
        title: "Supplier added",
        description: "Supplier email added. Starting invoice sync...",
      });

      setNewSupplierEmail("");
      setNewSupplierLabel("");
      setSupplierDialogOpen(false);

      // Trigger Gmail sync after adding supplier email
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.functions.invoke('sync-gmail-invoices', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        fetchInvoices();
      }
    } catch (error: any) {
      console.error("Error adding supplier email:", error);
      toast({
        title: "Error",
        description: error.message?.includes("duplicate")
          ? "This email has already been added"
          : "Failed to add supplier email",
        variant: "destructive",
      });
    } finally {
      setAddingSupplier(false);
    }
  };

  const handleResyncInvoices = async () => {
    if (!user) return;

    setResyncing(true);
    try {
      // Clear processed message history to allow re-fetching
      const { error: deleteError } = await supabase
        .from("processed_gmail_messages")
        .delete()
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;

      // Trigger Gmail sync
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { error: syncError } = await supabase.functions.invoke('sync-gmail-invoices', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (syncError) throw syncError;
      }

      toast({
        title: "Re-sync complete",
        description: "All invoices from supplier emails have been re-synced",
      });

      fetchInvoices();
    } catch (error) {
      console.error("Error re-syncing invoices:", error);
      toast({
        title: "Error",
        description: "Failed to re-sync invoices",
        variant: "destructive",
      });
    } finally {
      setResyncing(false);
    }
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
        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={resyncing}>
                {resyncing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Re-sync Invoices
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Re-sync All Invoices?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will re-download all invoices from your supplier emails (last 365 days). 
                  Existing invoices will not be duplicated.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleResyncInvoices}>
                  Re-sync
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add Supplier
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Supplier Email</DialogTitle>
                <DialogDescription>
                  Add a supplier email address to automatically sync invoices from
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier-email">Supplier Email</Label>
                  <Input
                    id="supplier-email"
                    type="email"
                    placeholder="supplier@example.com"
                    value={newSupplierEmail}
                    onChange={(e) => setNewSupplierEmail(e.target.value)}
                    disabled={addingSupplier}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier-label">Label (Optional)</Label>
                  <Input
                    id="supplier-label"
                    placeholder="e.g., Main Supplier"
                    value={newSupplierLabel}
                    onChange={(e) => setNewSupplierLabel(e.target.value)}
                    disabled={addingSupplier}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setSupplierDialogOpen(false)}
                    disabled={addingSupplier}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleAddSupplierEmail} disabled={addingSupplier}>
                    {addingSupplier && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Supplier
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Invoices</CardTitle>
          <CardDescription>
            Total Invoices: {invoices.length} | Filtered: {filteredInvoices.length}
          </CardDescription>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by invoice #, vendor, or item description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>
                {searchTerm
                  ? "No invoices found matching your search"
                  : "No invoices uploaded yet"}
              </p>
            </div>
          ) : (
            <>
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-4 mb-4">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={bulkDeleting}
                  >
                    {bulkDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete {selectedIds.size} selected
                  </Button>
                </div>
              )}
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={filteredInvoices.length > 0 && selectedIds.size === filteredInvoices.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Invoice Name</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead>Date Uploaded</TableHead>
                  <TableHead>File Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => {
                  const isExpanded = expandedInvoices.has(invoice.id);
                  const hasLineItems = invoice.line_items && invoice.line_items.length > 0;
                  const isSelected = selectedIds.has(invoice.id);

                  return (
                    <>
                      <TableRow key={invoice.id} className={isSelected ? "bg-muted/50" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(invoice.id)}
                          />
                        </TableCell>
                        <TableCell>
                          {hasLineItems && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpanded(invoice.id)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </TableCell>
                        <TableCell 
                          className={`font-medium ${hasLineItems ? 'cursor-pointer hover:text-primary hover:underline' : ''}`}
                          onClick={() => hasLineItems && toggleExpanded(invoice.id)}
                        >
                          {invoice.file_name}
                        </TableCell>
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
                      {isExpanded && hasLineItems && (
                        <TableRow>
                          <TableCell colSpan={8} className="bg-muted/30">
                            <div className="p-4 space-y-2">
                              <h4 className="font-semibold text-sm mb-3">
                                Line Items ({invoice.line_items?.length})
                              </h4>
                              <div className="space-y-2">
                                {invoice.line_items?.map((item, idx) => (
                                  <div
                                    key={idx}
                                    className="flex gap-4 text-sm p-2 rounded bg-background"
                                  >
                                    <div className="flex-1">
                                      <span className="font-medium">
                                        {item.description}
                                      </span>
                                    </div>
                                    {item.quantity && (
                                      <div className="text-muted-foreground">
                                        Qty: {item.quantity}
                                      </div>
                                    )}
                                    {item.unit_price && (
                                      <div className="text-muted-foreground">
                                        @ {item.unit_price}
                                      </div>
                                    )}
                                    {item.total && (
                                      <div className="font-medium">
                                        {item.total}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Invoices;
