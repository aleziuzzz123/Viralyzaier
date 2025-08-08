import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from '@supabase/supabase-js';
import { supabaseUrl } from '../services/supabaseClient.ts';
import type { Database } from '../services/database.types.ts';
import type { Script, Trend, EnhancedTopic, VideoDeconstruction, ViralScoreBreakdown, OptimizationStep } from '../types.ts';

// Schemas
const viralityAnalysisSchema = { type: Type.OBJECT, properties: { overallScore: { type: Type.NUMBER, description: "A score from 1-100 for overall viral potential." }, hookAnalysis: { type: Type.STRING, description: "1-sentence analysis of the hook's strength and attention-grabbing power." }, pacingAnalysis: { type: Type.STRING, description: "1-sentence analysis of the script's pacing, flow, and ability to hold attention." }, valueAnalysis: { type: Type.STRING, description: "1-sentence analysis of the value (entertainment, education, emotion) delivered to the viewer." }, ctaAnalysis: { type: Type.STRING, description: "1-sentence analysis of the call-to-action's effectiveness and clarity." }, finalVerdict: { type: Type.STRING, description: "A concluding one-sentence rationale for the overall score, summarizing the script's strongest and weakest points." } }, required: ["overallScore", "hookAnalysis", "pacingAnalysis", "valueAnalysis", "ctaAnalysis", "finalVerdict"] };
const topicEnhancementSchema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { angle: { type: Type.STRING, description: "A specific, more viral-friendly angle for the original topic. It should spark curiosity, controversy, or a strong emotion." }, rationale: { type: Type.STRING, description: "A short, one-sentence explanation of why this angle is psychologically compelling for social media." } }, required: ["angle", "rationale"], } };
const singleScriptResponseSchema = { type: Type.OBJECT, properties: { title: { type: Type.STRING, description: "A catchy, viral-style title for the video, adapted for the new topic.", }, hook: { type: Type.STRING, description: "A 1-3 second hook for the new topic, preserving the style of the original hook.", }, script: { type: Type.STRING, description: "The full script for the new topic, preserving the structure, pacing, and formatting (including visual cues) of the original.", }, }, required: ["title", "hook", "script"], };
const optimizationTraceSchema = {
    type: Type.OBJECT,
    properties: {
        steps: {
            type: Type.ARRAY,
            description: "An array of optimization steps.",
            items: {
                type: Type.OBJECT,
                properties: {
                    log: { type: Type.STRING, description: "A short, user-facing log of what this step is improving." },
                    score: { type: Type.NUMBER, description: "The new virality score (1-100) after this step." },
                    script: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            hook: { type: Type.STRING },
                            script: { type: Type.STRING }
                        },
                        required: ["title", "hook", "script"]
                    }
                },
                required: ["log", "score", "script"]
            }
        }
    },
    required: ["steps"]
};

export const QUOTA_ERROR_MESSAGE = "API quota exceeded for the 'gemini-2.5-flash' model. Your Google Cloud project has paid limits, but they might not be applied to this specific model. Please go to the Quotas page in your Google Cloud Console, filter for the 'generativelanguage.googleapis.com' service, and request a quota increase for the 'gemini-2.5-flash' model.";

function getOptimizationPrompt(task: any): string {
    if (task.mode === 'generate') {
        const { topic, tone, lengthInSeconds } = task.data;
        return `
You are a script optimization AI. Your task is to generate a script about "${topic}" with a "${tone}" tone, approximately ${lengthInSeconds} seconds long, and then show how you improve it step-by-step.

The output MUST be a single JSON object that strictly adheres to the schema provided. The object must contain a key "steps" which is an array of 5 optimization step objects.

The 5 steps are:
1.  **First Draft**: Create a decent first draft. The "log" should be "Generating first draft...". The "score" must be between 40-60.
2.  **Hook Refinement**: Substantially rewrite the hook for better impact and curiosity. The "log" should be "Refining hook for maximum impact.". The "score" must be between 65-75. The script body can have minor changes to align with the new hook.
3.  **Structure & Pacing**: Improve the flow, transitions, and pacing of the script body. Make it snappier. The "log" should be "Improving structure and pacing.". The "score" must be between 78-88.
4.  **Value & CTA**: Enhance the core value proposition and add or improve the Call to Action. The "log" should be "Enhancing value and call to action.". The "score" must be between 90-97.
5.  **Final Polish**: Perform a final polish of the entire script for clarity, word choice, and power. The "log" should be "Performing final polish.". The "score" MUST be 100.

Return only the JSON object.
`;
    } else { // optimize mode
        const { title, hook, script } = task.data;
        return `
You are a script optimization AI. Your task is to take an existing script and improve it step-by-step.
Here is the user's script:
Title: "${title}"
Hook: "${hook}"
Script: "${script}"

The output MUST be a single JSON object that strictly adheres to the schema provided. The object must contain a key "steps" which is an array of 5 optimization step objects.

The 5 steps are:
1.  **Initial Analysis**: Analyze the provided script. Do NOT change it. The "log" should be "Analyzing user-provided script...". The "score" must be your honest assessment of the original script's potential (between 10-60).
2.  **Hook Refinement**: Substantially rewrite the hook for better impact and curiosity. The "log" should be "Refining hook for maximum impact.". The "score" must be between 65-75. The script body can have minor changes to align with the new hook.
3.  **Structure & Pacing**: Improve the flow, transitions, and pacing of the script body. Make it snappier. The "log" should be "Improving structure and pacing.". The "score" must be between 78-88.
4.  **Value & CTA**: Enhance the core value proposition and add or improve the Call to Action. The "log" should be "Enhancing value and call to action.". The "score" must be between 90-97.
5.  **Final Polish**: Perform a final polish of the entire script for clarity, word choice, and power. The "log" should be "Performing final polish.". The "score" MUST be 100.

Return only the JSON object.
`;
    }
}


