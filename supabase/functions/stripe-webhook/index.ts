// Updated: 2024-07-31 - Made function self-contained and more robust.
declare const Deno: any;
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.4';
import Stripe from 'https://esm.sh/stripe@16.2.0?target=deno';

type PlanId = 'free' | 'pro' | 'viralyzaier';

// Self-contained plan configuration for the backend.
const PLANS_CONFIG: Record<PlanId, { creditLimit: number }> = {
    'free': { creditLimit: 10 },
    'pro': { creditLimit: 100 },
    'viralyzaier': { creditLimit: 1000 },
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  httpClient: Stripe.createFetchHttpClient(),
  apiVersion: '2024-06-20',
});

// Use the Service Role Key for admin-level access from the backend.
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const STRIPE_WEBHOOK_SIGNING_SECRET = Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET');

serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature');
  const body = await req.text();

  let event: Stripe.Event;
  try {
    if (!signature || !STRIPE_WEBHOOK_SIGNING_SECRET) {
        throw new Error('Webhook secret or signature is missing.');
    }
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      STRIPE_WEBHOOK_SIGNING_SECRET,
      undefined,
      Stripe.createSubtleCryptoProvider()
    );
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new Response(err.message, { status: 400 });
  }
  
  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      
      const userId = session.client_reference_id;
      const stripeCustomerId = session.customer as string;
      const planId = subscription.metadata.planId as PlanId;

      if (!userId || !planId || !stripeCustomerId) {
        return new Response('Missing critical metadata from checkout session.', { status: 400 });
      }

      const planConfig = PLANS_CONFIG[planId];
      if (!planConfig) {
        return new Response(`Invalid planId: ${planId}`, { status: 400 });
      }

      const { error } = await supabaseAdmin.from('profiles').update({
          subscription: { planId, status: 'active', endDate: null },
          ai_credits: planConfig.creditLimit,
          stripe_customer_id: stripeCustomerId,
      }).eq('id', userId);
      
      if (error) {
        console.error(`Supabase update failed for user ${userId}:`, error.message);
        return new Response(`Supabase update failed: ${error.message}`, { status: 500 });
      }
      
      console.log(`User ${userId} successfully subscribed to plan ${planId}.`);
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      // An invoice is created for renewals, so we retrieve the subscription details
      if (invoice.subscription) {
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
        const stripeCustomerId = invoice.customer as string;
        const planId = subscription.metadata.planId as PlanId;

        const planConfig = PLANS_CONFIG[planId];
        if (!planConfig || !stripeCustomerId) {
            return new Response(`Invalid metadata in subscription renewal: ${planId}`, { status: 400 });
        }

        const { error } = await supabaseAdmin.from('profiles').update({
            ai_credits: planConfig.creditLimit // Refill credits on renewal
        }).eq('stripe_customer_id', stripeCustomerId);

        if (error) {
            console.error(`Supabase credit refill failed for Stripe ID ${stripeCustomerId}:`, error.message);
            return new Response(`Supabase credit refill failed: ${error.message}`, { status: 500 });
        }

        console.log(`User with Stripe ID ${stripeCustomerId} had their credits refilled for plan ${planId}.`);
      }
      break;
    }
      
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const stripeCustomerId = subscription.customer as string;

      const { error } = await supabaseAdmin.from('profiles').update({
        subscription: {
          planId: 'free', // Downgrade to free plan
          status: 'canceled',
          endDate: subscription.current_period_end, // Keep access until period ends
        },
      }).eq('stripe_customer_id', stripeCustomerId);
      
      if (error) {
        console.error(`Supabase subscription cancellation failed for Stripe ID ${stripeCustomerId}:`, error.message);
        return new Response(`Supabase cancellation update failed: ${error.message}`, { status: 500 });
      }
      
      console.log(`User with Stripe ID ${stripeCustomerId} has canceled their subscription.`);
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
