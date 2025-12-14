import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OutlookMessage {
  id: string;
  subject: string;
  from: { emailAddress: { address: string; name: string } };
  hasAttachments: boolean;
  receivedDateTime: string;
}

interface OutlookAttachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
  contentBytes: string;
}

async function refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string): Promise<string> {
  console.log('Refreshing Outlook access token...');
  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      scope: 'https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/User.Read offline_access',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Token refresh failed:', error);
    throw new Error(`Failed to refresh token: ${error}`);
  }

  const data = await response.json();
  console.log('Access token refreshed successfully');
  return data.access_token;
}

async function searchOutlookMessages(accessToken: string, supplierEmails: string[]): Promise<OutlookMessage[]> {
  // Build filter for supplier emails
  const fromFilters = supplierEmails.map(email => `from/emailAddress/address eq '${email}'`).join(' or ');
  
  // Calculate date 365 days ago
  const lookbackDate = new Date();
  lookbackDate.setDate(lookbackDate.getDate() - 365);
  const dateFilter = `receivedDateTime ge ${lookbackDate.toISOString()}`;
  
  const filter = `hasAttachments eq true and (${fromFilters}) and ${dateFilter}`;
  const url = `https://graph.microsoft.com/v1.0/me/messages?$filter=${encodeURIComponent(filter)}&$select=id,subject,from,hasAttachments,receivedDateTime&$top=50`;
  
  console.log('Searching Outlook messages...');
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Message search failed:', error);
    throw new Error(`Failed to search messages: ${error}`);
  }

  const data = await response.json();
  console.log(`Found ${data.value?.length || 0} messages with attachments`);
  return data.value || [];
}

