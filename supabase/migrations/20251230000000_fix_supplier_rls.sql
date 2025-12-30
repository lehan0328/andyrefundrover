-- Allow users to update their own supplier records
-- This fixes the issue where confirming "Suggested" suppliers failed to update them to "Active"
CREATE POLICY "Users can update their own allowed supplier emails"
ON public.allowed_supplier_emails
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);