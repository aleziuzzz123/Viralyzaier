import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Project, User, Toast, Platform, Opportunity, ContentGapSuggestion } from './types';
import Dashboard from './components/Dashboard';
import ProjectView from './components/ProjectView';
import ContentCalendar from './components/ContentCalendar';
import PricingPage from './components/PricingPage';
import UserMenu from './components/UserMenu';
import Homepage from './components/Homepage';
import { DashboardIcon, CalendarIcon, GithubIcon, SparklesIcon, CheckCircleIcon, XCircleIcon, InfoIcon, ChartPieIcon, PhotoIcon, BellIcon, CogIcon, RocketLaunchIcon, WarningIcon } from './components/Icons';
import ChannelHub from './components/ChannelHub';
import AssetLibrary from './components/AssetLibrary';
import { AppProvider, useAppContext } from './contexts/AppContext';
import LanguageSwitcher from './components/LanguageSwitcher';
import NotificationsPanel from './components/NotificationsPanel';
import Autopilot from './components/Autopilot';
import Settings from './components/Settings';
import ScheduleModal from './components/ScheduleModal';
import UpgradeModal from './components/UpgradeModal';
import ConfirmationModal from './components/ConfirmationModal';


type View = 'dashboard' | 'project' | 'calendar' | 'pricing' | 'channel' | 'assetLibrary' | 'autopilot' | 'settings';

const BackendErrorModal: React.FC = () => {
    const { backendError, clearBackendError, t } = useAppContext();

    if (!backendError) return null;
    
    return (
         <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]" 
            onClick={clearBackendError}
            role="dialog"
            aria-modal="true"
            aria-labelledby="backend-error-modal-title"
        >
            <div 
                className="bg-gray-800 border border-red-500/50 rounded-2xl shadow-2xl w-full max-w-2xl m-4 p-8 text-center transform transition-all"
                onClick={(e) => e.stopPropagation()}
            >
                <button onClick={clearBackendError} className="absolute top-4 right-4 text-gray-500 hover:text-white">
                    <XCircleIcon className="w-8 h-8"/>
                </button>
                <div className="mx-auto bg-red-900/50 border border-red-500/50 p-3 rounded-full w-fit mb-6">
                   <WarningIcon className="w-10 h-10 text-red-400" />
                </div>
                <h2 id="backend-error-modal-title" className="text-2xl font-bold text-white mb-3">{backendError.title}</h2>
                <p className="text-gray-300 mb-6">
                    {t('backend_error.description')}
                </p>
                <div className="mt-4 text-left bg-gray-900 p-4 rounded-md">
                    <p className="text-sm text-gray-400 font-semibold">{t('backend_error.server_error_details')}</p>
                    <p className="mt-4 text-sm text-red-300 font-mono bg-red-900/50 p-2 rounded">
                        {backendError.message}
                    </p>
                    <div className="mt-4 text-sm text-amber-300 bg-amber-900/50 p-3 rounded-lg">
                        <p className="font-bold">{t('backend_error.how_to_fix_title')}</p>
                        <p className="mt-2 text-amber-200">
                           {t('backend_error.how_to_fix_intro')}
                        </p>
                        <ul className="list-disc list-inside mt-2 text-amber-200 text-xs space-y-1">
                            <li>{t('backend_error.how_to_fix_step1')}</li>
                            <li>{t('backend_error.how_to_fix_step2')}</li>
                            <li>{t('backend_error.how_to_fix_step3')}</li>
                            <li>{t('backend_error.how_to_fix_step4')}</li>
                        </ul>
                    </div>
                </div>
                <button
                    onClick={clearBackendError}
                    className="w-full max-w-xs mx-auto mt-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all"
                >
                    {t('backend_error.close_button')}
                </button>
            </div>
        </div>
    );
};

const ToastComponent: React.FC<{ toast: Toast, onDismiss: (id: number) => void }> = ({ toast, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss(toast.id);
        }, 5000);
        return () => clearTimeout(timer);
    }, [toast, onDismiss]);

    const icons = {
        success: <CheckCircleIcon className="w-6 h-6 text-green-400" />,
        error: <XCircleIcon className="w-6 h-6 text-red-400" />,
        info: <InfoIcon className="w-6 h-6 text-blue-400" />,
    };

    return (
        <div className="toast bg-gray-800 border border-gray-700 rounded-lg shadow-2xl p-4 flex items-center space-x-4 max-w-sm">
            <div className="flex-shrink-0">{icons[toast.type]}</div>
            <div className="flex-grow">
                <p className="text-gray-200 text-sm font-medium">{toast.message}</p>
                <div className="bg-gray-700 h-1 rounded-full mt-2">
                    <div className="bg-indigo-500 h-1 rounded-full animate-progress-bar"></div>
                </div>
            </div>
        </div>
    );
};

