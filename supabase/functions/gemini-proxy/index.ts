// supabase/functions/gemini-proxy/index.ts
declare const Deno: any;
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.4';
import { GoogleGenAI } from 'https://esm.sh/@google/genai@^1.11.0';
import { generate as uuidv4 } from 'https://deno.land/std@0.100.0/uuid/v4.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ** CRITICAL **: These keys are read from the Supabase Function secrets.
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
      throw new Error('Function is not configured with necessary secrets: GEMINI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.');
    }

    // Authenticate the user from the Authorization header.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header.');
    }
    const supabaseUserClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();
    if (authError || !user) {
      throw new Error(`Authentication failed: ${authError?.message}`);
    }
    
    // Create an admin client to perform elevated actions like storage uploads
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

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
    let result;

    switch (type) {
      case 'generateContent': {
        const { model, contents, config } = params;
        if (!model || !contents) {
            throw new Error('generateContent requires "model" and "contents" in params.');
        }
        result = await ai.models.generateContent({ model, contents, config });
        const serializableResult = { 
            text: result.text,
            groundingMetadata: result.candidates?.[0]?.groundingMetadata 
        };
        return new Response(JSON.stringify(serializableResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      case 'generateImages': {
        const { model, prompt, config, projectId } = params;
        if (!model || !prompt) {
            throw new Error('generateImages requires "model" and "prompt" in params.');
        }
        result = await ai.models.generateImages({ model, prompt, config });
        
        if (!result.generatedImages || result.generatedImages.length === 0 || !result.generatedImages[0].image?.imageBytes) {
            throw new Error("Gemini did not return any image data.");
        }
        const base64ImageBytes = result.generatedImages[0].image.imageBytes;
        
        // If a projectId is provided, upload to storage and return the URL.
        if (projectId) {
            const byteCharacters = atob(base64ImageBytes);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const imageBlob = new Blob([byteArray], { type: 'image/jpeg' });

            const path = `${user.id}/${projectId}/ai-assets/${uuidv4()}.jpeg`;
            const { error: uploadError } = await supabaseAdmin.storage
                .from('assets')
                .upload(path, imageBlob, { contentType: 'image/jpeg', upsert: false });
            if (uploadError) throw uploadError;
            
            const { data: { publicUrl } } = supabaseAdmin.storage.from('assets').getPublicUrl(path);
            if (!publicUrl) throw new Error("Could not get public URL for uploaded image.");

            return new Response(JSON.stringify({ imageUrl: publicUrl }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            });
        } else {
            // If no projectId, return the raw base64 data for client-side use (e.g., moodboards).
            const serializableResult = { 
                generatedImages: result.generatedImages.map(img => ({
                    image: { imageBytes: img.image?.imageBytes }
                }))
            };
            return new Response(JSON.stringify(serializableResult), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            });
        }
      }
      default:
        throw new Error(`Invalid proxy type: ${type}`);
    }

  } catch (error) {
    console.error('Gemini Proxy Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});