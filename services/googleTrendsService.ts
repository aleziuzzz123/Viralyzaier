import { Type } from "@google/genai";
import { TrendData } from '../types';
import { invokeEdgeFunction } from './supabaseService';

const parseGeminiJson = <T>(res: { text: string }, fallback: T | null = null): T => {
    try {
        const text = res.text.trim().replace(/^```json/, '').replace(/```$/, '').trim();
        return JSON.parse(text) as T;
    } catch (e) {
        console.error("Failed to parse Gemini JSON response:", res.text, e);
        if (fallback !== null) return fallback as T;
        throw new Error("AI returned invalid data format.");
    }
};

const trendDataSchema = {
    type: Type.OBJECT,
    properties: {
        interestOverTime: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    time: { type: Type.STRING, description: "A date label for the x-axis, e.g., 'Day 1', 'Day 2'" },
                    value: { type: Type.INTEGER, description: "Interest value from 0-100" }
                },
                required: ["time", "value"]
            }
        },
        breakoutQueries: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    query: { type: Type.STRING },
                    value: { type: Type.STRING, description: "e.g., '+2,500%' or 'Breakout'" }
                },
                required: ["query", "value"]
            }
        },
        topQueries: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    query: { type: Type.STRING },
                    value: { type: Type.STRING, description: "Relative score from '100' to '0'" }
                },
                required: ["query", "value"]
            }
        }
    },
    required: ["interestOverTime", "breakoutQueries", "topQueries"]
};

export const fetchTrends = async (keyword: string): Promise<TrendData> => {
    const prompt = `You are a Google Trends data simulator. Based on your training data, simulate the Google Trends for the keyword "${keyword}" over the last 30 days. Provide a plausible-looking interest graph (30 data points), top related queries (5), and breakout queries (5) that seem realistic for this topic.`;

    const response = await invokeEdgeFunction('gemini-proxy', {
        type: 'generateContent',
        params: {
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: trendDataSchema
            }
        }
    });

    return parseGeminiJson(response);
};