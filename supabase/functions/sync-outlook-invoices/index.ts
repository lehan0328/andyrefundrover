import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { processInvoiceAttachment } from "../shared/invoice-processing.ts";
import {
  refreshOutlookToken,
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

// Increased limit and added page safety
async function fetchRawOutlookMessages(accessToken: string, params: URLSearchParams) {
  let url = `https://graph.microsoft.com/v1.0/me/messages?${params.toString()}`;
  let allMessages = [];
  
  // Safety: Fetch up to 10 pages (approx 1000 emails) to avoid timeouts
  // If you have more than 1000 invoices, we might need a different strategy,
  // but this covers 99% of cases.
  let page = 0;
  while (url && page < 20) {
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
    page++;
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

    try {
      const body = await req.json();
      accountId = body?.account_id || null;
      supplierEmailFilter = body?.supplier_email || null;
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
      errors: [] as string[]
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
      // PHASE 2: SYNC
      // ---------------------------------------------------------
      
      const isInitialSync = !credentials.last_sync_at;
      // Lookback: 365 days for initial, 7 days for recurring (increased from 3 to be safe)
      const lookbackDays = isInitialSync ? 365 : 7;
      
      console.log(`Syncing ${credentials.connected_email} (Initial: ${isInitialSync}, Lookback: ${lookbackDays} days)`);

      let allowedEmails: string[] = [];
      if (supplierEmailFilter) {
        allowedEmails = [supplierEmailFilter];
      } else {
        const { data: supplierEmails } = await supabase
          .from('allowed_supplier_emails')
          .select('email')
          .eq('user_id', user.id)
          .eq('source_provider', 'outlook')
          .eq('source_account_id', credentials.id)
          .eq('status', 'active');
        allowedEmails = (supplierEmails || []).map(s => s.email);
      }

      if (allowedEmails.length > 0) {
          const CHUNK_SIZE = 15; 
          const emailChunks = [];
          for (let i = 0; i < allowedEmails.length; i += CHUNK_SIZE) {
              emailChunks.push(allowedEmails.slice(i, i + CHUNK_SIZE));
          }

          const { data: processedMessages } = await supabase
            .from('processed_outlook_messages')
            .select('message_id')
            .eq('user_id', user.id);
          const processedIds = new Set((processedMessages || []).map(m => m.message_id));

          for (const emailChunk of emailChunks) {
              const params = new URLSearchParams();
              params.append('$filter', buildOutlookFilter(emailChunk, lookbackDays));
              params.append('$top', '100'); // Fetch 100 per page
              params.append('$select', 'id,subject,from,receivedDateTime,hasAttachments');
              params.append('$orderby', 'receivedDateTime desc'); // Process newest first

              let messages: any[] = [];
              try {
                messages = await fetchRawOutlookMessages(accessToken, params);
              } catch (e: any) {
                allResults.errors.push(`Sync error: ${e.message}`);
                continue;
              }
              
              const newMessages = messages.filter(m => !processedIds.has(m.id));
              
              // REMOVED: const LIMIT = 20;
              // Now processing ALL found new messages
              console.log(`Found ${newMessages.length} new messages to process.`);

              for (const message of newMessages) {
                 try {
                    const senderEmail = message.from.emailAddress.address.toLowerCase();
                    const attachments = await getOutlookAttachments(accessToken, message.id);
                    
                    const pdfAttachments = attachments.filter(
                        a => a.contentType === 'application/pdf' || a.name.toLowerCase().endsWith('.pdf')
                    );
                    
                    if (pdfAttachments.length === 0) {
                        // Mark as processed so we don't check it again next time
                        await supabase.from('processed_outlook_messages').insert({
                            user_id: user.id,
                            message_id: message.id,
                            subject: message.subject,
                            sender_email: senderEmail,
                            attachment_count: 0,
                            invoice_ids: [],
                        });
                        processedIds.add(message.id);
                        continue;
                    }

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
                        } else if (result.status === 'error') {
                            console.error(`Error processing ${attachment.name}:`, result.error);
                            allResults.errors.push(`File ${attachment.name}: ${result.error}`);
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
                    
                    processedIds.add(message.id);
                    allResults.processed++;
                 } catch (e: any) {
                    allResults.errors.push(`Msg error: ${e.message}`);
                 }
              }
          }
      }
      
       await supabase.from('outlook_credentials').update({ last_sync_at: new Date().toISOString() }).eq('id', credentials.id);
    }
    
    if (allResults.invoicesFound > 0) {
        await supabase.from('missing_invoice_notifications').insert({
           client_email: user.email,
           client_name: 'System',
           company_name: 'Outlook Sync',
           description: `Successfully synced ${allResults.invoicesFound} invoices from Outlook.`,
           status: 'unread',
           document_type: 'sync_report'
        });
    }

    return new Response(JSON.stringify({ success: true, ...allResults }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});