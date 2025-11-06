import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  clientEmail: string;
  clientName: string;
  companyName: string;
  shipmentId: string;
  description: string;
  missingCount?: number;
  claimIds?: string[];
  documentType?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin role
    const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("Missing or invalid Authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Use anon client but forward the user's JWT via global headers
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Create service role client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Checking admin role for user:", user.id);

    // Check if user is admin using user's JWT (RLS allows viewing own role)
    const { data: roleData, error: roleError } = await supabaseAuth
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    console.log("Role check result:", { roleData, roleError });

    if (roleError || roleData?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden: Admins only" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { clientEmail, clientName, companyName, shipmentId, description, missingCount, claimIds, documentType }: NotificationRequest =
      await req.json();

    console.log(`Creating notification for ${clientEmail} - ${companyName} - Shipment: ${shipmentId} - Document Type: ${documentType || 'invoice'}`);

    // Insert notification into database using service role to bypass RLS
    const { data: notification, error: insertError } = await supabaseAdmin
      .from("missing_invoice_notifications")
      .insert({
        client_name: clientName,
        client_email: clientEmail,
        company_name: companyName,
        shipment_id: shipmentId || null,
        claim_ids: claimIds || null,
        missing_count: missingCount || null,
        description: description || null,
        status: "unread",
        document_type: documentType || "invoice",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating notification:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create notification", details: insertError }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Notification created successfully:", notification);

    return new Response(JSON.stringify({ success: true, data: notification }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
