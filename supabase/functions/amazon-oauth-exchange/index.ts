import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../shared/cors.ts";

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { code } = await req.json();
    
    if (!code) {
      throw new Error('No authorization code provided');
    }

    const clientId = Deno.env.get('AMAZON_CLIENT_ID');
    const clientSecret = Deno.env.get('AMAZON_CLIENT_SECRET');
    const redirectUri = `${req.headers.get('origin')}/amazon-callback`;

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://api.amazon.com/auth/o2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      throw new Error('Failed to exchange authorization code');
    }

    const tokens = await tokenResponse.json();
    console.log('Successfully exchanged authorization code for tokens');

    // Get Selling Partner ID using the access token
    let sellingPartnerId = 'unknown';
    // Default to US in case the API call fails entirely
    let marketplaceId = 'ATVPDKIKX0DER'; 

    try {
      const sellerResponse = await fetch('https://sellingpartnerapi-na.amazon.com/sellers/v1/marketplaceParticipations', {
        method: 'GET',
        headers: {
          'x-amz-access-token': tokens.access_token,
          'Content-Type': 'application/json',
          'User-Agent': 'MyApp/1.0 (Language=JavaScript; Platform=Deno)',
        },
      });

      if (sellerResponse.ok) {
        const sellerData = await sellerResponse.json();
        
        if (sellerData.payload && sellerData.payload.length > 0) {
          // 1. Capture the Seller ID (usually same across all marketplaces for a unified account)
          sellingPartnerId = sellerData.payload[0].seller?.sellerId || 'unknown';

          // 2. BETTER LOGIC: Priority Selection
          // Amazon often returns MX (Mexico) first. We want to prioritize US, then CA, etc.
          const PREFERRED_MARKETPLACES = [
            'ATVPDKIKX0DER', // US (Priority 1)
            'A2EUQ1WTGCTBG2', // Canada (Priority 2)
            'A1F83G8C2ARO7P', // UK (Priority 3)
            // Add other IDs here if you expand to EU/Asia
          ];

          // Map available marketplaces from the API response
          const availableMarketplaces = sellerData.payload.map((p: any) => p.marketplace.id);
          
          // Find the highest priority marketplace that the user actually has
          const selectedId = PREFERRED_MARKETPLACES.find(id => availableMarketplaces.includes(id));

          if (selectedId) {
            marketplaceId = selectedId;
            console.log(`Smart Selection: Chose ${marketplaceId} based on priority list.`);
          } else {
            // Fallback: If they don't have any of our preferred ones, just take the first one available
            // (This handles cases where a user might ONLY sell in Mexico or Brazil)
            marketplaceId = sellerData.payload[0].marketplace?.id || marketplaceId;
            console.log(`Fallback Selection: Chose ${marketplaceId} (first available).`);
          }
          
          console.log('Final fetched details:', { sellingPartnerId, marketplaceId });
        }
      } else {
        console.warn('Could not fetch seller ID, will use default. Status:', sellerResponse.status);
      }
    } catch (e) {
      console.warn('Error fetching seller ID:', e);
    }

    // Store the credentials in the database
    const { error: dbError } = await supabaseClient
      .from('amazon_credentials')
      .upsert({
        user_id: user.id,
        refresh_token_encrypted: tokens.refresh_token,
        seller_id: sellingPartnerId,
        credentials_status: 'active',
        marketplace_id: marketplaceId, 
      }, {
        onConflict: 'user_id'
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to store Amazon credentials');
    }

    console.log('Amazon credentials stored successfully');
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Amazon account connected successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in amazon-oauth-exchange:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
