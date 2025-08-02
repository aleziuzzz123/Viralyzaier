declare const Deno: any;
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');

// Helper to refresh the access token
async function refreshAccessToken(refreshToken: string, supabaseAdmin: any, userId: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json();
    console.error("Failed to refresh token:", errorBody);
    throw new Error('Could not refresh access token. The user may need to re-authenticate.');
  }

  const newTokens = await response.json();
  const { access_token, expires_in } = newTokens;
  const expires_at = new Date(Date.now() + expires_in * 1000).toISOString();

  // Update the database with the new token
  const { error: updateError } = await supabaseAdmin
    .from('user_youtube_tokens')
    .update({ access_token, expires_at })
    .eq('user_id', userId);

  if (updateError) {
    console.error("Failed to update new access token in DB:", updateError);
    // Continue with the new token, but log the error
  }
  
  return access_token;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !SUPABASE_URL || !SERVICE_ROLE_KEY || !YOUTUBE_API_KEY) {
      throw new Error('Function is not configured with necessary environment variables.');
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    
    // 1. Authenticate the user from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header.');
    
    const supabaseUserClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY') as string, {
        global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();
    if (authError || !user) throw new Error(authError?.message || 'Authentication failed.');

    // 2. Get the user's tokens from the database
    const { data: tokens, error: tokenError } = await supabaseAdmin
        .from('user_youtube_tokens')
        .select('access_token, refresh_token, expires_at')
        .eq('user_id', user.id)
        .single();
    
    if (tokenError || !tokens) {
        throw new Error(tokenError?.message || 'User has not connected their YouTube account.');
    }

    let { access_token, refresh_token, expires_at } = tokens;

    // 3. Check if the token is expired and refresh if necessary
    if (new Date(expires_at) < new Date()) {
        console.log("Access token expired, refreshing...");
        access_token = await refreshAccessToken(refresh_token, supabaseAdmin, user.id);
    }
    
    // 4. Make the proxy request to the YouTube API
    const { endpoint, params, isAnalytics } = await req.json();
    const apiBaseUrl = isAnalytics 
        ? 'https://youtubeanalytics.googleapis.com/v2' 
        : 'https://www.googleapis.com/youtube/v3';

    const apiUrl = new URL(`${apiBaseUrl}/${endpoint}`);
    apiUrl.searchParams.set('key', YOUTUBE_API_KEY);
    for (const key in params) {
        apiUrl.searchParams.set(key, params[key]);
    }

    const apiResponse = await fetch(apiUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Accept': 'application/json',
      },
    });

    if (!apiResponse.ok) {
        const errorBody = await apiResponse.json();
        console.error(`YouTube API error for endpoint ${endpoint}:`, errorBody);
        const errorMessage = errorBody.error?.message || `YouTube API request failed with status ${apiResponse.status}`;
        throw new Error(errorMessage);
    }

    const data = await apiResponse.json();
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('YouTube API Proxy Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});