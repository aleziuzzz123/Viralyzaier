import React, { createContext, useState, useEffect, useCallback, useContext, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Project, User, PlanId, Blueprint, Toast, Platform, Opportunity, ContentGapSuggestion, PerformanceReview, Notification, ProjectStatus, Database } from '../types';
import * as supabaseService from '../services/supabaseService';
import { supabase } from '../services/supabaseClient';
import { type AuthSession } from '@supabase/supabase-js';
import { createCheckoutSession, PLANS } from '../services/paymentService';
import UpgradeModal from '../components/UpgradeModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { translations, Language, TranslationKey } from '../translations';

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
    handleCreateProjectFromBlueprint: (blueprint: Blueprint, selectedTitle: string) => Promise<void>;
    handleCreateProjectFromIdea: (suggestion: Opportunity | ContentGapSuggestion, platform: Platform) => Promise<void>;
    handleCreateProjectFromInsights: (review: PerformanceReview, originalProject: Project) => void;
    handleDeleteProject: (projectId: string) => void;
    addProjects: (newProjects: Project[]) => void;
    
    requestConfirmation: (title: string, message: string, onConfirm: () => void) => void;
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
}

interface ConfirmationState {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
}

export const getErrorMessage = (error: unknown): string => {
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object') {
        if ('message' in error && typeof error.message === 'string') {
            let message = error.message;
            if ('details' in error && typeof error.details === 'string' && error.details) {
                message += ` (${error.details})`;
            }
             if ('hint' in error && typeof error.hint === 'string' && error.hint) {
                message += ` Hint: ${error.hint}`;
            }
            return message;
        }
        try {
            const str = JSON.stringify(error);
            if (str !== '{}') return str;
        } catch {}
        return 'An unknown object error occurred. Check the console for details.';
    }
    return 'An unknown error occurred.';
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{children: ReactNode}> = ({ children }) => {
    const [session, setSession] = useState<AuthSession | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
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

    useEffect(() => {
        if (session?.user) {
            setIsInitialLoading(true);
            Promise.all([
                supabaseService.getUserProfile(session.user.id),
                supabaseService.getProjectsForUser(session.user.id),
                supabaseService.getNotifications(session.user.id)
            ]).then(([profile, userProjects, userNotifications]) => {
                if (profile) {
                    setUser(profile);
                } else {
                    console.error("Critical error: User is logged in but profile does not exist in DB.");
                    addToast(t('toast.loading_user_error'), "error");
                    supabaseService.signOut();
                }
                setProjects(userProjects);
                setNotifications(userNotifications);
            }).catch(err => {
                console.error('Failed to load user data:', err);
                addToast(`${t('toast.failed_fetch_projects')}: ${getErrorMessage(err)}`, 'error');
            }).finally(() => {
                setIsInitialLoading(false);
            });
        } else {
            setUser(null);
            setProjects([]);
            setNotifications([]);
            setIsInitialLoading(false);
        }
    }, [session, addToast, t]);
    
    useEffect(() => {
        if (!session?.user) return;

        const channel = supabase
            .channel(`realtime:notifications:${session.user.id}`)
            .on<Database['public']['Tables']['notifications']['Row']>(
                'postgres_changes',
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'notifications',
                    filter: `user_id=eq.${session.user.id}`
                },
                (payload) => {
                    const newNotification = supabaseService.notificationRowToNotification(payload.new);
                    setNotifications(prev => [newNotification, ...prev]);
                    addToast(t('toast.new_notification'), 'success');
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [session, addToast, t]);
    
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('payment_success')) {
            addToast('Payment successful! Your plan has been upgraded.', 'success');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        if (urlParams.has('payment_canceled')) {
            addToast('Payment was canceled. You can try again from the pricing page.', 'info');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
         if (urlParams.has('youtube_connected')) {
            addToast('YouTube channel connected successfully!', 'success');
            if(user) supabaseService.getUserProfile(user.id).then(setUser);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        if (urlParams.has('youtube_error')) {
            addToast(`Failed to connect YouTube channel: ${urlParams.get('youtube_error')}`, 'error');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [addToast, user]);
    
    const requestConfirmation = (title: string, message: string, onConfirm: () => void) => { setConfirmation({ isOpen: true, title, message, onConfirm }); };
    const handleConfirmation = () => { confirmation.onConfirm(); setConfirmation({ isOpen: false, title: '', message: '', onConfirm: () => {} }); };
    const handleCancelConfirmation = () => { setConfirmation({ isOpen: false, title: '', message: '', onConfirm: () => {} }); };

    const handleLogout = () => {
        requestConfirmation(t('confirmation_modal.logout_title'), t('confirmation_modal.logout_message'), async () => {
            await supabaseService.signOut();
            setActiveProjectId(null);
            addToast(t('toast.logged_out'));
        });
    };

    const consumeCredits = useCallback(async (amount: number): Promise<boolean> => {
        if (!user) return false;
        
        try {
            const result = await supabaseService.invokeEdgeFunction('consume-credits', { body: { amount_to_consume: amount } });

            if (result.success) {
                setUser(prev => prev ? { ...prev, aiCredits: result.newCredits } : null);
                return true;
            } else {
                if (result.message === 'insufficient_credits') {
                    setUpgradeReason({
                        title: t('upgrade_modal.credits_title'),
                        description: t('upgrade_modal.credits_description')
                    });
                    setUpgradeModalOpen(true);
                } else {
                    addToast(result.message || 'An unknown error occurred.', 'error');
                }
                return false;
            }
        } catch (e) {
            const errorMessage = getErrorMessage(e);
             if (errorMessage.includes('Function is not configured') || errorMessage.includes('secrets')) {
                setBackendError({ title: "Backend Configuration Error", message: errorMessage });
            } else {
                addToast(errorMessage, 'error');
            }
            return false;
        }
    }, [user, addToast, t]);

    const handleUpdateProject = async (updatedProjectData: Partial<Project> & { id: string }) => {
        try {
            const updatedProject = await supabaseService.updateProject(updatedProjectData.id, updatedProjectData);
            setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
            return updatedProject;
        } catch (error) {
            addToast(`${t('toast.failed_update_project')}: ${getErrorMessage(error)}`, "error");
            return null;
        }
    };
    
    const handleCreateProjectFromBlueprint = async (blueprint: Blueprint, selectedTitle: string) => {
        if (!user) return;
    
        const isValidBlueprint = blueprint?.strategicSummary?.trim().length > 10 && 
                                 blueprint.suggestedTitles?.length > 0 &&
                                 blueprint.script?.hooks?.length > 0 &&
                                 blueprint.script?.scenes?.length > 0 &&
                                 !!blueprint.script?.cta &&
                                 blueprint.moodboard?.length > 0;
    
        if (!isValidBlueprint) {
            addToast("The AI returned an incomplete plan. Please try generating the blueprint again.", "error");
            return;
        }
    
        try {
            const moodboardUrls = await Promise.all(
                blueprint.moodboard.map(async (base64Img, index) => {
                    const blob = await supabaseService.dataUrlToBlob(base64Img);
                    const path = `${user.id}/project_${Date.now()}_${index}/moodboard.jpg`;
                    return supabaseService.uploadFile(blob, path);
                })
            );
    
            const newProjectData: Omit<Project, 'id' | 'lastUpdated'> = {
                name: selectedTitle,
                status: 'Idea',
                platform: blueprint.platform,
                topic: blueprint.strategicSummary,
                title: selectedTitle,
                script: blueprint.script,
                moodboard: moodboardUrls,
                workflowStep: 2,
                analysis: null,
                competitorAnalysis: null,
                scheduledDate: null,
                assets: {},
                soundDesign: null,
                launchPlan: null,
                performance: null,
            };
    
            const newProject = await supabaseService.createProject(newProjectData, user.id);
            setProjects(prev => [newProject, ...prev]);
            setActiveProjectId(newProject.id);
            addToast(t('toast.project_created_blueprint'), 'success');
        } catch (error) {
            console.error("Error creating project from blueprint:", error);
            addToast(`${t('toast.failed_update_project')}: ${getErrorMessage(error)}`, "error");
        }
    };
    
    const addProjects = (newProjects: Project[]) => {
        setProjects(prev => [...newProjects, ...prev]);
    };

    const handleCreateProjectFromIdea = async (suggestion: Opportunity | ContentGapSuggestion, platform: Platform) => {
         if (!user) return;
        const title = 'suggestedTitle' in suggestion ? suggestion.suggestedTitle : (suggestion.potentialTitles[0] || suggestion.idea);
        const newProjectData: Omit<Project, 'id'|'lastUpdated'> = {
            name: suggestion.idea, status: 'Idea', platform: platform, topic: suggestion.reason,
            title: title, workflowStep: 1, script: null, analysis: null,
            competitorAnalysis: null, scheduledDate: null, moodboard: null, assets: {},
            soundDesign: null, launchPlan: null, performance: null
        };
        const newProject = await supabaseService.createProject(newProjectData, user.id);
        setProjects(prev => [newProject, ...prev]);
        setActiveProjectId(newProject.id);
        addToast(t('toast.project_created_idea'), 'success');
    };

    const handleCreateProjectFromInsights = (review: PerformanceReview, originalProject: Project) => {
        const insightsPrompt = `Based on a previous video titled "${originalProject.title}", here's what we learned. What worked: ${review.whatWorked.join(', ')}. What to improve: ${review.whatToImprove.join(', ')}. Generate a new video idea based on this feedback for the ${originalProject.platform} platform.`;
        setPrefilledBlueprintPrompt(insightsPrompt);
        setActiveProjectId(null);
        addToast("Blueprint prompt pre-filled with performance insights!", "success");
    };
  
    const handleDeleteProject = (projectId: string) => {
        requestConfirmation(t('confirmation_modal.delete_project_title'), t('confirmation_modal.delete_project_message'), async () => {
            try {
                await supabaseService.deleteProject(projectId);
                addToast(t('toast.project_deleted'), 'success');
                setProjects(prev => prev.filter(p => p.id !== projectId));
                if (activeProjectId === projectId) {
                    setActiveProjectId(null);
                }
            } catch (error) {
                addToast(`${t('toast.failed_delete_project')}: ${getErrorMessage(error)}`, 'error');
            }
        });
    };
    
    const dismissTutorial = (id: string) => { const newDismissed = [...dismissedTutorials, id]; setDismissedTutorials(newDismissed); localStorage.setItem('viralyzaier-tutorials', JSON.stringify(newDismissed)); };
    const dismissToast = (id: number) => { setToasts(t => t.filter(toast => toast.id !== id)); };
    
    const requirePermission = useCallback((requiredPlan: PlanId): boolean => {
      if (!user) return false;
      const userPlanIndex = PLANS.findIndex(p => p.id === user.subscription.planId);
      const requiredPlanIndex = PLANS.findIndex(p => p.id === requiredPlan);

      const hasActiveSubscription = user.subscription.status === 'active' || (user.subscription.status === 'canceled' && user.subscription.endDate && user.subscription.endDate * 1000 > Date.now());

      if (hasActiveSubscription && userPlanIndex >= requiredPlanIndex) {
        return true;
      }

      setUpgradeReason({
        title: t('upgrade_modal.default_title'),
        description: t('upgrade_modal.default_description')
      });
      setUpgradeModalOpen(true);
      return false;
    }, [user, t]);
    
    const handleSubscriptionChange = async (planId: PlanId) => {
        if (!user) return;
        if (user.subscription.planId === planId && user.subscription.status === 'active') {
            addToast(t('toast.already_on_plan'), 'info');
            return;
        }

        try {
            if (planId === 'free') {
                addToast("Downgrading to Free is handled through your Stripe customer portal.", "info");
            } else {
                const { checkoutUrl } = await createCheckoutSession(planId);
                window.location.href = checkoutUrl;
            }
        } catch (error) {
            const errorMessage = getErrorMessage(error);
            addToast(t('toast.subscription_failed', { error: errorMessage }), 'error');
        }
    };
    
    const markNotificationAsRead = useCallback(async (notificationId: string) => {
        try {
            await supabaseService.markNotificationAsRead(notificationId);
            setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
        } catch (error) {
            addToast(`Failed to mark notification as read: ${getErrorMessage(error)}`, "error");
        }
    }, [addToast]);

    const markAllNotificationsAsRead = useCallback(async () => {
        if (!user) return;
        try {
            await supabaseService.markAllNotificationsAsRead(user.id);
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (error) {
            addToast(`Failed to mark all notifications as read: ${getErrorMessage(error)}`, "error");
        }
    }, [user, addToast]);

    const openScheduleModal = (projectId: string) => {
        setProjectToSchedule(projectId);
        setScheduleModalOpen(true);
    };

    const closeScheduleModal = () => {
        setProjectToSchedule(null);
        setScheduleModalOpen(false);
    };

    const value: AppContextType = {
        session, user, projects, toasts, dismissedTutorials,
        isUpgradeModalOpen, upgradeReason, confirmation, activeProjectId,
        language, setLanguage, t, prefilledBlueprintPrompt,
        notifications, markNotificationAsRead, markAllNotificationsAsRead,
        isInitialLoading, isScheduleModalOpen, projectToSchedule,
        openScheduleModal, closeScheduleModal, backendError, clearBackendError,
        addToast, dismissToast, dismissTutorial, handleLogout, consumeCredits, requirePermission,
        handleSubscriptionChange, handleUpdateProject, handleCreateProjectFromBlueprint,
        handleCreateProjectFromIdea, handleDeleteProject, requestConfirmation, setUpgradeModalOpen,
        setActiveProjectId, setUser, setPrefilledBlueprintPrompt, handleCreateProjectFromInsights,
        addProjects,
    };
    
    return (
        <AppContext.Provider value={value}>
            {children}
            <UpgradeModal />
            {createPortal(<ConfirmationModal isOpen={confirmation.isOpen} onClose={handleCancelConfirmation} onConfirm={handleConfirmation} title={confirmation.title}>{confirmation.message}</ConfirmationModal>, document.getElementById('modal-root')!)}
        </AppContext.Provider>
    );
};

export const useAppContext = (): AppContextType => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};
