
// supabase/functions/ai-polish/index.ts
declare const Deno: any;
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.4';
import { GoogleGenAI, Type } from 'https://esm.sh/@google/genai@^1.11.0';
import { v4 as uuidv4 } from 'https://deno.land/std@0.100.0/uuid/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Secrets
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');

// Helper to parse Gemini JSON robustly
const parseGeminiJson = (res: { text: string | undefined | null }) => {
    try {
        const rawText = res.text || '';
        const cleanText = rawText.trim().replace(/^```json/, '').replace(/```$/, '').trim();
        if (!cleanText) throw new Error("AI returned empty or invalid JSON content.");
        return JSON.parse(cleanText);
    } catch (e) {
        console.error("Failed to parse Gemini JSON:", res.text, e);
        throw new Error("AI returned invalid data format.");
    }
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // --- Configuration & Authentication ---
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !GEMINI_API_KEY || !ELEVENLABS_API_KEY) {
      throw new Error("Function is not configured with necessary secrets.");
    }
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header.');
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY as string, {
        global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error(authError?.message || 'Authentication failed.');

    const { timeline, script, projectId } = await req.json();
    if (!timeline || !script || !projectId) {
      throw new Error("Missing 'timeline', 'script', or 'projectId' in request body.");
    }
    
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // --- 1. Use Gemini to suggest SFX placements ---
    const scriptSummary = script.scenes.map((s: any, i: number) => `Scene ${i+1} (${s.visual}): ${s.voiceover}`).join('\n');
    const prompt = `You are an expert sound designer for viral videos. Based on the following script, suggest 3-5 subtle, impactful sound effects (SFX) to enhance key moments.
    
    Script:
    ${scriptSummary}

    Your output MUST be a JSON array of objects, each with "time" (the precise time in seconds for the SFX to start, inferred from scene progression) and "prompt" (a short text description for an SFX generation AI, e.g., "a subtle whoosh", "a camera shutter click", "a gentle pop").`;
    
    const sfxSuggestionsResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        time: { type: Type.NUMBER },
                        prompt: { type: Type.STRING }
                    },
                    required: ["time", "prompt"]
                }
            }
        }
    });

    const sfxSuggestions = parseGeminiJson(sfxSuggestionsResponse);

    // --- 2. Generate, Upload, and Add SFX clips to timeline ---
    const sfxTrack = timeline.tracks.find((t: any) => t.type === 'sfx');
    if (!sfxTrack) throw new Error("Timeline is missing an SFX track.");

    for (const sfx of sfxSuggestions) {
      try {
        const elevenLabsResponse = await fetch('https://api.elevenlabs.io/v1/sound-effects', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': ELEVENLABS_API_KEY,
                'Accept': 'audio/mpeg',
            },
            body: JSON.stringify({ text: sfx.prompt }),
        });
        if (!elevenLabsResponse.ok) continue;
        const audioBlob = await elevenLabsResponse.blob();

        const path = `${user.id}/${projectId}/sfx/${uuidv4()}.mp3`;
        const { error: uploadError } = await supabaseAdmin.storage.from('assets').upload(path, audioBlob, { upsert: true });
        if (uploadError) continue;
        
        const { data: { publicUrl } } = supabaseAdmin.storage.from('assets').getPublicUrl(path);

        sfxTrack.clips.push({
          id: uuidv4(),
          type: 'audio',
          url: publicUrl,
          sceneIndex: -1,
          startTime: sfx.time,
          endTime: sfx.time + 1.5,
          sourceDuration: 1.5,
        });
      } catch (e) {
        console.error(`Failed to process SFX '${sfx.prompt}': ${e.message}`);
      }
    }

    // --- 3. Apply Ken Burns effect to all images on A-Roll ---
    const aRollTrack = timeline.tracks.find((t: any) => t.type === 'a-roll');
    if (aRollTrack) {
        aRollTrack.clips.forEach((clip: any, index: number) => {
            if (clip.type === 'image') {
                if (!clip.effects) {
                    clip.effects = {};
                }
                // Alternate direction for variety
                clip.effects.kenBurns = { direction: index % 2 === 0 ? 'in' : 'out' };
            }
        });
    }

    return new Response(JSON.stringify({ timeline: timeline }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('AI Polish Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});