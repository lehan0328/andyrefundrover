import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as pdfjs from "https://esm.sh/pdfjs-dist@4.0.269/legacy/build/pdf.mjs";

// Configure PDF.js worker for edge runtime
// @ts-ignore - pdfjs exposes GlobalWorkerOptions at runtime
(pdfjs as any).GlobalWorkerOptions = (pdfjs as any).GlobalWorkerOptions || {};
// @ts-ignore
(pdfjs as any).GlobalWorkerOptions.workerSrc = "https://esm.sh/pdfjs-dist@4.0.269/legacy/build/pdf.worker.mjs";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invoiceId } = await req.json();

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

    // Fetch invoice details
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('file_path, file_type')
      .eq('id', invoiceId)
      .single();

    if (fetchError || !invoice) {
      console.error('Failed to fetch invoice:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Invoice not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching file from storage: ${invoice.file_path}`);

    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('invoices')
      .download(invoice.file_path);

    if (downloadError || !fileData) {
      console.error('Failed to download file:', downloadError);
      return new Response(
        JSON.stringify({ error: 'Failed to download invoice file' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let fileContent = '';

    // Extract text from PDF using pdfjs-dist
    if (invoice.file_type === 'application/pdf') {
      try {
        const arrayBuffer = await fileData.arrayBuffer();
        
        console.log('Parsing PDF to extract text with pdfjs-dist');
        
        // Load the PDF document
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        console.log(`PDF loaded, ${pdf.numPages} pages`);
        
        // Extract text from all pages
        const textPromises = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          textPromises.push(
            pdf.getPage(i).then(async (page) => {
              const textContent = await page.getTextContent();
              return textContent.items.map((item: any) => item.str).join(' ');
            })
          );
        }
        
        const pageTexts = await Promise.all(textPromises);
        fileContent = pageTexts.join('\n\n');
        
        console.log(`Extracted ${fileContent.length} characters from ${pdf.numPages} pages`);
        
      } catch (pdfError) {
        console.error('PDF extraction error:', pdfError);
        // Fallback: try to read raw text from PDF binary for date patterns
        try {
          const rawBytes = new Uint8Array(await fileData.arrayBuffer());
          const rawText = new TextDecoder('latin1').decode(rawBytes);
          // Keep printable ASCII and newlines
          fileContent = rawText.replace(/[^\x20-\x7E\n]/g, '');
          console.log(`Fallback raw text length: ${fileContent.length}`);
        } catch (e) {
          console.error('Fallback PDF binary read failed:', e);
          return new Response(
            JSON.stringify({ error: 'Failed to extract text from PDF' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    } else {
      // For non-PDF files (images), we'll need to use OCR or skip
      console.log('Non-PDF file type, using empty content');
      fileContent = '';
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analyzing invoice ${invoiceId} with AI`);

    // Call Lovable AI to analyze the invoice
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an invoice analysis assistant. Extract structured data from invoices.'
          },
          {
            role: 'user',
            content: `Analyze this invoice text carefully and extract the following information:

CRITICAL DATE EXTRACTION RULES:
- Search the ENTIRE document for date fields, not just the top
- Look for these patterns:
  * "Invoice Date:" followed by MM/DD/YYYY or MM/DD/YY
  * "Date:" followed by MM/DD/YYYY or MM/DD/YY
  * "Invoice Date:" on one line, then MM/DD/YYYY or MM/DD/YY on the next line
  * "Date:" on one line, then MM/DD/YYYY or MM/DD/YY on the next line
  * Dates can appear anywhere in format: MM/DD/YYYY, MM/DD/YY, M/D/YY, M/D/YYYY
- Accept ALL date formats: MM/DD/YYYY, MM/DD/YY, DD/MM/YYYY, DD/MM/YY, YYYY-MM-DD
- Two-digit years: 00-29 = 2000-2029, 30-99 = 1930-1999
- Convert all dates to YYYY-MM-DD format
- If multiple dates are found, prioritize the one labeled "Invoice Date" or "Date"

Invoice text:
${fileContent}

Extract and return the data in this structure:
{
  "invoice_number": "extracted invoice number or null",
  "invoice_date": "extracted date in YYYY-MM-DD format or null",
  "vendor": "extracted vendor/company name or null",
  "line_items": [
    {
      "description": "item description",
      "quantity": "quantity as string",
      "unit_price": "price as string",
      "total": "total as string"
    }
  ]
}

Return ONLY the JSON object, no other text.`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_invoice_data",
              description: "Extract structured data from an invoice",
              parameters: {
                type: "object",
                properties: {
                  invoice_number: { type: "string", description: "Invoice number" },
                  invoice_date: { type: "string", description: "Invoice date in YYYY-MM-DD format" },
                  vendor: { type: "string", description: "Vendor or company name" },
                  line_items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        description: { type: "string" },
                        quantity: { type: "string" },
                        unit_price: { type: "string" },
                        total: { type: "string" }
                      },
                      required: ["description"]
                    }
                  }
                },
                required: ["invoice_number", "invoice_date", "vendor", "line_items"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_invoice_data" } }
      }),
    });

    let aiData: any = null;
    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      // Continue without failing; we'll use regex fallbacks below
    } else {
      aiData = await aiResponse.json();
      console.log('AI Response:', JSON.stringify(aiData));
    }

    // Extract the tool call response
    let extractedData: any;
    if (aiData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments) {
      try {
        const parsed = JSON.parse(aiData.choices[0].message.tool_calls[0].function.arguments);
        
        // Clean up null values - convert string "null" to actual null
        extractedData = {
          invoice_number: parsed.invoice_number === "null" || !parsed.invoice_number ? null : parsed.invoice_number,
          invoice_date: parsed.invoice_date === "null" || !parsed.invoice_date ? null : parsed.invoice_date,
          vendor: parsed.vendor === "null" || !parsed.vendor ? null : parsed.vendor,
          line_items: Array.isArray(parsed.line_items) ? parsed.line_items : []
        };
      } catch (e) {
        console.error('Failed to parse tool call arguments:', e);
        extractedData = {
          invoice_number: null,
          invoice_date: null,
          vendor: null,
          line_items: []
        };
      }
    } else {
      console.error('No tool call in response');
      extractedData = {
        invoice_number: null,
        invoice_date: null,
        vendor: null,
        line_items: []
      };
    }

    console.log('Extracted text sample for debugging:', fileContent.substring(0, 500));

    // Fallback: regex-based date extraction if AI did not return a date
    const toISO = (m: number, d: number, y: number) => {
      // Normalize year
      if (y < 100) {
        y = y <= 29 ? 2000 + y : 1900 + y;
      }
      const mm = String(m).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      return `${y}-${mm}-${dd}`;
    };

    const tryExtractDate = (text: string): string | null => {
      if (!text) return null;

      const monthMap: Record<string, number> = {
        jan: 1, january: 1,
        feb: 2, february: 2,
        mar: 3, march: 3,
        apr: 4, april: 4,
        may: 5,
        jun: 6, june: 6,
        jul: 7, july: 7,
        aug: 8, august: 8,
        sep: 9, sept: 9, september: 9,
        oct: 10, october: 10,
        nov: 11, november: 11,
        dec: 12, december: 12,
      };

      const parseMonth = (name: string) => monthMap[name.toLowerCase() as keyof typeof monthMap];

      // 1) Label + inline date patterns (MM/DD/YYYY or MM/DD/YY)
      const labeled = /(invoice\s*date|date)\s*[:\-\s]*([0-1]?\d\/[0-3]?\d\/\d{2,4})/i.exec(text);
      if (labeled && labeled[2]) {
        const [m, d, yRaw] = labeled[2].split('/').map((v) => parseInt(v, 10));
        if (!isNaN(m) && !isNaN(d) && !isNaN(yRaw)) return toISO(m, d, yRaw);
      }

      // 1b) Label + inline Month DD, YYYY
      const labeledMonth = /(invoice\s*date|date)\s*[:\-\s]*([A-Za-z]{3,9})\s+(\d{1,2}),\s*(\d{4})/i.exec(text);
      if (labeledMonth) {
        const m = parseMonth(labeledMonth[2]);
        const d = parseInt(labeledMonth[3], 10);
        const y = parseInt(labeledMonth[4], 10);
        if (m && !isNaN(d) && !isNaN(y)) return toISO(m, d, y);
      }

      // 2) Label line then date on next line
      const lines = text.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/^(.*\b(invoice\s*date|date)\b.*)$/i.test(line)) {
          const next = lines[i + 1] || '';
          // Next line numeric format
          let nextMatch = /([0-1]?\d\/[0-3]?\d\/\d{2,4})/.exec(next);
          if (nextMatch) {
            const [m, d, yRaw] = nextMatch[1].split('/').map((v) => parseInt(v, 10));
            if (!isNaN(m) && !isNaN(d) && !isNaN(yRaw)) return toISO(m, d, yRaw);
          }
          // Next line Month DD, YYYY
          const nextMonth = /([A-Za-z]{3,9})\s+(\d{1,2}),\s*(\d{4})/.exec(next);
          if (nextMonth) {
            const m = parseMonth(nextMonth[1]);
            const d = parseInt(nextMonth[2], 10);
            const y = parseInt(nextMonth[3], 10);
            if (m && !isNaN(d) && !isNaN(y)) return toISO(m, d, y);
          }
        }
      }

      // 3) ISO format anywhere
      const iso = /(\d{4})-(\d{2})-(\d{2})/.exec(text);
      if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

      // 4) Any Month DD, YYYY anywhere (fallback)
      const anyMonth = /([A-Za-z]{3,9})\s+(\d{1,2}),\s*(\d{4})/.exec(text);
      if (anyMonth) {
        const m = parseMonth(anyMonth[1]);
        const d = parseInt(anyMonth[2], 10);
        const y = parseInt(anyMonth[3], 10);
        if (m && !isNaN(d) && !isNaN(y)) return toISO(m, d, y);
      }

      return null;
    };

    if (!extractedData.invoice_date) {
      const fallbackDate = tryExtractDate(fileContent);
      if (fallbackDate) extractedData.invoice_date = fallbackDate;
    }

    // Update the invoice record in the database
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        invoice_number: extractedData.invoice_number,
        invoice_date: extractedData.invoice_date,
        vendor: extractedData.vendor,
        line_items: extractedData.line_items,
        analysis_status: 'completed'
      })
      .eq('id', invoiceId);

    if (updateError) {
      console.error('Database update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to save analysis results' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Invoice ${invoiceId} analysis completed`);

    return new Response(
      JSON.stringify({ 
        success: true,
        data: extractedData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-invoice function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
