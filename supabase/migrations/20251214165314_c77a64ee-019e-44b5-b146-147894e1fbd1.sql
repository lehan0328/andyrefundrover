-- Create amazon_cases table for tracking Amazon support cases
CREATE TABLE public.amazon_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id TEXT NOT NULL,
  case_id TEXT NOT NULL,
  case_type TEXT NOT NULL DEFAULT 'reimbursement',
  status TEXT NOT NULL DEFAULT 'open',
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  amazon_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.amazon_cases ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admins can view all cases" 
ON public.amazon_cases 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert cases" 
ON public.amazon_cases 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update cases" 
ON public.amazon_cases 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete cases" 
ON public.amazon_cases 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_amazon_cases_updated_at
BEFORE UPDATE ON public.amazon_cases
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();