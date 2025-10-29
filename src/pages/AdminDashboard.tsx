import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, UserPlus, Building, TrendingUp, Eye } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { useNavigate } from "react-router-dom";
import { allClaims } from "@/data/claimsData";
import { RecentClaims } from "@/components/dashboard/RecentClaims";

interface Customer {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  status: string;
  total_claims: number;
  total_reimbursed: number;
  created_at: string;
}

const AdminDashboard = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    status: "active",
  });

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase.from("customers").insert([formData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Client added successfully",
      });
      
      setDialogOpen(false);
      setFormData({
        company_name: "",
        contact_name: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        zip_code: "",
        status: "active",
      });
      fetchCustomers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Calculate claim statistics per client
  const getClientStats = (companyName: string) => {
    const clientClaims = allClaims.filter((claim: any) => claim.companyName === companyName);
    return {
      total: clientClaims.length,
      pending: clientClaims.filter(c => c.status === "Pending").length,
      submitted: clientClaims.filter(c => c.status === "Submitted").length,
      approved: clientClaims.filter(c => c.status === "Approved").length,
      denied: clientClaims.filter(c => c.status === "Denied").length,
      closed: clientClaims.filter(c => c.status === "Closed").length,
    };
  };

  const uniqueClientCount = new Set(allClaims.map((c: any) => c.companyName)).size;
  const totalCustomers = customers.length > 0 ? customers.length : uniqueClientCount;
  const activeCustomers = customers.length > 0 ? customers.filter(c => c.status === "active").length : totalCustomers;
  
  // Calculate actual statistics from claims data
  const totalClaims = allClaims.length;
  const totalReimbursed = allClaims
    .filter((claim: any) => claim.status === "Approved")
    .reduce((sum, claim: any) => {
      const amount = parseFloat(claim.amount.replace('$', '').replace(',', ''));
      return sum + amount;
    }, 0);
  const displayCustomers = customers.length > 0
    ? customers
    : Array.from(new Set(allClaims.map((c: any) => c.companyName))).map((name: string) => ({
        id: name,
        company_name: name,
        contact_name: "",
        email: "",
        phone: null,
        status: "active",
        total_claims: 0,
        total_reimbursed: 0,
        created_at: "",
      })) as unknown as Customer[];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage clients and monitor system activity</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-glow">
              <UserPlus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
              <DialogDescription>Enter client information below</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name *</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_name">Contact Name *</Label>
                  <Input
                    id="contact_name"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip_code">Zip Code</Label>
                  <Input
                    id="zip_code"
                    value={formData.zip_code}
                    onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Client</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Clients"
          value={totalCustomers.toString()}
          icon={Users}
          variant="default"
        />
        <StatCard
          title="Active Clients"
          value={activeCustomers.toString()}
          icon={Building}
          variant="success"
        />
        <StatCard
          title="Total Claims"
          value={totalClaims.toString()}
          icon={TrendingUp}
          variant="default"
        />
        <StatCard
          title="Total Reimbursed"
          value={`$${totalReimbursed.toLocaleString()}`}
          icon={TrendingUp}
          variant="success"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Clients</CardTitle>
          <CardDescription>View and manage client accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead># of Claims</TableHead>
                <TableHead>Pending</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Approved</TableHead>
                <TableHead>Denied</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayCustomers.map((customer) => {
                const stats = getClientStats(customer.company_name);
                const hasDbId = customers.length > 0;
                return (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.company_name}</TableCell>
                    <TableCell>{stats.total}</TableCell>
                    <TableCell>{stats.pending}</TableCell>
                    <TableCell>{stats.submitted}</TableCell>
                    <TableCell>{stats.approved}</TableCell>
                    <TableCell>{stats.denied}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/claims?client=${encodeURIComponent(customer.company_name)}`)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Claims
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <RecentClaims showAll={true} />
    </div>
  );
};

export default AdminDashboard;
