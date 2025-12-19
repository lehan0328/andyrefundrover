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
    // 1. Prepare Base64
    let binary = '';
    for (let i = 0; i < fileData.length; i++) {
      binary += String.fromCharCode(fileData[i]);
    }
    const base64Data = btoa(binary);

    // 2. Call Gemini
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
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Data
                }
              },
              { text: "Does this document appear to be an invoice, receipt, bill, or purchase order? Respond with JSON: { \"is_financial_doc\": boolean }" }
            ]
          }],
          generation_config: {
            response_mime_type: "application/json"
          }
        })
      }
    );

    if (!response.ok) {
        console.error("Gemini classification failed:", await response.text());
        return true; // Default to saving if AI fails
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return true;

    const result = JSON.parse(text);
    return result.is_financial_doc === true;

  } catch (e) {
    console.error("Pre-check error:", e);
    return true; // Default to saving if error
  }
}

export async function processInvoiceAttachment(
  supabase: any,
  user: { id: string },
  fileData: { filename: string; data: Uint8Array; size: number; senderEmail: string },
  analyticsHeaders: any
) {
  const results = { status: 'skipped', invoiceId: null, error: null };

  try {
    // Pre-flight Relevance Check ---
    
    // 1. Heuristic: If filename says "invoice" or "receipt", trust it (saves AI cost/latency)
    const lowerName = fileData.filename.toLowerCase();
    const isObviousInvoice = lowerName.includes('invoice') || lowerName.includes('receipt') || lowerName.includes('bill');

    if (!isObviousInvoice) {
      console.log(`Checking content relevance for: ${fileData.filename}...`);
      const isRelevant = await isInvoiceContent(fileData.data, 'application/pdf');
      
      if (!isRelevant) {
        console.log(`Skipping irrelevant file: ${fileData.filename}`);
        // Return early so we don't upload to storage or DB
        return { status: 'skipped', invoiceId: null, error: 'Document is not an invoice' };
      }
    }

    // 2. Check for duplicates (Idempotency)
    const { data: existing } = await supabase
      .from('invoices')
      .select('id')
      .eq('user_id', user.id)
      .eq('file_name', fileData.filename)
      .eq('source_email', fileData.senderEmail)
      .maybeSingle();

    if (existing) {
      console.log(`Skipping duplicate: ${fileData.filename}`);
      return results;
    }

    // 3. Upload to Storage
    const storagePath = `${user.id}/${Date.now()}_${fileData.filename}`;
    const { error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(storagePath, fileData.data, { contentType: 'application/pdf' });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    // 4. Create Database Record
    const { data: invoice, error: dbError } = await supabase
      .from('invoices')
      .insert({
        user_id: user.id,
        file_name: fileData.filename,
        file_path: storagePath,
        file_type: 'application/pdf',
        file_size: fileData.size,
        analysis_status: 'pending',
        source_email: fileData.senderEmail,
      })
      .select()
      .single();

    if (dbError) throw new Error(`DB Insert failed: ${dbError.message}`);

    // 5. Trigger AI Analysis (Fire and Forget)
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