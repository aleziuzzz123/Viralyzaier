// supabase/functions/runwayml-proxy/index.ts
declare const Deno: any;
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RUNWAYML_API_SECRET = Deno.env.get('RUNWAYML_API_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        if (!RUNWAYML_API_SECRET || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
            throw new Error("Function is not configured with necessary environment variables.");
        }

        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error('Missing authorization header.');
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: authHeader } },
        });
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error('Authentication failed.');

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
            const taskResponse = await fetch(`https://api.runwayml.com/v1/tasks/${uuid}`, {
                headers: { 
                    'Authorization': `Bearer ${RUNWAYML_API_SECRET}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (!taskResponse.ok) {
                throw new Error(`RunwayML API error on status check: ${await taskResponse.text()}`);
            }
            const result = await taskResponse.json();
            
            let responsePayload: { status: string; videoUrl?: string; error?: string } = {
                status: result.status,
            };

            if (result.status === 'SUCCEEDED') {
                responsePayload.videoUrl = result.output.url;
            } else if (result.status === 'FAILED') {
                responsePayload.error = result.error_message || 'Unknown generation error';
            }
            
            return new Response(JSON.stringify(responsePayload), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });

        } else if (prompt && aspectRatio) {
            // Mode 1: Start a new generation task
            const genResponse = await fetch('https://api.runwayml.com/v1/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${RUNWAYML_API_SECRET}`,
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    model: "gen-3-video",
                    parameters: { prompt, aspect_ratio: aspectRatio, steps: 25 },
                }),
            });

            if (!genResponse.ok) {
                throw new Error(`RunwayML API error on initiation: ${await genResponse.text()}`);
            }
            const { uuid: newUuid } = await genResponse.json();

            return new Response(JSON.stringify({ uuid: newUuid }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });

        } else {
            throw new Error("Invalid request: must provide either 'uuid' or both 'prompt' and 'aspectRatio'.");
        }

    } catch (error) {
        console.error('RunwayML Proxy Error:', error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});