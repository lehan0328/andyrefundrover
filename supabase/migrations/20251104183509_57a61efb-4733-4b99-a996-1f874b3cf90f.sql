-- Add RLS policy for admins to view all proof of delivery records
CREATE POLICY "Admins can view all proof of delivery records"
ON public.proof_of_delivery
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));