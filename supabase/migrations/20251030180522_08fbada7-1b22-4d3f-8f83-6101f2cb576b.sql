-- Add new columns to missing_invoice_notifications
ALTER TABLE missing_invoice_notifications
ADD COLUMN uploaded_invoice_id uuid REFERENCES invoices(id),
ADD COLUMN resolved_at timestamp with time zone,
ADD COLUMN resolved_by uuid;

-- Update status type to include new statuses
ALTER TABLE missing_invoice_notifications
DROP CONSTRAINT IF EXISTS missing_invoice_notifications_status_check;

ALTER TABLE missing_invoice_notifications
ADD CONSTRAINT missing_invoice_notifications_status_check 
CHECK (status IN ('unread', 'invoice_uploaded', 'resolved'));

-- Create index for better query performance
CREATE INDEX idx_missing_invoice_notifications_status ON missing_invoice_notifications(status);
CREATE INDEX idx_missing_invoice_notifications_uploaded_invoice ON missing_invoice_notifications(uploaded_invoice_id);