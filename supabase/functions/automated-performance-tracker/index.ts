// supabase/functions/automated-performance-tracker/index.ts
declare const Deno: any;
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.44.4';
import { GoogleGenAI } from 'https://esm.sh/@google/genai@^1.11.0';

// Self-contained CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- Environment Variables ---
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');

// --- Helper Functions ---

// Extracts YouTube Video ID from various URL formats
function getYouTubeVideoId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// Refreshes an expired Google OAuth access token
async function refreshAccessToken(refreshToken: string, supabaseAdmin: SupabaseClient, userId: string) {
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
    console.error(`Failed to refresh token for user ${userId}:`, errorBody);
    // If refresh fails, we may need to mark the token as invalid
    // For now, we throw, which will skip this user's project check
    throw new Error('Could not refresh access token. The user may need to re-authenticate.');
  }

  const newTokens = await response.json();
  const { access_token, expires_in } = newTokens;
  const expires_at = new Date(Date.now() + expires_in * 1000).toISOString();

  const { error: updateError } = await supabaseAdmin
    .from('user_youtube_tokens')
    .update({ access_token, expires_at })
    .eq('user_id', userId);

  if (updateError) {
    console.error(`Failed to update new access token in DB for user ${userId}:`, updateError);
  }
  
  return access_token;
}


// --- Main Server Logic ---

serve(async (req: Request) => {
  // Initialize clients
  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const ai = new GoogleGenAI({apiKey: GEMINI_API_KEY});

  try {
    // 1. Get all published projects with a URL that need a check
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: projects, error: projectsError } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('status', 'Published')
      .not('published_url', 'is', null)
      .or(`last_performance_check.is.null,last_performance_check.lte.${twentyFourHoursAgo}`);

    if (projectsError) throw projectsError;
    if (!projects || projects.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No projects to check." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    let checkedCount = 0;
    
    // 2. Process each project
    for (const project of projects) {
      try {
        const videoId = getYouTubeVideoId(project.published_url);
        if (!videoId) {
          console.warn(`Skipping project ${project.id}: Invalid YouTube URL.`);
          continue;
        }

        // Get user's tokens
        const { data: tokens, error: tokenError } = await supabaseAdmin
            .from('user_youtube_tokens')
            .select('access_token, refresh_token, expires_at')
            .eq('user_id', project.user_id)
            .single();
        
        if (tokenError || !tokens) {
          console.warn(`Skipping project ${project.id}: No YouTube tokens for user ${project.user_id}.`);
          continue;
        }

        let { access_token, refresh_token, expires_at } = tokens;

        // Refresh token if needed
        if (new Date(expires_at) < new Date()) {
            access_token = await refreshAccessToken(refresh_token, supabaseAdmin, project.user_id);
        }

        // Fetch latest stats from YouTube API
        const videoApiUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${YOUTUBE_API_KEY}`;
        const apiResponse = await fetch(videoApiUrl, {
            headers: { 'Authorization': `Bearer ${access_token}` },
        });

        if (!apiResponse.ok) {
            const errorBody = await apiResponse.json();
            console.error(`YouTube API error for video ${videoId}:`, errorBody.error.message);
            continue; // Skip to next project
        }

        const apiData = await apiResponse.json();
        if (!apiData.items || apiData.items.length === 0) {
            console.warn(`Video ${videoId} not found via API.`);
            continue;
        }
        
        const stats = apiData.items[0].statistics;
        const newViews = parseInt(stats.viewCount || '0');
        const oldViews = (project.performance as any)?.views || 0;

        // Compare and decide if a notification is needed
        if (newViews > oldViews + 100) { // Threshold for notification
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `A YouTube video titled "${project.title}" has seen its view count jump from ${oldViews} to ${newViews}! Write a short, exciting notification message for the creator celebrating this milestone.`
            });
            
            await supabaseAdmin.from('notifications').insert({
                user_id: project.user_id,
                project_id: project.id,
                message: response.text,
            });
        }
        
        // Update project performance in DB
        const updatedPerformance = {
          views: newViews,
          likes: parseInt(stats.likeCount || '0'),
          comments: parseInt(stats.commentCount || '0'),
          retention: (project.performance as any)?.retention || 0, // Retention needs Analytics API, so we keep the old value
        };
        
        await supabaseAdmin.from('projects').update({
            performance: updatedPerformance,
            last_performance_check: new Date().toISOString()
        }).eq('id', project.id);
        
        checkedCount++;
      } catch (projectError) {
        console.error(`Failed to process project ${project.id}: ${projectError.message}`);
        // Continue to the next project
      }
    }
    
    return new Response(JSON.stringify({ success: true, checked: checkedCount, total: projects.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error('Automated Tracker Function Error:', e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});