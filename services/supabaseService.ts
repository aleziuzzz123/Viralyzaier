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
    return ['Idea', 'Scripting', 'Scheduled', 'Published', 'Autopilot'].includes(status);
};

const isValidSubscription = (sub: any): sub is Subscription => {
    return sub && typeof sub === 'object' &&
           ['free', 'pro', 'viralyzaier'].includes(sub.planId) &&
           ['active', 'canceled'].includes(sub.status);
};


// --- Mappers ---
const profileRowToUser = (row: Database['public']['Tables']['profiles']['Row'], youtubeConnected: boolean): User => ({
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
    if (updates.cloned_voices !== undefined) dbUpdates.cloned_voices = updates.cloned_voices as unknown as Json[] | null;
    if (updates.content_pillars !== undefined) dbUpdates.content_pillars = updates.content_pillars;
    if (updates.subscription !== undefined) dbUpdates.subscription = updates.subscription as unknown as Json;
    return dbUpdates;
};

const projectRowToProject = (row: Database['public']['Tables']['projects']['Row']): Project => ({
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
    assets: (row.assets as { [sceneIndex: number]: SceneAssets }) || {},
    soundDesign: row.sound_design as unknown as SoundDesign | null,
    launchPlan: row.launch_plan as LaunchPlan | null,
    performance: row.performance as unknown as VideoPerformance | null,
    scheduledDate: row.scheduled_date,
    publishedUrl: row.published_url,
    lastUpdated: row.last_updated,
    workflowStep: row.workflow_step as WorkflowStep,
    voiceoverVoiceId: row.voiceover_voice_id,
    last_performance_check: row.last_performance_check,
    timeline: row.timeline as unknown as TimelineState | null,
    activeBrandIdentityId: row.active_brand_identity_id,
    style: row.style as VideoStyle | null,
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
    // lastUpdated is managed by a database trigger, client should not set it.
    if (updates.workflowStep !== undefined) dbUpdates.workflow_step = updates.workflowStep;
    if (updates.voiceoverVoiceId !== undefined) dbUpdates.voiceover_voice_id = updates.voiceoverVoiceId;
    if (updates.last_performance_check !== undefined) dbUpdates.last_performance_check = updates.last_performance_check;
    if (updates.timeline !== undefined) dbUpdates.timeline = updates.timeline as unknown as Json | null;
    if (updates.style !== undefined) dbUpdates.style = updates.style;
    return dbUpdates;
}

export const notificationRowToNotification = (row: Database['public']['Tables']['notifications']['Row']): Notification => ({
  id: row.id,
  user_id: row.user_id,
  project_id: row.project_id,
  message: row.message,
  is_read: row.is_read,
  created_at: row.created_at,
});

const brandIdentityRowToBrandIdentity = (row: Database['public']['Tables']['brand_identities']['Row']): BrandIdentity => ({
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
    logoUrl: row.logo_url,
});


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
    // We now fetch the profile and check for YouTube tokens in parallel
    const [profileResult, tokenResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
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
    // First, find out if youtube is connected as this doesn't change during a profile update
    const { data: tokenData, error: tokenError } = await supabase.from('user_youtube_tokens').select('user_id').eq('user_id', userId).single();
    if (tokenError && tokenError.code !== 'PGRST116') throw tokenError;
    const youtubeConnected = !!tokenData;

    const dbUpdates = userToProfileUpdate(updates);
    
    const { data, error } = await supabase
        .from('profiles')
        .update(dbUpdates as any)
        .eq('id', userId)
        .select('*')
        .single();

    if (error) throw error;
    if (!data) throw new Error("User profile not found after update.");
    
    return profileRowToUser(data as Database['public']['Tables']['profiles']['Row'], youtubeConnected);
};

export const createProfileForUser = async (userId: string, email: string): Promise<User | null> => {
    // This function is a fallback for when the on_auth_user_created trigger might fail or be delayed.
    const defaultSubscription: Subscription = { planId: 'free', status: 'active', endDate: null };
    const freePlanCredits = PLANS.find(p => p.id === 'free')?.creditLimit || 10;

    const profileToInsert: Database['public']['Tables']['profiles']['Insert'] = {
        id: userId,
        email: email,
        subscription: defaultSubscription as unknown as Json,
        ai_credits: freePlanCredits,
    };

    const { data, error } = await supabase
        .from('profiles')
        .insert(profileToInsert as any)
        .select('*')
        .single();
    
    if (error) {
        // If the error is '23505' (unique_violation), it means the profile was created in a race condition.
        // We can safely ignore this and re-fetch the profile.
        if (error.code === '23505') {
            console.warn("Profile creation conflict, likely a race condition. Re-fetching profile.");
            return getUserProfile(userId);
        }
        console.error("Error creating fallback user profile:", error);
        throw error;
    }

    if (!data) return null;
    
    // A new user won't have a YouTube connection, so we can safely pass false.
    return profileRowToUser(data as Database['public']['Tables']['profiles']['Row'], false);
};


// --- Projects ---

export const getProjectsForUser = async (userId: string): Promise<Project[]> => {
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('last_updated', { ascending: false });

    if (error) throw error;
    return ((data as Database['public']['Tables']['projects']['Row'][]) || []).map(projectRowToProject);
};

export const createProject = async (projectData: Omit<Project, 'id'|'lastUpdated'>, userId: string): Promise<Project> => {
    const projectToInsert: Database['public']['Tables']['projects']['Insert'] = {
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
        published_url: projectData.publishedUrl,
        workflow_step: projectData.workflowStep,
        voiceover_voice_id: projectData.voiceoverVoiceId,
        last_performance_check: projectData.last_performance_check,
        timeline: projectData.timeline as unknown as Json | null,
        style: projectData.style,
    };
    
    const { data, error } = await supabase
        .from('projects')
        .insert(projectToInsert as any)
        .select('*')
        .single();
        
    if (error) throw error;
    if (!data) throw new Error("Project data not returned after creation.");
    return projectRowToProject(data as Database['public']['Tables']['projects']['Row']);
};

export const updateProject = async (projectId: string, updates: Partial<Project>): Promise<Project> => {
    const dbUpdates = projectToProjectUpdate(updates);
    
    const { data, error } = await supabase
        .from('projects')
        .update(dbUpdates as any)
        .eq('id', projectId)
        .select('*')
        .single();
        
    if (error) throw error;
    if (!data) throw new Error("Project data not returned after update.");
    return projectRowToProject(data as Database['public']['Tables']['projects']['Row']);
};

export const deleteProject = async (projectId: string): Promise<void> => {
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) throw error;
};

// --- Brand Identities ---
export const getBrandIdentitiesForUser = async (userId: string): Promise<BrandIdentity[]> => {
    const { data, error } = await supabase
        .from('brand_identities')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        // Gracefully handle the case where the table does not exist.
        // PostgreSQL error code '42P01' signifies an undefined table.
        if (error.code === '42P01') {
            console.warn('The "public.brand_identities" table was not found. The Brand Identity feature will be disabled.');
            return []; // Return an empty array to allow the app to load.
        }
        // For all other errors, re-throw them.
        throw error;
    }
    
    return ((data as Database['public']['Tables']['brand_identities']['Row'][]) || []).map(brandIdentityRowToBrandIdentity);
};

