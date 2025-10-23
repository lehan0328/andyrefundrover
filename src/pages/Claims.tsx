import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Download, Plus } from "lucide-react";
import { isAfter, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";

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
  {
    id: "CLM-003",
    caseId: "9876543212",
    asin: "B07XYZ1234",
    sku: "SKU-TEST-003",
    shipmentId: "FBA16ABCD",
    type: "FBA",
    amount: "$320.75",
    status: "approved",
    date: "2025-10-15",
    feedback: "Reimbursement completed",
  },
  {
    id: "CLM-004",
    caseId: "9876543213",
    asin: "B08ABC5678",
    sku: "SKU-TEST-004",
    shipmentId: "AWD2024XYZ",
    type: "AWD",
    amount: "$95.25",
    status: "denied",
    date: "2025-10-18",
    feedback: "Insufficient documentation",
  },
  {
    id: "CLM-005",
    caseId: "9876543214",
    asin: "B09DEF9012",
    sku: "SKU-TEST-005",
    shipmentId: "FBA17MNOP",
    type: "FBA",
    amount: "$450.00",
    status: "pending",
    date: "2025-10-22",
    feedback: "Awaiting Amazon review",
  },
  {
    id: "CLM-006",
    caseId: "9876543215",
    asin: "B08GHI3456",
    sku: "SKU-TEST-006",
    shipmentId: "FBA18QRST",
    type: "FBA",
    amount: "$275.50",
    status: "approved",
    date: "2025-09-28",
    feedback: "Reimbursement processed",
  },
  {
    id: "CLM-007",
    caseId: "9876543216",
    asin: "B09JKL7890",
    sku: "SKU-TEST-007",
    shipmentId: "AWD2024DEF",
    type: "AWD",
    amount: "$150.00",
    status: "pending",
    date: "2025-10-19",
    feedback: "Under investigation",
  },
  {
    id: "CLM-008",
    caseId: "9876543217",
    asin: "B07MNO2345",
    sku: "SKU-TEST-008",
    shipmentId: "FBA19UVWX",
    type: "FBA",
    amount: "$385.25",
    status: "approved",
    date: "2025-08-15",
    feedback: "Claim approved",
  },
  {
    id: "CLM-009",
    caseId: "9876543218",
    asin: "B08PQR6789",
    sku: "SKU-TEST-009",
    shipmentId: "AWD2024GHI",
    type: "AWD",
    amount: "$210.00",
    status: "denied",
    date: "2025-09-10",
    feedback: "Claim outside eligible timeframe",
  },
  {
    id: "CLM-010",
    caseId: "9876543219",
    asin: "B09STU0123",
    sku: "SKU-TEST-010",
    shipmentId: "FBA20YZAB",
    type: "FBA",
    amount: "$525.75",
    status: "approved",
    date: "2025-10-23",
    feedback: "Reimbursement processed",
  },
];

const Claims = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const filterByDate = (claimDate: string) => {
    if (dateFilter === "all") return true;
    
    const date = new Date(claimDate);
    const now = new Date();
    
    switch (dateFilter) {
      case "7days":
        return isAfter(date, subDays(now, 7));
      case "thisMonth":
        return date >= startOfMonth(now) && date <= endOfMonth(now);
      case "lastMonth":
        const lastMonth = subMonths(now, 1);
        return date >= startOfMonth(lastMonth) && date <= endOfMonth(lastMonth);
      case "60days":
        return isAfter(date, subDays(now, 60));
      case "90days":
        return isAfter(date, subDays(now, 90));
      default:
        return true;
    }
  };

  const filteredClaims = allClaims.filter(claim => {
    const matchesSearch = searchTerm === "" || 
      claim.caseId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.asin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || claim.status === statusFilter;
    const matchesDate = filterByDate(claim.date);
    
    return matchesSearch && matchesStatus && matchesDate;
  });

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
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="thisMonth">This Month</SelectItem>
              <SelectItem value="lastMonth">Last Month</SelectItem>
              <SelectItem value="60days">Last 60 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
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
            {filteredClaims.map((claim) => (
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
