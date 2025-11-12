-- Add DELETE policy for amazon_credentials table
CREATE POLICY "Users can delete their own credentials"
ON amazon_credentials
FOR DELETE
USING (auth.uid() = user_id);