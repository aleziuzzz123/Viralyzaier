import { Platform } from "../types";
import { invokeEdgeFunction } from './supabaseService';

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
    { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam - Deep, Narrative' },
];

/**
 * Generates a voiceover by calling a secure Supabase Edge Function.
 * The function proxies the request to ElevenLabs, keeping the API key safe.
 */
export const generateVoiceover = async (text: string, voiceId: string = 'pNInz6obpgDQGcFmaJgB'): Promise<Blob> => {
    // The 'blob' responseType tells our helper to expect a file.
    const response = await invokeEdgeFunction('elevenlabs-proxy', { text, voiceId }, 'blob');
    if (!(response instanceof Blob)) {
        throw new Error("Failed to generate voiceover: Invalid response from server.");
    }
    return response;
};

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

/**
 * Generates a video clip by calling a secure Supabase Edge Function.
 * The client now handles polling for the result from RunwayML.
 */
export const generateVideoClip = async (prompt: string, platform: Platform): Promise<Blob> => {
    const aspectRatio = platform === 'youtube' ? '16_9' : '9_16';

    // Step 1: Initiate the generation and get a task UUID
    const startResult = await invokeEdgeFunction('runwayml-proxy', { prompt, aspectRatio });
    if (!startResult.uuid) {
        throw new Error("Failed to start video generation: Did not receive a task UUID.");
    }
    const { uuid } = startResult;

    // Step 2: Poll the status endpoint until the video is ready
    const maxAttempts = 25; // Poll for up to ~2 minutes
    const pollInterval = 5000; // 5 seconds

    for (let i = 0; i < maxAttempts; i++) {
        await delay(pollInterval);
        
        const statusResult = await invokeEdgeFunction('runwayml-proxy', { uuid });

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
