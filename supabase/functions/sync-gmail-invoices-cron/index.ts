import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GmailMessage {
  id: string;
  threadId: string;
}

interface GmailMessageDetail {
  id: string;
  threadId: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    parts?: Array<{
      filename: string;
      mimeType: string;
      body: { attachmentId?: string; size: number; data?: string };
    }>;
    body?: { attachmentId?: string; size: number; data?: string };
    mimeType?: string;
    filename?: string;
  };
}

async function refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function searchGmailMessages(accessToken: string, query: string): Promise<GmailMessage[]> {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=50`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to search messages: ${error}`);
  }

  const data = await response.json();
  return data.messages || [];
}

async function getMessageDetails(accessToken: string, messageId: string): Promise<GmailMessageDetail> {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get message details: ${error}`);
  }

  return await response.json();
}

async function getAttachment(accessToken: string, messageId: string, attachmentId: string): Promise<string> {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get attachment: ${error}`);
  }

  const data = await response.json();
  return data.data;
}

function base64UrlToBase64(base64Url: string): string {
  return base64Url.replace(/-/g, '+').replace(/_/g, '/');
}

function extractEmail(fromHeader: string): string {
  const match = fromHeader.match(/<([^>]+)>/) || fromHeader.match(/([^\s<>]+@[^\s<>]+)/);
  return match ? match[1] : fromHeader;
}

function findPdfParts(payload: GmailMessageDetail['payload']): Array<{ filename: string; attachmentId: string; size: number }> {
  const pdfParts: Array<{ filename: string; attachmentId: string; size: number }> = [];
  
  function searchParts(parts: GmailMessageDetail['payload']['parts']) {
    if (!parts) return;
    
    for (const part of parts) {
      if (part.mimeType === 'application/pdf' && part.body?.attachmentId) {
        pdfParts.push({
          filename: part.filename || 'attachment.pdf',
          attachmentId: part.body.attachmentId,
          size: part.body.size,
        });
      }
      if ((part as any).parts) {
        searchParts((part as any).parts);
      }
    }
  }
  
  searchParts(payload.parts);
  
  if (payload.mimeType === 'application/pdf' && payload.body?.attachmentId) {
    pdfParts.push({
      filename: payload.filename || 'attachment.pdf',
      attachmentId: payload.body.attachmentId,
      size: payload.body.size,
    });
  }
  
  return pdfParts;
}

