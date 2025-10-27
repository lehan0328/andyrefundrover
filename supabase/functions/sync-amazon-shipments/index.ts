import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AmazonTokenResponse {
  access_token: string;
  expires_in: number;
}

interface ShipmentItem {
  SellerSKU: string;
  FulfillmentNetworkSKU?: string;
  QuantityShipped: number;
  QuantityReceived: number;
  QuantityInCase?: number;
  PrepDetailsList?: any[];
}

interface Shipment {
  ShipmentId: string;
  ShipmentName?: string;
  ShipFromAddress?: any;
  DestinationFulfillmentCenterId?: string;
  ShipmentStatus?: string;
  LabelPrepType?: string;
  AreCasesRequired?: boolean;
  CreatedDate?: string;
  LastUpdatedDate?: string;
}

async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get('AMAZON_CLIENT_ID');
  const clientSecret = Deno.env.get('AMAZON_CLIENT_SECRET');
  const refreshToken = Deno.env.get('AMAZON_REFRESH_TOKEN');

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing Amazon credentials');
  }

  const tokenResponse = await fetch('https://api.amazon.com/auth/o2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    console.error('Token error:', error);
    throw new Error(`Failed to get access token: ${tokenResponse.status}`);
  }

  const data: AmazonTokenResponse = await tokenResponse.json();
  return data.access_token;
}

async function fetchShipments(accessToken: string, marketplaceId: string) {
  const endpoint = 'https://sellingpartnerapi-na.amazon.com';
  const path = '/fba/inbound/v0/shipments';
  
  const url = new URL(`${endpoint}${path}`);
  url.searchParams.append('MarketplaceId', marketplaceId);
  url.searchParams.append('ShipmentStatusList', 'CLOSED');

  console.log('Fetching shipments from:', url.toString());

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'x-amz-access-token': accessToken,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Shipments fetch error:', error);
    throw new Error(`Failed to fetch shipments: ${response.status}`);
  }

  const data = await response.json();
  return data.payload?.ShipmentData || [];
}

async function fetchShipmentItems(accessToken: string, shipmentId: string, marketplaceId: string) {
  const endpoint = 'https://sellingpartnerapi-na.amazon.com';
  const path = `/fba/inbound/v0/shipments/${shipmentId}/items`;
  
  const url = new URL(`${endpoint}${path}`);
  url.searchParams.append('MarketplaceId', marketplaceId);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'x-amz-access-token': accessToken,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Items fetch error for ${shipmentId}:`, error);
    return [];
  }

  const data = await response.json();
  return data.payload?.ItemData || [];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('Syncing shipments for user:', user.id);

    // Get user's Amazon credentials
    const { data: credentials } = await supabase
      .from('amazon_credentials')
      .select('marketplace_id')
      .eq('user_id', user.id)
      .single();

    const marketplaceId = credentials?.marketplace_id || 'ATVPDKIKX0DER';

    // Get access token
    const accessToken = await getAccessToken();
    console.log('Got access token');

    // Fetch shipments
    const shipments: Shipment[] = await fetchShipments(accessToken, marketplaceId);
    console.log(`Found ${shipments.length} shipments`);

    let syncedCount = 0;
    const errors: string[] = [];

    for (const shipment of shipments) {
      try {
        // Fetch items for this shipment
        const items: ShipmentItem[] = await fetchShipmentItems(accessToken, shipment.ShipmentId, marketplaceId);

        // Upsert shipment
        const { data: shipmentData, error: shipmentError } = await supabase
          .from('shipments')
          .upsert({
            user_id: user.id,
            shipment_id: shipment.ShipmentId,
            shipment_type: 'FBA',
            shipment_name: shipment.ShipmentName,
            destination_fulfillment_center: shipment.DestinationFulfillmentCenterId,
            shipment_status: shipment.ShipmentStatus,
            label_prep_type: shipment.LabelPrepType,
            ship_from_address: shipment.ShipFromAddress,
            created_date: shipment.CreatedDate,
            last_updated_date: shipment.LastUpdatedDate,
            sync_status: 'synced',
            sync_error: null,
          }, {
            onConflict: 'shipment_id,user_id',
          })
          .select()
          .single();

        if (shipmentError) {
          console.error(`Error upserting shipment ${shipment.ShipmentId}:`, shipmentError);
          errors.push(`${shipment.ShipmentId}: ${shipmentError.message}`);
          continue;
        }

        // Upsert shipment items
        for (const item of items) {
          const { error: itemError } = await supabase
            .from('shipment_items')
            .upsert({
              shipment_id: shipmentData.id,
              sku: item.SellerSKU,
              fnsku: item.FulfillmentNetworkSKU,
              quantity_shipped: item.QuantityShipped,
              quantity_received: item.QuantityReceived,
              quantity_in_case: item.QuantityInCase,
              prep_details: item.PrepDetailsList,
            }, {
              onConflict: 'shipment_id,sku',
            });

          if (itemError) {
            console.error(`Error upserting item ${item.SellerSKU}:`, itemError);
          }

          // Check for discrepancies
          const difference = item.QuantityReceived - item.QuantityShipped;
          if (difference !== 0) {
            await supabase
              .from('shipment_discrepancies')
              .upsert({
                shipment_id: shipmentData.id,
                sku: item.SellerSKU,
                discrepancy_type: difference > 0 ? 'overage' : 'shortage',
                expected_quantity: item.QuantityShipped,
                actual_quantity: item.QuantityReceived,
                difference: Math.abs(difference),
                status: 'open',
              }, {
                onConflict: 'shipment_id,sku',
              });
          }
        }

        syncedCount++;
      } catch (error: any) {
        console.error(`Error processing shipment ${shipment.ShipmentId}:`, error);
        errors.push(`${shipment.ShipmentId}: ${error.message}`);
      }
    }

    // Update credentials last sync time
    await supabase
      .from('amazon_credentials')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('user_id', user.id);

    return new Response(
      JSON.stringify({
        success: true,
        synced: syncedCount,
        total: shipments.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
