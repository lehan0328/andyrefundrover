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
    const { invoiceId, fileContent } = await req.json();

    if (!invoiceId || !fileContent) {
      return new Response(
        JSON.stringify({ error: 'Missing invoiceId or fileContent' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analyzing invoice ${invoiceId}`);

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

IMPORTANT DATE EXTRACTION RULES:
- Look for dates labeled as: "Invoice Date", "Date", "Issued Date", "Bill Date", or similar
- The date might appear as a label on one line with the actual date on the next line
- Common date formats: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD, Month DD, YYYY
- Look near the top of the invoice for date information
- Convert all dates to YYYY-MM-DD format

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

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI analysis failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    console.log('AI Response:', JSON.stringify(aiData));

    // Extract the tool call response
    let extractedData;
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

    // Update the invoice record in the database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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
