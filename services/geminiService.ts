





import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Analysis, Blueprint, CompetitorAnalysisResult, Platform, Script, TitleAnalysis, ContentGapSuggestion, VideoPerformance, PerformanceReview, SceneAssets, SoundDesign, LaunchPlan, ChannelAudit, Opportunity } from '../types';
import * as supabase from './supabaseService';

const apiKey = process.env.VITE_GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const AI_NOT_CONFIGURED_ERROR = "Gemini API Key is not configured. Please set the NEXT_PUBLIC_GEMINI_API_KEY environment variable.";

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

const mockAudio = () => `data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=`; // empty wav

export const generateVideoBlueprint = async (topicOrUrl: string, platform: Platform): Promise<Omit<Blueprint, 'moodboard'> & { moodboard: string[] }> => {
    checkAi();
    const textPrompt = `You are a world-class viral video strategist for ${platform}. Your task is to generate a complete video blueprint based on the topic or URL: "${topicOrUrl}".

Your analysis must be sharp, insightful, and geared towards maximum audience engagement and shareability.

Your output MUST be a JSON object with the following structure:
1.  "strategicSummary": A concise, hard-hitting summary explaining WHY this video concept will perform well. Reference audience psychology, platform trends, or a unique angle.
2.  "suggestedTitles": An array of 5 S-Tier, high-CTR titles. They must be emotionally resonant and curiosity-driven.
3.  "script": A full script object, including 5 distinct, psychologically-driven hook options, a scene-by-scene breakdown, and a clear call-to-action.
4.  "moodboardDescription": An array of 3 descriptive prompts for an AI image generator to create a visual moodboard. Each description should evoke a specific, cinematic visual style (e.g., "moody, neon-lit city street", "bright, airy kitchen with natural light", "gritty, high-energy gym atmosphere").`;
    
    const response = await ai!.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: textPrompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    strategicSummary: { type: Type.STRING, description: "The core strategy behind why this video will be successful." },
                    suggestedTitles: { type: Type.ARRAY, items: { type: Type.STRING }, description: "5 high-CTR title options." },
                    script: {
                        type: Type.OBJECT,
                        properties: {
                            hooks: { type: Type.ARRAY, items: { type: Type.STRING }, description: "5 viral hook options based on psychological triggers." },
                            scenes: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: { timecode: { type: Type.STRING }, visual: { type: Type.STRING }, voiceover: { type: Type.STRING }, onScreenText: { type: Type.STRING } },
                                    required: ["timecode", "visual", "voiceover", "onScreenText"]
                                }
                            },
                            cta: { type: Type.STRING, description: "A clear and compelling call to action." }
                        },
                        required: ["hooks", "scenes", "cta"]
                    },
                    moodboardDescription: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 descriptive prompts for generating moodboard images." }
                },
                required: ["strategicSummary", "suggestedTitles", "script", "moodboardDescription"]
            }
        }
    });

    const blueprintContent = parseGeminiJson<{strategicSummary: string, suggestedTitles: string[], script: Script, moodboardDescription: string[]}>(response);

    const imagePromises = blueprintContent.moodboardDescription.map((prompt: string) => 
        ai!.models.generateImages({
            model: 'imagen-3.0-generate-002',
            prompt: `A cinematic, visually stunning image for a YouTube video moodboard: ${prompt}`,
            config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '16:9' }
        })
    );
    const imageResults = await Promise.all(imagePromises);
    const moodboardBase64 = imageResults.map(res => `data:image/jpeg;base64,${res.generatedImages[0].image.imageBytes}`);
    
    return { ...blueprintContent, moodboard: moodboardBase64, platform };
};

