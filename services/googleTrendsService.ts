/*
This file has been commented out to resolve build errors as requested.
The types it depends on (TrendData, InterestPoint, RelatedQuery) have been removed from types.ts.
*/
/*
import { Type } from "@google/genai";
import { TrendData } from '../types.js';
import { invokeEdgeFunction } from './supabaseService.js';

const parseGeminiJson = <T>(res: { text: string | null | undefined }, fallback: T | null = null): T => {
    try {
        const rawText = res.text || '';
        if (!rawText.trim()) {
            if (fallback) return fallback;
            throw new Error("AI returned an empty response.");
        }
        // This is a more robust way to find JSON in a string that might have other text.
        const jsonMatch = rawText.match(/```json\n([\s\S]*?)\n```|({[\s\S]*})|(\[[\s\S]*\])/);
        if (jsonMatch) {
            const jsonString = jsonMatch[1] || jsonMatch[2] || jsonMatch[3];
            if (jsonString) {
                return JSON.parse(jsonString) as T;
            }
        }
        // Fallback for cases where the string is just the JSON object without markers
        return JSON.parse(rawText) as T;
    } catch (e) {
        console.error("Failed to parse Gemini JSON response:", res.text, e);
        if (fallback) return fallback;
        throw new Error("AI returned invalid data format or no JSON was found.");
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

    const response = await invokeEdgeFunction<{ text: string }>('gemini-proxy', {
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
*/
