import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
        <h3 className="text-lg font-semibold mb-4">Shipments</h3>
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-50 animate-spin" />
            <p>Loading shipments...</p>
          </div>
        ) : !shipments || shipments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No shipments found</p>
            <p className="text-sm mt-2">Click "Sync from Amazon" to fetch your shipments</p>
          </div>
        ) : (
          <div className="space-y-4">
            {shipments.map((shipment) => (
              <Card key={shipment.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold">{shipment.shipment_name || shipment.shipment_id}</h4>
                    <p className="text-sm text-muted-foreground">ID: {shipment.shipment_id}</p>
                    <p className="text-sm text-muted-foreground">Status: {shipment.shipment_status}</p>
                    <p className="text-sm text-muted-foreground">
                      Destination: {shipment.destination_fulfillment_center}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {shipment.shipment_items?.length || 0} items
                    </p>
                    {shipment.shipment_discrepancies && shipment.shipment_discrepancies.length > 0 && (
                      <p className="text-sm text-destructive">
                        {shipment.shipment_discrepancies.length} discrepancies
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default Shipments;
