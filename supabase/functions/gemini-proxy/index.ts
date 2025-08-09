// supabase/functions/gemini-proxy/index.ts
declare const Deno: any;
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.4';
import { GoogleGenAI } from 'https://esm.sh/@google/genai@^1.11.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ** CRITICAL **: These keys are read from the Supabase Function secrets.
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Function is not configured with necessary secrets: GEMINI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY.');
    }

    // Authenticate the user from the Authorization header.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header.');
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error(`Authentication failed: ${authError?.message}`);
    }

    let body;
    try {
        body = await req.json();
    } catch (e) {
        return new Response(JSON.stringify({ error: `Invalid JSON body: ${e.message}` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
        });
    }

    const { type, params } = body;

    if (!type || !params) {
      throw new Error('Request body must include "type" and "params".');
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    let result: any;

    switch (type) {
      case 'generateContent': {
        const { model, contents, config } = params;
        if (!model || !contents) {
            throw new Error('generateContent requires "model" and "contents" in params.');
        }
        result = await ai.models.generateContent({ model, contents, config });
        break;
      }
      case 'generateImages': {
        const { model, prompt, config } = params;
        if (!model || !prompt) {
            throw new Error('generateImages requires "model" and "prompt" in params.');
        }
        result = await ai.models.generateImages({ model, prompt, config });
        break;
      }
      default:
        throw new Error(`Invalid proxy type: ${type}`);
    }

    // The Gemini SDK response objects can contain non-serializable parts like getters.
    // We explicitly create a new, clean object to send back to the client.
    let serializableResult;
    if (type === 'generateContent') {
        serializableResult = { text: result.text };
    } else if (type === 'generateImages') {
        serializableResult = { generatedImages: result.generatedImages };
    }
    
    return new Response(JSON.stringify(serializableResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Gemini Proxy Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});