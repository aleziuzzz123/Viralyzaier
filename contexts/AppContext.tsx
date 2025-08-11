import React, { createContext, useState, useEffect, useCallback, useContext, ReactNode, useRef } from 'react';
import { Project, User, PlanId, Blueprint, Toast, Platform, Opportunity, ContentGapSuggestion, PerformanceReview, Notification, BrandIdentity } from '../types.ts';
import * as supabaseService from '../services/supabaseService.ts';
import { supabase } from '../services/supabaseClient.ts'; // Import client directly
import { type Session } from '@supabase/supabase-js';
import { createCheckoutSession, PLANS } from '../services/paymentService.ts';
import { translations, Language, TranslationKey } from '../translations.ts';
import { getErrorMessage } from '../utils.ts';
import { GoogleFont, fetchGoogleFonts, loadGoogleFont } from '../services/fontService.ts';


interface AppContextType {
    session: Session | null;
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
    
    activeProjectId: string | null;
    setActiveProjectId: (id: string | null) => Promise<void>;
    activeProjectDetails: Project | null;
    isProjectDetailsLoading: boolean;
    
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
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [activeProjectId, _setActiveProjectId] = useState<string | null>(null);
    const [activeProjectDetails, setActiveProjectDetails] = useState<Project | null>(null);
    const [isProjectDetailsLoading, setIsProjectDetailsLoading] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [dismissedTutorials, setDismissedTutorials] = useState<string[]>([]);
    const [isUpgradeModalOpen, setUpgradeModalOpen] = useState(false);
    const [upgradeReason, setUpgradeReason] = useState({ title: 'Upgrade Required', description: 'This feature is not available on your current plan.' });
    const [confirmation, setConfirmation] = useState<ConfirmationState>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
    const [language, setLanguage] = useState<Language>('en');
    const [prefilledBlueprintPrompt, setPrefilledBlueprintPrompt] = useState<string | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [projectToSchedule, setProjectToSchedule] = useState<string | null>(null);
    const [backendError, setBackendError] = useState<{ title: string; message: string } | null>(null);
    const [brandIdentities, setBrandIdentities] = useState<BrandIdentity[]>([]);
    const [fonts, setFonts] = useState<GoogleFont[]>([]);
    
    const operationLock = useRef(false);

    const setActiveProjectId = async (id: string | null) => {
        _setActiveProjectId(id);
        if (id) {
            setIsProjectDetailsLoading(true);
            try {
                const details = await supabaseService.getProjectDetails(id);
                setActiveProjectDetails(details);
            } catch (error) {
                addToast(`Failed to load project details: ${getErrorMessage(error)}`, 'error');
            } finally {
                setIsProjectDetailsLoading(false);
            }
        } else {
            setActiveProjectDetails(null);
        }
    };

    const lockAndExecute = async (asyncOperation: () => Promise<any>) => {
        if (operationLock.current) {
            addToast("Another operation is already in progress.", "info");
            return;
        }
        operationLock.current = true;
        try {
            await asyncOperation();
        } catch (error) {
            console.error("Operation failed:", error);
            // Error should be handled within the operation itself
        } finally {
            operationLock.current = false;
        }
    };

