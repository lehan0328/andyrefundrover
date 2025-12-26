// shared/outlook-client.ts

export interface OutlookMessage {
  id: string;
  subject: string;
  bodyPreview?: string;
  from: { emailAddress: { address: string; name: string } };
  hasAttachments: boolean;
  receivedDateTime: string;
  attachments?: OutlookAttachment[];
}

export interface OutlookAttachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
  contentBytes?: string; // Outlook returns standard base64 here
}

/**
 * Refreshes the Microsoft Graph OAuth2 access token
 */
export async function refreshOutlookToken(refreshToken: string): Promise<string> {
  const clientId = Deno.env.get('MICROSOFT_CLIENT_ID')!;
  const clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET')!;

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
    throw new Error(`Failed to refresh Outlook token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Helper to build the OData filter string for Outlook
 * @param allowedEmails List of supplier emails to filter by
 * @param daysLookback How many days back to search (e.g., 8 for cron, 365 for init)
 */
export function buildOutlookFilter(allowedEmails: string[], daysLookback: number): string {
  const dateObj = new Date(Date.now() - daysLookback * 24 * 60 * 60 * 1000);
  const dateFilter = `receivedDateTime ge ${dateObj.toISOString()}`;
  
  // Normalize and quote emails
  const fromFilters = allowedEmails
    .map(email => `from/emailAddress/address eq '${email}'`)
    .join(' or ');

  return `hasAttachments eq true and (${fromFilters}) and ${dateFilter}`;
}

interface SearchOptions {
  select?: string;
  expand?: string;
  top?: number;
}

/**
 * Searches for messages using an OData filter string with pagination
 */
export async function searchOutlookMessages(
  accessToken: string, 
  filter: string,
  options: SearchOptions = {}
): Promise<OutlookMessage[]> {
  const top = options.top || 50;
  const select = options.select || 'id,subject,from,hasAttachments,receivedDateTime';
  const expand = options.expand ? `&$expand=${options.expand}` : '';

  // Construct URL with encoded filter but raw select/expand/top
  let url = `https://graph.microsoft.com/v1.0/me/messages?$filter=${encodeURIComponent(filter)}&$top=${top}&$select=${select}${expand}`;
  
  let allMessages: OutlookMessage[] = [];
  let nextLink: string | null = url;

  // Loop while there is a next page
  while (nextLink) {
    console.log(`Fetching Outlook messages page...`);
    
    const response = await fetch(nextLink, {
      headers: { 
        Authorization: `Bearer ${accessToken}`,
        // "ConsistencyLevel": "eventual" // Uncomment if using advanced search queries
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Failed to search Outlook messages: ${error}`);
      // If we have some messages, return them rather than failing completely
      if (allMessages.length > 0) return allMessages;
      throw new Error(`Failed to search Outlook messages: ${error}`);
    }

    const data = await response.json();
    const messages = data.value || [];
    allMessages = [...allMessages, ...messages];

    // Check for next page link
    nextLink = data['@odata.nextLink'] || null;
    
    // Safety break to prevent infinite loops if something goes wrong
    if (allMessages.length > 2000) {
      console.warn('Reached safety limit of 2000 messages, stopping pagination.');
      break;
    }
  }

  return allMessages;
}

/**
 * Fetches attachments for a specific message
 */
export async function getOutlookAttachments(accessToken: string, messageId: string): Promise<OutlookAttachment[]> {
  const url = `https://graph.microsoft.com/v1.0/me/messages/${messageId}/attachments`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Outlook attachments: ${error}`);
  }

  const data = await response.json();
  return data.value || [];
}
