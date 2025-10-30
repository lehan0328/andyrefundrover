
-- Create a function that allows clients to mark their notification as invoice_uploaded
CREATE OR REPLACE FUNCTION public.update_notification_invoice_status(
  p_notification_id uuid,
  p_invoice_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_email text;
  v_user_email text;
BEGIN
  -- Get the notification's client email
  SELECT client_email INTO v_client_email
  FROM missing_invoice_notifications
  WHERE id = p_notification_id;

  -- Get the current user's email from profiles
  SELECT email INTO v_user_email
  FROM profiles
  WHERE id = auth.uid();

  -- Check if emails match
  IF v_client_email IS NULL OR v_user_email IS NULL OR v_client_email != v_user_email THEN
    RETURN false;
  END IF;

  -- Update the notification
  UPDATE missing_invoice_notifications
  SET 
    status = 'invoice_uploaded',
    uploaded_invoice_id = p_invoice_id,
    updated_at = now()
  WHERE id = p_notification_id
    AND client_email = v_user_email;

  RETURN FOUND;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_notification_invoice_status(uuid, uuid) TO authenticated;
