import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Shared helpers
import { processInvoiceAttachment } from "../shared/invoice-processing.ts";
import {
  refreshGmailToken,
  searchGmailMessages,
  getGmailMessageDetails,
  getGmailAttachment,
  findPdfParts,
  extractEmail,
  base64UrlToBase64
} from "../shared/gmail-client.ts";
import {
  refreshOutlookToken,
  searchOutlookMessages,
  getOutlookAttachments,
  buildOutlookFilter
} from "../shared/outlook-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to convert Base64 strings to Uint8Array for the processor
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// --- Gmail Sync Logic ---
async function syncGmailUserInvoices(
  supabase: any,
  userId: string,
  credentials: any
): Promise<{ processed: number; invoicesFound: number; errors: string[] }> {
  const results = { processed: 0, invoicesFound: 0, errors: [] as string[] };
  
  try {
    // 1. Get allowed suppliers
    const { data: supplierEmails } = await supabase
      .from('allowed_supplier_emails')
      .select('email')
      .eq('user_id', userId)
      .eq('source_account_id', credentials.id)
      .eq('source_provider', 'gmail');

    const allowedEmails = (supplierEmails || []).map((s: any) => s.email);
    
    if (allowedEmails.length === 0) {
      console.log(`Gmail ${credentials.connected_email}: No supplier emails configured`);
      return results;
    }

    // 2. Refresh Token
    const accessToken = await refreshGmailToken(credentials.refresh_token_encrypted);

    await supabase
      .from('gmail_credentials')
      .update({
        access_token_encrypted: accessToken,
        token_expires_at: new Date(Date.now() + 3600000).toISOString(),
      })
      .eq('id', credentials.id);

    // 3. Build Query & Search
    // Matches "from:(a OR b) has:attachment filename:pdf newer_than:8d"
    const fromFilter = allowedEmails.map((email: string) => `from:${email}`).join(' OR ');
    const searchQuery = `(${fromFilter}) has:attachment filename:pdf newer_than:8d`;
    
    const messages = await searchGmailMessages(accessToken, searchQuery);
    
    // 4. Filter already processed
    const { data: processedMessages } = await supabase
      .from('processed_gmail_messages')
      .select('message_id')
      .eq('user_id', userId);

    const processedIds = new Set((processedMessages || []).map((m: any) => m.message_id));
    const newMessages = messages.filter(m => !processedIds.has(m.id));

    // 5. Process Batch (Limit 20)
    for (const message of newMessages.slice(0, 20)) {
      try {
        const details = await getGmailMessageDetails(accessToken, message.id);
        
        // Extract Metadata
        const subject = details.payload.headers.find(h => h.name.toLowerCase() === 'subject')?.value || '';
        const fromHeader = details.payload.headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
        const senderEmail = extractEmail(fromHeader);
        
        // Find PDF Parts
        const pdfParts = findPdfParts(details.payload);
        const invoiceIds: string[] = [];

        for (const part of pdfParts) {
          try {
            // Download & Convert
            const base64Url = await getGmailAttachment(accessToken, message.id, part.attachmentId);
            const standardBase64 = base64UrlToBase64(base64Url);
            const fileData = base64ToUint8Array(standardBase64);

            // Process via Shared Helper
            const result = await processInvoiceAttachment(
              supabase,
              { id: userId },
              {
                filename: part.filename,
                data: fileData,
                size: part.size,
                senderEmail: senderEmail
              },
              {} // No auth headers needed for background cron context
            );

            if (result.status === 'processed' && result.invoiceId) {
              invoiceIds.push(result.invoiceId);
              results.invoicesFound++;
            } else if (result.status === 'error') {
              results.errors.push(`File ${part.filename}: ${result.error}`);
            }

          } catch (attachError: any) {
            results.errors.push(`Gmail attachment error: ${attachError.message}`);
          }
        }

        // 6. Mark Message Processed
        await supabase
          .from('processed_gmail_messages')
          .insert({
            user_id: userId,
            message_id: message.id,
            thread_id: details.threadId,
            subject,
            sender_email: senderEmail,
            attachment_count: pdfParts.length,
            invoice_ids: invoiceIds,
          });

        results.processed++;
      } catch (msgError: any) {
        results.errors.push(`Gmail message ${message.id}: ${msgError.message}`);
      }
    }

    // Update sync timestamp
    await supabase
      .from('gmail_credentials')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', credentials.id);

  } catch (error: any) {
    results.errors.push(`Gmail ${credentials.connected_email}: ${error.message}`);
  }

  return results;
}

