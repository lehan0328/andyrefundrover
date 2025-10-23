import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Download, Plus } from "lucide-react";

const allClaims = [
  {
    id: "CLM-001",
    caseId: "9876543210",
    asin: "B08N5WRWNW",
    sku: "SKU-TEST-001",
    shipmentId: "FBA15XYWZ",
    type: "FBA",
    amount: "$245.00",
    status: "approved",
    date: "2025-10-20",
    feedback: "Reimbursement processed",
  },
  {
    id: "CLM-002",
    caseId: "9876543211",
    asin: "B09K7XPQR2",
    sku: "SKU-TEST-002",
    shipmentId: "AWD2024ABC",
    type: "AWD",
    amount: "$180.50",
    status: "pending",
    date: "2025-10-21",
    feedback: "Under review",
  },
  // Add more sample data as needed
];

const Claims = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const getStatusBadge = (status: string) => {
    const variants = {
      approved: "default",
      pending: "secondary",
      denied: "destructive",
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || "default"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Claims Management</h1>
          <p className="text-muted-foreground mt-2">
            Monitor and manage all reimbursement claims
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Claim
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by Case ID, ASIN, SKU..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="denied">Denied</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Claim ID</TableHead>
              <TableHead>Case ID</TableHead>
              <TableHead>ASIN</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Shipment ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allClaims.map((claim) => (
              <TableRow key={claim.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell className="font-medium">{claim.id}</TableCell>
                <TableCell className="font-mono text-sm">{claim.caseId}</TableCell>
                <TableCell className="font-mono text-sm">{claim.asin}</TableCell>
                <TableCell className="font-mono text-sm">{claim.sku}</TableCell>
                <TableCell className="font-mono text-sm">{claim.shipmentId}</TableCell>
                <TableCell>
                  <Badge variant="outline">{claim.type}</Badge>
                </TableCell>
                <TableCell className="font-semibold">{claim.amount}</TableCell>
                <TableCell>{getStatusBadge(claim.status)}</TableCell>
                <TableCell className="text-muted-foreground">{claim.date}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default Claims;
