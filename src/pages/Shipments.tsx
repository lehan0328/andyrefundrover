import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const Shipments = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: shipments, isLoading } = useQuery({
    queryKey: ['shipments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipments')
        .select('*, shipment_items(*), shipment_discrepancies(*)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('sync-amazon-shipments', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      toast({
        title: "Sync Complete",
        description: `Synced ${data.synced} of ${data.total} shipments from Amazon`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSync = () => {
    setIsSyncing(true);
    syncMutation.mutate();
    setTimeout(() => setIsSyncing(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Shipments</h1>
          <p className="text-muted-foreground mt-2">
            Sync and review shipment data from Amazon
          </p>
        </div>
        <Button onClick={handleSync} disabled={isSyncing || syncMutation.isPending}>
          <RefreshCw className={`h-4 w-4 mr-2 ${(isSyncing || syncMutation.isPending) ? 'animate-spin' : ''}`} />
          Sync from Amazon
        </Button>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Amazon SP-API Integration</AlertTitle>
        <AlertDescription>
          Click "Sync from Amazon" to automatically fetch your FBA shipments and detect discrepancies.
        </AlertDescription>
      </Alert>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Closed Shipments</h3>
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-50 animate-spin" />
            <p>Loading shipments...</p>
          </div>
        ) : !shipments || shipments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No closed shipments found</p>
            <p className="text-sm mt-2">Click "Sync from Amazon" to fetch your shipments</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created Date</TableHead>
                  <TableHead>Last Update Date</TableHead>
                  <TableHead>Shipment ID</TableHead>
                  <TableHead>Seller SKU</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Total Qty Expected</TableHead>
                  <TableHead className="text-right">Total Qty Received</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shipments.flatMap((shipment) =>
                  shipment.shipment_items && shipment.shipment_items.length > 0
                    ? shipment.shipment_items.map((item: any) => (
                        <TableRow key={`${shipment.id}-${item.sku}`}>
                          <TableCell>
                            {shipment.created_date
                              ? new Date(shipment.created_date).toLocaleDateString()
                              : new Date(shipment.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {shipment.last_updated_date
                              ? new Date(shipment.last_updated_date).toLocaleDateString()
                              : new Date(shipment.updated_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium">{shipment.shipment_id}</TableCell>
                          <TableCell>{item.sku}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {item.fnsku || '-'}
                          </TableCell>
                          <TableCell className="text-right">{item.quantity_shipped}</TableCell>
                          <TableCell className="text-right">
                            <span className={item.quantity_received !== item.quantity_shipped ? 'text-destructive font-medium' : ''}>
                              {item.quantity_received}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    : (
                        <TableRow key={shipment.id}>
                          <TableCell>
                            {shipment.created_date
                              ? new Date(shipment.created_date).toLocaleDateString()
                              : new Date(shipment.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {shipment.last_updated_date
                              ? new Date(shipment.last_updated_date).toLocaleDateString()
                              : new Date(shipment.updated_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium">{shipment.shipment_id}</TableCell>
                          <TableCell colSpan={4} className="text-muted-foreground text-center">
                            No items in this shipment
                          </TableCell>
                        </TableRow>
                      )
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Shipments;
