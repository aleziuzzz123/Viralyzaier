// supabase/functions/pixabay-proxy/index.ts
declare const Deno: any;
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PIXABAY_API_KEY = Deno.env.get('PIXABAY_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!PIXABAY_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Function is not configured. Missing PIXABAY_API_KEY, SUPABASE_URL, or SUPABASE_ANON_KEY.");
    }

    // Authenticate the user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header.');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Authentication failed.');
    
    // Parse request body
    let body;
    try {
        body = await req.json();
    } catch (e) {
        return new Response(JSON.stringify({ error: `Invalid JSON body: ${e.message}` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
        });
    }

    const { query, type = 'photos' } = body;

    if (!query) {
      throw new Error("Missing 'query' in request body.");
    }
    
    const isVideo = type === 'videos';
    const apiBase = isVideo ? 'https://pixabay.com/api/videos/' : 'https://pixabay.com/api/';
    const url = new URL(apiBase);
    url.searchParams.set('key', PIXABAY_API_KEY);
    url.searchParams.set('q', query);
    url.searchParams.set('per_page', '24');
    if (isVideo) {
        url.searchParams.set('video_type', 'film');
    } else {
        url.searchParams.set('image_type', 'photo');
    }


    const pixabayResponse = await fetch(url.toString());

    if (!pixabayResponse.ok) {
      const errorBody = await pixabayResponse.text();
      throw new Error(`Pixabay API Error: ${pixabayResponse.status} ${errorBody}`);
    }

    const data = await pixabayResponse.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Pixabay Proxy Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});