import { Type } from "@google/genai";
import { Analysis, Blueprint, CompetitorAnalysisResult, Platform, Script, TitleAnalysis, ContentGapSuggestion, VideoPerformance, PerformanceReview, SceneAssets, SoundDesign, LaunchPlan, ChannelAudit, Opportunity, ScriptOptimization } from '../types';
import * as supabase from './supabaseService';

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

export const generateVideoBlueprint = async (topicOrUrl: string, platform: Platform): Promise<Blueprint> => {
    const textPrompt = `You are a world-class viral video strategist for ${platform}. Your task is to generate a complete video blueprint based on the topic or URL: "${topicOrUrl}".

Your analysis must be sharp, insightful, and geared towards maximum audience engagement and shareability.

Your output MUST be a JSON object with the following structure:
1.  "strategicSummary": A concise, hard-hitting summary explaining WHY this video concept will perform well. Reference audience psychology, platform trends, or a unique angle.
2.  "suggestedTitles": An array of 5 S-Tier, high-CTR titles. They must be emotionally resonant and curiosity-driven.
3.  "script": A full script object, including 5 distinct, psychologically-driven hook options, a scene-by-scene breakdown, and a clear call-to-action.
4.  "moodboardDescription": An array of 3 descriptive prompts for an AI image generator to create a visual moodboard. Each description should evoke a specific, cinematic visual style (e.g., "moody, neon-lit city street", "bright, airy kitchen with natural light", "gritty, high-energy gym atmosphere").`;
    
    const systemInstruction = `You are a world-class viral video strategist and your response MUST be a valid JSON object that strictly adheres to the provided schema. Ensure all fields, especially arrays like 'scenes' and 'suggestedTitles', are populated with high-quality, relevant content and are never empty.`;

    const response = await supabase.invokeEdgeFunction('gemini-proxy', {
        type: 'generateContent',
        params: {
            model: 'gemini-2.5-flash',
            contents: textPrompt,
            config: {
                systemInstruction: systemInstruction,
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
        }
    });

    const blueprintContent = parseGeminiJson<{strategicSummary: string, suggestedTitles: string[], script: Script, moodboardDescription: string[]}>(response);

    const imagePromises = blueprintContent.moodboardDescription.map((prompt: string) => 
        supabase.invokeEdgeFunction('gemini-proxy', {
            type: 'generateImages',
            params: {
                model: 'imagen-3.0-generate-002',
                prompt: `A cinematic, visually stunning image for a YouTube video moodboard: ${prompt}`,
                config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '16:9' }
            }
        })
    );
    const imageResults = await Promise.all(imagePromises);
    const moodboardBase64 = imageResults.map(res => `data:image/jpeg;base64,${res.generatedImages[0].image.imageBytes}`);
    
    return { ...blueprintContent, moodboard: moodboardBase64, platform };
};

