import { supabase, supabaseUrl, supabaseAnonKey } from './supabaseClient';
import { 
    Project, 
    User, 
    ProjectStatus,
    Platform,
    WorkflowStep,
    Script,
    Analysis,
    CompetitorAnalysisResult,
    SoundDesign,
    LaunchPlan,
    VideoPerformance,
    ChannelAudit,
    Database,
    Notification,
    ClonedVoice,
    Subscription,
    BrandIdentity,
    Json,
} from '../types';
import { type Session } from '@supabase/supabase-js';
import { PLANS } from './paymentService';
import { getErrorMessage } from '../utils';

// --- Type Aliases for Supabase Payloads ---
type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
type ProjectUpdate = Database['public']['Tables']['projects']['Update'];
type NotificationUpdate = Database['public']['Tables']['notifications']['Update'];
type BrandIdentityInsert = Database['public']['Tables']['brand_identities']['Insert'];
type BrandIdentityUpdate = Database['public']['Tables']['brand_identities']['Update'];

// --- Type Guards for Data Validation ---
const isValidSubscription = (sub: any): sub is Subscription => {
    return sub && typeof sub === 'object' &&
           ['free', 'pro', 'viralyzaier'].includes(sub.planId) &&
           ['active', 'canceled'].includes(sub.status);
};

// Helper to sanitize JSON before sending it to Supabase
const sanitizeJson = (value: any) => {
    // Simple deep-copy for safety. Prevents issues with complex objects.
    return value ? JSON.parse(JSON.stringify(value)) : null;
}


// --- Mappers ---
export const profileRowToUser = (row: any, youtubeConnected: boolean): User => ({
    id: row.id,
    email: row.email,
    subscription: isValidSubscription(row.subscription) ? row.subscription as Subscription : { planId: 'free', status: 'active', endDate: null },
    aiCredits: row.ai_credits,
    channelAudit: row.channel_audit as unknown as ChannelAudit | null,
    youtubeConnected,
    content_pillars: row.content_pillars || [],
    cloned_voices: (row.cloned_voices as unknown as ClonedVoice[] | null) || [],
});

const userToProfileUpdate = (updates: Partial<User>): ProfileUpdate => {
    const dbUpdates: ProfileUpdate = {};
    if (updates.aiCredits !== undefined) dbUpdates.ai_credits = updates.aiCredits;
    if (updates.channelAudit !== undefined) dbUpdates.channel_audit = sanitizeJson(updates.channelAudit);
    if (updates.cloned_voices !== undefined) dbUpdates.cloned_voices = sanitizeJson(updates.cloned_voices);
    if (updates.content_pillars !== undefined) dbUpdates.content_pillars = updates.content_pillars;
    if (updates.subscription !== undefined) dbUpdates.subscription = sanitizeJson(updates.subscription);
    return dbUpdates;
};

export const projectRowToProject = (row: any): Project => ({
    id: row.id,
    name: row.name,
    topic: row.topic,
    platform: row.platform as Platform,
    videoSize: (row.video_size as Project['videoSize']) || '16:9',
    status: row.status as ProjectStatus,
    title: row.title || null,
    script: (row.script as unknown as Script | null) || null,
    analysis: (row.analysis as unknown as Analysis | null) || null,
    competitorAnalysis: (row.competitor_analysis as unknown as CompetitorAnalysisResult | null) || null,
    moodboard: row.moodboard || null,
    assets: (row.assets as any) || {},
    soundDesign: (row.sound_design as unknown as SoundDesign | null) || null,
    launchPlan: (row.launch_plan as unknown as LaunchPlan | null) || null,
    performance: (row.performance as unknown as VideoPerformance | null) || null,
    scheduledDate: row.scheduled_date || null,
    publishedUrl: row.published_url || null,
    lastUpdated: row.last_updated,
    workflowStep: row.workflow_step as WorkflowStep,
    voiceoverVoiceId: row.voiceover_voice_id || null,
    last_performance_check: row.last_performance_check || null,
    final_video_url: row.final_video_url || null,
});


