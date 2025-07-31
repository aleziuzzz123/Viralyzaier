import React, { createContext, useState, useEffect, useCallback, useContext, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Project, User, PlanId, Blueprint, Toast, Platform, Opportunity, ContentGapSuggestion } from '../types';
import * as supabase from '../services/supabaseService';
import { isBackendConfigured } from '../services/supabaseService';
import { type AuthSession } from '@supabase/supabase-js';
import { createCheckoutSession, PLANS } from '../services/paymentService';
import { fetchVideoPerformanceByUrl } from '../services/youtubeService';
import UpgradeModal from '../components/UpgradeModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { translations, Language, TranslationKey } from '../translations';

interface AppContextType {
    session: AuthSession | null;
    user: User | null;
    projects: Project[];
    apiKeyError: boolean;
    backendConfigError: boolean;
    toasts: Toast[];
    dismissedTutorials: string[];
    isUpgradeModalOpen: boolean;
    upgradeReason: { title: string; description: string };
    confirmation: ConfirmationState;
    language: Language;
    
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
    handleDeleteProject: (projectId: string) => void;
    
    requestConfirmation: (title: string, message: string, onConfirm: () => void) => void;
    setUpgradeModalOpen: (isOpen: boolean) => void;
    
    setActiveProjectId: (id: string | null) => void;
    activeProjectId: string | null;
    
    setUser: (user: User | null) => void;
}

interface ConfirmationState {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{children: ReactNode}> = ({ children }) => {
    const [session, setSession] = useState<AuthSession | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    
    const [apiKeyError] = useState<boolean>(!process.env.API_KEY);
    const [backendConfigError] = useState<boolean>(!isBackendConfigured);

    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
    
    const [isUpgradeModalOpen, setUpgradeModalOpen] = useState(false);
    const [upgradeReason, setUpgradeReason] = useState<{title: string, description: string}>({title: '', description: ''});
    
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [dismissedTutorials, setDismissedTutorials] = useState<string[]>([]);
    const [confirmation, setConfirmation] = useState<ConfirmationState>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

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
        if (backendConfigError) return;

        supabase.getSession().then(({ session }) => setSession(session))
        .catch(err => {
            console.error("Failed to get initial session:", err);
            addToast("Could not connect to the authentication service.", "error");
        });

        const authListener = supabase.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        const savedTutorials = localStorage.getItem('viralyzaier-tutorials');
        setDismissedTutorials(savedTutorials ? JSON.parse(savedTutorials) : []);

