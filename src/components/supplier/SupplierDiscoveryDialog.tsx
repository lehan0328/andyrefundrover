import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, Building2 } from "lucide-react";
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

export function SupplierDiscoveryDialog() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [accountMap, setAccountMap] = useState<Record<string, string>>({});

  // Prevent rendering entirely on onboarding page
  if (location.pathname === '/onboarding') {
    return null;
  }

  useEffect(() => {
    if (!user) return;

    checkSuggestions();
    
    const channel = supabase.channel('supplier-discovery')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'allowed_supplier_emails',
        filter: 'status=eq.suggested'
      }, () => {
        console.log("New supplier suggestion detected, refreshing...");
        checkSuggestions();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, location.pathname]);

  const checkSuggestions = async () => {
    if (!user) return;

    // 1. Fetch Suggestions
    const { data: suppliers } = await supabase
      .from('allowed_supplier_emails')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'suggested');

    if (suppliers && suppliers.length > 0) {
      // 2. Fetch Credentials to map account IDs to actual emails
      const { data: gmailCreds } = await supabase
        .from('gmail_credentials')
        .select('id, connected_email')
        .eq('user_id', user.id);
        
      const { data: outlookCreds } = await supabase
        .from('outlook_credentials')
        .select('id, connected_email')
        .eq('user_id', user.id);

      // 3. Create a lookup map: credential_id -> email_address
      const mapping: Record<string, string> = {};
      gmailCreds?.forEach(c => mapping[c.id] = c.connected_email);
      outlookCreds?.forEach(c => mapping[c.id] = c.connected_email);
      setAccountMap(mapping);

      setSuggestions(suppliers);
      
      // Only reset selection if opening for the first time
      if (!open) {
        setSelectedIds(new Set(suppliers.map(s => s.id)));
        setOpen(true);
      }
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const selected = Array.from(selectedIds);
      const unselected = suggestions.filter(s => !selectedIds.has(s.id)).map(s => s.id);

      // 1. Activate selected
      if (selected.length > 0) {
        await supabase
          .from('allowed_supplier_emails')
          .update({ status: 'active' })
          .in('id', selected);
      }

      // 2. Delete ignored
      if (unselected.length > 0) {
        await supabase
          .from('allowed_supplier_emails')
          .delete()
          .in('id', unselected);
      }

      setOpen(false);
      toast.success(`Added ${selected.length} suppliers. Starting sync...`);

      // 3. Trigger Sync
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

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(suggestions.map(s => s.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const allSelected = suggestions.length > 0 && selectedIds.size === suggestions.length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Discovered Suppliers</DialogTitle>
          <DialogDescription>
            We found invoices from these senders in your connected accounts. 
            Approve them to start automatic monitoring.
          </DialogDescription>
        </DialogHeader>

        <div className="border rounded-md mt-2">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[50px] text-center">
                  <Checkbox 
                    checked={allSelected}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Found In Account</TableHead>
                <TableHead className="text-right">Source</TableHead>
              </TableRow>
            </TableHeader>
          </Table>
          <ScrollArea className="h-[300px]">
            <Table>
              <TableBody>
                {suggestions.map((supplier) => (
                  <TableRow key={supplier.id} className="hover:bg-muted/50">
                    <TableCell className="w-[50px] text-center">
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
                      {supplier.source_account_id && accountMap[supplier.source_account_id] ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {accountMap[supplier.source_account_id]}
                        </div>
                      ) : (
                         <span className="text-sm text-muted-foreground italic">--</span>
                      )}
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
          </ScrollArea>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>Do this later</Button>
          <Button onClick={handleConfirm} disabled={loading} className="min-w-[140px]">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sync {selectedIds.size} Suppliers
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}