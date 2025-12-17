import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getCorsHeaders } from "../shared/cors.ts";

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const publishableKey = Deno.env.get("VITE_STRIPE_PUBLISHABLE_KEY");
    
    if (!publishableKey) {
      console.error("VITE_STRIPE_PUBLISHABLE_KEY not found in environment");
      return new Response(
        JSON.stringify({ error: "Stripe publishable key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Returning Stripe publishable key");
    return new Response(
      JSON.stringify({ publishableKey }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching Stripe publishable key:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
