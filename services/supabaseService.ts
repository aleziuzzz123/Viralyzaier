
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
} from '../types';
import { type AuthSession, type FunctionInvokeOptions } from '@supabase/supabase-js';
import { PLANS } from './paymentService';

// --- Type Guards for Data Validation ---
const isValidPlatform = (platform: any): platform is Platform => {
    return ['youtube_long', 'youtube_short', 'tiktok', 'instagram'].includes(platform);
};

const isValidStatus = (status: any): status is ProjectStatus => {
    return ['Idea', 'Scripting', 'Rendering', 'Scheduled', 'Published', 'Autopilot'].includes(status);
};

const isValidSubscription = (sub: any): sub is Subscription => {
    return sub && typeof sub === 'object' &&
           ['free', 'pro', 'viralyzaier'].includes(sub.planId) &&
           ['active', 'canceled'].includes(sub.status);
};


// --- Mappers ---
export const profileRowToUser = (row: Database['public']['Tables']['profiles']['Row'], youtubeConnected: boolean): User => ({
    id: row.id,
    email: row.email,
    subscription: isValidSubscription(row.subscription) ? row.subscription : { planId: 'free', status: 'active', endDate: null },
    aiCredits: row.ai_credits,
    channelAudit: row.channel_audit as unknown as ChannelAudit | null,
    youtubeConnected,
    content_pillars: row.content_pillars || [],
    cloned_voices: (row.cloned_voices as unknown as ClonedVoice[] | null) || [],
});

const userToProfileUpdate = (updates: Partial<User>): Database['public']['Tables']['profiles']['Update'] => {
    const dbUpdates: Database['public']['Tables']['profiles']['Update'] = {};
    if (updates.aiCredits !== undefined) dbUpdates.ai_credits = updates.aiCredits;
    if (updates.channelAudit !== undefined) dbUpdates.channel_audit = updates.channelAudit as unknown as Json | null;
    if (updates.cloned_voices !== undefined) dbUpdates.cloned_voices = updates.cloned_voices as unknown as Json | null;
    if (updates.content_pillars !== undefined) dbUpdates.content_pillars = updates.content_pillars;
    if (updates.subscription !== undefined) dbUpdates.subscription = updates.subscription as unknown as Json;
    return dbUpdates;
};

export const projectRowToProject = (row: Database['public']['Tables']['projects']['Row']): Project => ({
    id: row.id,
    name: row.name,
    topic: row.topic,
    platform: isValidPlatform(row.platform) ? row.platform : 'youtube_long',
    status: isValidStatus(row.status) ? row.status : 'Idea',
    title: row.title,
    script: row.script as unknown as Script | null,
    analysis: row.analysis as unknown as Analysis | null,
    competitorAnalysis: row.competitor_analysis as unknown as CompetitorAnalysisResult | null,
    moodboard: row.moodboard,
    assets: (row.assets as unknown as { [sceneIndex: number]: SceneAssets }) || {},
    soundDesign: row.sound_design as unknown as SoundDesign | null,
    launchPlan: row.launch_plan as LaunchPlan | null,
    performance: row.performance as unknown as VideoPerformance | null,
    scheduledDate: row.scheduled_date,
    publishedUrl: row.published_url,
    lastUpdated: row.last_updated,
    workflowStep: row.workflow_step as WorkflowStep,
    voiceoverVoiceId: row.voiceover_voice_id,
    last_performance_check: row.last_performance_check,
});

const projectToProjectUpdate = (updates: Partial<Project>): Database['public']['Tables']['projects']['Update'] => {
    const dbUpdates: Database['public']['Tables']['projects']['Update'] = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.topic !== undefined) dbUpdates.topic = updates.topic;
    if (updates.platform !== undefined) dbUpdates.platform = updates.platform;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.script !== undefined) dbUpdates.script = updates.script as unknown as Json | null;
    if (updates.analysis !== undefined) dbUpdates.analysis = updates.analysis as unknown as Json | null;
    if (updates.competitorAnalysis !== undefined) dbUpdates.competitor_analysis = updates.competitorAnalysis as unknown as Json | null;
    if (updates.moodboard !== undefined) dbUpdates.moodboard = updates.moodboard;
    if (updates.assets !== undefined) dbUpdates.assets = updates.assets as unknown as Json | null;
    if (updates.soundDesign !== undefined) dbUpdates.sound_design = updates.soundDesign as unknown as Json | null;
    if (updates.launchPlan !== undefined) dbUpdates.launch_plan = updates.launchPlan as unknown as Json | null;
    if (updates.performance !== undefined) dbUpdates.performance = updates.performance as unknown as Json | null;
    if (updates.scheduledDate !== undefined) dbUpdates.scheduled_date = updates.scheduledDate;
    if (updates.publishedUrl !== undefined) dbUpdates.published_url = updates.publishedUrl;
    if (updates.workflowStep !== undefined) dbUpdates.workflow_step = updates.workflowStep;
    if (updates.voiceoverVoiceId !== undefined) dbUpdates.voiceover_voice_id = updates.voiceoverVoiceId;
    if (updates.last_performance_check !== undefined) dbUpdates.last_performance_check = updates.last_performance_check;
    
    dbUpdates.last_updated = new Date().toISOString();
    return dbUpdates;
};

