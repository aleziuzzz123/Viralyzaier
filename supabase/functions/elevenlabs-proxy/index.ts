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
    if (!ELEVENLABS_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Function is not configured with necessary ElevenLabs/Supabase secrets.");
    }
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header.');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Authentication failed.');

    const { type, text, voiceId } = await req.json();

    if (!type || !text) {
      throw new Error("Request body must include 'type' and 'text'.");
    }

    let apiUrl, requestBody, acceptHeader;

    if (type === 'tts') {
      if (!voiceId) throw new Error("TTS requests must include 'voiceId'.");
      apiUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
      requestBody = JSON.stringify({
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      });
      acceptHeader = 'audio/mpeg';
    } else if (type === 'sfx') {
      apiUrl = 'https://api.elevenlabs.io/v1/sound-effects';
      requestBody = JSON.stringify({
        text: text,
      });
      acceptHeader = 'audio/mpeg';
    } else {
      throw new Error(`Invalid request type: ${type}. Must be 'tts' or 'sfx'.`);
    }

    const elevenLabsResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
        'Accept': acceptHeader,
      },
      body: requestBody,
    });

    if (!elevenLabsResponse.ok) {
      const errorBody = await elevenLabsResponse.json();
      const errorMessage = errorBody.detail?.message || `ElevenLabs API Error: ${elevenLabsResponse.statusText}`;
      console.error("ElevenLabs API Error:", errorBody);
      throw new Error(errorMessage);
    }

    const audioBlob = await elevenLabsResponse.blob();
    return new Response(audioBlob, {
      headers: { ...corsHeaders, 'Content-Type': 'audio/mpeg' },
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