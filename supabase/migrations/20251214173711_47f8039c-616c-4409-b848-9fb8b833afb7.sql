-- Create outlook_credentials table
CREATE TABLE public.outlook_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token_encrypted text,
  refresh_token_encrypted text NOT NULL,
  token_expires_at timestamp with time zone,
  connected_email text NOT NULL,
  sync_enabled boolean DEFAULT true,
  last_sync_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, connected_email)
);

-- Enable RLS
ALTER TABLE public.outlook_credentials ENABLE ROW LEVEL SECURITY;

-- RLS policies for outlook_credentials
CREATE POLICY "Users can view their own Outlook credentials"
ON public.outlook_credentials FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Outlook credentials"
ON public.outlook_credentials FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Outlook credentials"
ON public.outlook_credentials FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Outlook credentials"
ON public.outlook_credentials FOR DELETE
USING (auth.uid() = user_id);

-- Drop existing unique constraint on gmail_credentials (user_id only)
-- and add new unique constraint on (user_id, connected_email)
ALTER TABLE public.gmail_credentials DROP CONSTRAINT IF EXISTS gmail_credentials_user_id_key;
ALTER TABLE public.gmail_credentials ADD CONSTRAINT gmail_credentials_user_id_email_key UNIQUE (user_id, connected_email);