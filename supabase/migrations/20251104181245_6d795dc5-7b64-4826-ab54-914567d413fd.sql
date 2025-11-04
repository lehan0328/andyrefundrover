-- Create proof_of_delivery table to track POD files with metadata
CREATE TABLE IF NOT EXISTS public.proof_of_delivery (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  shipment_id TEXT,
  description TEXT,
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.proof_of_delivery ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own proof of delivery records"
ON public.proof_of_delivery
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own proof of delivery records"
ON public.proof_of_delivery
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own proof of delivery records"
ON public.proof_of_delivery
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_proof_of_delivery_updated_at
BEFORE UPDATE ON public.proof_of_delivery
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();