export const generateAutopilotBacklog = async (
    platform: Platform,
    contentPillars: string[],
    channelAudit: ChannelAudit
): Promise<Blueprint[]> => {
    const prompt = `You are an AI YouTube Channel Manager. Your goal is to proactively generate a content backlog for a creator.

**Creator's Strategic Data:**
- **Platform:** ${platform}
- **Core Content Pillars:** ${contentPillars.join(', ')}
- **Audience Persona:** ${channelAudit.audiencePersona}
- **Proven Viral Formula:** ${channelAudit.viralFormula}

**Task:**
Generate a content backlog of **3 diverse video blueprints**. Each blueprint must be a complete, high-quality plan that aligns with the creator's strategic data. The ideas should be fresh, engaging, and have a high potential for success.

**Output Format:**
Your response **MUST** be a JSON array containing exactly 3 blueprint objects. Each object must follow this structure:
{
  "strategicSummary": "A concise summary explaining why this specific video concept will work for this channel.",
  "suggestedTitles": ["An array of 3-5 S-Tier, high-CTR titles for this video."],
  "script": {
    "hooks": ["An array of 3 distinct, psychologically-driven hook options."],
    "scenes": [
      {
        "timecode": "e.g., '0-8s'",
        "visual": "A description of the visual elements.",
        "voiceover": "The voiceover script for this scene.",
        "onScreenText": "Any text overlays for this scene."
      }
    ],
    "cta": "A strong, clear call to action."
  },
  "moodboardDescription": ["An array of 3 descriptive prompts for an AI image generator to create a visual moodboard."]
}`;

    const response = await supabase.invokeEdgeFunction('gemini-proxy', {
        type: 'generateContent',
        params: {
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            strategicSummary: { type: Type.STRING },
                            suggestedTitles: { type: Type.ARRAY, items: { type: Type.STRING } },
                            script: {
                                type: Type.OBJECT,
                                properties: {
                                    hooks: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    scenes: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: { timecode: { type: Type.STRING }, visual: { type: Type.STRING }, voiceover: { type: Type.STRING }, onScreenText: { type: Type.STRING } },
                                            required: ["timecode", "visual", "voiceover", "onScreenText"]
                                        }
                                    },
                                    cta: { type: Type.STRING }
                                },
                                required: ["hooks", "scenes", "cta"]
                            },
                            moodboardDescription: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ["strategicSummary", "suggestedTitles", "script", "moodboardDescription"]
                    }
                }
            }
        }
    });

    const blueprintContents = parseGeminiJson<(Omit<Blueprint, 'moodboard' | 'platform'> & { moodboardDescription: string[] })[]>(response);

    const allMoodboardPrompts = blueprintContents.flatMap(b => b.moodboardDescription);
    const allImagePromises = allMoodboardPrompts.map(prompt =>
        supabase.invokeEdgeFunction('gemini-proxy', {
            type: 'generateImages',
            params: {
                model: 'imagen-3.0-generate-002',
                prompt: `A cinematic, visually stunning image for a YouTube video moodboard: ${prompt}`,
                config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '16:9' }
            }
        })
    );

    const allImageResults = await Promise.all(allImagePromises);
    const allMoodboardImages = allImageResults.map(res => `data:image/jpeg;base64,${res.generatedImages[0].image.imageBytes}`);

    let imageCounter = 0;
    const finalBlueprints = blueprintContents.map(b => {
        const moodboard = allMoodboardImages.slice(imageCounter, imageCounter + b.moodboardDescription.length);
        imageCounter += b.moodboardDescription.length;
        return { ...b, platform, moodboard };
    });

    return finalBlueprints;
};


export const generateOptimizedScript = async (
    platform: Platform,
    desiredLengthInSeconds: number,
    input: { topic: string } | { userScript: string }
): Promise<ScriptOptimization> => {
    const isGenerating = 'topic' in input;
    const promptContext = isGenerating
        ? `Generate a new script about "${input.topic}".`
        : `Analyze and improve this existing script: "${input.userScript.substring(0, 2000)}..."`;

    const prompt = `You are an expert scriptwriter and viral content analyst for ${platform}. Your task is to create a perfectly optimized script.
The desired script length is approximately ${desiredLengthInSeconds} seconds.
Context: ${promptContext}

Your output must be a single JSON object with the following structure.
- "initialScore": An integer from 0-100 representing the baseline virality score. If generating a new script, this should be 0. If improving a script, provide an honest assessment of the original.
- "finalScore": An integer from 90-100. This is the score of your improved script.
- "analysisLog": An array of 5-7 objects, where each object details one optimization step. Each object must have:
    - "step": A short, descriptive string of the action taken (e.g., "Rewriting hook for more impact", "Improving pacing in scene 2", "Strengthening the call to action").
    - "target": A string identifying the part of the script being changed ('hooks', 'cta', or 'scene-X' where X is the scene number, e.g., 'scene-2').
- "finalScript": The fully optimized script object, following the specified structure. It must include:
    - "hooks": An array of 3-5 distinct, psychologically-driven hook options.
    - "scenes": An array of scene objects, each with "timecode", "visual", "voiceover", and "onScreenText". The total duration should respect the desiredLengthInSeconds.
    - "cta": A strong, clear call to action.`;

    const response = await supabase.invokeEdgeFunction('gemini-proxy', {
        type: 'generateContent',
        params: {
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        initialScore: { type: Type.INTEGER },
                        finalScore: { type: Type.INTEGER },
                        analysisLog: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    step: { type: Type.STRING },
                                    target: { type: Type.STRING }
                                },
                                required: ["step", "target"]
                            }
                        },
                        finalScript: {
                            type: Type.OBJECT,
                            properties: {
                                hooks: { type: Type.ARRAY, items: { type: Type.STRING } },
                                scenes: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            timecode: { type: Type.STRING },
                                            visual: { type: Type.STRING },
                                            voiceover: { type: Type.STRING },
                                            onScreenText: { type: Type.STRING }
                                        },
                                        required: ["timecode", "visual", "voiceover", "onScreenText"]
                                    }
                                },
                                cta: { type: Type.STRING }
                            },
                            required: ["hooks", "scenes", "cta"]
                        }
                    },
                    required: ["initialScore", "finalScore", "analysisLog", "finalScript"]
                }
            }
        }
    });

    return parseGeminiJson<ScriptOptimization>(response);
};


