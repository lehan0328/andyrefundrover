import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Users, Mail, Building2, Trash2, Search, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface WaitlistEntry {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  created_at: string;
  status: string;
  notes: string | null;
}

const AdminWaitlist = () => {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchWaitlist = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("waitlist")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch waitlist");
      console.error(error);
    } else {
      setEntries(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchWaitlist();
  }, []);

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("waitlist")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to remove entry");
    } else {
      toast.success("Entry removed from waitlist");
      setEntries(entries.filter((e) => e.id !== id));
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from("waitlist")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success("Status updated");
      setEntries(entries.map((e) => (e.id === id ? { ...e, status: newStatus } : e)));
    }
  };

  const filteredEntries = entries.filter(
    (entry) =>
      entry.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: entries.length,
    pending: entries.filter((e) => e.status === "pending").length,
    contacted: entries.filter((e) => e.status === "contacted").length,
    approved: entries.filter((e) => e.status === "approved").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Waitlist</h1>
        <p className="text-muted-foreground">Manage signup requests</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Signups</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Mail className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contacted</CardTitle>
            <Mail className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats.contacted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.approved}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Waitlist Entries</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No waitlist entries found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      {entry.full_name || "-"}
                    </TableCell>
                    <TableCell>{entry.email}</TableCell>
                    <TableCell>
                      {entry.company_name ? (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {entry.company_name}
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(entry.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <select
                        value={entry.status}
                        onChange={(e) => handleStatusChange(entry.id, e.target.value)}
                        className="bg-transparent border rounded px-2 py-1 text-sm"
                      >
                        <option value="pending">Pending</option>
                        <option value="contacted">Contacted</option>
                        <option value="approved">Approved</option>
                      </select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(entry.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminWaitlist;