export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { action, payload } = req.body;

    if (action !== 'sendClientInvite' && !process.env.API_KEY) {
        return res.status(500).json({ message: "API_KEY environment variable is not set on the server." });
    }
    
    let ai: GoogleGenAI | undefined;
    if (action !== 'sendClientInvite') {
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    }
    
    try {
        switch (action) {
            case 'getOptimizationTrace': {
                const { task } = payload;
                const prompt = getOptimizationPrompt(task);
                const response = await ai!.models.generateContent({
                    model: "gemini-2.5-flash",
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: optimizationTraceSchema,
                    },
                });

                const trace: { steps: OptimizationStep[] } = JSON.parse(response.text);

                // Add a tone property to the final script for saving later
                if (trace.steps.length > 0) {
                    const finalStep = trace.steps[trace.steps.length - 1];
                    (finalStep.script as any).tone = task.mode === 'generate' ? task.data.tone : 'Optimized';
                }

                return res.status(200).json(trace);
            }
            case 'fetchTrendingTopics': {
                const { niche } = payload;
                const nichePrompt = niche ? `Focus specifically on trends relevant to the "${niche}" niche.` : `Find trends across a variety of popular niches like fitness, tech, finance, and food.`;
                const prompt = `
You are a viral trend analyst for social media. Use Google Search to find 4-5 emerging, highly relevant topics with high viral potential on TikTok and YouTube Shorts RIGHT NOW.
${nichePrompt}
For each trend, you MUST provide a JSON object with the following fields:
- "topic": (string) The short, catchy name of the trend.
- "summary": (string) A 1-2 sentence explanation of what the trend is.
- "trendScore": (number) An integer score from 1-100 representing its current viral potential.
- "audienceInsight": (string) A brief explanation of WHY this is appealing to a specific audience.
- "suggestedAngles": (string[]) An array of 2-3 specific video ideas or angles for this trend.
- "competition": (string) Must be one of: "Low", "Medium", "High".
- "trendDirection": (string) Must be one of: "Upward", "Stable", "Downward".

Format the entire response as a single, valid JSON array of these objects. The entire response must be enclosed in a single JSON markdown block (starting with \`\`\`json and ending with \`\`\`). Do not include any text outside of this block.
`;
                const response = await ai!.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { tools: [{ googleSearch: {} }] } });
                const text = response.text;
                const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map(chunk => chunk.web).filter((source): source is { uri: string; title: string } => !!source?.uri) ?? [];
                const jsonMatch = text.match(/```(?:json)?([\s\S]*?)```/);
                const jsonString = jsonMatch ? jsonMatch[1].trim() : text;
                
                let trends: Trend[];
                try {
                    trends = JSON.parse(jsonString);
                } catch (e) {
                    console.error("Failed to parse JSON from AI response for Trending Topics:", e);
                    console.error("Original AI response text:", text);
                    throw new Error("The AI returned a response in an unexpected format. Please try again.");
                }

                return res.status(200).json({ trends, sources });
            }
            case 'analyzeScriptVirality': {
                const { script } = payload;
                const prompt = `Analyze the following script's viral potential: Title: ${script.title}, Hook: ${script.hook}, Script: ${script.script}. Provide a JSON object with a detailed analysis based on the provided schema.`;
                const response = await ai!.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { responseMimeType: "application/json", responseSchema: viralityAnalysisSchema } });
                const analysis: ViralScoreBreakdown = JSON.parse(response.text);
                return res.status(200).json(analysis);
            }
            case 'enhanceTopic': {
                const { topic } = payload;
                const prompt = `You are a viral marketing expert. Generate 3-4 specific, viral-friendly angles for this topic: "${topic}". Return a valid JSON array of objects, where each object has "angle" and "rationale".`;
                const response = await ai!.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { responseMimeType: "application/json", responseSchema: topicEnhancementSchema } });
                const enhancedTopics: EnhancedTopic[] = JSON.parse(response.text);
                return res.status(200).json(enhancedTopics);
            }
             case 'generateVisualsForScript': {
                const { script, artStyle } = payload;
                const prompt = `Based on this script, generate 3 distinct, visually compelling storyboard concepts in a ${artStyle} style: Title: "${script.title}", Script: ${script.script}`;
                const response = await ai!.models.generateImages({ model: 'imagen-3.0-generate-002', prompt, config: { numberOfImages: 3, outputMimeType: 'image/jpeg', aspectRatio: '16:9' } });
                if (!response.generatedImages || response.generatedImages.length === 0) throw new Error("The AI failed to generate any images.");
                const visuals = response.generatedImages.map(img => img.image.imageBytes);
                return res.status(200).json(visuals);
            }
            case 'deconstructVideo': {
                const { videoUrl } = payload;
                const prompt = `
You are an expert YouTube video analyst. Your task is to deconstruct the video at this URL: ${videoUrl}.
Use Google Search to gather information about its title, content, and reception.
Based on your analysis, you MUST return a single, valid JSON object that strictly adheres to the following structure.
Crucially, you should generate ONE new script in the 'generatedScripts' array.
{
  "title": "The video's full title",
  "analysis": {
    "hook": "A 1-2 sentence analysis of the video's hook (the first 3-5 seconds).",
    "structure": "A 1-2 sentence analysis of the video's overall structure, pacing, and flow.",
    "valueProposition": "A 1-2 sentence analysis of the core value (e.g., entertainment, education, inspiration) the video provides to the viewer.",
    "callToAction": "A 1-2 sentence analysis of the video's call to action, if any."
  },
  "generatedScripts": [
    {
      "title": "A new, catchy script title based on the video's formula.",
      "hook": "A new, strong hook for the generated script.",
      "script": "The full script text, including visual cues like [SCENE] or ON-SCREEN TEXT, based on the video's successful formula but for a slightly different angle or topic."
    }
  ]
}
The JSON object MUST be the only thing in your response, wrapped in a single JSON markdown block (starting with \`\`\`json and ending with \`\`\`). Do not include any other text or explanations.`;
                const response = await ai!.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { tools: [{ googleSearch: {} }] } });
                const text = response.text;
                const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map(chunk => chunk.web).filter((source): source is { uri: string; title:string } => !!source?.uri) ?? [];
                const jsonMatch = text.match(/```(?:json)?([\s\S]*?)```/);
                const jsonString = jsonMatch ? jsonMatch[1].trim() : text;
                
                let deconstruction: VideoDeconstruction;
                try {
                    deconstruction = JSON.parse(jsonString);
                } catch (e) {
                    console.error("Failed to parse JSON from AI response for Video Deconstructor:", e);
                    console.error("Original AI response text:", text);
                    throw new Error("The AI returned a response in an unexpected format. Please try again.");
                }

                deconstruction.generatedScripts = deconstruction.generatedScripts.map(s => ({ ...s, id: crypto.randomUUID(), tone: 'Viral Formula' }));
                return res.status(200).json({ deconstruction, sources });
            }
            case 'remixScript': {
                const { baseScript, newTopic } = payload;
                const prompt = `Rewrite this base script to be about a new topic: "${newTopic}", while preserving the original's structure, pacing, and tone. Base Script: Title: "${baseScript.title}", Hook: "${baseScript.hook}", Script: ${baseScript.script}. Return a single, valid JSON object.`;
                const response = await ai!.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { responseMimeType: "application/json", responseSchema: singleScriptResponseSchema, }, });
                const remixedPart: Omit<Script, 'id' | 'tone'> = JSON.parse(response.text);
                const newScript: Script = { ...remixedPart, id: crypto.randomUUID(), tone: 'Remixed', isNew: true, };
                return res.status(200).json(newScript);
            }
            case 'sendClientInvite': {
                const { email } = payload;
                if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
                    return res.status(500).json({ message: "Supabase service role key is not configured on the server." });
                }
                
                const supabaseAdmin = createClient<Database>(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);
                
                const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);

                if (error) {
                    console.error("Supabase invite error:", error);
                    return res.status(500).json({ message: error.message || "Failed to send invitation." });
                }
                
                return res.status(200).json({ message: "Invitation sent successfully.", data });
            }
            default:
                return res.status(400).json({ message: "Invalid action" });
        }
    } catch (error: unknown) {
        console.error("Error in Vercel function:", error);
        let message = "An unknown error occurred in the API proxy.";
        if (error instanceof Error) {
            message = error.message;
        } else if (typeof error === 'string') {
            message = error;
        }
        const errorMessage = message.includes('quota') ? QUOTA_ERROR_MESSAGE : message;
        return res.status(500).json({ message: errorMessage });
    }
};