import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../shared/cors.ts";

interface StripeError extends Error {
  type?: string;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, amount, billMonth, billWeek, description } = await req.json();

    if (!userId || amount === undefined || !billMonth) {
      throw new Error("userId, amount, and billMonth are required");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // ... (Keep existing Admin authorization check here) ...
     const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? ""
      );
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabaseClient.auth.getUser(token);
      
      if (user) {
        const { data: userRole } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();
        
        if (userRole?.role !== "admin") {
          throw new Error("Only admins can charge cards");
        }
      }
    }

    console.log("Processing charge for user:", userId, "Gross Amount:", amount);

    // 1. Fetch User Profile to check Credits
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("credits_balance")
      .eq("id", userId)
      .single();

    if (profileError) throw new Error("Failed to fetch user profile for credits");

    const currentCredits = Number(profile.credits_balance) || 0;
    let chargeAmount = amount;
    let creditsUsed = 0;

    // 2. Calculate Deductions
    if (currentCredits > 0) {
      if (currentCredits >= amount) {
        creditsUsed = amount;
        chargeAmount = 0;
      } else {
        creditsUsed = currentCredits;
        chargeAmount = amount - currentCredits;
      }
    }

    console.log(`Credits available: ${currentCredits}, Credits used: ${creditsUsed}, Net Charge: ${chargeAmount}`);

    let paymentIntentId = null;
    let paymentStatus = "succeeded"; // Default to succeeded if fully covered by credits

    // 3. Process Stripe Charge (only if there is a remaining balance)
    if (chargeAmount > 0) {
      const { data: stripeCustomer, error: customerError } = await supabaseAdmin
        .from("stripe_customers")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (customerError || !stripeCustomer) throw new Error("No Stripe customer found");
      if (!stripeCustomer.default_payment_method_id) throw new Error("No payment method on file");

      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
        apiVersion: "2023-10-16",
      });

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(chargeAmount * 100),
        currency: "usd",
        customer: stripeCustomer.stripe_customer_id,
        payment_method: stripeCustomer.default_payment_method_id,
        off_session: true,
        confirm: true,
        description: `${description || 'Service Fee'} (Credit Applied: $${creditsUsed.toFixed(2)})`,
        metadata: {
          user_id: userId,
          bill_month: billMonth,
          bill_week: billWeek || "",
          credits_used: creditsUsed.toString(),
          original_amount: amount.toString()
        },
      });

      paymentIntentId = paymentIntent.id;
      paymentStatus = paymentIntent.status;
    }

    // 4. Update Credits Balance
    if (creditsUsed > 0 && paymentStatus === "succeeded") {
      await supabaseAdmin
        .from("profiles")
        .update({ credits_balance: currentCredits - creditsUsed })
        .eq("id", userId);
    }

    // 5. Record Payment Record
    if (paymentStatus === "succeeded") {
      await supabaseAdmin
        .from("payments")
        .insert({
          user_id: userId,
          stripe_customer_id: chargeAmount > 0 ? "stripe_id" : "credit_applied", 
          stripe_payment_intent_id: paymentIntentId || `credit_offset_${Date.now()}`,
          amount: amount, // Log the full bill amount
          currency: "usd",
          status: "succeeded",
          bill_month: billMonth,
          bill_week: billWeek,
          description: `${description} (Paid: $${chargeAmount.toFixed(2)}, Credit: $${creditsUsed.toFixed(2)})`,
        });
    }

    return new Response(
      JSON.stringify({ 
        success: paymentStatus === "succeeded",
        paymentIntentId: paymentIntentId,
        status: paymentStatus,
        creditsUsed: creditsUsed,
        chargedAmount: chargeAmount
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    // ... (Keep existing error handling) ...
    const stripeError = error as StripeError;
    // ...
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
