import { supabase } from './supabaseClient';
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
} from '../types';
import { type AuthSession, type AuthChangeEvent, type FunctionInvokeOptions } from '@supabase/supabase-js';

// Type aliases for easier access to generated types
type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
type ProjectRow = Database['public']['Tables']['projects']['Row'];
type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
type ProjectUpdate = Database['public']['Tables']['projects']['Update'];
type NotificationRow = Database['public']['Tables']['notifications']['Row'];


// --- Mappers ---
const profileRowToUser = (row: ProfileRow, youtubeConnected: boolean): User => ({
    id: row.id,
    email: row.email,
    subscription: row.subscription as unknown as Subscription,
    aiCredits: row.ai_credits,
    channelAudit: row.channel_audit as unknown as ChannelAudit | null,
    youtubeConnected,
    content_pillars: row.content_pillars || [],
    cloned_voices: (row.cloned_voices as unknown as ClonedVoice[] | null) || [],
});

const userToProfileUpdate = (updates: Partial<User>): ProfileUpdate => {
    const dbUpdates: ProfileUpdate = {};
    if (updates.aiCredits !== undefined) dbUpdates.ai_credits = updates.aiCredits;
    if (updates.channelAudit !== undefined) dbUpdates.channel_audit = updates.channelAudit as unknown as Json;
    if (updates.cloned_voices !== undefined) dbUpdates.cloned_voices = updates.cloned_voices as unknown as Json;
    if (updates.content_pillars !== undefined) dbUpdates.content_pillars = updates.content_pillars;
    if (updates.subscription !== undefined) dbUpdates.subscription = updates.subscription as unknown as Json;
    return dbUpdates;
};

const projectRowToProject = (row: ProjectRow): Project => ({
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
    assets: (row.assets as unknown as { [key: string]: SceneAssets }) || {},
    soundDesign: row.sound_design as unknown as SoundDesign | null,
    launchPlan: row.launch_plan as unknown as LaunchPlan | null,
    performance: row.performance as unknown as VideoPerformance | null,
    scheduledDate: row.scheduled_date,
    publishedUrl: row.published_url || undefined,
    lastUpdated: row.last_updated,
    workflowStep: row.workflow_step as WorkflowStep,
    voiceoverVoiceId: row.voiceover_voice_id || undefined,
    last_performance_check: row.last_performance_check || undefined,
});

const projectToProjectUpdate = (updates: Partial<Project>): ProjectUpdate => {
    // This explicit mapping is safer and prevents accidental inclusion of fields not in ProjectUpdate
    const dbUpdates: ProjectUpdate = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.topic !== undefined) dbUpdates.topic = updates.topic;
    if (updates.platform !== undefined) dbUpdates.platform = updates.platform;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.script !== undefined) dbUpdates.script = updates.script as unknown as Json;
    if (updates.analysis !== undefined) dbUpdates.analysis = updates.analysis as unknown as Json;
    if (updates.competitorAnalysis !== undefined) dbUpdates.competitor_analysis = updates.competitorAnalysis as unknown as Json;
    if (updates.moodboard !== undefined) dbUpdates.moodboard = updates.moodboard;
    if (updates.assets !== undefined) dbUpdates.assets = updates.assets as unknown as Json;
    if (updates.soundDesign !== undefined) dbUpdates.sound_design = updates.soundDesign as unknown as Json;
    if (updates.launchPlan !== undefined) dbUpdates.launch_plan = updates.launchPlan as unknown as Json;
    if (updates.performance !== undefined) dbUpdates.performance = updates.performance as unknown as Json;
    if (updates.scheduledDate !== undefined) dbUpdates.scheduled_date = updates.scheduledDate;
    if (updates.publishedUrl !== undefined) dbUpdates.published_url = updates.publishedUrl;
    // lastUpdated is managed by a database trigger, client should not set it.
    if (updates.workflowStep !== undefined) dbUpdates.workflow_step = updates.workflowStep;
    if (updates.voiceoverVoiceId !== undefined) dbUpdates.voiceover_voice_id = updates.voiceoverVoiceId;
    if (updates.last_performance_check !== undefined) dbUpdates.last_performance_check = updates.last_performance_check;
    return dbUpdates;
}

export const notificationRowToNotification = (row: NotificationRow): Notification => ({
  id: row.id,
  user_id: row.user_id,
  project_id: row.project_id || undefined,
  message: row.message,
  is_read: row.is_read,
  created_at: row.created_at,
});


// --- User & Auth ---

export const getSession = async (): Promise<{ session: AuthSession | null }> => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data;
};

export const onAuthStateChange = (callback: (event: AuthChangeEvent, session: AuthSession | null) => void) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        callback(event as AuthChangeEvent, session);
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
    // We now fetch the profile and check for YouTube tokens in parallel
    const [profileResult, tokenResult] = await Promise.all([
        supabase.from('profiles').select('id, email, subscription, ai_credits, channel_audit, cloned_voices, content_pillars, stripe_customer_id').eq('id', userId).single(),
        supabase.from('user_youtube_tokens').select('user_id').eq('user_id', userId).single()
    ]);

    const { data: profileData, error: profileError } = profileResult;
    
    if (profileError && profileError.code !== 'PGRST116') { // Ignore "not found" errors
        console.error('Error fetching user profile:', profileError.message);
        throw profileError;
    }
    
    if (!profileData) {
        return null;
    }
    
    const { data: tokenData, error: tokenError } = tokenResult;
    if (tokenError && tokenError.code !== 'PGRST116') {
        console.error("Error checking for YouTube tokens:", tokenError);
        throw tokenError;
    }

    const youtubeConnected = !!tokenData;
    
    return profileRowToUser(profileData, youtubeConnected);
};


