import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DollarSign, CreditCard, Clock } from "lucide-react";
import { allClaims } from "@/data/claimsData";
import { format } from "date-fns";
import { toast } from "sonner";
import { StatCard } from "@/components/dashboard/StatCard";

export default function AdminBilling() {
  const [selectedClaim, setSelectedClaim] = useState<string | null>(null);
  const [paidClaims, setPaidClaims] = useState<Set<string>>(new Set());

  // Filter approved claims
  const approvedClaims = allClaims.filter(claim => claim.status === "Approved");

  // Calculate totals
  const totalReimbursed = approvedClaims.reduce((sum, claim) => 
    sum + Number((claim.actualRecovered || '0').replace('$', '')), 0
  );
  const totalBilled = totalReimbursed * 0.15;
  const totalPaid = approvedClaims
    .filter(claim => paidClaims.has(claim.id))
    .reduce((sum, claim) => sum + (Number((claim.actualRecovered || '0').replace('$', '')) * 0.15), 0);
  const totalPending = totalBilled - totalPaid;

  const handleMarkAsPaid = (claimId: string) => {
    setPaidClaims(prev => new Set(prev).add(claimId));
    setSelectedClaim(null);
    toast.success("Payment marked as received");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Billing</h1>
        <p className="text-muted-foreground mt-2">
          Track commission billing for approved claims
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Total Billed"
          value={`$${totalBilled.toFixed(2)}`}
          icon={DollarSign}
        />
        <StatCard
          title="Total Paid"
          value={`$${totalPaid.toFixed(2)}`}
          icon={CreditCard}
          trend="up"
        />
        <StatCard
          title="Pending Payment"
          value={`$${totalPending.toFixed(2)}`}
          icon={Clock}
        />
        <StatCard
          title="Approved Claims"
          value={approvedClaims.length.toString()}
          icon={DollarSign}
        />
      </div>

      {/* Billing Table */}
      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Updated Date</TableHead>
              <TableHead>Shipment ID</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Expected Value</TableHead>
              <TableHead>Actual Recovered</TableHead>
              <TableHead>Billed (15%)</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {approvedClaims.map((claim) => {
              const billed = Number((claim.actualRecovered || '0').replace('$', '')) * 0.15;
              const isPaid = paidClaims.has(claim.id);

              return (
                <TableRow key={claim.id}>
                  <TableCell>
                    {format(new Date(claim.lastUpdated), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {claim.shipmentId}
                  </TableCell>
                  <TableCell>{claim.companyName}</TableCell>
                  <TableCell>${Number(claim.amount.replace('$', '')).toFixed(2)}</TableCell>
                  <TableCell className="font-semibold">
                    ${Number((claim.actualRecovered || '0').replace('$', '')).toFixed(2)}
                  </TableCell>
                  <TableCell className="font-semibold text-primary">
                    ${billed.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {isPaid ? (
                      <Badge variant="default" className="bg-green-500">
                        Paid
                      </Badge>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedClaim(claim.id)}
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        Pending
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={!!selectedClaim} onOpenChange={() => setSelectedClaim(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
            <DialogDescription>
              Choose payment method and mark as paid
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Payment Options:</p>
              <div className="grid gap-2">
                <Button variant="outline" className="justify-start">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Credit Card
                </Button>
                <Button variant="outline" className="justify-start">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Bank Transfer
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedClaim(null)}>
              Cancel
            </Button>
            <Button onClick={() => selectedClaim && handleMarkAsPaid(selectedClaim)}>
              Mark as Paid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
