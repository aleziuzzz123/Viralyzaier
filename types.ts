
export type PlanId = 'free' | 'pro' | 'viralyzaier';
export type ScriptGoal = 'educate' | 'subscribe' | 'sell' | 'entertain';
export type Platform = 'youtube_long' | 'youtube_short' | 'tiktok' | 'instagram';
export type ProjectStatus = 'Idea' | 'Scripting' | 'Rendering' | 'Scheduled' | 'Published' | 'Autopilot';
export type WorkflowStep = 1 | 2 | 3 | 4;
export type VisualType = 'ai_video' | 'ai_image' | 'ai_graphic' | 'stock' | 'user';
export type VideoStyle = 'High-Energy Viral' | 'Cinematic Documentary' | 'Clean & Corporate';


export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  creditLimit: number;
  features: string[];
  isMostPopular?: boolean;
}

export interface ClonedVoice {
    id: string;
    name: string;
    status: 'pending' | 'ready' | 'failed';
}

export interface Subscription {
  planId: PlanId;
  status: 'active' | 'canceled';
  endDate: string | null;
}

export interface Scene {
    timecode: string;
    visual: string;
    voiceover: string;
    onScreenText: string;
}

export interface Script {
    hooks: string[];
    scenes: Scene[];
    cta: string;
}

export interface Blueprint {
    strategicSummary: string;
    suggestedTitles: string[];
    script: Script;
    moodboard: string[];
    platform: Platform;
}

export interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
}

export interface TitleAnalysis {
    score: number;
    pros: string[];
    cons: string[];
}

export interface Analysis {
    scores: {
        overall: number;
        hook: number;
        pacing: number;
        audio: number;
        cta: number;
    };
    summary: string;
    goldenNugget: string;
    strengths: string[];
    improvements: { suggestion: string, reason: string }[];
}

export interface CompetitorAnalysisResult {
    videoTitle: string;
    viralityDeconstruction: string;
    stealableStructure: { step: string, description: string }[];
    extractedKeywords: string[];
    suggestedTitles: string[];
}

export interface SceneAssets {
    visualUrl?: string;
    visualType?: VisualType;
    voiceoverUrl?: string;
}

export interface SoundDesign {
    music: string;
    sfx: { timecode: string, description: string }[];
}

export interface LaunchPlan {
    seo?: {
        description: string;
        tags: string[];
    };
    thumbnails?: string[];
    promotionPlan?: { platform: string, action: string }[];
}

export interface VideoPerformance {
    views: number;
    likes: number;
    comments: number;
    retention: number;
}

export interface ChannelStats {
    subscriberCount: number;
    totalViews: number;
    totalVideos: number;
    topPerformingVideo: {
        title: string;
        views: number;
    };
}

export interface Opportunity {
    idea: string;
    reason: string;
    suggestedTitle: string;
    type: 'Quick Win' | 'Growth Bet' | 'Experimental';
}

export interface ChannelAudit {
    contentPillars: string[];
    audiencePersona: string;
    viralFormula: string;
    opportunities: Opportunity[];
}

export interface ContentGapSuggestion {
    idea: string;
    reason: string;
    potentialTitles: string[];
}

export interface PerformanceReview {
    summary: string;
    whatWorked: string[];
    whatToImprove: string[];
}

export interface Notification {
    id: string;
    user_id: string;
    project_id: string | null;
    message: string;
    is_read: boolean;
    created_at: string;
}

export interface UserAsset {
    id: string;
    url: string;
    type: 'video' | 'image';
    name: string;
}

export interface BrandIdentity {
    id: string;
    user_id: string;
    created_at: string;
    name: string;
    toneOfVoice: string;
    writingStyleGuide: string;
    colorPalette: { primary: string; secondary: string; accent: string };
    fontSelection: string;
    thumbnailFormula: string;
    visualStyleGuide: string;
    targetAudience: string;
    channelMission: string;
    logoUrl?: string;
}

export interface InterestPoint {
    time: string;
    value: number;
}

export interface RelatedQuery {
    query: string;
    value: string;
}

export interface TrendData {
    interestOverTime: InterestPoint[];
    breakoutQueries: RelatedQuery[];
    topQueries: RelatedQuery[];
}

export interface AIMusic {
    title: string;
    description: string;
    audioUrl: string;
}

