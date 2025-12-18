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
    // 1. Initialize Supabase Client (for Auth only)
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // 2. Initialize Admin Client (for Database Operations)
    // We initialize this early to use it for both checking and inserting
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
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

    // 3. Check if user has a Stripe customer using ADMIN client
    // This bypasses RLS, ensuring we see the record if it exists
    const { data: stripeCustomer } = await supabaseAdmin
      .from("stripe_customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let customerId = stripeCustomer?.stripe_customer_id;

    // If no customer exists, create one automatically
    if (!customerId) {
      console.log("No Stripe customer found in DB, checking/creating...");

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

      // 4. Try to insert, handling potential race conditions
      const { error: insertError } = await supabaseAdmin
        .from("stripe_customers")
        .insert({
          user_id: user.id,
          stripe_customer_id: customer.id,
        });

      if (insertError) {
        // If the error is a duplicate key violation (race condition or RLS issue previously hiding it)
        if (insertError.code === "23505") {
          console.log("Race condition detected: Customer already exists. Fetching existing ID.");
          const { data: existingCustomer } = await supabaseAdmin
            .from("stripe_customers")
            .select("stripe_customer_id")
            .eq("user_id", user.id)
            .single();
            
          if (existingCustomer) {
            customerId = existingCustomer.stripe_customer_id;
          } else {
             throw new Error("Failed to retrieve existing customer after duplicate error.");
          }
        } else {
          console.error("Error storing Stripe customer:", insertError);
          throw new Error("Failed to store Stripe customer");
        }
      } else {
        customerId = customer.id;
        console.log("Stored Stripe customer in database");
      }
    }

    // Create SetupIntent with automatic_payment_methods for PaymentElement
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      automatic_payment_methods: {
        enabled: true,
      },
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