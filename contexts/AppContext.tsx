

import React, { createContext, useState, useEffect, useCallback, useContext, ReactNode, useRef, useMemo } from 'react';
import { Project, User, PlanId, Blueprint, Toast, Platform, Opportunity, ContentGapSuggestion, PerformanceReview, Notification, ProjectStatus, Database, UserAsset, BrandIdentity, VideoStyle, Json } from '../types.ts';
import * as supabaseService from '../services/supabaseService.ts';
import { supabase } from '../services/supabaseClient.js'; // Import client directly
import { type AuthSession } from '@supabase/supabase-js';
import { createCheckoutSession, PLANS } from '../services/paymentService.ts';
import { translations, Language, TranslationKey } from '../translations.ts';
import { getErrorMessage } from '../utils.ts';
import { GoogleFont, fetchGoogleFonts } from '../services/fontService.js';
import { v4 as uuidv4 } from 'uuid';


interface AppContextType {
    session: AuthSession | null;
    user: User | null;
    projects: Project[];
    toasts: Toast[];
    dismissedTutorials: string[];
    isUpgradeModalOpen: boolean;
    upgradeReason: { title: string; description: string };
    confirmation: ConfirmationState;
    language: Language;
    prefilledBlueprintPrompt: string | null;
    notifications: Notification[];
    isInitialLoading: boolean;
    isScheduleModalOpen: boolean;
    projectToSchedule: string | null;
    backendError: { title: string; message: string } | null;
    brandIdentities: BrandIdentity[];
    fonts: GoogleFont[];
    
    // New handler for IMG.LY editor
    handleFinalVideoSaved: (projectId: string, videoUrl: string) => Promise<void>;

    setLanguage: (lang: Language) => void;
    t: (key: TranslationKey, replacements?: { [key: string]: string | number }) => string;
    addToast: (message: string, type?: Toast['type']) => void;
    dismissToast: (id: number) => void;
    dismissTutorial: (id: string) => void;
    
    handleLogout: () => void;
    consumeCredits: (amount: number) => Promise<boolean>;
    requirePermission: (requiredPlan: PlanId) => boolean;
    handleSubscriptionChange: (planId: PlanId) => Promise<void>;

    handleUpdateProject: (updatedProjectData: Partial<Project> & { id: string }) => Promise<Project | null>;
    handleCreateProjectForBlueprint: (topic: string, platform: Platform, title: string, voiceoverVoiceId: string, videoSize: Project['videoSize'], blueprint: Blueprint) => Promise<string | void>;
    handleCreateProjectFromIdea: (suggestion: Opportunity | ContentGapSuggestion, platform: Platform) => Promise<void>;
    handleCreateProjectFromInsights: (review: PerformanceReview, originalProject: Project) => void;
    handleDeleteProject: (projectId: string) => void;
    addProjects: (newProjects: Project[]) => void;
    
    handleCreateBrandIdentity: (identityData: Omit<BrandIdentity, 'id' | 'created_at' | 'user_id'>) => Promise<void>;
    handleUpdateBrandIdentity: (identityId: string, updates: Partial<Omit<BrandIdentity, 'id' | 'created_at' | 'user_id'>>) => Promise<void>;
    handleDeleteBrandIdentity: (identityId: string) => void;

    requestConfirmation: (title: string, message: string, onConfirm: () => void) => void;
    handleConfirmation: () => void;
    handleCancelConfirmation: () => void;
    setUpgradeModalOpen: (isOpen: boolean) => void;
    setPrefilledBlueprintPrompt: (prompt: string | null) => void;
    
    setActiveProjectId: (id: string | null) => void;
    activeProjectId: string | null;
    
    setUser: React.Dispatch<React.SetStateAction<User | null>>;
    
    markNotificationAsRead: (notificationId: string) => void;
    markAllNotificationsAsRead: () => void;
    openScheduleModal: (projectId: string) => void;
    closeScheduleModal: () => void;
    clearBackendError: () => void;
    lockAndExecute: (asyncOperation: () => Promise<any>) => Promise<void>;
    invokeEdgeFunction: <T>(functionName: string, body: object, responseType?: 'json' | 'blob') => Promise<T>;
}

