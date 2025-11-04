-- Add foreign key constraint from proof_of_delivery to profiles
ALTER TABLE public.proof_of_delivery
ADD CONSTRAINT proof_of_delivery_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;