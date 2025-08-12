// supabase/functions/gemini-proxy/index.ts
declare const Deno: any;
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.4';
import { GoogleGenAI } from 'https://esm.sh/@google/genai@^1.13.0';
import { generate as uuidv4 } from 'https://deno.land/std@0.100.0/uuid/v4.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ** CRITICAL **: These keys are read from the Supabase Function secrets.
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Helper to decode base64 and create a Blob
function base64ToBlob(base64: string, contentType: string = 'image/jpeg'): Blob {
    const byteCharacters = atob(base64);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: contentType });
}


serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error("Function is not configured. Go to Supabase project -> Edge Functions -> gemini-proxy -> Secrets, and set: GEMINI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.");
    }

    // Authenticate the user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header.');
    
    const supabaseUserClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();
    if (authError || !user) throw new Error(authError?.message || 'Authentication failed.');

    // Initialize clients
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

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
        throw new Error("Request body must include 'type' and 'params'.");
    }

    let result;
    switch (type) {
        case 'generateContent': {
            const response = await ai.models.generateContent(params);
            // Explicitly create a plain object for serialization to prevent crashes.
            // The .text getter must be called to get the string value.
            // candidates should be serializable as it's an array of objects.
            result = {
              text: response.text,
              candidates: response.candidates,
            };
            break;
        }

        case 'generateImages': {
            const { projectId, ...imageParams } = params;
            const response = await ai.models.generateImages(imageParams);

            if (projectId && user) {
                // If a projectId is provided, the client expects a final URL.
                // We upload the image to Supabase Storage and return the public URL.
                const base64Image = response.generatedImages[0].image.imageBytes;
                const imageBlob = base64ToBlob(base64Image, imageParams.config?.outputMimeType || 'image/jpeg');
                
                const path = `${user.id}/${projectId}/generated_assets/${uuidv4()}.jpg`;
                
                const { error: uploadError } = await supabaseAdmin.storage
                    .from('assets')
                    .upload(path, imageBlob, { contentType: imageBlob.type, upsert: false });

                if (uploadError) {
                    throw new Error(`Failed to upload generated image to storage: ${uploadError.message}`);
                }

                const { data: { publicUrl } } = supabaseAdmin.storage.from('assets').getPublicUrl(path);
                result = { imageUrl: publicUrl };

            } else {
                 // Explicitly create a plain object array for serialization.
                const plainImages = response.generatedImages.map(img => ({
                    image: {
                        imageBytes: img.image.imageBytes,
                    },
                }));
                result = {
                    generatedImages: plainImages
                };
            }
            break;
        }

        default:
            throw new Error(`Invalid type '${type}' provided to Gemini proxy.`);
    }

    return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
    });

  } catch (error) {
    console.error('Gemini Proxy Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});