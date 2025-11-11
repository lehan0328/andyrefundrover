-- Fix the trigger function to handle duplicates properly
CREATE OR REPLACE FUNCTION public.handle_claim_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shipment_uuid uuid;
  v_existing_discrepancy_id uuid;
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
    
    -- Check if discrepancy already exists
    SELECT id INTO v_existing_discrepancy_id
    FROM shipment_discrepancies
    WHERE shipment_id = v_shipment_uuid
    AND sku = NEW.sku;
    
    IF v_existing_discrepancy_id IS NOT NULL THEN
      -- Update existing discrepancy
      UPDATE shipment_discrepancies
      SET status = 'resolved',
          expected_quantity = NEW.total_qty_expected,
          actual_quantity = NEW.total_qty_received,
          difference = NEW.discrepancy,
          updated_at = NEW.last_updated
      WHERE id = v_existing_discrepancy_id;
    ELSE
      -- Create new discrepancy
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
      );
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$;