export const analyzeVideo = async (frames: string[], title: string, platform: Platform): Promise<Analysis> => {
    checkAi();
    const textPrompt = `You are a viral video expert. A user has uploaded a video titled "${title}" for ${platform}. I am providing you with three keyframes from the video: the hook (first frame), the mid-point (second frame), and a late-stage frame (third frame).

Analyze the visual content of these frames along with the title to provide a comprehensive virality analysis.

Your output must be a JSON object with:
- scores: An object containing 'overall', 'hook', 'pacing', 'audio', and 'cta' scores, ALL from 1 to 100. The hook score should be heavily based on the first frame. Pacing is inferred from the visual change between frames. Audio and CTA are inferred from the context of the title and visuals. 'overall' should be a weighted summary of the other scores.
- summary: A concise summary of your findings.
- goldenNugget: The single most important tip based on the visuals.
- strengths: 3 things the video does well visually.
- improvements: 3 actionable visual improvements with clear reasons explaining WHY they matter.`;

    const imageParts = frames.map(frameDataUrl => {
        const [header, base64Data] = frameDataUrl.split(',');
        const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
        return {
            inlineData: {
                data: base64Data,
                mimeType,
            }
        };
    });

    const response = await ai!.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [...imageParts, { text: textPrompt }] },
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    scores: { 
                        type: Type.OBJECT, 
                        properties: { 
                            overall: { type: Type.INTEGER, description: "Score from 1-100" }, 
                            hook: { type: Type.INTEGER, description: "Score from 1-100" }, 
                            pacing: { type: Type.INTEGER, description: "Score from 1-100" }, 
                            audio: { type: Type.INTEGER, description: "Score from 1-100" }, 
                            cta: { type: Type.INTEGER, description: "Score from 1-100" } 
                        },
                        required: ["overall", "hook", "pacing", "audio", "cta"]
                    },
                    summary: { type: Type.STRING }, 
                    goldenNugget: { type: Type.STRING },
                    strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                    improvements: { 
                        type: Type.ARRAY, 
                        items: { 
                            type: Type.OBJECT, 
                            properties: { 
                                suggestion: { type: Type.STRING }, 
                                reason: { type: Type.STRING } 
                            }, 
                            required: ["suggestion", "reason"] 
                        }
                    }
                },
                required: ["scores", "summary", "goldenNugget", "strengths", "improvements"]
            }
        }
    });
    
    const analysis = parseGeminiJson<Analysis>(response);
    return analysis;
};

export const generateScript = async (topic: string, title: string, platform: Platform): Promise<Script> => {
    checkAi();
    const prompt = `You are an expert scriptwriter for viral videos on ${platform}. Your task is to generate a script for a video about "${topic}" with the title "${title}". The script must be engineered for maximum retention and engagement, tailored specifically for the ${platform} format.
- For TikTok/Instagram, this means a very fast pace, short scenes (1-3s), and a total length under 60 seconds.
- For YouTube, this means a slightly longer format, more detailed explanations, and a typical length of 3-8 minutes.

Your output must be a JSON object with this exact structure:
1.  "hooks": An array of 5 unique, killer hook options. Each hook should use a different psychological trigger (e.g., a controversial opinion, a question, a surprising result shown upfront, a pattern interrupt, a relatable problem).
2.  "scenes": An array of scene objects. Each scene needs a "timecode" (e.g., "0-3s"), a "visual" description (what the viewer sees), a "voiceover" (what is said), and "onScreenText" (any text overlays). The script should follow a clear narrative arc appropriate for the platform.
3.  "cta": A strong, clear Call to Action that encourages platform-specific engagement (e.g., 'like and follow' for TikTok, 'comment below' for YouTube).`;

    const response = await ai!.models.generateContent({
        model: 'gemini-2.5-flash', contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    hooks: { type: Type.ARRAY, items: { type: Type.STRING }, required: ["hooks"] },
                    scenes: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { timecode: { type: Type.STRING }, visual: { type: Type.STRING }, voiceover: { type: Type.STRING }, onScreenText: { type: Type.STRING } }, required: ["timecode", "visual", "voiceover", "onScreenText"] }, required: ["scenes"] },
                    cta: { type: Type.STRING, required: ["cta"] }
                },
                required: ["hooks", "scenes", "cta"]
            }
        }
    });
    return parseGeminiJson(response);
};

