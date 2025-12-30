import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Import Shared Modules
import * as Gmail from "../shared/gmail-client.ts";
import { processInvoiceAttachment } from "../shared/invoice-processing.ts";
import { getCorsHeaders } from "../shared/cors.ts";

// Helper to convert Base64 strings to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper to fetch messages directly with pagination (Matching Outlook Logic)
async function fetchRawGmailMessages(accessToken: string, query: string) {
  let messages: Gmail.GmailMessage[] = [];
  let nextPageToken: string | undefined = undefined;
  let page = 0;
  const MAX_PAGES = 10; // Fetch up to 10 pages (~1000 emails)

  do {
    let url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=100`;
    if (nextPageToken) {
      url += `&pageToken=${nextPageToken}`;
    }

    console.log(`[DEBUG] Fetching Gmail page ${page + 1}...`);
    
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
       const txt = await res.text();
       throw new Error(`Gmail API Error ${res.status}: ${txt}`);
    }

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
    // 1. Authentication & Setup
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'User not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Parse Input
    let accountId: string | null = null;
    let supplierEmailFilter: string | null = null;
    let forceFullScan = false;
    
    try {
      const body = await req.json();
      accountId = body?.account_id || null;
      supplierEmailFilter = body?.supplier_email || null;
      if (body?.scan_type === 'initial') forceFullScan = true;
    } catch { }

    // 3. Get Credentials
    let credentialsQuery = supabase
      .from('gmail_credentials')
      .select('*')
      .eq('user_id', user.id);
    
    if (accountId) credentialsQuery = credentialsQuery.eq('id', accountId);
    
    const { data: credentialsList, error: credError } = await credentialsQuery;

    if (credError || !credentialsList || credentialsList.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Gmail not connected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const allResults = {
      processed: 0,
      invoicesFound: 0,
      pdfsScanned: 0,
      errors: [] as string[],
    };

    // Process each credential
    for (const credentials of credentialsList) {
      console.log(`Processing Gmail account: ${credentials.connected_email}`);

      // 4. Refresh Token
      let accessToken: string;
      try {
        accessToken = await Gmail.refreshGmailToken(credentials.refresh_token_encrypted);
        
        await supabase
          .from('gmail_credentials')
          .update({
            access_token_encrypted: accessToken,
            token_expires_at: new Date(Date.now() + 3600000).toISOString(),
            needs_reauth: false,
          })
          .eq('id', credentials.id);
      } catch (tokenError) {
        console.error(`Token refresh failed for ${credentials.connected_email}:`, tokenError);
        await supabase.from('gmail_credentials').update({ needs_reauth: true }).eq('id', credentials.id);
        allResults.errors.push(`Account ${credentials.connected_email}: Token expired`);
        continue;
      }

      // ---------------------------------------------------------
      // PHASE: SYNC (Using Allowed Suppliers)
      // ---------------------------------------------------------
      
      const isInitialSync = !credentials.last_sync_at || forceFullScan;
      const lookbackDays = isInitialSync ? 365 : 7; 
      
      console.log(`Syncing ${credentials.connected_email} (Full Scan: ${isInitialSync}, Lookback: ${lookbackDays} days)`);

      // 5. Get Allowed Suppliers
      let allowedEmails: string[] = [];
      if (supplierEmailFilter) {
        allowedEmails = [supplierEmailFilter];
      } else {
        const { data: supplierEmails } = await supabase
          .from('allowed_supplier_emails')
          .select('email')
          .eq('user_id', user.id)
          .eq('source_account_id', credentials.id)
          .eq('source_provider', 'gmail')
          .eq('status', 'active');
        
        allowedEmails = (supplierEmails || []).map(s => s.email);
      }

      if (allowedEmails.length === 0) {
        console.log(`No active suppliers for ${credentials.connected_email}`);
        continue;
      }

      // 6. Process in Chunks (Avoid Query Length Limits)
      const CHUNK_SIZE = 15;
      const emailChunks = [];
      for (let i = 0; i < allowedEmails.length; i += CHUNK_SIZE) {
        emailChunks.push(allowedEmails.slice(i, i + CHUNK_SIZE));
      }

      // Get processed IDs cache
      const { data: processedMessagesData } = await supabase
        .from('processed_gmail_messages')
        .select('message_id')
        .eq('user_id', user.id);
      
      const processedIds = new Set((processedMessagesData || []).map(m => m.message_id));

      for (const chunk of emailChunks) {
        // Build Query for this chunk
        const normalizedEmails = chunk.map(email => email.toLowerCase());
        const fromFilter = normalizedEmails.map(email => `from:${email}`).join(' OR ');
        const searchQuery = `(${fromFilter}) has:attachment filename:pdf newer_than:${lookbackDays}d`;

        console.log(`[DEBUG] Fetching chunk of ${chunk.length} suppliers...`);

        let messages: any[] = [];
        try {
          messages = await fetchRawGmailMessages(accessToken, searchQuery);
        } catch (e: any) {
          console.error(`[ERROR] Sync Fetch Error:`, e);
          allResults.errors.push(`Sync error: ${e.message}`);
          continue;
        }

        const newMessages = messages.filter(m => !processedIds.has(m.id));
        console.log(`[DEBUG] Found ${messages.length} total, ${newMessages.length} new.`);

        // 7. Process Messages Loop
        for (const message of newMessages) { 
          try {
            const details = await Gmail.getGmailMessageDetails(accessToken, message.id);
            
            const headers = details.payload.headers;
            const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '';
            const fromHeader = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
            const senderEmail = Gmail.extractEmail(fromHeader);
            
            const pdfAttachments = Gmail.findPdfParts(details.payload);
            const invoiceIds: string[] = [];

            if (pdfAttachments.length === 0) {
                // Mark as processed even if no PDF to avoid re-fetch
                await supabase.from('processed_gmail_messages').insert({
                    user_id: user.id,
                    message_id: message.id,
                    thread_id: message.threadId,
                    subject,
                    sender_email: senderEmail,
                    attachment_count: 0,
                    invoice_ids: [],
                });
                processedIds.add(message.id);
                continue;
            }

            for (const attachment of pdfAttachments) {
              try {
                allResults.pdfsScanned++;
                
                const attachmentData = await Gmail.getGmailAttachment(accessToken, message.id, attachment.attachmentId);
                const base64Data = Gmail.base64UrlToBase64(attachmentData);
                const fileBytes = base64ToUint8Array(base64Data);

                const processResult = await processInvoiceAttachment(
                  supabase,
                  user,
                  {
                    filename: attachment.filename,
                    data: fileBytes,
                    size: attachment.size,
                    senderEmail: senderEmail
                  },
                  { Authorization: authHeader }
                );

                if (processResult.status === 'processed' && processResult.invoiceId) {
                  invoiceIds.push(processResult.invoiceId);
                  allResults.invoicesFound++;
                  console.log(`[SUCCESS] Processed invoice: ${processResult.invoiceId}`);
                } else if (processResult.status === 'error') {
                  allResults.errors.push(`Attachment error: ${processResult.error}`);
                }
              } catch (attachError: any) {
                allResults.errors.push(`Attachment processing error: ${attachError.message}`);
              }
            }

            await supabase
              .from('processed_gmail_messages')
              .insert({
                user_id: user.id,
                message_id: message.id,
                thread_id: message.threadId,
                subject,
                sender_email: senderEmail,
                attachment_count: pdfAttachments.length,
                invoice_ids: invoiceIds,
              });
            
            processedIds.add(message.id);
            allResults.processed++;

          } catch (msgError: any) {
            allResults.errors.push(`Message ${message.id}: ${msgError.message}`);
          }
        }
      }

      // 8. Update Last Sync
      await supabase
        .from('gmail_credentials')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', credentials.id);
    }

    // Notify user if invoices were found
    if (allResults.invoicesFound > 0) {
      await supabase
        .from('missing_invoice_notifications')
        .insert({
           client_email: user.email,
           client_name: 'System',
           company_name: 'Gmail Sync',
           description: `Successfully synced ${allResults.invoicesFound} invoices from Gmail.`,
           status: 'unread',
           document_type: 'sync_report'
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...allResults,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in sync-gmail-invoices:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});