// --- Edge Function Invoker ---
export const invokeEdgeFunction = async <T>(
    functionName: string,
    body: object,
    responseType: 'json' | 'blob' = 'json'
  ): Promise<T> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        throw new Error('User not authenticated. Cannot invoke function.');
    }
    
    const isFormData = body instanceof FormData;
    const headers: HeadersInit = {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': supabaseAnonKey,
    };
    if (!isFormData) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
        method: 'POST',
        headers: headers,
        body: isFormData ? body : JSON.stringify(body),
    });

    if (!response.ok) {
        let errorBodyText = await response.text();
        let errorMessage = `Edge Function '${functionName}' failed with status ${response.status}: ${errorBodyText.substring(0, 500)}`;
        try {
            const errorJson = JSON.parse(errorBodyText);
            const errorContent = errorJson.error || errorJson;
            if (typeof errorContent === 'string') {
                errorMessage = errorContent;
            } else {
                errorMessage = JSON.stringify(errorContent);
            }
        } catch (e) {
            // Not JSON, use the raw text. The default errorMessage is fine.
        }
        throw new Error(errorMessage);
    }
    
    if (responseType === 'blob') {
      return await response.blob() as T;
    }
    
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      if (responseType === 'json') {
          throw new Error(`Edge Function '${functionName}' returned an empty successful response, but JSON was expected.`);
      }
      return null as T;
    }

    return await response.json() as T;
  };

// --- Auth ---
export const getSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return { session };
};

export const onAuthStateChange = (callback: (event: string, session: Session | null) => void) => {
    const { data: subscription } = supabase.auth.onAuthStateChange(callback as any);
    return subscription;
};

export const signInWithPassword = async (email: string, password: string): Promise<Session | null> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(getErrorMessage(error));
    return data.session;
};

export const signUp = async (email: string, password: string): Promise<void> => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(getErrorMessage(error));
};

export const sendPasswordResetEmail = async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    if (error) throw new Error(getErrorMessage(error));
};

export const signOut = async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(getErrorMessage(error));
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
        throw new Error(getErrorMessage(error));
    }
    if (!data) return null;
    
    const { data: tokenData, error: tokenError } = await supabase.from('user_youtube_tokens').select('user_id').eq('user_id', userId).maybeSingle();
    if(tokenError) {
        console.warn("Could not check for YouTube token:", tokenError.message);
    }

    return profileRowToUser(data, !!tokenData);
};

export const createProfileForUser = async (userId: string, email: string | null | undefined): Promise<User> => {
    const freePlan = PLANS.find(p => p.id === 'free')!;
    const fallbackEmail = email || `user_${userId.split('-')[0]}@viralyzaier.app`;
    const newUserProfile: ProfileInsert = {
        id: userId,
        email: fallbackEmail,
        subscription: { planId: 'free', status: 'active', endDate: null },
        ai_credits: freePlan.creditLimit,
    };
    const { data, error } = await supabase.from('profiles').insert([newUserProfile]).select('*').single();
    if (error) throw new Error(getErrorMessage(error));
    if (!data) throw new Error("Failed to create profile: no data returned.");
    return profileRowToUser(data, false);
};

export const updateUserProfile = async (userId: string, updates: Partial<User>): Promise<User> => {
    const dbUpdates: ProfileUpdate = userToProfileUpdate(updates);
    const { data, error } = await supabase.from('profiles').update(dbUpdates).eq('id', userId).select('*').single();
    if (error) throw new Error(getErrorMessage(error));
    if (!data) throw new Error("Failed to update profile: no data returned.");
    const { data: tokenData } = await supabase.from('user_youtube_tokens').select('user_id').eq('user_id', userId).maybeSingle();
    return profileRowToUser(data, !!tokenData);
};

// --- Projects ---
const DASHBOARD_PROJECT_COLUMNS = 'id, name, topic, platform, status, last_updated, published_url, scheduled_date, workflow_step';