const MainApp = () => {
    const { 
        session, user, projects,
        toasts, dismissToast, activeProjectId, setActiveProjectId,
        t, notifications,
        confirmation, handleConfirmation, handleCancelConfirmation
    } = useAppContext();
    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

    useEffect(() => {
        if(activeProjectId) {
            setCurrentView('project');
        } else {
            if(currentView === 'project') {
                setCurrentView('dashboard');
            }
        }
    }, [activeProjectId, currentView]);

    const handleSetView = (view: View) => {
        if (view === 'pricing' && currentView === 'project') {
            // Do nothing to prevent navigation away from pricing when modal closes
        } else {
            setCurrentView(view);
        }
        if (view !== 'project') {
            setActiveProjectId(null);
        }
    };

    const handleSelectProject = (projectId: string) => {
        setActiveProjectId(projectId);
        setCurrentView('project');
    };

    const renderCurrentView = () => {
        if (!user) return <div className="bg-gray-900 min-h-screen flex items-center justify-center text-white">{t('toast.loading_user')}</div>;
        const activeProject = projects.find(p => p.id === activeProjectId);

        switch (currentView) {
            case 'project':
                if (activeProject) return <ProjectView project={activeProject} />;
                handleSetView('dashboard'); return null;
            case 'calendar':
                return <ContentCalendar />;
            case 'pricing':
                return <PricingPage />;
            case 'channel':
                return <ChannelHub />;
            case 'assetLibrary':
                return <AssetLibrary />;
            case 'autopilot':
                return <Autopilot />;
            case 'settings':
                return <Settings />;
            case 'dashboard':
            default:
                return <Dashboard onSelectProject={handleSelectProject} />;
        }
    };
    
    if (!session) {
        return <Homepage />;
    }

    if (!user) {
        return <div className="bg-gray-900 min-h-screen flex items-center justify-center text-white">{t('toast.loading')}</div>;
    }
    
    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col">
            <header className="bg-black/30 border-b border-gray-700/50 px-4 sm:px-6 h-16 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center space-x-6">
                    <a href="#" onClick={(e) => { e.preventDefault(); handleSetView('dashboard'); }} className="flex items-center space-x-2 text-white">
                        <SparklesIcon className="w-7 h-7 text-indigo-500" />
                        <span className="font-bold text-lg hidden sm:inline">{t('app.name')}</span>
                    </a>
                    <nav className="hidden md:flex items-center space-x-2">
                        <button onClick={() => handleSetView('dashboard')} className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'dashboard' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-800'}`}><DashboardIcon className="w-5 h-5 inline mr-2"/>{t('nav.dashboard')}</button>
                        <button onClick={() => handleSetView('autopilot')} className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'autopilot' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-800'}`}><RocketLaunchIcon className="w-5 h-5 inline mr-2"/>{t('nav.autopilot')}</button>
                        <button onClick={() => handleSetView('calendar')} className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'calendar' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-800'}`}><CalendarIcon className="w-5 h-5 inline mr-2"/>{t('nav.calendar')}</button>
                        <button onClick={() => handleSetView('channel')} className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'channel' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-800'}`}><ChartPieIcon className="w-5 h-5 inline mr-2"/>{t('nav.my_channel')}</button>
                        <button onClick={() => handleSetView('assetLibrary')} className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'assetLibrary' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-800'}`}><PhotoIcon className="w-5 h-5 inline mr-2"/>{t('nav.asset_library')}</button>
                    </nav>
                </div>
                <div className="flex items-center space-x-4">
                    <LanguageSwitcher variant="header" />
                    <a href="https://github.com/google/genai-js" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white" title={t('nav.powered_by')}><GithubIcon className="w-6 h-6" /></a>
                    <div className="relative">
                        <button onClick={() => setIsNotificationsOpen(prev => !prev)} className="text-gray-400 hover:text-white relative" title={t('nav.notifications')}>
                            <BellIcon className="w-6 h-6" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                                    {unreadCount}
                                </span>
                            )}
                        </button>
                        {isNotificationsOpen && <NotificationsPanel onClose={() => setIsNotificationsOpen(false)} />}
                    </div>
                    <UserMenu onNavigate={handleSetView} />
                </div>
            </header>
          
            <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                <div className="w-full max-w-7xl mx-auto">{renderCurrentView()}</div>
            </main>
            
            <ScheduleModal />
            <UpgradeModal />
            {confirmation.isOpen && (
                <ConfirmationModal 
                    isOpen={confirmation.isOpen} 
                    onClose={handleCancelConfirmation} 
                    onConfirm={handleConfirmation} 
                    title={confirmation.title}
                >
                    {confirmation.message}
                </ConfirmationModal>
            )}
            
            <BackendErrorModal />
    
            {document.getElementById('toast-container') && createPortal(toasts.map(toast => <ToastComponent key={toast.id} toast={toast} onDismiss={dismissToast} />), document.getElementById('toast-container')!)}
        </div>
    );
};

function App() {
    return (
        <AppProvider>
            <MainApp />
        </AppProvider>
    )
}

export default App;