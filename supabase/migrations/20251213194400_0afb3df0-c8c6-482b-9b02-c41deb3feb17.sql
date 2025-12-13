-- Create allowed_supplier_emails table
CREATE TABLE public.allowed_supplier_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, email)
);

-- Enable RLS
ALTER TABLE public.allowed_supplier_emails ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own supplier emails
CREATE POLICY "Users can view own supplier emails" ON public.allowed_supplier_emails FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own supplier emails" ON public.allowed_supplier_emails FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own supplier emails" ON public.allowed_supplier_emails FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can update own supplier emails" ON public.allowed_supplier_emails FOR UPDATE USING (auth.uid() = user_id);

-- Add onboarding_completed column to profiles
ALTER TABLE public.profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;