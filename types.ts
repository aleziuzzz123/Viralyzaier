import { type PostgrestError } from '@supabase/supabase-js';

// --- Core Types ---
export type PlanId = 'free' | 'pro' | 'viralyzaier';
export type ProjectStatus = 'Autopilot' | 'Idea' | 'Scripting' | 'Rendering' | 'Scheduled' | 'Published';
export type Platform = 'youtube_long' | 'youtube_short' | 'tiktok' | 'instagram';
export type WorkflowStep = 1 | 2 | 3 | 4 | 5;
export type VideoStyle =
  | 'High-Energy Viral'
  | 'Cinematic Documentary'
  | 'Clean & Corporate'
  | 'Animation'
  | 'Historical Documentary'
  | 'Vlog'
  | 'Whiteboard';
export type AiVideoModel = 'runwayml' | 'kling' | 'minimax' | 'seedance';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

/** ========= Extra types used by api/gemini-proxy.ts ========= */
export interface Trend {
  term: string;
  score: number;
  growth: number;
}

export interface EnhancedTopic {
  idea: string;
  rationale: string;
  suggestedTitle: string;
}

export interface VideoDeconstruction {
  steps: { step: string; description: string }[];
  hooks: string[];
  /** ADDED: used in api/gemini-proxy.ts */
  generatedScripts?: Script[];
  /** keep flexible so small API shape changes don't break builds */
  [key: string]: unknown;
}

export interface ViralScoreBreakdown {
  hook: number;
  pacing: number;
  visuals: number;
  cta: number;
  overall: number;
}

export interface OptimizationStep {
  step: string;
  target: string;
  /** ADDED: used in api/gemini-proxy.ts */
  script?: Script;
  note?: string;
  [key: string]: unknown;
}
/** =========================================================== */

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
  colorPalette: { primary: string; secondary: string; accent: string };
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
  final_video_url?: string | null;
}

export interface Scene {
  timecode: string;
  visual: string;
  voiceover: string;
  onScreenText?: string;
  storyboardImageUrl?: string;
  sceneIndex: number;
}

export interface Script {
  id?: any;
  hooks: string[];
  scenes: Scene[];
  cta: string;
  selectedHookIndex?: number;
  tone?: string;
  isNew?: boolean;
}

export interface MoodboardImage { prompt: string; url: string; }
export interface Blueprint {
  suggestedTitles: string[];
  script: Script;
  moodboard: string[];
  strategicSummary: string;
  platform: Platform;
}
export interface SceneAssets { visualUrl: string | null; voiceoverUrl: string | null; }
export interface SoundDesign { musicUrl: string | null; sfxUrls: string[]; }

export interface LaunchPlan {
  seo: { description: string; tags: string[] };
  thumbnails: string[] | null;
  promotionPlan: { platform: string; action: string }[] | null;
}

// --- Analysis & Intelligence Types ---
export type ScriptGoal = 'educate' | 'subscribe' | 'sell' | 'entertain';

export interface ScriptOptimization {
  initialScore: number;
  finalScore: number;
  analysisLog: { step: string; target: string }[];
  finalScript: Script;
}

export interface TitleAnalysis { score: number; pros: string[]; cons: string[]; }

export interface Analysis {
  scores: { overall: number; hook: number; pacing: number; audio: number; cta: number };
  summary: string;
  goldenNugget: string;
  strengths: string[];
  improvements: { suggestion: string; reason: string }[];
}

export interface CompetitorAnalysisResult {
  videoTitle: string;
  viralityDeconstruction: string;
  stealableStructure: { step: string; description: string }[];
  extractedKeywords: string[];
  suggestedTitles: string[];
  sources?: { uri: string; title: string }[];
}

export interface ChannelStats {
  subscriberCount: number;
  totalViews: number;
  totalVideos: number;
  topPerformingVideo: { title: string; views: number };
}

export interface VideoPerformance { views: number; likes: number; comments: number; retention: number; }

export interface PerformanceReview {
  summary: string;
  whatWorked: string[];
  whatToImprove: string[];
}

export interface Opportunity {
  idea: string;
  reason: string;
  suggestedTitle: string;
  type: 'Quick Win' | 'Growth Bet' | 'Experimental';
}

export interface ContentGapSuggestion { idea: string; reason: string; potentialTitles: string[]; }

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

export interface Subtitle { id: string; start: number; end: number; text: string; }

export interface TimelineState {
  subtitles: Subtitle[];
  [key: string]: any;
}

export interface SubtitleWord {
  word: string;
  style?: { fontWeight?: number; color?: string };
}

export interface StockAsset {
  id: number;
  image?: string;
  src?: { medium: string; large2x: string };
  video_files?: { quality: string; link: string }[];
  photographer?: string;
  alt?: string;
  duration?: number;
  previewURL?: string;
  largeImageURL?: string;
  videos?: { medium: { url: string } };
  user?: string;
  picture_id?: string;
}

export interface NormalizedStockAsset {
  id: number | string;
  previewImageUrl: string;
  downloadUrl: string;
  type: 'video' | 'image' | 'audio';
  description: string;
  duration?: number;
  provider: 'pexels' | 'pixabay' | 'jamendo';
}

export interface JamendoTrack {
  id: string;
  image: string;
  audio: string;
  name: string;
  artist_name: string;
  duration: number;
}

export interface GiphyAsset {
  id: string;
  title: string;
  images: {
    fixed_height: { url: string; webp: string };
    original: { url: string; webp: string };
  };
}

