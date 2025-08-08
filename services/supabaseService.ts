import { supabase, supabaseUrl, supabaseAnonKey } from './supabaseClient.js';
import { 
    Project, 
    User, 
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
    ChannelAudit,
    Database,
    Notification,
    ClonedVoice,
    Subscription,
    Json,
    UserAsset,
    BrandIdentity,
    TimelineState,
    VideoStyle,
} from '../types.js';
import { type AuthSession, type FunctionInvokeOptions, type PostgrestError } from '@supabase/supabase-js';
import { PLANS } from './paymentService.js';

// --- Type Guards for Data Validation ---
const isValidSubscription = (sub: any): sub is Subscription => {
    return sub && typeof sub === 'object' &&
           ['free', 'pro', 'viralyzaier'].includes(sub.planId) &&
           ['active', 'canceled'].includes(sub.status);
};


// --- Mappers ---
export const profileRowToUser = (row: Database['public']['Tables']['profiles']['Row'], youtubeConnected: boolean): User => ({
    id: row.id,
    email: row.email,
    subscription: isValidSubscription(row.subscription) ? row.subscription as unknown as Subscription : { planId: 'free', status: 'active', endDate: null },
    aiCredits: row.ai_credits,
    channelAudit: row.channel_audit as unknown as ChannelAudit | null,
    youtubeConnected,
    content_pillars: row.content_pillars || [],
    cloned_voices: (row.cloned_voices as unknown as ClonedVoice[] | null) || [],
});

const userToProfileUpdate = (updates: Partial<User>): Database['public']['Tables']['profiles']['Update'] => {
    const dbUpdates: Database['public']['Tables']['profiles']['Update'] = {};
    if (updates.aiCredits !== undefined) dbUpdates.ai_credits = updates.aiCredits;
    if (updates.channelAudit !== undefined) dbUpdates.channel_audit = updates.channelAudit;
    if (updates.cloned_voices !== undefined) dbUpdates.cloned_voices = updates.cloned_voices;
    if (updates.content_pillars !== undefined) dbUpdates.content_pillars = updates.content_pillars;
    if (updates.subscription !== undefined) dbUpdates.subscription = updates.subscription;
    return dbUpdates;
};

export const projectRowToProject = (row: Database['public']['Tables']['projects']['Row']): Project => ({
    id: row.id,
    name: row.name,
    topic: row.topic,
    platform: row.platform as Platform,
    status: row.status as ProjectStatus,
    title: row.title,
    script: row.script as unknown as Script | null,
    analysis: row.analysis as unknown as Analysis | null,
    competitorAnalysis: row.competitor_analysis as unknown as CompetitorAnalysisResult | null,
    moodboard: row.moodboard,
    assets: (row.assets as unknown as { [sceneIndex: number]: SceneAssets }) || {},
    soundDesign: row.sound_design as unknown as SoundDesign | null,
    launchPlan: row.launch_plan as unknown as LaunchPlan | null,
    performance: row.performance as unknown as VideoPerformance | null,
    scheduledDate: row.scheduled_date,
    publishedUrl: row.published_url,
    lastUpdated: row.last_updated,
    workflowStep: row.workflow_step as WorkflowStep,
    voiceoverVoiceId: row.voiceover_voice_id,
    last_performance_check: row.last_performance_check,
    timeline: row.timeline as unknown as TimelineState | null,
});

// --- Edge Function Invoker ---
export const invokeEdgeFunction = async <T>(
    functionName: string,
    body: object,
    responseType: 'json' | 'blob' = 'json'
  ): Promise<T> => {
    // For FormData, we don't stringify the body
    const isFormData = body instanceof FormData;
  
    const options: FunctionInvokeOptions = {
      body: isFormData ? body : JSON.stringify(body),
    };
  
    // For FormData, let the browser set the Content-Type header
    if (!isFormData) {
      options.headers = { 'Content-Type': 'application/json' };
    }
  
    const { data, error } = await supabase.functions.invoke(functionName, options);
    
    if (error) {
      // Attempt to parse a more specific error message from the function's response
      if (error instanceof Error && error.message.includes('Function returned an error')) {
        try {
          const errBody = JSON.parse(error.message.substring(error.message.indexOf('{')));
          if (errBody.error) {
            throw new Error(errBody.error);
          }
        } catch (e) {
          // Fallback to original error if parsing fails
        }
      }
      throw error;
    }
  
    if (responseType === 'blob') {
      return data as T;
    }
    
    // The edge function response might be a stringified JSON.
    if (typeof data === 'string') {
      try {
        return JSON.parse(data) as T;
      } catch {
        // It might just be a plain string response
        return data as T;
      }
    }
    return data as T;
  };

// --- Auth ---
export const getSession = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data;
};

export const onAuthStateChange = (callback: (event: string, session: AuthSession | null) => void) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
    return subscription;
};

export const signInWithPassword = async (email: string, password: string): Promise<AuthSession | null> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.session;
};

export const signUp = async (email: string, password: string): Promise<void> => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
};

export const sendPasswordResetEmail = async (email: string): Promise<void> => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    if (error) throw error;
};

