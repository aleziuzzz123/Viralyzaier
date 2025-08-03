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

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const userId = url.searchParams.get('state'); // The user's Supabase ID is now passed in the state.
  const redirectUri = `${SUPABASE_URL}/functions/v1/youtube-oauth-callback`;
  const appRedirectUrl = new URL(url.origin);
  appRedirectUrl.pathname = '/'; // Redirect to the main app page

  try {
    if (!code) {
      throw new Error('Authorization code not found in request.');
    }
    if (!userId) {
      throw new Error('State parameter (userId) is missing from the request.');
    }
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
      throw new Error('Function is not configured with necessary environment variables.');
    }
    
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
        const errorBody = await tokenResponse.json();
        console.error("Google token exchange error:", errorBody);
        const errorMessage = errorBody.error_description || 'Failed to exchange authorization code for tokens.';
        if (errorBody.error === 'redirect_uri_mismatch') {
            throw new Error('Redirect URI Mismatch. Please ensure the Supabase function URL is added to your Google Cloud authorized redirect URIs.');
        }
        throw new Error(errorMessage);
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in, scope } = tokens;

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // Store tokens securely using the user ID from the state parameter.
    const { error: upsertError } = await supabaseAdmin
      .from('user_youtube_tokens')
      .upsert({
        user_id: userId,
        access_token,
        refresh_token,
        expires_at: expiresAt,
        scope,
      });

    if (upsertError) {
      throw new Error(`Failed to save tokens to database: ${upsertError.message}`);
    }
    
    appRedirectUrl.searchParams.set('youtube_connected', 'true');
    return Response.redirect(appRedirectUrl.toString(), 302);

  } catch (error) {
    console.error('YouTube OAuth Callback Error:', error.message);
    appRedirectUrl.searchParams.set('youtube_error', error.message);
    return Response.redirect(appRedirectUrl.toString(), 302);
  }
});