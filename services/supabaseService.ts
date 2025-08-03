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
    Json,
    Notification,
} from '../types';
import { type AuthSession, type AuthChangeEvent } from '@supabase/supabase-js';

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
    subscription: row.subscription as unknown as User['subscription'], // Cast from Json to specific type
    aiCredits: row.ai_credits,
    channelAudit: row.channel_audit as unknown as ChannelAudit | null, // Cast from Json
    youtubeConnected,
    content_pillars: row.content_pillars || [],
    cloned_voices: row.cloned_voices as unknown as User['cloned_voices'] || [],
});

const userToProfileUpdate = (updates: Partial<User>): ProfileUpdate => {
    const dbUpdates: ProfileUpdate = {};
    if (updates.aiCredits !== undefined) dbUpdates.ai_credits = updates.aiCredits;
    if (updates.channelAudit !== undefined) dbUpdates.channel_audit = updates.channelAudit as unknown as Json;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.subscription !== undefined) dbUpdates.subscription = updates.subscription as unknown as Json;
    if (updates.content_pillars !== undefined) dbUpdates.content_pillars = updates.content_pillars;
    if (updates.cloned_voices !== undefined) dbUpdates.cloned_voices = updates.cloned_voices as unknown as Json;
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
    if (updates.lastUpdated !== undefined) dbUpdates.last_updated = updates.lastUpdated;
    if (updates.workflowStep !== undefined) dbUpdates.workflow_step = updates.workflowStep;
    if (updates.voiceId !== undefined) dbUpdates.voiceover_voice_id = updates.voiceId;
    if (updates.last_performance_check !== undefined) dbUpdates.last_performance_check = updates.last_performance_check;
    return dbUpdates;
}

const notificationRowToNotification = (row: NotificationRow): Notification => ({
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
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('user_youtube_tokens').select('user_id').eq('user_id', userId).single()
    ]);

    const { data: profileData, error: profileError } = profileResult;
    
    if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching user profile:', profileError.message);
        throw profileError;
    }
    
    if (!profileData) {
        return null;
    }
    
    const youtubeConnected = !!tokenResult.data;
    
    return profileRowToUser(profileData, youtubeConnected);
};


export const updateUserProfile = async (userId: string, updates: Partial<User>): Promise<User> => {
    const dbUpdates = userToProfileUpdate(updates);
    
    const { data, error } = await supabase
        .from('profiles')
        .update(dbUpdates as any)
        .eq('id', userId)
        .select()
        .single();

    if (error) throw error;
    if (!data) throw new Error("User profile not found after update.");
    
    // We need to re-check the token status as it's not part of the profile table
    const tokenCheck = await checkYouTubeTokens(userId);
    return profileRowToUser(data, tokenCheck);
};

export const checkYouTubeTokens = async (userId: string): Promise<boolean> => {
    const { data, error } = await supabase
        .from('user_youtube_tokens')
        .select('user_id')
        .eq('user_id', userId)
        .single();
    
    if (error && error.code !== 'PGRST116') {
        console.error("Error checking for YouTube tokens:", error);
    }
    
    return !!data;
}

// --- Projects ---
export const getProjectsForUser = async (userId: string): Promise<Project[]> => {
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('last_updated', { ascending: false });

    if (error) throw error;
    return (data || []).map(projectRowToProject);
};

export const createProject = async (projectData: Omit<Project, 'id' | 'lastUpdated'>, userId: string): Promise<Project> => {
    const insertData: ProjectInsert = {
        user_id: userId,
        name: projectData.name,
        topic: projectData.topic,
        platform: projectData.platform,
        status: projectData.status,
        title: projectData.title,
        script: projectData.script as unknown as Json,
        analysis: projectData.analysis as unknown as Json,
        competitor_analysis: projectData.competitorAnalysis as unknown as Json,
        moodboard: projectData.moodboard,
        assets: projectData.assets as unknown as Json,
        sound_design: projectData.soundDesign as unknown as Json,
        launch_plan: projectData.launchPlan as unknown as Json,
        performance: projectData.performance as unknown as Json,
        scheduled_date: projectData.scheduledDate,
        published_url: projectData.publishedUrl || null,
        workflow_step: projectData.workflowStep,
        voiceover_voice_id: projectData.voiceoverVoiceId || null,
    };

    const { data, error } = await supabase
        .from('projects')
        .insert([insertData] as any)
        .select()
        .single();

    if (error) throw error;
    if (!data) throw new Error("Project could not be created in the database.");

    return projectRowToProject(data);
};

export const updateProject = async (projectId: string, updates: Partial<Project>): Promise<Project> => {
    const dbUpdates = projectToProjectUpdate({ ...updates, lastUpdated: new Date().toISOString() });
    
    const { data, error } = await supabase
        .from('projects')
        .update(dbUpdates as any)
        .eq('id', projectId)
        .select()
        .single();

    if (error) throw error;
    if (!data) throw new Error("Project not found after update.");
    return projectRowToProject(data);
};

export const deleteProject = async (projectId: string): Promise<void> => {
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) throw error;
};

// --- Notifications ---
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
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true } as any)
        .eq('id', notificationId);

    if (error) throw error;
};

export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true } as any)
        .eq('user_id', userId)
        .eq('is_read', false);
    
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

// --- Edge Functions ---
export const invokeEdgeFunction = async (name: string, body: any): Promise<any> => {
    const { data, error } = await supabase.functions.invoke(name, {
        body,
    });
    if (error) throw error;
    return data;
};
