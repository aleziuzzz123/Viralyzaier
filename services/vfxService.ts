// services/vfxService.ts
import { invokeEdgeFunction } from './supabaseService.ts';

/**
 * Applies AI background removal to a video or image.
 * @param mediaUrl The public URL of the media to process.
 * @returns The public URL of the processed media.
 */
export const removeBackground = async (mediaUrl: string): Promise<string> => {
    const { processedUrl } = await invokeEdgeFunction<{ processedUrl: string }>('ai-vfx-proxy', {
        type: 'removeBackground',
        mediaUrl,
    });
    return processedUrl;
};

/**
 * Applies AI retouching to a video or image.
 * @param mediaUrl The public URL of the media to process.
 * @returns The public URL of the processed media.
 */
export const applyRetouch = async (mediaUrl: string): Promise<string> => {
    const { processedUrl } = await invokeEdgeFunction<{ processedUrl: string }>('ai-vfx-proxy', {
        type: 'retouch',
        mediaUrl,
    });
    return processedUrl;
};


/**
 * Applies AI audio enhancement to an audio clip.
 * @param clipUrl The public URL of the audio clip.
 * @returns The public URL of the processed audio.
 */
export const applyAudioEnhance = async (clipUrl: string): Promise<string> => {
    const { processedUrl } = await invokeEdgeFunction<{ processedUrl: string }>('ai-audio-proxy', {
        type: 'enhance',
        clipUrl,
    });
    return processedUrl;
};