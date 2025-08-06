
import React, { createContext, useState, useEffect, useCallback, useContext, ReactNode, useRef } from 'react';
import { Project, User, PlanId, Blueprint, Toast, Platform, Opportunity, ContentGapSuggestion, PerformanceReview, Notification, ProjectStatus, Database, UserAsset, BrandIdentity, TimelineState, VideoStyle } from '../types';
import * as supabaseService from '../services/supabaseService';
import { supabase } from '../services/supabaseClient'; // Import client directly
import { type AuthSession } from '@supabase/supabase-js';
import { createCheckoutSession, PLANS } from '../services/paymentService';
import { fetchVideoPerformance } from '../services/youtubeService';
import { translations, Language, TranslationKey } from '../translations';
import { getErrorMessage } from '../utils';

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
    handleCreateProjectForBlueprint: (topic: string, platform: Platform, title: string, voiceoverVoiceId: string) => Promise<void>;
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
    
    const isOperationLocked = useRef(false); // Global lock for all major AI operations

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

    useEffect(() => {
        if (session?.user) {
            setIsInitialLoading(true);
            const loadData = async () => {
                try {
                    let profile = await supabaseService.getUserProfile(session.user.id);

                    if (!profile) {
                        console.warn("Profile not found for logged-in user. Attempting to create one as a fallback.");
                        profile = await supabaseService.createProfileForUser(session.user.id, session.user.email!);
                        if (profile) {
                             addToast("Welcome! Your profile has been set up.", "success");
                        }
                    }

                    if (profile) {
                        setUser(profile);
                        const [userProjects, userNotifications] = await Promise.all([
                            supabaseService.getProjectsForUser(session.user.id),
                            supabaseService.getNotifications(session.user.id),
                        ]);
                        setProjects(userProjects);
                        setNotifications(userNotifications);
                        
                        // Gracefully handle missing brand_identities table
                        try {
                            const userBrandIdentities = await supabaseService.getBrandIdentitiesForUser(session.user.id);
                            setBrandIdentities(userBrandIdentities);
                        } catch (err) {
                            const errorMessage = getErrorMessage(err);
                            if (errorMessage.includes('relation "public.brand_identities" does not exist')) {
                                console.warn(
                                    "Warning: 'brand_identities' table not found. Brand Identity features will be disabled. To enable this, please run the required SQL migration in your Supabase project."
                                );
                                setBrandIdentities([]); // Handle missing table gracefully
                            } else {
                                // For any other error, re-throw it to be caught by the outer catch block
                                throw err;
                            }
                        }

                    } else {
                        console.error("Critical error: User is logged in but profile does not exist and could not be created.");
                        addToast(t('toast.loading_user_error'), "error");
                        await supabaseService.signOut();
                    }
                } catch (err) {
                    console.error('Failed to load user data:', err);
                    addToast(`${t('toast.failed_fetch_profile')}: ${getErrorMessage(err)}`, 'error');
                } finally {
                    setIsInitialLoading(false);
                }
            };
            loadData();
        } else {
            setUser(null);
            setProjects([]);
            setNotifications([]);
            setBrandIdentities([]);
            setIsInitialLoading(false);
        }
    }, [session, addToast, t]);
    
     // Real-time subscriptions
    useEffect(() => {
        if (!session?.user?.