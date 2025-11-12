import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper functions for AWS Signature Version 4
async function hmac(key: ArrayBuffer | string, message: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyData = typeof key === 'string' ? encoder.encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return toHex(hash);
}

// AWS Signature Version 4
async function signRequest(
  method: string,
  url: string,
  headers: Record<string, string>,
  body: string = ''
): Promise<Record<string, string>> {
  const awsAccessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
  const awsSecretKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
  
  if (!awsAccessKeyId || !awsSecretKey) {
    throw new Error('Missing AWS credentials');
  }

  const parsedUrl = new URL(url);
  const host = parsedUrl.hostname;
  const region = 'us-east-1';
  const service = 'execute-api';
  
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.substring(0, 8);
  
  // Get the LWA access token from headers
  const accessToken = headers['x-amz-access-token'] || '';
  
  // Create canonical request with x-amz-access-token included
  const canonicalUri = parsedUrl.pathname;
  const canonicalQuerystring = parsedUrl.search.substring(1);
  const canonicalHeaders = `host:${host}\nuser-agent:${headers['User-Agent']}\nx-amz-access-token:${accessToken}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;user-agent;x-amz-access-token;x-amz-date';
  
  const payloadHash = await sha256(body);
  const canonicalRequest = `${method}\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  
  // Create string to sign
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const hashedCanonicalRequest = await sha256(canonicalRequest);
  const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${hashedCanonicalRequest}`;
  
  // Calculate signature
  let key = await hmac(`AWS4${awsSecretKey}`, dateStamp);
  key = await hmac(key, region);
  key = await hmac(key, service);
  key = await hmac(key, 'aws4_request');
  const signature = toHex(await hmac(key, stringToSign));
  
  // Create authorization header
  const authorizationHeader = `${algorithm} Credential=${awsAccessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  
  return {
    ...headers,
    'host': host,
    'x-amz-date': amzDate,
    'Authorization': authorizationHeader,
  };
}

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

async function fetchProductName(accessToken: string, fnsku: string, marketplaceId: string): Promise<string | null> {
  try {
    const endpoint = 'https://sellingpartnerapi-na.amazon.com';
    const path = `/catalog/2022-04-01/items/${fnsku}`;
    
    const url = new URL(`${endpoint}${path}`);
    url.searchParams.append('marketplaceIds', marketplaceId);
    url.searchParams.append('includedData', 'summaries');

    const baseHeaders = {
      'x-amz-access-token': accessToken,
      'Content-Type': 'application/json',
      'User-Agent': 'MyApp/1.0 (Language=JavaScript; Platform=Deno)',
    };
    
    const signedHeaders = await signRequest('GET', url.toString(), baseHeaders);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: signedHeaders,
    });

    if (response.ok) {
      const data = await response.json();
      const title = data.summaries?.[0]?.itemName || data.summaries?.[0]?.title;
      if (title) {
        console.log(`Found product name for ${fnsku}: ${title}`);
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
  
  const url = new URL(`${endpoint}${path}`);
  url.searchParams.append('MarketplaceId', marketplaceId);
  url.searchParams.append('ShipmentStatusList', 'CLOSED');

  console.log('Fetching shipments from:', url.toString());

  const baseHeaders = {
    'x-amz-access-token': accessToken,
    'Content-Type': 'application/json',
    'User-Agent': 'MyApp/1.0 (Language=JavaScript; Platform=Deno)',
  };
  
  const signedHeaders = await signRequest('GET', url.toString(), baseHeaders);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: signedHeaders,
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

  const baseHeaders = {
    'x-amz-access-token': accessToken,
    'Content-Type': 'application/json',
    'User-Agent': 'MyApp/1.0 (Language=JavaScript; Platform=Deno)',
  };
  
  const signedHeaders = await signRequest('GET', url.toString(), baseHeaders);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: signedHeaders,
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

        // Upsert shipment items with product names
        for (const item of items) {
          // Try to fetch product name
          let productName = null;
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
                product_name: productName,
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
