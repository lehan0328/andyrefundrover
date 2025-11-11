-- Create claims table to store claim data
CREATE TABLE IF NOT EXISTS public.claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id text NOT NULL UNIQUE,
  case_id text,
  reimbursement_id text,
  asin text,
  sku text NOT NULL,
  item_name text NOT NULL,
  shipment_id text NOT NULL,
  shipment_type text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  actual_recovered numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Pending',
  claim_date date NOT NULL,
  last_updated timestamp with time zone NOT NULL DEFAULT now(),
  feedback text,
  total_qty_expected integer NOT NULL,
  total_qty_received integer NOT NULL,
  discrepancy integer NOT NULL,
  company_name text,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

-- Policies for claims table
CREATE POLICY "Admins can view all claims"
  ON public.claims FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert claims"
  ON public.claims FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update claims"
  ON public.claims FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete claims"
  ON public.claims FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own claims"
  ON public.claims FOR SELECT
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_claims_status ON public.claims(status);
CREATE INDEX idx_claims_user_id ON public.claims(user_id);
CREATE INDEX idx_claims_shipment_id ON public.claims(shipment_id);

-- Create trigger to update updated_at
CREATE TRIGGER update_claims_updated_at
  BEFORE UPDATE ON public.claims
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create function to auto-create shipment discrepancy when claim is approved
CREATE OR REPLACE FUNCTION public.handle_claim_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shipment_uuid uuid;
BEGIN
  -- Only proceed if status changed to 'Approved'
  IF NEW.status = 'Approved' AND (OLD.status IS NULL OR OLD.status != 'Approved') THEN
    
    -- Get or create shipment record
    SELECT id INTO v_shipment_uuid
    FROM shipments
    WHERE shipment_id = NEW.shipment_id;
    
    -- If shipment doesn't exist, create it
    IF v_shipment_uuid IS NULL THEN
      INSERT INTO shipments (
        shipment_id,
        user_id,
        shipment_type,
        created_date,
        last_updated_date
      ) VALUES (
        NEW.shipment_id,
        NEW.user_id,
        NEW.shipment_type,
        NEW.claim_date,
        NEW.last_updated
      )
      RETURNING id INTO v_shipment_uuid;
    END IF;
    
    -- Create or update shipment discrepancy with resolved status
    INSERT INTO shipment_discrepancies (
      shipment_id,
      sku,
      expected_quantity,
      actual_quantity,
      difference,
      discrepancy_type,
      status,
      created_at,
      updated_at
    ) VALUES (
      v_shipment_uuid,
      NEW.sku,
      NEW.total_qty_expected,
      NEW.total_qty_received,
      NEW.discrepancy,
      'missing',
      'resolved',
      NEW.claim_date,
      NEW.last_updated
    )
    ON CONFLICT (shipment_id, sku) 
    DO UPDATE SET
      status = 'resolved',
      expected_quantity = EXCLUDED.expected_quantity,
      actual_quantity = EXCLUDED.actual_quantity,
      difference = EXCLUDED.difference,
      updated_at = EXCLUDED.updated_at;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically sync approved claims to billing
CREATE TRIGGER sync_approved_claims_to_billing
  AFTER INSERT OR UPDATE ON public.claims
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_claim_approval();