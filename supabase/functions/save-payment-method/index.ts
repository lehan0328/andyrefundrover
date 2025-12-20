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
    const { paymentMethodId } = await req.json();

    if (!paymentMethodId) {
      throw new Error("Payment method ID is required");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Authenticate User
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    // Initialize Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("Saving payment method for user:", user.id);

    // Get user's Stripe customer ID
    const { data: stripeCustomer, error: customerError } = await supabaseAdmin
      .from("stripe_customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (customerError || !stripeCustomer) {
      console.error("Stripe customer lookup error:", customerError);
      throw new Error("No Stripe customer found");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Retrieve and Set Default Payment Method
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    await stripe.customers.update(stripeCustomer.stripe_customer_id, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    // Update database
    const { error: updateError } = await supabaseAdmin
      .from("stripe_customers")
      .update({
        default_payment_method_id: paymentMethodId,
        card_last_four: paymentMethod.card?.last4 || null,
        card_brand: paymentMethod.card?.brand || null,
      })
      .eq("user_id", user.id);

    if (updateError) throw new Error("Failed to save payment method");

    // --- NEW LOGIC: Award Welcome Credit ---
    let creditAwarded = false;
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("welcome_credit_received, credits_balance")
      .eq("id", user.id)
      .single();

    if (profile && !profile.welcome_credit_received) {
      console.log("First payment method added. Awarding $100 credit to:", user.id);
      
      const currentBalance = Number(profile.credits_balance) || 0;
      
      const { error: creditError } = await supabaseAdmin
        .from("profiles")
        .update({
          credits_balance: currentBalance + 100,
          welcome_credit_received: true
        })
        .eq("id", user.id);

      if (!creditError) creditAwarded = true;
    }
    // ---------------------------------------

    return new Response(
      JSON.stringify({ 
        success: true,
        creditAwarded: creditAwarded,
        card: {
          last4: paymentMethod.card?.last4,
          brand: paymentMethod.card?.brand,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error saving payment method:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});