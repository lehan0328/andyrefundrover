-- Add RLS policy for admins to view all notifications
CREATE POLICY "Admins can view all notifications"
ON public.missing_invoice_notifications
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));