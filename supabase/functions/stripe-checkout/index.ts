// Updated: Production-ready version with robust error handling and configuration checks.
declare const Deno: any;
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@16.2.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ** CRITICAL **: These keys are read from the Supabase Function secrets.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');

const STRIPE_PRICE_IDS = {
    'pro': 'price_1RqjTlKucnJQ8ZaNnrzjF4Fo',
    'viralyzaier': 'price_1RqjUEKucnJQ8ZaNyEL6Ob7z',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !STRIPE_SECRET_KEY) {
        throw new Error("Function is not configured. Go to Supabase project -> Edge Functions -> stripe-checkout -> Secrets, and set: SUPABASE_URL, SUPABASE_ANON_KEY, STRIPE_SECRET_KEY.");
    }
    
    const stripe = new Stripe(STRIPE_SECRET_KEY as string, {
        httpClient: Stripe.createFetchHttpClient(),
        apiVersion: '2024-06-20',
    });

    // 1. Authenticate the user securely
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
        throw new Error('Missing authorization header.');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        console.error('Auth error in stripe-checkout:', authError?.message);
        return new Response(JSON.stringify({ error: 'Authentication failed.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401,
        });
    }

    // 2. Process the request robustly
    let body;
    try {
        body = await req.json();
    } catch (e) {
        return new Response(JSON.stringify({ error: `Invalid JSON body: ${e.message}` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }

    const { planId, origin } = body;
    const priceId = STRIPE_PRICE_IDS[planId as keyof typeof STRIPE_PRICE_IDS];

    if (!priceId) {
      throw new Error(`Invalid planId: ${planId}`);
    }
    if (!origin) {
      throw new Error('Request origin was not provided in the request body.');
    }

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${origin}/?payment_success=true`,
        cancel_url: `${origin}/?payment_canceled=true`,
        client_reference_id: user.id,
        subscription_data: { metadata: { planId } },
    });

    return new Response(JSON.stringify({ checkoutUrl: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Stripe Checkout Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});