


import { createClient, type AuthSession } from '@supabase/supabase-js';
import { 
    Project, 
    User, 
    PlanId,
    ProjectStatus,
    Platform,
    WorkflowStep,
    Script,
    Analysis,
    CompetitorAnalysisResult,
    SceneAssets,
    SoundDesign,
    LaunchPlan,
    VideoPerformance,
    ChannelAudit
} from '../types';
import { PLANS } from './paymentService';

// Define a JSON type to prevent deep type instantiation errors with Supabase.
// Replacing the recursive `Json` type with `any` to break the type instantiation loop
// that causes "excessively deep" errors. Type safety is maintained by the application-level
// types (User, Project) and the mapping functions.
export type Json = any;

// By defining Row types separately and then using them to construct the Database type
// with explicit Insert and Update types, we prevent TypeScript from getting lost in 
// deep recursive type inference, which was causing "type instantiation is excessively deep" errors.
type ProfileRow = {
  id: string
  email: string
  subscription: Json
  ai_credits: number
  channel_audit: Json | null
  stripe_customer_id?: string | null
};

type ProjectRow = {
  id: string
  user_id: string
  name: string
  topic: string
  platform: Platform
  status: ProjectStatus
  title: string | null
  script: Json | null
  analysis: Json | null
  competitor_analysis: Json | null
  moodboard: Json | null
  assets: Json | null
  sound_design: Json | null
  launch_plan: Json | null
  performance: Json | null
  scheduled_date: string | null
  published_url: string | null
  last_updated: string
  workflow_step: WorkflowStep
};

// Explicitly defining Insert and Update types for each table. This resolves the
// "type instantiation is excessively deep" and "not assignable to never" errors
// that can occur when the Supabase client struggles with complex type inference.
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: {
          id?: string;
          email?: string;
          subscription?: Json;
          ai_credits?: number;
          channel_audit?: Json | null;
          stripe_customer_id?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          subscription?: Json;
          ai_credits?: number;
          channel_audit?: Json | null;
          stripe_customer_id?: string | null;
        };
      };
      projects: {
        Row: ProjectRow;
        Insert: {
          id?: string;
          user_id?: string;
          name?: string;
          topic?: string;
          platform?: Platform;
          status?: ProjectStatus;
          title?: string | null;
          script?: Json | null;
          analysis?: Json | null;
          competitor_analysis?: Json | null;
          moodboard?: Json | null;
          assets?: Json | null;
          sound_design?: Json | null;
          launch_plan?: Json | null;
          performance?: Json | null;
          scheduled_date?: string | null;
          published_url?: string | null;
          last_updated?: string;
          workflow_step?: WorkflowStep;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          topic?: string;
          platform?: Platform;
          status?: ProjectStatus;
          title?: string | null;
          script?: Json | null;
          analysis?: Json | null;
          competitor_analysis?: Json | null;
          moodboard?: Json | null;
          assets?: Json | null;
          sound_design?: Json | null;
          launch_plan?: Json | null;
          performance?: Json | null;
          scheduled_date?: string | null;
          published_url?: string | null;
          last_updated?: string;
          workflow_step?: WorkflowStep;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      consume_credits_atomic: {
        Args: { amount_to_consume: number };
        Returns: { success: boolean; message: string; newCredits: number };
      };
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL and Anon Key are not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.");
}

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// --- Mappers ---
const profileRowToUser = (row: ProfileRow): User => ({
    id: row.id,
    email: row.email,
    subscription: row.subscription as unknown as User['subscription'],
    aiCredits: row.ai_credits,
    channelAudit: row.channel_audit as unknown as User['channelAudit'],
});

const userToProfileUpdate = (updates: Partial<User>): Partial<ProfileRow> => {
    const dbUpdates: Partial<ProfileRow> = {};
    if (updates.aiCredits !== undefined) dbUpdates.ai_credits = updates.aiCredits;
    if (updates.channelAudit !== undefined) dbUpdates.channel_audit = updates.channelAudit as unknown as Json;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.subscription !== undefined) dbUpdates.subscription = updates.subscription as unknown as Json;
    return dbUpdates;
};

const projectRowToProject = (row: ProjectRow): Project => ({
    id: row.id,
    name: row.name,
    topic: row.topic,
    platform: row.platform,
    status: row.status,
    title: row.title,
    script: row.script as unknown as Script | null,
    analysis: row.analysis as unknown as Analysis | null,
    competitorAnalysis: row.competitor_analysis as unknown as CompetitorAnalysisResult | null,
    moodboard: row.moodboard as unknown as string[] | null,
    assets: (row.assets as unknown as { [key: string]: SceneAssets } | null) || {},
    soundDesign: row.sound_design as unknown as SoundDesign | null,
    launchPlan: row.launch_plan as unknown as LaunchPlan | null,
    performance: row.performance as unknown as VideoPerformance | null,
    scheduledDate: row.scheduled_date,
    publishedUrl: row.published_url || undefined,
    lastUpdated: row.last_updated,
    workflowStep: row.workflow_step,
});

