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

// Helper for polling RunwayML's async generation endpoint
const poll = <T>(fn: () => Promise<T>, validate: (result: T) => boolean, interval: number, maxAttempts: number): Promise<T> => {
    let attempts = 0;
    const executePoll = async (resolve: (value: T) => void, reject: (reason?: any) => void) => {
        try {
            const result = await fn();
            attempts++;
            if (validate(result)) {
                return resolve(result);
            } else if (maxAttempts && attempts === maxAttempts) {
                return reject(new Error('Max polling attempts reached for RunwayML generation.'));
            } else {
                setTimeout(executePoll, interval, resolve, reject);
            }
        } catch (err) {
            return reject(err);
        }
    };
    return new Promise(executePoll);
};

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        if (!RUNWAYML_API_SECRET || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
            throw new Error("Function is not configured with necessary environment variables.");
        }

        // Authenticate the user
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error('Missing authorization header.');
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: authHeader } },
        });
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error('Authentication failed.');

        const { prompt, aspectRatio } = await req.json();

        // 1. Initiate generation
        const genResponse = await fetch('https://api.runwayml.com/v1/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RUNWAYML_API_SECRET}`,
            },
            body: JSON.stringify({
                model: "gen-3-video",
                parameters: { prompt, aspect_ratio: aspectRatio, steps: 25 },
            }),
        });

        if (!genResponse.ok) {
            throw new Error(`RunwayML API error on initiation: ${await genResponse.text()}`);
        }
        const { uuid } = await genResponse.json();

        // 2. Poll for the result
        const taskFn = () => fetch(`https://api.runwayml.com/v1/tasks/${uuid}`, {
            headers: { 'Authorization': `Bearer ${RUNWAYML_API_SECRET}` }
        }).then(res => res.json());

        const validationFn = (result: any) => result.status === 'SUCCEEDED' || result.status === 'FAILED';
        const finalResult = await poll(taskFn, validationFn, 5000, 25); 

        if (finalResult.status === 'FAILED') {
            throw new Error(`RunwayML generation failed: ${finalResult.error_message || 'Unknown error'}`);
        }

        // 3. Return the video URL
        const videoUrl = finalResult.output.url;
        return new Response(JSON.stringify({ videoUrl }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error('RunwayML Proxy Error:', error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});