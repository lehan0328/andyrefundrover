-- Add RLS policy to allow clients to delete their own notifications
CREATE POLICY "Clients can delete their own notifications"
ON public.missing_invoice_notifications
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.email = missing_invoice_notifications.client_email
      AND profiles.id = auth.uid()
  )
);