export const getProjectsForUser = async (userId: string): Promise<Project[]> => {
    const { data, error } = await supabase
        .from('projects')
        .select(DASHBOARD_PROJECT_COLUMNS)
        .eq('user_id', userId)
        .order('last_updated', { ascending: false });
    if (error) throw new Error(getErrorMessage(error));
    return (data || []).map(p => projectRowToProject(p));
};

export const getProjectDetails = async (projectId: string): Promise<Project | null> => {
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
    if (error) {
        if (error.code === 'PGRST116') return null; // Not found is not an error
        throw new Error(getErrorMessage(error));
    }
    return data ? projectRowToProject(data) : null;
};


export const createProject = async (projectData: Omit<Project, 'id' | 'lastUpdated'>, userId: string): Promise<Project> => {
    const newProjectData: ProjectInsert = {
        user_id: userId,
        name: projectData.name,
        topic: projectData.topic,
        platform: projectData.platform,
        video_size: projectData.videoSize,
        status: projectData.status,
        workflow_step: projectData.workflowStep,
        title: projectData.title,
        script: sanitizeJson(projectData.script),
        analysis: sanitizeJson(projectData.analysis),
        competitor_analysis: sanitizeJson(projectData.competitorAnalysis),
        moodboard: projectData.moodboard,
        assets: sanitizeJson(projectData.assets),
        sound_design: sanitizeJson(projectData.soundDesign),
        launch_plan: sanitizeJson(projectData.launchPlan),
        performance: sanitizeJson(projectData.performance),
        scheduled_date: projectData.scheduledDate,
        published_url: projectData.publishedUrl,
        last_performance_check: projectData.last_performance_check,
        voiceover_voice_id: projectData.voiceoverVoiceId,
        final_video_url: projectData.final_video_url,
    };
    
    const { data, error } = await supabase
        .from('projects')
        .insert([newProjectData])
        .select('*')
        .single();
    if (error) throw new Error(getErrorMessage(error));
    if (!data) throw new Error("Failed to create project: no data returned.");
    return projectRowToProject(data);
};

export const updateProject = async (projectId: string, updates: Partial<Project>): Promise<Project> => {
    const dbUpdates: ProjectUpdate = { last_updated: new Date().toISOString() };
    
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.topic !== undefined) dbUpdates.topic = updates.topic;
    if (updates.platform !== undefined) dbUpdates.platform = updates.platform;
    if (updates.videoSize !== undefined) dbUpdates.video_size = updates.videoSize;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.workflowStep !== undefined) dbUpdates.workflow_step = updates.workflowStep;
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.script !== undefined) dbUpdates.script = sanitizeJson(updates.script);
    if (updates.analysis !== undefined) dbUpdates.analysis = sanitizeJson(updates.analysis);
    if (updates.competitorAnalysis !== undefined) dbUpdates.competitor_analysis = sanitizeJson(updates.competitorAnalysis);
    if (updates.moodboard !== undefined) dbUpdates.moodboard = updates.moodboard;
    if (updates.assets !== undefined) dbUpdates.assets = sanitizeJson(updates.assets);
    if (updates.soundDesign !== undefined) dbUpdates.sound_design = sanitizeJson(updates.soundDesign);
    if (updates.launchPlan !== undefined) dbUpdates.launch_plan = sanitizeJson(updates.launchPlan);
    if (updates.performance !== undefined) dbUpdates.performance = sanitizeJson(updates.performance);
    if (updates.scheduledDate !== undefined) dbUpdates.scheduled_date = updates.scheduledDate;
    if (updates.publishedUrl !== undefined) dbUpdates.published_url = updates.publishedUrl;
    if (updates.voiceoverVoiceId !== undefined) dbUpdates.voiceover_voice_id = updates.voiceoverVoiceId;
    if (updates.final_video_url !== undefined) dbUpdates.final_video_url = updates.final_video_url;
    
    const { data, error } = await supabase.from('projects').update(dbUpdates).eq('id', projectId).select('*').single();
    if (error) {
        throw new Error(getErrorMessage(error));
    }
    if (!data) throw new Error("Failed to update project: no data returned.");
    return projectRowToProject(data);
};

