import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, FileText, Loader2, Search, ChevronDown, ChevronRight, Sparkles, Check, ChevronsUpDown } from "lucide-react";
import { format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
// @ts-ignore
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/build/pdf.mjs";

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
  invoice_number?: string | null;
  invoice_date?: string | null;
  vendor?: string | null;
  line_items?: LineItem[] | null;
  analysis_status?: string | null;
  profiles?: {
    email: string;
    full_name: string | null;
    company_name: string | null;
  };
}

const AdminInvoices = () => {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [companyPopoverOpen, setCompanyPopoverOpen] = useState(false);
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set());
  const [analyzingInvoice, setAnalyzingInvoice] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("invoice_date", { ascending: false, nullsFirst: false })
        .order("upload_date", { ascending: false });

      if (error) throw error;

      // Fetch user profiles separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(inv => inv.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email, full_name, company_name")
          .in("id", userIds);

        const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        const invoicesWithProfiles = data.map(invoice => ({
          ...invoice,
          line_items: (invoice.line_items as unknown) as LineItem[] | null,
          profiles: profilesMap.get(invoice.user_id)
        })) as Invoice[];

        setInvoices(invoicesWithProfiles);
      } else {
        setInvoices([]);
      }
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const handleAnalyze = async (invoice: Invoice) => {
    try {
      setAnalyzingInvoice(invoice.id);

      // Download the file
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("invoices")
        .download(invoice.file_path);

      if (downloadError) throw downloadError;

      // Extract text from PDF using pdfjs-dist for accurate parsing
      GlobalWorkerOptions.workerPort = new pdfjsWorker();
      const arrayBuffer = await fileData.arrayBuffer();
      const pdf = await getDocument({ data: arrayBuffer }).promise;
      let extractedText = "";
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        const pageText = (content.items as any[])
          .map((it: any) => (typeof it.str === "string" ? it.str : (it.text ?? "")))
          .join(" ");
        extractedText += "\n" + pageText;
        if (extractedText.length > 20000) break; // cap size
      }

      // Call analysis function
      const { data, error } = await supabase.functions.invoke("analyze-invoice", {
        body: {
          invoiceId: invoice.id,
          fileContent: extractedText.substring(0, 20000),
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Invoice analyzed successfully",
      });

      fetchInvoices();
    } catch (error) {
      console.error("Error analyzing invoice:", error);
      toast({
        title: "Error",
        description: "Failed to analyze invoice",
        variant: "destructive",
      });
    } finally {
      setAnalyzingInvoice(null);
    }
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

  const uniqueCompanies = Array.from(
    new Set(
      invoices
        .map((inv) => inv.profiles?.company_name ?? inv.profiles?.full_name ?? inv.profiles?.email ?? "Not Set")
        .filter(Boolean)
    )
  ).sort();

  const filteredInvoices = invoices.filter((invoice) => {
    const searchLower = searchTerm.toLowerCase();
    
    // Company filter
    const companyName = invoice.profiles?.company_name ?? invoice.profiles?.full_name ?? invoice.profiles?.email ?? "Not Set";
    const matchesCompany = selectedCompany === "all" || companyName === selectedCompany;

    // Search in basic fields
    const matchesBasic =
      invoice.file_name.toLowerCase().includes(searchLower) ||
      invoice.profiles?.email.toLowerCase().includes(searchLower) ||
      invoice.profiles?.full_name?.toLowerCase().includes(searchLower) ||
      invoice.profiles?.company_name?.toLowerCase().includes(searchLower) ||
      invoice.invoice_number?.toLowerCase().includes(searchLower) ||
      invoice.vendor?.toLowerCase().includes(searchLower);

    // Search in line items descriptions
    const matchesLineItems = invoice.line_items?.some((item) =>
      item.description.toLowerCase().includes(searchLower)
    );

    const matchesSearch = !searchTerm || matchesBasic || matchesLineItems;

    return matchesCompany && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Invoices Database</h1>
        <p className="text-muted-foreground mt-1">
          View and manage invoices from all clients with AI-powered analysis
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Management</CardTitle>
          <CardDescription>
            Total Invoices: {invoices.length} | Filtered: {filteredInvoices.length}
          </CardDescription>
          <div className="flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by company, invoice #, vendor, or item description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Popover open={companyPopoverOpen} onOpenChange={setCompanyPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={companyPopoverOpen}
                  className="w-[250px] justify-between"
                >
                  {selectedCompany === "all" 
                    ? "All Companies" 
                    : selectedCompany}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[250px] p-0">
                <Command>
                  <CommandInput placeholder="Search company..." />
                  <CommandList>
                    <CommandEmpty>No company found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all"
                        onSelect={() => {
                          setSelectedCompany("all");
                          setCompanyPopoverOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedCompany === "all" ? "opacity-100" : "opacity-0"
                          )}
                        />
                        All Companies
                      </CommandItem>
                      {uniqueCompanies.map((company) => (
                        <CommandItem
                          key={company}
                          value={company}
                          onSelect={(currentValue) => {
                            setSelectedCompany(currentValue);
                            setCompanyPopoverOpen(false);
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead>Uploaded Date</TableHead>
                  <TableHead>File Name</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => {
                  const isExpanded = expandedInvoices.has(invoice.id);
                  const hasLineItems = invoice.line_items && invoice.line_items.length > 0;

                  return (
                    <>
                      <TableRow key={invoice.id} className="group">
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
                        <TableCell className="font-medium">
                          {invoice.profiles?.company_name ?? invoice.profiles?.full_name ?? invoice.profiles?.email ?? "Not Set"}
                        </TableCell>
                        <TableCell>
                          {invoice.invoice_date
                            ? (() => {
                                // Parse YYYY-MM-DD without timezone conversion
                                const [y, m, d] = invoice.invoice_date.split('-').map(Number);
                                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                return `${months[m - 1]} ${String(d).padStart(2, '0')}, ${y}`;
                              })()
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {invoice.upload_date
                            ? format(new Date(invoice.upload_date), "MMM dd, yyyy")
                            : "—"}
                        </TableCell>
                        <TableCell 
                          className={`text-sm ${hasLineItems ? 'cursor-pointer hover:text-primary hover:underline' : ''}`}
                          onClick={() => hasLineItems && toggleExpanded(invoice.id)}
                        >
                          {invoice.file_name}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {invoice.analysis_status !== "completed" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAnalyze(invoice)}
                                disabled={analyzingInvoice === invoice.id}
                              >
                                {analyzingInvoice === invoice.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Sparkles className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(invoice)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && hasLineItems && (
                        <TableRow>
                          <TableCell colSpan={6} className="bg-muted/30">
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
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminInvoices;
