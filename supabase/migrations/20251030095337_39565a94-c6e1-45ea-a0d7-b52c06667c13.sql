-- Add RLS policies for invoices storage bucket
CREATE POLICY "Users can upload their own invoices to storage"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'invoices' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own invoice files in storage"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'invoices' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own invoice files from storage"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'invoices' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all invoice files in storage"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'invoices' AND
  has_role(auth.uid(), 'admin'::app_role)
);