        return () => {
            authListener?.unsubscribe();
        };

    }, [addToast, backendConfigError]);

    useEffect(() => {
        if (session?.user && !backendConfigError) {
            supabase.getUserProfile(session.user.id)
                .then(profile => {
                    if (profile) {
                        setUser(profile);
                    } else {
                        console.error("Critical error: User is logged in but profile does not exist in DB.");
                        addToast(t('toast.loading_user_error'), "error");
                        supabase.signOut();
                    }
                })
                .catch(err => {
                    console.error('Failed to load user profile:', err);
                    addToast(t('toast.failed_fetch_profile'), 'error');
                });
                
            supabase.getProjectsForUser(session.user.id)
                .then(setProjects)
                .catch(err => {
                    console.error('Failed to load projects:', err);
                    addToast(t('toast.failed_fetch_projects'), 'error');
                });
        } else {
            setUser(null);
            setProjects([]);
        }
    }, [session, addToast, t, backendConfigError]);
    
    // Immediate feedback after Stripe redirect
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('payment_success')) {
            addToast('Payment successful! Your plan has been upgraded.', 'success');
            window.history.replaceState({}, document.title, window.location.pathname); // Clean URL
        }
        if (urlParams.has('payment_canceled')) {
            addToast('Payment was canceled. You can try again from the pricing page.', 'info');
            window.history.replaceState({}, document.title, window.location.pathname); // Clean URL
        }
    }, [addToast]);

    // Simulate fetching performance data for published videos
    useEffect(() => {
        if (!session || backendConfigError || !projects.some(p => p.status === 'Published' && p.publishedUrl && !p.performance)) return;
        
        const fetchPerformanceData = async () => {
            const projectsToUpdate = projects.filter(p => p.status === 'Published' && p.publishedUrl && !p.performance);
            if (projectsToUpdate.length > 0) {
                const updatedProjectsPromises = projects.map(async (p) => {
                    if (projectsToUpdate.find(pu => pu.id === p.id)) {
                        const performance = await fetchVideoPerformanceByUrl(p.publishedUrl!);
                        const updated = await supabase.updateProject(p.id, { performance });
                        return updated;
                    }
                    return p;
                });
                const updatedProjects = await Promise.all(updatedProjectsPromises);
                setProjects(updatedProjects);
            }
        };
      
        const interval = setInterval(fetchPerformanceData, 30000);
        fetchPerformanceData();
      
        return () => clearInterval(interval);
    }, [session, projects, backendConfigError]);
    
    const requestConfirmation = (title: string, message: string, onConfirm: () => void) => { setConfirmation({ isOpen: true, title, message, onConfirm }); };
    const handleConfirmation = () => { confirmation.onConfirm(); setConfirmation({ isOpen: false, title: '', message: '', onConfirm: () => {} }); };
    const handleCancelConfirmation = () => { setConfirmation({ isOpen: false, title: '', message: '', onConfirm: () => {} }); };

    const handleLogout = () => {
        requestConfirmation(t('confirmation_modal.logout_title'), t('confirmation_modal.logout_message'), async () => {
            await supabase.signOut();
            setActiveProjectId(null);
            addToast(t('toast.logged_out'));
        });
    };

    const consumeCredits = useCallback(async (amount: number): Promise<boolean> => {
        if (!user || backendConfigError) return false;
        
        try {
            const result = await supabase.invokeEdgeFunction('consume-credits', { amount_to_consume: amount });

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
            const errorMessage = e instanceof Error ? e.message : t('toast.insufficient_credits_error');
            addToast(errorMessage, 'error');
            return false;
        }
    }, [user, addToast, t, backendConfigError]);

    const handleUpdateProject = async (updatedProjectData: Partial<Project> & { id: string }) => {
        if (backendConfigError) return null;
        try {
            const updatedProject = await supabase.updateProject(updatedProjectData.id, updatedProjectData);
            setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
            return updatedProject;
        } catch (error) {
            addToast(t('toast.failed_update_project'), "error");
            return null;
        }
    };
    
    const handleCreateProjectFromBlueprint = async (blueprint: Blueprint, selectedTitle: string) => {
        if (!user || backendConfigError) return;
        
        try {
            const moodboardUrls = await Promise.all(
                blueprint.moodboard.map(async (base64Img, index) => {
                    const blob = await supabase.dataUrlToBlob(base64Img);
                    const path = `${user.id}/temp_${Date.now()}/moodboard_${index}.jpg`;
                    return supabase.uploadFile(blob, path);
                })
            );

            const newProjectData: Omit<Project, 'id' | 'lastUpdated'> = {
                name: selectedTitle, status: 'Idea', platform: blueprint.platform,
                topic: blueprint.strategicSummary, title: selectedTitle, script: blueprint.script,
                moodboard: moodboardUrls, workflowStep: 2, analysis: null,
                competitorAnalysis: null, scheduledDate: null, assets: {}, soundDesign: null,
                launchPlan: null, performance: null, publishedUrl: undefined,
            };

            const newProject = await supabase.createProject(newProjectData, user.id);
            setProjects(prev => [newProject, ...prev]);
            setActiveProjectId(newProject.id);
            addToast(t('toast.project_created_blueprint'), 'success');
        } catch (error) {
            addToast(error instanceof Error ? error.message : t('toast.failed_update_project'), "error");
        }
    };

    const handleCreateProjectFromIdea = async (suggestion: Opportunity | ContentGapSuggestion, platform: Platform) => {
         if (!user || backendConfigError) return;
        const title = 'suggestedTitle' in suggestion ? suggestion.suggestedTitle : (suggestion.potentialTitles[0] || suggestion.idea);
        const newProjectData: Omit<Project, 'id'|'lastUpdated'> = {
            name: suggestion.idea, status: 'Idea', platform: platform, topic: suggestion.reason,
            title: title, workflowStep: 1, script: null, analysis: null,
            competitorAnalysis: null, scheduledDate: null, moodboard: null, assets: {},
            soundDesign: null, launchPlan: null, performance: null, publishedUrl: undefined,
        };
        const newProject = await supabase.createProject(newProjectData, user.id);
        setProjects(prev => [newProject, ...prev]);
        setActiveProjectId(newProject.id);
        addToast(t('toast.project_created_idea'), 'success');
    };
  
    const handleDeleteProject = (projectId: string) => {
        requestConfirmation(t('confirmation_modal.delete_project_title'), t('confirmation_modal.delete_project_message'), async () => {
            if (backendConfigError) return;
            try {
                await supabase.deleteProject(projectId);
                addToast(t('toast.project_deleted'), 'success');
                setProjects(prev => prev.filter(p => p.id !== projectId));
                if (activeProjectId === projectId) {
                    setActiveProjectId(null);
                }
            } catch {
                addToast(t('toast.failed_delete_project'), 'error');
            }
        });
    };
    
    const dismissTutorial = (id: string) => { const newDismissed = [...dismissedTutorials, id]; setDismissedTutorials(newDismissed); localStorage.setItem('viralyzaier-tutorials', JSON.stringify(newDismissed)); };
    const dismissToast = (id: number) => { setToasts(t => t.filter(toast => toast.id !== id)); };
    
    const requirePermission = useCallback((requiredPlan: PlanId): boolean => { if (!user) return false; const userPlanIndex = PLANS.findIndex(p => p.id === user.subscription.planId); const requiredPlanIndex = PLANS.findIndex(p => p.id === requiredPlan); if (userPlanIndex >= requiredPlanIndex) { return true; } const requiredPlanDetails = PLANS[requiredPlanIndex]; setUpgradeReason({ title: t('upgrade_modal.default_title'), description: t('upgrade_modal.default_description') }); setUpgradeModalOpen(true); return false; }, [user, t]);
    
    const handleSubscriptionChange = async (planId: PlanId) => {
        if (!user || backendConfigError) return;
        if (user.subscription.planId === planId && user.subscription.status === 'active') {
            addToast(t('toast.already_on_plan'), 'info');
            return;
        }

        try {
            if (planId === 'free') {
                const newPlan = PLANS.find(p => p.id === planId)!;
                const updatedUser = await supabase.updateUserProfile(user.id, {
                    subscription: { planId: 'free', status: 'active', endDate: null },
                    aiCredits: newPlan.creditLimit,
                });
                setUser(updatedUser);
                addToast(t('toast.subscription_success', { planName: t('pricing.plan_free') }), 'success');
            } else {
                const { checkoutUrl } = await createCheckoutSession(planId);
                window.location.href = checkoutUrl;
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            addToast(t('toast.subscription_failed', { error: errorMessage }), 'error');
        }
    };

    const value: AppContextType = {
        session, user, projects, apiKeyError, backendConfigError, toasts, dismissedTutorials,
        isUpgradeModalOpen, upgradeReason, confirmation, activeProjectId,
        language, setLanguage, t,
        addToast, dismissToast, dismissTutorial, handleLogout, consumeCredits, requirePermission,
        handleSubscriptionChange, handleUpdateProject, handleCreateProjectFromBlueprint,
        handleCreateProjectFromIdea, handleDeleteProject, requestConfirmation, setUpgradeModalOpen,
        setActiveProjectId, setUser,
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