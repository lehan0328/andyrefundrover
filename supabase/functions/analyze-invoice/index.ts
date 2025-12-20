import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../shared/cors.ts";

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const invoiceId = body?.invoiceId as string | undefined;
    const externalImageDataUrl = body?.imageDataUrl as string | undefined;
    const externalFileContent = body?.fileContent as string | undefined;

    if (!invoiceId) {
      return new Response(
        JSON.stringify({ error: 'Missing invoiceId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting analysis for invoice ${invoiceId}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch invoice details - Added user_id and file_name for duplicate check
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('file_path, file_type, upload_date, file_name, user_id')
      .eq('id', invoiceId)
      .single();

    if (fetchError || !invoice) {
      return new Response(
        JSON.stringify({ error: 'Invoice not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare content for analysis
    let fileContent = externalFileContent || '';
    let imageDataUrl: string | null = externalImageDataUrl || null;
    let mimeType = invoice.file_type;
    let base64Data = '';

    // If we don't have external data, download from storage
    if (!imageDataUrl && !fileContent) {
      console.log(`Fetching file from storage: ${invoice.file_path}`);
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('invoices')
        .download(invoice.file_path);

      if (downloadError || !fileData) {
        throw new Error('Failed to download invoice file');
      }

      // Prepare Base64 for PDF or Image
      if (mimeType === 'application/pdf' || mimeType.startsWith('image/')) {
        const buffer = new Uint8Array(await fileData.arrayBuffer());
        let binary = '';
        for (let i = 0; i < buffer.length; i++) {
          binary += String.fromCharCode(buffer[i]);
        }
        base64Data = btoa(binary);
      } else {
        // Fallback for plain text files
        fileContent = await fileData.text();
      }
    } else if (imageDataUrl) {
      // Parse externally provided Data URL (e.g., "data:application/pdf;base64,.....")
      const matches = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        base64Data = matches[2];
      }
    }

    // --- Google Gemini Integration ---
    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
    if (!GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY not configured');
    }

    // Define the schema for structured JSON output
    const responseSchema = {
      type: "OBJECT",
      properties: {
        invoice_number: { type: "STRING", nullable: true },
        invoice_date: { type: "STRING", description: "ISO 8601 format YYYY-MM-DD", nullable: true },
        vendor: { type: "STRING", nullable: true },
        line_items: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              description: { type: "STRING" },
              quantity: { type: "STRING", nullable: true },
              unit_price: { type: "STRING", nullable: true },
              total: { type: "STRING", nullable: true }
            },
            required: ["description"]
          }
        }
      },
      required: ["invoice_number", "invoice_date", "vendor", "line_items"]
    };

    const dateRules = `CRITICAL DATE EXTRACTION RULES:
    - Ignore PDF metadata.
    - ONLY use human-visible dates from the document body.
    - Prefer labels like "Invoice Date" or "Statement Date" or "Date" near the top.
    - EXCLUDE: Due Date, Ship Date.
    - Output invoice_date strictly in ISO YYYY-MM-DD format.
    - If no valid date found, return null.`;

    // Construct request parts
    const requestParts = [];
    if (base64Data) {
      requestParts.push({
        inline_data: {
          mime_type: mimeType,
          data: base64Data
        }
      });
      requestParts.push({ text: "Extract invoice data from this document." });
    } else {
      requestParts.push({ text: `Analyze this invoice text:\n${fileContent}` });
    }

    console.log(`Calling Gemini API (Model: gemini-1.5-flash)...`);

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: `You are an invoice analysis assistant. ${dateRules}` }]
          },
          contents: [{ role: "user", parts: requestParts }],
          generation_config: {
            response_mime_type: "application/json",
            response_schema: responseSchema,
            temperature: 0.1 // Low temperature for factual extraction
          }
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      throw new Error(`Gemini API Error: ${geminiResponse.status} - ${errorText}`);
    }

    const geminiData = await geminiResponse.json();
    const resultText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) {
      throw new Error("No data returned from Gemini");
    }

    let extractedData = JSON.parse(resultText);

    // --- Post-Processing / Validation ---

    extractedData = {
      invoice_number: extractedData.invoice_number || null,
      invoice_date: extractedData.invoice_date || null,
      vendor: extractedData.vendor || null,
      line_items: Array.isArray(extractedData.line_items) ? extractedData.line_items : []
    };

    console.log('Extracted Data:', JSON.stringify(extractedData));

    // --- Duplicate Check & Deletion ---
    if (extractedData.invoice_date && extractedData.vendor && invoice.user_id) {
      const { data: potentialDuplicates } = await supabase
        .from('invoices')
        .select('id, file_name, line_items')
        .eq('user_id', invoice.user_id)
        .eq('invoice_date', extractedData.invoice_date)
        .eq('vendor', extractedData.vendor)
        .neq('id', invoiceId); // Exclude the current invoice being processed

      if (potentialDuplicates && potentialDuplicates.length > 0) {
        const isDuplicate = potentialDuplicates.some(existing => {
          const isSameFileName = existing.file_name === invoice.file_name;
          // Deep compare line items
          const isSameLineItems = JSON.stringify(existing.line_items) === JSON.stringify(extractedData.line_items);
          return isSameFileName && isSameLineItems;
        });

        if (isDuplicate) {
          console.log(`Duplicate invoice detected (ID: ${invoiceId}). Deleting...`);
          
          // Delete the duplicate invoice
          const { error: deleteError } = await supabase
            .from('invoices')
            .delete()
            .eq('id', invoiceId);

          if (deleteError) {
            throw new Error(`Failed to delete duplicate invoice: ${deleteError.message}`);
          }

          // Return immediately after deletion
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Duplicate invoice detected and deleted.', 
              status: 'duplicate_deleted' 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Determine analysis status (only if not a duplicate)
    const analysisStatus = extractedData.invoice_date ? 'completed' : 'needs_review';

    // Update Database
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        invoice_number: extractedData.invoice_number,
        invoice_date: extractedData.invoice_date,
        vendor: extractedData.vendor,
        line_items: extractedData.line_items,
        analysis_status: analysisStatus
      })
      .eq('id', invoiceId);

    if (updateError) {
      throw new Error(`Database update failed: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, data: extractedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in analyze-invoice:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
