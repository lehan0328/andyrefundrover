-- Allow admins to update notification statuses (e.g., mark viewed, resolve)
DROP POLICY IF EXISTS "Admins can update notifications" ON public.missing_invoice_notifications;
CREATE POLICY "Admins can update notifications"
ON public.missing_invoice_notifications
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));