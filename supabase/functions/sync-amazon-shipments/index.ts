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

// Optimization: Concurrency Limiter to prevent rate limiting
async function processInBatches<T>(items: T[], batchSize: number, task: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(task));
  }
}

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
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: headers,
    });

    if (response.ok) {
      const data = await response.json();
      const title = data.summaries?.[0]?.itemName || data.summaries?.[0]?.title;
      return title;
    }
  } catch (error) {
    // console.warn(`Could not fetch product name for ${fnsku}:`, error);
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
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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

// Optimization: Accept a startDate to enable incremental syncing
async function fetchShipments(accessToken: string, marketplaceId: string, startDate?: string) {
  const endpoint = 'https://sellingpartnerapi-na.amazon.com';
  const path = '/fba/inbound/v0/shipments';
  
  const allShipments: Shipment[] = [];
  let nextToken: string | undefined;

  // Default to 1 year ago if no start date provided
  const defaultStart = new Date();
  defaultStart.setFullYear(defaultStart.getFullYear() - 1);
  const validStartDate = startDate ? new Date(startDate) : defaultStart;

  do {
    const url = new URL(`${endpoint}${path}`);
    url.searchParams.append('MarketplaceId', marketplaceId);
    
    if (!nextToken) {
        url.searchParams.append('QueryType', 'DATE_RANGE'); 
        url.searchParams.append('ShipmentStatusList', 'CLOSED,RECEIVING,IN_TRANSIT,DELIVERED,CHECKED_IN');
        url.searchParams.append('LastUpdatedAfter', validStartDate.toISOString());
        url.searchParams.append('LastUpdatedBefore', new Date().toISOString());
    } else {
        url.searchParams.append('QueryType', 'NEXT_TOKEN');
        url.searchParams.append('NextToken', nextToken);
    }

    console.log(`Fetching shipments (QueryType: ${nextToken ? 'NEXT_TOKEN' : 'DATE_RANGE'})...`);

    const headers = {
      'x-amz-access-token': accessToken,
      'Content-Type': 'application/json',
      'User-Agent': 'MyApp/1.0 (Language=JavaScript; Platform=Deno)',
    };
    
    const response = await fetch(url.toString(), { method: 'GET', headers: headers });

    if (!response.ok) {
      const error = await response.text();
      console.error('Shipments fetch error:', error);
      throw new Error(`Failed to fetch shipments: ${response.status}`);
    }

    const data = await response.json();
    const shipmentData = data.payload?.ShipmentData || [];
    allShipments.push(...shipmentData);

    nextToken = data.payload?.NextToken;

  } while (nextToken);

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
  
  const response = await fetch(url.toString(), { method: 'GET', headers: headers });

  if (!response.ok) {
    console.error(`Items fetch error for ${shipmentId}`);
    return [];
  }

  const data = await response.json();
  return data.payload?.ItemData || [];
}

// --- Main Handler ---

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) throw new Error('Unauthorized');

    console.log('Syncing shipments for user:', user.id);

    // Get user's Amazon credentials AND last sync time
    const { data: credentials, error: credError } = await supabase
      .from('amazon_credentials')
      .select('marketplace_id, refresh_token_encrypted, last_sync_at')
      .eq('user_id', user.id)
      .single();

    if (credError || !credentials?.refresh_token_encrypted) {
      throw new Error('No Amazon credentials found.');
    }

    const marketplaceId = credentials.marketplace_id || 'ATVPDKIKX0DER';
    const accessToken = await getAccessToken(credentials.refresh_token_encrypted);
    
    // Optimization 1: Use last_sync_at to only fetch new/updated shipments
    // Subtract 1 day buffer to ensure no overlap overlap
    let syncStartDate: string | undefined;
    if (credentials.last_sync_at) {
        const lastSync = new Date(credentials.last_sync_at);
        lastSync.setDate(lastSync.getDate() - 1);
        syncStartDate = lastSync.toISOString();
    }

    // Fetch shipments
    const shipments: Shipment[] = await fetchShipments(accessToken, marketplaceId, syncStartDate);
    console.log(`Found ${shipments.length} shipments to process`);

    let syncedCount = 0;
    const errors: string[] = [];

    // Optimization 2: Process in batches of 5 concurrently
    await processInBatches(shipments, 5, async (shipment) => {
      try {
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
          }, {
            onConflict: 'user_id,shipment_id,shipment_type', 
          })
          .select()
          .single();

        if (shipmentError) throw shipmentError;

        // Fetch items
        const items: ShipmentItem[] = await fetchShipmentItems(accessToken, shipment.ShipmentId, marketplaceId);

        // Process Items
        for (const item of items) {
            // Optimization 3: Only fetch product name if we haven't seen this SKU before?
            // For now, we skip product name fetching if network bandwidth is tight, 
            // or perform it. If timeouts persist, comment out the next 3 lines.
            let productName = null;
            if (item.FulfillmentNetworkSKU) {
                // productName = await fetchProductName(accessToken, item.FulfillmentNetworkSKU, marketplaceId);
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
                onConflict: 'shipment_id,sku',
            });

            if (itemError) console.error(`Item upsert error: ${itemError.message}`);

            // Discrepancy Check
            const difference = item.QuantityReceived - item.QuantityShipped;
            if (difference !== 0) {
            await supabase.from('shipment_discrepancies').upsert({
                shipment_id: shipmentData.id,
                sku: item.SellerSKU,
                expected_quantity: item.QuantityShipped,
                actual_quantity: item.QuantityReceived,
                difference: Math.abs(difference),
                discrepancy_type: difference > 0 ? 'overage' : 'shortage',
                status: 'open',
            }, { onConflict: 'shipment_id,sku' });
            }
        }
        syncedCount++;
      } catch (error: any) {
        console.error(`Error processing ${shipment.ShipmentId}:`, error.message);
        errors.push(`${shipment.ShipmentId}: ${error.message}`);
      }
    });

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
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});