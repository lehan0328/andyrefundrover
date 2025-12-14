import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Plus, MessageSquare, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AmazonCase {
  id: string;
  claim_id: string;
  case_id: string;
  case_type: string;
  status: string;
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
  amazon_response: string | null;
  created_at: string;
  updated_at: string;
}

interface AmazonCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  claimId: string;
  shipmentId: string;
}

const AmazonCaseDialog = ({ open, onOpenChange, claimId, shipmentId }: AmazonCaseDialogProps) => {
  const { toast } = useToast();
  const [cases, setCases] = useState<AmazonCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showNewCaseForm, setShowNewCaseForm] = useState(false);
  const [newCase, setNewCase] = useState({
    case_id: "",
    case_type: "reimbursement",
    status: "open",
    notes: "",
    amazon_response: "",
  });

  useEffect(() => {
    if (open && claimId) {
      loadCases();
    }
  }, [open, claimId]);

  const loadCases = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("amazon_cases")
        .select("*")
        .eq("claim_id", claimId)
        .order("opened_at", { ascending: false });

      if (error) throw error;
      setCases(data || []);
    } catch (error: any) {
      console.error("Error loading cases:", error);
      toast({
        title: "Error",
        description: "Failed to load Amazon cases",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCase = async () => {
    if (!newCase.case_id.trim()) {
      toast({
        title: "Error",
        description: "Case ID is required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("amazon_cases").insert({
        claim_id: claimId,
        case_id: newCase.case_id,
        case_type: newCase.case_type,
        status: newCase.status,
        notes: newCase.notes || null,
        amazon_response: newCase.amazon_response || null,
      });

      if (error) throw error;

      toast({
        title: "Case Created",
        description: "Amazon case has been added",
      });

      setNewCase({
        case_id: "",
        case_type: "reimbursement",
        status: "open",
        notes: "",
        amazon_response: "",
      });
      setShowNewCaseForm(false);
      loadCases();
    } catch (error: any) {
      console.error("Error creating case:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create case",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCaseStatus = async (caseId: string, newStatus: string) => {
    try {
      const updateData: { status: string; closed_at?: string | null } = { status: newStatus };
      if (newStatus === "resolved" || newStatus === "closed") {
        updateData.closed_at = new Date().toISOString();
      } else {
        updateData.closed_at = null;
      }

      const { error } = await supabase
        .from("amazon_cases")
        .update(updateData)
        .eq("id", caseId);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Case status changed to ${newStatus}`,
      });
      loadCases();
    } catch (error: any) {
      console.error("Error updating case:", error);
      toast({
        title: "Error",
        description: "Failed to update case status",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCase = async (caseId: string) => {
    try {
      const { error } = await supabase.from("amazon_cases").delete().eq("id", caseId);

      if (error) throw error;

      toast({
        title: "Case Deleted",
        description: "Amazon case has been removed",
      });
      loadCases();
    } catch (error: any) {
      console.error("Error deleting case:", error);
      toast({
        title: "Error",
        description: "Failed to delete case",
        variant: "destructive",
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "open":
        return "outline";
      case "pending":
        return "secondary";
      case "resolved":
        return "default";
      case "closed":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "text-blue-600 border-blue-500/20 bg-blue-500/10";
      case "pending":
        return "text-yellow-600 border-yellow-500/20 bg-yellow-500/10";
      case "resolved":
        return "text-green-600 border-green-500/20 bg-green-500/10";
      case "closed":
        return "text-muted-foreground border-muted bg-muted/50";
      default:
        return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Amazon Cases
          </DialogTitle>
          <DialogDescription>
            Manage Amazon support cases for shipment {shipmentId}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add New Case Button */}
          {!showNewCaseForm && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowNewCaseForm(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Case
            </Button>
          )}

          {/* New Case Form */}
          {showNewCaseForm && (
            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="caseId">Amazon Case ID *</Label>
                    <Input
                      id="caseId"
                      placeholder="e.g., 1234567890"
                      value={newCase.case_id}
                      onChange={(e) => setNewCase({ ...newCase, case_id: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="caseType">Case Type</Label>
                    <Select
                      value={newCase.case_type}
                      onValueChange={(value) => setNewCase({ ...newCase, case_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reimbursement">Reimbursement</SelectItem>
                        <SelectItem value="investigation">Investigation</SelectItem>
                        <SelectItem value="general">General Inquiry</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add notes about this case..."
                    value={newCase.notes}
                    onChange={(e) => setNewCase({ ...newCase, notes: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowNewCaseForm(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateCase} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Create Case"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cases List */}
          <ScrollArea className="h-[400px]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : cases.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No Amazon cases for this claim yet.</p>
                <p className="text-sm">Click "Add New Case" to track a support case.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cases.map((amazonCase) => (
                  <Card key={amazonCase.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold">
                            Case #{amazonCase.case_id}
                          </span>
                          <Badge variant="outline" className={getStatusColor(amazonCase.status)}>
                            {amazonCase.status}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {amazonCase.case_type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              window.open(
                                `https://sellercentral.amazon.com/help/hub/support/case/${amazonCase.case_id}`,
                                "_blank"
                              )
                            }
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteCase(amazonCase.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground mb-3">
                        Opened: {format(new Date(amazonCase.opened_at), "MMM dd, yyyy 'at' h:mm a")}
                        {amazonCase.closed_at && (
                          <span className="ml-3">
                            Closed: {format(new Date(amazonCase.closed_at), "MMM dd, yyyy")}
                          </span>
                        )}
                      </div>

                      {amazonCase.notes && (
                        <div className="mb-3">
                          <p className="text-sm text-muted-foreground">{amazonCase.notes}</p>
                        </div>
                      )}

                      {amazonCase.amazon_response && (
                        <div className="p-2 bg-muted rounded-md mb-3">
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Amazon Response:
                          </p>
                          <p className="text-sm">{amazonCase.amazon_response}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">Update Status:</Label>
                        <Select
                          value={amazonCase.status}
                          onValueChange={(value) => handleUpdateCaseStatus(amazonCase.id, value)}
                        >
                          <SelectTrigger className="w-[120px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AmazonCaseDialog;
