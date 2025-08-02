import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { TrendData } from '../types';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const AI_NOT_CONFIGURED_ERROR = "Gemini API Key is not configured. Please set the VITE_GEMINI_API_KEY environment variable.";

const checkAi = () => {
    if (!ai) {
        throw new Error(AI_NOT_CONFIGURED_ERROR);
    }
}

const parseGeminiJson = <T>(res: GenerateContentResponse, fallback: T | null = null): T => {
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
                    time: { type: Type.STRING, description: "Month and day, e.g., 'Jan 01'" },
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


export const fetchTrends = async (query: string): Promise<TrendData> => {
    checkAi();
    const prompt = `You are a Google Trends analyst. For the search query "${query}", provide an analysis. Your response must be a JSON object with three keys: 'interestOverTime', 'breakoutQueries', and 'topQueries'.
- 'interestOverTime': An array of 30 objects, each with a 'time' (Month Day, e.g. "Jan 01") and 'value' (0-100), simulating the trend over the last 30 days based on current search interest.
- 'breakoutQueries': An array of 5 related queries that are "breakout" or have seen a huge increase in search interest. Each object has 'query' (string) and 'value' (string, e.g., '+2,500%' or 'Breakout').
- 'topQueries': An array of 5 top related queries. Each object has 'query' (string) and 'value' (string, relative score '100' to '0').
`;

    const response = await ai!.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: trendDataSchema,
        },
    });

    const trendData = parseGeminiJson<TrendData>(response);
    if (!trendData) throw new Error("Failed to parse trend data.");
    
    // Grounding metadata is not available when not using the googleSearch tool.
    // The model will use its general knowledge to simulate the trends.
    
    return trendData;
};