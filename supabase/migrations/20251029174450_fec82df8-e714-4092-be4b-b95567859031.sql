-- Enable RLS on customers table
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Allow admins to view all customers
CREATE POLICY "Admins can view all customers"
ON public.customers
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to insert customers
CREATE POLICY "Admins can insert customers"
ON public.customers
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update customers
CREATE POLICY "Admins can update customers"
ON public.customers
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete customers
CREATE POLICY "Admins can delete customers"
ON public.customers
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));