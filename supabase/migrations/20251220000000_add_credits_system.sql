-- Add credits_balance column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS credits_balance NUMERIC DEFAULT 0;

-- Function to add $100 credit upon onboarding completion
CREATE OR REPLACE FUNCTION public.handle_onboarding_credit()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if onboarding_completed changed from false/null to true
  IF (OLD.onboarding_completed IS NULL OR OLD.onboarding_completed = false) AND NEW.onboarding_completed = true THEN
    -- Add $100 credit
    NEW.credits_balance := COALESCE(OLD.credits_balance, 0) + 100;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS on_onboarding_completed ON public.profiles;
CREATE TRIGGER on_onboarding_completed
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_onboarding_credit();

-- Allow users to read their own credit balance
-- (Assuming existing SELECT policy on profiles covers this, but ensuring clarity)