export const analyzeTitles = async (topic: string, titles: string[], platform: Platform): Promise<{ analysis: TitleAnalysis[], suggestions: string[] }> => {
    checkAi();
    const prompt = `You are a YouTube title expert, a master of CTR. Your analysis is for the topic "${topic}" on ${platform}. The provided titles are: ${JSON.stringify(titles)}.

Analyze the provided titles based on Curiosity, Emotional Impact, Clarity, and CTR potential.

Your output MUST be a JSON object with:
1. "analysis": An array of analysis objects, one for each title. Each object must have a "score" (1-100), an array of string "pros", and an array of string "cons".
2. "suggestions": An array of 5 new, S-tier title suggestions that are significantly better and follow proven viral formulas.`;

    const response = await ai!.models.generateContent({
        model: 'gemini-2.5-flash', contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    analysis: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, pros: { type: Type.ARRAY, items: { type: Type.STRING } }, cons: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["score", "pros", "cons"] } },
                    suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["analysis", "suggestions"]
            }
        }
    });
    return parseGeminiJson(response);
};

export const analyzeCompetitorVideo = async (title: string, transcript: string): Promise<CompetitorAnalysisResult> => {
    checkAi();
    const prompt = `You are a master strategist at reverse-engineering viral videos. I have a transcript for a successful video titled "${title}".

Your task is to deconstruct its success. Do not give generic advice.

Your output MUST be a JSON object with:
1.  "viralityDeconstruction": A concise paragraph explaining the core psychological reason this video worked.
2.  "stealableStructure": An array of objects representing a step-by-step formula that someone could apply to their own video. Each object needs a "step" (e.g., "1. State a bold, relatable problem") and a "description".
3.  "extractedKeywords": An array of the most potent keywords and phrases from the transcript.
4.  "suggestedTitles": An array of 3 title ideas for a new video inspired by this one.`;

    const response = await ai!.models.generateContent({
        model: 'gemini-2.5-flash', contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    viralityDeconstruction: { type: Type.STRING },
                    stealableStructure: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { step: { type: Type.STRING }, description: { type: Type.STRING } }, required: ["step", "description"] } },
                    extractedKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                    suggestedTitles: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["viralityDeconstruction", "stealableStructure", "extractedKeywords", "suggestedTitles"]
            }
        }
    });
    return parseGeminiJson(response);
};

export const performChannelAudit = async (videos: {title: string}[]): Promise<ChannelAudit> => {
    checkAi();
    const videoTitles = videos.map(v => v.title).join(', ');
    const prompt = `You are a world-class YouTube strategist. Analyze this list of video titles from a single channel: ${videoTitles}.

Your task is to perform a deep-dive audit and create a growth plan.

Your output MUST be a JSON object with:
1. "contentPillars": An array of 3-4 core themes or topics the channel excels at.
2. "audiencePersona": A detailed description of the target viewer (demographics, psychographics, needs, pain points).
3. "viralFormula": A sentence that encapsulates the channel's repeatable formula for success (e.g., "Combining [Topic A] with a surprising [Emotional Element] to solve [Audience Problem]").
4. "opportunities": An array of 3 distinct, actionable video opportunities. Each object must have an "idea", "reason" (why it will work for this channel), a "suggestedTitle", and a "type" ('Quick Win', 'Growth Bet', 'Experimental').`;

    const response = await ai!.models.generateContent({
        model: 'gemini-2.5-flash', contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    contentPillars: { type: Type.ARRAY, items: { type: Type.STRING } },
                    audiencePersona: { type: Type.STRING },
                    viralFormula: { type: Type.STRING },
                    opportunities: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { idea: { type: Type.STRING }, reason: { type: Type.STRING }, suggestedTitle: { type: Type.STRING }, type: { type: Type.STRING, enum: ['Quick Win', 'Growth Bet', 'Experimental'] } }, required: ["idea", "reason", "suggestedTitle", "type"] } }
                },
                required: ["contentPillars", "audiencePersona", "viralFormula", "opportunities"]
            }
        }
    });
    return parseGeminiJson(response);
};

