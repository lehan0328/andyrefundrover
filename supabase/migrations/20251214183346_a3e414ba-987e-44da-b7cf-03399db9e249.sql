-- Create processed_outlook_messages table to track synced Outlook messages
CREATE TABLE IF NOT EXISTS public.processed_outlook_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message_id TEXT NOT NULL,
  subject TEXT,
  sender_email TEXT,
  attachment_count INTEGER DEFAULT 0,
  invoice_ids UUID[] DEFAULT '{}',
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'processed',
  UNIQUE(user_id, message_id)
);

-- Enable RLS
ALTER TABLE public.processed_outlook_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own processed messages"
  ON public.processed_outlook_messages
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own processed messages"
  ON public.processed_outlook_messages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own processed messages"
  ON public.processed_outlook_messages
  FOR DELETE
  USING (auth.uid() = user_id);