interface ConfirmationState {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error("useAppContext must be used within an AppProvider");
    }
    return context;
};

export const AppProvider: React.FC<{children: ReactNode}> = ({ children }) => {
    const [session, setSession] = useState<AuthSession | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [brandIdentities, setBrandIdentities] = useState<BrandIdentity[]>([]);
    const [fonts, setFonts] = useState<GoogleFont[]>([]);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

    const [isUpgradeModalOpen, setUpgradeModalOpen] = useState(false);
    const [upgradeReason, setUpgradeReason] = useState<{title: string, description: string}>({title: '', description: ''});
    
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [dismissedTutorials, setDismissedTutorials] = useState<string[]>([]);
    const [confirmation, setConfirmation] = useState<ConfirmationState>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
    const [prefilledBlueprintPrompt, setPrefilledBlueprintPrompt] = useState<string | null>(null);

    const [isScheduleModalOpen, setScheduleModalOpen] = useState(false);
    const [projectToSchedule, setProjectToSchedule] = useState<string | null>(null);
    const [backendError, setBackendError] = useState<{ title: string; message: string } | null>(null);
    const clearBackendError = () => setBackendError(null);
    
    const isOperationLocked = useRef(false);

    const [language, setLanguageState] = useState<Language>(() => {
        const savedLang = localStorage.getItem('viralyzaier-lang');
        const browserLang = navigator.language.split('-')[0];
        if (savedLang && translations[savedLang as Language]) {
            return savedLang as Language;
        }
        if (translations[browserLang as Language]) {
            return browserLang as Language;
        }
        return 'en';
    });

    const setLanguage = (lang: Language) => {
        localStorage.setItem('viralyzaier-lang', lang);
        setLanguageState(lang);
    };

    const t = useCallback((key: TranslationKey, replacements?: { [key: string]: string | number }) => {
        const langSource = translations[language] || translations.en;
        const fallbackSource = translations.en;
        let text = langSource[key] || fallbackSource[key] || key;

        if (replacements) {
          for (const rKey in replacements) {
            text = text.replace(new RegExp(`\\{${rKey}\\}`, 'g'), String(replacements[rKey]));
          }
        }
        return text;
    }, [language]);

    const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
      const newToast: Toast = { id: Date.now(), message, type };
      setToasts(t => [...t, newToast]);
    }, []);
    
    // --- AUTH & DATA LOADING ---
    useEffect(() => {
        supabaseService.getSession().then(({ session }) => setSession(session))
        .catch(err => {
            console.error("Failed to get initial session:", err);
            addToast(`Could not connect to the authentication service: ${getErrorMessage(err)}`, "error");
        }).finally(() => setIsInitialLoading(false));

        const authListener = supabaseService.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        const savedTutorials = localStorage.getItem('viralyzaier-tutorials');
        setDismissedTutorials(savedTutorials ? JSON.parse(savedTutorials) : []);

        return () => {
            authListener?.unsubscribe();
        };

    }, [addToast]);
    
    // --- Data loading for authenticated user ---
    useEffect(() => {
        if (session?.user) {
            setIsInitialLoading(true);
            const loadData = async () => {
                try {
                    let profile = await supabaseService.getUserProfile(session.user.id);
                    if (!profile) profile = await supabaseService.createProfileForUser(session.user.id, session.user.email);
                    if (profile) {
                        setUser(profile);
                        const [projects, notifications, fonts, identities] = await Promise.all([
                            supabaseService.getProjectsForUser(session.user.id),
                            supabaseService.getNotifications(session.user.id),
                            fetchGoogleFonts(),
                            supabaseService.getBrandIdentitiesForUser(session.user.id),
                        ]);
                        setProjects(projects);
                        setNotifications(notifications);
                        setFonts(fonts.slice(0, 50));
                        setBrandIdentities(identities);
                    } else { throw new Error(t('toast.loading_user_error')); }
                } catch (err) { addToast(`${t('toast.failed_fetch_profile')}: ${getErrorMessage(err)}`, 'error'); } 
                finally { setIsInitialLoading(false); }
            };
            loadData();
        } else {
            setUser(null); setProjects([]); setNotifications([]); setBrandIdentities([]); setFonts([]); setIsInitialLoading(false);
            setActiveProjectId(null);
        }
    }, [session, addToast, t]);
    
    // --- Real-time subscriptions ---
    useEffect(() => {
        if (!session?.user?.id) return;
        const sub = supabase.channel(`public:projects:user_id=eq.${session.user.id}`).on<Project>(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'projects' },
            (payload) => {
                const updatedProject = supabaseService.projectRowToProject(payload.new as any);
                setProjects(current => {
                    const existing = current.find(p => p.id === updatedProject.id);
                    if (existing) {
                        return current.map(p => p.id === updatedProject.id ? updatedProject : p);
                    }
                    return [updatedProject, ...current];
                });
            }
        ).subscribe();
        return () => { supabase.removeChannel(sub); };
    }, [session?.user?.id, addToast]);
    
    // --- Immediate feedback after Stripe or OAuth redirect ---
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('payment_success')) {
            addToast('Payment successful! Your plan has been upgraded.', 'success');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        if (urlParams.has('youtube_connected')) {
            addToast('YouTube channel connected successfully!', 'success');
            if(user) supabaseService.getUserProfile(user.id).then(setUser);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [addToast, user]);
    
    const handleFinalVideoSaved = async (projectId: string, videoUrl: string) => {
        await handleUpdateProject({
            id: projectId,
            final_video_url: videoUrl,
            publishedUrl: videoUrl, // Use this for the analysis step preview
            workflowStep: 4
        });
        addToast("Video exported and saved! Proceeding to analysis.", 'success');
    };

    // --- OTHER CONTEXT FUNCTIONS ---
    const requestConfirmation = (title: string, message: string, onConfirm: () => void) => { setConfirmation({ isOpen: true, title, message, onConfirm }); };
    const handleConfirmation = () => { if(confirmation.isOpen) { confirmation.onConfirm(); } setConfirmation({ isOpen: false, title: '', message: '', onConfirm: () => {} }); };
    const handleCancelConfirmation = () => { setConfirmation({ isOpen: false, title: '', message: '', onConfirm: () => {} }); };
    const handleLogout = () => { requestConfirmation(t('confirmation_modal.logout_title'), t('confirmation_modal.logout_message'), async () => { await supabaseService.signOut(); setActiveProjectId(null); addToast(t('toast.logged_out')); }); };
    const lockAndExecute = async (asyncOperation: () => Promise<any>) => { if (isOperationLocked.current) { addToast("Another AI operation is already in progress. Please wait.", "info"); return; } isOperationLocked.current = true; try { await asyncOperation(); } catch (error) { console.error("Error during locked operation:", error); } finally { isOperationLocked.current = false; } };
    const dismissToast = (id: number) => { setToasts(t => t.filter(toast => toast.id !== id)); };
    const dismissTutorial = (id: string) => { setDismissedTutorials(prev => { const newDismissed = [...prev, id]; localStorage.setItem('viralyzaier-tutorials', JSON.stringify(newDismissed)); return newDismissed; }); };
    const consumeCredits = useCallback(async (amount: number) => {
        if (!user) return false;
        if (user.subscription.planId === 'free' && user.aiCredits < amount) {
            setUpgradeReason({ title: t('upgrade_modal.credits_title'), description: t('upgrade_modal.credits_description') });
            setUpgradeModalOpen(true);
            return false;
        }
        try {
            const { success, newCredits, message } = await supabaseService.invokeEdgeFunction<{ success: boolean; newCredits: number; message?: string; }>('consume-credits', { amount_to_consume: amount });
            if (success) {
                setUser(u => u ? { ...u, aiCredits: newCredits } : null);
                return true;
            } else {
                if (message === 'insufficient_credits') {
                    setUpgradeReason({ title: t('upgrade_modal.credits_title'), description: t('upgrade_modal.credits_description') });
                    setUpgradeModalOpen(true);
                } else { addToast(message || t('toast.insufficient_credits_error'), 'error'); }
                return false;
            }
        } catch (error) { setBackendError({ title: t('backend_error.title'), message: getErrorMessage(error) }); return false; }
    }, [user, addToast, t]);

    const requirePermission = (requiredPlan: PlanId) => {
        if (!user) return false;
        const userPlan = PLANS.findIndex(p => p.id === user.subscription.planId);
        const requiredPlanIndex = PLANS.findIndex(p => p.id === requiredPlan);
        if (userPlan >= requiredPlanIndex) return true;
        const planName = PLANS.find(p => p.id === requiredPlan)?.name || 'a higher';
        setUpgradeReason({ title: t('upgrade_modal.default_title'), description: `${t('upgrade_modal.default_description')} This feature requires the ${planName} plan.` });
        setUpgradeModalOpen(true);
        return false;
    };
    
    const handleSubscriptionChange = async (planId: PlanId) => {
        if (!user) return;
        if (user.subscription.planId === planId && user.subscription.status === 'active') { addToast(t('toast.already_on_plan'), 'info'); return; }
        try { if (planId !== 'free') { const { checkoutUrl } = await createCheckoutSession(planId); window.location.href = checkoutUrl; } } catch (error) { addToast(t('toast.subscription_failed', {error: getErrorMessage(error)}), 'error'); }
    };
    
    const handleUpdateProject = async (updatedProjectData: Partial<Project> & { id: string }): Promise<Project | null> => {
        try {
            const updatedProject = await supabaseService.updateProject(updatedProjectData.id, updatedProjectData);
            setProjects(p => p.map(proj => proj.id === updatedProjectData.id ? updatedProject : proj));
            return updatedProject;
        } catch (err) { addToast(`${t('toast.failed_update_project')}: ${getErrorMessage(err)}`, 'error'); return null; }
    };
    
    const createProjectFromData = async (projectData: Partial<Project>): Promise<string | void> => {
         if (!user) { addToast("User not found.", "error"); return; }
        try {
            const baseProject: Omit<Project, 'id' | 'lastUpdated'> = {
                name: projectData.name || 'New Project', topic: projectData.topic || '', platform: projectData.platform || 'youtube_long', videoSize: projectData.videoSize || '16:9', status: projectData.status || 'Idea', workflowStep: projectData.workflowStep || 1, title: projectData.title || null, script: projectData.script || null, analysis: null, competitorAnalysis: null, moodboard: projectData.moodboard || null, assets: {}, soundDesign: null, launchPlan: null, performance: null, scheduledDate: null, publishedUrl: null, voiceoverVoiceId: projectData.voiceoverVoiceId || null, last_performance_check: null,
            };
            const newProject = await supabaseService.createProject(baseProject, user.id);
            addProjects([newProject]);
            setActiveProjectId(newProject.id);
            addToast(t('toast.project_created'), 'success');
            return newProject.id;
        } catch (err) { addToast(`${t('toast.failed_create_project')}: ${getErrorMessage(err)}`, 'error'); }
    }
    
    const handleCreateProjectForBlueprint = async (topic: string, platform: Platform, title: string, voiceoverVoiceId: string, videoSize: Project['videoSize'], blueprint: Blueprint): Promise<string | void> => {
        if (!user) return;
        return await createProjectFromData({
            topic,
            platform,
            videoSize,
            name: title || "New Blueprint Project",
            status: 'Scripting',
            workflowStep: 2,
            voiceoverVoiceId,
            script: blueprint.script,
            moodboard: blueprint.moodboard,
            title: title
        });
    };

    const handleCreateProjectFromIdea = async (suggestion: Opportunity | ContentGapSuggestion, platform: Platform) => {
        const title = 'suggestedTitle' in suggestion ? suggestion.suggestedTitle : suggestion.potentialTitles[0];
        await createProjectFromData({ topic: suggestion.idea, platform, name: title, title: title, status: 'Idea', workflowStep: 1 });
    };
    
    const handleCreateProjectFromInsights = (review: PerformanceReview, originalProject: Project) => {
        const newTopic = `Improving upon "${originalProject.name}" - ${review.whatToImprove[0]}`;
        const newName = `New Video based on "${originalProject.name}"`;
        createProjectFromData({ topic: newTopic, platform: originalProject.platform, name: newName, status: 'Idea', workflowStep: 1 });
    };

    const addProjects = (newProjects: Project[]) => { setProjects(prev => [...newProjects, ...prev]); };
    const handleDeleteProject = (projectId: string) => { requestConfirmation(t('confirmation_modal.delete_project_title'), t('confirmation_modal.delete_project_message'), async () => { try { await supabaseService.deleteProject(projectId); setProjects(p => p.filter(proj => proj.id !== projectId)); if (activeProjectId === projectId) { setActiveProjectId(null); } addToast(t('toast.project_deleted'), 'success'); } catch (err) { addToast(`${t('toast.failed_delete_project')}: ${getErrorMessage(err)}`, 'error'); } }); };
    const handleCreateBrandIdentity = async (identityData: Omit<BrandIdentity, 'id' | 'created_at' | 'user_id'>) => { if (!user) return; try { const newIdentity = await supabaseService.createBrandIdentity(identityData, user.id); setBrandIdentities(prev => [newIdentity, ...prev]); addToast('Brand Identity created!', 'success'); } catch (err) { addToast(`Failed to create identity: ${getErrorMessage(err)}`, 'error'); } };
    const handleUpdateBrandIdentity = async (identityId: string, updates: Partial<Omit<BrandIdentity, 'id' | 'created_at' | 'user_id'>>) => { try { const updatedIdentity = await supabaseService.updateBrandIdentity(identityId, updates); setBrandIdentities(prev => prev.map(id => id.id === identityId ? updatedIdentity : id)); addToast('Brand Identity updated!', 'success'); } catch (err) { addToast(`Failed to update identity: ${getErrorMessage(err)}`, 'error'); } };
    const handleDeleteBrandIdentity = (identityId: string) => { requestConfirmation('Delete Brand Identity?', 'This action cannot be undone.', async () => { try { await supabaseService.deleteBrandIdentity(identityId); setBrandIdentities(prev => prev.filter(id => id.id !== identityId)); addToast('Brand Identity deleted!', 'success'); } catch (err) { addToast(`Failed to delete identity: ${getErrorMessage(err)}`, 'error'); } }); };
    const markNotificationAsRead = async (notificationId: string) => { try { await supabaseService.markNotificationAsRead(notificationId); setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)); } catch (err) { console.error("Failed to mark notification as read:", err); } };
    const markAllNotificationsAsRead = async () => { if (!user) return; try { await supabaseService.markAllNotificationsAsRead(user.id); setNotifications(prev => prev.map(n => ({ ...n, is_read: true }))); } catch (err) { console.error("Failed to mark all notifications as read:", err); } };
    const openScheduleModal = (projectId: string) => { setProjectToSchedule(projectId); setScheduleModalOpen(true); };
    const closeScheduleModal = () => { setProjectToSchedule(null); setScheduleModalOpen(false); };

    return (
        <AppContext.Provider value={{
            session, user, projects, toasts, dismissedTutorials,
            isUpgradeModalOpen, upgradeReason, confirmation, language,
            prefilledBlueprintPrompt, notifications, isInitialLoading,
            isScheduleModalOpen, projectToSchedule, backendError,
            brandIdentities, fonts,
            handleFinalVideoSaved,
            setLanguage, t, addToast, dismissToast, dismissTutorial,
            handleLogout, consumeCredits, requirePermission,
            handleSubscriptionChange, handleUpdateProject,
            handleCreateProjectForBlueprint, handleDeleteProject,
            requestConfirmation, handleConfirmation, handleCancelConfirmation,
            setUpgradeModalOpen, handleCreateProjectFromIdea, setPrefilledBlueprintPrompt,
            setActiveProjectId, activeProjectId,
            setUser,
            handleCreateProjectFromInsights,
            addProjects,
            handleCreateBrandIdentity, handleUpdateBrandIdentity, handleDeleteBrandIdentity,
            markNotificationAsRead, markAllNotificationsAsRead,
            openScheduleModal, closeScheduleModal, clearBackendError, lockAndExecute,
            invokeEdgeFunction: supabaseService.invokeEdgeFunction,
        }}>
            {children}
        </AppContext.Provider>
    );
};