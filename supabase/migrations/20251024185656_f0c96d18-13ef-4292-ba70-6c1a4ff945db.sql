-- Create claim_invoices table to persist uploaded invoice metadata
CREATE TABLE IF NOT EXISTS public.claim_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  invoice_date DATE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.claim_invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own invoices"
  ON public.claim_invoices
  FOR SELECT
  USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can insert their own invoices"
  ON public.claim_invoices
  FOR INSERT
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete their own invoices"
  ON public.claim_invoices
  FOR DELETE
  USING (auth.uid() = uploaded_by);

CREATE POLICY "Admins can view all invoices"
  ON public.claim_invoices
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete any invoice"
  ON public.claim_invoices
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add updated_at trigger
CREATE TRIGGER update_claim_invoices_updated_at
  BEFORE UPDATE ON public.claim_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create index for faster queries
CREATE INDEX idx_claim_invoices_claim_id ON public.claim_invoices(claim_id);
CREATE INDEX idx_claim_invoices_uploaded_by ON public.claim_invoices(uploaded_by);