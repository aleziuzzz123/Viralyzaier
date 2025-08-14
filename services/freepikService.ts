import { AiVideoModel } from '../types';
import { invokeEdgeFunction } from './supabaseService';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

/**
 * Starts a video generation task with a Freepik-family model.
 * @param model - The AI model to use (e.g., 'kling', 'minimax').
 * @param payload - The specific parameters for the model's API.
 * @returns The task ID for polling.
 */
export const startFreepikVideoGeneration = async (model: AiVideoModel, payload: any): Promise<string> => {
    const { taskId } = await invokeEdgeFunction<{ taskId: string }>('freepik-proxy', {
        action: 'start',
        model,
        payload,
    });
    if (!taskId) {
        throw new Error(`Failed to start video generation with ${model}: Did not receive a task ID.`);
    }
    return taskId;
};

/**
 * Polls the status of a Freepik video generation task until it's complete.
 * @param model - The AI model being used.
 * @param taskId - The ID of the task to poll.
 * @returns The URL of the generated video.
 */
export const pollFreepikTask = async (model: AiVideoModel, taskId: string): Promise<string> => {
    const maxAttempts = 30; // Poll for up to 2.5 minutes
    const pollInterval = 5000; // 5 seconds

    for (let i = 0; i < maxAttempts; i++) {
        await delay(pollInterval);

        const statusResult = await invokeEdgeFunction<{ status: string; videoUrl?: string; error?: string }>('freepik-proxy', {
            action: 'poll',
            model,
            taskId,
        });

        if (statusResult.status === 'SUCCEEDED' || statusResult.status === 'completed') {
            if (!statusResult.videoUrl) {
                throw new Error(`Video generation with ${model} succeeded but no URL was provided.`);
            }
            return statusResult.videoUrl;
        }

        if (statusResult.status === 'FAILED' || statusResult.status === 'failed') {
            throw new Error(`Freepik generation with ${model} failed: ${statusResult.error || 'Unknown error'}`);
        }
        // If status is 'PENDING', 'RUNNING', etc., the loop will continue.
    }

    throw new Error(`Video generation with ${model} timed out. The task is still running, but the application has stopped waiting.`);
};