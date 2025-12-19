import { getDocument, GlobalWorkerOptions } from "https://esm.sh/pdfjs-dist@3.11.174/build/pdf.mjs";

// Configure worker
GlobalWorkerOptions.workerSrc = "https://esm.sh/pdfjs-dist@3.11.174/build/pdf.worker.min.mjs";

async function extractTextFromPdf(data: Uint8Array): Promise<string> {
  try {
    const loadingTask = getDocument({ data });
    const pdfDocument = await loadingTask.promise;
    const page = await pdfDocument.getPage(1);
    const textContent = await page.getTextContent();
    return textContent.items.map((item: any) => item.str).join(' ');
  } catch (error) {
    console.error("PDF extraction error:", error);
    return ""; 
  }
}

/**
 * Helper: Validates content is an Invoice AND NOT a Pro Forma.
 */
async function isInvoiceContent(fileData: Uint8Array): Promise<boolean> {
  try {
    const text = await extractTextFromPdf(fileData);
    
    // Fail Open: If scan/image, we can't read text, so we keep it to be safe.
    if (!text || text.trim().length === 0) {
      console.warn("No text extracted. Defaulting to valid.");
      return true; 
    }

    // 1. Positive Check: Must contain "Invoice"
    const invoiceRegex = /\binvoices?\b/i;
    if (!invoiceRegex.test(text)) {
        console.log("Rejected: Missing 'invoice' keyword.");
        return false;
    }

    // 2. Negative Check: Must NOT contain "Pro Forma"
    // Matches: "pro forma", "pro-forma", "Pro Forma", "PRO-FORMA"
    const proFormaRegex = /\bpro[\s-]?forma\b/i;
    if (proFormaRegex.test(text)) {
        console.log("Rejected: Detected 'Pro Forma' document.");
        return false;
    }

    return true;

  } catch (e) {
    console.error("Content check error:", e);
    return true; // Fail open
  }
}

async function getUniqueFilename(supabase: any, userId: string, filename: string): Promise<string> {
  const lastDot = filename.lastIndexOf('.');
  const name = lastDot !== -1 ? filename.substring(0, lastDot) : filename;
  const ext = lastDot !== -1 ? filename.substring(lastDot) : '';
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const { data: matches } = await supabase
    .from('invoices')
    .select('file_name')
    .eq('user_id', userId)
    .ilike('file_name', `${name}%${ext}`);

  if (!matches || matches.length === 0) return filename;

  const pattern = new RegExp(`^${escapedName}(?:_(\\d+))?${ext}$`, 'i');
  let maxCounter = -1;
  let hasExactMatch = false;

  for (const row of matches) {
    const match = row.file_name.match(pattern);
    if (match) {
      if (match[1]) maxCounter = Math.max(maxCounter, parseInt(match[1], 10));
      else hasExactMatch = true;
    }
  }

  if (!hasExactMatch && maxCounter === -1) return filename;
  const nextCounter = maxCounter === -1 ? 1 : maxCounter + 1;
  return `${name}_${nextCounter}${ext}`;
}

export async function processInvoiceAttachment(
  supabase: any,
  user: { id: string },
  fileData: { filename: string; data: Uint8Array; size: number; senderEmail: string },
  analyticsHeaders: any
) {
  try {
    // 1. Relevance Check (Keywords + Pro Forma Exclusion)
    // We check content regardless of filename now, to ensure a file named "invoice.pdf" isn't actually a "pro forma" inside.
    console.log(`Checking content for: ${fileData.filename}...`);
    const isRelevant = await isInvoiceContent(fileData.data);
    
    if (!isRelevant) {
        return { status: 'skipped', invoiceId: null, error: 'Document rejected (Not an invoice or is Pro Forma)' };
    }

    // 2. Duplicate Handling
    const uniqueFilename = await getUniqueFilename(supabase, user.id, fileData.filename);
    
    // 3. Upload to Storage
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
        file_name: uniqueFilename,
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

    return { status: 'processed', invoiceId: invoice.id, error: null };

  } catch (err: any) {
    return { status: 'error', invoiceId: null, error: err.message };
  }
}