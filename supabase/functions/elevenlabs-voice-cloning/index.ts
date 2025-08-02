// supabase/functions/elevenlabs-voice-cloning/index.ts
declare const Deno: any;
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

// Self-contained CORS headers to ensure dashboard deployment works
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ElevenLabs API Key is not configured in secrets.");
    }
    
    // The request body from the client is FormData
    const formData = await req.formData();
    
    // Forward the FormData to the ElevenLabs API with the secret key
    const elevenLabsResponse = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: { 
        'xi-api-key': ELEVENLABS_API_KEY,
        // IMPORTANT: Do not set Content-Type, fetch will do it automatically for FormData
      },
      body: formData,
    });

    if (!elevenLabsResponse.ok) {
      const errorBody = await elevenLabsResponse.json();
      // Provide a more specific error message from the API if available
      const errorMessage = errorBody.detail?.message || `ElevenLabs API Error: ${elevenLabsResponse.statusText}`;
      console.error("ElevenLabs API Error:", errorBody);
      throw new Error(errorMessage);
    }

    const voiceData = await elevenLabsResponse.json();

    // Return the new voice ID and name to the client
    return new Response(JSON.stringify({ 
      id: voiceData.voice_id, 
      name: formData.get('name'), 
      status: 'pending' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('ElevenLabs Voice Cloning Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
