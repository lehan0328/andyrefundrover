import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface ProofOfDeliveryRecord {
  id: string;
  file_name: string;
  file_path: string;
  shipment_id: string | null;
  description: string | null;
  upload_date: string;
  user_id: string;
  profiles: {
    company_name: string | null;
  } | null;
}

export const AdminProofOfDeliveryPanel = () => {
  const [records, setRecords] = useState<ProofOfDeliveryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("proof_of_delivery")
        .select(`
          *,
          profiles!proof_of_delivery_user_id_fkey (
            company_name
          )
        `)
        .order("upload_date", { ascending: false });

      if (error) throw error;

      setRecords(data || []);
    } catch (error) {
      console.error("Error fetching proof of delivery records:", error);
      toast({
        title: "Error",
        description: "Failed to load proof of delivery records",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (record: ProofOfDeliveryRecord) => {
    try {
      const { data, error } = await supabase.storage
        .from("proof-of-delivery")
        .download(record.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = record.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Proof of Delivery</CardTitle>
        <CardDescription>
          All uploaded proof of delivery files from clients
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No proof of delivery files uploaded yet
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Shipment</TableHead>
                <TableHead>Date Uploaded</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">
                    {record.profiles?.company_name || "-"}
                  </TableCell>
                  <TableCell className="max-w-md">
                    {record.description || "-"}
                  </TableCell>
                  <TableCell>
                    {record.shipment_id || "-"}
                  </TableCell>
                  <TableCell>
                    {format(new Date(record.upload_date), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(record)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
