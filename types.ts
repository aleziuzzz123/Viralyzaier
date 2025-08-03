export type PlanId = 'free' | 'pro' | 'viralyzaier';

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
  endDate: number | null;
}

export interface User {
  id:string;
  email: string;
  subscription: Subscription;
  aiCredits: number;
  channelAudit: ChannelAudit | null;
  youtubeConnected: boolean;
  content_pillars?: string[];
  cloned_voices?: ClonedVoice[];
}

export type ProjectStatus = 'Idea' | 'Scripting' | 'Scheduled' | 'Published' | 'Autopilot';
export type Platform = 'youtube' | 'tiktok' | 'instagram';
export type WorkflowStep = 1 | 2 | 3 | 4 | 5 | 6;


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
  moodboard: string[] | null; // array of image urls/base64
  assets: { [key: string]: SceneAssets }; // scene index -> assets
  soundDesign: SoundDesign | null;
  launchPlan: LaunchPlan | null;
  performance: VideoPerformance | null;
  scheduledDate: string | null; // ISO string
  publishedUrl?: string;
  lastUpdated: string; // ISO string
  workflowStep: WorkflowStep;
  voiceId?: string;
  last_performance_check?: string; // ISO string
}

export interface Notification {
    id: string;
    user_id: string;
    project_id?: string;
    message: string;
    is_read: boolean;
    created_at: string;
}

export interface Script {
  hooks: string[];
  scenes: {
    timecode: string; // e.g., "0-3s"
    visual: string;
    voiceover: string;
    onScreenText: string;
  }[];
  cta: string;
}

export interface ScriptOptimization {
  initialScore: number;
  finalScore: number;
  analysisLog: {
    step: string;
    target: 'hooks' | 'cta' | `scene-${number}`;
  }[];
  finalScript: Script;
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
  improvements: { suggestion: string; reason:string }[];
}

export interface Blueprint {
  platform: Platform;
  strategicSummary: string;
  suggestedTitles: string[];
  script: Script;
  moodboard: string[]; // array of image urls
}

export interface ContentGapSuggestion {
  idea: string;
  reason: string;
  potentialTitles: string[];
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

export interface CompetitorAnalysisResult {
    videoTitle: string;
    viralityDeconstruction: string;
    stealableStructure: { step: string; description: string }[];
    extractedKeywords: string[];
    suggestedTitles: string[];
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

export interface VideoPerformance {
    views: number;
    likes: number;
    comments: number;
    retention: number;
}

export interface PerformanceReview {
    summary: string;
    whatWorked: string[];
    whatToImprove: string[];
}

export interface TrendData {
  interestOverTime: InterestPoint[];
  breakoutQueries: RelatedQuery[];
  topQueries: RelatedQuery[];
  groundingMetadata?: { uri: string; title: string; }[];
}

export interface InterestPoint {
  time: string;
  value: number;
}

export interface RelatedQuery {
  query: string;
  value: string;
}

export interface VideoDetails {
  title: string;
  transcript: string;
}

export interface SceneAssets {
    brollVideo?: string; // URL to the generated video
    graphics: string[]; // base64 strings for overlays
    audio?: string; // URL to the generated audio
}

export interface SoundDesign {
    music: string;
    sfx: {
        timecode: string;
        description: string;
    }[];
}

export interface LaunchPlan {
    seo?: {
        description: string;
        tags: string[];
    };
    thumbnails?: string[];
    promotionPlan?: {
        platform: string;
        action: string;
    }[];
}

export interface ChannelAudit {
    contentPillars: string[];
    audiencePersona: string;
    viralFormula: string;
    opportunities: Opportunity[];
}

export interface Opportunity {
    idea: string;
    reason: string;
    suggestedTitle: string;
    type: 'Quick Win' | 'Growth Bet' | 'Experimental';
}


// --- SUPABASE TYPE DEFINITIONS ---
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          subscription: Json
          ai_credits: number
          channel_audit: Json | null
          stripe_customer_id?: string | null
          content_pillars?: string[] | null
          cloned_voices?: Json | null
        }
        Insert: {
            id: string;
            email: string;
            subscription?: Json;
            ai_credits?: number;
            channel_audit?: Json | null;
            stripe_customer_id?: string | null;
            content_pillars?: string[] | null;
            cloned_voices?: Json | null;
        }
        Update: {
            email?: string;
            subscription?: Json;
            ai_credits?: number;
            channel_audit?: Json | null;
            stripe_customer_id?: string | null;
            content_pillars?: string[] | null;
            cloned_voices?: Json | null;
        }
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          user_id: string
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
          last_updated: string
          workflow_step: number
          voice_id: string | null
          last_performance_check: string | null
        }
        Insert: {
            id?: string;
            user_id: string;
            name: string;
            topic: string;
            platform: string;
            status: string;
            title?: string | null;
            script?: Json | null;
            analysis?: Json | null;
            competitor_analysis?: Json | null;
            moodboard?: string[] | null;
            assets?: Json | null;
            sound_design?: Json | null;
            launch_plan?: Json | null;
            performance?: Json | null;
            scheduled_date?: string | null;
            published_url?: string | null;
            workflow_step: number;
            voice_id?: string | null;
            last_performance_check?: string | null;
        }
        Update: {
            name?: string;
            topic?: string;
            platform?: string;
            status?: string;
            title?: string | null;
            script?: Json | null;
            analysis?: Json | null;
            competitor_analysis?: Json | null;
            moodboard?: string[] | null;
            assets?: Json | null;
            sound_design?: Json | null;
            launch_plan?: Json | null;
            performance?: Json | null;
            scheduled_date?: string | null;
            published_url?: string | null;
            workflow_step?: number;
            voice_id?: string | null;
            last_performance_check?: string | null;
        }
        Relationships: []
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
          access_token?: string;
          refresh_token?: string;
          expires_at?: string;
          scope?: string;
        }
        Relationships: []
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
        }
        Update: {
          project_id?: string | null;
          message?: string;
          is_read?: boolean;
        }
        Relationships: []
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
};
