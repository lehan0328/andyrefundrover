import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as Gmail from "../shared/gmail-client.ts";
import { getCorsHeaders } from "../shared/cors.ts";
import { decrypt } from "../shared/crypto.ts"; // <--- 1. Import decrypt

// The "Discovery" query for finding new suppliers
const DISCOVERY_QUERY = `has:attachment filename:pdf -in:trash -in:spam -label:promotions -from:me (filename:(invoice OR bill OR receipt OR inv) OR subject:(invoice OR receipt OR bill) OR "amount due" OR "balance due")`;

// Helper to fetch messages directly with pagination for discovery depth
async function fetchDiscoveryMessages(accessToken: string, query: string) {
  let messages: Gmail.GmailMessage[] = [];
  let nextPageToken: string | undefined = undefined;
  let page = 0;
  const MAX_PAGES = 3; // Fetch up to 3 pages (~300 emails) for discovery

  do {
    let url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=100`;
    if (nextPageToken) {
      url += `&pageToken=${nextPageToken}`;
    }
    
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) break; // Stop on error but return what we have

    const data = await res.json();
    if (data.messages) {
      messages = [...messages, ...data.messages];
    }
    
    nextPageToken = data.nextPageToken;
    page++;

  } while (nextPageToken && page < MAX_PAGES);

  return messages;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authorization required');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'User not authenticated' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Parse Request
    let accountId: string | null = null;
    try {
      const body = await req.json();
      accountId = body?.account_id || null;
    } catch { }

    // 3. Get Credentials
    let credentialsQuery = supabase.from('gmail_credentials').select('*').eq('user_id', user.id);
    if (accountId) credentialsQuery = credentialsQuery.eq('id', accountId);
    
    const { data: credentialsList, error: credError } = await credentialsQuery;

    if (credError || !credentialsList || credentialsList.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Gmail not connected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = {
      accountsProcessed: 0,
      suppliersFound: 0,
      errors: [] as string[]
    };

    // 4. Process Accounts
    for (const credentials of credentialsList) {
      console.log(`Starting Supplier Discovery for ${credentials.connected_email}`);
      
      try {
        // Refresh Token
        let accessToken: string;
        try {
          // <--- 2. Decrypt the refresh token before using it
          const refreshToken = await decrypt(credentials.refresh_token_encrypted);
          accessToken = await Gmail.refreshGmailToken(refreshToken);
          
          // Note: We don't re-save the access token here because discovery is a one-off read-only operation,
          // but you could if you wanted to optimize subsequent calls.
        } catch (tokenError) {
          console.error(`Token refresh failed for ${credentials.connected_email}`, tokenError);
          await supabase.from('gmail_credentials').update({ needs_reauth: true }).eq('id', credentials.id);
          results.errors.push(`Auth error for ${credentials.connected_email}`);
          continue;
        }

        // Search Gmail (Last 30 days)
        const discoverySearch = `${DISCOVERY_QUERY} newer_than:30d`;
        const messages = await fetchDiscoveryMessages(accessToken, discoverySearch);
        
        console.log(`Discovery: Found ${messages.length} potential emails in ${credentials.connected_email}`);
        
        const newSuppliers = new Map();

        for (const message of messages) {
          try {
            const details = await Gmail.getGmailMessageDetails(accessToken, message.id);
            const fromHeader = details.payload.headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
            const senderEmail = Gmail.extractEmail(fromHeader);
            
            if (!senderEmail || 
                senderEmail === credentials.connected_email.toLowerCase() || 
                newSuppliers.has(senderEmail)) {
                continue;
            }

            // Verify it actually has PDF parts before suggesting
            const pdfAttachments = Gmail.findPdfParts(details.payload);
            
            if (pdfAttachments.length > 0) {
               newSuppliers.set(senderEmail, {
                  user_id: user.id,
                  email: senderEmail,
                  source_account_id: credentials.id,
                  source_provider: 'gmail',
                  label: 'Discovered',
                  status: 'suggested' // Wait for user approval
               });
            }
          } catch (err) {
             // Ignore individual message errors
          }
        }

        // Batch Upsert Suppliers
        if (newSuppliers.size > 0) {
           const { error: upsertError } = await supabase
             .from('allowed_supplier_emails')
             .upsert(Array.from(newSuppliers.values()), { 
                onConflict: 'user_id, email',
                ignoreDuplicates: true 
             });

           if (upsertError) console.error('DB Error:', upsertError);
           else results.suppliersFound += newSuppliers.size;
        }

        results.accountsProcessed++;

      } catch (err: any) {
        console.error(`Error processing account ${credentials.id}:`, err);
        results.errors.push(err.message);
      }
    }

    return new Response(
      JSON.stringify({ success: true, ...results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});