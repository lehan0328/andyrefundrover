import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
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

    console.log("Creating setup intent for user:", user.id);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Check if user has a Stripe customer
    const { data: stripeCustomer } = await supabaseClient
      .from("stripe_customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    let customerId = stripeCustomer?.stripe_customer_id;

    // If no customer exists, create one automatically
    if (!customerId) {
      console.log("No Stripe customer found, creating one...");

      // Get user profile for name and company
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("full_name, company_name")
        .eq("id", user.id)
        .single();

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

      // Store in database using service role key
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

      customerId = customer.id;
      console.log("Stored Stripe customer in database");
    }

    // Create SetupIntent for saving card
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
      usage: "off_session",
    });

    console.log("Created setup intent:", setupIntent.id);

    return new Response(
      JSON.stringify({ 
        clientSecret: setupIntent.client_secret,
        setupIntentId: setupIntent.id 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating setup intent:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