export const analyzeVideo = async (frames: string[], title: string, platform: Platform): Promise<Analysis> => {
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
    
    const response = await supabase.invokeEdgeFunction('gemini-proxy', {
        type: 'generateContent',
        params: {
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
        }
    });
    
    return parseGeminiJson<Analysis>(response);
};

export const analyzeTitles = async (topic: string, titles: string[], platform: Platform): Promise<{ analysis: TitleAnalysis[], suggestions: string[] }> => {
    const prompt = `You are a YouTube title expert, a master of CTR. Your analysis is for the topic "${topic}" on ${platform}. The provided titles are: ${JSON.stringify(titles)}.

Analyze the provided titles based on Curiosity, Emotional Impact, Clarity, and CTR potential.

Your output MUST be a JSON object with:
1. "analysis": An array of analysis objects, one for each title. Each object must have a "score" (1-100), an array of string "pros", and an array of string "cons".
2. "suggestions": An array of 5 new, S-tier title suggestions that are significantly better and follow proven viral formulas.`;

    const response = await supabase.invokeEdgeFunction('gemini-proxy', {
        type: 'generateContent',
        params: {
            model: 'gemini-2.5-flash', 
            contents: prompt,
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
        }
    });

    return parseGeminiJson(response);
};

export const analyzeCompetitorVideo = async (url: string): Promise<CompetitorAnalysisResult> => {
    const prompt = `
**Primary Directive: YouTube Video Analysis**

**Role:** You are an expert YouTube strategist specializing in reverse-engineering viral content.

**Task:** Analyze the YouTube video located at the following URL: ${url}

**CRITICAL INSTRUCTIONS:**
1.  **Use the Google Search tool exclusively** to access and understand the content of the video at the provided URL.
2.  Your entire response **MUST BE 100% BASED ON THE SPECIFIC CONTENT of that single video**.
3.  **DO NOT use general knowledge** or provide generic advice. Your analysis must be directly tied to the video's title, spoken content, visual themes, and description.
4.  If you cannot access the video's content, your response should be an error object.

**Output Format:** Based *only* on the video's content, generate a valid JSON object with the following structure:
{
  "videoTitle": "The exact, full title of the video.",
  "viralityDeconstruction": "A concise paragraph explaining the core psychological hooks and strategic elements that make THIS specific video successful. Be specific.",
  "stealableStructure": [
    {
      "step": "A short, actionable title for a step in the video's structure (e.g., '1. The Problem Hook').",
      "description": "A description of what happens in this structural part of the video and why it's effective."
    }
  ],
  "extractedKeywords": [
    "An array of the most potent and relevant keywords, topics, and phrases mentioned or shown in the video."
  ],
  "suggestedTitles": [
    "An array of 3 new, compelling title ideas for a different video that uses a similar successful formula."
  ]
}`;

    const response = await supabase.invokeEdgeFunction('gemini-proxy', {
        type: 'generateContent',
        params: {
            model: 'gemini-2.5-flash', 
            contents: prompt,
            config: {
                tools: [{googleSearch: {}}],
            }
        }
    });
    return parseGeminiJson(response);
};

