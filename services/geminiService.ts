import type { Script, Trend, EnhancedTopic, VideoDeconstruction, ViralScoreBreakdown, OptimizationStep } from '../types.ts';

export const QUOTA_ERROR_MESSAGE = "API quota exceeded for the 'gemini-2.5-flash' model. Your Google Cloud project has paid limits, but they might not be applied to this specific model. Please go to the Quotas page in your Google Cloud Console, filter for the 'generativelanguage.googleapis.com' service, and request a quota increase for the 'gemini-2.5-flash' model.";

// Helper function to call our Vercel function
async function callApi(action: string, payload: any) {
    const response = await fetch(`/api/gemini-proxy`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, payload }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'An unknown API error occurred after a non-OK response.' }));
        throw new Error(errorData.message || 'An unknown API error occurred');
    }

    return response.json();
}

export const getOptimizationTrace = (task: { mode: 'generate', data: { topic: string, tone: string, lengthInSeconds: number } } | { mode: 'optimize', data: { title: string, hook: string, script: string } }): Promise<{ steps: OptimizationStep[] }> => {
    return callApi('getOptimizationTrace', { task });
};

export const fetchTrendingTopics = (niche?: string): Promise<{ trends: Trend[], sources: { uri: string; title: string }[] }> => {
    return callApi('fetchTrendingTopics', { niche });
};

export const analyzeScriptVirality = (script: Pick<Script, 'title' | 'hook' | 'script'>): Promise<ViralScoreBreakdown> => {
    return callApi('analyzeScriptVirality', { script });
};

export const enhanceTopic = (topic: string): Promise<EnhancedTopic[]> => {
    return callApi('enhanceTopic', { topic });
};

export const generateVisualsForScript = (script: Pick<Script, 'title' | 'hook' | 'script'>, artStyle: string): Promise<string[]> => {
    return callApi('generateVisualsForScript', { script, artStyle });
};

export const deconstructVideo = (videoUrl: string): Promise<{ deconstruction: VideoDeconstruction, sources: { uri: string; title: string }[] }> => {
    return callApi('deconstructVideo', { videoUrl });
};

export const remixScript = (baseScript: Script, newTopic: string): Promise<Script> => {
    return callApi('remixScript', { baseScript, newTopic });
};

export const sendClientInvite = (email: string): Promise<any> => {
    return callApi('sendClientInvite', { email });
};