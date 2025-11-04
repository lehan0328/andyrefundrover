-- Drop the existing check constraint
ALTER TABLE public.missing_invoice_notifications
DROP CONSTRAINT IF EXISTS missing_invoice_notifications_status_check;

-- Add the new constraint with proof_of_delivery_uploaded status
ALTER TABLE public.missing_invoice_notifications
ADD CONSTRAINT missing_invoice_notifications_status_check
CHECK (status IN ('unread', 'read', 'invoice_uploaded', 'proof_of_delivery_uploaded', 'resolved'));