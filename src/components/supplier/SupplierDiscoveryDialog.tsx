import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, Building2, Plus, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

interface EmailCredential {
  id: string;
  email: string;
  provider: 'gmail' | 'outlook';
}

export function SupplierDiscoveryDialog() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Data State
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [emailCredentials, setEmailCredentials] = useState<EmailCredential[]>([]);
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Manual Add State
  const [newEmail, setNewEmail] = useState("");
  const [manualSelectedAccounts, setManualSelectedAccounts] = useState<string[]>([]);
  const [isAddingManual, setIsAddingManual] = useState(false);

  const loadData = async () => {
    if (!user) return;

    try {
      // 1. Load Credentials (for both mapping and manual selection)
      const { data: gmailData } = await supabase
        .from('gmail_credentials')
        .select('id, connected_email')
        .eq('user_id', user.id);
        
      const { data: outlookData } = await supabase
        .from('outlook_credentials')
        .select('id, connected_email')
        .eq('user_id', user.id);

      const credentials: EmailCredential[] = [
        ...(gmailData || []).map(c => ({ id: c.id, email: c.connected_email, provider: 'gmail' as const })),
        ...(outlookData || []).map(c => ({ id: c.id, email: c.connected_email, provider: 'outlook' as const }))
      ];
      setEmailCredentials(credentials);

      // 2. Load Suggestions
      const { data: suppliers } = await supabase
        .from('allowed_supplier_emails')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'suggested');

      if (suppliers && suppliers.length > 0) {
        setSuggestions(suppliers);
        // Only open if we have suggestions and aren't already open
        if (!open) {
          setSelectedIds(new Set(suppliers.map(s => s.id)));
          setOpen(true);
        }
      }
    } catch (error) {
      console.error("Error loading discovery data:", error);
    }
  };

  useEffect(() => {
    if (!user || location.pathname === '/onboarding') return;

    loadData();
    
    const channel = supabase.channel('supplier-discovery')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'allowed_supplier_emails',
        filter: 'status=eq.suggested'
      }, () => {
        loadData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, location.pathname]);

  if (location.pathname === '/onboarding') return null;

  // Helper to map account ID to email
  const getAccountEmail = (accountId: string | null) => {
    if (!accountId) return null;
    return emailCredentials.find(c => c.id === accountId)?.email || "Unknown Account";
  };

  // --- Actions ---

  const handleConfirmSuggestions = async () => {
    setLoading(true);
    try {
      const selected = Array.from(selectedIds);
      const unselected = suggestions.filter(s => !selectedIds.has(s.id)).map(s => s.id);

      if (selected.length > 0) {
        await supabase
          .from('allowed_supplier_emails')
          .update({ status: 'active' })
          .in('id', selected);
      }

      if (unselected.length > 0) {
        await supabase
          .from('allowed_supplier_emails')
          .delete()
          .in('id', unselected);
      }

      toast.success(`Synced ${selected.length} suppliers.`);
      setOpen(false); // Close dialog

      // Trigger background sync
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
         supabase.functions.invoke('sync-gmail-invoices', {
           headers: { Authorization: `Bearer ${session.access_token}` },
           body: { scan_type: 'refresh' } 
         });
         supabase.functions.invoke('sync-outlook-invoices', {
           headers: { Authorization: `Bearer ${session.access_token}` },
           body: { scan_type: 'refresh' }
         });
      }

    } catch (error) {
      console.error(error);
      toast.error("Failed to update suppliers");
    } finally {
      setLoading(false);
    }
  };

  const handleManualAdd = async () => {
    if (!newEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }
    if (manualSelectedAccounts.length === 0) {
      toast.error("Please select at least one account");
      return;
    }

    setIsAddingManual(true);
    try {
      for (const accountStr of manualSelectedAccounts) {
        const [accountId, provider] = accountStr.split('|');
        await supabase.from('allowed_supplier_emails').insert({
          user_id: user?.id,
          email: newEmail.trim(),
          source_account_id: accountId,
          source_provider: provider,
          status: 'active',
          label: 'Manual Add'
        });
      }
      
      toast.success("Supplier added successfully");
      setNewEmail("");
      setManualSelectedAccounts([]);
      
      // Refresh list to show it moved (optional, or just close if that was the intent)
      // For this dialog, we usually just want to add and keep going with suggestions
    } catch (error) {
      console.error(error);
      toast.error("Failed to add supplier");
    } finally {
      setIsAddingManual(false);
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(new Set(suggestions.map(s => s.id)));
    else setSelectedIds(new Set());
  };

  const allSelected = suggestions.length > 0 && selectedIds.size === suggestions.length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            New Suppliers Discovered
          </DialogTitle>
          <DialogDescription>
            Our AI found potential invoice senders in your email history. Approve them to start syncing.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          
          {/* Section 1: Discovered Suggestions Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Discovered from History</h3>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                {suggestions.length} Found
              </Badge>
            </div>
            
            <div className="border rounded-md">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[50px] text-center">
                      <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
                    </TableHead>
                    <TableHead className="w-[300px]">Supplier Email</TableHead>
                    {/* Fixed Width for Alignment */}
                    <TableHead className="w-[300px]">Found In Account</TableHead>
                    <TableHead className="text-right">Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suggestions.map((supplier) => (
                    <TableRow key={supplier.id} className="hover:bg-muted/50">
                      <TableCell className="text-center">
                        <Checkbox 
                          checked={selectedIds.has(supplier.id)}
                          onCheckedChange={() => toggleSelect(supplier.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground hidden sm:block" />
                          <span>{supplier.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span className="truncate max-w-[250px]" title={getAccountEmail(supplier.source_account_id) || ""}>
                            {getAccountEmail(supplier.source_account_id) || "--"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="capitalize">
                          {supplier.source_provider}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <Separator className="my-2" />

          {/* Section 2: Manual Input (Consistent with Onboarding) */}
          <div className="bg-muted/30 p-4 rounded-lg border border-border/50">
            <div className="flex items-center gap-2 mb-4">
              <Plus className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Manually Add Supplier</h3>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="manual-email">Email Address</Label>
                <Input 
                  id="manual-email" 
                  placeholder="billing@vendor.com" 
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Monitor on Account(s)</Label>
                <ScrollArea className="h-[100px] border rounded-md bg-background p-2">
                  <div className="space-y-2">
                    {emailCredentials.length === 0 && (
                      <span className="text-xs text-muted-foreground pl-1">No accounts connected</span>
                    )}
                    {emailCredentials.map((cred) => {
                      const val = `${cred.id}|${cred.provider}`;
                      return (
                        <div key={cred.id} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`manual-${cred.id}`}
                            checked={manualSelectedAccounts.includes(val)}
                            onCheckedChange={(checked) => {
                              if (checked) setManualSelectedAccounts([...manualSelectedAccounts, val]);
                              else setManualSelectedAccounts(manualSelectedAccounts.filter(x => x !== val));
                            }}
                          />
                          <label 
                            htmlFor={`manual-${cred.id}`} 
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {cred.email}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            </div>
            
            <div className="flex justify-end mt-3">
              <Button 
                size="sm" 
                variant="secondary" 
                onClick={handleManualAdd}
                disabled={isAddingManual || !newEmail || manualSelectedAccounts.length === 0}
              >
                {isAddingManual ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Plus className="h-3 w-3 mr-2" />}
                Add Manual Supplier
              </Button>
            </div>
          </div>

        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex-1 text-xs text-muted-foreground flex items-center gap-1">
             <AlertCircle className="h-3 w-3" />
             Unselected suggestions will be removed.
          </div>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmSuggestions} disabled={loading} className="min-w-[150px]">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCheckbox className="h-4 w-4 mr-2" /> 
            )}
            Sync Selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CheckCheckbox(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 11 3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  )
}