// supabase/functions/elevenlabs-proxy/index.ts
declare const Deno: any;
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.4';

// Standard CORS headers are essential for browser communication.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ** CRITICAL **: These keys are read from the Supabase Function secrets.
const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

serve(async (req: Request) => {
  // Handle CORS preflight request immediately.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Fail-fast if the function is not configured correctly.
    if (!ELEVENLABS_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Function is not configured with necessary ElevenLabs/Supabase secrets.");
    }

    // Authenticate the user securely from the Authorization header.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header.');
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication failed.');
    }

    // Process the request body more robustly.
    const bodyText = await req.text();
    if (!bodyText) {
        return new Response(JSON.stringify({ error: 'Request body is empty.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
    let parsedBody;
    try {
        parsedBody = JSON.parse(bodyText);
    } catch (e) {
        return new Response(JSON.stringify({ error: `Invalid JSON in request body: ${e.message}` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
    const { text, voiceId } = parsedBody;

    if (!text || !voiceId) {
      throw new Error("Request body must include 'text' and 'voiceId'.");
    }

    // Make the secure, server-to-server call to ElevenLabs.
    const elevenLabsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_multilingual_v2', // A robust and versatile model
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!elevenLabsResponse.ok) {
      const errorBody = await elevenLabsResponse.json();
      const errorMessage = errorBody.detail?.message || `ElevenLabs API Error: ${elevenLabsResponse.statusText}`;
      console.error("ElevenLabs API Error:", errorBody);
      throw new Error(errorMessage);
    }

    // Stream the audio response directly back to the client.
    return new Response(elevenLabsResponse.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
      },
      status: 200,
    });

  } catch (error) {
    console.error('ElevenLabs Proxy Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