export const generateSceneAssets = async (visual: string, onScreenText: string, platform: Platform, userId: string, projectId: string, sceneIndex: number): Promise<SceneAssets> => {
    checkAi();
    const aspectRatio = platform === 'youtube' ? '16:9' : '9:16';
    
    const uploadAndGetUrl = async (base64Data: string, mime: 'image/jpeg' | 'image/png', path: string): Promise<string> => {
        const blob = await supabase.dataUrlToBlob(`data:${mime};base64,${base64Data}`);
        return supabase.uploadFile(blob, path);
    };

    const imagePrompts = [
        `Photorealistic B-roll footage for a ${platform} video: ${visual}`,
        `Cinematic alternate B-roll shot for a ${platform} video about: ${visual}`,
    ];
    const imagePromises = imagePrompts.map(prompt => 
        ai!.models.generateImages({ model: 'imagen-3.0-generate-002', prompt, config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio } })
    );
    const imageResults = await Promise.all(imagePromises);

    const imageUrls = await Promise.all(imageResults.map((res, i) => {
        const path = `${userId}/${projectId}/scene_${sceneIndex}_broll_${i}.jpg`;
        return uploadAndGetUrl(res.generatedImages[0].image.imageBytes, 'image/jpeg', path);
    }));

    let graphicUrls: string[] = [];
    if (onScreenText) {
        const graphicResult = await ai!.models.generateImages({
            model: 'imagen-3.0-generate-002',
            prompt: `A clean, professional on-screen graphic for a ${platform} video with the text: "${onScreenText}". Minimalist style, high legibility.`,
            config: { numberOfImages: 1, outputMimeType: 'image/png', aspectRatio }
        });
        const path = `${userId}/${projectId}/scene_${sceneIndex}_graphic.png`;
        const url = await uploadAndGetUrl(graphicResult.generatedImages[0].image.imageBytes, 'image/png', path);
        graphicUrls.push(url);
    }

    return { images: imageUrls, graphics: graphicUrls, audio: mockAudio() };
};

export const generateSoundDesign = async(script: Script, vibe: string, topic: string): Promise<SoundDesign> => {
    checkAi();
    const prompt = `You are a sound designer for a YouTube video about "${topic}". The desired vibe is "${vibe}". Given the script, suggest background music and specific sound effects.

Your output MUST be a JSON object with:
1.  "music": A description of the ideal background music track (e.g., "Uplifting, royalty-free corporate pop with a driving beat").
2.  "sfx": An array of sound effect objects. Each object needs a "timecode" from the script and a "description" of the sound effect (e.g., "whoosh", "camera shutter", "gentle keyboard typing").`;

    const response = await ai!.models.generateContent({
        model: 'gemini-2.5-flash', contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: { 
                type: Type.OBJECT, 
                properties: { 
                    music: { type: Type.STRING }, 
                    sfx: { 
                        type: Type.ARRAY, 
                        items: { 
                            type: Type.OBJECT, 
                            properties: { 
                                timecode: { type: Type.STRING }, 
                                description: { type: Type.STRING } 
                            }, 
                            required: ["timecode", "description"] 
                        } 
                    } 
                },
                required: ["music", "sfx"]
            }
        }
    });
    return parseGeminiJson(response);
};

export const generateSeo = async (title: string, script: Script, platform: Platform): Promise<{ description: string, tags: string[] }> => {
    checkAi();
    const scriptSummary = script.scenes.map(s => s.voiceover).join(' ');
    const prompt = `Generate an SEO-optimized ${platform} description and a list of high-value tags for a video titled "${title}". The script summary is: "${scriptSummary}".

Your output MUST be a JSON object with:
1.  "description": A well-written, keyword-rich description.
2.  "tags": An array of relevant, high-traffic tags.`;

    const response = await ai!.models.generateContent({
        model: 'gemini-2.5-flash', contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: { 
                type: Type.OBJECT, 
                properties: { 
                    description: { type: Type.STRING }, 
                    tags: { type: Type.ARRAY, items: { type: Type.STRING } } 
                },
                required: ["description", "tags"]
            }
        }
    });
    return parseGeminiJson(response);
};

