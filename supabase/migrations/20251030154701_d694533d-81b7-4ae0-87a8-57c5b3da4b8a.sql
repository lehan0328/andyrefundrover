-- Create missing invoice notifications table
CREATE TABLE public.missing_invoice_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_email TEXT NOT NULL,
  client_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  shipment_id TEXT,
  claim_ids TEXT[],
  missing_count INTEGER,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'unread',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.missing_invoice_notifications ENABLE ROW LEVEL SECURITY;

-- Allow clients to view their own notifications
CREATE POLICY "Clients can view their own notifications"
ON public.missing_invoice_notifications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.email = missing_invoice_notifications.client_email
    AND profiles.id = auth.uid()
  )
);

-- Allow admins to insert notifications
CREATE POLICY "Admins can insert notifications"
ON public.missing_invoice_notifications
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow clients to update their own notification status
CREATE POLICY "Clients can update their own notification status"
ON public.missing_invoice_notifications
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.email = missing_invoice_notifications.client_email
    AND profiles.id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.email = missing_invoice_notifications.client_email
    AND profiles.id = auth.uid()
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_missing_invoice_notifications_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_missing_invoice_notifications_updated_at
BEFORE UPDATE ON public.missing_invoice_notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_missing_invoice_notifications_timestamp();