    const t = useCallback((key: TranslationKey, replacements?: { [key: string]: string | number }) => {
        const langDict = translations[language] || translations.en;
        let text = langDict[key] || key;
        if (replacements) {
            Object.keys(replacements).forEach(rKey => {
                text = text.replace(`{${rKey}}`, String(replacements[rKey]));
            });
        }
        return text;
    }, [language]);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const data = await supabaseService.invokeEdgeFunction<{user: User; projects: Project[], notifications: Notification[], brandIdentities: BrandIdentity[]}>('get-initial-data', {});
                setUser(data.user);
                setProjects(data.projects);
                setNotifications(data.notifications);
                setBrandIdentities(data.brandIdentities);
            } catch (error) {
                console.error("Failed to fetch initial data:", error);
                setBackendError({ title: 'Initial Data Load Failed', message: getErrorMessage(error) });
            } finally {
                setIsInitialLoading(false);
            }
        };

        if (session) {
            fetchInitialData();
            fetchGoogleFonts().then(setFonts).catch(e => console.error("Failed to fetch Google Fonts:", e));
        }
    }, [session]);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (!session) {
                setUser(null);
                setProjects([]);
                setIsInitialLoading(false);
            } else {
                setIsInitialLoading(true);
            }
        });
        return () => subscription.unsubscribe();
    }, []);

    const addToast = (message: string, type: Toast['type'] = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
    };

    const dismissToast = (id: number) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };
    
     const consumeCredits = useCallback(async (amount: number): Promise<boolean> => {
        if (!user) {
            addToast('You must be logged in to perform this action.', 'error');
            return false;
        }
        if (user.aiCredits < amount) {
            setUpgradeReason({
                title: t('upgrade_modal.credits_title'),
                description: t('upgrade_modal.credits_description')
            });
            setUpgradeModalOpen(true);
            return false;
        }
        try {
            const { success, newCredits, message } = await supabaseService.invokeEdgeFunction<{success: boolean, newCredits: number, message?: string}>('consume-credits', { amount_to_consume: amount });
            if (success) {
                setUser(prevUser => prevUser ? { ...prevUser, aiCredits: newCredits } : null);
                return true;
            } else {
                if (message === 'insufficient_credits') {
                    setUpgradeReason({ title: t('upgrade_modal.credits_title'), description: t('upgrade_modal.credits_description') });
                    setUpgradeModalOpen(true);
                }
                return false;
            }
        } catch (error) {
            setBackendError({ title: 'Credit Consumption Error', message: getErrorMessage(error) });
            return false;
        }
    }, [user, t]);

    const handleUpdateProject = useCallback(async (updatedProjectData: Partial<Project> & { id: string }): Promise<Project | null> => {
        try {
            const updatedProject = await supabaseService.updateProject(updatedProjectData.id, updatedProjectData);
            setProjects(prev => prev.map(p => p.id === updatedProject.id ? { ...p, ...updatedProject } : p));
            if (activeProjectId === updatedProject.id) {
                setActiveProjectDetails(prev => prev ? { ...prev, ...updatedProject } : updatedProject);
            }
            return updatedProject;
        } catch (error) {
            addToast(`Failed to update project: ${getErrorMessage(error)}`, 'error');
            return null;
        }
    }, [activeProjectId]);

    const handleCreateBrandIdentity = async (identityData: Omit<BrandIdentity, 'id' | 'created_at' | 'user_id'>) => {
        if (!user) return;
        try {
            const newIdentity = await supabaseService.createBrandIdentity(identityData, user.id);
            setBrandIdentities(prev => [...prev, newIdentity]);
            addToast("Brand identity created successfully!", "success");
        } catch (error) {
            addToast(`Failed to create brand identity: ${getErrorMessage(error)}`, 'error');
        }
    };
    
    const handleUpdateBrandIdentity = async (identityId: string, updates: Partial<Omit<BrandIdentity, 'id' | 'created_at' | 'user_id'>>) => {
        try {
            const updatedIdentity = await supabaseService.updateBrandIdentity(identityId, updates);
            setBrandIdentities(prev => prev.map(id => id.id === identityId ? updatedIdentity : id));
            addToast("Brand identity updated!", "success");
        } catch (error) {
            addToast(`Failed to update brand identity: ${getErrorMessage(error)}`, 'error');
        }
    };

    const handleDeleteBrandIdentity = (identityId: string) => {
        requestConfirmation("Delete Brand Identity?", "This will permanently delete this brand identity. This action cannot be undone.", async () => {
            try {
                await supabaseService.deleteBrandIdentity(identityId);
                setBrandIdentities(prev => prev.filter(id => id.id !== identityId));
                addToast("Brand identity deleted.", "success");
            } catch (error) {
                addToast(`Failed to delete brand identity: ${getErrorMessage(error)}`, 'error');
            }
        });
    };
    
    const handleCreateProjectForBlueprint = async (topic: string, platform: Platform, title: string, voiceoverVoiceId: string, videoSize: Project['videoSize'], blueprint: Blueprint) => {
        if (!user) return;
        try {
            const projectData: Omit<Project, 'id' | 'lastUpdated'> = {
                name: title, topic, platform, videoSize, status: 'Scripting', workflowStep: 2,
                title, script: blueprint.script, moodboard: blueprint.moodboard,
                assets: {}, soundDesign: null, launchPlan: null, performance: null,
                scheduledDate: null, publishedUrl: null, analysis: null, competitorAnalysis: null,
                voiceoverVoiceId, last_performance_check: null, final_video_url: null
            };
            const newProject = await supabaseService.createProject(projectData, user.id);
            setProjects(prev => [newProject, ...prev]);
            addToast(t('toast.project_created_blueprint'), 'success');
            return newProject.id;
        } catch (error) {
            addToast(`${t('toast.failed_create_project')}: ${getErrorMessage(error)}`, 'error');
        }
    };

    const handleCreateProjectFromIdea = async (suggestion: Opportunity | ContentGapSuggestion, platform: Platform) => {
        if (!user) return;
        try {
            const isOpportunity = 'suggestedTitle' in suggestion;
            const projectData: Omit<Project, 'id' | 'lastUpdated'> = {
                name: suggestion.idea,
                topic: suggestion.idea,
                platform: platform,
                videoSize: platform === 'youtube_long' ? '16:9' : '9:16',
                status: 'Idea',
                workflowStep: 2, // Starts at script
                title: isOpportunity 
                    ? (suggestion as Opportunity).suggestedTitle 
                    : (suggestion as ContentGapSuggestion).potentialTitles[0],
                script: null, analysis: null, competitorAnalysis: null, moodboard: null,
                assets: {}, soundDesign: null, launchPlan: null, performance: null,
                scheduledDate: null, publishedUrl: null, voiceoverVoiceId: null, last_performance_check: null,
            };
            const newProject = await supabaseService.createProject(projectData, user.id);
            setProjects(prev => [newProject, ...prev]);
            addToast(t('toast.project_created_idea'), 'success');
        } catch (error) {
            addToast(`${t('toast.failed_create_project')}: ${getErrorMessage(error)}`, 'error');
        }
    };

    const handleCreateProjectFromInsights = (review: PerformanceReview, originalProject: Project) => {
        const topic = `Based on insights from "${originalProject.name}": ${review.whatToImprove[0]}`;
        handleCreateProjectFromIdea({ idea: topic, reason: review.summary, suggestedTitle: `New & Improved: ${originalProject.title}`, potentialTitles: [], type: 'Growth Bet' }, originalProject.platform);
    };

    const handleDeleteProject = (projectId: string) => {
        requestConfirmation(t('confirmation_modal.delete_project_title'), t('confirmation_modal.delete_project_message'), async () => {
            try {
                await supabaseService.deleteProject(projectId);
                setProjects(prev => prev.filter(p => p.id !== projectId));
                if (activeProjectId === projectId) setActiveProjectId(null);
                addToast(t('toast.project_deleted'), 'success');
            } catch (error) {
                addToast(`${t('toast.failed_delete_project')}: ${getErrorMessage(error)}`, 'error');
            }
        });
    };

    const requirePermission = useCallback((requiredPlan: PlanId): boolean => {
        if (!user) return false;
        const userPlanIndex = PLANS.findIndex(p => p.id === user.subscription.planId);
        const requiredPlanIndex = PLANS.findIndex(p => p.id === requiredPlan);
        if (userPlanIndex >= requiredPlanIndex) {
            return true;
        } else {
            const planName = PLANS[requiredPlanIndex].name;
            setUpgradeReason({ title: 'Upgrade to ' + planName, description: `This feature requires a ${planName} plan or higher.` });
            setUpgradeModalOpen(true);
            return false;
        }
    }, [user]);

    const handleSubscriptionChange = async (planId: PlanId) => {
        if (!user) return;
        if (user.subscription.planId === planId) { addToast(t('toast.already_on_plan'), 'info'); return; }
        if (planId === 'free') {
            // Handle downgrade logic if needed (e.g., via Stripe customer portal)
            window.open('https://billing.stripe.com/p/login/test_9AQg0qgN1g82e4g144', '_blank');
        } else {
            try {
                const { checkoutUrl } = await createCheckoutSession(planId);
                window.location.href = checkoutUrl;
            } catch (error) {
                addToast(t('toast.subscription_failed', { error: getErrorMessage(error) }), 'error');
            }
        }
    };
    
    const handleLogout = () => {
        requestConfirmation(t('confirmation_modal.logout_title'), t('confirmation_modal.logout_message'), async () => {
            await supabaseService.signOut();
            setSession(null);
            setUser(null);
            setProjects([]);
            addToast(t('toast.logged_out'));
        });
    };

    const requestConfirmation = (title: string, message: string, onConfirm: () => void) => {
        setConfirmation({ isOpen: true, title, message, onConfirm });
    };

    const handleConfirmation = () => {
        confirmation.onConfirm();
        setConfirmation({ isOpen: false, title: '', message: '', onConfirm: () => {} });
    };

    const handleCancelConfirmation = () => {
        setConfirmation({ isOpen: false, title: '', message: '', onConfirm: () => {} });
    };

    const markNotificationAsRead = async (notificationId: string) => {
        try {
            await supabaseService.markNotificationAsRead(notificationId);
            setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
        } catch (e) {
            addToast(`Error: ${getErrorMessage(e)}`, 'error');
        }
    };

    const markAllNotificationsAsRead = async () => {
        if (!user) return;
        try {
            await supabaseService.markAllNotificationsAsRead(user.id);
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (e) {
            addToast(`Error: ${getErrorMessage(e)}`, 'error');
        }
    };

    const openScheduleModal = (projectId: string) => {
        setProjectToSchedule(projectId);
        setIsScheduleModalOpen(true);
    };

    const handleFinalVideoSaved = async (projectId: string, videoUrl: string) => {
        // This would involve uploading the blob to Supabase storage and getting a URL,
        // but for this example, we'll assume the provided URL is already the final one.
        await handleUpdateProject({ id: projectId, final_video_url: videoUrl });
        addToast("Final video saved and ready for analysis!", "success");
    };

    const value = {
        session, user, projects, toasts, dismissedTutorials, isUpgradeModalOpen, upgradeReason, confirmation, language, prefilledBlueprintPrompt, notifications, isInitialLoading, isScheduleModalOpen, projectToSchedule, backendError, brandIdentities, fonts,
        t, setLanguage, addToast, dismissToast, dismissTutorial: (id: string) => setDismissedTutorials(prev => [...prev, id]),
        handleLogout, consumeCredits, requirePermission, handleSubscriptionChange,
        handleUpdateProject, handleCreateProjectForBlueprint, handleCreateProjectFromIdea, handleCreateProjectFromInsights, handleDeleteProject,
        addProjects: (newProjects: Project[]) => setProjects(prev => [...newProjects, ...prev]),
        handleCreateBrandIdentity, handleUpdateBrandIdentity, handleDeleteBrandIdentity,
        requestConfirmation, handleConfirmation, handleCancelConfirmation,
        setUpgradeModalOpen, setPrefilledBlueprintPrompt,
        activeProjectId, setActiveProjectId, activeProjectDetails, isProjectDetailsLoading,
        setUser,
        markNotificationAsRead, markAllNotificationsAsRead, openScheduleModal, closeScheduleModal: () => setIsScheduleModalOpen(false), clearBackendError: () => setBackendError(null),
        lockAndExecute,
        invokeEdgeFunction: supabaseService.invokeEdgeFunction,
        handleFinalVideoSaved,
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};
