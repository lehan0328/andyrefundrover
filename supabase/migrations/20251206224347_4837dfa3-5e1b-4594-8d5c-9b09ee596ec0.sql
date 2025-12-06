-- Create gmail_credentials table for storing OAuth tokens
CREATE TABLE public.gmail_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  connected_email TEXT NOT NULL,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create processed_gmail_messages table for tracking processed emails
CREATE TABLE public.processed_gmail_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL,
  thread_id TEXT,
  subject TEXT,
  sender_email TEXT,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  attachment_count INTEGER DEFAULT 0,
  invoice_ids UUID[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'processed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, message_id)
);

-- Enable RLS on both tables
ALTER TABLE public.gmail_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processed_gmail_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for gmail_credentials
CREATE POLICY "Users can view their own Gmail credentials"
  ON public.gmail_credentials FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Gmail credentials"
  ON public.gmail_credentials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Gmail credentials"
  ON public.gmail_credentials FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Gmail credentials"
  ON public.gmail_credentials FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for processed_gmail_messages
CREATE POLICY "Users can view their own processed messages"
  ON public.processed_gmail_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own processed messages"
  ON public.processed_gmail_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create updated_at trigger for gmail_credentials
CREATE TRIGGER update_gmail_credentials_updated_at
  BEFORE UPDATE ON public.gmail_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();