export const signOut = async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
};

// --- Profiles ---
export const getUserProfile = async (userId: string): Promise<User | null> => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
    }
    if (!data) return null;
    
    const { data: tokenData, error: tokenError } = await supabase.from('user_youtube_tokens').select('user_id').eq('user_id', userId).maybeSingle();
    if(tokenError) {
        console.warn("Could not check for YouTube token:", tokenError.message);
    }

    return profileRowToUser(data, !!tokenData);
};

export const createProfileForUser = async (userId: string, email: string): Promise<User> => {
    const freePlan = PLANS.find(p => p.id === 'free')!;
    const newUserProfile: Database['public']['Tables']['profiles']['Insert'] = {
        id: userId,
        email: email,
        subscription: { planId: 'free', status: 'active', endDate: null },
        ai_credits: freePlan.creditLimit,
    };
    const { data, error } = await supabase.from('profiles').insert(newUserProfile).select().single();
    if (error) throw error;
    if (!data) throw new Error("Failed to create profile: no data returned.");
    return profileRowToUser(data, false);
};

export const updateUserProfile = async (userId: string, updates: Partial<User>): Promise<User> => {
    const dbUpdates = userToProfileUpdate(updates);
    const { data, error } = await supabase.from('profiles').update(dbUpdates).eq('id', userId).select().single();
    if (error) throw error;
    if (!data) throw new Error("Failed to update profile: no data returned.");
    const { data: tokenData } = await supabase.from('user_youtube_tokens').select('user_id').eq('user_id', userId).maybeSingle();
    return profileRowToUser(data, !!tokenData);
};

// --- Projects ---
export const getProjectsForUser = async (userId: string): Promise<Project[]> => {
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('last_updated', { ascending: false });
    if (error) throw error;
    return (data || []).map(p => projectRowToProject(p));
};

export const createProject = async (projectData: Omit<Project, 'id' | 'lastUpdated'>, userId: string): Promise<Project> => {
    const newProjectData: Database['public']['Tables']['projects']['Insert'] = {
        user_id: userId,
        name: projectData.name,
        topic: projectData.topic,
        platform: projectData.platform,
        status: projectData.status,
        workflow_step: projectData.workflowStep,
        title: projectData.title,
        script: projectData.script,
        analysis: projectData.analysis,
        competitor_analysis: projectData.competitorAnalysis,
        moodboard: projectData.moodboard,
        assets: projectData.assets,
        sound_design: projectData.soundDesign,
        launch_plan: projectData.launchPlan,
        performance: projectData.performance,
        scheduled_date: projectData.scheduledDate,
        published_url: projectData.publishedUrl,
        last_performance_check: projectData.last_performance_check,
        timeline: projectData.timeline,
        voiceover_voice_id: projectData.voiceoverVoiceId
    };
    
    const { data, error } = await supabase
        .from('projects')
        .insert(newProjectData)
        .select()
        .single();
    if (error) throw error;
    if (!data) throw new Error("Failed to create project: no data returned.");
    return projectRowToProject(data);
};

export const updateProject = async (projectId: string, updates: Partial<Project>): Promise<Project> => {
    const dbUpdates: Database['public']['Tables']['projects']['Update'] = { last_updated: new Date().toISOString() };
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.topic !== undefined) dbUpdates.topic = updates.topic;
    if (updates.platform !== undefined) dbUpdates.platform = updates.platform;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.workflowStep !== undefined) dbUpdates.workflow_step = updates.workflowStep;
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.script !== undefined) dbUpdates.script = updates.script;
    if (updates.analysis !== undefined) dbUpdates.analysis = updates.analysis;
    if (updates.competitorAnalysis !== undefined) dbUpdates.competitor_analysis = updates.competitorAnalysis;
    if (updates.moodboard !== undefined) dbUpdates.moodboard = updates.moodboard;
    if (updates.assets !== undefined) dbUpdates.assets = updates.assets;
    if (updates.soundDesign !== undefined) dbUpdates.sound_design = updates.soundDesign;
    if (updates.launchPlan !== undefined) dbUpdates.launch_plan = updates.launchPlan;
    if (updates.performance !== undefined) dbUpdates.performance = updates.performance;
    if (updates.scheduledDate !== undefined) dbUpdates.scheduled_date = updates.scheduledDate;
    if (updates.publishedUrl !== undefined) dbUpdates.published_url = updates.publishedUrl;
    if (updates.voiceoverVoiceId !== undefined) dbUpdates.voiceover_voice_id = updates.voiceoverVoiceId;
    if (updates.timeline !== undefined) dbUpdates.timeline = updates.timeline;
    
    const { data, error } = await supabase.from('projects').update(dbUpdates).eq('id', projectId).select().single();
    if (error) throw error;
    if (!data) throw new Error("Failed to update project: no data returned.");
    return projectRowToProject(data);
};

export const deleteProject = async (projectId: string): Promise<void> => {
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) throw error;
};

// --- Notifications ---
export const notificationRowToNotification = (row: Database['public']['Tables']['notifications']['Row']): Notification => ({
    id: row.id,
    user_id: row.user_id,
    project_id: row.project_id,
    message: row.message,
    is_read: row.is_read,
    created_at: row.created_at,
});

