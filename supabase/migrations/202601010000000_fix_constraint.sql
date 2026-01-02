-- Add unique constraint for shipment items so upsert works
ALTER TABLE public.shipment_items 
ADD CONSTRAINT shipment_items_shipment_id_sku_key 
UNIQUE (shipment_id, sku);

-- Add unique constraint for discrepancies so upsert works
ALTER TABLE public.shipment_discrepancies 
ADD CONSTRAINT shipment_discrepancies_shipment_id_sku_key 
UNIQUE (shipment_id, sku);