// supabase/functions/youtube-publish/index.ts
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
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

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
    if (!response.ok) throw new Error('Could not refresh access token.');
    const newTokens = await response.json();
    const { access_token, expires_in } = newTokens;
    const expires_at = new Date(Date.now() + expires_in * 1000).toISOString();
    await supabaseAdmin.from('user_youtube_tokens').update({ access_token, expires_at }).eq('user_id', userId);
    return access_token;
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        // --- Configuration & Authentication ---
        if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !SUPABASE_URL || !SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
            throw new Error('Function is not configured with necessary secrets.');
        }

        const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
        
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error('Missing authorization header.');
        const supabaseUserClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
        const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();
        if (authError || !user) throw new Error(authError?.message || 'Authentication failed.');

        // --- Get User Tokens ---
        const { data: tokens, error: tokenError } = await supabaseAdmin.from('user_youtube_tokens').select('*').eq('user_id', user.id).single();
        if (tokenError || !tokens) throw new Error('User has not connected their YouTube account.');

        let { access_token, refresh_token, expires_at } = tokens;
        if (new Date(expires_at) < new Date()) {
            access_token = await refreshAccessToken(refresh_token, supabaseAdmin, user.id);
        }

        // --- Process Request Body ---
        const { videoFileUrl, title, description, tags, thumbnailUrl } = await req.json();
        if (!videoFileUrl || !title || !description || !tags || !thumbnailUrl) {
            throw new Error("Missing required fields: videoFileUrl, title, description, tags, thumbnailUrl.");
        }

        // --- Fetch Video and Thumbnail Blobs ---
        const [videoResponse, thumbResponse] = await Promise.all([
            fetch(videoFileUrl),
            fetch(thumbnailUrl)
        ]);
        if (!videoResponse.ok) throw new Error(`Failed to fetch video file from storage: ${videoResponse.statusText}`);
        if (!thumbResponse.ok) throw new Error(`Failed to fetch thumbnail from storage: ${thumbResponse.statusText}`);
        
        const videoBlob = await videoResponse.blob();
        const thumbBlob = await thumbResponse.blob();

        // --- YouTube API Upload (Resumable) ---
        // 1. Initiate upload
        const videoMetadata = {
            snippet: { title, description, tags },
            status: { privacyStatus: 'private' },
        };
        
        const initResponse = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json; charset=UTF-8',
                'X-Upload-Content-Length': videoBlob.size.toString(),
                'X-Upload-Content-Type': videoBlob.type,
            },
            body: JSON.stringify(videoMetadata),
        });

        if (!initResponse.ok) throw new Error(`YouTube upload initiation failed: ${await initResponse.text()}`);
        
        const uploadUrl = initResponse.headers.get('Location');
        if (!uploadUrl) throw new Error('Did not receive a resumable upload URL from YouTube.');

        // 2. Upload video binary
        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Length': videoBlob.size.toString() },
            body: videoBlob,
        });

        if (!uploadResponse.ok) throw new Error(`YouTube video upload failed: ${await uploadResponse.text()}`);
        
        const uploadedVideo = await uploadResponse.json();
        const videoId = uploadedVideo.id;
        
        // 3. Set thumbnail
        const thumbUploadUrl = `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}`;
        await fetch(thumbUploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': thumbBlob.type,
                'Content-Length': thumbBlob.size.toString(),
            },
            body: thumbBlob,
        });
        // We don't strictly need to wait for the thumbnail response to confirm the upload was successful

        const finalVideoUrl = `https://www.youtube.com/watch?v=${videoId}`;

        return new Response(JSON.stringify({ videoUrl: finalVideoUrl }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error('YouTube Publish Function Error:', error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});