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

// Wrapped fetch with logging
async function fetchRawOutlookMessages(accessToken: string, params: URLSearchParams) {
  let url = `https://graph.microsoft.com/v1.0/me/messages?${params.toString()}`;
  let allMessages = [];
  let page = 0;
  
  // DEBUG: Log the URL we are hitting (without full token)
  console.log(`[DEBUG] Fetching messages URL: ${url.substring(0, 100)}...`);

  while (url && page < 20) {
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
        const txt = await res.text();
        console.error(`[ERROR] Outlook API Failed [${res.status}]: ${txt}`);
        throw new Error(`Outlook API Error ${res.status}: ${txt}`);
    }
    
    const data = await res.json();
    const count = data.value ? data.value.length : 0;
    console.log(`[DEBUG] Page ${page} fetched: ${count} messages`);
    
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
        console.error(`[ERROR] Token refresh failed:`, tokenError);
        await supabase.from('outlook_credentials').update({ needs_reauth: true }).eq('id', credentials.id);
        allResults.errors.push(`Account ${credentials.connected_email}: Token expired`);
        continue;
      }

      // ---------------------------------------------------------
      // PHASE 2: SYNC
      // ---------------------------------------------------------
      
      const isInitialSync = !credentials.last_sync_at;
      const lookbackDays = isInitialSync ? 365 : 7;
      
      console.log(`Syncing ${credentials.connected_email} (Initial: ${isInitialSync}, Lookback: ${lookbackDays} days)`);

      let allowedEmails: string[] = [];
      if (supplierEmailFilter) {
        allowedEmails = [supplierEmailFilter];
      } else {
        const { data: supplierEmails, error: suppError } = await supabase
          .from('allowed_supplier_emails')
          .select('email')
          .eq('user_id', user.id)
          .eq('source_provider', 'outlook')
          .eq('source_account_id', credentials.id)
          .eq('status', 'active');
        
        if (suppError) console.error("[ERROR] Failed to fetch allowed emails:", suppError);
        
        allowedEmails = (supplierEmails || []).map(s => s.email);
      }
      
      console.log(`[DEBUG] Found ${allowedEmails.length} allowed supplier emails for this account.`);

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
              const filterStr = buildOutlookFilter(emailChunk, lookbackDays);
              params.append('$filter', filterStr);
              params.append('$top', '100'); 
              params.append('$select', 'id,subject,from,receivedDateTime,hasAttachments');
              params.append('$orderby', 'receivedDateTime desc');

              console.log(`[DEBUG] Requesting Outlook messages with filter length: ${filterStr.length}`);

              let messages: any[] = [];
              try {
                messages = await fetchRawOutlookMessages(accessToken, params);
              } catch (e: any) {
                // IMPORTANT: Log the error explicitly
                console.error(`[ERROR] Sync Fetch Error:`, e);
                allResults.errors.push(`Sync error: ${e.message}`);
                continue;
              }
              
              const newMessages = messages.filter(m => !processedIds.has(m.id));
              console.log(`[DEBUG] Found ${messages.length} total messages, ${newMessages.length} are new.`);

              for (const message of newMessages) {
                 try {
                    const senderEmail = message.from.emailAddress.address.toLowerCase();
                    console.log(`[DEBUG] Processing message from: ${senderEmail} | Subject: ${message.subject}`);
                    
                    const attachments = await getOutlookAttachments(accessToken, message.id);
                    const pdfAttachments = attachments.filter(
                        a => a.contentType === 'application/pdf' || a.name.toLowerCase().endsWith('.pdf')
                    );
                    
                    if (pdfAttachments.length === 0) {
                        console.log(`[DEBUG] Skipped ${senderEmail}: No PDF attachments.`);
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
                        console.log(`[DEBUG] Processing attachment: ${attachment.name} (${attachment.size} bytes)`);

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
                            console.log(`[SUCCESS] Invoice Created: ${result.invoiceId}`);
                            createdInvoiceIds.push(result.invoiceId);
                            allResults.invoicesFound++;
                        } else if (result.status === 'error') {
                            console.error(`[ERROR] Processing ${attachment.name}:`, result.error);
                            allResults.errors.push(`File ${attachment.name}: ${result.error}`);
                        } else {
                            console.log(`[INFO] Skipped ${attachment.name}: ${result.error}`);
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
                    console.error(`[ERROR] Message Loop Error:`, e);
                    allResults.errors.push(`Msg error: ${e.message}`);
                 }
              }
          }
      } else {
          console.warn("[WARN] No allowed emails found. Skipping sync.");
      }
      
      // Update last sync time only if we didn't crash
      console.log(`[DEBUG] Finished sync for ${credentials.connected_email}. Updating last_sync_at.`);
      await supabase.from('outlook_credentials').update({ last_sync_at: new Date().toISOString() }).eq('id', credentials.id);
    }
    
    // Notify User Logic
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
    console.error("[FATAL] Function Crash:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});