export const performChannelAudit = async (videos: {title: string; views: number; likes: number; comments: number}[]): Promise<ChannelAudit> => {
    const videoDataSummary = videos.map(v => `Title: "${v.title}", Views: ${v.views}, Likes: ${v.likes}`).join('\n');

    const prompt = `
**Primary Directive: YouTube Channel Audit**

**Role:** You are an expert YouTube channel strategist. I am providing you with a list of a channel's recent videos and their performance metrics.

**Video Data:**
${videoDataSummary}

**Task:** Analyze this data to identify patterns of success. Based *only* on this data, perform a comprehensive channel audit. Your analysis must be sharp and actionable.

**Your final response MUST be a valid JSON object.** Do not include any other text or markdown formatting. The JSON structure must be:
{
    "contentPillars": ["An array of 3-5 distinct content categories or themes the channel focuses on based on the video titles."],
    "audiencePersona": "A detailed paragraph describing the target viewer, their interests, and pain points, as inferred from the video topics and performance.",
    "viralFormula": "A concise, actionable formula that breaks down the recurring elements in their most successful videos (e.g., 'Fast-paced editing + Controversial opinion hook + Relatable problem-solving'). Infer this from the titles of high-performing videos.",
    "opportunities": [
        {
            "idea": "A specific, new video idea that combines successful themes.",
            "reason": "Why this idea will resonate with their audience and align with their successful formula.",
            "suggestedTitle": "A clickable, optimized title for the video.",
            "type": "Categorize as 'Quick Win', 'Growth Bet', or 'Experimental'."
        }
    ]
}`;

    const response = await supabase.invokeEdgeFunction('gemini-proxy', {
        type: 'generateContent',
        params: {
            model: 'gemini-2.5-flash', 
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        contentPillars: { type: Type.ARRAY, items: { type: Type.STRING } },
                        audiencePersona: { type: Type.STRING },
                        viralFormula: { type: Type.STRING },
                        opportunities: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    idea: { type: Type.STRING },
                                    reason: { type: Type.STRING },
                                    suggestedTitle: { type: Type.STRING },
                                    type: { type: Type.STRING, enum: ['Quick Win', 'Growth Bet', 'Experimental']}
                                },
                                required: ["idea", "reason", "suggestedTitle", "type"]
                            }
                        }
                    },
                    required: ["contentPillars", "audiencePersona", "viralFormula", "opportunities"]
                }
            }
        }
    });

    return parseGeminiJson(response);
};

export const generateSoundDesign = async (script: Script, vibe: string, topic: string): Promise<SoundDesign> => {
    const prompt = `You are an AI sound designer for viral videos. The video is about "${topic}" and needs a "${vibe}" vibe. Here is the script:
${JSON.stringify(script.scenes.map(s => ({ timecode: s.timecode, voiceover: s.voiceover })), null, 2)}

Your task is to suggest background music and specific sound effects (SFX).

Your output MUST be a JSON object with this structure:
1. "music": A detailed description of the suggested background music track. Describe its genre, tempo, mood, and instrumentation (e.g., "Uplifting, driving synth-pop with a strong beat and optimistic synth melodies.").
2. "sfx": An array of SFX objects. Each object needs a "timecode" matching the script and a "description" of the sound effect (e.g., "whoosh", "camera shutter", "gentle notification ping"). Only include SFX for key moments.`;

    const response = await supabase.invokeEdgeFunction('gemini-proxy', {
        type: 'generateContent',
        params: {
            model: 'gemini-2.5-flash',
            contents: prompt,
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
        }
    });

    return parseGeminiJson(response);
};

export const generateSeo = async (title: string, script: Script, platform: Platform): Promise<LaunchPlan['seo']> => {
    const scriptSummary = script.scenes.map(s => s.voiceover).join(' ');
    const prompt = `You are a ${platform} SEO expert. The video is titled "${title}" and the script summary is: "${scriptSummary.substring(0, 500)}...".

Generate an optimized description and relevant tags.

Your output MUST be a JSON object with:
1. "description": A paragraph that is keyword-rich, engaging, and includes a call to action.
2. "tags": An array of 15-20 highly relevant tags, including a mix of broad and specific keywords.`;

    const response = await supabase.invokeEdgeFunction('gemini-proxy', {
        type: 'generateContent',
        params: {
            model: 'gemini-2.5-flash', 
            contents: prompt,
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
        }
    });
    return parseGeminiJson(response);
};

