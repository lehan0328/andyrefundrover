-- Add status column to allowed_supplier_emails
ALTER TABLE public.allowed_supplier_emails 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- Add check constraint for status
ALTER TABLE public.allowed_supplier_emails 
ADD CONSTRAINT allowed_supplier_emails_status_check 
CHECK (status IN ('active', 'suggested', 'ignored'));

-- Update existing entries to be active
UPDATE public.allowed_supplier_emails SET status = 'active' WHERE status IS NULL;

-- Modify missing_invoice_notifications to support sync reports
-- First drop the existing constraint
ALTER TABLE public.missing_invoice_notifications 
DROP CONSTRAINT IF EXISTS check_document_type;

-- Re-add constraint with 'sync_report' included
ALTER TABLE public.missing_invoice_notifications 
ADD CONSTRAINT check_document_type 
CHECK (document_type IN ('invoice', 'proof_of_delivery', 'sync_report'));