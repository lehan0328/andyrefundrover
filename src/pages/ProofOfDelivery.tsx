import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, FileText, Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { CustomerSidebar } from "@/components/layout/CustomerSidebar";
import { Header } from "@/components/layout/Header";

interface ProofOfDeliveryFile {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  upload_date: string;
  user_id: string;
}

const ProofOfDelivery = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState<ProofOfDeliveryFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (user) {
      fetchFiles();
    }
  }, [user]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.storage
        .from("proof-of-delivery")
        .list(user?.id || "", { limit: 100 });

      if (error) throw error;

      // Map storage files to our interface
      const mappedFiles: ProofOfDeliveryFile[] = (data || []).map((file) => ({
        id: file.id,
        file_name: file.name,
        file_path: `${user?.id}/${file.name}`,
        file_size: file.metadata?.size || 0,
        file_type: file.metadata?.mimetype || "unknown",
        upload_date: file.created_at || new Date().toISOString(),
        user_id: user?.id || "",
      }));

      setFiles(mappedFiles);
    } catch (error) {
      console.error("Error fetching proof of delivery files:", error);
      toast({
        title: "Error",
        description: "Failed to load proof of delivery files",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = [
        "application/pdf",
        "image/png",
        "image/jpeg",
      ];

      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload PDF, PNG, or JPG files only",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "File size must be less than 10MB",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    try {
      setUploading(true);

      const filePath = `${user.id}/${Date.now()}_${selectedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("proof-of-delivery")
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      toast({
        title: "Success",
        description: "Proof of delivery uploaded successfully",
      });

      setUploadDialogOpen(false);
      setSelectedFile(null);
      fetchFiles();
    } catch (error) {
      console.error("Error uploading proof of delivery:", error);
      toast({
        title: "Error",
        description: "Failed to upload proof of delivery",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (file: ProofOfDeliveryFile) => {
    try {
      const { data, error } = await supabase.storage
        .from("proof-of-delivery")
        .download(file.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.file_name;
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

  const handleDelete = async (file: ProofOfDeliveryFile) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    try {
      const { error: storageError } = await supabase.storage
        .from("proof-of-delivery")
        .remove([file.file_path]);

      if (storageError) throw storageError;

      toast({
        title: "Success",
        description: "File deleted successfully",
      });

      fetchFiles();
    } catch (error) {
      console.error("Error deleting file:", error);
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="flex h-screen bg-background">
      <CustomerSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Proof of Delivery</h1>
                <p className="text-muted-foreground mt-1">
                  Manage and upload your proof of delivery documents
                </p>
              </div>
              <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload File
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload Proof of Delivery</DialogTitle>
                    <DialogDescription>
                      Upload a PDF, PNG, or JPG file (max 10MB)
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="pod-file">Select File</Label>
                      <Input
                        id="pod-file"
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={handleFileSelect}
                        disabled={uploading}
                      />
                    </div>
                    {selectedFile && (
                      <div className="text-sm text-muted-foreground">
                        Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setUploadDialogOpen(false)}
                        disabled={uploading}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleUpload} disabled={!selectedFile || uploading}>
                        {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Upload
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Your Files</CardTitle>
                <CardDescription>Total Files: {files.length}</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : files.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>No proof of delivery files uploaded yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File Name</TableHead>
                        <TableHead>Date Uploaded</TableHead>
                        <TableHead>File Type</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {files.map((file) => (
                        <TableRow key={file.id}>
                          <TableCell className="font-medium">{file.file_name}</TableCell>
                          <TableCell>
                            {format(new Date(file.upload_date), "MMM dd, yyyy")}
                          </TableCell>
                          <TableCell>
                            <span className="text-xs px-2 py-1 rounded bg-muted">
                              {file.file_type}
                            </span>
                          </TableCell>
                          <TableCell>{formatFileSize(file.file_size)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownload(file)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(file)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProofOfDelivery;
