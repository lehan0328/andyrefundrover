import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Import Shared Modules
import * as Gmail from "../shared/gmail-client.ts";
import { processInvoiceAttachment } from "../shared/invoice-processing.ts";
import { getCorsHeaders } from "../shared/cors.ts";

// The "Discovery" query for finding new suppliers
const DISCOVERY_QUERY = `has:attachment filename:pdf -in:trash -in:spam -label:promotions -from:me (filename:(invoice OR bill OR receipt OR inv) OR subject:(invoice OR receipt OR bill) OR "amount due" OR "balance due")`;

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
    let scanType: 'initial' | 'refresh' = 'refresh'; // Default to refresh
    
    try {
      const body = await req.json();
      accountId = body?.account_id || null;
      supplierEmailFilter = body?.supplier_email || null;
      if (body?.scan_type === 'initial') scanType = 'initial';
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

    // 4. Refresh Token
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


    // ---------------------------------------------------------
    // PHASE 1: DISCOVERY (If Initial Sync)
    // ---------------------------------------------------------
    if (scanType === 'initial' && !supplierEmailFilter) {
      console.log('--- Starting Discovery Phase (30 Days) ---');
      
      // Look back 30 days with the smart filter
      const discoverySearch = `${DISCOVERY_QUERY} newer_than:30d`;
      const messages = await Gmail.searchGmailMessages(accessToken, discoverySearch);
      
      console.log(`Discovery: Found ${messages.length} potential invoice emails`);

      for (const message of messages) {
        try {
          // Check if we've processed this exact message before to save time, 
          // BUT since we are discovering, we might want to check it anyway to extract the sender
          // For now, let's just fetch details.
          const details = await Gmail.getGmailMessageDetails(accessToken, message.id);
          
          const fromHeader = details.payload.headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
          const senderEmail = Gmail.extractEmail(fromHeader);
          
          if (!senderEmail) continue;

          // Check if it has PDFs
          const pdfAttachments = Gmail.findPdfParts(details.payload);
          if (pdfAttachments.length > 0) {
             // We found a PDF matching our invoice keywords!
             // Auto-allow this supplier
             console.log(`Discovery: Found valid PDF from ${senderEmail}. Adding to allowed list.`);
             
             await supabase
               .from('allowed_supplier_emails')
               .upsert({
                  user_id: user.id,
                  email: senderEmail,
                  source_account_id: credentials.id,
                  source_provider: 'gmail',
                  label: 'Auto-Discovered'
               }, { onConflict: 'user_id, email' });
          }
        } catch (err) {
          console.error(`Discovery error for message ${message.id}:`, err);
        }
      }
      console.log('--- Discovery Phase Complete ---');
    }

    // ---------------------------------------------------------
    // PHASE 2: SYNC (Using Allowed Suppliers)
    // ---------------------------------------------------------
    
    // 5. Get Allowed Suppliers (Now includes newly discovered ones)
    let allowedEmails: string[] = [];
    if (supplierEmailFilter) {
      allowedEmails = [supplierEmailFilter];
    } else {
      const { data: supplierEmails } = await supabase
        .from('allowed_supplier_emails')
        .select('email')
        .eq('user_id', user.id)
        .eq('source_account_id', credentials.id)
        .eq('source_provider', 'gmail');
      
      allowedEmails = (supplierEmails || []).map(s => s.email);
    }

    if (allowedEmails.length === 0) {
       // If discovery found nothing and user added nothing
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No suppliers found or configured.',
          invoicesFound: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Build Query
    // Initial sync = 365 days, Refresh = 30 days (overlapping to catch late arrivals)
    const lookback = scanType === 'initial' ? '365d' : '30d';
    
    // Construct OR filter for senders: from:{a} OR from:{b} ...
    // Note: Gmail API URL limit is around 2k chars. If you have MANY suppliers, 
    // you might need to batch this query loop. 
    // For now, assuming reasonable number of suppliers.
    const normalizedEmails = allowedEmails.map(email => email.toLowerCase());
    const fromFilter = normalizedEmails.map(email => `from:${email}`).join(' OR ');
    
    // Combined Query: From allowed senders AND has PDF AND within time range
    const searchQuery = `(${fromFilter}) has:attachment filename:pdf newer_than:${lookback}`;
    
    console.log(`Syncing with query: ${searchQuery}`);
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
    // Cap at 20 for single execution to prevent timeouts, 
    // or higher if you are confident in execution time. 
    for (const message of newMessages.slice(0, 20)) { 
      try {
        const details = await Gmail.getGmailMessageDetails(accessToken, message.id);
        
        const headers = details.payload.headers;
        const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '';
        const fromHeader = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
        const senderEmail = Gmail.extractEmail(fromHeader);
        
        const pdfAttachments = Gmail.findPdfParts(details.payload);
        const invoiceIds: string[] = [];

        for (const attachment of pdfAttachments) {
          try {
            results.pdfsScanned++;
            
            const attachmentData = await Gmail.getGmailAttachment(accessToken, message.id, attachment.attachmentId);
            const base64Data = Gmail.base64UrlToBase64(attachmentData);
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

            const processResult = await processInvoiceAttachment(
              supabase,
              user,
              {
                filename: attachment.filename,
                data: bytes,
                size: attachment.size,
                senderEmail: senderEmail
              },
              { Authorization: authHeader }
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
        scanType
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