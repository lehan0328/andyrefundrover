import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { processInvoiceAttachment } from "../shared/invoice-processing.ts";
import {
  refreshOutlookToken,
  searchOutlookMessages,
  getOutlookAttachments,
  buildOutlookFilter
} from "../shared/outlook-client.ts";
import { getCorsHeaders } from "../shared/cors.ts";

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Outlook KQL for Invoice Discovery
// "invoice OR bill..." in subject or body, AND has attachments, AND received last 30 days
function buildDiscoveryQuery() {
    const keywords = `(invoice OR bill OR receipt OR inv OR "amount due" OR "balance due")`;
    // Microsoft Graph KQL:
    // hasAttachments:true AND received:last30days AND (subject:invoice OR body:invoice ...)
    // Note: 'received' support depends on Graph version, simple approach:
    // We filter date in the API call usually, but KQL "received" keyword is convenient.
    // However, searchOutlookMessages uses $filter OR $search. 
    // Mixing them can be tricky. We will use $search for keywords and manual date filter logic if needed,
    // or just rely on $search="keyword" and process recent ones.
    
    return `hasAttachments:true AND ${keywords}`;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    let accountId: string | null = null;
    let supplierEmailFilter: string | null = null;
    let scanType: 'initial' | 'refresh' = 'refresh';

    try {
      const body = await req.json();
      accountId = body?.account_id || null;
      supplierEmailFilter = body?.supplier_email || null;
      if (body?.scan_type === 'initial') scanType = 'initial';
    } catch { }

    let credentialsQuery = supabase.from('outlook_credentials').select('*').eq('user_id', user.id);
    if (accountId) credentialsQuery = credentialsQuery.eq('id', accountId);
    const { data: credentialsList, error: credError } = await credentialsQuery;

    if (credError || !credentialsList || credentialsList.length === 0) {
      return new Response(JSON.stringify({ error: 'Outlook not connected' }), { status: 400, headers: corsHeaders });
    }

    const allResults = {
      processed: 0,
      invoicesFound: 0,
      errors: [] as string[],
      newSuppliersFound: 0
    };

    for (const credentials of credentialsList) {
      // 1. Refresh Token
      let accessToken: string;
      try {
        accessToken = await refreshOutlookToken(credentials.refresh_token_encrypted);
        await supabase.from('outlook_credentials').update({
            access_token_encrypted: accessToken,
            token_expires_at: new Date(Date.now() + 3600000).toISOString(),
            needs_reauth: false,
          }).eq('id', credentials.id);
      } catch (tokenError) {
        await supabase.from('outlook_credentials').update({ needs_reauth: true }).eq('id', credentials.id);
        allResults.errors.push(`Account ${credentials.connected_email}: Token expired`);
        continue;
      }

      // ---------------------------------------------------------
      // PHASE 1: DISCOVERY (If Initial Sync)
      // ---------------------------------------------------------
      if (scanType === 'initial' && !supplierEmailFilter) {
          console.log(`Starting Discovery for ${credentials.connected_email}`);
          // Using KQL Search
          // Note: To use $search, you often need "ConsistencyLevel: eventual" header in Graph API calls
          // Ensure shared/outlook-client.ts supports this or update it.
          // For now, assuming basic filter capabilities or simple search.
          
          // Fallback Strategy if complex KQL isn't supported by shared helper:
          // We fetch messages from last 30 days and filter in memory if needed, 
          // or assume shared helper `searchOutlookMessages` accepts a raw query string used in $filter or $search.
          
          // Let's rely on standard search
          // Graph API: https://graph.microsoft.com/v1.0/me/messages?$search="invoice OR bill"
          const searchQuery = `"invoice" OR "bill" OR "receipt"`; 
          
          // We modify shared/outlook-client to handle this, or pass a filter string.
          // Assuming buildOutlookFilter produces a $filter string. 
          // We can't mix $filter and $search easily in all endpoints without special headers.
          // Let's stick to the flow: 
          // We will use a filter for date + attachments, and process subject lines manually/lightly here.
          
          const discoveryLookback = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString();
          const discoveryFilter = `hasAttachments eq true and receivedDateTime ge ${discoveryLookback}`;
          
          const messages = await searchOutlookMessages(accessToken, discoveryFilter);
          
          for (const message of messages) {
             const subject = message.subject.toLowerCase();
             // Manual high-level filtering
             if (subject.includes('invoice') || subject.includes('bill') || subject.includes('receipt') || subject.includes('amount due')) {
                 const senderEmail = message.from.emailAddress.address.toLowerCase();
                 // If we found a relevant email, add to allowed list
                 // (Ideally verify attachment is PDF first, done inside process loop usually)
                 
                 const { error: upsertError } = await supabase
                   .from('allowed_supplier_emails')
                   .upsert({
                      user_id: user.id,
                      email: senderEmail,
                      source_account_id: credentials.id,
                      source_provider: 'outlook',
                      label: 'Auto-Discovered'
                   }, { onConflict: 'user_id, email' });
                   
                 if (!upsertError) allResults.newSuppliersFound++;
             }
          }
      }

      // ---------------------------------------------------------
      // PHASE 2: SYNC
      // ---------------------------------------------------------
      let allowedEmails: string[] = [];
      if (supplierEmailFilter) {
        allowedEmails = [supplierEmailFilter];
      } else {
        const { data: supplierEmails } = await supabase
          .from('allowed_supplier_emails')
          .select('email')
          .eq('user_id', user.id)
          .eq('source_provider', 'outlook')
          .eq('source_account_id', credentials.id);
        allowedEmails = (supplierEmails || []).map(s => s.email);
      }

      if (allowedEmails.length === 0) continue;

      // 365 days for initial, 30 for refresh
      const lookbackDays = scanType === 'initial' ? 365 : 30;
      const searchFilter = buildOutlookFilter(allowedEmails, lookbackDays);
      const messages = await searchOutlookMessages(accessToken, searchFilter);

      const { data: processedMessages } = await supabase
        .from('processed_outlook_messages')
        .select('message_id')
        .eq('user_id', user.id);
      const processedIds = new Set((processedMessages || []).map(m => m.message_id));
      const newMessages = messages.filter(m => !processedIds.has(m.id));

      for (const message of newMessages.slice(0, 20)) {
         try {
            const senderEmail = message.from.emailAddress.address.toLowerCase();
            const attachments = await getOutlookAttachments(accessToken, message.id);
            const pdfAttachments = attachments.filter(
                a => a.contentType === 'application/pdf' || a.name.toLowerCase().endsWith('.pdf')
            );
            const createdInvoiceIds: string[] = [];

            for (const attachment of pdfAttachments) {
                if (!attachment.contentBytes) continue;
                const result = await processInvoiceAttachment(
                    supabase,
                    user,
                    {
                        filename: attachment.name,
                        data: base64ToUint8Array(attachment.contentBytes),
                        size: attachment.size,
                        senderEmail
                    },
                    authHeader
                );
                if (result.status === 'processed' && result.invoiceId) {
                    createdInvoiceIds.push(result.invoiceId);
                    allResults.invoicesFound++;
                }
            }

            await supabase.from('processed_outlook_messages').insert({
                user_id: user.id,
                message_id: message.id,
                subject: message.subject,
                sender_email: senderEmail,
                attachment_count: pdfAttachments.length,
                invoice_ids: createdInvoiceIds,
            });
            allResults.processed++;
         } catch (e: any) {
            allResults.errors.push(e.message);
         }
      }
      
       await supabase.from('outlook_credentials').update({ last_sync_at: new Date().toISOString() }).eq('id', credentials.id);
    }

    return new Response(JSON.stringify({ success: true, ...allResults }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});