import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Imports from your shared helpers (assuming standard Supabase Edge Function structure)
import { processInvoiceAttachment } from "../shared/invoice-processing.ts";
import {
  refreshOutlookToken,
  searchOutlookMessages,
  getOutlookAttachments,
  buildOutlookFilter
} from "../shared/outlook-client.ts";
import { getCorsHeaders } from "../shared/cors.ts";

// Helper to convert Base64 to Uint8Array for the shared processor
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

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization required');
    }

    // Initialize Supabase Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // 1. Authenticate User
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'User not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting Outlook sync for user: ${user.id}`);

    // 2. Parse Inputs (Specific Account or Specific Supplier)
    let accountId: string | null = null;
    let supplierEmailFilter: string | null = null;
    try {
      const body = await req.json();
      accountId = body?.account_id || null;
      supplierEmailFilter = body?.supplier_email || null;
    } catch {
      // Body is optional
    }

    // 3. Fetch Outlook Credentials
    let credentialsQuery = supabase
      .from('outlook_credentials')
      .select('*')
      .eq('user_id', user.id);

    if (accountId) {
      credentialsQuery = credentialsQuery.eq('id', accountId);
    }

    const { data: credentialsList, error: credError } = await credentialsQuery;

    if (credError || !credentialsList || credentialsList.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Outlook not connected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Results tracking
    const allResults = {
      processed: 0,
      invoicesFound: 0,
      pdfsScanned: 0,
      errors: [] as string[],
      totalMessages: 0,
      newMessages: 0,
    };

    // 4. Process Each Account
    for (const credentials of credentialsList) {
      console.log(`Processing Outlook account: ${credentials.connected_email}`);

      // 4a. Get Allowed Emails (or use filter)
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
        console.log(`Allowed emails: ${allowedEmails.join(', ')}`);
      }

      if (allowedEmails.length === 0) {
        allResults.errors.push(`Account ${credentials.connected_email}: No supplier emails configured`);
        continue;
      }

      // 4b. Refresh Token
      let accessToken: string;
      try {
        accessToken = await refreshOutlookToken(credentials.refresh_token_encrypted);

        // Update DB with new valid token
        await supabase
          .from('outlook_credentials')
          .update({
            access_token_encrypted: accessToken,
            token_expires_at: new Date(Date.now() + 3600000).toISOString(),
            needs_reauth: false,
          })
          .eq('id', credentials.id);

      } catch (tokenError: any) {
        console.error('Token refresh failed:', tokenError);
        await supabase
          .from('outlook_credentials')
          .update({ needs_reauth: true })
          .eq('id', credentials.id);

        allResults.errors.push(`Account ${credentials.connected_email}: Token expired - needs re-auth`);
        continue;
      }

      // 4c. Search Messages
      // Use 365 day lookback by default
      const searchFilter = buildOutlookFilter(allowedEmails, 365);
      const messages = await searchOutlookMessages(accessToken, searchFilter);
      allResults.totalMessages += messages.length;

      // 4d. Filter out already processed messages
      const { data: processedMessages } = await supabase
        .from('processed_outlook_messages')
        .select('message_id')
        .eq('user_id', user.id);

      const processedIds = new Set((processedMessages || []).map(m => m.message_id));
      const newMessages = messages.filter(m => !processedIds.has(m.id));

      console.log(`${newMessages.length} new messages to process for ${credentials.connected_email}`);
      allResults.newMessages += newMessages.length;

      // 5. Process Messages (Time-aware loop)
      const startTime = Date.now();
      const MAX_RUNTIME_MS = 50000; // Stop after 50 seconds to leave 10s for cleanup

      for (const message of newMessages) {
        // Check if we are running out of time
        if (Date.now() - startTime > MAX_RUNTIME_MS) {
          console.warn("Approaching timeout limit. Stopping batch early.");
          allResults.errors.push("Batch incomplete: Time limit reached. Please run sync again.");
          break;
        }

        try {
          const senderEmail = message.from.emailAddress.address.toLowerCase();

          // Fetch attachments
          const attachments = await getOutlookAttachments(accessToken, message.id);

          const pdfAttachments = attachments.filter(
            a => a.contentType === 'application/pdf' || a.name.toLowerCase().endsWith('.pdf')
          );

          const createdInvoiceIds: string[] = [];

          // 6. Process Attachments
          for (const attachment of pdfAttachments) {
            allResults.pdfsScanned++;

            if (!attachment.contentBytes) continue;

            const result = await processInvoiceAttachment(
              supabase,
              user,
              {
                filename: attachment.name,
                data: base64ToUint8Array(attachment.contentBytes),
                size: attachment.size,
                senderEmail: senderEmail
              },
              authHeader
            );

            if (result.status === 'processed' && result.invoiceId) {
              createdInvoiceIds.push(result.invoiceId);
              allResults.invoicesFound++;
            }
          }

          // 7. Mark Message as Processed
          await supabase
            .from('processed_outlook_messages')
            .insert({
              user_id: user.id,
              message_id: message.id,
              subject: message.subject,
              sender_email: senderEmail,
              attachment_count: pdfAttachments.length,
              invoice_ids: createdInvoiceIds,
            });

          allResults.processed++;

        } catch (msgError: any) {
          console.error(`Error processing message ${message.id}:`, msgError);
          allResults.errors.push(`Message ${message.id}: ${msgError.message}`);
        }
      }
      // Update sync timestamp
      await supabase
        .from('outlook_credentials')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', credentials.id);
    }

    return new Response(
      JSON.stringify({ success: true, ...allResults }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in sync-outlook-invoices:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});