// --- Database Types (Auto-generated from Supabase) ---
export type Database = {
  public: {
    Tables: {
      brand_identities: {
        Row: {
          channel_mission: string | null;
          color_palette: Json | null;
          created_at: string;
          font_selection: string | null;
          id: string;
          logo_url: string | null;
          name: string | null;
          target_audience: string | null;
          thumbnail_formula: string | null;
          tone_of_voice: string | null;
          user_id: string;
          visual_style_guide: string | null;
          writing_style_guide: string | null;
        };
        Insert: {
          channel_mission?: string | null;
          color_palette?: Json | null;
          created_at?: string;
          font_selection?: string | null;
          id?: string;
          logo_url?: string | null;
          name?: string | null;
          target_audience?: string | null;
          thumbnail_formula?: string | null;
          tone_of_voice?: string | null;
          user_id: string;
          visual_style_guide?: string | null;
          writing_style_guide?: string | null;
        };
        Update: {
          channel_mission?: string | null;
          color_palette?: Json | null;
          created_at?: string;
          font_selection?: string | null;
          id?: string;
          logo_url?: string | null;
          name?: string | null;
          target_audience?: string | null;
          thumbnail_formula?: string | null;
          tone_of_voice?: string | null;
          user_id?: string;
          visual_style_guide?: string | null;
          writing_style_guide?: string | null;
        };
      };
      notifications: {
        Row: {
          created_at: string;
          id: string;
          is_read: boolean;
          message: string;
          project_id: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_read?: boolean;
          message: string;
          project_id?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_read?: boolean;
          message?: string;
          project_id?: string | null;
          user_id?: string;
        };
      };
      profiles: {
        Row: {
          ai_credits: number;
          channel_audit: Json | null;
          cloned_voices: Json | null;
          content_pillars: string[] | null;
          email: string;
          id: string;
          stripe_customer_id: string | null;
          subscription: Json | null;
        };
        Insert: {
          ai_credits?: number;
          channel_audit?: Json | null;
          cloned_voices?: Json | null;
          content_pillars?: string[] | null;
          email: string;
          id: string;
          stripe_customer_id?: string | null;
          subscription?: Json | null;
        };
        Update: {
          ai_credits?: number;
          channel_audit?: Json | null;
          cloned_voices?: Json | null;
          content_pillars?: string[] | null;
          email?: string;
          id?: string;
          stripe_customer_id?: string | null;
          subscription?: Json | null;
        };
      };
      projects: {
        Row: {
          analysis: Json | null;
          assets: Json | null;
          competitor_analysis: Json | null;
          final_video_url: string | null;
          id: string;
          last_performance_check: string | null;
          last_updated: string;
          launch_plan: Json | null;
          moodboard: string[] | null;
          name: string;
          performance: Json | null;
          platform: string;
          published_url: string | null;
          scheduled_date: string | null;
          script: Json | null;
          sound_design: Json | null;
          status: string;
          title: string | null;
          topic: string;
          user_id: string;
          video_size: string | null;
          voiceover_voice_id: string | null;
          workflow_step: number;
        };
        Insert: {
          analysis?: Json | null;
          assets?: Json | null;
          competitor_analysis?: Json | null;
          final_video_url?: string | null;
          id?: string;
          last_performance_check?: string | null;
          last_updated?: string;
          launch_plan?: Json | null;
          moodboard?: string[] | null;
          name: string;
          performance?: Json | null;
          platform: string;
          published_url?: string | null;
          scheduled_date?: string | null;
          script?: Json | null;
          sound_design?: Json | null;
          status: string;
          title?: string | null;
          topic: string;
          user_id: string;
          video_size?: string | null;
          voiceover_voice_id?: string | null;
          workflow_step: number;
        };
        Update: {
          analysis?: Json | null;
          assets?: Json | null;
          competitor_analysis?: Json | null;
          final_video_url?: string | null;
          id?: string;
          last_performance_check?: string | null;
          last_updated?: string;
          launch_plan?: Json | null;
          moodboard?: string[] | null;
          name?: string;
          performance?: Json | null;
          platform?: string;
          published_url?: string | null;
          scheduled_date?: string | null;
          script?: Json | null;
          sound_design?: Json | null;
          status?: string;
          title?: string | null;
          topic?: string;
          user_id?: string;
          video_size?: string | null;
          voiceover_voice_id?: string | null;
          workflow_step?: number;
        };
      };
      user_youtube_tokens: {
        Row: {
          access_token: string;
          created_at: string;
          expires_at: string;
          refresh_token: string;
          scope: string;
          user_id: string;
        };
        Insert: {
          access_token: string;
          created_at?: string;
          expires_at: string;
          refresh_token: string;
          scope: string;
          user_id: string;
        };
        Update: {
          access_token?: string;
          created_at?: string;
          expires_at?: string;
          refresh_token?: string;
          scope?: string;
          user_id?: string;
        };
      };
      video_jobs: {
        Row: {
          id: string;
          created_at: string;
          project_id: string;
          user_id: string;
          status: string;
          job_payload: Json | null;
          updated_at: string;
          error_message: string | null;
          output_url: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          project_id: string;
          user_id: string;
          status?: string;
          job_payload?: Json | null;
          updated_at?: string;
          error_message?: string | null;
          output_url?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          project_id?: string;
          user_id?: string;
          status?: string;
          job_payload?: Json | null;
          updated_at?: string;
          error_message?: string | null;
          output_url?: string | null;
        };
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};


