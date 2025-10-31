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
    const body = await req.json();
    const invoiceId = body?.invoiceId as string | undefined;
    const externalImageDataUrl = body?.imageDataUrl as string | undefined;

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
      console.error('Failed to download file. Error:', downloadError);
      console.error('File path attempted:', invoice.file_path);
      console.error('Storage bucket: invoices');
      return new Response(
        JSON.stringify({ 
          error: 'Failed to download invoice file',
          details: downloadError?.message || 'File not found in storage'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let fileContent = '';
    let imageDataUrl: string | null = null;
    // Allow client-provided preview image for OCR
    if (externalImageDataUrl) {
      imageDataUrl = externalImageDataUrl;
    }

    // Extract text from PDF - try text extraction first, fall back to regex if no readable text
    if (invoice.file_type === 'application/pdf') {
      console.log('Attempting PDF text extraction');
      const rawBytes = new Uint8Array(await fileData.arrayBuffer());
      
      try {
        const rawText = new TextDecoder('latin1').decode(rawBytes);
        let cleaned = rawText.replace(/\r\n/g, '\n');
        cleaned = cleaned.replace(/[^\x09\x20-\x7E\n]/g, ' ');
        cleaned = cleaned
          .split('\n')
          .map((ln) => ln.replace(/[\t ]{2,}/g, ' ').trimEnd())
          .join('\n');
        cleaned = cleaned
          .split('\n')
          .filter((ln) => !/(^%PDF|\bobj\b|\bendobj\b|\/Producer\(|CreationDate\(|ModDate\(|XMP|xpacket)/i.test(ln))
          .join('\n');
        
        // Check if extracted text is readable (has enough letters/words)
        const readableChars = (cleaned.match(/[a-zA-Z]/g) || []).length;
        const readableRatio = readableChars / Math.max(cleaned.length, 1);
        
        console.log(`Extracted ${cleaned.length} chars, ${readableChars} readable (${(readableRatio * 100).toFixed(1)}% readable)`);
        
        fileContent = cleaned;
        
        if (readableRatio < 0.3 || cleaned.length < 100) {
          console.log('PDF appears to be image-based or has poor text layer - will rely on regex fallback');
        }
      } catch (err) {
        console.error('PDF processing error:', err);
        return new Response(
          JSON.stringify({ error: 'Failed to process PDF' }),
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

        const dateRules = `CRITICAL DATE EXTRACTION RULES:\n- Ignore PDF metadata/header values (CreationDate, ModDate, Producer, XMP).\n- ONLY use human-visible dates from the document body.\n- Strongly prefer a date explicitly labeled: “Invoice Date”, “Inv Date”, or a table cell labeled “Date” next to “Invoice #”, “Order #”, or under a “Sales Order/Invoice” header.\n- EXCLUDE contexts like: Due Date, Ship Date, Delivery/ETA, Statement Date, Period/Billing Period, Tax Date.\n- Accepted formats: MM/DD/YYYY, MM/DD/YY, DD/MM/YYYY, DD/MM/YY, YYYY-MM-DD, Month DD, YYYY.\n- Resolve 2-digit years: 00-29 -> 2000-2029; 30-99 -> 1930-1999.\n- If you cannot find a labeled date, return an empty string for invoice_date (DO NOT GUESS).\n- Output invoice_date in ISO YYYY-MM-DD.`;

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
      
      // If it's a payment/credit issue, log and continue with fallback
      if (aiResponse.status === 402) {
        console.log('AI service has insufficient credits, will use regex fallback only');
      }
    } else {
      try {
        aiData = await aiResponse.json();
        console.log('AI Response:', JSON.stringify(aiData));
      } catch (jsonErr) {
        console.error('Failed to parse AI response as JSON:', jsonErr);
        aiData = null; // Ensure it's null on parse failure
      }
    }

    // Initialize extractedData with defaults
    let extractedData: any = {
      invoice_number: null,
      invoice_date: null,
      vendor: null,
      line_items: []
    };

    // Extract the tool call response if available
    if (aiData?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments) {
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
      }
    } else {
      console.log('No AI tool call response available, will use regex fallback');
    }

    console.log('Extracted text sample for debugging:', fileContent.substring(0, 500));

    // AI Guardrail: validate AI date against document dates
    const toISO = (m: number, d: number, y: number) => {
      if (y < 100) y = y <= 29 ? 2000 + y : 1900 + y;
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    };

    const withinRange = (iso: string) => {
      const t = Date.parse(iso);
      if (isNaN(t)) return false;
      const now = Date.now();
      const max = now + 60 * 24 * 60 * 60 * 1000;
      const min = Date.parse('2000-01-01');
      return t >= min && t <= max;
    };

    const uploadTime = invoice?.upload_date ? Date.parse(String(invoice.upload_date)) : undefined;

    // Extract all dates from document for validation
    const extractAllDates = (text: string): Set<string> => {
      const dates = new Set<string>();
      const monthMap: Record<string, number> = {
        jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
        apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
        aug: 8, august: 8, sep: 9, sept: 9, september: 9,
        oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
      };
      // Numeric dates
      const numRe = /(?<!\d)(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?!\d)/g;
      let m: RegExpExecArray | null;
      while ((m = numRe.exec(text)) !== null) {
        let a = parseInt(m[1], 10), b = parseInt(m[2], 10), y = parseInt(m[3], 10);
        if (a > 12 && b <= 12) { const tmp = a; a = b; b = tmp; }
        const iso = toISO(a, b, y);
        if (withinRange(iso)) dates.add(iso);
      }
      // Month DD, YYYY
      const monRe = /([A-Za-z]{3,9})\s+(\d{1,2}),?\s*(\d{4})/g;
      while ((m = monRe.exec(text)) !== null) {
        const mon = monthMap[m[1].toLowerCase() as keyof typeof monthMap];
        if (mon) {
          const iso = toISO(mon, parseInt(m[2], 10), parseInt(m[3], 10));
          if (withinRange(iso)) dates.add(iso);
        }
      }
      // ISO format
      const isoRe = /(\d{4})-(\d{2})-(\d{2})/g;
      while ((m = isoRe.exec(text)) !== null) {
        const iso = `${m[1]}-${m[2]}-${m[3]}`;
        if (withinRange(iso)) dates.add(iso);
      }
      return dates;
    };

    const documentDates = extractAllDates(fileContent);
    console.log(`Found ${documentDates.size} valid dates in document:`, Array.from(documentDates).slice(0, 10));

    // Validate AI date against document
    if (extractedData.invoice_date && !documentDates.has(extractedData.invoice_date)) {
      console.log(`AI date ${extractedData.invoice_date} not found in document, discarding`);
      extractedData.invoice_date = null;
    }

    const tryExtractDate = (text: string): string | null => {
      if (!text) return null;
      const excludes = /(due|ship|shipping|deliv|delivery|eta|expected|creationdate|moddate|producer|statement|period|billing|tax|expiry|expiration)/i;
      const preferInvoice = /(invoice\s*date|inv\.?\s*date)/i;
      const preferSalesOrder = /(sales\s*order\s*date|so\s*date)/i;
      const preferGeneric = /\bdate\s*:/i;

      const monthMap: Record<string, number> = {
        jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
        apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
        aug: 8, august: 8, sep: 9, sept: 9, september: 9,
        oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
      };
      const parseMonth = (name: string) => monthMap[name.toLowerCase() as keyof typeof monthMap];

      type Cand = { iso: string; index: number; score: number; context: string };
      const labeled: Cand[] = [];
      const general: Cand[] = [];

      const pushCandidate = (iso: string, index: number, windowText: string, isLabeled: boolean) => {
        if (!withinRange(iso)) return;
        let score = 0;
        const win = windowText.toLowerCase();
        
        // Strong boost for explicit invoice date labels (highest priority)
        if (preferInvoice.test(win)) score += 15;
        // Sales order date (second priority)
        else if (preferSalesOrder.test(win)) score += 12;
        // Generic "Date:" label (third priority)
        else if (preferGeneric.test(win)) score += 8;
        
        // Boost if near order/invoice identifiers
        if (/(invoice\s*#|invoice\s*no)/i.test(win)) score += 3;
        else if (/(sales\s*order|order\s*#|order\s*no)/i.test(win)) score += 2;
        
        // Strong penalty for excluded contexts
        if (excludes.test(win)) score -= 15;
        
        // Only use upload proximity as tie-breaker (lower bonus)
        if (uploadTime) {
          const t = Date.parse(iso);
          const days = Math.abs(t - uploadTime) / (1000 * 60 * 60 * 24);
          if (days <= 30) score += 1;
          else if (days <= 90) score += 0.5;
        }
        
        (isLabeled ? labeled : general).push({ iso, index, score, context: win.substring(0, 100) });
      };

      const lines = text.split(/\r?\n/);
      const getWindow = (i: number, start: number, end: number) => {
        const s = Math.max(0, i - start);
        const e = Math.min(lines.length - 1, i + end);
        return lines.slice(s, e + 1).join(' ');
      };

      // Pass A: Dates adjacent to date labels (same line or next 3 lines for multi-line formats)
      const scanLabeledWindow = (regex: RegExp) => {
        lines.forEach((ln, idx) => {
          if (regex.test(ln)) {
            // Expand window to include next 3 lines for "Date:\n8/18/2025" format
            const window = [ln, lines[idx + 1] || '', lines[idx + 2] || '', lines[idx + 3] || ''].join(' ');
            
            // numeric MM/DD/YYYY or DD/MM/YYYY
            const numMatches = window.matchAll(/(?<!\d)(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?!\d)/g);
            for (const num of numMatches) {
              let a = parseInt(num[1], 10), b = parseInt(num[2], 10), y = parseInt(num[3], 10);
              if (a > 12 && b <= 12) { const tmp = a; a = b; b = tmp; }
              pushCandidate(toISO(a, b, y), idx, window, true);
            }
            
            // Month DD, YYYY
            const monMatches = window.matchAll(/([A-Za-z]{3,9})\s+(\d{1,2}),?\s*(\d{4})/g);
            for (const mon of monMatches) {
              const m = parseMonth(mon[1]); const d = parseInt(mon[2], 10); const y = parseInt(mon[3], 10);
              if (m) pushCandidate(toISO(m, d, y), idx, window, true);
            }
            
            // ISO format
            const isoMatches = window.matchAll(/(\d{4})-(\d{2})-(\d{2})/g);
            for (const iso of isoMatches) {
              pushCandidate(`${iso[1]}-${iso[2]}-${iso[3]}`, idx, window, true);
            }
          }
        });
      };
      
      // Scan with priority order: Invoice Date > Sales Order Date > Generic Date
      scanLabeledWindow(/invoice\s*date|inv\.?\s*date/i);
      scanLabeledWindow(/sales\s*order\s*date|so\s*date/i);
      scanLabeledWindow(/\bdate\s*:/i);

      // Pass B: General scan (only used if no labeled results)
      const numericRe = /(?<!\d)(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?!\d)/g;
      lines.forEach((ln, idx) => {
        let m: RegExpExecArray | null;
        while ((m = numericRe.exec(ln)) !== null) {
          const a = parseInt(m[1], 10), b = parseInt(m[2], 10), yRaw = parseInt(m[3], 10);
          let month = a, day = b; if (a > 12 && b <= 12) { month = b; day = a; }
          pushCandidate(toISO(month, day, yRaw), idx, getWindow(idx, 1, 2) + ' ' + ln, false);
        }
      });
      const monthRe = /([A-Za-z]{3,9})\s+(\d{1,2}),\s*(\d{4})/g;
      lines.forEach((ln, idx) => {
        let m: RegExpExecArray | null;
        while ((m = monthRe.exec(ln)) !== null) {
          const mon = parseMonth(m[1]); const day = parseInt(m[2], 10); const year = parseInt(m[3], 10);
          if (mon) pushCandidate(toISO(mon, day, year), idx, getWindow(idx, 1, 2) + ' ' + ln, false);
        }
      });
      const isoRe = /(\d{4})-(\d{2})-(\d{2})/g;
      lines.forEach((ln, idx) => {
        let m: RegExpExecArray | null;
        while ((m = isoRe.exec(ln)) !== null) {
          pushCandidate(`${m[1]}-${m[2]}-${m[3]}`, idx, getWindow(idx, 1, 2) + ' ' + ln, false);
        }
      });

      const pick = (arr: Cand[]) => {
        if (arr.length === 0) return null;
        arr.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          if (uploadTime) {
            const da = Math.abs(Date.parse(a.iso) - uploadTime);
            const db = Math.abs(Date.parse(b.iso) - uploadTime);
            if (da !== db) return da - db;
          }
          return a.index - b.index;
        });
        console.log(`Candidates for ${arr === labeled ? 'labeled' : 'general'}:`, arr.slice(0, 5).map(c => ({ iso: c.iso, score: c.score, context: c.context })));
        return arr[0].iso;
      };

      const result = pick(labeled) ?? pick(general);
      if (result) console.log(`Selected date: ${result}`);
      return result;
    };

    if (!extractedData.invoice_date) {
      console.log('Running fallback date extraction');
      const fallbackDate = tryExtractDate(fileContent);
      if (fallbackDate) extractedData.invoice_date = fallbackDate;
    }

    // Determine analysis status
    const analysisStatus = extractedData.invoice_date ? 'completed' : 'needs_review';
    if (!extractedData.invoice_date) {
      console.log('No valid invoice date found, marking as needs_review');
    }

    // Update the invoice record in the database
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