export const updateUserProfile = async (userId: string, updates: Partial<User>): Promise<User> => {
    const dbUpdates = userToProfileUpdate(updates);
    
    const { data, error } = await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('id', userId)
        .select('id, email, subscription, ai_credits, channel_audit, cloned_voices, content_pillars, stripe_customer_id')
        .single();

    if (error) throw error;
    if (!data) throw new Error("User profile not found after update.");
    
    // We need to re-fetch the youtube connected status as this local update doesn't know about it.
    const currentProfile = await getUserProfile(userId);
    if (!currentProfile) throw new Error("Failed to reload profile after update.");
    
    return currentProfile;
};


// --- Projects ---

export const getProjectsForUser = async (userId: string): Promise<Project[]> => {
    const { data, error } = await supabase
        .from('projects')
        .select('id, name, topic, platform, status, title, script, analysis, competitor_analysis, moodboard, assets, sound_design, launch_plan, performance, scheduled_date, published_url, last_updated, workflow_step, voiceover_voice_id, last_performance_check, user_id')
        .eq('user_id', userId)
        .order('last_updated', { ascending: false });

    if (error) throw error;
    return (data || []).map(p => projectRowToProject(p as ProjectRow));
};

export const createProject = async (projectData: Omit<Project, 'id'|'lastUpdated'>, userId: string): Promise<Project> => {
    const projectToInsert: ProjectInsert = {
        user_id: userId,
        name: projectData.name,
        topic: projectData.topic,
        platform: projectData.platform,
        status: projectData.status,
        title: projectData.title,
        script: projectData.script as unknown as Json | null,
        analysis: projectData.analysis as unknown as Json | null,
        competitor_analysis: projectData.competitorAnalysis as unknown as Json | null,
        moodboard: projectData.moodboard,
        assets: projectData.assets as unknown as Json | null,
        sound_design: projectData.soundDesign as unknown as Json | null,
        launch_plan: projectData.launchPlan as unknown as Json | null,
        performance: projectData.performance as unknown as Json | null,
        scheduled_date: projectData.scheduledDate,
        published_url: projectData.publishedUrl || null,
        workflow_step: projectData.workflowStep,
        voiceover_voice_id: projectData.voiceoverVoiceId || null,
        last_performance_check: projectData.last_performance_check || null,
    };
    
    const { data, error } = await supabase
        .from('projects')
        .insert([projectToInsert])
        .select('id, name, topic, platform, status, title, script, analysis, competitor_analysis, moodboard, assets, sound_design, launch_plan, performance, scheduled_date, published_url, last_updated, workflow_step, voiceover_voice_id, last_performance_check, user_id')
        .single();
        
    if (error) throw error;
    if (!data) throw new Error("Project data not returned after creation.");
    return projectRowToProject(data);
};

export const updateProject = async (projectId: string, updates: Partial<Project>): Promise<Project> => {
    const dbUpdates = projectToProjectUpdate(updates);
    
    const { data, error } = await supabase
        .from('projects')
        .update(dbUpdates)
        .eq('id', projectId)
        .select('id, name, topic, platform, status, title, script, analysis, competitor_analysis, moodboard, assets, sound_design, launch_plan, performance, scheduled_date, published_url, last_updated, workflow_step, voiceover_voice_id, last_performance_check, user_id')
        .single();
        
    if (error) throw error;
    if (!data) throw new Error("Project data not returned after update.");
    return projectRowToProject(data);
};

export const deleteProject = async (projectId: string): Promise<void> => {
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) throw error;
};

// --- Storage ---
export const uploadFile = async (file: Blob, path: string): Promise<string> => {
    const { data, error } = await supabase.storage.from('assets').upload(path, file, {
        cacheControl: '3600',
        upsert: true, // Overwrite if exists
    });
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(path);
    return publicUrl;
};

export const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
    const res = await fetch(dataUrl);
    return await res.blob();
};


// --- Edge Functions ---

export const invokeEdgeFunction = async (name: string, body: object | FormData, responseType: 'json' | 'blob' = 'json') => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
        throw new Error(sessionError?.message || 'User is not authenticated.');
    }

    // Use native fetch for blob responses as it's more reliable than the Supabase client's handling.
    if (responseType === 'blob') {
        const functionUrl = `${(window as any).__env.VITE_SUPABASE_URL}/functions/v1/${name}`;
        
        const isFormData = body instanceof FormData;
        const fetchOptions: RequestInit = {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                ...(isFormData ? {} : {'Content-Type': 'application/json'})
            },
            body: isFormData ? body : JSON.stringify(body)
        };
        
        const response = await fetch(functionUrl, fetchOptions);
        if (!response.ok) {
            const errorText = await response.text();
            try {
                const errorJson = JSON.parse(errorText);
                throw new Error(errorJson.error || `Function ${name} failed with status ${response.status}`);
            } catch {
                throw new Error(errorText || `Function ${name} failed with status ${response.status}`);
            }
        }
        return await response.blob();
    }
    
    // Existing logic for JSON responses using the Supabase client
    const headers: HeadersInit = {
        'Authorization': `Bearer ${session.access_token}`,
    };
    
    const options: FunctionInvokeOptions = {
        body,
        headers,
    };
    
    const response = await supabase.functions.invoke(name, options);
    
    if (response.error) {
        try {
            const errorBody = JSON.parse(response.error.context.responseText);
            throw new Error(errorBody.error || response.error.message);
        } catch (e) {
            throw response.error;
        }
    }
    
    return response.data;
};


// --- Notifications ---
export const getNotifications = async (userId: string): Promise<Notification[]> => {
    const { data, error } = await supabase
        .from('notifications')
        .select('id, user_id, project_id, message, is_read, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(n => notificationRowToNotification(n as NotificationRow));
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
    if (error) throw error;
};

export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);
    if (error) throw error;
};