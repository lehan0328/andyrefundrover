import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { getCorsHeaders } from "../shared/cors.ts";

// --- Helper functions for AWS Signature Version 4 ---
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

// AWS Signature Version 4 Signing Logic
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
  
  const canonicalUri = parsedUrl.pathname;
  const canonicalQuerystring = parsedUrl.search.substring(1);
  const canonicalHeaders = `host:${host}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-date';
  
  const payloadHash = await sha256(body);
  const canonicalRequest = `${method}\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const hashedCanonicalRequest = await sha256(canonicalRequest);
  const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${hashedCanonicalRequest}`;
  
  let key = await hmac(`AWS4${awsSecretKey}`, dateStamp);
  key = await hmac(key, region);
  key = await hmac(key, service);
  key = await hmac(key, 'aws4_request');
  const signature = toHex(await hmac(key, stringToSign));
  
  const authorizationHeader = `${algorithm} Credential=${awsAccessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  
  return {
    'x-amz-access-token': headers['x-amz-access-token'],
    'Content-Type': headers['Content-Type'],
    'User-Agent': headers['User-Agent'],
    'host': host,
    'x-amz-date': amzDate,
    'Authorization': authorizationHeader,
  };
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

  const data = await tokenResponse.json();
  return data.access_token;
}

// --- SP-API Reports Helpers ---

async function requestReport(accessToken: string, marketplaceId: string) {
  const endpoint = 'https://sellingpartnerapi-na.amazon.com';
  const path = '/reports/2021-06-30/reports';
  const url = new URL(`${endpoint}${path}`);
  
  // Request data for last 90 days
  const startTime = new Date();
  startTime.setDate(startTime.getDate() - 90);

  const body = JSON.stringify({
    reportType: 'GET_FBA_REIMBURSEMENTS_DATA',
    marketplaceIds: [marketplaceId],
    dataStartTime: startTime.toISOString(),
  });

  const baseHeaders = {
    'x-amz-access-token': accessToken,
    'Content-Type': 'application/json',
    'User-Agent': 'MyApp/1.0 (Language=JavaScript; Platform=Deno)',
  };
  
  const signedHeaders = await signRequest('POST', url.toString(), baseHeaders, body);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: signedHeaders,
    body: body,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Request report error:', error);
    throw new Error(`Failed to request report: ${response.status}`);
  }

  const data = await response.json();
  return data.reportId;
}

async function getReportStatus(accessToken: string, reportId: string) {
  const endpoint = 'https://sellingpartnerapi-na.amazon.com';
  const path = `/reports/2021-06-30/reports/${reportId}`;
  const url = new URL(`${endpoint}${path}`);

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

  if (!response.ok) throw new Error('Failed to get report status');
  return await response.json();
}

async function getReportDocument(accessToken: string, reportDocumentId: string) {
  const endpoint = 'https://sellingpartnerapi-na.amazon.com';
  const path = `/reports/2021-06-30/documents/${reportDocumentId}`;
  const url = new URL(`${endpoint}${path}`);

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

    // Get credentials
    const { data: credentials, error: credError } = await supabase
      .from('amazon_credentials')
      .select('marketplace_id, refresh_token_encrypted')
      .eq('user_id', user.id)
      .single();

    if (credError || !credentials?.refresh_token_encrypted) {
      throw new Error('No Amazon credentials found.');
    }

    const marketplaceId = credentials.marketplace_id || 'ATVPDKIKX0DER';
    const accessToken = await getAccessToken(credentials.refresh_token_encrypted);

    console.log('Requesting Reimbursements Report...');
    const reportId = await requestReport(accessToken, marketplaceId);
    console.log('Report requested:', reportId);

    // Poll for status
    let processingStatus = 'IN_PROGRESS';
    let reportDocumentId = null;
    let attempts = 0;

    while (processingStatus !== 'DONE' && processingStatus !== 'CANCELLED' && processingStatus !== 'FATAL' && attempts < 20) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3s
      const statusData = await getReportStatus(accessToken, reportId);
      processingStatus = statusData.processingStatus;
      console.log('Report status:', processingStatus);
      
      if (processingStatus === 'DONE') {
        reportDocumentId = statusData.reportDocumentId;
      }
      attempts++;
    }

    if (!reportDocumentId) {
      throw new Error(`Report processing failed or timed out: ${processingStatus}`);
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