const projectToProjectUpdate = (updates: Partial<Project>): Partial<ProjectRow> => {
    const dbUpdates: Partial<ProjectRow> = {};
    if(updates.name !== undefined) dbUpdates.name = updates.name;
    if(updates.topic !== undefined) dbUpdates.topic = updates.topic;
    if(updates.platform !== undefined) dbUpdates.platform = updates.platform;
    if(updates.status !== undefined) dbUpdates.status = updates.status;
    if(updates.title !== undefined) dbUpdates.title = updates.title;
    if(updates.script !== undefined) dbUpdates.script = updates.script as unknown as Json;
    if(updates.analysis !== undefined) dbUpdates.analysis = updates.analysis as unknown as Json;
    if(updates.competitorAnalysis !== undefined) dbUpdates.competitor_analysis = updates.competitorAnalysis as unknown as Json;
    if(updates.moodboard !== undefined) dbUpdates.moodboard = updates.moodboard as Json;
    if(updates.assets !== undefined) dbUpdates.assets = updates.assets as unknown as Json;
    if(updates.soundDesign !== undefined) dbUpdates.sound_design = updates.soundDesign as unknown as Json;
    if(updates.launchPlan !== undefined) dbUpdates.launch_plan = updates.launchPlan as unknown as Json;
    if(updates.performance !== undefined) dbUpdates.performance = updates.performance as unknown as Json;
    if(updates.scheduledDate !== undefined) dbUpdates.scheduled_date = updates.scheduledDate;
    if(updates.publishedUrl !== undefined) dbUpdates.published_url = updates.publishedUrl;
    if(updates.lastUpdated !== undefined) dbUpdates.last_updated = updates.lastUpdated;
    if(updates.workflowStep !== undefined) dbUpdates.workflow_step = updates.workflowStep;
    return dbUpdates;
}

// --- User & Auth ---

export const getSession = async (): Promise<{ session: AuthSession | null }> => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data;
};

export const onAuthStateChange = (callback: (event: string, session: AuthSession | null) => void) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session);
    });
    return subscription;
};

export const signInWithPassword = async (email: string, password: string): Promise<AuthSession | null> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.session;
};

export const signUp = async (email: string, password: string): Promise<AuthSession | null> => {
    // The database trigger 'on_auth_user_created' now handles profile creation automatically.
    // This makes the client-side logic simpler and more reliable.
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data.session;
};

export const signOut = async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
};

export const sendPasswordResetEmail = async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin, // Or a specific password reset page
    });
    if (error) throw error;
};

export const getUserProfile = async (userId: string): Promise<User | null> => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    
    // The .single() method throws an error if no row is found, which is expected.
    // This will be caught by the calling function.
    if (error) {
        console.error('Error fetching user profile:', error.message);
        return null;
    }
    return data ? profileRowToUser(data) : null;
};

export const updateUserProfile = async (userId: string, updates: Partial<User>): Promise<User> => {
    const dbUpdates = userToProfileUpdate(updates);
    const { data, error } = await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('id', userId)
        .select()
        .single();
    if (error) throw error;
    return profileRowToUser(data);
};

// --- Projects ---
export const getProjectsForUser = async (userId: string): Promise<Project[]> => {
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('last_updated', { ascending: false });
    if (error) throw error;
    return data.map(projectRowToProject);
};

export const createProject = async (projectData: Omit<Project, 'id' | 'lastUpdated'>, userId: string): Promise<Project> => {
    const insertData: Partial<ProjectRow> = {
        user_id: userId,
        name: projectData.name,
        topic: projectData.topic,
        platform: projectData.platform,
        status: projectData.status,
        title: projectData.title,
        script: projectData.script as unknown as Json,
        analysis: projectData.analysis as unknown as Json,
        competitor_analysis: projectData.competitorAnalysis as unknown as Json,
        moodboard: projectData.moodboard as Json,
        assets: projectData.assets as unknown as Json,
        sound_design: projectData.soundDesign as unknown as Json,
        launch_plan: projectData.launchPlan as unknown as Json,
        performance: projectData.performance as unknown as Json,
        scheduled_date: projectData.scheduledDate,
        published_url: projectData.publishedUrl || null,
        workflow_step: projectData.workflowStep,
    };

    const { data, error } = await supabase
        .from('projects')
        .insert([insertData])
        .select()
        .single();

    if (error) throw error;
    return projectRowToProject(data);
};

export const updateProject = async (projectId: string, updates: Partial<Project>): Promise<Project> => {
    const dbUpdates = projectToProjectUpdate({ ...updates, lastUpdated: new Date().toISOString() });
    const { data, error } = await supabase
        .from('projects')
        .update(dbUpdates)
        .eq('id', projectId)
        .select()
        .single();
    if (error) throw error;
    return projectRowToProject(data);
};

export const deleteProject = async (projectId: string): Promise<void> => {
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) throw error;
};

// --- Storage ---
export const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
    const res = await fetch(dataUrl);
    return await res.blob();
};

export const uploadFile = async (file: Blob, path: string): Promise<string> => {
    const { data, error } = await supabase.storage
        .from('assets') // Assuming a bucket named 'assets'
        .upload(path, file, { upsert: true });
    
    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(data.path);
    return publicUrl;
};

// --- Remote Procedure Calls (RPC) ---
export const invokeRpc = async (name: keyof Database['public']['Functions'], params: object): Promise<any> => {
    const { data, error } = await supabase.rpc(name, params);
    if (error) throw error;
    return data;
};

// --- Edge Functions ---
export const invokeEdgeFunction = async (name: string, body: object): Promise<any> => {
    const { data, error } = await supabase.functions.invoke(name, {
        body,
    });
    if (error) throw error;
    return data;
};