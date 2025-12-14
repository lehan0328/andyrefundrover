-- Add email account association columns to allowed_supplier_emails
ALTER TABLE public.allowed_supplier_emails 
ADD COLUMN source_account_id uuid,
ADD COLUMN source_provider text CHECK (source_provider IN ('gmail', 'outlook'));