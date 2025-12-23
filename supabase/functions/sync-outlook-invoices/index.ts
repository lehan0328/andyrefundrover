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
      // PHASE 1: DISCOVERY (High Efficiency)
      // ---------------------------------------------------------
      if (scanType === 'initial' && !supplierEmailFilter) {
          console.log(`Starting Optimized Discovery for ${credentials.connected_email}`);
          
          const discoveryLookback = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString();
          
          // Use OData $expand to get attachment metadata in the same call
          // We filter for PDFs/files implicitly by checking names in the loop
          const discoveryFilter = `hasAttachments eq true and receivedDateTime ge ${discoveryLookback}`;
          
          const messages = await searchOutlookMessages(accessToken, discoveryFilter, {
            expand: 'attachments($select=name,contentType)',
            select: 'subject,bodyPreview,from,receivedDateTime'
          });
          
          const keywords = ['invoice', 'inv'];
          const newSuppliers = new Map(); // Use a Map to deduplicate locally before DB ops

          for (const message of messages) {
             const senderEmail = message.from?.emailAddress?.address?.toLowerCase();
             if (!senderEmail) continue;

             const subject = (message.subject || '').toLowerCase();
             const bodyPreview = (message.bodyPreview || '').toLowerCase();
             
             // 1. Check Subject & Body (Instant local check)
             let isRelevant = keywords.some(k => subject.includes(k) || bodyPreview.includes(k));

             // 2. Check Attachment Names (Instant local check - data is already here!)
             if (!isRelevant && message.attachments && message.attachments.length > 0) {
                 isRelevant = message.attachments.some((att: any) => {
                     const name = (att.name || '').toLowerCase();
                     const isPdf = att.contentType?.toLowerCase().includes('pdf') || name.endsWith('.pdf');
                     return isPdf && keywords.some(k => name.includes(k));
                 });
             }

             if (isRelevant) {
                 // Store in map to avoid duplicate DB calls for the same sender
                 if (!newSuppliers.has(senderEmail)) {
                     newSuppliers.set(senderEmail, {
                        user_id: user.id,
                        email: senderEmail,
                        source_account_id: credentials.id,
                        source_provider: 'outlook',
                        label: 'Auto-Discovered'
                     });
                 }
             }
          }

          // Batch insert/upsert all found suppliers at once
          if (newSuppliers.size > 0) {
              const { error: upsertError } = await supabase
                  .from('allowed_supplier_emails')
                  .upsert(Array.from(newSuppliers.values()), { onConflict: 'user_id, email' });
              
              if (!upsertError) {
                allResults.newSuppliersFound += newSuppliers.size;
                console.log(`Discovery complete. Found ${newSuppliers.size} new suppliers.`);
              } else {
                console.error("Failed to save discovered suppliers:", upsertError);
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

      // If discovery found nothing and user added nothing manually, we can't sync
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