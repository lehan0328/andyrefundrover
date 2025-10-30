import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin role
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { authorization: authHeader },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || roleData?.role !== "admin") {
      throw new Error("User is not an admin");
    }

    const { clientEmail, clientName, companyName, shipmentId, description, missingCount, claimIds }: NotificationRequest =
      await req.json();

    console.log(`Sending notification to ${clientEmail} for ${companyName} - Shipment: ${shipmentId}`);

    // Use the new format if shipmentId is provided, otherwise fall back to claimIds
    const emailContent = shipmentId 
      ? `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Auren Reimbursement</h1>
            </div>
            
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <h2 style="color: #dc2626; margin-top: 0;">⚠️ Missing Invoice Required</h2>
              
              <p>Hi ${clientName},</p>
              
              <p>We need a supporting invoice for <strong>${companyName}</strong> to process your reimbursement claim.</p>
              
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0; font-weight: 600;">Shipment ID:</p>
                <p style="margin: 0 0 12px 0; font-family: monospace; font-size: 14px;">${shipmentId}</p>
                <p style="margin: 8px 0 0 0; font-weight: 600;">Required:</p>
                <p style="margin: 4px 0 0 0;">${description}</p>
              </div>
              
              <p>Please upload the required invoice as soon as possible to avoid delays in processing your claim.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${Deno.env.get("SUPABASE_URL")?.replace('/supabase', '')}/invoices" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
                  Upload Invoice Now
                </a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                If you have any questions or need assistance, please don't hesitate to contact our support team.
              </p>
              
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                Best regards,<br>
                <strong>The Auren Reimbursement Team</strong>
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
              <p>© 2025 Auren Reimbursement. All rights reserved.</p>
            </div>
          </body>
        </html>
      `
      : `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Auren Reimbursement</h1>
            </div>
            
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <h2 style="color: #dc2626; margin-top: 0;">⚠️ Missing Invoices Detected</h2>
              
              <p>Hi ${clientName},</p>
              
              <p>Our records show that <strong>${companyName}</strong> has <strong>${missingCount}</strong> claim(s) that require supporting invoices for reconciliation.</p>
              
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; font-weight: 600;">Claims awaiting invoices:</p>
                <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                  ${claimIds?.map(id => `<li>${id}</li>`).join('')}
                </ul>
              </div>
              
              <p>To ensure timely processing of your reimbursement claims, please upload the required invoices as soon as possible.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${Deno.env.get("SUPABASE_URL")?.replace('/supabase', '')}/invoices" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
                  Upload Invoices Now
                </a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                If you have any questions or need assistance, please don't hesitate to contact our support team.
              </p>
              
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                Best regards,<br>
                <strong>The Auren Reimbursement Team</strong>
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
              <p>© 2025 Auren Reimbursement. All rights reserved.</p>
            </div>
          </body>
        </html>
      `;

    const emailResponse = await resend.emails.send({
      from: "Auren Reimbursement <onboarding@resend.dev>",
      to: [clientEmail],
      subject: "Action Required: Missing Invoices for Claims",
      html: emailContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
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
