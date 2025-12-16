import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Standardize how we process a found PDF
export async function processInvoiceAttachment(
  supabase: any,
  user: { id: string },
  fileData: { filename: string; data: Uint8Array; size: number; senderEmail: string },
  analyticsHeaders: any // For triggering the AI function
) {
  const results = { status: 'skipped', invoiceId: null, error: null };

  try {
    // 1. Check for duplicates (Idempotency)
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

    // 2. Upload to Storage
    const storagePath = `${user.id}/${Date.now()}_${fileData.filename}`;
    const { error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(storagePath, fileData.data, { contentType: 'application/pdf' });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    // 3. Create Database Record
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

    // 4. Trigger AI Analysis (Fire and Forget)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    // Note: We use the SERVICE_ROLE_KEY for the background trigger to ensure it has permission
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