-- Create shipments table to store FBA and AWD shipment data
CREATE TABLE public.shipments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shipment_id TEXT NOT NULL,
  shipment_type TEXT NOT NULL CHECK (shipment_type IN ('FBA', 'AWD')),
  shipment_name TEXT,
  destination_fulfillment_center TEXT,
  shipment_status TEXT,
  label_prep_type TEXT,
  ship_from_address JSONB,
  ship_to_address JSONB,
  created_date TIMESTAMP WITH TIME ZONE,
  last_updated_date TIMESTAMP WITH TIME ZONE,
  items JSONB,
  amazon_reference_id TEXT,
  sync_status TEXT DEFAULT 'synced',
  sync_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, shipment_id, shipment_type)
);

-- Create shipment_items table for detailed item tracking
CREATE TABLE public.shipment_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  fnsku TEXT,
  quantity_shipped INTEGER NOT NULL DEFAULT 0,
  quantity_received INTEGER NOT NULL DEFAULT 0,
  quantity_in_case INTEGER,
  prep_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create discrepancies table to track shipping discrepancies
CREATE TABLE public.shipment_discrepancies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  shipment_item_id UUID REFERENCES public.shipment_items(id) ON DELETE CASCADE,
  discrepancy_type TEXT NOT NULL CHECK (discrepancy_type IN ('shortage', 'overage', 'damaged', 'missing')),
  sku TEXT NOT NULL,
  expected_quantity INTEGER NOT NULL,
  actual_quantity INTEGER NOT NULL,
  difference INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create amazon_credentials table to store SP-API configuration per user
CREATE TABLE public.amazon_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  seller_id TEXT NOT NULL,
  marketplace_id TEXT NOT NULL DEFAULT 'ATVPDKIKX0DER',
  refresh_token_encrypted TEXT,
  credentials_status TEXT DEFAULT 'pending' CHECK (credentials_status IN ('pending', 'active', 'expired', 'invalid')),
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_discrepancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amazon_credentials ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shipments
CREATE POLICY "Users can view their own shipments"
ON public.shipments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shipments"
ON public.shipments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shipments"
ON public.shipments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shipments"
ON public.shipments FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for shipment_items
CREATE POLICY "Users can view items from their shipments"
ON public.shipment_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.shipments
  WHERE shipments.id = shipment_items.shipment_id
  AND shipments.user_id = auth.uid()
));

CREATE POLICY "Users can insert items to their shipments"
ON public.shipment_items FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.shipments
  WHERE shipments.id = shipment_items.shipment_id
  AND shipments.user_id = auth.uid()
));

CREATE POLICY "Users can update items in their shipments"
ON public.shipment_items FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.shipments
  WHERE shipments.id = shipment_items.shipment_id
  AND shipments.user_id = auth.uid()
));

CREATE POLICY "Users can delete items from their shipments"
ON public.shipment_items FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.shipments
  WHERE shipments.id = shipment_items.shipment_id
  AND shipments.user_id = auth.uid()
));

-- RLS Policies for discrepancies
CREATE POLICY "Users can view discrepancies from their shipments"
ON public.shipment_discrepancies FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.shipments
  WHERE shipments.id = shipment_discrepancies.shipment_id
  AND shipments.user_id = auth.uid()
));

CREATE POLICY "Users can insert discrepancies to their shipments"
ON public.shipment_discrepancies FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.shipments
  WHERE shipments.id = shipment_discrepancies.shipment_id
  AND shipments.user_id = auth.uid()
));

CREATE POLICY "Users can update discrepancies in their shipments"
ON public.shipment_discrepancies FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.shipments
  WHERE shipments.id = shipment_discrepancies.shipment_id
  AND shipments.user_id = auth.uid()
));

-- RLS Policies for amazon_credentials
CREATE POLICY "Users can view their own credentials"
ON public.amazon_credentials FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credentials"
ON public.amazon_credentials FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credentials"
ON public.amazon_credentials FOR UPDATE
USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX idx_shipments_user_id ON public.shipments(user_id);
CREATE INDEX idx_shipments_status ON public.shipments(shipment_status);
CREATE INDEX idx_shipments_type ON public.shipments(shipment_type);
CREATE INDEX idx_shipment_items_shipment_id ON public.shipment_items(shipment_id);
CREATE INDEX idx_discrepancies_shipment_id ON public.shipment_discrepancies(shipment_id);
CREATE INDEX idx_discrepancies_status ON public.shipment_discrepancies(status);

-- Create trigger for updated_at timestamp
CREATE TRIGGER update_shipments_updated_at
BEFORE UPDATE ON public.shipments
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_shipment_items_updated_at
BEFORE UPDATE ON public.shipment_items
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_discrepancies_updated_at
BEFORE UPDATE ON public.shipment_discrepancies
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_amazon_credentials_updated_at
BEFORE UPDATE ON public.amazon_credentials
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();