async function getMessageAttachments(accessToken: string, messageId: string): Promise<OutlookAttachment[]> {
  const url = `https://graph.microsoft.com/v1.0/me/messages/${messageId}/attachments`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get attachments: ${error}`);
  }

  const data = await response.json();
  return data.value || [];
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

    console.log(`Starting Outlook sync for user: ${user.id}`);

    // Parse request body for optional account_id
    let accountId: string | null = null;
    try {
      const body = await req.json();
      accountId = body?.account_id || null;
    } catch {
      // No body or invalid JSON - sync all accounts
    }

    // Get Outlook credentials - specific account or first available
    let credentialsQuery = supabase
      .from('outlook_credentials')
      .select('*')
      .eq('user_id', user.id);
    
    if (accountId) {
      credentialsQuery = credentialsQuery.eq('id', accountId);
    }
    
    const { data: credentialsList, error: credError } = await credentialsQuery;

    if (credError || !credentialsList || credentialsList.length === 0) {
      console.error('Outlook credentials not found:', credError);
      return new Response(
        JSON.stringify({ error: 'Outlook not connected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process each Outlook account
    const allResults = {
      processed: 0,
      invoicesFound: 0,
      pdfsScanned: 0,
      errors: [] as string[],
      totalMessages: 0,
      newMessages: 0,
    };

    for (const credentials of credentialsList) {
      console.log(`Processing Outlook account: ${credentials.connected_email}`);

    // Get allowed supplier emails for this Outlook account
    const { data: supplierEmails, error: supplierError } = await supabase
      .from('allowed_supplier_emails')
      .select('email')
      .eq('user_id', user.id)
      .eq('source_provider', 'outlook')
      .eq('source_account_id', credentials.id);

    if (supplierError) {
      console.error('Error fetching supplier emails:', supplierError);
    }

    const allowedEmails = (supplierEmails || []).map(s => s.email);
    console.log(`Found ${allowedEmails.length} allowed supplier emails for Outlook`);

    if (allowedEmails.length === 0) {
      console.log('No supplier emails configured for this Outlook account - skipping');
      allResults.errors.push(`Account ${credentials.connected_email}: No supplier emails configured`);
      continue; // Skip to next account instead of returning
    }

      const clientId = Deno.env.get('MICROSOFT_CLIENT_ID')!;
      const clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET')!;

      // Refresh access token
      let accessToken: string;
      try {
        accessToken = await refreshAccessToken(
          credentials.refresh_token_encrypted,
          clientId,
          clientSecret
        );
      } catch (tokenError) {
        console.error('Token refresh failed for Outlook - user needs to re-authenticate:', tokenError);
        // Mark credentials as needing re-auth
        await supabase
          .from('outlook_credentials')
          .update({ needs_reauth: true })
          .eq('id', credentials.id);
        
        allResults.errors.push(`Account ${credentials.connected_email}: Token expired - needs re-auth`);
        continue; // Try next account
      }

      // Update access token in database and clear needs_reauth flag
      await supabase
        .from('outlook_credentials')
        .update({
          access_token_encrypted: accessToken,
          token_expires_at: new Date(Date.now() + 3600000).toISOString(),
          needs_reauth: false,
        })
        .eq('id', credentials.id);

      // Search for messages from suppliers
      const messages = await searchOutlookMessages(accessToken, allowedEmails);
      allResults.totalMessages += messages.length;

      // Get already processed message IDs
      const { data: processedMessages } = await supabase
        .from('processed_outlook_messages')
        .select('message_id')
        .eq('user_id', user.id);

      const processedIds = new Set((processedMessages || []).map(m => m.message_id));

      // Filter out already processed messages
      const newMessages = messages.filter(m => !processedIds.has(m.id));
      console.log(`${newMessages.length} new messages to process for ${credentials.connected_email}`);
      allResults.newMessages += newMessages.length;

      // Process each new message (limit to 10 per sync per account)
      for (const message of newMessages.slice(0, 10)) {
        try {
          console.log(`Processing message ${message.id}: ${message.subject}`);
          
          const senderEmail = message.from.emailAddress.address;
          const attachments = await getMessageAttachments(accessToken, message.id);
          
          // Filter for PDF attachments
          const pdfAttachments = attachments.filter(
            a => a.contentType === 'application/pdf' || a.name.toLowerCase().endsWith('.pdf')
          );
          
          console.log(`Found ${pdfAttachments.length} PDF attachments`);
          const invoiceIds: string[] = [];

          for (const attachment of pdfAttachments) {
            try {
              allResults.pdfsScanned++;

              // Check for duplicate invoice
              const { data: existingInvoice } = await supabase
                .from('invoices')
                .select('id')
                .eq('user_id', user.id)
                .eq('file_name', attachment.name)
                .eq('source_email', senderEmail)
                .maybeSingle();

              if (existingInvoice) {
                console.log(`Skipping duplicate: ${attachment.name} from ${senderEmail}`);
                continue;
              }

              // Decode base64 content
              const binaryString = atob(attachment.contentBytes);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }

              // Upload to storage
              const fileName = `${user.id}/${Date.now()}_${attachment.name}`;
              const { error: uploadError } = await supabase.storage
                .from('invoices')
                .upload(fileName, bytes, {
                  contentType: 'application/pdf',
                });

              if (uploadError) {
                console.error('Upload error:', uploadError);
                continue;
              }

              // Create invoice record
              const { data: invoice, error: invoiceError } = await supabase
                .from('invoices')
                .insert({
                  user_id: user.id,
                  file_name: attachment.name,
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
              allResults.invoicesFound++;
              console.log(`Created invoice: ${invoice.id} from ${senderEmail}`);

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
              console.error('Attachment error:', attachError);
              const msg = attachError instanceof Error ? attachError.message : 'Unknown error';
              allResults.errors.push(`Attachment error: ${msg}`);
            }
          }

          // Record processed message
          await supabase
            .from('processed_outlook_messages')
            .insert({
              user_id: user.id,
              message_id: message.id,
              subject: message.subject,
              sender_email: senderEmail,
              attachment_count: pdfAttachments.length,
              invoice_ids: invoiceIds,
            });

          allResults.processed++;
        } catch (msgError: unknown) {
          console.error(`Error processing message ${message.id}:`, msgError);
          const msg = msgError instanceof Error ? msgError.message : 'Unknown error';
          allResults.errors.push(`Message ${message.id}: ${msg}`);
        }
      }

      // Update last sync time for this account
      await supabase
        .from('outlook_credentials')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', credentials.id);
    } // End of credentials loop

    console.log('Outlook sync complete:', allResults);

    return new Response(
      JSON.stringify({
        success: true,
        ...allResults,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in sync-outlook-invoices:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
