import { Type } from "@google/genai";
import { Analysis, Blueprint, CompetitorAnalysisResult, Platform, Script, TitleAnalysis, ContentGapSuggestion, VideoPerformance, PerformanceReview, SceneAssets, SoundDesign, LaunchPlan, ChannelAudit, Opportunity, ScriptOptimization, ScriptGoal, Subtitle, BrandIdentity, VideoStyle, Scene, StockAsset, SubtitleWord, NormalizedStockAsset } from '../types.js';
import * as supabase from './supabaseService.js';

const parseGeminiJson = <T>(res: { text: string | null | undefined }, fallback: T | null = null): T => {
    try {
        const rawText = (res.text ?? '');
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

const urlToDataUrl = async (url: string): Promise<string> => {
    // If it's already a data URL, return it directly.
    if (url.startsWith('data:')) {
        return url;
    }
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch image from URL: ${url} (status: ${response.status})`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export const generateVideoBlueprint = async (
    topicOrUrl: string, 
    platform: Platform,
    style: VideoStyle,
    onProgress: (message: string) => void,
    desiredLengthInSeconds: number,
    brandIdentity?: BrandIdentity | null
): Promise<Blueprint> => {
    onProgress("Consulting AI strategist for core concepts...");
    
    const formatDescription = platform === 'youtube_long' 
        ? "a horizontal, long-form YouTube video" 
        : "a vertical, short-form video for platforms like YouTube Shorts, TikTok, or Instagram Reels";
    
    let brandIdentityPrompt = "No specific brand identity provided. Use a generally engaging and effective style.";
    if (brandIdentity) {
        brandIdentityPrompt = `
- **Brand Name:** ${brandIdentity.name}
- **Tone of Voice:** ${brandIdentity.toneOfVoice}
- **Writing Style Guide:** ${brandIdentity.writingStyleGuide}
- **Target Audience:** ${brandIdentity.targetAudience}
- **Channel Mission:** ${brandIdentity.channelMission}
- **Visual Style Guide:** ${brandIdentity.visualStyleGuide}
- **Thumbnail Formula:** ${brandIdentity.thumbnailFormula}
        `;
    }
        
    const textPrompt = `You are a world-class viral video strategist for ${formatDescription}. Your task is to generate a complete video blueprint based on the following parameters:
**Topic/URL:** "${topicOrUrl}"
**Desired Video Length:** Approximately ${desiredLengthInSeconds} seconds. Your script's pacing and scene count must reflect this.
**Chosen Video Style:** "${style}". This style MUST heavily influence every aspect of your output.
- For 'High-Energy Viral': Fast pacing, bold claims, quick cuts, high-enthusiasm language.
- For 'Cinematic Documentary': Thoughtful pacing, narrative structure, elegant language, evocative visuals.
- For 'Clean & Corporate': Clear, professional language, structured information, trustworthy tone.

**Brand Identity to Adhere To:**
${brandIdentityPrompt}

Your output MUST be a JSON object with the following structure:
1. "strategicSummary": A concise summary explaining WHY this video concept, in this style and for this brand, will perform well.
2. "suggestedTitles": An array of 5 S-Tier titles, tailored to the chosen style and brand identity.
3. "script": A full script object, with hooks, scenes, and a CTA, all written in the chosen style and brand voice. The total duration should match the desired length.
4. "moodboardDescription": An array of 3 descriptive prompts for an AI image generator, each evoking the specific visual aesthetic of the chosen style and brand.`;
    
    const systemInstruction = `You are a world-class viral video strategist and your response MUST be a valid JSON object that strictly adheres to the provided schema. Ensure all fields, especially arrays like 'scenes' and 'suggestedTitles', are populated with high-quality, relevant content and are never empty. The output must reflect the chosen video style, desired length, and brand identity.`;

    const response = await supabase.invokeEdgeFunction<{ text: string }>('gemini-proxy', {
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
    
    onProgress("Strategic plan and script generated successfully!");

    const moodboardUrls: string[] = [];
    const aspectRatio = platform === 'youtube_long' ? '16:9' : '9:16';

    for (let i = 0; i < blueprintContent.moodboardDescription.length; i++) {
        const prompt = blueprintContent.moodboardDescription[i];
        onProgress(`Generating moodboard image ${i + 1} of ${blueprintContent.moodboardDescription.length}...`);
        
        const imageResult = await supabase.invokeEdgeFunction<{ generatedImages: { image: { imageBytes: string } }[] }>('gemini-proxy', {
            type: 'generateImages',
            params: {
                model: 'imagen-3.0-generate-002',
                prompt: `A cinematic, visually stunning image for a YouTube video moodboard in a ${style} style: ${prompt}`,
                config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio }
            }
        });
        moodboardUrls.push(`data:image/jpeg;base64,${imageResult.generatedImages[0].image.imageBytes}`);
    }

    onProgress("Finalizing your blueprint...");
    
    return { ...blueprintContent, moodboard: moodboardUrls, platform };
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

    const response = await supabase.invokeEdgeFunction<{ text: string }>('gemini-proxy', {
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
    const aspectRatio = platform === 'youtube_long' ? '16:9' : '9:16';

    const allMoodboardPrompts = blueprintContents.flatMap(b => b.moodboardDescription);
    const allImagePromises = allMoodboardPrompts.map(prompt =>
        supabase.invokeEdgeFunction<{ generatedImages: { image: { imageBytes: string } }[] }>('gemini-proxy', {
            type: 'generateImages',
            params: {
                model: 'imagen-3.0-generate-002',
                prompt: `A cinematic, visually stunning image for a YouTube video moodboard: ${prompt}`,
                config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio }
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
    input: { topic: string } | { userScript: string },
    scriptGoal: ScriptGoal
): Promise<ScriptOptimization> => {
    const isGenerating = 'topic' in input;
    const promptContext = isGenerating
        ? `Generate a new script about "${input.topic}".`
        : `Analyze and improve this existing script: "${input.userScript.substring(0, 2000)}..."`;

    const formatDescription = platform === 'youtube_long' ? "long-form YouTube videos" : "short-form vertical videos (Shorts, TikToks)";

    const prompt = `You are an expert scriptwriter and viral content analyst for ${formatDescription}. Your task is to create a perfectly optimized script.

**Primary Goal:** Your script MUST be optimized to achieve this goal: **${scriptGoal}**.
- If 'educate': Focus on clear, value-packed information. Structure it logically. The CTA should reinforce authority.
- If 'subscribe': Build a relatable narrative or strong community identity. End with a compelling reason for the viewer to join the community.
- If 'sell': Use a persuasive framework like Problem-Agitate-Solve. The CTA must directly relate to the product/service and overcome objections.
- If 'entertain': Prioritize storytelling, humor, or emotional connection. The CTA should be about community engagement (e.g., 'comment below').

**Other Parameters:**
- Desired script length is approximately ${desiredLengthInSeconds} seconds.
- Context: ${promptContext}

Your output must be a single JSON object with the following structure.
- "initialScore": An integer from 0-100 representing the baseline virality score. If generating a new script, this should be 0. If improving a script, provide an honest assessment of the original.
- "finalScore": An integer from 90-100. This is the score of your improved script.
- "analysisLog": An array of 5-7 objects, where each object details one optimization step. Each object must have:
    - "step": A short, descriptive string of the action taken (e.g., "Rewriting hook for more impact", "Improving pacing in scene 2", "Strengthening the call to action").
    - "target": A string identifying the part of the script being changed ('hooks', 'cta', or 'scene-X' where X is the scene number, e.g., 'scene-2').
- "finalScript": The fully optimized script object, following the specified structure. It must include:
    - "hooks": An array of 3-5 distinct, psychologically-driven hook options.
    - "scenes": An array of scene objects, each with "timecode", "visual", "voiceover", and "onScreenText". The total duration should respect the desiredLengthInSeconds.
    - "cta": A strong, clear call to action tailored to the primary goal.`;

    const response = await supabase.invokeEdgeFunction<{ text: string }>('gemini-proxy', {
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
    
    // Convert image URLs to Base64 data URLs before sending to the proxy.
    const dataUrls = await Promise.all(frames.map(url => urlToDataUrl(url)));

    const imageParts = dataUrls.map(frameDataUrl => {
        const [header, base64Data] = frameDataUrl.split(',');
        const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
        return {
            inlineData: {
                data: base64Data,
                mimeType,
            }
        };
    });
    
    const response = await supabase.invokeEdgeFunction<{ text: string }>('gemini-proxy', {
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

    const response = await supabase.invokeEdgeFunction<{ text: string }>('gemini-proxy', {
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

    const response = await supabase.invokeEdgeFunction<{ text: string }>('gemini-proxy', {
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

    const response = await supabase.invokeEdgeFunction<{ text: string }>('gemini-proxy', {
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
                                    type: { type: Type.STRING }
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

    return parseGeminiJson<ChannelAudit>(response);
};

export const generateSoundDesign = async (script: Script, vibe: string, topic: string): Promise<SoundDesign> => {
    const prompt = `You are an AI sound designer for viral videos. The video is about "${topic}" and needs a "${vibe}" vibe. Here is the script:
${JSON.stringify(script.scenes.map(s => ({ timecode: s.timecode, voiceover: s.voiceover })), null, 2)}

Your task is to suggest background music and specific sound effects (SFX).

Your output MUST be a JSON object with this structure:
1. "music": A detailed description of the suggested background music track. Describe its genre, tempo, mood, and instrumentation (e.g., "Uplifting, driving synth-pop with a strong beat and optimistic synth melodies.").
2. "sfx": An array of SFX objects. Each object needs a "timecode" matching the script and a "description" of the sound effect (e.g., "whoosh", "camera shutter", "gentle notification ping"). Only include SFX for key moments.`;

    const response = await supabase.invokeEdgeFunction<{ text: string }>('gemini-proxy', {
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
    
    return parseGeminiJson<SoundDesign>(response);
};

export const rewriteScriptScene = async (scene: Scene, action: string): Promise<Partial<Scene>> => {
    const prompt = `You are an AI script co-writer. Your task is to rewrite a single scene from a video script based on a specific action.

**Original Scene:**
- Visual: "${scene.visual}"
- Voiceover: "${scene.voiceover}"

**Action:** "${action}"

Rewrite the 'visual' and 'voiceover' fields to fulfill the action. Your output MUST be a JSON object containing only the rewritten "visual" and "voiceover" keys.`;

    const response = await supabase.invokeEdgeFunction<{ text: string }>('gemini-proxy', {
        type: 'generateContent',
        params: {
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        visual: { type: Type.STRING },
                        voiceover: { type: Type.STRING }
                    },
                    required: ["visual", "voiceover"]
                }
            }
        }
    });

    return parseGeminiJson<Partial<Scene>>(response);
};

export const reviewVideoPerformance = async (performance: VideoPerformance, title: string): Promise<PerformanceReview> => {
    const prompt = `You are a YouTube analytics expert. Analyze the following video's performance data and provide a review.

**Video Title:** "${title}"
**Performance Metrics:**
- Views: ${performance.views}
- Likes: ${performance.likes}
- Comments: ${performance.comments}
- Average Retention: ${performance.retention}%

Your output MUST be a JSON object with:
- "summary": A concise, one-sentence takeaway from the data.
- "whatWorked": An array of 2-3 bullet points on what likely contributed to success.
- "whatToImprove": An array of 2-3 actionable suggestions for the next video.`;

    const response = await supabase.invokeEdgeFunction<{ text: string }>('gemini-proxy', {
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

    return parseGeminiJson<PerformanceReview>(response);
};

export const suggestContentGaps = async (successfulTopics: string[], currentProjectTopic: string): Promise<ContentGapSuggestion[]> => {
    const prompt = `You are a YouTube strategist. Based on a creator's successful videos and their current project, identify content gaps.

**Successful Video Topics:**
${successfulTopics.map(t => `- "${t}"`).join('\n')}

**Current Project Topic:** "${currentProjectTopic}"

Your task is to suggest 3 new, related video ideas that bridge the gap between their proven content and their new project. Your output MUST be a JSON array of 3 objects, each with:
- "idea": The core video concept.
- "reason": Why this idea is a logical next step for their audience.
- "potentialTitles": An array of 3 clickable titles for the video.`;

    const response = await supabase.invokeEdgeFunction<{ text: string }>('gemini-proxy', {
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

    return parseGeminiJson<ContentGapSuggestion[]>(response);
};

export const getSchedulingSuggestion = async (topic: string): Promise<string> => {
    const prompt = `I'm posting a video about "${topic}". Based on general audience behavior patterns, what is the best day and time to post for maximum engagement? Provide a short, direct answer with your reasoning. Use markdown for emphasis.`;
    const response = await supabase.invokeEdgeFunction<{ text?: string }>('gemini-proxy', {
        type: 'generateContent',
        params: { model: 'gemini-2.5-flash', contents: prompt }
    });
    return response.text ?? '';
};

export const getAiBrollSuggestion = async (scriptText: string): Promise<{ type: 'stock' | 'ai_video'; query?: string; prompt?: string }> => {
    return await supabase.invokeEdgeFunction('ai-broll-generator', { scriptText });
};

const mapPexelsAsset = (asset: StockAsset, type: 'videos' | 'photos'): NormalizedStockAsset => {
    const isVideo = type === 'videos' && 'video_files' in asset;
    return {
        id: asset.id,
        previewImageUrl: isVideo ? asset.image! : asset.src!.medium,
        downloadUrl: isVideo ? asset.video_files!.find(f => f.quality === 'hd')?.link || asset.video_files![0].link : asset.src!.original,
        type: isVideo ? 'video' : 'image',
        description: isVideo ? `Video by ${asset.photographer}` : asset.alt || `Photo by ${asset.photographer}`,
        provider: 'pexels',
        duration: asset.duration
    };
};

export const searchStockMedia = async (query: string, type: 'videos' | 'photos'): Promise<NormalizedStockAsset[]> => {
    if (!query.trim()) return [];
    const response = await supabase.invokeEdgeFunction<{ videos?: StockAsset[], photos?: StockAsset[] }>('pexels-proxy', { query, type });
    const assets = (type === 'videos' ? response.videos : response.photos) || [];
    return assets.map(asset => mapPexelsAsset(asset, type));
};

export const generateTextGraphic = async (text: string): Promise<string> => {
    const prompt = `Create a high-contrast, visually appealing graphic with transparent background featuring the text: "${text}". The style should be bold, modern, and suitable for a viral video overlay. The text should be the main focus.`;
    const imageResult = await supabase.invokeEdgeFunction<{ generatedImages: { image: { imageBytes: string } }[] }>('gemini-proxy', {
        type: 'generateImages',
        params: {
            model: 'imagen-3.0-generate-002',
            prompt: prompt,
            config: { numberOfImages: 1, outputMimeType: 'image/png' } // PNG for transparency
        }
    });
    return `data:image/png;base64,${imageResult.generatedImages[0].image.imageBytes}`;
};

export const generateSeo = async (title: string, script: Script, platform: Platform): Promise<NonNullable<LaunchPlan['seo']>> => {
    const scriptSummary = script.scenes.map(s => s.voiceover).join(' ');
    const prompt = `You are a YouTube SEO expert. Generate an optimized description and relevant tags for a video.

**Platform:** ${platform}
**Title:** "${title}"
**Script Summary:** "${scriptSummary.substring(0, 2000)}..."

Your output MUST be a JSON object with:
- "description": A well-written, keyword-rich video description.
- "tags": An array of 15-20 relevant tags.`;

    const response = await supabase.invokeEdgeFunction<{ text: string }>('gemini-proxy', {
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

export const analyzeAndGenerateThumbnails = async (title: string, platform: Platform): Promise<string[]> => {
    const prompt = `You are a viral thumbnail designer. Based on the video title "${title}", generate 2 distinct, compelling visual concepts for a thumbnail. Focus on high-contrast, emotional, and curiosity-driven imagery. Your output MUST be a JSON object with a "prompts" key, which is an array of 2 detailed strings, each a prompt for an AI image generator.`;

    const promptResponse = await supabase.invokeEdgeFunction<{ text: string }>('gemini-proxy', {
        type: 'generateContent',
        params: {
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        prompts: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["prompts"]
                }
            }
        }
    });

    const { prompts } = parseGeminiJson<{ prompts: string[] }>(promptResponse);
    const aspectRatio = platform === 'youtube_long' ? '16:9' : '9:16';
    
    const imagePromises = prompts.map(p => 
        supabase.invokeEdgeFunction<{ generatedImages: { image: { imageBytes: string } }[] }>('gemini-proxy', {
            type: 'generateImages',
            params: {
                model: 'imagen-3.0-generate-002',
                prompt: `YouTube thumbnail, cinematic, high contrast, viral style: ${p}`,
                config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio }
            }
        })
    );

    const imageResults = await Promise.all(imagePromises);
    return imageResults.map(res => `data:image/jpeg;base64,${res.generatedImages[0].image.imageBytes}`);
};


export const generatePromotionPlan = async (title: string, platform: Platform): Promise<NonNullable<LaunchPlan['promotionPlan']>> => {
    const prompt = `Create a simple, actionable cross-promotion plan for a new video titled "${title}" on ${platform}. Suggest 3 actions on other social platforms. Your output MUST be a JSON array of objects, each with "platform" and "action".`;
    const response = await supabase.invokeEdgeFunction<{ text: string }>('gemini-proxy', {
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

export const generateAnimatedSubtitles = async (script: Script): Promise<Subtitle[]> => {
    // A simplified, faster client-side calculation for timings.
    const wordsPerMinute = 150;
    const msPerWord = 60000 / wordsPerMinute;
    let globalTime = 0;
    const subtitles: Subtitle[] = [];

    const allText = script.scenes.map(s => s.voiceover).join(' ');
    // Split into reasonable lines for subtitles
    const lines: string[] = allText.match(/.{1,50}(\s|$)/g) || [];

    lines.forEach((line, index) => {
        const text = line.trim();
        if (!text) return;
        
        const words = text.split(/\s+/);
        const lineDuration = words.length * msPerWord;
        
        const startTime = globalTime;
        const endTime = globalTime + lineDuration;
        
        let wordStartTime = 0;
        const subtitleWords: SubtitleWord[] = words.map(word => {
            const wordDuration = msPerWord;
            const wordData = {
                word,
                start: wordStartTime,
                end: wordStartTime + wordDuration,
            };
            wordStartTime += wordDuration;
            return wordData;
        });

        subtitles.push({
            id: `sub_${index}`,
            text: text,
            start: startTime / 1000,
            end: endTime / 1000,
            style: {
                fontFamily: 'Inter, sans-serif',
                fontSize: 48,
                fontWeight: 800,
                letterSpacing: -1,
                lineHeight: 1.2,
                fill: { type: 'color', color: '#FFFFFF' },
                outline: { color: '#000000', width: 4 },
                backgroundColor: 'rgba(0,0,0,0)',
            },
            words: subtitleWords,
        });

        globalTime = endTime;
    });

    return subtitles;
};


export const emphasizeSubtitleText = async (text: string): Promise<Partial<SubtitleWord>[]> => {
    const prompt = `You are an AI text analyzer. Your job is to read a sentence and decide which words should be emphasized to maximize impact for on-screen captions.

Sentence: "${text}"

Analyze the sentence and identify 1-3 key words that carry the most meaning or emotion. Your response MUST be a JSON array of objects, one for each word in the original sentence. Each object must have two keys:
1. "word": The word from the sentence.
2. "emphasis": A string that is either "bold", "color", or "none". Use "color" for the single most impactful word. Use "bold" for secondary important words.`;

    const response = await supabase.invokeEdgeFunction<{ text: string }>('gemini-proxy', {
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
                            word: { type: Type.STRING },
                            emphasis: { type: Type.STRING }
                        },
                        required: ["word", "emphasis"]
                    }
                }
            }
        }
    });
    
    const emphasisData = parseGeminiJson<{ word: string; emphasis: 'bold' | 'color' | 'none' }[]>(response);
    
    // Map the Gemini response to the SubtitleWord style format
    return emphasisData.map(item => {
        const style: Partial<SubtitleWord>['style'] = {};
        if (item.emphasis === 'bold') {
            style.fontWeight = 800; // Extra bold
        }
        if (item.emphasis === 'color') {
            style.color = '#f59e0b'; // Accent color
        }
        return { word: item.word, style };
    });
};


export const suggestSfxForScript = async (script: Script): Promise<{ time: number, prompt: string }[]> => {
    const scriptSummary = script.scenes.map((s: any, i: number) => `Scene ${i+1} (${s.visual}): ${s.voiceover}`).join('\n');
    const prompt = `You are an expert sound designer for viral videos. Based on the following script, suggest 3-5 subtle, impactful sound effects (SFX) to enhance key moments.
    
    Script:
    ${scriptSummary}

    Your output MUST be a JSON array of objects, each with "time" (the precise time in seconds for the SFX to start, inferred from scene progression) and "prompt" (a short text description for an SFX generation AI, e.g., "a subtle whoosh", "a camera shutter click", "a gentle notification ping").`;
    
    const response = await supabase.invokeEdgeFunction<{ text: string }>('gemini-proxy', {
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
                            time: { type: Type.NUMBER },
                            prompt: { type: Type.STRING }
                        },
                        required: ["time", "prompt"]
                    }
                }
            }
        }
    });

    return parseGeminiJson<{ time: number, prompt: string }[]>(response);
};