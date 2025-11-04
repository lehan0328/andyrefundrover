-- Create proof-of-delivery storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('proof-of-delivery', 'proof-of-delivery', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for proof-of-delivery bucket
CREATE POLICY "Users can view their own proof of delivery files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'proof-of-delivery' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own proof of delivery files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'proof-of-delivery' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own proof of delivery files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'proof-of-delivery' AND
  auth.uid()::text = (storage.foldername(name))[1]
);