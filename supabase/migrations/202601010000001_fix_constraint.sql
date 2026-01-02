ALTER TABLE amazon_credentials 
ADD COLUMN last_shipment_sync_at TIMESTAMPTZ,
ADD COLUMN last_claim_sync_at TIMESTAMPTZ;

-- Optional: Copy the existing value to the new shipment column so you don't lose history
UPDATE amazon_credentials 
SET last_shipment_sync_at = last_sync_at;