async function syncUserInvoices(
  supabase: any,
  userId: string,
  credentials: any,
  clientId: string,
  clientSecret: string
): Promise<{ processed: number; invoicesFound: number; errors: string[] }> {
  const results = { processed: 0, invoicesFound: 0, errors: [] as string[] };
  
  try {
    // Get allowed supplier emails
    const { data: supplierEmails } = await supabase
      .from('allowed_supplier_emails')
      .select('email')
      .eq('user_id', userId);

    const allowedEmails = (supplierEmails || []).map((s: any) => s.email);
    
    if (allowedEmails.length === 0) {
      console.log(`User ${userId}: No supplier emails configured, skipping`);
      return results;
    }

    // Refresh access token
    const accessToken = await refreshAccessToken(
      credentials.refresh_token_encrypted,
      clientId,
      clientSecret
    );

    // Update access token
    await supabase
      .from('gmail_credentials')
      .update({
        access_token_encrypted: accessToken,
        token_expires_at: new Date(Date.now() + 3600000).toISOString(),
      })
      .eq('user_id', userId);

    // Search for emails from past 8 days (overlaps with 7-day schedule)
    const fromFilter = allowedEmails.map((email: string) => `from:${email}`).join(' OR ');
    const searchQuery = `(${fromFilter}) has:attachment filename:pdf newer_than:8d`;
    console.log(`User ${userId}: Searching with query: ${searchQuery}`);
    
    const messages = await searchGmailMessages(accessToken, searchQuery);
    console.log(`User ${userId}: Found ${messages.length} messages`);

    // Get already processed message IDs
    const { data: processedMessages } = await supabase
      .from('processed_gmail_messages')
      .select('message_id')
      .eq('user_id', userId);

    const processedIds = new Set((processedMessages || []).map((m: any) => m.message_id));
    const newMessages = messages.filter(m => !processedIds.has(m.id));
    console.log(`User ${userId}: ${newMessages.length} new messages to process`);

    // Process messages (limit to 20 per user per cron run)
    for (const message of newMessages.slice(0, 20)) {
      try {
        const details = await getMessageDetails(accessToken, message.id);
        const headers = details.payload.headers;
        const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '';
        const fromHeader = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
        const senderEmail = extractEmail(fromHeader);
        
        const pdfAttachments = findPdfParts(details.payload);
        const invoiceIds: string[] = [];

        for (const attachment of pdfAttachments) {
          try {
            const attachmentData = await getAttachment(accessToken, message.id, attachment.attachmentId);
            const base64Data = base64UrlToBase64(attachmentData);
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }

            // Check for duplicate
            const { data: existingInvoice } = await supabase
              .from('invoices')
              .select('id')
              .eq('user_id', userId)
              .eq('file_name', attachment.filename)
              .eq('source_email', senderEmail)
              .maybeSingle();

            if (existingInvoice) {
              console.log(`User ${userId}: Skipping duplicate: ${attachment.filename}`);
              continue;
            }

            // Upload to storage
            const fileName = `${userId}/${Date.now()}_${attachment.filename}`;
            const { error: uploadError } = await supabase.storage
              .from('invoices')
              .upload(fileName, bytes, { contentType: 'application/pdf' });

            if (uploadError) {
              console.error(`User ${userId}: Upload error:`, uploadError);
              continue;
            }

            // Create invoice record
            const { data: invoice, error: invoiceError } = await supabase
              .from('invoices')
              .insert({
                user_id: userId,
                file_name: attachment.filename,
                file_path: fileName,
                file_type: 'application/pdf',
                file_size: attachment.size,
                analysis_status: 'pending',
                source_email: senderEmail,
              })
              .select()
              .single();

            if (invoiceError) {
              console.error(`User ${userId}: Invoice create error:`, invoiceError);
              continue;
            }

            invoiceIds.push(invoice.id);
            results.invoicesFound++;

            // Trigger AI analysis
            const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
            const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
            fetch(`${supabaseUrl}/functions/v1/analyze-invoice`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${serviceKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ invoiceId: invoice.id, filePath: fileName }),
            }).catch(err => console.error('Background analysis error:', err));

          } catch (attachError: unknown) {
            const msg = attachError instanceof Error ? attachError.message : 'Unknown error';
            results.errors.push(`Attachment error: ${msg}`);
          }
        }

        // Record processed message
        await supabase
          .from('processed_gmail_messages')
          .insert({
            user_id: userId,
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

    // Update last sync time
    await supabase
      .from('gmail_credentials')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('user_id', userId);

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    results.errors.push(`User ${userId}: ${msg}`);
  }

  return results;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('=== Gmail Invoice Sync Cron Job Started ===');
  console.log('Time:', new Date().toISOString());

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!;

    // Use service role to access all users
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get all users with Gmail sync enabled
    const { data: allCredentials, error: credError } = await supabase
      .from('gmail_credentials')
      .select('*')
      .eq('sync_enabled', true);

    if (credError) {
      console.error('Error fetching Gmail credentials:', credError);
      throw credError;
    }

    console.log(`Found ${allCredentials?.length || 0} users with Gmail sync enabled`);

    const allResults = {
      usersProcessed: 0,
      totalInvoicesFound: 0,
      totalMessagesProcessed: 0,
      errors: [] as string[],
    };

    // Process each user
    for (const credentials of allCredentials || []) {
      console.log(`\n--- Processing user: ${credentials.user_id} ---`);
      
      const userResults = await syncUserInvoices(
        supabase,
        credentials.user_id,
        credentials,
        clientId,
        clientSecret
      );

      allResults.usersProcessed++;
      allResults.totalInvoicesFound += userResults.invoicesFound;
      allResults.totalMessagesProcessed += userResults.processed;
      allResults.errors.push(...userResults.errors);

      console.log(`User ${credentials.user_id}: ${userResults.invoicesFound} invoices, ${userResults.processed} messages`);
    }

    console.log('\n=== Cron Job Complete ===');
    console.log('Results:', allResults);

    return new Response(
      JSON.stringify({
        success: true,
        ...allResults,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Cron job error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
