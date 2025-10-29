-- Add company_name column to profiles table to link users to their companies
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_name TEXT;

-- Update kevin@gmail.com to be associated with ABC Client
UPDATE public.profiles 
SET company_name = 'ABC Client'
WHERE email = 'kevin@gmail.com';