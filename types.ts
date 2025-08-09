import { type PostgrestError } from '@supabase/supabase-js';

// --- Core Types ---
export type PlanId = 'free' | 'pro' | 'viralyzaier';
export type ProjectStatus = 'Autopilot' | 'Idea' | 'Scripting' | 'Rendering' | 'Scheduled' | 'Published';
export type Platform = 'youtube_long' | 'youtube_short' | 'tiktok' | 'instagram';
export type WorkflowStep = 1 | 2 | 3 | 4 | 5;
export type VideoStyle = 'High-Energy Viral' | 'Cinematic Documentary' | 'Clean & Corporate' | 'Animation' | 'Historical Documentary' | 'Vlog' | 'Whiteboard';
export type AiVideoModel = 'runwayml' | 'kling' | 'minimax' | 'seedance';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// --- UI & System Types ---
export interface Toast { id: number; message: string; type: 'success' | 'error' | 'info'; }
export interface Plan { id: PlanId; name: string; price: number; creditLimit: number; features: string[]; isMostPopular?: boolean; }
export interface Subscription { planId: PlanId; status: 'active' | 'canceled'; endDate: string | null; }

// --- User & Brand Types ---
export interface ChannelAudit {
  contentPillars: string[];
  audiencePersona: string;
  viralFormula: string;
  opportunities: Opportunity[];
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

export interface ClonedVoice { id: string; name: string; status: 'ready' | 'pending' | 'failed'; }
export interface BrandIdentity {
    id: string;
    user_id: string;
    created_at: string;
    name: string;
    toneOfVoice: string;
    writingStyleGuide: string;
    colorPalette: { primary: string, secondary: string, accent: string };
    fontSelection: string;
    thumbnailFormula: string;
    visualStyleGuide: string;
    targetAudience: string;
    channelMission: string;
    logoUrl?: string;
}

// --- Project & Content Types ---
export interface Project {
  id: string;
  name: string;
  topic: string;
  platform: Platform;
  videoSize: '16:9' | '9:16' | '1:1';
  status: ProjectStatus;
  lastUpdated: string;
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
  workflowStep: WorkflowStep;
  voiceoverVoiceId: string | null;
  last_performance_check: string | null;
  timeline: TimelineState | null;
}

export interface Scene { timecode: string; visual: string; voiceover: string; onScreenText?: string; storyboardImageUrl?: string; sceneIndex: number; }
export interface Script { hooks: string[]; scenes: Scene[]; cta: string; selectedHookIndex?: number; }
export interface MoodboardImage { prompt: string; url: string; }
export interface Blueprint { suggestedTitles: string[]; script: Script; moodboard: string[]; strategicSummary: string; platform: Platform; }
export interface SceneAssets { visualUrl: string | null; voiceoverUrl: string | null; }
export interface SoundDesign { musicUrl: string | null; sfxUrls: string[]; }
export interface LaunchPlan {
  seo: { description: string; tags: string[]; };
  thumbnails: string[] | null;
  promotionPlan: { platform: string; action: string; }[] | null;
}

// --- Analysis & Intelligence Types ---
export type ScriptGoal = 'educate' | 'subscribe' | 'sell' | 'entertain';
export interface ScriptOptimization {
    initialScore: number;
    finalScore: number;
    analysisLog: { step: string; target: string; }[];
    finalScript: Script;
}
export interface TitleAnalysis { score: number; pros: string[]; cons: string[]; }
export interface Analysis {
  scores: { overall: number; hook: number; pacing: number; audio: number; cta: number; };
  summary: string;
  goldenNugget: string;
  strengths: string[];
  improvements: { suggestion: string; reason: string; }[];
}
export interface CompetitorAnalysisResult {
  videoTitle: string;
  viralityDeconstruction: string;
  stealableStructure: { step: string; description: string; }[];
  extractedKeywords: string[];
  suggestedTitles: string[];
}
export interface ChannelStats {
  subscriberCount: number;
  totalViews: number;
  totalVideos: number;
  topPerformingVideo: { title: string; views: number; };
}
export interface VideoPerformance { views: number; likes: number; comments: number; retention: number; }
export interface PerformanceReview { summary: string; whatWorked: string[]; whatToImprove: string[]; }
export interface Opportunity { idea: string; reason: string; suggestedTitle: string; type: 'Quick Win' | 'Growth Bet' | 'Experimental'; }
export interface ContentGapSuggestion { idea: string; reason: string; potentialTitles: string[]; }
export interface TrendData {
  interestOverTime: InterestPoint[];
  breakoutQueries: RelatedQuery[];
  topQueries: RelatedQuery[];
}
export interface InterestPoint { time: string; value: number; }
export interface RelatedQuery { query: string; value: string; }
export interface Notification {
  id: string;
  user_id: string;
  project_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

// --- Asset & Media Types ---
export interface UserAsset { id: string; user_id: string; url: string; type: 'video' | 'audio' | 'image'; name: string; created_at: string; }
export interface NormalizedStockAsset { id: string | number; previewImageUrl: string; downloadUrl: string; type: 'video' | 'image' | 'audio'; description: string; duration?: number; provider: 'pexels' | 'storyblocks' | 'jamendo' | 'pixabay'; }
export interface JamendoTrack { id: string; name: string; duration: number; artist_name: string; image: string; audio: string; }
export interface GiphyAsset { id: string; title: string; images: { original: { url: string; }; fixed_width: { url: string; }; }; }
export interface StoryblocksAsset { id: number; title: string; thumbnail_url: string; preview_url: string; type: string; duration?: number; }
export interface StockAsset {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  // For photos
  src?: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  alt?: string;
  // For videos
  image?: string; // This is the preview image for videos
  duration?: number;
  video_files?: {
    id: number;
    quality: string;
    file_type: string;
    width: number;
    height: number;
    link: string;
  }[];
}


// --- Timeline & Editing Types ---
export interface TimelineState {
    rev: number; // Revision number for smart updates
    tracks: TimelineTrack[];
    subtitles: Subtitle[];
    voiceoverVolume: number;
    musicVolume: number;
    isDuckingEnabled: boolean;
    totalDuration: number;
}
export interface TimelineTrack { id: string; type: 'a-roll' | 'b-roll' | 'overlay' | 'voiceover' | 'music' | 'sfx' | 'text'; clips: TimelineClip[]; }
export type KeyframeableProperty = 'x' | 'y' | 'scale' | 'rotation' | 'opacity' | 'volume';
export interface TimelineClip {
    id: string;
    type: 'video' | 'image' | 'audio' | 'text';
    url: string;
    text?: string;
    sceneIndex: number;
    startTime: number;
    endTime: number;
    sourceDuration: number;
    volume: number;
    opacity: number;
    positioning?: {
        width: number; // %
        height: number; // %
        x: number; // %
        y: number; // %
        zIndex: number;
        scale: number;
        rotation: number; // degrees
    };
    style?: Partial<Subtitle['style']>;
    effects?: {
        kenBurns?: { direction: 'in' | 'out' };
    };
    aiEffects?: {
        backgroundRemoved?: boolean;
        retouch?: boolean;
    };
    animation?: {
        in?: { type: string; duration: number };
        out?: { type: string; duration: number };
    };
    transition?: {
        type: 'glitch' | 'whip_pan' | 'film_burn' | 'luma_fade' | 'page_peel';
        duration: number;
    };
    color?: {
        lut?: 'cancun' | 'vintage' | 'noir' | 'cyberpunk' | 'corporate';
        adjustments?: {
            exposure: number; // -100 to 100
            contrast: number; // -100 to 100
            saturation: number; // -100 to 100
            temperature: number; // -100 to 100
        };
    };
    audio?: {
        enhance?: boolean;
        voicePreset?: 'none' | 'podcast' | 'cinematic' | 'radio' | 'robot';
    };
    keyframes?: {
        [key in KeyframeableProperty]?: { time: number; value: number }[];
    }
}
export interface SubtitleWord { word: string; start: number; end: number; style?: { fontWeight?: number; color?: string; isItalic?: boolean; } }
export interface Subtitle {
    id: string;
    text: string;
    start: number;
    end: number;
    words?: SubtitleWord[];
    style: {
        fontFamily: string;
        fontSize: number;
        fontWeight: number;
        letterSpacing: number;
        lineHeight: number;
        fill: { type: 'color' | 'gradient' | 'texture'; color?: string; gradient?: { angle: number; start: string; end: string; }; texture?: string; };
        outline?: { color: string; width: number; };
        shadow?: { color: string; offsetX: number; offsetY: number; blur: number; };
        backgroundColor: string;
    };
}


// --- Database Types (Auto-generated by Supabase) ---
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          subscription: Json | null
          ai_credits: number
          channel_audit: Json | null
          content_pillars: string[] | null
          cloned_voices: Json | null
          stripe_customer_id: string | null
        }
        Insert: {
          id: string
          email: string
          subscription: Json | null
          ai_credits: number
          channel_audit?: Json | null
          content_pillars?: string[] | null
          cloned_voices?: Json | null
          stripe_customer_id?: string | null
        }
        Update: {
          id?: string
          email?: string
          subscription?: Json | null
          ai_credits?: number
          channel_audit?: Json | null
          content_pillars?: string[] | null
          cloned_voices?: Json | null
          stripe_customer_id?: string | null
        }
        Relationships: []
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
          video_size: string | null
          status: string
          workflow_step: number
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
          video_size?: string | null
          status: string
          workflow_step: number
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
          video_size?: string | null
          status?: string
          workflow_step?: number
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
          voiceover_voice_id?: string | null
          last_performance_check?: string | null
          timeline?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: { id: string; user_id: string; project_id: string | null; message: string; is_read: boolean; created_at: string; }
        Insert: { id?: string; user_id: string; project_id?: string | null; message: string; is_read?: boolean; created_at?: string; }
        Update: { id?: string; user_id?: string; project_id?: string | null; message?: string; is_read?: boolean; created_at?: string; }
        Relationships: [
          {
            foreignKeyName: "notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      user_youtube_tokens: {
        Row: { user_id: string; access_token: string; refresh_token: string; expires_at: string; scope: string; }
        Insert: { user_id: string; access_token: string; refresh_token: string; expires_at: string; scope: string; }
        Update: { user_id?: string; access_token?: string; refresh_token?: string; expires_at?: string; scope?: string; }
        Relationships: [
          {
            foreignKeyName: "user_youtube_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      video_jobs: {
        Row: {
          id: string
          created_at: string
          project_id: string
          user_id: string
          status: "queued" | "processing" | "completed" | "failed"
          job_payload: Json
          result_url: string | null
          error_message: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          project_id: string
          user_id: string
          status?: "queued" | "processing" | "completed" | "failed"
          job_payload: Json
          result_url?: string | null
          error_message?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          project_id?: string
          user_id?: string
          status?: "queued" | "processing" | "completed" | "failed"
          job_payload?: Json
          result_url?: string | null
          error_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      brand_identities: {
        Row: {
          id: string
          user_id: string
          created_at: string
          name: string
          tone_of_voice: string
          writing_style_guide: string
          color_palette: Json | null
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
          color_palette?: Json | null
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
          color_palette?: Json | null
          font_selection?: string
          thumbnail_formula?: string
          visual_style_guide?: string
          target_audience?: string
          channel_mission?: string
          logo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_identities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
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
