export type PlanId = 'free' | 'pro' | 'viralyzaier';

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  creditLimit: number;
  features: string[];
  isMostPopular?: boolean;
}

export interface User {
  id:string;
  email: string;
  subscription: {
    planId: PlanId;
    status: 'active' | 'canceled';
    endDate: number | null;
  };
  aiCredits: number;
  channelAudit: ChannelAudit | null;
}

export type ProjectStatus = 'Idea' | 'Scripting' | 'Scheduled' | 'Published';
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
    images: string[]; // base64 strings
    graphics: string[]; // base64 strings
    audio?: string; // base64 string
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