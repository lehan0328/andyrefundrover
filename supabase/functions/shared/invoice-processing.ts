import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Helper: Use Gemini to check if the document content is relevant.
 * Returns true if it appears to be an invoice, receipt, or bill.
 */
async function isInvoiceContent(fileData: Uint8Array, mimeType: string): Promise<boolean> {
  const apiKey = Deno.env.get('GOOGLE_API_KEY');
  if (!apiKey) {
    console.warn("No GOOGLE_API_KEY set, skipping content check (failing open).");
    return true; 
  }

  try {
    let binary = '';
    for (let i = 0; i < fileData.length; i++) {
      binary += String.fromCharCode(fileData[i]);
    }
    const base64Data = btoa(binary);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
             parts: [{ text: "You are a document classifier. Your job is to filter for financial documents." }]
          },
          contents: [{
            role: "user",
            parts: [
              { inline_data: { mime_type: mimeType, data: base64Data } },
              { text: "Does this document appear to be an invoice, receipt, bill, or purchase order? Respond with JSON: { \"is_financial_doc\": boolean }" }
            ]
          }],
          generation_config: { response_mime_type: "application/json" }
        })
      }
    );

    if (!response.ok) return true;
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return true;

    const result = JSON.parse(text);
    return result.is_financial_doc === true;

  } catch (e) {
    console.error("Pre-check error:", e);
    return true;
  }
}

/**
 * Helper: Generates a unique filename like "file_1.pdf" if "file.pdf" exists.
 */
async function getUniqueFilename(supabase: any, userId: string, filename: string): Promise<string> {
  // 1. Parse name and extension
  const lastDot = filename.lastIndexOf('.');
  const name = lastDot !== -1 ? filename.substring(0, lastDot) : filename;
  const ext = lastDot !== -1 ? filename.substring(lastDot) : '';

  // 2. Escape special regex characters in the filename to prevent crashes
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // 3. Fetch potential matches from DB (using wildcard to reduce fetch size)
  const { data: matches } = await supabase
    .from('invoices')
    .select('file_name')
    .eq('user_id', userId)
    .ilike('file_name', `${name}%${ext}`);

  if (!matches || matches.length === 0) {
    return filename;
  }

  // 4. Regex to strictly match "name.pdf" or "name_1.pdf", "name_25.pdf"
  // ^ = start, (?:_(\d+))? = optional group starting with _ followed by digits, $ = end
  const pattern = new RegExp(`^${escapedName}(?:_(\\d+))?${ext}$`, 'i');

  let maxCounter = -1;
  let hasExactMatch = false;

  for (const row of matches) {
    const match = row.file_name.match(pattern);
    if (match) {
      if (match[1]) {
        // Found a numbered duplicate (e.g., _1, _5)
        const num = parseInt(match[1], 10);
        if (num > maxCounter) maxCounter = num;
      } else {
        // Found the exact original filename
        hasExactMatch = true;
      }
    }
  }

  // If the exact file doesn't exist and no numbered versions exist, return original
  if (!hasExactMatch && maxCounter === -1) {
    return filename;
  }

  // Calculate next number (if max is -1, it means only the original exists, so next is 1)
  const nextCounter = maxCounter === -1 ? 1 : maxCounter + 1;
  return `${name}_${nextCounter}${ext}`;
}

export async function processInvoiceAttachment(
  supabase: any,
  user: { id: string },
  fileData: { filename: string; data: Uint8Array; size: number; senderEmail: string },
  analyticsHeaders: any
) {
  const results = { status: 'skipped', invoiceId: null, error: null };

  try {
    // 1. Pre-flight Relevance Check
    const lowerName = fileData.filename.toLowerCase();
    const isObviousInvoice = lowerName.includes('invoice') || lowerName.includes('receipt') || lowerName.includes('bill');

    if (!isObviousInvoice) {
      console.log(`Checking content relevance for: ${fileData.filename}...`);
      const isRelevant = await isInvoiceContent(fileData.data, 'application/pdf');
      if (!isRelevant) {
        return { status: 'skipped', invoiceId: null, error: 'Document is not an invoice' };
      }
    }

    // 2. Duplicate Handling: Get Unique Filename
    // This replaces the old "skip if exists" logic
    const uniqueFilename = await getUniqueFilename(supabase, user.id, fileData.filename);
    
    if (uniqueFilename !== fileData.filename) {
        console.log(`Duplicate found. Renaming ${fileData.filename} -> ${uniqueFilename}`);
    }

    // 3. Upload to Storage
    // We keep Date.now() for the storage path to ensure backend uniqueness, 
    // but we use the "uniqueFilename" for the DB record so the user sees "File_1.pdf"
    const storagePath = `${user.id}/${Date.now()}_${uniqueFilename}`;
    
    const { error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(storagePath, fileData.data, { contentType: 'application/pdf' });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    // 4. Create Database Record
    const { data: invoice, error: dbError } = await supabase
      .from('invoices')
      .insert({
        user_id: user.id,
        file_name: uniqueFilename, // <--- Using the auto-incremented name here
        file_path: storagePath,
        file_type: 'application/pdf',
        file_size: fileData.size,
        analysis_status: 'pending',
        source_email: fileData.senderEmail,
      })
      .select()
      .single();

    if (dbError) throw new Error(`DB Insert failed: ${dbError.message}`);

    // 5. Trigger AI Analysis
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    fetch(`${supabaseUrl}/functions/v1/analyze-invoice`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`, 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ invoiceId: invoice.id, filePath: storagePath }),
    }).catch(err => console.error('Background analysis trigger failed:', err));

    results.status = 'processed';
    results.invoiceId = invoice.id;
    return results;

  } catch (err: any) {
    results.status = 'error';
    results.error = err.message;
    return results;
  }
}