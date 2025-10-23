-- Create storage bucket for claim invoices
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'claim-invoices',
  'claim-invoices',
  false,
  5242880, -- 5MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
);

-- Create RLS policies for claim-invoices bucket
CREATE POLICY "Users can view their own invoice files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'claim-invoices');

CREATE POLICY "Users can upload their own invoice files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'claim-invoices');

CREATE POLICY "Users can update their own invoice files"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'claim-invoices');

CREATE POLICY "Users can delete their own invoice files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'claim-invoices');