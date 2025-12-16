import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Import Shared Modules
import * as Gmail from "../shared/gmail-client.ts";
import { processInvoiceAttachment } from "../shared/invoice-processing.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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

    // 2. Parse Input (Filters)
    let accountId: string | null = null;
    let supplierEmailFilter: string | null = null;
    try {
      const body = await req.json();
      accountId = body?.account_id || null;
      supplierEmailFilter = body?.supplier_email || null;
    } catch {
      // Ignore body parsing errors
    }

    // 3. Get Credentials
    let credentialsQuery = supabase
      .from('gmail_credentials')
      .select('*')
      .eq('user_id', user.id);
    
    if (accountId) credentialsQuery = credentialsQuery.eq('id', accountId);
    
    const { data: credentials, error: credError } = await credentialsQuery.maybeSingle();

    if (credError || !credentials) {
      return new Response(
        JSON.stringify({ error: 'Gmail not connected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Get Allowed Suppliers
    let allowedEmails: string[] = [];
    if (supplierEmailFilter) {
      console.log(`Filtering to specific supplier: ${supplierEmailFilter}`);
      allowedEmails = [supplierEmailFilter];
    } else {
      let supplierQuery = supabase
        .from('allowed_supplier_emails')
        .select('email')
        .eq('user_id', user.id)
        .eq('source_provider', 'gmail');
      
      supplierQuery = accountId 
        ? supplierQuery.eq('source_account_id', accountId)
        : supplierQuery.eq('source_account_id', credentials.id);
      
      const { data: supplierEmails } = await supplierQuery;
      allowedEmails = (supplierEmails || []).map(s => s.email);
    }

    if (allowedEmails.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No supplier emails configured.',
          needsConfiguration: true 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Refresh Token (using Shared Module)
    console.log('Refreshing access token...');
    let accessToken: string;
    try {
      accessToken = await Gmail.refreshGmailToken(credentials.refresh_token_encrypted);
    } catch (tokenError) {
      console.error('Token refresh failed:', tokenError);
      await supabase
        .from('gmail_credentials')
        .update({ needs_reauth: true })
        .eq('id', credentials.id);
      
      return new Response(
        JSON.stringify({ 
          error: 'Gmail access expired. Please reconnect.',
          needsReauth: true 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update DB with new token
    await supabase
      .from('gmail_credentials')
      .update({
        access_token_encrypted: accessToken,
        token_expires_at: new Date(Date.now() + 3600000).toISOString(),
        needs_reauth: false,
      })
      .eq('user_id', user.id);

    // 6. Search Messages (Deep History)
    const normalizedEmails = allowedEmails.map(email => email.toLowerCase());
    const fromFilter = normalizedEmails.map(email => `from:${email}`).join(' OR ');
    const searchQuery = `(${fromFilter}) has:attachment filename:pdf newer_than:365d`;
    
    console.log('Searching Gmail with query:', searchQuery);
    const messages = await Gmail.searchGmailMessages(accessToken, searchQuery);
    
    // Filter out processed messages
    const { data: processedMessages } = await supabase
      .from('processed_gmail_messages')
      .select('message_id')
      .eq('user_id', user.id);
    
    const processedIds = new Set((processedMessages || []).map(m => m.message_id));
    const newMessages = messages.filter(m => !processedIds.has(m.id));
    
    console.log(`Found ${messages.length} total, ${newMessages.length} new to process`);

    const results = {
      processed: 0,
      invoicesFound: 0,
      pdfsScanned: 0,
      errors: [] as string[],
    };

    // 7. Process Loop
    for (const message of newMessages.slice(0, 10)) { // Limit 10
      try {
        const details = await Gmail.getGmailMessageDetails(accessToken, message.id);
        
        // Metadata extraction
        const headers = details.payload.headers;
        const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '';
        const fromHeader = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
        const senderEmail = Gmail.extractEmail(fromHeader);
        
        // Find PDFs
        const pdfAttachments = Gmail.findPdfParts(details.payload);
        const invoiceIds: string[] = [];

        for (const attachment of pdfAttachments) {
          try {
            results.pdfsScanned++;
            
            // Download & Convert
            const attachmentData = await Gmail.getGmailAttachment(accessToken, message.id, attachment.attachmentId);
            const base64Data = Gmail.base64UrlToBase64(attachmentData);
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

            // Use Shared Processing Logic
            // Handles: Deduplication, Storage Upload, DB Insert, AI Trigger
            const processResult = await processInvoiceAttachment(
              supabase,
              user,
              {
                filename: attachment.filename,
                data: bytes,
                size: attachment.size,
                senderEmail: senderEmail
              },
              { Authorization: authHeader } // Headers for AI trigger
            );

            if (processResult.status === 'processed' && processResult.invoiceId) {
              invoiceIds.push(processResult.invoiceId);
              results.invoicesFound++;
              console.log(`Processed invoice: ${processResult.invoiceId}`);
            } else if (processResult.status === 'error') {
              results.errors.push(`Attachment error: ${processResult.error}`);
            }

          } catch (attachError: unknown) {
            const msg = attachError instanceof Error ? attachError.message : 'Unknown error';
            results.errors.push(`Attachment processing error: ${msg}`);
          }
        }

        // Record processed message
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

        results.processed++;
      } catch (msgError: unknown) {
        const msg = msgError instanceof Error ? msgError.message : 'Unknown error';
        results.errors.push(`Message ${message.id}: ${msg}`);
      }
    }

    // 8. Update Last Sync
    await supabase
      .from('gmail_credentials')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('user_id', user.id);

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
        totalMessages: messages.length,
        newMessages: newMessages.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in sync-gmail-invoices:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});