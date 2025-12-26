import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext"; // [!code ++]

export function SupplierDiscoveryDialog() {
  const { user } = useAuth(); // [!code ++]
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user || location.pathname === '/onboarding') return; // Wait for user to be authenticated [!code ++]

    checkSuggestions();
    
    // Listen for new suggestions (e.g. after background discovery finishes)
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
  }, [user]); // Add user dependency so subscription recreates with auth context [!code ++]

  const checkSuggestions = async () => {
    // You can now use the 'user' object directly instead of awaiting getUser() again
    if (!user) return;

    const { data } = await supabase
      .from('allowed_supplier_emails')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'suggested');

    if (data && data.length > 0) {
      setSuggestions(data);
      // Auto-select all by default for convenience
      setSelectedIds(new Set(data.map(s => s.id)));
      setOpen(true);
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

      // 2. Remove ignored (or set to 'ignored' if you want to remember them)
      if (unselected.length > 0) {
        await supabase
          .from('allowed_supplier_emails')
          .delete()
          .in('id', unselected);
      }

      setOpen(false);
      toast.success(`Added ${selected.length} suppliers. Starting sync...`);

      // 3. Trigger Sync for newly active suppliers
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
         // Trigger both providers blindly or filter based on suggestion source
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Discovered Suppliers</DialogTitle>
          <DialogDescription>
            We found potential invoice sources in your email. Select the ones you want to sync.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[300px] border rounded-md p-2">
          <div className="space-y-2">
            {suggestions.map((supplier) => (
              <div key={supplier.id} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-lg">
                <Checkbox 
                  checked={selectedIds.has(supplier.id)}
                  onCheckedChange={() => toggleSelect(supplier.id)}
                />
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium truncate">{supplier.email}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="secondary" className="text-[10px] h-4">
                      {supplier.source_provider}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Do this later</Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sync {selectedIds.size} Suppliers
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}