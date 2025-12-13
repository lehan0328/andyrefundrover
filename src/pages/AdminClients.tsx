import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Building2, FileText, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ClientStats {
  companyName: string;
  email: string | null;
  totalClaims: number;
  pending: number;
  submitted: number;
  approved: number;
  denied: number;
  totalAmount: number;
}

const AdminClients = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [clients, setClients] = useState<ClientStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClientStats();
  }, []);

  const loadClientStats = async () => {
    try {
      const [claimsResult, customersResult] = await Promise.all([
        supabase.from("claims").select("company_name, status, amount"),
        supabase.from("customers").select("company_name, email")
      ]);

      if (claimsResult.error) throw claimsResult.error;

      // Create email lookup from customers
      const emailMap = new Map<string, string>();
      customersResult.data?.forEach((customer) => {
        if (customer.company_name && customer.email) {
          emailMap.set(customer.company_name, customer.email);
        }
      });

      // Group claims by company
      const statsMap = new Map<string, ClientStats>();

      claimsResult.data?.forEach((claim) => {
        const companyName = claim.company_name || "Unknown";
        const existing = statsMap.get(companyName) || {
          companyName,
          email: emailMap.get(companyName) || null,
          totalClaims: 0,
          pending: 0,
          submitted: 0,
          approved: 0,
          denied: 0,
          totalAmount: 0,
        };

        existing.totalClaims++;
        existing.totalAmount += Number(claim.amount) || 0;

        switch (claim.status) {
          case "Pending":
            existing.pending++;
            break;
          case "Submitted":
            existing.submitted++;
            break;
          case "Approved":
            existing.approved++;
            break;
          case "Denied":
            existing.denied++;
            break;
        }

        statsMap.set(companyName, existing);
      });

      setClients(Array.from(statsMap.values()).sort((a, b) => 
        a.companyName.localeCompare(b.companyName)
      ));
    } catch (error) {
      console.error("Error loading client stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter((client) =>
    client.companyName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalStats = clients.reduce(
    (acc, client) => ({
      totalClaims: acc.totalClaims + client.totalClaims,
      pending: acc.pending + client.pending,
      submitted: acc.submitted + client.submitted,
      approved: acc.approved + client.approved,
      denied: acc.denied + client.denied,
    }),
    { totalClaims: 0, pending: 0, submitted: 0, approved: 0, denied: 0 }
  );

  const handleClientClick = (companyName: string) => {
    navigate(`/admin/claims?client=${encodeURIComponent(companyName)}`);
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AdminSidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">Client Claims</h1>
            <p className="text-muted-foreground">
              Select a client to view their claims
            </p>
          </div>

          {/* Summary Stats */}
          <div className="mb-6 grid gap-4 md:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Clients
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{clients.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Claims
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalStats.totalClaims}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{totalStats.pending}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Approved
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{totalStats.approved}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Denied
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{totalStats.denied}</div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Clients Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead className="text-center">Total Claims</TableHead>
                    <TableHead className="text-center">Pending</TableHead>
                    <TableHead className="text-center">Submitted</TableHead>
                    <TableHead className="text-center">Approved</TableHead>
                    <TableHead className="text-center">Denied</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        Loading clients...
                      </TableCell>
                    </TableRow>
                  ) : filteredClients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <Building2 className="h-8 w-8 text-muted-foreground" />
                          <p className="text-muted-foreground">No clients found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredClients.map((client) => (
                      <TableRow
                        key={client.companyName}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleClientClick(client.companyName)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="flex flex-col">
                              <span className="font-medium">{client.companyName}</span>
                              {client.email && (
                                <span className="text-xs text-muted-foreground">{client.email}</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{client.totalClaims}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {client.pending > 0 && (
                            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                              {client.pending}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {client.submitted > 0 && (
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                              {client.submitted}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {client.approved > 0 && (
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                              {client.approved}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {client.denied > 0 && (
                            <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
                              {client.denied}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${client.totalAmount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default AdminClients;
