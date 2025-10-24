-- Create storage policies for claim-invoices bucket if they don't exist

-- Allow authenticated users to upload files to claim-invoices
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow authenticated users to upload claim invoices'
  ) THEN
    CREATE POLICY "Allow authenticated users to upload claim invoices"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'claim-invoices');
  END IF;
END $$;

-- Allow authenticated users to read their uploaded files
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow authenticated users to read claim invoices'
  ) THEN
    CREATE POLICY "Allow authenticated users to read claim invoices"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'claim-invoices');
  END IF;
END $$;

-- Allow authenticated users to delete their uploaded files
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow authenticated users to delete claim invoices'
  ) THEN
    CREATE POLICY "Allow authenticated users to delete claim invoices"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'claim-invoices');
  END IF;
END $$;