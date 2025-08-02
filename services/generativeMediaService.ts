import { Platform } from "../types";

const RUNWAYML_API_KEY = (import.meta as any).env.VITE_RUNWAYML_API_KEY;
const ELEVENLABS_API_KEY = (import.meta as any).env.VITE_ELEVENLABS_API_KEY;

const checkRunwayKey = () => { if (!RUNWAYML_API_KEY) throw new Error("RunwayML API Key is not configured."); };
const checkElevenLabsKey = () => { if (!ELEVENLABS_API_KEY) throw new Error("ElevenLabs API Key is not configured."); };

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
    { id: 'yoZ06aM5OubLqnאיב9ce', name: 'Adam - Deep, Narrative' }, // A popular default
];


// A helper for polling RunwayML's async generation endpoint
const poll = <T>(fn: () => Promise<T>, validate: (result: T) => boolean, interval: number, maxAttempts: number): Promise<T> => {
  let attempts = 0;
  const executePoll = async (resolve: (value: T) => void, reject: (reason?: any) => void) => {
    try {
        const result = await fn();
        attempts++;
        if (validate(result)) {
            return resolve(result);
        } else if (maxAttempts && attempts === maxAttempts) {
            return reject(new Error('Max polling attempts reached'));
        } else {
            setTimeout(executePoll, interval, resolve, reject);
        }
    } catch (err) {
        return reject(err);
    }
  };
  return new Promise(executePoll);
};


export const generateVoiceover = async (text: string, voiceId: string = 'yoZ06aM5OubLqnאיב9ce'): Promise<Blob> => {
    checkElevenLabsKey();
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': ELEVENLABS_API_KEY!,
        },
        body: JSON.stringify({
            text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75
            }
        }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`ElevenLabs API error: ${errorData.detail?.message || response.statusText}`);
    }

    return await response.blob();
};

export const generateVideoClip = async (prompt: string, platform: Platform): Promise<Blob> => {
    checkRunwayKey();
    const aspectRatio = platform === 'youtube' ? '16_9' : '9_16';

    // 1. Initiate generation
    const genResponse = await fetch('https://api.runwayml.com/v1/tasks', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RUNWAYML_API_KEY}`,
        },
        body: JSON.stringify({
            model: "gen-3-video",
            parameters: {
                prompt,
                aspect_ratio: aspectRatio,
                steps: 25,
                seed: Math.floor(Math.random() * 100000),
            }
        }),
    });

    if (!genResponse.ok) {
        throw new Error(`RunwayML API error on initiation: ${await genResponse.text()}`);
    }

    const { uuid } = await genResponse.json();

    // 2. Poll for the result
    const taskFn = () => fetch(`https://api.runwayml.com/v1/tasks/${uuid}`, {
        headers: { 'Authorization': `Bearer ${RUNWAYML_API_KEY}` }
    }).then(res => res.json());

    const validationFn = (result: any) => result.status === 'SUCCEEDED' || result.status === 'FAILED';
    
    const finalResult = await poll(taskFn, validationFn, 3000, 20); // Poll every 3s, max 20 times (60s)

    if (finalResult.status === 'FAILED') {
        throw new Error(`RunwayML generation failed: ${finalResult.error_message}`);
    }

    // 3. Fetch the video and return as a blob
    const videoUrl = finalResult.output.url;
    const videoResponse = await fetch(videoUrl);
    return await videoResponse.blob();
};