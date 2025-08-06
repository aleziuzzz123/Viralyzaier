// supabase/functions/stability-audio-proxy/index.ts
declare const Deno: any;
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { prompt, durationInSeconds } = await req.json();
    // Improved validation
    if (typeof prompt !== 'string' || prompt.trim() === '' || typeof durationInSeconds !== 'number' || durationInSeconds <= 0) {
      throw new Error("Request must include a non-empty 'prompt' and a positive 'durationInSeconds'.");
    }

    // Create the multipart/form-data body as required by the Stability AI API
    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('duration', durationInSeconds.toString());
    formData.append('model', 'stable-audio-2.5'); // Use the latest model as per docs
    formData.append('output_format', 'mp3');     // Explicitly set the format as per docs

    const stabilityResponse = await fetch('https://api.stability.ai/v1/audio/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STABILITY_API_KEY}`,
        // As per documentation, 'audio/*' is the correct accept header for direct audio bytes
        'Accept': 'audio/*',
        // Note: 'Content-Type' is not set here; 'fetch' will set it correctly for FormData
      },
      body: formData,
    });

    if (!stabilityResponse.ok) {
      const errorText = await stabilityResponse.text();
      // Try to parse JSON for a more detailed error, but fallback to text.
      let detailedError = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        detailedError = errorJson.message || JSON.stringify(errorJson);
      } catch (e) {
        // Ignore if it's not JSON
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
