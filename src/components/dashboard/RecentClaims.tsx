import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const recentClaims = [
  {
    id: "CLM-001",
    asin: "B08N5WRWNW",
    type: "FBA",
    amount: "$245.00",
    status: "approved",
    date: "2025-10-20",
  },
  {
    id: "CLM-002",
    asin: "B09K7XPQR2",
    type: "AWD",
    amount: "$180.50",
    status: "pending",
    date: "2025-10-21",
  },
  {
    id: "CLM-003",
    asin: "B07ZPKN6YR",
    type: "FBA",
    amount: "$95.00",
    status: "approved",
    date: "2025-10-22",
  },
  {
    id: "CLM-004",
    asin: "B08GF2KN8Y",
    type: "AWD",
    amount: "$310.00",
    status: "pending",
    date: "2025-10-22",
  },
  {
    id: "CLM-005",
    asin: "B09M3TXYZ8",
    type: "FBA",
    amount: "$125.00",
    status: "denied",
    date: "2025-10-23",
  },
];

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

export const RecentClaims = () => {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Recent Claims</h3>
        <a href="/claims" className="text-sm text-primary hover:underline">
          View all
        </a>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Claim ID</TableHead>
            <TableHead>ASIN</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recentClaims.map((claim) => (
            <TableRow key={claim.id}>
              <TableCell className="font-medium">{claim.id}</TableCell>
              <TableCell className="font-mono text-sm">{claim.asin}</TableCell>
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
  );
};
