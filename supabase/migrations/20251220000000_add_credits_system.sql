-- 1. Remove the old onboarding trigger and function (if they exist)
DROP TRIGGER IF EXISTS on_onboarding_completed ON public.profiles;
DROP FUNCTION IF EXISTS public.handle_onboarding_credit();

-- 2. Add credits columns to profiles (if not already there)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS credits_balance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS welcome_credit_received BOOLEAN DEFAULT false;