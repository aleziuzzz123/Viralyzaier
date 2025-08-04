// supabase/functions/runwayml-proxy/index.ts
declare const Deno: any;
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.4';
import RunwayML, { TaskFailedError } from 'https://esm.sh/@runwayml/sdk';
import { GoogleGenAI } from 'https://esm.sh/@google/genai@^1.11.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RUNWAYML_API_SECRET = Deno.env.get('RUNWAYML_API_SECRET');
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY'); // Added for the text-to-image step
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        if (!RUNWAYML_API_SECRET || !GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
            throw new Error("Function is not configured with necessary secrets: RUNWAYML_API_SECRET, GEMINI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY.");
        }

        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error('Missing authorization header.');
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: authHeader } },
        });
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error('Authentication failed.');
        
        const runwayClient = new RunwayML({ apiKey: RUNWAYML_API_SECRET });
        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

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
        const { prompt, aspectRatio, uuid } = parsedBody;

        if (uuid) {
            // Mode 2: Check status of an existing task
            const result = await runwayClient.tasks.retrieve(uuid);
            
            let responsePayload: { status: string; videoUrl?: string; error?: string } = {
                status: result.status,
            };

            if (result.status === 'SUCCEEDED') {
                // Handle race condition where task is 'SUCCEEDED' but output URL isn't ready.
                // Force client to poll again by not sending 'SUCCEEDED' status yet.
                if (Array.isArray(result.output) && result.output[0]) {
                    responsePayload.videoUrl = result.output[0];
                } else {
                    responsePayload.status = 'RUNNING'; 
                }
            } else if (result.status === 'FAILED') {
                responsePayload.error = result.error_message || 'Unknown generation error';
            }
            
            return new Response(JSON.stringify(responsePayload), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });

        } else if (prompt && aspectRatio) {
            // Mode 1: True Text-to-Video Pipeline
            // Step 1: Generate a seed image with Gemini based on the text prompt.
            const imagePrompt = `A cinematic, visually stunning image for a video scene: ${prompt}. IMPORTANT: The main subject must be perfectly centered to avoid being cropped.`;
            const imageResponse = await ai.models.generateImages({
                model: 'imagen-3.0-generate-002',
                prompt: imagePrompt,
                config: { 
                    numberOfImages: 1, 
                    outputMimeType: 'image/jpeg', 
                    aspectRatio: aspectRatio.replace('_', ':') 
                }
            });
            const base64ImageBytes = imageResponse.generatedImages[0].image.imageBytes;
            const imageDataUri = `data:image/jpeg;base64,${base64ImageBytes}`;

            // Map standard aspect ratios to what gen3a_turbo supports to avoid errors.
            const runwayAspectRatio = aspectRatio === '16_9' ? '1280:768' : '768:1280';

            // Step 2: Use the generated image to call Runway's image-to-video SDK method.
            const task = await runwayClient.imageToVideo.create({
                model: 'gen3a_turbo',
                promptImage: imageDataUri,
                promptText: prompt,
                ratio: runwayAspectRatio,
                duration: 5,
            });

            if (!task || !task.id) {
                throw new Error("Runway SDK did not return a task with an ID on creation.");
            }

            return new Response(JSON.stringify({ uuid: task.id }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });

        } else {
            throw new Error("Invalid request: must provide either 'uuid' or both 'prompt' and 'aspectRatio'.");
        }

    } catch (error) {
        let errorMessage = error.message;
        if (error instanceof TaskFailedError) {
            errorMessage = `Runway task failed: ${JSON.stringify(error.taskDetails)}`;
        }
        console.error('RunwayML SDK Proxy Error:', errorMessage);
        return new Response(JSON.stringify({ error: `RunwayML SDK error: ${errorMessage}` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
