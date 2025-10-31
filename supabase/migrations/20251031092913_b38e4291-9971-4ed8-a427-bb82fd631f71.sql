-- Drop the existing foreign key constraint
ALTER TABLE missing_invoice_notifications 
DROP CONSTRAINT IF EXISTS missing_invoice_notifications_uploaded_invoice_id_fkey;

-- Add it back with ON DELETE SET NULL
ALTER TABLE missing_invoice_notifications
ADD CONSTRAINT missing_invoice_notifications_uploaded_invoice_id_fkey 
FOREIGN KEY (uploaded_invoice_id) 
REFERENCES invoices(id) 
ON DELETE SET NULL;