export const createBrandIdentity = async (identityData: Omit<BrandIdentity, 'id' | 'created_at' | 'user_id' | 'logoUrl'> & { logoUrl?: string }, userId: string): Promise<BrandIdentity> => {
    const { data, error } = await supabase
        .from('brand_identities')
        .insert({
            user_id: userId,
            name: identityData.name,
            tone_of_voice: identityData.toneOfVoice,
            writing_style_guide: identityData.writingStyleGuide,
            color_palette: identityData.colorPalette as unknown as Json,
            font_selection: identityData.fontSelection,
            thumbnail_formula: identityData.thumbnailFormula,
            visual_style_guide: identityData.visualStyleGuide,
            target_audience: identityData.targetAudience,
            channel_mission: identityData.channelMission,
            logo_url: identityData.logoUrl,
        } as any)
        .select()
        .single();
    if (error) throw error;
    return brandIdentityRowToBrandIdentity(data as Database['public']['Tables']['brand_identities']['Row']);
};

export const updateBrandIdentity = async (identityId: string, updates: Partial<Omit<BrandIdentity, 'id' | 'created_at' | 'user_id'>>): Promise<BrandIdentity> => {
    const dbUpdates: Database['public']['Tables']['brand_identities']['Update'] = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.toneOfVoice !== undefined) dbUpdates.tone_of_voice = updates.toneOfVoice;
    if (updates.writingStyleGuide !== undefined) dbUpdates.writing_style_guide = updates.writingStyleGuide;
    if (updates.colorPalette !== undefined) dbUpdates.color_palette = updates.colorPalette as unknown as Json;
    if (updates.fontSelection !== undefined) dbUpdates.font_selection = updates.fontSelection;
    if (updates.thumbnailFormula !== undefined) dbUpdates.thumbnail_formula = updates.thumbnailFormula;
    if (updates.visualStyleGuide !== undefined) dbUpdates.visual_style_guide = updates.visualStyleGuide;
    if (updates.targetAudience !== undefined) dbUpdates.target_audience = updates.targetAudience;
    if (updates.channelMission !== undefined) dbUpdates.channel_mission = updates.channelMission;
    if (updates.logoUrl !== undefined) dbUpdates.logo_url = updates.logoUrl;
    
    const { data, error } = await supabase
        .from('brand_identities')
        .update(dbUpdates as any)
        .eq('id', identityId)
        .select()
        .single();
    if (error) throw error;
    return brandIdentityRowToBrandIdentity(data as Database['public']['Tables']['brand_identities']['Row']);
};

export const deleteBrandIdentity = async (identityId: string): Promise<void> => {
    const { error } = await supabase.from('brand_identities').delete().eq('id', identityId);
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
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }
    return ((data as Database['public']['Tables']['notifications']['Row'][]) || []).map(notificationRowToNotification);
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