// shared/gmail-client.ts

export interface GmailMessage {
  id: string;
  threadId: string;
}

export interface GmailMessageDetail {
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

export interface ProcessedAttachment {
  filename: string;
  attachmentId: string;
  size: number;
}

/**
 * Refreshes the Gmail OAuth2 access token
 */
export async function refreshGmailToken(refreshToken: string): Promise<string> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!;

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
    throw new Error(`Failed to refresh Gmail token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Searches for messages matching a specific query
 */
export async function searchGmailMessages(accessToken: string, query: string): Promise<GmailMessage[]> {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=50`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to search Gmail messages: ${error}`);
  }

  const data = await response.json();
  return data.messages || [];
}

/**
 * Fetches full details for a specific message
 */
export async function getGmailMessageDetails(accessToken: string, messageId: string): Promise<GmailMessageDetail> {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Gmail message details: ${error}`);
  }

  return await response.json();
}

/**
 * Downloads a specific attachment by ID and returns base64 string
 */
export async function getGmailAttachment(accessToken: string, messageId: string, attachmentId: string): Promise<string> {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Gmail attachment: ${error}`);
  }

  const data = await response.json();
  return data.data; // This is Base64URL encoded
}

/**
 * Recursively finds all PDF parts in a Gmail message payload
 */
export function findPdfParts(payload: GmailMessageDetail['payload']): ProcessedAttachment[] {
  const pdfParts: ProcessedAttachment[] = [];
  
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
      // Recursively check nested parts (multipart/alternative, etc)
      if ((part as any).parts) {
        searchParts((part as any).parts);
      }
    }
  }
  
  // Check children
  searchParts(payload.parts);
  
  // Check if the root message itself is a PDF
  if (payload.mimeType === 'application/pdf' && payload.body?.attachmentId) {
    pdfParts.push({
      filename: payload.filename || 'attachment.pdf',
      attachmentId: payload.body.attachmentId,
      size: payload.body.size,
    });
  }
  
  return pdfParts;
}

/**
 * Extracts a clean email address from a "From" header
 */
export function extractEmail(fromHeader: string): string {
  // Matches "Name <email@domain.com>" or just "email@domain.com"
  const match = fromHeader.match(/<([^>]+)>/) || fromHeader.match(/([^\s<>]+@[^\s<>]+)/);
  const email = match ? match[1] : fromHeader;
  return email.toLowerCase();
}

/**
 * Converts Gmail's Base64URL format to standard Base64
 */
export function base64UrlToBase64(base64Url: string): string {
  return base64Url.replace(/-/g, '+').replace(/_/g, '/');
}