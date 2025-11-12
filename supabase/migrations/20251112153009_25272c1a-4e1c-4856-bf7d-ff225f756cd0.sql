-- Add product_name column to shipment_items table
ALTER TABLE shipment_items 
ADD COLUMN IF NOT EXISTS product_name TEXT;

-- Add product_name column to shipment_discrepancies table for easier querying
ALTER TABLE shipment_discrepancies 
ADD COLUMN IF NOT EXISTS product_name TEXT;