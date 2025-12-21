import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';
import { Resend } from 'npm:resend@4.0.0';
import { getConfirmationEmailHtml } from './_templates/html-template.ts';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
const hookSecret = (Deno.env.get('SEND_EMAIL_HOOK_SECRET') ?? '').replace(/^v1,whsec_/, '');
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  try {
    const payload = await req.text();
    const headers = Object.fromEntries(req.headers);
    const wh = new Webhook(hookSecret);
    
    // Verify signature
    const { user, email_data } = wh.verify(payload, headers) as {
      user: { email: string };
      email_data: {
        token: string;
        token_hash: string;
        redirect_to: string;
        email_action_type: string;
        site_url: string;
      };
    };

    const { token_hash, redirect_to, email_action_type } = email_data;

    // Construct the Confirmation URL manually
    // This points to Supabase's verify endpoint, which then redirects to your app
    const confirmationUrl = `${supabaseUrl}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`;

    console.log(`[Email Hook] Sending ${email_action_type} link to ${user.email}`);

    // Generate HTML using your custom template
    const html = getConfirmationEmailHtml(confirmationUrl);

    // Send via Resend
    const { error } = await resend.emails.send({
      from: 'Auren <onboarding@resend.dev>', // Update to your domain
      to: [user.email],
      subject: 'Confirm your Auren account',
      html,
    });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});