import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { allClaims } from "@/data/claimsData";

const getStatusBadge = (status: string) => {
  const variants = {
    Approved: "default",
    Pending: "secondary",
    Denied: "destructive",
    Submitted: "outline",
    Closed: "outline",
  } as const;

  return (
    <Badge variant={variants[status as keyof typeof variants] || "secondary"}>
      {status}
    </Badge>
  );
};

interface RecentClaimsProps {
  showAll?: boolean;
  limit?: number;
}

export const RecentClaims = ({ showAll = false, limit = 10 }: RecentClaimsProps) => {
  const displayClaims = showAll ? allClaims : allClaims.slice(0, limit);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">
          {showAll ? "All Claims" : "Recent Claims"}
        </h3>
        {!showAll && (
          <a href="/claims" className="text-sm text-primary hover:underline">
            View all
          </a>
        )}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Claim ID</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Item Name</TableHead>
            <TableHead>ASIN</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayClaims.map((claim) => (
            <TableRow key={claim.id}>
              <TableCell className="font-medium">{claim.id}</TableCell>
              <TableCell>{claim.companyName}</TableCell>
              <TableCell className="max-w-[200px] truncate">{claim.itemName}</TableCell>
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
