-- Add bill_sent_at column to track when bills are sent to clients
ALTER TABLE public.claims
ADD COLUMN bill_sent_at timestamp with time zone;