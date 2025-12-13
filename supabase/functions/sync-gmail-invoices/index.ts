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
  return data.data; // Base64 encoded
}

function base64UrlToBase64(base64Url: string): string {
  return base64Url.replace(/-/g, '+').replace(/_/g, '/');
}

// Extract text from PDF bytes to check for invoice keywords
function extractTextFromPdf(bytes: Uint8Array): string {
  try {
    // Convert bytes to string to search for text patterns
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const text = decoder.decode(bytes);
    
    // Also try latin1 decoding for better PDF text extraction
    let latin1Text = '';
    for (let i = 0; i < bytes.length; i++) {
      latin1Text += String.fromCharCode(bytes[i]);
    }
    
    return text + ' ' + latin1Text;
  } catch {
    return '';
  }
}

// Check if PDF content contains the word "invoice"
function isInvoicePdf(pdfText: string): boolean {
  return pdfText.toLowerCase().includes('invoice');
}

// Extract sender email from the "From" header
function extractEmail(fromHeader: string): string {
  // Handle formats like "Name <email@domain.com>" or just "email@domain.com"
  const match = fromHeader.match(/<([^>]+)>/) || fromHeader.match(/([^\s<>]+@[^\s<>]+)/);
  return match ? match[1] : fromHeader;
}

// Recursively find PDF parts in message
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
      // Check nested parts (for multipart messages)
      if ((part as any).parts) {
        searchParts((part as any).parts);
      }
    }
  }
  
  // Check top-level parts
  searchParts(payload.parts);
  
  // Check if the main payload is a PDF
  if (payload.mimeType === 'application/pdf' && payload.body?.attachmentId) {
    pdfParts.push({
      filename: payload.filename || 'attachment.pdf',
      attachmentId: payload.body.attachmentId,
      size: payload.body.size,
    });
  }
  
  return pdfParts;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Failed to get user:', userError);
      return new Response(
        JSON.stringify({ error: 'User not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Gmail credentials
    const { data: credentials, error: credError } = await supabase
      .from('gmail_credentials')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (credError || !credentials) {
      console.error('Gmail credentials not found:', credError);
      return new Response(
        JSON.stringify({ error: 'Gmail not connected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get allowed supplier emails for privacy-focused filtering
    const { data: supplierEmails, error: supplierError } = await supabase
      .from('allowed_supplier_emails')
      .select('email')
      .eq('user_id', user.id);

    if (supplierError) {
      console.error('Error fetching supplier emails:', supplierError);
    }

    const allowedEmails = (supplierEmails || []).map(s => s.email);
    console.log(`Found ${allowedEmails.length} allowed supplier emails`);

    if (allowedEmails.length === 0) {
      console.log('No supplier emails configured - skipping sync');
      return new Response(
        JSON.stringify({ 
          error: 'No supplier emails configured. Please add supplier email addresses in your account settings.',
          needsConfiguration: true 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!;

    // Refresh access token
    console.log('Refreshing access token...');
    const accessToken = await refreshAccessToken(
      credentials.refresh_token_encrypted,
      clientId,
      clientSecret
    );

    // Update access token in database
    await supabase
      .from('gmail_credentials')
      .update({
        access_token_encrypted: accessToken,
        token_expires_at: new Date(Date.now() + 3600000).toISOString(),
      })
      .eq('user_id', user.id);

    // Build search query with supplier email filter for privacy
    // Format: from:email1@domain.com OR from:email2@domain.com
    const fromFilter = allowedEmails.map(email => `from:${email}`).join(' OR ');
    const searchQuery = `(${fromFilter}) has:attachment filename:pdf newer_than:180d`;
    console.log('Searching Gmail with query:', searchQuery);
    
    const messages = await searchGmailMessages(accessToken, searchQuery);
    console.log(`Found ${messages.length} messages with PDF attachments`);

    // Get already processed message IDs
    const { data: processedMessages } = await supabase
      .from('processed_gmail_messages')
      .select('message_id')
      .eq('user_id', user.id);

    const processedIds = new Set((processedMessages || []).map(m => m.message_id));

    // Filter out already processed messages
    const newMessages = messages.filter(m => !processedIds.has(m.id));
    console.log(`${newMessages.length} new messages to process`);

    const results = {
      processed: 0,
      invoicesFound: 0,
      pdfsScanned: 0,
      skippedNonInvoice: 0,
      errors: [] as string[],
    };

    // Process each new message
    for (const message of newMessages.slice(0, 10)) { // Limit to 10 per sync
      try {
        console.log(`Processing message ${message.id}...`);
        const details = await getMessageDetails(accessToken, message.id);
        
        // Extract email headers
        const headers = details.payload.headers;
        const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '';
        const fromHeader = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
        const senderEmail = extractEmail(fromHeader);
        
        console.log(`From: ${senderEmail}, Subject: ${subject}`);
        
        // Find all PDF attachments (including nested)
        const pdfAttachments = findPdfParts(details.payload);
        console.log(`Found ${pdfAttachments.length} PDF attachments in message`);

        const invoiceIds: string[] = [];

        for (const attachment of pdfAttachments) {
          try {
            results.pdfsScanned++;
            
            // Download attachment
            const attachmentData = await getAttachment(
              accessToken,
              message.id,
              attachment.attachmentId
            );

            // Convert base64url to standard base64
            const base64Data = base64UrlToBase64(attachmentData);
            
            // Decode base64 to binary
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }

            // Extract text from PDF and check for invoice keywords
            const pdfText = extractTextFromPdf(bytes);
            const isInvoice = isInvoicePdf(pdfText);
            
            console.log(`PDF "${attachment.filename}" - Invoice detected: ${isInvoice}`);
            
            if (!isInvoice) {
              results.skippedNonInvoice++;
              console.log(`Skipping non-invoice PDF: ${attachment.filename}`);
              continue;
            }

            // Upload to Supabase storage
            const fileName = `${user.id}/${Date.now()}_${attachment.filename}`;
            const { error: uploadError } = await supabase.storage
              .from('invoices')
              .upload(fileName, bytes, {
                contentType: 'application/pdf',
              });

            if (uploadError) {
              console.error('Upload error:', uploadError);
              continue;
            }

            // Create invoice record with source email
            const { data: invoice, error: invoiceError } = await supabase
              .from('invoices')
              .insert({
                user_id: user.id,
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
              console.error('Invoice create error:', invoiceError);
              continue;
            }

            invoiceIds.push(invoice.id);
            results.invoicesFound++;
            console.log(`Created invoice record: ${invoice.id} from ${senderEmail}`);

            // Trigger AI analysis in background
            fetch(`${supabaseUrl}/functions/v1/analyze-invoice`, {
              method: 'POST',
              headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ invoiceId: invoice.id, filePath: fileName }),
            }).catch(err => console.error('Background analysis error:', err));
          } catch (attachError: unknown) {
            console.error(`Error processing attachment:`, attachError);
            const msg = attachError instanceof Error ? attachError.message : 'Unknown error';
            results.errors.push(`Attachment error: ${msg}`);
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
        console.error(`Error processing message ${message.id}:`, msgError);
        const msg = msgError instanceof Error ? msgError.message : 'Unknown error';
        results.errors.push(`Message ${message.id}: ${msg}`);
      }
    }

    // Update last sync time
    await supabase
      .from('gmail_credentials')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('user_id', user.id);

    console.log('Sync complete:', results);

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