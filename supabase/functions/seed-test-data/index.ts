import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../shared/cors.ts";

// Sample test shipment data with realistic Amazon FBA data
const testShipments = [
  {
    shipment_id: "FBA18X9K2ABC",
    shipment_name: "Q1 Restock - Electronics",
    shipment_type: "FBA",
    shipment_status: "CLOSED",
    destination_fulfillment_center: "PHX7",
    items: [
      { sku: "ELEC-001", product_name: "Wireless Bluetooth Earbuds", quantity_shipped: 100, quantity_received: 95 },
      { sku: "ELEC-002", product_name: "USB-C Charging Cable 6ft", quantity_shipped: 200, quantity_received: 200 },
      { sku: "ELEC-003", product_name: "Phone Stand Holder", quantity_shipped: 150, quantity_received: 142 },
    ]
  },
  {
    shipment_id: "FBA18X9K3DEF",
    shipment_name: "Spring Collection - Apparel",
    shipment_type: "FBA",
    shipment_status: "CLOSED",
    destination_fulfillment_center: "ONT8",
    items: [
      { sku: "APP-101", product_name: "Cotton T-Shirt Black XL", quantity_shipped: 50, quantity_received: 50 },
      { sku: "APP-102", product_name: "Cotton T-Shirt White L", quantity_shipped: 75, quantity_received: 68 },
      { sku: "APP-103", product_name: "Denim Jeans 32x32", quantity_shipped: 30, quantity_received: 30 },
    ]
  },
  {
    shipment_id: "FBA18X9K4GHI",
    shipment_name: "Home & Kitchen Restock",
    shipment_type: "FBA",
    shipment_status: "CLOSED",
    destination_fulfillment_center: "DFW7",
    items: [
      { sku: "HOME-201", product_name: "Stainless Steel Mixing Bowls Set", quantity_shipped: 40, quantity_received: 38 },
      { sku: "HOME-202", product_name: "Silicone Spatula Set", quantity_shipped: 80, quantity_received: 80 },
      { sku: "HOME-203", product_name: "Glass Food Storage Containers", quantity_shipped: 60, quantity_received: 52 },
      { sku: "HOME-204", product_name: "Bamboo Cutting Board", quantity_shipped: 45, quantity_received: 45 },
    ]
  },
  {
    shipment_id: "FBA18X9K5JKL",
    shipment_name: "Sports & Outdoors",
    shipment_type: "FBA",
    shipment_status: "CLOSED",
    destination_fulfillment_center: "BFI4",
    items: [
      { sku: "SPORT-301", product_name: "Yoga Mat Premium 6mm", quantity_shipped: 100, quantity_received: 93 },
      { sku: "SPORT-302", product_name: "Resistance Bands Set", quantity_shipped: 120, quantity_received: 120 },
      { sku: "SPORT-303", product_name: "Foam Roller 18 inch", quantity_shipped: 50, quantity_received: 47 },
    ]
  },
  {
    shipment_id: "FBA18X9K6MNO",
    shipment_name: "Beauty & Personal Care",
    shipment_type: "FBA",
    shipment_status: "CLOSED",
    destination_fulfillment_center: "EWR4",
    items: [
      { sku: "BEAUTY-401", product_name: "Organic Face Serum", quantity_shipped: 200, quantity_received: 185 },
      { sku: "BEAUTY-402", product_name: "Makeup Brush Set 12pc", quantity_shipped: 80, quantity_received: 80 },
      { sku: "BEAUTY-403", product_name: "Hair Styling Cream", quantity_shipped: 150, quantity_received: 150 },
    ]
  }
];

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("Authentication failed");
    }

    console.log(`Seeding test data for user: ${user.id}`);

    let shipmentsCreated = 0;
    let itemsCreated = 0;
    let discrepanciesCreated = 0;

    for (const shipmentData of testShipments) {
      // Check if shipment already exists
      const { data: existing } = await supabase
        .from("shipments")
        .select("id")
        .eq("user_id", user.id)
        .eq("shipment_id", shipmentData.shipment_id)
        .maybeSingle();

      if (existing) {
        console.log(`Shipment ${shipmentData.shipment_id} already exists, skipping`);
        continue;
      }

      // Create shipment
      const { data: shipment, error: shipmentError } = await supabase
        .from("shipments")
        .insert({
          user_id: user.id,
          shipment_id: shipmentData.shipment_id,
          shipment_name: shipmentData.shipment_name,
          shipment_type: shipmentData.shipment_type,
          shipment_status: shipmentData.shipment_status,
          destination_fulfillment_center: shipmentData.destination_fulfillment_center,
          created_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          last_updated_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (shipmentError) {
        console.error(`Error creating shipment ${shipmentData.shipment_id}:`, shipmentError);
        continue;
      }

      shipmentsCreated++;
      console.log(`Created shipment: ${shipmentData.shipment_id}`);

      // Create shipment items and discrepancies
      for (const item of shipmentData.items) {
        const { error: itemError } = await supabase
          .from("shipment_items")
          .insert({
            shipment_id: shipment.id,
            sku: item.sku,
            product_name: item.product_name,
            quantity_shipped: item.quantity_shipped,
            quantity_received: item.quantity_received,
          });

        if (itemError) {
          console.error(`Error creating item ${item.sku}:`, itemError);
          continue;
        }

        itemsCreated++;

        // Create discrepancy if there's a difference
        const difference = item.quantity_shipped - item.quantity_received;
        if (difference > 0) {
          const { error: discrepancyError } = await supabase
            .from("shipment_discrepancies")
            .insert({
              shipment_id: shipment.id,
              sku: item.sku,
              product_name: item.product_name,
              expected_quantity: item.quantity_shipped,
              actual_quantity: item.quantity_received,
              difference: difference,
              discrepancy_type: "missing",
              status: "open",
            });

          if (discrepancyError) {
            console.error(`Error creating discrepancy for ${item.sku}:`, discrepancyError);
          } else {
            discrepanciesCreated++;
            console.log(`Created discrepancy for ${item.sku}: ${difference} units missing`);
          }
        }
      }
    }

    console.log(`Seed complete: ${shipmentsCreated} shipments, ${itemsCreated} items, ${discrepanciesCreated} discrepancies`);

    return new Response(
      JSON.stringify({
        success: true,
        shipmentsCreated,
        itemsCreated,
        discrepanciesCreated,
        message: `Created ${shipmentsCreated} shipments with ${discrepanciesCreated} discrepancies for testing`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error seeding test data:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
