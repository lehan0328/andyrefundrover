import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { refreshOutlookToken } from "../shared/outlook-client.ts";
import { getCorsHeaders } from "../shared/cors.ts";

// Helper to fetch messages directly from Graph API
async function fetchRawOutlookMessages(accessToken: string, params: URLSearchParams) {
  let url = `https://graph.microsoft.com/v1.0/me/messages?${params.toString()}`;
  let allMessages = [];
  
  // Fetch up to 3 pages (approx 600 emails) to prevent timeouts during discovery
  let pageCount = 0;
  const MAX_PAGES = 3;

  while (url && pageCount < MAX_PAGES) {
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) throw new Error(`Outlook API Error: ${res.statusText}`);
    const data = await res.json();
    
    if (data.value) allMessages.push(...data.value);
    
    url = data['@odata.nextLink'] || null;
    pageCount++;
  }
  
  return allMessages;
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
      return new Response(JSON.stringify({ error: 'User not authenticated' }), { status: 401, headers: corsHeaders });
    }

    // 2. Parse request body (optional account_id filter)
    let accountId: string | null = null;
    try {
      const body = await req.json();
      accountId = body?.account_id || null;
    } catch { }

    // 3. Get Credentials
    let credentialsQuery = supabase.from('outlook_credentials').select('*').eq('user_id', user.id);
    if (accountId) credentialsQuery = credentialsQuery.eq('id', accountId);
    const { data: credentialsList, error: credError } = await credentialsQuery;

    if (credError || !credentialsList || credentialsList.length === 0) {
      return new Response(JSON.stringify({ error: 'Outlook not connected' }), { status: 400, headers: corsHeaders });
    }

    const results = {
      accountsProcessed: 0,
      suppliersFound: 0,
      errors: [] as string[]
    };

    // 4. Process each connected Outlook account
    for (const credentials of credentialsList) {
      try {
        console.log(`Starting Supplier Discovery for ${credentials.connected_email}`);

        // A. Refresh Token
        let accessToken: string;
        try {
          accessToken = await refreshOutlookToken(credentials.refresh_token_encrypted);
          
          // Save new token
          await supabase.from('outlook_credentials').update({
              access_token_encrypted: accessToken,
              token_expires_at: new Date(Date.now() + 3600000).toISOString(),
              needs_reauth: false,
            }).eq('id', credentials.id);
        } catch (tokenError) {
          console.error(`Token refresh failed for ${credentials.connected_email}`);
          await supabase.from('outlook_credentials').update({ needs_reauth: true }).eq('id', credentials.id);
          results.errors.push(`Auth error for ${credentials.connected_email}`);
          continue;
        }

        // B. Discovery Logic
        // Look back 90 days for emails with attachments
        const discoveryLookback = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
        
        const params = new URLSearchParams();
        params.append('$filter', `hasAttachments eq true and receivedDateTime ge ${discoveryLookback}`);
        params.append('$expand', 'attachments($select=name,contentType)');
        params.append('$select', 'subject,bodyPreview,from,receivedDateTime,hasAttachments');
        params.append('$top', '200'); // Batch size

        const messages = await fetchRawOutlookMessages(accessToken, params);
        
        const subjectKeywords = ['invoice', 'receipt', 'bill']; 
        const attachmentKeywords = ['invoice', 'inv', 'receipt', 'bill']; 
        
        const newSuppliers = new Map();

        // C. Filter Messages
        for (const message of messages) {
           const senderEmail = message.from?.emailAddress?.address?.toLowerCase();
           if (!senderEmail) continue;

           // Exclude self and known platforms
           if (senderEmail === credentials.connected_email.toLowerCase() ||
               senderEmail.includes('amazon.com') || 
               senderEmail.includes('supabase.com') || 
               senderEmail.includes('stripe.com')) {
               continue;
           }

           if (newSuppliers.has(senderEmail)) continue;

           const subject = (message.subject || '').toLowerCase();
           const bodyPreview = (message.bodyPreview || '').toLowerCase();
           
           // Check Subject/Body
           let isRelevant = subjectKeywords.some(k => subject.includes(k) || bodyPreview.includes(k));

           // Check Attachments names if subject wasn't a hit
           if (!isRelevant && message.attachments && message.attachments.length > 0) {
               isRelevant = message.attachments.some((att: any) => {
                   const name = (att.name || '').toLowerCase();
                   // Must contain keyword AND NOT be a calendar invite
                   return attachmentKeywords.some(k => name.includes(k)) && 
                          !name.includes('invite') && 
                          !name.includes('invitation') && 
                          !name.endsWith('.ics');
               });
           }

           if (isRelevant) {
               newSuppliers.set(senderEmail, {
                  user_id: user.id,
                  email: senderEmail,
                  source_account_id: credentials.id,
                  source_provider: 'outlook',
                  label: 'Auto-Discovered',
                  status: 'suggested' // Important: Mark as suggested so user can approve
               });
           }
        }

        // D. Save Discovered Suppliers
        if (newSuppliers.size > 0) {
            const { error: upsertError } = await supabase
                .from('allowed_supplier_emails')
                .upsert(Array.from(newSuppliers.values()), { 
                  onConflict: 'user_id, email',
                  ignoreDuplicates: true // Don't overwrite if they are already 'active'
                });
            
            if (upsertError) {
              console.error('Database error:', upsertError);
            } else {
              results.suppliersFound += newSuppliers.size;
            }
        }

        results.accountsProcessed++;

      } catch (err: any) {
         console.error(`Discovery error for account ${credentials.id}:`, err);
         results.errors.push(err.message);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      ...results 
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});