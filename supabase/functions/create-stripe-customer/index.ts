import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../shared/cors.ts";

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    console.log("Creating Stripe customer for user:", user.id, user.email);

    // Check if user already has a Stripe customer
    const { data: existingCustomer } = await supabaseClient
      .from("stripe_customers")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (existingCustomer) {
      console.log("User already has Stripe customer:", existingCustomer.stripe_customer_id);
      return new Response(
        JSON.stringify({ customerId: existingCustomer.stripe_customer_id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user profile for name
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("full_name, company_name")
      .eq("id", user.id)
      .single();

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: user.email,
      name: profile?.full_name || undefined,
      metadata: {
        user_id: user.id,
        company_name: profile?.company_name || "",
      },
    });

    console.log("Created Stripe customer:", customer.id);

    // Store in database using service role to bypass RLS for insert
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { error: insertError } = await supabaseAdmin
      .from("stripe_customers")
      .insert({
        user_id: user.id,
        stripe_customer_id: customer.id,
      });

    if (insertError) {
      console.error("Error storing Stripe customer:", insertError);
      throw new Error("Failed to store Stripe customer");
    }

    return new Response(
      JSON.stringify({ customerId: customer.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating Stripe customer:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
