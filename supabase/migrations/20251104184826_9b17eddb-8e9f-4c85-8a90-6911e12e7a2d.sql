-- Add document_type column to missing_invoice_notifications table
ALTER TABLE public.missing_invoice_notifications
ADD COLUMN IF NOT EXISTS document_type TEXT NOT NULL DEFAULT 'invoice';

-- Add a check constraint to ensure document_type is either 'invoice' or 'proof_of_delivery'
ALTER TABLE public.missing_invoice_notifications
ADD CONSTRAINT check_document_type 
CHECK (document_type IN ('invoice', 'proof_of_delivery'));