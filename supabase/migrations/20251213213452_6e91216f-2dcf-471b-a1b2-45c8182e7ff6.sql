-- Allow users to delete their own processed Gmail messages (enables re-sync)
CREATE POLICY "Users can delete their own processed messages"
ON public.processed_gmail_messages
FOR DELETE
USING (auth.uid() = user_id);