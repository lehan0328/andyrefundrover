import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const Shipments = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Shipments</h1>
        <p className="text-muted-foreground mt-2">
          Upload and review shipment data for discrepancy detection
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Upload Shipment Reports</AlertTitle>
        <AlertDescription>
          Upload your Amazon Seller Central shipment reports (CSV or Excel) to automatically
          detect discrepancies between shipped and received quantities.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-8 border-2 border-dashed hover:border-primary transition-colors cursor-pointer">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="rounded-full bg-primary/10 p-6">
              <Upload className="h-12 w-12 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Upload FBA Shipments</h3>
              <p className="text-sm text-muted-foreground">
                Upload CSV or Excel files from Amazon FBA shipment reports
              </p>
            </div>
            <Button>Choose File</Button>
          </div>
        </Card>

        <Card className="p-8 border-2 border-dashed hover:border-secondary transition-colors cursor-pointer">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="rounded-full bg-secondary/10 p-6">
              <FileSpreadsheet className="h-12 w-12 text-secondary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Upload AWD Shipments</h3>
              <p className="text-sm text-muted-foreground">
                Upload CSV or Excel files from Amazon AWD shipment reports
              </p>
            </div>
            <Button variant="secondary">Choose File</Button>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Uploads</h3>
        <div className="text-center py-12 text-muted-foreground">
          <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No shipments uploaded yet</p>
          <p className="text-sm mt-2">Upload your first shipment report to get started</p>
        </div>
      </Card>
    </div>
  );
};

export default Shipments;