export const getNotifications = async (userId: string): Promise<Notification[]> => {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(notificationRowToNotification);
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
    const updates: Database['public']['Tables']['notifications']['Update'] = { is_read: true };
    const { error } = await supabase.from('notifications').update(updates).eq('id', notificationId);
    if (error) throw error;
};

export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
    const updates: Database['public']['Tables']['notifications']['Update'] = { is_read: true };
    const { error } = await supabase.from('notifications').update(updates).eq('user_id', userId);
    if (error) throw error;
};

// --- Brand Identity ---
const brandIdentityRowToBrandIdentity = (row: Database['public']['Tables']['brand_identities']['Row']): BrandIdentity => ({
    id: row.id,
    user_id: row.user_id,
    created_at: row.created_at,
    name: row.name,
    toneOfVoice: row.tone_of_voice,
    writingStyleGuide: row.writing_style_guide,
    colorPalette: row.color_palette as unknown as { primary: string, secondary: string, accent: string },
    fontSelection: row.font_selection,
    thumbnailFormula: row.thumbnail_formula,
    visualStyleGuide: row.visual_style_guide,
    targetAudience: row.target_audience,
    channelMission: row.channel_mission,
    logoUrl: row.logo_url ?? undefined,
});

export const getBrandIdentitiesForUser = async (userId: string): Promise<BrandIdentity[]> => {
    const { data, error } = await supabase
        .from('brand_identities')
        .select('*')
        .eq('user_id', userId);
    if (error) throw error;
    return (data || []).map(brandIdentityRowToBrandIdentity);
};

export const createBrandIdentity = async (identityData: Omit<BrandIdentity, 'id' | 'created_at' | 'user_id'>, userId: string): Promise<BrandIdentity> => {
    const newIdentityData: Database['public']['Tables']['brand_identities']['Insert'] = {
        user_id: userId,
        name: identityData.name,
        tone_of_voice: identityData.toneOfVoice,
        writing_style_guide: identityData.writingStyleGuide,
        color_palette: identityData.colorPalette,
        font_selection: identityData.fontSelection,
        thumbnail_formula: identityData.thumbnailFormula,
        visual_style_guide: identityData.visualStyleGuide,
        target_audience: identityData.targetAudience,
        channel_mission: identityData.channelMission,
        logo_url: identityData.logoUrl ?? null
    };
    const { data, error } = await supabase.from('brand_identities').insert(newIdentityData).select().single();
    if (error) throw error;
    if (!data) throw new Error("Failed to create brand identity: no data returned.");
    return brandIdentityRowToBrandIdentity(data);
};

export const updateBrandIdentity = async (identityId: string, updates: Partial<Omit<BrandIdentity, 'id' | 'created_at' | 'user_id'>>): Promise<BrandIdentity> => {
    const dbUpdates: Database['public']['Tables']['brand_identities']['Update'] = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.toneOfVoice !== undefined) dbUpdates.tone_of_voice = updates.toneOfVoice;
    if (updates.writingStyleGuide !== undefined) dbUpdates.writing_style_guide = updates.writingStyleGuide;
    if (updates.colorPalette !== undefined) dbUpdates.color_palette = updates.colorPalette;
    if (updates.fontSelection !== undefined) dbUpdates.font_selection = updates.fontSelection;
    if (updates.thumbnailFormula !== undefined) dbUpdates.thumbnail_formula = updates.thumbnailFormula;
    if (updates.visualStyleGuide !== undefined) dbUpdates.visual_style_guide = updates.visualStyleGuide;
    if (updates.targetAudience !== undefined) dbUpdates.target_audience = updates.targetAudience;
    if (updates.channelMission !== undefined) dbUpdates.channel_mission = updates.channelMission;
    if (updates.logoUrl !== undefined) dbUpdates.logo_url = updates.logoUrl;

    const { data, error } = await supabase
        .from('brand_identities')
        .update(dbUpdates)
        .eq('id', identityId)
        .select()
        .single();
        
    if (error) throw error;
    if (!data) throw new Error("Failed to update brand identity: no data returned.");
    return brandIdentityRowToBrandIdentity(data);
};

export const deleteBrandIdentity = async (identityId: string): Promise<void> => {
    const { error } = await supabase.from('brand_identities').delete().eq('id', identityId);
    if (error) throw error;
};

// --- Storage & Asset Helpers ---

export const uploadFile = async (file: Blob, path: string): Promise<string> => {
    const { data, error } = await supabase.storage
        .from('assets') // Assuming a bucket named 'assets'
        .upload(path, file, {
            cacheControl: '3600',
            upsert: true, // Overwrite if file exists
        });

    if (error) {
        console.error("Supabase upload error:", error);
        throw new Error(`Failed to upload file to Supabase Storage: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(path);
    if (!publicUrl) {
        throw new Error("Could not get public URL for uploaded file.");
    }
    return publicUrl;
};

export const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
    const res = await fetch(dataUrl);
    return await res.blob();
};