export const notificationRowToNotification = (row: Database['public']['Tables']['notifications']['Row']): Notification => ({
    id: row.id,
    user_id: row.user_id,
    project_id: row.project_id,
    message: row.message,
    is_read: row.is_read,
    created_at: row.created_at,
});

export const brandIdentityRowToBrandIdentity = (row: Database['public']['Tables']['brand_identities']['Row']): BrandIdentity => ({
    id: row.id,
    user_id: row.user_id,
    created_at: row.created_at,
    name: row.name,
    toneOfVoice: row.tone_of_voice,
    writingStyleGuide: row.writing_style_guide,
    colorPalette: row.color_palette as { primary: string; secondary: string; accent: string },
    fontSelection: row.font_selection,
    thumbnailFormula: row.thumbnail_formula,
    visualStyleGuide: row.visual_style_guide,
    targetAudience: row.target_audience,
    channelMission: row.channel_mission,
    logoUrl: row.logo_url || undefined,
});

const brandIdentityToRow = (identity: Partial<Omit<BrandIdentity, 'id' | 'created_at' | 'user_id'>>): Partial<Database['public']['Tables']['brand_identities']['Update']> => {
    return {
        name: identity.name,
        tone_of_voice: identity.toneOfVoice,
        writing_style_guide: identity.writingStyleGuide,
        color_palette: identity.colorPalette as unknown as Json,
        font_selection: identity.fontSelection,
        thumbnail_formula: identity.thumbnailFormula,
        visual_style_guide: identity.visualStyleGuide,
        target_audience: identity.targetAudience,
        channel_mission: identity.channelMission,
        logo_url: identity.logoUrl,
    };
};


// --- Auth Functions ---

export const getSession = async (): Promise<{ session: AuthSession | null }> => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return { session: data.session };
};

export const onAuthStateChange = (callback: (event: string, session: AuthSession | null) => void) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        callback(event as string, session);
    });
    return subscription;
};

export const signInWithPassword = async (email: string, password: string): Promise<AuthSession> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.session) throw new Error("Login successful, but no session returned.");
    return data.session;
};

export const signUp = async (email: string, password: string): Promise<void> => {
    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: window.location.origin
        }
    });
    if (error) throw error;
};

export const signOut = async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
};

export const sendPasswordResetEmail = async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
    });
    if (error) throw error;
};

// --- User Profile Functions ---
export const getUserProfile = async (userId: string): Promise<User | null> => {
    const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error) {
        if (error.code === 'PGRST116') return null; // 'PGRST116' means no rows found, which is not an error here
        throw error;
    }
    const { data: tokens, error: tokenError } = await supabase.from('user_youtube_tokens').select('user_id').eq('user_id', userId).single();
    if (tokenError && tokenError.code !== 'PGRST116') {
        console.error("Error fetching youtube tokens:", tokenError.message);
        return profile ? profileRowToUser(profile, false) : null;
    }

    return profile ? profileRowToUser(profile, !!tokens) : null;
};

export const createProfileForUser = async (userId: string, email: string): Promise<User> => {
    const freePlan = PLANS.find(p => p.id === 'free')!;
    const { data, error } = await supabase.from('profiles').insert([{
        id: userId,
        email,
        subscription: { planId: 'free', status: 'active', endDate: null },
        ai_credits: freePlan.creditLimit,
    }]).select().single();
    if (error) throw error;
    return profileRowToUser(data, false);
};

export const updateUserProfile = async (userId: string, updates: Partial<User>): Promise<User> => {
    const dbUpdates = userToProfileUpdate(updates);
    const { data, error } = await supabase.from('profiles').update(dbUpdates).eq('id', userId).select().single();
    if (error) throw error;
    // We need to re-check for youtube connection to return a complete User object
    const { data: tokens } = await supabase.from('user_youtube_tokens').select('user_id').eq('user_id', userId).single();
    return profileRowToUser(data, !!tokens);
};

