import { useState, Fragment, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Download, Plus, CalendarIcon, Upload, FileText, ChevronRight, ChevronDown, Eye, Trash2, Check, ChevronsUpDown, Clock, XCircle, CheckCircle2, DollarSign, Send, Loader2, MoreVertical, ExternalLink, Mail, FolderOpen, ArrowLeft } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { isAfter, isBefore, subDays, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, format, parse } from "date-fns";
import { allClaims } from "@/data/claimsData";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useSearch } from "@/contexts/SearchContext";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import ClientInvoicesPanel from "@/components/admin/ClientInvoicesPanel";
import ClaimsTableContent from "@/components/admin/ClaimsTableContent";

interface MatchedInvoice {
  id: string;
  invoice_number: string | null;
  invoice_date: string | null;
  vendor: string | null;
  file_name: string;
  file_path: string;
  matching_items: Array<{ description: string; similarity: number }>;
}

// Removed hardcoded shipmentLineItems constant

const AdminClaims = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [claims, setClaims] = useState<any[]>([]);
  
  // Added state for discrepancies
  const [shipmentLineItems, setShipmentLineItems] = useState<Record<string, Array<{ sku: string; name: string; qtyExpected: number; qtyReceived: number; discrepancy: number; amount: string }>>>({});
  
  const [matchedInvoices, setMatchedInvoices] = useState<Record<string, MatchedInvoice[]>>({});
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [clientFilter, setClientFilter] = useState("all");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientEmail, setClientEmail] = useState<string | null>(null);
  const [clientComboOpen, setClientComboOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState("all");
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>();
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>();
  const [uploadingClaimId, setUploadingClaimId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedInvoice, setSelectedInvoice] = useState<{ url: string; fileName: string } | null>(null);
  const [sentMessages, setSentMessages] = useState<Record<string, boolean>>({});
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [userCompany, setUserCompany] = useState<string | null>(null);
  const [newClaimDialogOpen, setNewClaimDialogOpen] = useState(false);
  const [sendMessageDialogOpen, setSendMessageDialogOpen] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<typeof allClaims[0] | null>(null);
  const [messageForm, setMessageForm] = useState({
    description: "",
    documentType: "invoice" as "invoice" | "proof_of_delivery",
  });
  const [newClaimForm, setNewClaimForm] = useState({
    asin: "",
    sku: "",
    itemName: "",
    shipmentId: "",
    type: "FBA",
    totalQtyExpected: "",
    totalQtyReceived: "",
  });
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
          setClientFilter(data.company_name);
        }
      }
    };

    fetchUserCompany();
  }, [user, isCustomer]);

  // Check for client filter from URL params
  useEffect(() => {
    const resolveClientFilter = async () => {
      const clientIdParam = searchParams.get('clientId');
      const clientParam = searchParams.get('client');

      if (clientIdParam && !isCustomer) {
        setSelectedClientId(clientIdParam);
        if (clientIdParam.startsWith('claims-')) {
          const companyName = clientIdParam.replace('claims-', '');
          setClientFilter(companyName);
        } else {
          const { data: profile } = await supabase
            .from('profiles')
            .select('company_name, email')
            .eq('id', clientIdParam)
            .maybeSingle();

          if (profile) {
             setClientFilter(profile.company_name || 'Unknown Company');
             if (profile.email) setClientEmail(profile.email);
          }
        }
      } 
      else if (clientParam && !isCustomer) {
        if (clientParam.includes('@')) {
          setClientEmail(clientParam);
          const { data: profile } = await supabase
            .from('profiles')
            .select('company_name')
            .eq('email', clientParam)
            .maybeSingle();
          
          if (profile?.company_name) {
            setClientFilter(profile.company_name);
          } else {
            setClientFilter(clientParam);
          }
        } else {
          setClientFilter(clientParam);
          setClientEmail(null);
        }
      }
    };
    
    resolveClientFilter();
  }, [searchParams, isCustomer]);

  // Load initial data
  useEffect(() => {
    loadClaims();
    loadInvoices();
    loadSentNotifications();
    fetchShipmentDiscrepancies();
  }, []);

  // New Effect: Match invoices whenever shipment discrepancies are loaded
  useEffect(() => {
    if (Object.keys(shipmentLineItems).length > 0) {
      loadAndMatchInvoices();
    }
  }, [shipmentLineItems]);

  // --- NEW FUNCTION: Fetch Real Discrepancies ---
  const fetchShipmentDiscrepancies = async () => {
    try {
      const { data, error } = await supabase
        .from('shipment_discrepancies')
        .select('*')
        // You can uncomment this if you only want to see 'open' discrepancies
        // .eq('status', 'open') 
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        // Group by shipment_id
        const grouped = data.reduce((acc, item) => {
          if (!acc[item.shipment_id]) {
            acc[item.shipment_id] = [];
          }
          acc[item.shipment_id].push({
            sku: item.sku,
            name: item.product_name || 'Unknown Item',
            qtyExpected: item.expected_quantity,
            qtyReceived: item.actual_quantity,
            discrepancy: item.difference,
            amount: '$0.00' // Placeholder since discrepancy table doesn't have price yet
          });
          return acc;
        }, {} as Record<string, Array<{ sku: string; name: string; qtyExpected: number; qtyReceived: number; discrepancy: number; amount: string }>>);

        setShipmentLineItems(grouped);
      }
    } catch (error: any) {
      console.error('Error fetching shipment discrepancies:', error);
      toast({
        title: "Error",
        description: "Failed to load shipment discrepancies.",
        variant: "destructive"
      });
    }
  };

  const loadClaims = async () => {
    try {
      const { data, error } = await supabase
        .from('claims')
        .select('*')
        .order('last_updated', { ascending: false });

      if (error) throw error;

      if (data) {
        const transformedClaims = data.map(claim => ({
          id: claim.claim_id,
          userId: claim.user_id,
          caseId: claim.case_id || '',
          reimbursementId: claim.reimbursement_id || '-',
          asin: claim.asin || '',
          sku: claim.sku,
          itemName: claim.item_name,
          shipmentId: claim.shipment_id,
          type: claim.shipment_type,
          amount: `$${claim.amount.toFixed(2)}`,
          actualRecovered: `$${claim.actual_recovered.toFixed(2)}`,
          status: claim.status,
          date: format(new Date(claim.claim_date), 'yyyy-MM-dd'),
          lastUpdated: format(new Date(claim.last_updated), 'yyyy-MM-dd'),
          feedback: claim.feedback || '',
          totalQtyExpected: claim.total_qty_expected,
          totalQtyReceived: claim.total_qty_received,
          discrepancy: claim.discrepancy,
          companyName: claim.company_name || '',
          invoices: [] as Array<{ id: string; url: string; date: string | null; fileName: string }>
        }));
        
        setClaims(transformedClaims);
      }
    } catch (error: any) {
      console.error('Error loading claims:', error);
      toast({
        title: "Error",
        description: "Failed to load claims from database",
        variant: "destructive"
      });
    }
  };

  const calculateSimilarity = (str1: string, str2: string): number => {
    const normalize = (s: string) => s
      .toLowerCase()
      .replace(/[()]/g, ' ')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const tokenize = (s: string) => normalize(s)
      .split(' ')
      .filter((w) => w.length > 2 && !/^\d+$/.test(w));

    const s1 = normalize(str1);
    const s2 = normalize(str2);

    if (!s1 || !s2) return 0;
    if (s1 === s2) return 100;

    const t1 = tokenize(s1);
    const t2 = tokenize(s2);
    if (t1.length === 0 || t2.length === 0) return 0;

    const set2 = new Set(t2);
    const intersectionCount = t1.filter((w) => set2.has(w)).length;
    const coverage = (intersectionCount / Math.min(t1.length, t2.length)) * 100;
    const unionCount = new Set([...t1, ...t2]).size;
    const jaccard = (intersectionCount / unionCount) * 100;

    const score = 0.75 * coverage + 0.25 * jaccard;
    return Math.round(score);
  };

  const loadAndMatchInvoices = async () => {
    try {
      const { data: invoicesData, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, invoice_date, vendor, file_name, file_path, line_items')
        .not('line_items', 'is', null)
        .order('invoice_date', { ascending: false });

      if (error) { throw error; }

      if (invoicesData) {
        const matched: Record<string, MatchedInvoice[]> = {};
        
        // Use the state variable shipmentLineItems here instead of the hardcoded constant
        Object.entries(shipmentLineItems).forEach(([shipmentId, lineItems]) => {
          const claimMatches: MatchedInvoice[] = [];
          invoicesData.forEach((invoice) => {
            const invoiceLineItems = invoice.line_items as Array<{ description?: string; item_description?: string }> || [];
            const matchingItems: Array<{ description: string; similarity: number }> = [];
            
            lineItems.forEach((claimItem) => {
              invoiceLineItems.forEach((invItem) => {
                const invDescription = invItem.description || invItem.item_description || '';
                if (invDescription) {
                  const similarity = calculateSimilarity(claimItem.name, invDescription);
                  if (similarity >= 80) {
                    matchingItems.push({ description: invDescription, similarity });
                  }
                }
              });
            });

            if (matchingItems.length > 0) {
              claimMatches.push({
                id: invoice.id,
                invoice_number: invoice.invoice_number,
                invoice_date: invoice.invoice_date,
                vendor: invoice.vendor,
                file_name: invoice.file_name,
                file_path: invoice.file_path,
                matching_items: matchingItems
              });
            }
          });
          matched[shipmentId] = claimMatches
            .sort((a, b) => {
              if (!a.invoice_date) return 1;
              if (!b.invoice_date) return -1;
              return new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime();
            })
            .slice(0, 3);
        });
        setMatchedInvoices(matched);
      }
    } catch (error: any) {
      console.error('Error loading and matching invoices:', error);
    }
  };

  const loadSentNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('missing_invoice_notifications')
        .select('claim_ids, status, shipment_id')
        .not('claim_ids', 'is', null);

      if (error) throw error;

      if (data) {
        const sentClaimIds: Record<string, boolean> = {};
        data.forEach((notification) => {
          if (notification.claim_ids && Array.isArray(notification.claim_ids)) {
            notification.claim_ids.forEach((claimId: string) => {
              sentClaimIds[claimId] = true;
            });
          }
        });
        setSentMessages(sentClaimIds);
      }
    } catch (error: any) {
      console.error('Error loading sent notifications:', error);
    }
  };
  
  const loadInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('claim_invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const invoicesByClaimId: Record<string, Array<{ id: string; url: string; date: string | null; fileName: string }>> = {};
        data.forEach((inv) => {
          if (!invoicesByClaimId[inv.claim_id]) {
            invoicesByClaimId[inv.claim_id] = [];
          }
          invoicesByClaimId[inv.claim_id].push({
            id: inv.id,
            url: inv.file_path,
            date: inv.invoice_date,
            fileName: inv.file_name,
          });
        });

        setClaims(prevClaims =>
          prevClaims.map(claim => ({
            ...claim,
            invoices: invoicesByClaimId[claim.id] || [],
          }))
        );
      }
    } catch (error: any) {
      console.error('Error loading invoices:', error);
    }
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      const maxPages = Math.min(pdf.numPages, 3);
      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + ' ';
      }
      return fullText;
    } catch (error) {
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
      if (!text) { return null; }
      const normalized = text.replace(/\s+/g, ' ').trim();
      const tryParse = (dateStr: string): string | null => {
        const cleaned = dateStr.replace(/\s+/g, ' ').trim().replace(/,/, '');
        const shortYearMatch = cleaned.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2})$/);
        if (shortYearMatch) {
          const month = parseInt(shortYearMatch[1], 10);
          const day = parseInt(shortYearMatch[2], 10);
          const yy = parseInt(shortYearMatch[3], 10);
          const fullYear = yy < 50 ? 2000 + yy : 1900 + yy;
          if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            return `${fullYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          }
        }
        const fullYearMatch = cleaned.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
        if (fullYearMatch) {
          const month = parseInt(fullYearMatch[1], 10);
          const day = parseInt(fullYearMatch[2], 10);
          const year = parseInt(fullYearMatch[3], 10);
          if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year > 1900 && year < 2100) {
            return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          }
        }
        return null;
      };
      const dateLabelPriority = [
        { label: 'invoice date', pattern: /invoice\s+date\s*:?\s*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})/i },
        { label: 'date of invoice', pattern: /date\s+of\s+invoice\s*:?\s*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})/i },
        { label: 'sales order date', pattern: /sales\s+order\s+date\s*:?\s*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})/i },
        { label: 'order date', pattern: /order\s+date\s*:?\s*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})/i },
        { label: 'document date', pattern: /document\s+date\s*:?\s*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})/i },
      ];
      for (const { label, pattern } of dateLabelPriority) {
        const labelMatch = normalized.match(pattern);
        if (labelMatch) {
          const parsed = tryParse(labelMatch[1]);
          if (parsed) { return parsed; }
        }
      }
      const headerText = normalized.substring(0, 1000);
      const allDates = Array.from(headerText.matchAll(/\b(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})\b/g));
      for (const match of allDates) {
        const dateStr = match[1];
        const datePosition = match.index!;
        const contextBefore = headerText.substring(Math.max(0, datePosition - 50), datePosition);
        const contextAfter = headerText.substring(datePosition, Math.min(datePosition + 50, headerText.length));
        const skipKeywords = /\b(due|payment|p\.?o\.|po\s*number|ship.*date|delivery|page\s*:?\s*\d)\b/i;
        const combinedContext = (contextBefore + contextAfter).toLowerCase();
        if (skipKeywords.test(combinedContext)) { continue; }
        const parsed = tryParse(dateStr);
        if (parsed) { return parsed; }
      }
      return null;
    } catch (error) {
      console.error('Error extracting date from invoice:', error);
      return null;
    }
  };

  const handleStatusUpdate = async (claimId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('claims')
        .update({ status: newStatus, last_updated: new Date().toISOString() })
        .eq('claim_id', claimId);
      if (error) throw error;
      setClaims(prevClaims => 
        prevClaims.map(claim => claim.id === claimId ? { ...claim, status: newStatus } : claim)
      );
      toast({
        title: "Success",
        description: newStatus === 'Approved' ? "Claim approved" : `Claim status updated to ${newStatus}`,
      });
    } catch (error: any) {
      console.error('Error updating claim status:', error);
      toast({ title: "Error", description: "Failed to update claim status", variant: "destructive" });
    }
  };

  const handleInvoiceUpload = async (claimId: string, files: FileList) => {
    try {
      setUploadingClaimId(claimId);
      const uploadedInvoices: Array<{ id: string; url: string; date: string | null; fileName: string }> = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const invoiceDate = await extractInvoiceDate(file);
        const fileExt = file.name.split('.').pop();
        const fileName = `${claimId}-${Date.now()}-${i}.${fileExt}`;
        const filePath = `${fileName}`;
        const { error: uploadError } = await supabase.storage.from('claim-invoices')
          .upload(filePath, file, { cacheControl: '3600', upsert: false });
        if (uploadError) throw new Error(`Failed to upload ${file.name}`);
        const placeholderUserId = '00000000-0000-0000-0000-000000000000';
        const { data: invoiceData, error: dbError } = await supabase.from('claim_invoices')
          .insert({
            claim_id: claimId,
            file_path: filePath,
            file_name: file.name,
            invoice_date: invoiceDate,
            uploaded_by: placeholderUserId,
          }).select().single();
        if (dbError) throw new Error(`Failed to save invoice metadata: ${dbError.message}`);
        uploadedInvoices.push({ id: invoiceData.id, url: filePath, date: invoiceDate, fileName: file.name });
      }
      setClaims(prevClaims =>
        prevClaims.map(claim =>
          claim.id === claimId ? { ...claim, invoices: [...claim.invoices, ...uploadedInvoices] } : claim
        )
      );
      toast({ title: "Invoices uploaded", description: `Successfully uploaded.` });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploadingClaimId(null);
    }
  };

  const handleSendMessage = async (claim: typeof allClaims[0]) => {
    setSelectedClaim(claim);
    setSendMessageDialogOpen(true);
    setMessageForm({ description: "", documentType: "invoice" });
  };

  const sendNotification = async () => {
    if (!selectedClaim || !messageForm.description) {
      toast({ title: "Missing Information", description: "Please fill in the description field", variant: "destructive" });
      return;
    }
    setSendingMessage(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('company_name', selectedClaim.companyName)
        .single();
      let clientEmail = profile?.email;
      let clientName = profile?.full_name;
      if (!clientEmail) {
        const { data: customer } = await supabase
          .from('customers')
          .select('email, contact_name')
          .eq('company_name', selectedClaim.companyName)
          .single();
        clientEmail = customer?.email;
        clientName = customer?.contact_name;
      }
      if (!clientEmail) {
        toast({ title: "Client Not Found", description: "Could not find client email", variant: "destructive" });
        setSendingMessage(false);
        return;
      }
      const { error } = await supabase.functions.invoke("send-missing-invoice-notification", {
        body: {
          clientEmail: clientEmail,
          clientName: clientName || selectedClaim.companyName,
          companyName: selectedClaim.companyName,
          shipmentId: selectedClaim.shipmentId,
          description: messageForm.description,
          missingCount: 1,
          claimIds: [selectedClaim.shipmentId],
          documentType: messageForm.documentType,
        },
      });
      if (error) throw error;
      toast({ title: "Notification Sent", description: `Message sent to ${selectedClaim.companyName}` });
      setSentMessages(prev => ({ ...prev, [selectedClaim.shipmentId]: true }));
      setSendMessageDialogOpen(false);
      setMessageForm({ description: "", documentType: "invoice" });
    } catch (error: any) {
      toast({ title: "Failed to Send", description: error.message, variant: "destructive" });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleNewClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const qtyExpected = parseInt(newClaimForm.totalQtyExpected);
      const qtyReceived = parseInt(newClaimForm.totalQtyReceived);
      const discrepancy = qtyExpected - qtyReceived;
      const amount = (discrepancy * 20).toFixed(2);
      const claimId = `CLM-${(claims.length + 1).toString().padStart(3, '0')}`;
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const { error } = await supabase.from('claims').insert({
        claim_id: claimId,
        case_id: `${Date.now()}`,
        reimbursement_id: '-',
        asin: newClaimForm.asin,
        sku: newClaimForm.sku,
        item_name: newClaimForm.itemName,
        shipment_id: newClaimForm.shipmentId,
        shipment_type: newClaimForm.type,
        amount: parseFloat(amount),
        actual_recovered: 0,
        status: 'Pending',
        claim_date: new Date().toISOString().split('T')[0],
        last_updated: new Date().toISOString(),
        feedback: 'Claim filed',
        total_qty_expected: qtyExpected,
        total_qty_received: qtyReceived,
        discrepancy: discrepancy,
        company_name: userCompany || 'ABC Client',
        user_id: currentUser?.id
      }).select().single();
      if (error) throw error;
      const newClaim = {
        id: claimId,
        caseId: `${Date.now()}`,
        reimbursementId: "-",
        asin: newClaimForm.asin,
        sku: newClaimForm.sku,
        itemName: newClaimForm.itemName,
        shipmentId: newClaimForm.shipmentId,
        type: newClaimForm.type,
        amount: `$${amount}`,
        actualRecovered: "$0.00",
        status: "Pending",
        date: new Date().toISOString().split('T')[0],
        lastUpdated: new Date().toISOString().split('T')[0],
        feedback: "Claim filed",
        totalQtyExpected: qtyExpected,
        totalQtyReceived: qtyReceived,
        discrepancy: discrepancy,
        companyName: userCompany || "ABC Client",
        invoices: [],
        userId: currentUser?.id,
      };
      setClaims(prevClaims => [newClaim, ...prevClaims]);
      setNewClaimDialogOpen(false);
      setNewClaimForm({ asin: "", sku: "", itemName: "", shipmentId: "", type: "FBA", totalQtyExpected: "", totalQtyReceived: "" });
      toast({ title: "Claim created", description: `New claim ${claimId} has been created.` });
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to create claim", variant: "destructive" });
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
      case "thisMonth": return date >= startOfMonth(now) && date <= endOfMonth(now);
      case "lastMonth":
        const lastMonth = subMonths(now, 1);
        return date >= startOfMonth(lastMonth) && date <= endOfMonth(lastMonth);
      case "30days": return isAfter(date, subDays(now, 30));
      case "60days": return isAfter(date, subDays(now, 60));
      case "90days": return isAfter(date, subDays(now, 90));
      case "custom":
        if (!customDateFrom && !customDateTo) return true;
        if (customDateFrom && customDateTo) return date >= customDateFrom && date <= customDateTo;
        if (customDateFrom) return date >= customDateFrom;
        if (customDateTo) return date <= customDateTo;
        return true;
      default: return true;
    }
  };

  const uniqueClients = Array.from(new Set(claims.map(claim => claim.companyName))).sort();

  const filteredClaims = claims.filter(claim => {
    const matchesClientFilter = (() => {
      if (selectedClientId) {
        if (selectedClientId.startsWith('claims-')) {
          const legacyName = selectedClientId.replace('claims-', '');
          return claim.companyName === legacyName;
        }
        return claim.userId === selectedClientId;
      }
      return clientFilter === "all" || claim.companyName === clientFilter;
    })();

    const matchesClientSearch = clientSearch === "" || claim.companyName.toLowerCase().includes(clientSearch.toLowerCase());
    const searchLower = localSearchQuery.toLowerCase().trim();
    const containsExactWords = (text: string): boolean => {
      if (!searchLower) return true;
      const textLower = text.toLowerCase();
      const regex = new RegExp(`\\b${searchLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return regex.test(textLower);
    };
    const matchesShipmentSearch = localSearchQuery === "" || containsExactWords(claim.itemName) || containsExactWords(claim.caseId) || containsExactWords(claim.asin) || containsExactWords(claim.sku) || containsExactWords(claim.shipmentId);
    
    // Now using state-based shipmentLineItems
    const lineItems = shipmentLineItems[claim.shipmentId] || [];
    const matchesLineItemSearch = localSearchQuery === "" || lineItems.some(item => containsExactWords(item.name) || containsExactWords(item.sku));
    const matchesSearch = matchesShipmentSearch || matchesLineItemSearch;
    const matchesStatus = statusFilter === "all" || claim.status === statusFilter;
    const matchesDate = filterByDate(claim.date);
    
    return matchesSearch && matchesStatus && matchesDate && matchesClientFilter && matchesClientSearch;
  });

  const totalClaims = filteredClaims.length;
  const submittedClaims = filteredClaims.filter(c => c.status === "Submitted").length;
  const approvedClaims = filteredClaims.filter(c => c.status === "Approved");
  const approvedAmount = approvedClaims.reduce((sum, c) => sum + parseFloat(c.actualRecovered.replace(/[$,]/g, "")), 0);
  const approvedCount = approvedClaims.length;
  const pendingClaims = filteredClaims.filter(c => c.status === "Pending").length;
  const deniedClaims = filteredClaims.filter(c => c.status === "Denied").length;

  const isViewingSpecificClient = (selectedClientId !== null) || (clientFilter && clientFilter !== "all");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {isViewingSpecificClient && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/admin/clients')}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {isViewingSpecificClient ? `Claims - ${clientFilter}` : 'Claims Management'}
            </h1>
            <p className="text-muted-foreground mt-2">
              {isViewingSpecificClient 
                ? `Viewing claims and invoices for ${clientFilter}`
                : 'Monitor and manage all reimbursement claims'
              }
            </p>
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Total Claims" value={totalClaims.toString()} icon={FileText} variant="default" />
        <StatCard title="Total Submitted" value={submittedClaims.toString()} icon={Upload} variant="default" />
        <StatCard title="Approved Amount" value={`$${approvedAmount.toFixed(2)}`} change={`${approvedCount} claims approved`} icon={CheckCircle2} variant="success" />
        <StatCard title="Pending Claims" value={pendingClaims.toString()} icon={Clock} variant="warning" />
        <StatCard title="Denied Claims" value={deniedClaims.toString()} icon={XCircle} variant="error" />
      </div>

      {isViewingSpecificClient ? (
        <ResizablePanelGroup direction="horizontal" className="min-h-[600px] rounded-lg border">
          <ResizablePanel defaultSize={55} minSize={40}>
            <Card className="p-6 h-full border-0 rounded-none overflow-auto">
              <ClaimsTableContent
                claims={claims}
                filteredClaims={filteredClaims}
                expanded={expanded}
                toggleRow={toggleRow}
                sentMessages={sentMessages}
                handleSendMessage={handleSendMessage}
                handleStatusUpdate={handleStatusUpdate}
                matchedInvoices={matchedInvoices}
                shipmentLineItems={shipmentLineItems}
                isCustomer={isCustomer}
                clientFilter={clientFilter}
                setClientFilter={setClientFilter}
                clientComboOpen={clientComboOpen}
                setClientComboOpen={setClientComboOpen}
                uniqueClients={uniqueClients}
                localSearchQuery={localSearchQuery}
                setLocalSearchQuery={setLocalSearchQuery}
                dateFilter={dateFilter}
                setDateFilter={setDateFilter}
                customDateFrom={customDateFrom}
                setCustomDateFrom={setCustomDateFrom}
                customDateTo={customDateTo}
                setCustomDateTo={setCustomDateTo}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                hideClientFilter={true}
              />
            </Card>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={45} minSize={30}>
            <div className="h-full border-l bg-card">
              <ClientInvoicesPanel clientEmail={clientEmail || searchParams.get('client') || ""} />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <Card className="p-6">
          <ClaimsTableContent
            claims={claims}
            filteredClaims={filteredClaims}
            expanded={expanded}
            toggleRow={toggleRow}
            sentMessages={sentMessages}
            handleSendMessage={handleSendMessage}
            handleStatusUpdate={handleStatusUpdate}
            matchedInvoices={matchedInvoices}
            shipmentLineItems={shipmentLineItems}
            isCustomer={isCustomer}
            clientFilter={clientFilter}
            setClientFilter={setClientFilter}
            clientComboOpen={clientComboOpen}
            setClientComboOpen={setClientComboOpen}
            uniqueClients={uniqueClients}
            localSearchQuery={localSearchQuery}
            setLocalSearchQuery={setLocalSearchQuery}
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
            customDateFrom={customDateFrom}
            setCustomDateFrom={setCustomDateFrom}
            customDateTo={customDateTo}
            setCustomDateTo={setCustomDateTo}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
          />
        </Card>
      )}

      {/* Invoice Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={(open) => {
        if (!open) { setSelectedInvoice(null); if (pdfBlobUrl) { URL.revokeObjectURL(pdfBlobUrl); setPdfBlobUrl(null); } }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader><DialogTitle>{selectedInvoice?.fileName}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex gap-2 justify-end">
              <Button variant="outline" className="gap-2" onClick={async () => {
                if (!selectedInvoice) return;
                try {
                  const { data, error } = await supabase.storage.from('claim-invoices').download(selectedInvoice.url);
                  if (error) throw error;
                  if (data) {
                    const url = URL.createObjectURL(data);
                    const a = document.createElement('a'); a.href = url; a.download = selectedInvoice.fileName;
                    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
                    toast({ title: "Download started", description: "Your invoice is being downloaded." });
                  }
                } catch (error: any) { toast({ title: "Download failed", description: error.message, variant: "destructive" }); }
              }}>
                <Download className="h-4 w-4" /> Download
              </Button>
            </div>
            <div className="border rounded-md overflow-hidden bg-muted/20 h-[70vh]">
              {pdfBlobUrl && <iframe src={`${pdfBlobUrl}#toolbar=0`} className="w-full h-full" title={selectedInvoice?.fileName} />}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Send Message Dialog */}
      <Dialog open={sendMessageDialogOpen} onOpenChange={setSendMessageDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Missing Document Notification</DialogTitle>
            <DialogDescription>Notify {selectedClaim?.companyName} about missing documents</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Document Type *</Label>
              <div className="flex gap-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="radio" value="invoice" checked={messageForm.documentType === 'invoice'} onChange={(e) => setMessageForm({ ...messageForm, documentType: e.target.value as 'invoice' })} className="w-4 h-4 text-primary" />
                  <span className="text-sm">Invoice</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="radio" value="proof_of_delivery" checked={messageForm.documentType === 'proof_of_delivery'} onChange={(e) => setMessageForm({ ...messageForm, documentType: e.target.value as 'proof_of_delivery' })} className="w-4 h-4 text-primary" />
                  <span className="text-sm">Proof of Delivery</span>
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="messageDescription">Description *</Label>
              <Textarea id="messageDescription" placeholder="Description..." value={messageForm.description} onChange={(e) => setMessageForm({ ...messageForm, description: e.target.value })} rows={4} required />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setSendMessageDialogOpen(false)} disabled={sendingMessage}>Cancel</Button>
            <Button onClick={sendNotification} disabled={sendingMessage}>{sendingMessage ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : <><Send className="mr-2 h-4 w-4" />Send Notification</>}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Claim Dialog */}
      <Dialog open={newClaimDialogOpen} onOpenChange={setNewClaimDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Create New Claim</DialogTitle></DialogHeader>
          <form onSubmit={handleNewClaimSubmit} className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="asin">ASIN *</Label><Input id="asin" value={newClaimForm.asin} onChange={(e) => setNewClaimForm({ ...newClaimForm, asin: e.target.value })} required /></div>
              <div className="space-y-2"><Label htmlFor="sku">SKU *</Label><Input id="sku" value={newClaimForm.sku} onChange={(e) => setNewClaimForm({ ...newClaimForm, sku: e.target.value })} required /></div>
            </div>
            <div className="space-y-2"><Label htmlFor="itemName">Item Name *</Label><Input id="itemName" value={newClaimForm.itemName} onChange={(e) => setNewClaimForm({ ...newClaimForm, itemName: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="shipmentId">Shipment ID *</Label><Input id="shipmentId" value={newClaimForm.shipmentId} onChange={(e) => setNewClaimForm({ ...newClaimForm, shipmentId: e.target.value })} required /></div>
              <div className="space-y-2"><Label htmlFor="type">Type *</Label>
                <Select value={newClaimForm.type} onValueChange={(value) => setNewClaimForm({ ...newClaimForm, type: value })}>
                  <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="FBA">FBA</SelectItem><SelectItem value="AWD">AWD</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="qtyExpected">Quantity Expected *</Label><Input id="qtyExpected" type="number" min="1" value={newClaimForm.totalQtyExpected} onChange={(e) => setNewClaimForm({ ...newClaimForm, totalQtyExpected: e.target.value })} required /></div>
              <div className="space-y-2"><Label htmlFor="qtyReceived">Quantity Received *</Label><Input id="qtyReceived" type="number" min="0" value={newClaimForm.totalQtyReceived} onChange={(e) => setNewClaimForm({ ...newClaimForm, totalQtyReceived: e.target.value })} required /></div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setNewClaimDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Create Claim</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminClaims;