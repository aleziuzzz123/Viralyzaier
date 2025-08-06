// supabase/functions/elevenlabs-sync-voices/index.ts
declare const Deno: any;
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Maps ElevenLabs' fine-tuning status to our application's status
const mapStatus = (elevenStatus: string) => {
  switch(elevenStatus) {
    case 'fine_tuned':
      return 'ready';
    case 'not_started':
    case 'training':
      return 'pending';
    case 'failed':
    default:
      return 'failed';
  }
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!ELEVENLABS_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
      throw new Error("Function is not configured with necessary secrets.");
    }

    // Authenticate the user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header.');
    
    const supabaseUserClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();
    if (authError || !user) throw new Error('Authentication failed.');

    // Use admin client for elevated privileges
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Fetch all voices from ElevenLabs
    const elevenLabsResponse = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': ELEVENLABS_API_KEY },
    });
    if (!elevenLabsResponse.ok) {
      throw new Error(`ElevenLabs API Error: ${await elevenLabsResponse.text()}`);
    }
    const { voices } = await elevenLabsResponse.json();

    // 2. Filter for cloned voices and map to our type
    const clonedVoices = voices
      .filter((v: any) => v.category === 'cloned')
      .map((v: any) => ({
        id: v.voice_id,
        name: v.name,
        status: mapStatus(v.fine_tuning.fine_tuning_state),
      }));

    // 3. Update the user's profile in Supabase
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ cloned_voices: clonedVoices })
      .eq('id', user.id);
    if (updateError) throw updateError;

    // 4. Return the updated list to the client
    return new Response(JSON.stringify(clonedVoices), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('ElevenLabs Sync Voices Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});