export interface ScriptOptimization {
    initialScore: number;
    finalScore: number;
    analysisLog: { step: string; target: string }[];
    finalScript: Script;
}

export interface StockAsset {
    id: number;
    url: string;
    type: 'video' | 'photo';
    description: string;
    user: { name: string; url: string };
}

export interface User {
    id: string;
    email: string;
    subscription: Subscription;
    aiCredits: number;
    channelAudit: ChannelAudit | null;
    youtubeConnected: boolean;
    content_pillars: string[];
    cloned_voices: ClonedVoice[];
}

export interface SubtitleWord {
  word: string;
  start: number; // in ms, relative to subtitle start
  end: number; // in ms, relative to subtitle start
  style?: { // Optional override for this word
      fontWeight?: number;
      color?: string;
      isItalic?: boolean;
  };
}

export interface Subtitle {
    id: string;
    text: string;
    start: number; // in seconds
    end: number; // in seconds
    style: {
        fontFamily: string;
        fontSize: number; // px
        fontWeight: number;
        letterSpacing: number; // px
        lineHeight: number; // multiplier
        outline?: {
            color: string;
            width: number; // px
        };
        shadow?: {
            color: string;
            blur: number; // px
            offsetX: number; // px
            offsetY: number; // px
        };
        fill: {
            type: 'color' | 'gradient' | 'texture';
            color: string;
            gradient?: { start: string; end: string; angle: number; };
            texture?: string; // URL to texture image
        };
        backgroundColor: string; // For the backing box
    };
    words?: SubtitleWord[];
    isEditing?: boolean;
}


export interface TimelineClip {
    id: string;
    type: 'video' | 'image' | 'audio' | 'text';
    url: string;
    sceneIndex: number;
    startTime: number;
    endTime: number;
    sourceDuration: number;
    // --- Layout & Composition ---
    positioning?: {
        width: number; // percentage
        height: number; // percentage
        x: number; // percentage from left
        y: number; // percentage from top
        zIndex?: number;
    };
    // --- VFX & Animation Hub ---
    animation?: {
        in?: 'fade' | 'slide' | 'rise' | 'bounce' | 'pulse';
        out?: 'fade' | 'slide' | 'rise';
    };
    transition?: { // Applied at the START of the clip
        type: 'glitch' | 'whip_pan' | 'film_burn' | 'luma_fade' | 'page_peel';
        duration: number; // in seconds
    };
    aiEffects?: {
        backgroundRemoved?: boolean;
        retouch?: boolean;
        objectRemoved?: string;
    };
    effects?: {
        kenBurns?: { direction: 'in' | 'out'; };
    };
    // --- Color & Audio Studio ---
    color?: {
      lut?: 'cancun' | 'vintage' | 'noir' | 'cyberpunk' | 'corporate';
      adjustments?: {
        exposure: number; // -100 to 100
        contrast: number; // -100 to 100
        saturation: number; // -100 to 100
        temperature: number; // -100 to 100
      }
    };
    audio?: {
      enhance?: boolean;
      voicePreset?: 'podcast' | 'cinematic' | 'radio' | 'robot';
    };
    // --- Existing ---
    volume?: number;
    text?: string;
    style?: { [key: string]: string | number };
}

export interface TimelineTrack {
    id: string;
    type: 'a-roll' | 'b-roll' | 'voiceover' | 'music' | 'sfx' | 'text' | 'overlay';
    clips: TimelineClip[];
}

export interface TimelineState {
    tracks: TimelineTrack[];
    subtitles: Subtitle[];
    voiceoverVolume: number;
    musicVolume: number;
    isDuckingEnabled: boolean;
    totalDuration: number;
}


