
import React, { useState, useCallback, useEffect, useContext } from 'react';
import Joyride, { Step, CallBackProps } from 'react-joyride';
import { InputForm } from './InputForm';
import { ScriptDisplay } from './ScriptDisplay';
import { getOptimizationTrace, analyzeScriptVirality, enhanceTopic, generateVisualsForScript, remixScript, QUOTA_ERROR_MESSAGE } from '../services/geminiService';
import type { Script, Client, Folder, User, Notification, EnhancedTopic, Trend, OptimizationStep, Plan } from '../types';
import { SavedScriptsView } from './SavedScriptsView';
import { TrendingTopicsView } from './TrendingTopicsView';
import { DFYContentView } from './DFYContentView.tsx';
import { AgencyView } from './AgencyView';
import { AddClientModal } from './AddClientModal';
import { DashboardHomeView } from './DashboardHomeView';
import { AccountSettingsView } from './AccountSettingsView';
import { NotificationsPanel } from './NotificationsPanel';
import { PlaceholderView } from './PlaceholderView';
import { SaveScriptModal } from './SaveScriptModal';
import { EditClientModal } from './EditClientModal';
import { ConfirmationModal } from './ConfirmationModal';
import { VideoDeconstructorView } from './VideoDeconstructorView';
import { PersonalizationModal } from './PersonalizationModal';
import { AuthContext } from '../context/AuthContext.tsx';
import { DataContext } from '../context/DataContext.tsx';
import { UIContext } from '../context/UIContext.tsx';
import { QuotaErrorModal } from './QuotaErrorModal';
import { supabase } from '../services/supabaseClient.ts';
import { AIOptimizerView } from './AIOptimizerView.tsx';
import { UpgradeModal } from './UpgradeModal.tsx';
import { CrownIcon } from './icons/CrownIcon.tsx';

interface DashboardProps {
    impersonatingClient: Client | null;
    onLoginAsClient: (client: Client) => void;
    onLogoutClientView: () => void;
    onNavigate: (state: 'sales' | 'oto1' | 'oto2' | 'oto3' | 'app' | 'auth') => void;
}

interface MenuItem {
    name: string;
    icon: string;
    requiredPlan?: Plan;
    hasNew?: boolean;
}

const kebabCase = (str: string) => str.toLowerCase().replace(/\s+/g, '-');

const tourSteps: Step[] = [
  {
    target: '#new-project-btn',
    content: "Welcome to Vid Script Hub! Click here to start a new project and generate your first AI-optimized script.",
    placement: 'bottom',
  },
  {
    target: `#${kebabCase('Trending Topics')}-nav`,
    content: "Don't know what to post? Visit the Trending Topics Hub to see what's currently going viral in any niche.",
    placement: 'right',
  },
  {
    target: `#${kebabCase('DFY Content Vault')}-nav`,
    content: "Need content FAST? Our DFY Vault is packed with ready-to-use scripts, hooks, and more.",
    placement: 'right',
  },
  {
    target: `#${kebabCase('Video Deconstructor')}-nav`,
    content: "Found a viral video you love? Paste its YouTube URL here to 'steal' its secret formula.",
    placement: 'right',
  },
  {
    target: `#${kebabCase('Saved Scripts')}-nav`,
    content: "All your saved creations are kept here. You can organize them into folders for easy access.",
    placement: 'right',
  },
  {
    target: `#${kebabCase('Account Settings')}-nav`,
    content: "Finally, you can manage your account details and preferences here.",
    placement: 'right',
  },
];

const joyrideStyles = {
    options: {
        arrowColor: '#2A1A5E',
        backgroundColor: '#2A1A5E',
        primaryColor: '#DAFF00',
        textColor: '#F0F0F0',
        zIndex: 10000,
    },
    tooltip: {
        border: '1px solid #4A3F7A',
        borderRadius: '8px'
    },
    buttonClose: { color: '#F0F0F0' },
    buttonNext: {
      backgroundColor: '#DAFF00',
      color: '#1A0F3C',
      fontWeight: 'bold',
      borderRadius: '6px'
    },
    buttonBack: { color: '#DAFF00' },
    buttonSkip: { color: '#a78bfa' }
};

export const Dashboard: React.FC<DashboardProps> = ({ impersonatingClient, onLoginAsClient, onLogoutClientView, onNavigate }) => {
  const { state: authState, dispatch: authDispatch } = useContext(AuthContext);
  const { user, isLoading: isAuthLoading, error: authError } = authState;
  const { state: dataState, dispatch: dataDispatch } = useContext(DataContext);
  const { savedScripts, folders, clients, watchedTrends, notifications } = dataState;
  const { state: uiState, dispatch: uiDispatch } = useContext(UIContext);
  const { movingScriptId, isNewDfyAvailable, runTour } = uiState;
  
  const isGuest = user?.id.startsWith('guest-') ?? false;

  const [generatedScript, setGeneratedScript] = useState<Script | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState('Dashboard');
  const [initialTopic, setInitialTopic] = useState<string | undefined>(undefined);
  const [scoringScriptId, setScoringScriptId] = useState<string | null>(null);
  const [visualizingScriptId, setVisualizingScriptId] = useState<string | null>(null);
  const [speakingScriptId, setSpeakingScriptId] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [enhancedTopics, setEnhancedTopics] = useState<EnhancedTopic[]>([]);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isRemixing, setIsRemixing] = useState(false);

  const [optimizationTrace, setOptimizationTrace] = useState<OptimizationStep[] | null>(null);
  
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [isEditClientModalOpen, setIsEditClientModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [scriptToSave, setScriptToSave] = useState<Script | null>(null);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [confirmationProps, setConfirmationProps] = useState({ onConfirm: () => {}, title: '', message: '' });
  const [isPersonalizationModalOpen, setIsPersonalizationModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeModalProps, setUpgradeModalProps] = useState<{ requiredPlan: Plan; featureName: string }>({ requiredPlan: 'unlimited',