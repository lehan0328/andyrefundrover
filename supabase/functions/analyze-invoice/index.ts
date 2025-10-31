import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      .select('file_path, file_type, upload_date')
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
    let imageDataUrl: string | null = null;

    // Extract text from PDF - simple raw text extraction, or prepare image for AI OCR
    if (invoice.file_type === 'application/pdf') {
      try {
        console.log('Extracting text from PDF using raw text method');
        const rawBytes = new Uint8Array(await fileData.arrayBuffer());
        const rawText = new TextDecoder('latin1').decode(rawBytes);
        // Keep printable ASCII, common symbols, and newlines
        fileContent = rawText.replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s+/g, ' ');
        console.log(`Extracted ${fileContent.length} characters from PDF`);
      } catch (pdfError) {
        console.error('PDF extraction error:', pdfError);
        return new Response(
          JSON.stringify({ error: 'Failed to extract text from PDF' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (invoice.file_type?.startsWith('image/')) {
      try {
        console.log('Preparing image for AI OCR');
        const buffer = new Uint8Array(await fileData.arrayBuffer());
        let binary = '';
        for (let i = 0; i < buffer.length; i++) binary += String.fromCharCode(buffer[i]);
        const base64 = btoa(binary);
        imageDataUrl = `data:${invoice.file_type};base64,${base64}`;
      } catch (imgErr) {
        console.error('Image preparation error:', imgErr);
        return new Response(
          JSON.stringify({ error: 'Failed to prepare image for OCR' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      console.log('Unsupported file type for analysis:', invoice.file_type);
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
      body: JSON.stringify((() => {
        const payload: any = {
          model: 'google/gemini-2.5-flash',
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
        };

        const dateRules = `CRITICAL DATE EXTRACTION RULES:\n- Ignore PDF metadata/header values (CreationDate, ModDate, Producer, XMP).\n- ONLY use human-visible dates from the document body.\n- Strongly prefer a date explicitly labeled: “Invoice Date”, “Inv Date”, or a table cell labeled “Date” next to “Invoice #”, “Order #”, or under a “Sales Order/Invoice” header.\n- EXCLUDE contexts like: Due Date, Ship Date, Delivery/ETA, Statement Date, Period/Billing Period, Tax Date.\n- Accepted formats: MM/DD/YYYY, MM/DD/YY, DD/MM/YYYY, DD/MM/YY, YYYY-MM-DD, Month DD, YYYY.\n- Resolve 2-digit years: 00-29 -> 2000-2029; 30-99 -> 1930-1999.\n- If multiple candidates remain, choose the one closest to the document’s upload date (provided by the system) and within 2000..(today+60d).\n- Output invoice_date in ISO YYYY-MM-DD.`;

        if (imageDataUrl) {
          payload.messages = [
            { role: 'system', content: 'You are an invoice analysis assistant. Extract structured data from invoices.' },
            { role: 'user', content: [
              { type: 'text', text: `${dateRules}\nReturn ONLY JSON with fields invoice_number, invoice_date, vendor, line_items.` },
              { type: 'image_url', image_url: { url: imageDataUrl } }
            ]}
          ];
        } else {
          payload.messages = [
            { role: 'system', content: 'You are an invoice analysis assistant. Extract structured data from invoices.' },
            { role: 'user', content: `Analyze this invoice text carefully and extract required fields.\n${dateRules}\n\nInvoice text:\n${fileContent}\n\nReturn ONLY the JSON object.` }
          ];
        }
        return payload;
      })()),
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

    // Fallback: robust regex + context scoring if AI didn't return a reliable date
    const toISO = (m: number, d: number, y: number) => {
      // Normalize year
      if (y < 100) {
        y = y <= 29 ? 2000 + y : 1900 + y;
      }
      const mm = String(m).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      return `${y}-${mm}-${dd}`;
    };

    const withinRange = (iso: string) => {
      const t = Date.parse(iso);
      if (isNaN(t)) return false;
      const now = Date.now();
      const max = now + 60 * 24 * 60 * 60 * 1000; // today + 60d
      const min = Date.parse('2000-01-01');
      return t >= min && t <= max;
    };

    const uploadTime = invoice?.upload_date ? Date.parse(String(invoice.upload_date)) : undefined;

    const tryExtractDate = (text: string): string | null => {
      if (!text) return null;
      const excludes = /(due|ship|shipping|deliv|delivery|eta|expected|creationdate|moddate|producer|statement|period|billing|tax|expiry|expiration)/i;
      const preferInvoice = /(invoice\s*date|inv\.?\s*date)/i;
      const preferGeneric = /\bdate\b/i;

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

      type Cand = { iso: string; index: number; score: number };
      const cands: Cand[] = [];

      const pushCandidate = (iso: string, index: number, windowText: string) => {
        if (!withinRange(iso)) return;
        let score = 0;
        const win = windowText.toLowerCase();
        if (preferInvoice.test(win)) score += 10;
        else if (preferGeneric.test(win)) score += 4;
        if (/(sales\s*order|order\s*#|order\s*no|invoice\s*#|invoice\s*no)/i.test(win)) score += 2;
        if (excludes.test(win)) score -= 12;
        // Proximity to upload date
        if (uploadTime) {
          const t = Date.parse(iso);
          const days = Math.abs(t - uploadTime) / (1000 * 60 * 60 * 24);
          if (days <= 30) score += 6;
          else if (days <= 90) score += 4;
          else if (days <= 365) score += 2;
        }
        cands.push({ iso, index, score });
      };

      const lines = text.split(/\r?\n/);
      const getWindow = (i: number, start: number, end: number) => {
        const s = Math.max(0, i - start);
        const e = Math.min(lines.length - 1, i + end);
        return lines.slice(s, e + 1).join(' ');
      };

      // Scan numeric MM/DD/YY(YY)
      const numericRe = /(?<!\d)(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?!\d)/g;
      lines.forEach((ln, idx) => {
        let m: RegExpExecArray | null;
        while ((m = numericRe.exec(ln)) !== null) {
          const a = parseInt(m[1], 10);
          const b = parseInt(m[2], 10);
          const yRaw = parseInt(m[3], 10);
          // Assume US MM/DD by default; handle DD/MM if obvious
          let month = a;
          let day = b;
          if (a > 12 && b <= 12) { month = b; day = a; }
          const iso = toISO(month, day, yRaw);
          pushCandidate(iso, idx, getWindow(idx, 1, 2) + ' ' + ln);
        }
      });

      // Scan Month DD, YYYY
      const monthRe = /([A-Za-z]{3,9})\s+(\d{1,2}),\s*(\d{4})/g;
      lines.forEach((ln, idx) => {
        let m: RegExpExecArray | null;
        while ((m = monthRe.exec(ln)) !== null) {
          const mon = parseMonth(m[1]);
          const day = parseInt(m[2], 10);
          const year = parseInt(m[3], 10);
          if (mon) {
            const iso = toISO(mon, day, year);
            pushCandidate(iso, idx, getWindow(idx, 1, 2) + ' ' + ln);
          }
        }
      });

      // Scan ISO YYYY-MM-DD
      const isoRe = /(\d{4})-(\d{2})-(\d{2})/g;
      lines.forEach((ln, idx) => {
        let m: RegExpExecArray | null;
        while ((m = isoRe.exec(ln)) !== null) {
          const iso = `${m[1]}-${m[2]}-${m[3]}`;
          pushCandidate(iso, idx, getWindow(idx, 1, 2) + ' ' + ln);
        }
      });

      if (cands.length === 0) return null;
      // Sort by score desc, then by closeness to upload date, then by earliest index
      cands.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (uploadTime) {
          const da = Math.abs(Date.parse(a.iso) - uploadTime);
          const db = Math.abs(Date.parse(b.iso) - uploadTime);
          if (da !== db) return da - db;
        }
        return a.index - b.index;
      });

      return cands[0].iso;
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