export interface Project {
    id: string;
    name: string;
    topic: string;
    platform: Platform;
    status: ProjectStatus;
    title: string | null;
    script: Script | null;
    analysis: Analysis | null;
    competitorAnalysis: CompetitorAnalysisResult | null;
    moodboard: string[] | null;
    assets: { [sceneIndex: number]: SceneAssets };
    soundDesign: SoundDesign | null;
    launchPlan: LaunchPlan | null;
    performance: VideoPerformance | null;
    scheduledDate: string | null;
    publishedUrl: string | null;
    lastUpdated: string;
    workflowStep: WorkflowStep;
    voiceoverVoiceId: string | null;
    last_performance_check: string | null;
    timeline: TimelineState | null;
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          subscription: Json
          ai_credits: number
          channel_audit: Json | null
          content_pillars: string[] | null
          cloned_voices: Json | null
          stripe_customer_id: string | null
        }
        Insert: {
          id: string
          email: string
          subscription?: Json
          ai_credits?: number
          channel_audit?: Json | null
          content_pillars?: string[] | null
          cloned_voices?: Json | null
          stripe_customer_id?: string | null
        }
        Update: {
          id?: string
          email?: string
          subscription?: Json
          ai_credits?: number
          channel_audit?: Json | null
          content_pillars?: string[] | null
          cloned_voices?: Json | null
          stripe_customer_id?: string | null
        }
      }
      projects: {
        Row: {
          id: string
          user_id: string
          created_at: string
          last_updated: string
          name: string
          topic: string
          platform: string
          status: string
          title: string | null
          script: Json | null
          analysis: Json | null
          competitor_analysis: Json | null
          moodboard: string[] | null
          assets: Json | null
          sound_design: Json | null
          launch_plan: Json | null
          performance: Json | null
          scheduled_date: string | null
          published_url: string | null
          workflow_step: number
          voiceover_voice_id: string | null
          last_performance_check: string | null
          timeline: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
          last_updated?: string
          name: string
          topic: string
          platform: string
          status: string
          title?: string | null
          script?: Json | null
          analysis?: Json | null
          competitor_analysis?: Json | null
          moodboard?: string[] | null
          assets?: Json | null
          sound_design?: Json | null
          launch_plan?: Json | null
          performance?: Json | null
          scheduled_date?: string | null
          published_url?: string | null
          workflow_step: number
          voiceover_voice_id?: string | null
          last_performance_check?: string | null
          timeline?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
          last_updated?: string
          name?: string
          topic?: string
          platform?: string
          status?: string
          title?: string | null
          script?: Json | null
          analysis?: Json | null
          competitor_analysis?: Json | null
          moodboard?: string[] | null
          assets?: Json | null
          sound_design?: Json | null
          launch_plan?: Json | null
          performance?: Json | null
          scheduled_date?: string | null
          published_url?: string | null
          workflow_step?: number
          voiceover_voice_id?: string | null
          last_performance_check?: string | null
          timeline?: Json | null
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          project_id: string | null
          message: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          project_id?: string | null
          message: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string | null
          message?: string
          is_read?: boolean
          created_at?: string
        }
      }
      user_youtube_tokens: {
         Row: {
          user_id: string
          access_token: string
          refresh_token: string
          expires_at: string
          scope: string
        }
        Insert: {
          user_id: string
          access_token: string
          refresh_token: string
          expires_at: string
          scope: string
        }
        Update: {
          user_id?: string
          access_token?: string
          refresh_token?: string
          expires_at?: string
          scope?: string
        }
      }
      brand_identities: {
        Row: {
            id: string
            user_id: string
            created_at: string
            name: string
            tone_of_voice: string
            writing_style_guide: string
            color_palette: Json
            font_selection: string
            thumbnail_formula: string
            visual_style_guide: string
            target_audience: string
            channel_mission: string
            logo_url: string | null
        }
        Insert: {
            id?: string
            user_id: string
            created_at?: string
            name: string
            tone_of_voice: string
            writing_style_guide: string
            color_palette: Json
            font_selection: string
            thumbnail_formula: string
            visual_style_guide: string
            target_audience: string
            channel_mission: string
            logo_url?: string | null
        }
        Update: {
            id?: string
            user_id?: string
            created_at?: string
            name?: string
            tone_of_voice?: string
            writing_style_guide?: string
            color_palette?: Json
            font_selection?: string
            thumbnail_formula?: string
            visual_style_guide?: string
            target_audience?: string
            channel_mission?: string
            logo_url?: string | null
        }
      }
      video_jobs: {
        Row: {
          id: string
          project_id: string
          user_id: string
          status: string
          job_payload: Json
          created_at: string
          output_url: string | null
          error_message: string | null
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          status: string
          job_payload: Json
        }
        Update: {
          status?: string
          output_url?: string | null
          error_message?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}