// supabase/functions/video-stitcher/index.ts
declare const Deno: any;
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
      throw new Error("Function is not configured. Missing Supabase secrets.");
    }
    
    // Authenticate the user securely
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header.');
    const supabaseUserClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();
    if (authError || !user) throw new Error('Authentication failed.');

    // Use admin client for elevated privileges
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
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

    const { projectId, timeline } = body;

    if (!projectId || !timeline) {
        throw new Error("Invalid request body: 'projectId' and 'timeline' are required.");
    }
    
    // ** PRODUCTION ARCHITECTURE **
    // This function now follows a robust, scalable pattern for long-running tasks.
    // 1. It validates the request.
    // 2. It updates the project's status to 'Rendering' to give the user immediate feedback.
    // 3. It inserts a job into the `video_jobs` queue.
    // A separate, long-running worker service (not part of this function) will poll this queue,
    // execute the FFmpeg stitching, upload the result, and update the project status.

    // Update project status to 'Rendering'
    const { error: statusUpdateError } = await supabaseAdmin
      .from('projects')
      .update({ status: 'Rendering', published_url: null, analysis: null }) // Reset old results
      .eq('id', projectId);

    if (statusUpdateError) {
      throw new Error(`Failed to update project status: ${statusUpdateError.message}`);
    }

    // Insert a new job into the queue
    const { data: job, error: jobInsertError } = await supabaseAdmin
      .from('video_jobs')
      .insert({
        project_id: projectId,
        user_id: user.id,
        status: 'queued',
        job_payload: timeline,
      })
      .select('id')
      .single();

    if (jobInsertError) {
        // Attempt to roll back the status update if job creation fails
        await supabaseAdmin.from('projects').update({ status: 'Scripting' }).eq('id', projectId);
        throw new Error(`Failed to create video job: ${jobInsertError.message}`);
    }

    return new Response(JSON.stringify({ success: true, jobId: job.id, message: "Video rendering job has been queued." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 202, // 202 Accepted
    });

  } catch (error) {
    console.error('Video Stitcher Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});