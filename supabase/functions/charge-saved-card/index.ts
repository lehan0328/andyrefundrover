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

    if (!userId || !amount || !billMonth) {
      throw new Error("userId, amount, and billMonth are required");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify admin authorization
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

    console.log("Charging saved card for user:", userId, "amount:", amount);

    // Get user's Stripe customer
    const { data: stripeCustomer, error: customerError } = await supabaseAdmin
      .from("stripe_customers")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (customerError || !stripeCustomer) {
      throw new Error("No Stripe customer found for this user");
    }

    if (!stripeCustomer.default_payment_method_id) {
      throw new Error("No payment method on file for this user");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Create PaymentIntent and charge immediately
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: "usd",
      customer: stripeCustomer.stripe_customer_id,
      payment_method: stripeCustomer.default_payment_method_id,
      off_session: true,
      confirm: true,
      description: description || `Auren Reimbursements - ${billMonth}`,
      metadata: {
        user_id: userId,
        bill_month: billMonth,
        bill_week: billWeek || "",
      },
    });

    console.log("Payment intent created:", paymentIntent.id, "status:", paymentIntent.status);

    // Record payment in database
    const { error: paymentError } = await supabaseAdmin
      .from("payments")
      .insert({
        user_id: userId,
        stripe_customer_id: stripeCustomer.stripe_customer_id,
        stripe_payment_intent_id: paymentIntent.id,
        amount: amount,
        currency: "usd",
        status: paymentIntent.status === "succeeded" ? "succeeded" : "pending",
        bill_month: billMonth,
        bill_week: billWeek,
        description: description,
      });

    if (paymentError) {
      console.error("Error recording payment:", paymentError);
    }

    return new Response(
      JSON.stringify({ 
        success: paymentIntent.status === "succeeded",
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const stripeError = error as StripeError;
    console.error("Error charging card:", stripeError.message);
    
    // Handle specific Stripe errors
    if (stripeError.type === "StripeCardError") {
      return new Response(
        JSON.stringify({ error: "Card declined: " + stripeError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
