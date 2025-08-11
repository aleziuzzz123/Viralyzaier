import { Platform, SceneAssets } from "../types.ts";
import { invokeEdgeFunction } from './supabaseService.ts';

// This service is now secure. API keys are handled by backend proxy functions.
// We only need to check if the function endpoints are available to the user.

// This list remains on the client for the UI dropdown.
export const ELEVENLABS_VOICES = [
    { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel - Calm, Clear' },
    { id: '29vD33N1CtxCmqQRPO9k', name: 'Drew - Upbeat, Conversational' },
    { id: '2EiwWnXFnvU5JabPnv8n', name: 'Clyde - Crisp, Narration' },
    { id: '5Q0t7uMcjvnagumLfvZi', name: 'Dave - Characterful, Storytelling' },
    { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi - Energetic, Youthful' },
    { id: 'CYw3kZ02Hs0563khs1Fj', name: 'Fin - Deep, Authoritative' },
    { id: 'D38z5RcWu1voky8WS1ja', name: 'Glinda - Warm, Gentle' },
    { id: 'SOYHLrjzK2X1ezoPC6cr', name: 'Nicole - Confident, Engaging' },
    { id: 'ThT5KcBeYPX3keUQqHPh', name: 'Gigi - Playful, Bubbly' },
    { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'James - Formal, Announcer' },
    { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam - Deep, Narrative' }
];

/**
 * Generates a voiceover by calling a secure Supabase Edge Function.
 * The function proxies the request to ElevenLabs, keeping the API key safe.
 */
export const generateVoiceover = async (text: string, voiceId: string = 'pNInz6obpgDQGcFmaJgB'): Promise<Blob> => {
    // The 'blob' responseType tells our helper to expect a file.
    const response = await invokeEdgeFunction<Blob>('elevenlabs-proxy', { type: 'tts', text, voiceId }, 'blob');
    if (!(response instanceof Blob)) {
        throw new Error("Failed to generate voiceover: Invalid response from server.");
    }
    return response;
};

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

/**
 * Generates a single static image from a text prompt with a retry mechanism.
 * The backend function now handles uploading and returns a URL.
 */
export const generateAiImage = async (prompt: string, platform: Platform, projectId: string): Promise<string> => {
    const aspectRatio = platform === 'youtube_long' ? '16:9' : '9:16';
    
    const attemptGeneration = async (p: string) => {
        try {
            const response = await invokeEdgeFunction<{ imageUrl: string }>('gemini-proxy', {
                type: 'generateImages',
                params: {
                    model: 'imagen-3.0-generate-002',
                    prompt: p,
                    config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio },
                    projectId: projectId
                }
            });
            return response.imageUrl || null;
        } catch (e) {
            console.error(`Image generation attempt failed for prompt "${p}":`, e);
            return null;
        }
    };

    // Attempt 1: Full, detailed prompt
    const fullPrompt = `A cinematic, visually stunning image for a video scene: ${prompt}. IMPORTANT: The main subject must be perfectly centered to avoid being cropped.`;
    let imageUrl = await attemptGeneration(fullPrompt);

    // Attempt 2: Simplified prompt if first fails (often due to safety filters)
    if (!imageUrl) {
        console.warn("Initial image generation failed, retrying with a simpler prompt...");
        const simplePrompt = `A high-quality, safe-for-work photograph of: ${prompt}`;
        imageUrl = await attemptGeneration(simplePrompt);
    }
    
    if (!imageUrl) {
        throw new Error("AI image generation failed after multiple attempts. This could be due to safety filters rejecting the prompt, or a temporary issue with the AI service.");
    }

    return imageUrl;
};


/**
 * Generates a video clip using RunwayML by calling a secure Supabase Edge Function.
 * The client now handles polling for the result from RunwayML.
 */
export const generateRunwayVideoClip = async (prompt: string, platform: Platform): Promise<Blob> => {
    const aspectRatio = platform === 'youtube_long' ? '16_9' : '9_16';

    // Step 1: Initiate the generation and get a task UUID
    const startResult = await invokeEdgeFunction<{ uuid: string }>('runwayml-proxy', { prompt, aspectRatio });
    if (!startResult.uuid) {
        throw new Error("Failed to start video generation: Did not receive a task UUID.");
    }
    const { uuid } = startResult;

    // Step 2: Poll the status endpoint until the video is ready
    const maxAttempts = 25; // Poll for up to ~2 minutes
    const pollInterval = 5000; // 5 seconds

    for (let i = 0; i < maxAttempts; i++) {
        await delay(pollInterval);
        
        const statusResult = await invokeEdgeFunction<{ status: string; videoUrl?: string; error?: string }>('runwayml-proxy', { uuid });

        if (statusResult.status === 'SUCCEEDED') {
            if (!statusResult.videoUrl) {
                throw new Error("Video generation succeeded but no URL was provided.");
            }
            // Step 3: Download the video from the URL and return it as a blob
            const videoResponse = await fetch(statusResult.videoUrl);
            if (!videoResponse.ok) {
                throw new Error(`Failed to download the generated video from ${statusResult.videoUrl}`);
            }
            return await videoResponse.blob();
        }

        if (statusResult.status === 'FAILED') {
            throw new Error(`RunwayML generation failed: ${statusResult.error || 'Unknown error'}`);
        }
        // If status is 'PENDING', 'RUNNING', etc., the loop will continue
    }

    throw new Error("Video generation timed out. The task is still running, but the application has stopped waiting.");
};


/**
 * Generates an AI B-Roll clip for a given scene description.
 */
export const generateAiBroll = async (sceneDescription: string, platform: Platform): Promise<Blob> => {
    // This is essentially the same as generateRunwayVideoClip but could have a more specific internal prompt
    return generateRunwayVideoClip(`Cinematic B-roll footage for a video scene about: ${sceneDescription}`, platform);
};

/**
 * Animates a static image using AI.
 */
export const animateImage = async (imageUrl: string, motionPrompt: string): Promise<Blob> => {
    const startResult = await invokeEdgeFunction<{ uuid: string }>('runwayml-proxy', {
        imageUrl,
        motionPrompt,
        aspectRatio: '16_9' // Assume standard, could be passed in
    });

    if (!startResult.uuid) {
        throw new Error("Failed to start image animation: Did not receive a task UUID.");
    }
    const { uuid } = startResult;

    const maxAttempts = 25;
    const pollInterval = 5000;

    for (let i = 0; i < maxAttempts; i++) {
        await delay(pollInterval);
        const statusResult = await invokeEdgeFunction<{ status: string; videoUrl?: string; error?: string }>('runwayml-proxy', { uuid });
        if (statusResult.status === 'SUCCEEDED') {
            if (!statusResult.videoUrl) throw new Error("Animation succeeded but no URL was provided.");
            const videoResponse = await fetch(statusResult.videoUrl);
            if (!videoResponse.ok) throw new Error(`Failed to download the animated video`);
            return await videoResponse.blob();
        }
        if (statusResult.status === 'FAILED') {
            throw new Error(`Image animation failed: ${statusResult.error || 'Unknown error'}`);
        }
    }

    throw new Error("Image animation timed out.");
};

/**
 * Generates AI music from a text prompt using Stability AI.
 */
export const generateAiMusic = async (prompt: string, durationInSeconds: number): Promise<Blob> => {
    return await invokeEdgeFunction<Blob>('stability-audio-proxy', { prompt, durationInSeconds }, 'blob');
};

/**
 * Generates an AI sound effect from a text prompt.
 */
export const generateSfx = async (prompt: string): Promise<Blob> => {
    return await invokeEdgeFunction<Blob>('elevenlabs-proxy', { type: 'sfx', text: prompt }, 'blob');
};


/**
 * Calls the backend to stitch all assets into a final video.
 */
export const stitchAndRenderVideo = async (payload: {
    scenes: SceneAssets[];
    musicUrl: string | null;
    voiceoverVolume: number;
    musicVolume: number;
}): Promise<{ finalVideoUrl: string }> => {
    return await invokeEdgeFunction('video-stitcher', payload);
};