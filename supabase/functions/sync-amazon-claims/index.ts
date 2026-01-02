import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { getCorsHeaders } from "../shared/cors.ts";

// --- Types ---
// (Optional but good practice)
interface AmazonTokenResponse {
  access_token: string;
  expires_in: number;
}

// --- Removed AWS Signature Version 4 Helper Functions ---
// You no longer need hmac, toHex, sha256, or signRequest

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

  const data = await tokenResponse.json();
  return data.access_token;
}

// --- SP-API Reports Helpers (Updated to use LWA-only) ---

// Updated to accept startTime for incremental sync
async function requestReport(accessToken: string, marketplaceId: string, startTime: Date) {
  const endpoint = 'https://sellingpartnerapi-na.amazon.com';
  const path = '/reports/2021-06-30/reports';
  const url = new URL(`${endpoint}${path}`);
  
  const body = JSON.stringify({
    reportType: 'GET_FBA_REIMBURSEMENTS_DATA',
    marketplaceIds: [marketplaceId],
    dataStartTime: startTime.toISOString(),
  });

  const headers = {
    'x-amz-access-token': accessToken,
    'Content-Type': 'application/json',
    'User-Agent': 'MyApp/1.0 (Language=JavaScript; Platform=Deno)',
  };
  
  // DIRECT FETCH - No signing
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: headers,
    body: body,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Request report error:', error);
    throw new Error(`Failed to request report: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.reportId;
}

async function getReportStatus(accessToken: string, reportId: string) {
  const endpoint = 'https://sellingpartnerapi-na.amazon.com';
  const path = `/reports/2021-06-30/reports/${reportId}`;
  const url = new URL(`${endpoint}${path}`);

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

  if (!response.ok) throw new Error('Failed to get report status');
  return await response.json();
}

async function getReportDocument(accessToken: string, reportDocumentId: string) {
  const endpoint = 'https://sellingpartnerapi-na.amazon.com';
  const path = `/reports/2021-06-30/documents/${reportDocumentId}`;
  const url = new URL(`${endpoint}${path}`);

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

  if (!response.ok) throw new Error('Failed to get report document info');
  return await response.json();
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

    // Get credentials AND the specific last_claim_sync_at timestamp
    const { data: credentials, error: credError } = await supabase
      .from('amazon_credentials')
      .select('marketplace_id, refresh_token_encrypted, last_claim_sync_at')
      .eq('user_id', user.id)
      .single();

    if (credError || !credentials?.refresh_token_encrypted) {
      throw new Error('No Amazon credentials found.');
    }

    const marketplaceId = credentials.marketplace_id || 'ATVPDKIKX0DER';
    const accessToken = await getAccessToken(credentials.refresh_token_encrypted);

    // --- Determine Start Date for Incremental Sync ---
    let startTime = new Date();
    // Default to 90 days ago if this is the first sync
    startTime.setDate(startTime.getDate() - 90);

    if (credentials.last_claim_sync_at) {
        const lastSync = new Date(credentials.last_claim_sync_at);
        // Add a 1-day buffer (subtract 1 day from last sync) to ensure we don't miss data 
        // due to timezone differences or Amazon processing delays
        lastSync.setDate(lastSync.getDate() - 1);
        startTime = lastSync;
        console.log(`Incremental Sync: Fetching claims updated after ${startTime.toISOString()}`);
    } else {
        console.log('Full Sync: Fetching last 90 days of claims');
    }

    console.log('Requesting Reimbursements Report...');
    const reportId = await requestReport(accessToken, marketplaceId, startTime);
    console.log('Report requested:', reportId);

    // Poll for status
    let processingStatus = 'IN_PROGRESS';
    let reportDocumentId = null;
    let attempts = 0;
    
    // INCREASED LIMIT: 60 attempts * 5 seconds = 5 minutes max wait
    const MAX_ATTEMPTS = 60; 

    // Polling loop
    while (processingStatus !== 'DONE' && processingStatus !== 'CANCELLED' && processingStatus !== 'FATAL' && attempts < MAX_ATTEMPTS) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Increased wait to 5s to reduce API spam
      const statusData = await getReportStatus(accessToken, reportId);
      processingStatus = statusData.processingStatus;
      console.log(`Report status (${attempts + 1}/${MAX_ATTEMPTS}):`, processingStatus);
      
      if (processingStatus === 'DONE') {
        reportDocumentId = statusData.reportDocumentId;
      }
      attempts++;
    }

    // Check specifically for FATAL to give a better error hint
    if (processingStatus === 'FATAL') {
      console.error(`Report generation failed with FATAL status. Marketplace ID used: ${marketplaceId}`);
      throw new Error(`Report processing failed (FATAL). This usually means the Marketplace ID (${marketplaceId}) is incorrect for this seller account. Please disconnect and reconnect your Amazon account.`);
    }

    if (!reportDocumentId) {
      throw new Error(`Report processing failed or timed out after ${attempts * 5} seconds. Final status: ${processingStatus}`);
    }

    // Get download URL
    const docInfo = await getReportDocument(accessToken, reportDocumentId);
    console.log('Downloading report...');

    // Download
    const downloadRes = await fetch(docInfo.url);
    if (!downloadRes.ok) throw new Error('Failed to download report content');

    let reportText = '';
    // Handle compression
    if (docInfo.compressionAlgorithm === 'GZIP') {
      const blob = await downloadRes.blob();
      const ds = new DecompressionStream('gzip');
      const stream = blob.stream().pipeThrough(ds);
      const decompressedBlob = await new Response(stream).blob();
      reportText = await decompressedBlob.text();
    } else {
      reportText = await downloadRes.text();
    }

    // Parse TSV
    const rows = reportText.split('\n');
    const headers = rows[0].split('\t').map(h => h.trim());
    
    // Map headers to indices based on standard Amazon Reimbursement Report format
    const idx = {
      id: headers.indexOf('reimbursement-id'),
      case: headers.indexOf('case-id'),
      date: headers.indexOf('approval-date'),
      asin: headers.indexOf('asin'),
      sku: headers.indexOf('sku'),
      name: headers.indexOf('product-name'),
      total: headers.indexOf('amount-total'),
      qty: headers.indexOf('quantity-reimbursed-total')
    };

    let syncedCount = 0;

    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i].split('\t');
      if (cols.length < headers.length) continue;

      const claimId = cols[idx.id];
      if (!claimId) continue;

      const amount = parseFloat(cols[idx.total] || '0');
      const qty = parseInt(cols[idx.qty] || '0');
      const dateStr = cols[idx.date] ? new Date(cols[idx.date]).toISOString() : new Date().toISOString();

      // Upsert into claims
      const { error: upsertError } = await supabase
        .from('claims')
        .upsert({
          user_id: user.id,
          claim_id: claimId,
          case_id: cols[idx.case],
          reimbursement_id: claimId,
          asin: cols[idx.asin],
          sku: cols[idx.sku],
          item_name: cols[idx.name] || 'Unknown Item',
          shipment_id: 'PENDING_MATCH', 
          shipment_type: 'FBA',
          amount: amount,
          actual_recovered: amount, // It's a reimbursement, so it's recovered
          status: 'Approved',
          claim_date: dateStr,
          last_updated: new Date().toISOString(),
          total_qty_expected: qty,
          total_qty_received: 0,
          discrepancy: qty,
          company_name: 'Amazon FBA',
        }, {
          onConflict: 'claim_id'
        });

      if (upsertError) {
        console.error('Error syncing claim:', upsertError);
      } else {
        syncedCount++;
      }
    }

    // --- Update Last Claim Sync Time ---
    // Update the timestamp even if syncedCount is 0, so we know we checked up to this point
    await supabase
        .from('amazon_credentials')
        .update({ last_claim_sync_at: new Date().toISOString() })
        .eq('user_id', user.id);

    return new Response(
      JSON.stringify({ success: true, synced: syncedCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Sync claims error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});