// --- Project Functions ---
export const getProjectsForUser = async (userId: string): Promise<Project[]> => {
    const { data, error } = await supabase.from('projects').select('*').eq('user_id', userId).order('last_updated', { ascending: false });
    if (error) throw error;
    return data.map(projectRowToProject);
};

export const createProject = async (project: Omit<Project, 'id' | 'lastUpdated'>, userId: string): Promise<Project> => {
    const { data, error } = await supabase.from('projects').insert([{
        ...projectToProjectUpdate(project),
        user_id: userId,
        status: project.status, // Ensure status is explicitly set on creation
        platform: project.platform,
        name: project.name,
        topic: project.topic,
        workflow_step: project.workflowStep
    }]).select().single();
    if (error) throw error;
    return projectRowToProject(data);
};

export const updateProject = async (projectId: string, updates: Partial<Project>): Promise<Project> => {
    const dbUpdates = projectToProjectUpdate(updates);
    const { data, error } = await supabase.from('projects').update(dbUpdates).eq('id', projectId).select().single();
    if (error) throw error;
    return projectRowToProject(data);
};

export const deleteProject = async (projectId: string): Promise<void> => {
    // Also delete associated storage files
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data: files, error } = await supabase.storage.from('assets').list(`${user.id}/${projectId}`);
        if (files && !error) {
            const filePaths = files.map(file => `${user!.id}/${projectId}/${file.name}`);
            if (filePaths.length > 0) {
                await supabase.storage.from('assets').remove(filePaths);
            }
        }
    }

    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) throw error;
};

// --- Notification Functions ---
export const getNotifications = async (userId: string): Promise<Notification[]> => {
    const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    return data.map(notificationRowToNotification);
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
    if (error) throw error;
};

export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId);
    if (error) throw error;
};

// --- Brand Identity Functions ---
export const getBrandIdentitiesForUser = async (userId: string): Promise<BrandIdentity[]> => {
    const { data, error } = await supabase.from('brand_identities').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(brandIdentityRowToBrandIdentity);
};

export const createBrandIdentity = async (identityData: Omit<BrandIdentity, 'id' | 'created_at' | 'user_id'>, userId: string): Promise<BrandIdentity> => {
    const { data, error } = await supabase.from('brand_identities').insert([{
        ...brandIdentityToRow(identityData),
        user_id: userId,
    }]).select().single();
    if (error) throw error;
    return brandIdentityRowToBrandIdentity(data);
};

export const updateBrandIdentity = async (identityId: string, updates: Partial<Omit<BrandIdentity, 'id' | 'created_at' | 'user_id'>>): Promise<BrandIdentity> => {
    const { data, error } = await supabase.from('brand_identities').update(brandIdentityToRow(updates)).eq('id', identityId).select().single();
    if (error) throw error;
    return brandIdentityRowToBrandIdentity(data);
};

export const deleteBrandIdentity = async (identityId: string): Promise<void> => {
    const { error } = await supabase.from('brand_identities').delete().eq('id', identityId);
    if (error) throw error;
};

// --- Supabase Edge Function Invocation ---
export const invokeEdgeFunction = async <T>(
    functionName: string, 
    body: object,
    responseType: 'json' | 'blob' = 'json'
): Promise<T> => {
    const { session } = await getSession();
    if (!session) {
        throw new Error('Authentication session not found.');
    }

    const functionUrl = `${supabaseUrl}/functions/v1/${functionName}`;

    const headers: HeadersInit = {
        'Authorization': `Bearer ${session.access_token}`,
    };
    // Let fetch set the Content-Type for FormData
    if (!(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(functionUrl, {
        method: 'POST',
        headers,
        body: body instanceof FormData ? body : JSON.stringify(body),
    });

    if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch (e) {
            errorData = { error: await response.text() };
        }
        const errorMessage = errorData?.error || `Edge function '${functionName}' failed with status ${response.status}`;
        throw new Error(errorMessage);
    }
    
    if (responseType === 'blob') {
        return response.blob() as Promise<T>;
    }
    
    return response.json() as Promise<T>;
};

// --- Asset/Storage Functions ---

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const res = await fetch(dataUrl);
    return await res.blob();
}

export const uploadFile = async (file: File | Blob, path: string): Promise<string> => {
    const { error } = await supabase.storage.from('assets').upload(path, file, { upsert: true });
    if (error) {
        throw error;
    }
    const { data } = supabase.storage.from('assets').getPublicUrl(path);
    return data.publicUrl;
};
