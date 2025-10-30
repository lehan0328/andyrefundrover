-- Fix function search_path security issue
CREATE OR REPLACE FUNCTION public.update_missing_invoice_notifications_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;