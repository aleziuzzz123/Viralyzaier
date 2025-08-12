// supabase/functions/ai-broll-generator/index.ts
declare const Deno: any;
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.4';
import { GoogleGenAI, Type } from 'https://esm.sh/@google/genai@^1.11.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Function is not configured with necessary secrets.");
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header.');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Authentication failed.');

    let body;
    try {
        body = await req.json();
    } catch (e) {
        return new Response(JSON.stringify({ error: `Invalid JSON body: ${e.message}` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
        });
    }

    const { scriptText } = body;

    if (!scriptText) {
      throw new Error("Missing 'scriptText' in request body.");
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const prompt = `You are an AI B-Roll director. Your task is to analyze a line from a video script and decide the best visual strategy. You have two options:
1.  **Search Stock Footage:** If the description is generic or common (e.g., "a person typing on a laptop", "a bustling city street").
2.  **Generate AI Video:** If the description is highly specific, abstract, or imaginative (e.g., "a futuristic cityscape with flying cars", "a brain with glowing neurons").

Script Line: "${scriptText}"

Analyze the line and respond with a JSON object.
- If stock footage is best, use this format: \`{"type": "stock", "query": "a short, optimized search query for a stock video site"}\`
- If AI generation is best, use this format: \`{"type": "ai_video", "prompt": "a detailed, cinematic prompt for an AI video generator"}\``;
    
    const systemInstruction = `You are an AI assistant that ONLY responds with a single, valid JSON object that strictly adheres to the provided schema. Do not add any conversational text, explanations, or markdown formatting like \`\`\`json \`\`\` around the JSON response.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
          systemInstruction: systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
              type: Type.OBJECT,
              properties: {
                  type: { type: Type.STRING, description: "Must be 'stock' or 'ai_video'" },
                  query: { type: Type.STRING, description: "Required if type is 'stock'" },
                  prompt: { type: Type.STRING, description: "Required if type is 'ai_video'" }
              },
          }
      }
    });

    return new Response(response.text, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('AI B-Roll Generator Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});