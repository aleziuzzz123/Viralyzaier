// Updated: 2024-07-31 - Inlined CORS headers to fix deployment error.
declare const Deno: any;
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@16.2.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.4';

// Inlined CORS headers to resolve deployment issues with the browser editor.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// IMPORTANT: This mapping now lives securely on the backend.
const STRIPE_PRICE_IDS = {
    'pro': 'price_1RqjTlKucnJQ8ZaNnrzjF4Fo', 
    'viralyzaier': 'price_1RqjUEKucnJQ8ZaNyEL6Ob7z',
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  httpClient: Stripe.createFetchHttpClient(),
  apiVersion: '2024-06-20',
});

serve(async (req) => {
  // This is needed for CORS preflight requests.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { planId } = await req.json();
    const priceId = STRIPE_PRICE_IDS[planId as keyof typeof STRIPE_PRICE_IDS];

    if (!priceId) {
        throw new Error(`Invalid planId: ${planId}`);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not found');
    
    const origin = req.headers.get('origin');
    if (!origin) throw new Error('Request origin is not available.');

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
            price: priceId,
            quantity: 1,
        }],
        mode: 'subscription',
        success_url: `${origin}/?payment_success=true`,
        cancel_url: `${origin}/?payment_canceled=true`,
        client_reference_id: user.id,
        // Pass the planId in metadata to make the webhook robust
        subscription_data: {
            metadata: {
                planId: planId,
            }
        },
    });

    return new Response(JSON.stringify({ checkoutUrl: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Stripe Checkout Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