export const analyzeAndGenerateThumbnails = async (title: string, platform: Platform, userId: string, projectId: string): Promise<string[]> => {
    checkAi();
    const prompts = [
        `Ultra High-CTR YouTube thumbnail for a video titled "${title}". Style: High-contrast, emotional human face with a shocked or surprised expression. Big, bold text.`,
        `Click-worthy YouTube thumbnail for a video titled "${title}". Style: Bright, colorful background with a mysterious, intriguing object related to the topic. Minimal text.`,
        `Viral-style YouTube thumbnail for a video titled "${title}". Style: "Before and After" comparison showing a dramatic transformation. Clear arrows and outlines.`
    ];

    const imagePromises = prompts.map(p => 
        ai!.models.generateImages({ model: 'imagen-3.0-generate-002', prompt: p, config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '16:9' } })
    );

    const results = await Promise.all(imagePromises);

    const uploadPromises = results.map((res, i) => {
        const path = `${userId}/${projectId}/thumbnail_${i}.jpg`;
        return supabase.dataUrlToBlob(`data:image/jpeg;base64,${res.generatedImages[0].image.imageBytes}`)
            .then(blob => supabase.uploadFile(blob, path));
    });

    return Promise.all(uploadPromises);
};

export const generatePromotionPlan = async (title: string, platform: Platform): Promise<{ platform: string, action: string }[]> => {
    checkAi();
    const prompt = `Create a simple, 3-step cross-platform promotion plan for a new ${platform} video titled "${title}".

Your output MUST be a JSON array of objects, where each object has:
1.  "platform": The social media platform for promotion (e.g., "Twitter", "Instagram Stories", "Reddit").
2.  "action": The specific promotional message or action to take on that platform.`;

    const response = await ai!.models.generateContent({
        model: 'gemini-2.5-flash', contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: { 
                type: Type.ARRAY, 
                items: { 
                    type: Type.OBJECT, 
                    properties: { 
                        platform: { type: Type.STRING }, 
                        action: { type: Type.STRING } 
                    },
                    required: ["platform", "action"]
                }
            }
        }
    });
    return parseGeminiJson(response);
};

export const getSchedulingSuggestion = async(topic: string): Promise<string> => {
    checkAi();
    const prompt = `For a video topic like "${topic}", what is the best day and time to post for maximum engagement? Provide a concise recommendation and a brief reason. The output should be a single string, with the recommended time in bold (e.g., The best time to post is **Saturday at 11 AM EST** because your target audience is most active then.)`;
    const response = await ai!.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text;
}

// Keep mocks for non-Gemini services
export const reviewVideoPerformance = async (performance: VideoPerformance): Promise<PerformanceReview> => {
    checkAi();
    const prompt = `An AI content strategist analyzing this video performance data: ${JSON.stringify(performance)}. Give a summary, 3 things that worked, and 3 things to improve. Output JSON.`;
    const response = await ai!.models.generateContent({
        model: 'gemini-2.5-flash', contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: { 
                type: Type.OBJECT, 
                properties: { 
                    summary: { type: Type.STRING }, 
                    whatWorked: { type: Type.ARRAY, items: { type: Type.STRING } }, 
                    whatToImprove: { type: Type.ARRAY, items: { type: Type.STRING } } 
                },
                required: ["summary", "whatWorked", "whatToImprove"]
            }
        }
    });
    return parseGeminiJson(response);
};

export const suggestContentGaps = async (successfulTopics: string[], niche: string): Promise<ContentGapSuggestion[]> => {
    checkAi();
    const prompt = `I have a successful channel about "${niche}". My hit videos are on these topics: ${successfulTopics.join(', ')}. Suggest 3 new, related content gap ideas that will likely perform well. Output JSON with idea, reason, and potentialTitles.`;
    const response = await ai!.models.generateContent({
        model: 'gemini-2.5-flash', contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: { 
                type: Type.ARRAY, 
                items: { 
                    type: Type.OBJECT, 
                    properties: { 
                        idea: { type: Type.STRING }, 
                        reason: { type: Type.STRING }, 
                        potentialTitles: { type: Type.ARRAY, items: { type: Type.STRING } } 
                    },
                    required: ["idea", "reason", "potentialTitles"]
                }
            }
        }
    });
    return parseGeminiJson(response);
};
