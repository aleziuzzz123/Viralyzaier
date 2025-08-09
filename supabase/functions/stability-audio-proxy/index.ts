// supabase/functions/stability-audio-proxy/index.ts
declare const Deno: any;
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const STABILITY_API_KEY = Deno.env.get('STABILITY_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!STABILITY_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Function is not configured. Missing secrets: STABILITY_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY.");
    }

    // Authenticate the user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header.');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Authentication failed.');

    let body;
    try {
        body = await req.json();
    } catch (e) {
        return new Response(JSON.stringify({ error: `Invalid JSON body: ${e.message}` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
        });
    }

    const { prompt, durationInSeconds } = body;

    if (typeof prompt !== 'string' || prompt.trim() === '' || typeof durationInSeconds !== 'number' || durationInSeconds <= 0) {
      throw new Error("Request must include a non-empty 'prompt' and a positive 'durationInSeconds'.");
    }
    
    // ** FIX: Updated the endpoint to the correct V1 API path for audio generation. **
    const stabilityResponse = await fetch('https://api.stability.ai/v1/audio/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STABILITY_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        prompt: prompt, // ** FIX: The API expects 'prompt', not 'text'. **
        duration_seconds: durationInSeconds,
      }),
    });

    if (!stabilityResponse.ok) {
      const errorText = await stabilityResponse.text();
      let detailedError = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        detailedError = errorJson.message || JSON.stringify(errorJson);
      } catch (e) {
        // Not JSON
      }
      throw new Error(`Stability AI API Error: ${stabilityResponse.status} - ${detailedError}`);
    }

    const audioBlob = await stabilityResponse.blob();

    return new Response(audioBlob, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
      },
      status: 200,
    });

  } catch (error) {
    console.error('Stability Audio Proxy Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});