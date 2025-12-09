-- Create waitlist table for signup requests
CREATE TABLE public.waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  company_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
);

-- Enable RLS
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Only admins can view and manage waitlist
CREATE POLICY "Admins can view all waitlist entries"
ON public.waitlist
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update waitlist entries"
ON public.waitlist
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete waitlist entries"
ON public.waitlist
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Anyone can insert (join waitlist)
CREATE POLICY "Anyone can join waitlist"
ON public.waitlist
FOR INSERT
WITH CHECK (true);