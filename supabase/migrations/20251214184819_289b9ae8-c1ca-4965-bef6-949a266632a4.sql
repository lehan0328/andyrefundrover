-- Add needs_reauth column to gmail_credentials
ALTER TABLE public.gmail_credentials 
ADD COLUMN IF NOT EXISTS needs_reauth boolean DEFAULT false;

-- Add needs_reauth column to outlook_credentials
ALTER TABLE public.outlook_credentials 
ADD COLUMN IF NOT EXISTS needs_reauth boolean DEFAULT false;