export const analyzeAndGenerateThumbnails = async (title: string, platform: Platform, userId: string, projectId: string): Promise<string[]> => {
    const aspectRatio = platform === 'youtube' ? '16:9' : '9:16';
    
    const brainstormPrompt = `You are a viral marketing expert specializing in YouTube thumbnails. The video title is "${title}". Brainstorm 3 distinct, high-CTR thumbnail concepts. For each concept, provide a detailed prompt for an AI image generator. The prompts should describe visual elements, colors, text, and emotion designed to maximize clicks. Focus on concepts that create curiosity and have a strong focal point.
    
    Respond with a JSON object with a single key "prompts" which is an array of 3 strings.`;
    
    const brainstormResponse = await supabase.invokeEdgeFunction('gemini-proxy', {
        type: 'generateContent',
        params: {
            model: 'gemini-2.5-flash',
            contents: brainstormPrompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        prompts: { type: Type.ARRAY, items: { type: Type.STRING }}
                    },
                    required: ["prompts"]
                }
            }
        }
    });
    
    const { prompts } = parseGeminiJson<{ prompts: string[] }>(brainstormResponse);

    const imagePromises = prompts.slice(0, 2).map(prompt =>
        supabase.invokeEdgeFunction('gemini-proxy', {
            type: 'generateImages',
            params: {
                model: 'imagen-3.0-generate-002',
                prompt: `YouTube thumbnail for a video titled "${title}". Style: vibrant, high-contrast, clear focal point. Content: ${prompt}`,
                config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio }
            }
        })
    );

    const imageResults = await Promise.all(imagePromises);
    return imageResults.map(res => `data:image/jpeg;base64,${res.generatedImages[0].image.imageBytes}`);
};

export const generatePromotionPlan = async (title: string, platform: Platform): Promise<LaunchPlan['promotionPlan']> => {
    const prompt = `You are a social media growth hacker. A new video titled "${title}" is about to be published on ${platform}. Create a cross-platform promotion plan.

Your output must be a JSON object: an array of objects, where each object has "platform" (e.g., "Twitter/X", "Instagram Stories", "Reddit", "Facebook Group") and "action" (a specific, actionable post or content idea for that platform).`;
    const response = await supabase.invokeEdgeFunction('gemini-proxy', {
        type: 'generateContent',
        params: {
            model: 'gemini-2.5-flash',
            contents: prompt,
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
        }
    });
    return parseGeminiJson(response);
};


export const reviewVideoPerformance = async (performance: VideoPerformance, title: string): Promise<PerformanceReview> => {
    const prompt = `You are a YouTube strategy consultant. A client's video titled "${title}" has the following performance data: ${JSON.stringify(performance)}. 
    
    Provide a sharp, concise analysis. Your output must be a JSON object with three keys:
    1. "summary": A one-sentence takeaway of the video's performance.
    2. "whatWorked": An array of 2-3 bullet points on the positive aspects, inferring from the data (e.g., "High retention suggests the core content was engaging").
    3. "whatToImprove": An array of 2-3 actionable suggestions for the next video (e.g., "With high retention but low views, the title or thumbnail likely needs improvement to increase CTR").`;

    const response = await supabase.invokeEdgeFunction('gemini-proxy', {
        type: 'generateContent',
        params: {
            model: 'gemini-2.5-flash', 
            contents: prompt,
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
        }
    });
    return parseGeminiJson(response);
};

export const suggestContentGaps = async (successfulTopics: string[], niche: string): Promise<ContentGapSuggestion[]> => {
    const prompt = `Based on these successful video topics in the "${niche}" niche: ${successfulTopics.join(', ')}. Suggest 3 new, related video ideas. Output JSON array of objects with keys: "idea", "reason", "potentialTitles" (array of 3 strings).`;
    const response = await supabase.invokeEdgeFunction('gemini-proxy', {
        type: 'generateContent',
        params: {
            model: 'gemini-2.5-flash', 
            contents: prompt,
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
        }
    });
    return parseGeminiJson(response);
};


export const getSchedulingSuggestion = async (topic: string): Promise<string> => {
    const prompt = `Topic: "${topic}". Based on general audience behavior and online trends, what is the absolute best day and time to post this video for maximum initial engagement? Provide a short, direct answer with a brief justification. For example: 'Post on **Saturday at 11 AM EST**. This timing catches audiences during their weekend leisure time when they are actively seeking new content.'`;
    const response = await supabase.invokeEdgeFunction('gemini-proxy', {
        type: 'generateContent',
        params: {
            model: 'gemini-2.5-flash',
            contents: prompt
        }
    });
    return response.text;
};

export const generateNotificationMessage = async (oldViews: number, newViews: number, title: string): Promise<string> => {
    const prompt = `A YouTube video titled "${title}" has seen its view count change from ${oldViews} to ${newViews}. Write a short, exciting notification message for the creator. If the views increased significantly, make it celebratory. If they are stagnant or decreased, make it a neutral status update.`;
     const response = await supabase.invokeEdgeFunction('gemini-proxy', {
        type: 'generateContent',
        params: {
            model: 'gemini-2.5-flash',
            contents: prompt
        }
    });
    return response.text;
};