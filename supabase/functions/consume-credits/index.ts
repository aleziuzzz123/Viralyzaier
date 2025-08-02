// Updated: Production-ready version with robust error handling and configuration checks.
declare const Deno: any;
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.4';

// Standard CORS headers are essential for browser communication.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ** CRITICAL **: Function will fail if these are not set in your Supabase Project Settings
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

serve(async (req: Request) => {
  // Handle CORS preflight request immediately. This is a common cause of the error.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Fail-fast if the function is not configured correctly.
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
        throw new Error("Function is not configured with necessary Supabase secrets.");
    }

    // Use the Service Role Key for admin-level access from the backend.
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // 1. Authenticate the user securely from the Authorization header.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header.');
    }

    const supabaseUserClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();

    if (authError || !user) {
      console.error('Auth error in consume-credits:', authError?.message);
      return new Response(JSON.stringify({ error: 'Authentication failed.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    
    // 2. Process the request body.
    const { amount_to_consume } = await req.json();
    if (typeof amount_to_consume !== 'number' || amount_to_consume <= 0) {
        return new Response(JSON.stringify({ error: 'Invalid consumption amount.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }

    // 3. Perform the database operation using the secure admin client.
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
        return new Response(JSON.stringify({ success: false, message: 'insufficient_credits', newCredits: currentCredits }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200, // Success, but with a specific payload for the client
        });
    }

    const newCredits = currentCredits - amount_to_consume;

    const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ ai_credits: newCredits })
        .eq('id', user.id);
    
    if (updateError) {
        throw new Error(`Failed to update credits: ${updateError.message}`);
    }
    
    return new Response(JSON.stringify({ success: true, newCredits: newCredits }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
    });

  } catch (error) {
    console.error('Consume Credits Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});