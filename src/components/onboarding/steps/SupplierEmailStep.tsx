import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Plus, Trash2, Loader2, Sparkles } from "lucide-react";
import { EmailConnection } from "./ConnectEmailStep";

export interface SupplierEmail {
  email: string;
  label: string;
  sourceAccountId: string;
  sourceProvider: 'gmail' | 'outlook';
  isSuggested?: boolean;
}

interface SupplierEmailStepProps {
  supplierEmails: SupplierEmail[];
  emailConnections: EmailConnection[];
  newEmail: string;
  setNewEmail: (val: string) => void;
  newLabel: string;
  setNewLabel: (val: string) => void;
  selectedEmailAccounts: string[];
  setSelectedEmailAccounts: (accounts: string[]) => void;
  onAddSupplier: () => void;
  onRemoveSupplier: (index: number) => void;
}

const SupplierEmailStep = ({
  supplierEmails,
  emailConnections,
  newEmail,
  setNewEmail,
  newLabel,
  setNewLabel,
  selectedEmailAccounts,
  setSelectedEmailAccounts,
  onAddSupplier,
  onRemoveSupplier
}: SupplierEmailStepProps) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/10 mb-4">
          <Shield className="h-8 w-8 text-purple-500" />
        </div>
        <h2 className="text-2xl font-bold">Add Supplier Emails</h2>
        <p className="text-muted-foreground mt-2">
          Our AI only scans emails from suppliers you specify to protect your privacy.
          Add the email addresses that send you invoices.
        </p>
      </div>

      <div className="space-y-4">
        {/* Scanning Indicator */}
        {emailConnections.length > 0 && (
          <div className="flex items-center gap-3 p-4 border border-blue-200 bg-blue-50/50 rounded-lg text-blue-700 animate-in fade-in slide-in-from-top-2">
            <div className="relative flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <div className="absolute inset-0 bg-blue-400/20 rounded-full animate-ping" />
            </div>
            <div className="text-sm">
              <p className="font-medium">AI Discovery Active</p>
              <p className="text-blue-600/80">
                Scanning {emailConnections.length} connected account{emailConnections.length !== 1 ? 's' : ''} for invoice senders...
              </p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="grid gap-3">
            <div>
              <Label htmlFor="supplierEmail">Supplier Email Address</Label>
              <Input 
                id="supplierEmail" 
                type="email" 
                placeholder="supplier@company.com" 
                value={newEmail} 
                onChange={e => setNewEmail(e.target.value)} 
              />
            </div>
            <div>
              <Label>Monitor From Account(s)</Label>
              <div className="space-y-2 mt-2 p-3 border rounded-lg bg-muted/30">
                {emailConnections.map((conn, index) => {
                  const value = `${conn.email}|${conn.provider}`;
                  const isChecked = selectedEmailAccounts.includes(value);
                  return (
                    <div key={index} className="flex items-center space-x-2">
                      <Checkbox
                        id={`email-${index}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedEmailAccounts([...selectedEmailAccounts, value]);
                          } else {
                            setSelectedEmailAccounts(selectedEmailAccounts.filter(a => a !== value));
                          }
                        }}
                      />
                      <label
                        htmlFor={`email-${index}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {conn.email} <span className="text-muted-foreground">({conn.provider})</span>
                      </label>
                    </div>
                  );
                })}
                {emailConnections.length === 0 && (
                  <p className="text-xs text-muted-foreground">No email accounts connected.</p>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="supplierLabel">Label (Optional)</Label>
              <Input 
                id="supplierLabel" 
                placeholder="e.g., Main supplier" 
                value={newLabel} 
                onChange={e => setNewLabel(e.target.value)} 
              />
            </div>
          </div>
          <Button onClick={onAddSupplier} variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Supplier Email
          </Button>
        </div>

        {supplierEmails.length > 0 && (
          <div className="space-y-2">
            <Label>Added Suppliers ({supplierEmails.length})</Label>
            {supplierEmails.map((supplier, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-muted/50 transition-all hover:bg-muted/80">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{supplier.email}</p>
                    {supplier.isSuggested && (
                      <Badge variant="secondary" className="h-5 text-[10px] bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">
                        <Sparkles className="h-3 w-3 mr-1" />
                        AI Found
                      </Badge>
                    )}
                  </div>
                  {supplier.label && <p className="text-xs text-muted-foreground">{supplier.label}</p>}
                  <p className="text-xs text-muted-foreground capitalize">
                    via {supplier.sourceProvider}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => onRemoveSupplier(index)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {supplierEmails.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-4 border rounded-lg border-dashed">
            Add at least one supplier email to continue
          </p>
        )}
      </div>
    </div>
  );
};

export default SupplierEmailStep;