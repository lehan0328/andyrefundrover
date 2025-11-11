-- Enable realtime for claims table
ALTER TABLE public.claims REPLICA IDENTITY FULL;

-- Add claims table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.claims;