// --- Outlook Sync Logic ---
async function syncOutlookUserInvoices(
  supabase: any,
  userId: string,
  credentials: any
): Promise<{ processed: number; invoicesFound: number; errors: string[] }> {
  const results = { processed: 0, invoicesFound: 0, errors: [] as string[] };
  
  try {
    // 1. Get allowed suppliers
    const { data: supplierEmails } = await supabase
      .from('allowed_supplier_emails')
      .select('email')
      .eq('user_id', userId)
      .eq('source_account_id', credentials.id)
      .eq('source_provider', 'outlook');

    const allowedEmails = (supplierEmails || []).map((s: any) => s.email);
    
    if (allowedEmails.length === 0) {
      console.log(`Outlook ${credentials.connected_email}: No supplier emails configured`);
      return results;
    }

    // 2. Refresh Token
    const accessToken = await refreshOutlookToken(credentials.refresh_token_encrypted);

    await supabase
      .from('outlook_credentials')
      .update({
        access_token_encrypted: accessToken,
        token_expires_at: new Date(Date.now() + 3600000).toISOString(),
      })
      .eq('id', credentials.id);

    // 3. Build Filter & Search
    // Filter for last 8 days
    const searchFilter = buildOutlookFilter(allowedEmails, 8);
    const messages = await searchOutlookMessages(accessToken, searchFilter);

    // 4. Process Batch (Limit 20)
    for (const message of messages.slice(0, 20)) {
      try {
        // Double check this message hasn't been processed yet 
        // (Note: Outlook OData doesn't let us easily filter by "not in list", so we check DB)
        const { data: existing } = await supabase
            .from('processed_outlook_messages')
            .select('id')
            .eq('message_id', message.id)
            .maybeSingle();
            
        if (existing) continue;

        const senderEmail = message.from.emailAddress.address.toLowerCase();
        
        // Get Attachments
        const attachments = await getOutlookAttachments(accessToken, message.id);
        const pdfAttachments = attachments.filter(a => 
          (a.contentType === 'application/pdf' || a.name.endsWith('.pdf')) && a.contentBytes
        );

        const invoiceIds: string[] = [];

        for (const attachment of pdfAttachments) {
          try {
            if (!attachment.contentBytes) continue;
            const fileData = base64ToUint8Array(attachment.contentBytes);

            // Process via Shared Helper
            const result = await processInvoiceAttachment(
              supabase,
              { id: userId },
              {
                filename: attachment.name,
                data: fileData,
                size: attachment.size,
                senderEmail: senderEmail
              },
              {} 
            );

            if (result.status === 'processed' && result.invoiceId) {
              invoiceIds.push(result.invoiceId);
              results.invoicesFound++;
            } else if (result.status === 'error') {
              results.errors.push(`File ${attachment.name}: ${result.error}`);
            }

          } catch (attachError: any) {
            results.errors.push(`Outlook attachment error: ${attachError.message}`);
          }
        }

        // 5. Mark Message Processed
        await supabase
          .from('processed_outlook_messages')
          .insert({
            user_id: userId,
            message_id: message.id,
            subject: message.subject,
            sender_email: senderEmail,
            attachment_count: pdfAttachments.length,
            invoice_ids: invoiceIds,
          });

        results.processed++;
      } catch (msgError: any) {
        results.errors.push(`Outlook message ${message.id}: ${msgError.message}`);
      }
    }

    // Update sync timestamp
    await supabase
      .from('outlook_credentials')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', credentials.id);

  } catch (error: any) {
    results.errors.push(`Outlook ${credentials.connected_email}: ${error.message}`);
  }

  return results;
}

// --- Main Serve Function ---
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('=== Email Invoice Sync Cron Job Started ===');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Service role is required for Cron jobs to access all users data
    const supabase = createClient(supabaseUrl, serviceKey);

    const allResults = {
      gmailAccountsProcessed: 0,
      outlookAccountsProcessed: 0,
      totalInvoicesFound: 0,
      totalMessagesProcessed: 0,
      errors: [] as string[],
    };

    // --- 1. Process Gmail Accounts ---
    const { data: gmailCredentials } = await supabase
      .from('gmail_credentials')
      .select('*')
      .eq('sync_enabled', true);

    console.log(`Found ${gmailCredentials?.length || 0} Gmail accounts`);

    for (const credentials of gmailCredentials || []) {
      const userResults = await syncGmailUserInvoices(supabase, credentials.user_id, credentials);
      
      allResults.gmailAccountsProcessed++;
      allResults.totalInvoicesFound += userResults.invoicesFound;
      allResults.totalMessagesProcessed += userResults.processed;
      if (userResults.errors.length) allResults.errors.push(...userResults.errors);
    }

    // --- 2. Process Outlook Accounts ---
    const { data: outlookCredentials } = await supabase
      .from('outlook_credentials')
      .select('*')
      .eq('sync_enabled', true);

    console.log(`Found ${outlookCredentials?.length || 0} Outlook accounts`);

    for (const credentials of outlookCredentials || []) {
      const userResults = await syncOutlookUserInvoices(supabase, credentials.user_id, credentials);

      allResults.outlookAccountsProcessed++;
      allResults.totalInvoicesFound += userResults.invoicesFound;
      allResults.totalMessagesProcessed += userResults.processed;
      if (userResults.errors.length) allResults.errors.push(...userResults.errors);
    }

    console.log('=== Cron Job Complete ===', allResults);

    return new Response(
      JSON.stringify({ success: true, ...allResults }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Cron job error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});