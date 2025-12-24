-- Enable realtime for allowed_supplier_emails table
-- This allows the frontend to receive notifications when new suppliers are discovered
ALTER PUBLICATION supabase_realtime ADD TABLE public.allowed_supplier_emails;