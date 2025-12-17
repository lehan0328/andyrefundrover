import { Resend } from "https://esm.sh/resend@2.0.0";
import { getCorsHeaders } from "../shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface ContactRequest {
  name: string;
  email: string;
  company?: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, company, message }: ContactRequest = await req.json();

    console.log("Sending contact email from:", email);

    // Send notification to support
    const { error: supportError } = await resend.emails.send({
      from: "Auren Contact <onboarding@resend.dev>",
      to: ["support@aurenapp.com"],
      subject: `New Contact Form Submission from ${name}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        ${company ? `<p><strong>Company:</strong> ${company}</p>` : ''}
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `,
    });

    if (supportError) {
      console.error("Error sending to support:", supportError);
      throw supportError;
    }

    // Send confirmation to user
    const { error: confirmError } = await resend.emails.send({
      from: "Auren Reimbursements <onboarding@resend.dev>",
      to: [email],
      subject: "We received your message!",
      html: `
        <h1>Thank you for contacting us, ${name}!</h1>
        <p>We have received your message and will get back to you as soon as possible.</p>
        <p>Best regards,<br>The Auren Team</p>
      `,
    });

    if (confirmError) {
      console.error("Error sending confirmation:", confirmError);
      // Don't throw - support email was sent successfully
    }

    console.log("Contact emails sent successfully");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-contact-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

Deno.serve(handler);