export const deleteProject = async (projectId: string): Promise<void> => {
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) throw new Error(getErrorMessage(error));
};

// --- Notifications ---
const notificationRowToNotification = (row: any): Notification => ({
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
    if (error) throw new Error(getErrorMessage(error));
    return (data || []).map(n => notificationRowToNotification(n));
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
    const updates: NotificationUpdate = { is_read: true };
    const { error } = await supabase.from('notifications').update(updates).eq('id', notificationId);
    if (error) throw new Error(getErrorMessage(error));
};

export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
    const updates: NotificationUpdate = { is_read: true };
    const { error } = await supabase.from('notifications').update(updates).eq('user_id', userId);
    if (error) throw new Error(getErrorMessage(error));
};

// --- Brand Identity ---
const brandIdentityRowToBrandIdentity = (row: any): BrandIdentity => ({
    id: row.id,
    user_id: row.user_id,
    created_at: row.created_at,
    name: row.name,
    toneOfVoice: row.tone_of_voice,
    writingStyleGuide: row.writing_style_guide,
    colorPalette: row.color_palette ? (row.color_palette as unknown as BrandIdentity['colorPalette']) : { primary: '#6366f1', secondary: '#ec4899', accent: '#f59e0b' },
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

    if (error) {
        if (error.message.includes('relation "public.brand_identities" does not exist')) {
            console.warn('Brand identities table not found, skipping. This may be expected if the feature is not enabled.');
            return [];
        }
        throw new Error(getErrorMessage(error));
    }
    return (data || []).map(b => brandIdentityRowToBrandIdentity(b));
};

export const createBrandIdentity = async (identityData: Omit<BrandIdentity, 'id' | 'created_at' | 'user_id'>, userId: string): Promise<BrandIdentity> => {
    const newIdentityData: BrandIdentityInsert = {
        user_id: userId,
        name: identityData.name,
        tone_of_voice: identityData.toneOfVoice,
        writing_style_guide: identityData.writingStyleGuide,
        color_palette: identityData.colorPalette as Json,
        font_selection: identityData.fontSelection,
        thumbnail_formula: identityData.thumbnailFormula,
        visual_style_guide: identityData.visualStyleGuide,
        target_audience: identityData.targetAudience,
        channel_mission: identityData.channelMission,
        logo_url: identityData.logoUrl ?? null
    };
    const { data, error } = await supabase.from('brand_identities').insert([newIdentityData]).select('*').single();
    if (error) throw new Error(getErrorMessage(error));
    if (!data) throw new Error("Failed to create brand identity: no data returned.");
    return brandIdentityRowToBrandIdentity(data);
};

export const updateBrandIdentity = async (identityId: string, updates: Partial<Omit<BrandIdentity, 'id' | 'created_at' | 'user_id'>>): Promise<BrandIdentity> => {
    const dbUpdates: BrandIdentityUpdate = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.toneOfVoice !== undefined) dbUpdates.tone_of_voice = updates.toneOfVoice;
    if (updates.writingStyleGuide !== undefined) dbUpdates.writing_style_guide = updates.writingStyleGuide;
    if (updates.colorPalette !== undefined) dbUpdates.color_palette = updates.colorPalette as Json;
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
        .select('*')
        .single();
        
    if (error) throw new Error(getErrorMessage(error));
    if (!data) throw new Error("Failed to update brand identity: no data returned.");
    return brandIdentityRowToBrandIdentity(data);
};

export const deleteBrandIdentity = async (identityId: string): Promise<void> => {
    const { error } = await supabase.from('brand_identities').delete().eq('id', identityId);
    if (error) throw new Error(getErrorMessage(error));
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
        throw new Error(`Failed to upload file to Supabase Storage: ${getErrorMessage(error)}`);
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