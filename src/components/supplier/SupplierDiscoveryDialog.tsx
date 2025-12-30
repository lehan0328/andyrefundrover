import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, RefreshCw } from "lucide-react";

interface SupplierDiscoveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider?: "outlook" | "gmail"; // Added 'gmail' support
}

interface DiscoveredSupplier {
  id: string;
  email: string;
  source_provider: string;
  label: string;
}

export function SupplierDiscoveryDialog({
  open,
  onOpenChange,
  provider = "outlook", // Default to outlook for backward compat
}: SupplierDiscoveryDialogProps) {
  const [suppliers, setSuppliers] = useState<DiscoveredSupplier[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchDiscoveredSuppliers();
    }
  }, [open, provider]);

  const fetchDiscoveredSuppliers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("allowed_supplier_emails")
        .select("*")
        .eq("status", "suggested") // Only fetch pending suggestions
        .eq("source_provider", provider);

      if (error) throw error;

      setSuppliers(data || []);
      // Auto-select all by default for better UX
      setSelectedIds(new Set(data?.map((s) => s.id) || []));
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleConfirm = async () => {
    if (selectedIds.size === 0) {
      onOpenChange(false);
      return;
    }

    setSyncing(true);
    try {
      // 1. Update status to 'active' for selected
      const { error: updateError } = await supabase
        .from("allowed_supplier_emails")
        .update({ status: "active" })
        .in("id", Array.from(selectedIds));

      if (updateError) throw updateError;

      // 2. Delete rejected (unselected) suggestions
      const rejectedIds = suppliers
        .filter((s) => !selectedIds.has(s.id))
        .map((s) => s.id);

      if (rejectedIds.length > 0) {
        await supabase
          .from("allowed_supplier_emails")
          .delete()
          .in("id", rejectedIds);
      }

      toast({
        title: "Suppliers Approved",
        description: `Starting sync for ${selectedIds.size} suppliers...`,
      });

      // 3. Trigger the appropriate Sync Function
      // This is the critical change to support both flows
      const functionName =
        provider === "gmail" ? "sync-gmail-invoices" : "sync-outlook-invoices";

      const { error: fnError } = await supabase.functions.invoke(functionName, {
        body: { scan_type: "initial" }, // Force deep scan for newly approved suppliers
      });

      if (fnError) throw fnError;

      toast({
        title: "Sync Started",
        description: "We are processing your invoices in the background.",
      });
      
      onOpenChange(false);
    } catch (error: any) {
      console.error("Sync error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to start sync process.",
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Discovered Suppliers ({provider === 'gmail' ? 'Gmail' : 'Outlook'})</DialogTitle>
          <DialogDescription>
            We found these emails sending invoices. Select the ones you want to
            auto-sync.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : suppliers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No new suppliers discovered.
            </div>
          ) : (
            <ScrollArea className="h-[300px] rounded-md border p-4">
              <div className="space-y-4">
                {suppliers.map((supplier) => (
                  <div
                    key={supplier.id}
                    className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-accent"
                  >
                    <Checkbox
                      id={supplier.id}
                      checked={selectedIds.has(supplier.id)}
                      onCheckedChange={() => handleToggle(supplier.id)}
                    />
                    <div className="flex-1 space-y-1">
                      <label
                        htmlFor={supplier.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {supplier.email}
                      </label>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {supplier.label || "Auto-detected"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={syncing}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={loading || suppliers.length === 0 || syncing}
          >
            {syncing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              `Approve & Sync (${selectedIds.size})`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}