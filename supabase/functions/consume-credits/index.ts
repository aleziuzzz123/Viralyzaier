
// Updated: 2024-07-31 - Implemented credit consumption logic.
declare const Deno: any;
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.4';

// Standard CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Use the Service Role Key for admin-level access from the backend.
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { amount_to_consume } = await req.json();
    if (typeof amount_to_consume !== 'number' || amount_to_consume <= 0) {
        return new Response(JSON.stringify({ error: 'Invalid consumption amount.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }

    // Create a client with the user's auth token to get their ID securely.
    const supabaseUserClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user } } = await supabaseUserClient.auth.getUser();
    if (!user) {
        throw new Error('User not found. Authentication required.');
    }

    // Fetch the user's current credits using the admin client for trusted data access.
    const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('ai_credits')
        .eq('id', user.id)
        .single();
    
    if (profileError || !profile) {
        throw new Error(profileError?.message || `Profile not found for user ${user.id}`);
    }

    const currentCredits = profile.ai_credits;

    if (currentCredits < amount_to_consume) {
        // Return a success response with a specific message for the client to handle.
        return new Response(JSON.stringify({ success: false, message: 'insufficient_credits', newCredits: currentCredits }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    }

    const newCredits = currentCredits - amount_to_consume;

    // Update the credits in the database.
    const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ ai_credits: newCredits })
        .eq('id', user.id);
    
    if (updateError) {
        throw new Error(`Failed to update credits: ${updateError.message}`);
    }
    
    // Return a success response with the new credit count.
    return new Response(JSON.stringify({ success: true, message: 'Credits consumed successfully.', newCredits: newCredits }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
    });

  } catch (error) {
    console.error('Consume Credits Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
