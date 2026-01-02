import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { getCorsHeaders } from "../shared/cors.ts";

// --- Types ---

interface AmazonTokenResponse {
  access_token: string;
  expires_in: number;
}

interface ShipmentItem {
  SellerSKU: string;
  FulfillmentNetworkSKU?: string;
  QuantityShipped: number;
  QuantityReceived: number;
}

interface Shipment {
  ShipmentId: string;
  ShipmentName?: string;
  DestinationFulfillmentCenterId?: string;
  ShipmentStatus?: string;
  AreCasesRequired?: boolean;
  CreatedDate?: string;
  LastUpdatedDate?: string;
}

// --- Helpers ---

async function fetchProductName(accessToken: string, fnsku: string, marketplaceId: string): Promise<string | null> {
  try {
    const endpoint = 'https://sellingpartnerapi-na.amazon.com';
    const path = `/catalog/2022-04-01/items/${fnsku}`;
    
    const url = new URL(`${endpoint}${path}`);
    url.searchParams.append('marketplaceIds', marketplaceId);
    url.searchParams.append('includedData', 'summaries');

    const headers = {
      'x-amz-access-token': accessToken,
      'Content-Type': 'application/json',
      'User-Agent': 'MyApp/1.0 (Language=JavaScript; Platform=Deno)',
    };
    
    // DIRECT FETCH - No signing
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: headers,
    });

    if (response.ok) {
      const data = await response.json();
      const title = data.summaries?.[0]?.itemName || data.summaries?.[0]?.title;
      if (title) {
        // console.log(`Found product name for ${fnsku}: ${title}`);
        return title;
      }
    }
  } catch (error) {
    console.warn(`Could not fetch product name for ${fnsku}:`, error);
  }
  
  return null;
}

async function getAccessToken(refreshToken: string): Promise<string> {
  const clientId = Deno.env.get('AMAZON_CLIENT_ID');
  const clientSecret = Deno.env.get('AMAZON_CLIENT_SECRET');

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
  
  const allShipments: Shipment[] = [];
  let nextToken: string | undefined;

  do {
    const url = new URL(`${endpoint}${path}`);
    url.searchParams.append('MarketplaceId', marketplaceId);
    
    // Only add these params on the first request; NextToken handles context on subsequent requests
    if (!nextToken) {
        url.searchParams.append('ShipmentStatusList', 'CLOSED,RECEIVING,IN_TRANSIT,DELIVERED,CHECKED_IN');
        
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        url.searchParams.append('LastUpdatedAfter', startDate.toISOString());
    } else {
        url.searchParams.append('NextToken', nextToken);
    }

    console.log('Fetching shipments page...');

    const headers = {
      'x-amz-access-token': accessToken,
      'Content-Type': 'application/json',
      'User-Agent': 'MyApp/1.0 (Language=JavaScript; Platform=Deno)',
    };
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: headers,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Shipments fetch error:', error);
      throw new Error(`Failed to fetch shipments: ${response.status}`);
    }

    const data = await response.json();
    const shipmentData = data.payload?.ShipmentData || [];
    allShipments.push(...shipmentData);

    // Check if there is a next page
    nextToken = data.payload?.NextToken;

  } while (nextToken); // Continue while a NextToken exists

  return allShipments;
}

async function fetchShipmentItems(accessToken: string, shipmentId: string, marketplaceId: string) {
  const endpoint = 'https://sellingpartnerapi-na.amazon.com';
  const path = `/fba/inbound/v0/shipments/${shipmentId}/items`;
  
  const url = new URL(`${endpoint}${path}`);
  url.searchParams.append('MarketplaceId', marketplaceId);

  const headers = {
    'x-amz-access-token': accessToken,
    'Content-Type': 'application/json',
    'User-Agent': 'MyApp/1.0 (Language=JavaScript; Platform=Deno)',
  };
  
  // DIRECT FETCH - No signing
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: headers,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Items fetch error for ${shipmentId}:`, error);
    return [];
  }

  const data = await response.json();
  return data.payload?.ItemData || [];
}

// --- Main Handler ---

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

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
    const { data: credentials, error: credError } = await supabase
      .from('amazon_credentials')
      .select('marketplace_id, refresh_token_encrypted')
      .eq('user_id', user.id)
      .single();

    if (credError || !credentials?.refresh_token_encrypted) {
      throw new Error('No Amazon credentials found. Please connect your Amazon account first.');
    }

    const marketplaceId = credentials.marketplace_id || 'ATVPDKIKX0DER';

    // Get access token using user's refresh token
    const accessToken = await getAccessToken(credentials.refresh_token_encrypted);
    console.log('Got access token');

    // Fetch shipments
    const shipments: Shipment[] = await fetchShipments(accessToken, marketplaceId);
    console.log(`Found ${shipments.length} shipments`);

    let syncedCount = 0;
    const errors: string[] = [];

    // Process shipments
    for (const shipment of shipments) {
      try {
        // Upsert shipment
        // FIX: onConflict now matches UNIQUE(user_id, shipment_id, shipment_type)
        const { data: shipmentData, error: shipmentError } = await supabase
          .from('shipments')
          .upsert({
            user_id: user.id,
            shipment_id: shipment.ShipmentId,
            shipment_type: 'FBA',
            shipment_name: shipment.ShipmentName,
            destination_fulfillment_center: shipment.DestinationFulfillmentCenterId,
            shipment_status: shipment.ShipmentStatus,
            created_date: shipment.CreatedDate,
            last_updated_date: shipment.LastUpdatedDate,
            sync_status: 'synced',
            sync_error: null,
          }, {
            onConflict: 'user_id,shipment_id,shipment_type', 
          })
          .select()
          .single();

        if (shipmentError) {
          console.error(`Error upserting shipment ${shipment.ShipmentId}:`, shipmentError);
          errors.push(`${shipment.ShipmentId}: ${shipmentError.message}`);
          continue;
        }

        // Fetch items for this shipment
        const items: ShipmentItem[] = await fetchShipmentItems(accessToken, shipment.ShipmentId, marketplaceId);

        // Upsert shipment items with product names
        for (const item of items) {
          // Try to fetch product name if available (and not too expensive)
          let productName = null;
          // Optimization: Only fetch product name if we don't have it locally or caching logic needed
          // For now, simple logic:
          if (item.FulfillmentNetworkSKU) {
            productName = await fetchProductName(accessToken, item.FulfillmentNetworkSKU, marketplaceId);
          }

          const { error: itemError } = await supabase
            .from('shipment_items')
            .upsert({
              shipment_id: shipmentData.id,
              sku: item.SellerSKU,
              fnsku: item.FulfillmentNetworkSKU,
              quantity_shipped: item.QuantityShipped,
              quantity_received: item.QuantityReceived,
              product_name: productName,
            }, {
              onConflict: 'shipment_id,sku', // Ensure you added this constraint in SQL!
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
                expected_quantity: item.QuantityShipped,
                actual_quantity: item.QuantityReceived,
                difference: Math.abs(difference),
                discrepancy_type: difference > 0 ? 'overage' : 'shortage', // Simplification
                status: 'open',
              }, {
                onConflict: 'shipment_id,sku', // Ensure you added this constraint in SQL!
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