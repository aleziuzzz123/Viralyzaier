import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Project, User, Toast, Platform, Opportunity, ContentGapSuggestion } from './types';
import Dashboard from './components/Dashboard';
import ProjectView from './components/ProjectView';
import ContentCalendar from './components/ContentCalendar';
import PricingPage from './components/PricingPage';
import UserMenu from './components/UserMenu';
import Homepage from './components/Homepage';
import { DashboardIcon, CalendarIcon, GithubIcon, SparklesIcon, CheckCircleIcon, XCircleIcon, InfoIcon, ChartPieIcon, PhotoIcon, BellIcon, CogIcon, RocketLaunchIcon } from './components/Icons';
import ChannelHub from './components/ChannelHub';
import AssetLibrary from './components/AssetLibrary';
import { AppProvider, useAppContext } from './contexts/AppContext';
import LanguageSwitcher from './components/LanguageSwitcher';
import NotificationsPanel from './components/NotificationsPanel';
import Autopilot from './components/Autopilot';
import Settings from './components/Settings';
import ScheduleModal from './components/ScheduleModal';


type View = 'dashboard' | 'project' | 'calendar' | 'pricing' | 'channel' | 'assetLibrary' | 'autopilot' | 'settings';

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
        t, notifications
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
        setCurrentView(view);
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
    
            {createPortal(toasts.map(toast => <ToastComponent key={toast.id} toast={toast} onDismiss={dismissToast} />), document.getElementById('toast-container')!)}
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