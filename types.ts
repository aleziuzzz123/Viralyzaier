export type PlanId = 'free' | 'pro' | 'viralyzaier';
export type ScriptGoal = 'educate' | 'subscribe' | 'sell' | 'entertain';
export type Platform = 'youtube_long' | 'youtube_short' | 'tiktok' | 'instagram';
export type ProjectStatus = 'Idea' | 'Scripting' | 'Scheduled' | 'Published' | 'Autopilot';
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

export interface Subtitle {
    id: string;
    text: string;
    start: number;
    end: number;
    style: {
        color: string;
        backgroundColor: string;
    };
    isEditing?: boolean;
}

export interface SFXClip {
    id: string;
    name: string;
    url: string;
    startTime: number;
}

export interface TimelineState {
    subtitles: Subtitle[];
    musicUrl: string | null;
    voiceoverVolume: number;
    musicVolume: number;
    sfx: SFXClip[];
    isDuckingEnabled: boolean;
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
    activeBrandIdentityId?: string | null;
    style: VideoStyle | null;
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

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
          cloned_voices: Json[] | null
          stripe_customer_id: string | null
        }
        Insert: {
          id: string
          email: string
          subscription?: Json
          ai_credits?: number
          channel_audit?: Json | null
          content_pillars?: string[] | null
          cloned_voices?: Json[] | null
          stripe_customer_id?: string | null
        }
        Update: {
          id?: string
          email?: string
          subscription?: Json
          ai_credits?: number
          channel_audit?: Json | null
          content_pillars?: string[] | null
          cloned_voices?: Json[] | null
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
          active_brand_identity_id: string | null
          style: string | null
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
          active_brand_identity_id?: string | null
          style?: string | null
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
          active_brand_identity_id?: string | null
          style?: string | null
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
          user_id?: string
          access_token?: string
          refresh_token?: string
          expires_at?: string
          scope?: string
        }
        Relationships: []
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
}