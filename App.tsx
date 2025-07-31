

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ApiKeyBanner from './components/ApiKeyBanner';
import BackendBanner from './BackendBanner';
import { Project, User, Toast, Platform, Opportunity, ContentGapSuggestion } from './types';
import Dashboard from './components/Dashboard';
import ProjectView from './components/ProjectView';
import ContentCalendar from './components/ContentCalendar';
import PricingPage from './components/PricingPage';
import UserMenu from './components/UserMenu';
import Homepage from './components/Homepage';
import { DashboardIcon, CalendarIcon, GithubIcon, SparklesIcon, CheckCircleIcon, XCircleIcon, InfoIcon, ChartPieIcon } from './components/Icons';
import ChannelHub from './components/ChannelHub';
import { AppProvider, useAppContext } from './contexts/AppContext';
import LanguageSwitcher from './components/LanguageSwitcher';

type View = 'dashboard' | 'project' | 'calendar' | 'pricing' | 'channel';

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
            {icons[toast.type]}
            <p className="text-gray-200 text-sm font-medium">{toast.message}</p>
        </div>
    );
};

const MainApp = () => {
    const { 
        session, user, projects, apiKeyError, backendConfigError,
        toasts, dismissToast, activeProjectId, setActiveProjectId,
        t
    } = useAppContext();
    const [currentView, setCurrentView] = useState<View>('dashboard');

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
        if (!user && !backendConfigError) return <div className="bg-gray-900 min-h-screen flex items-center justify-center text-white">{t('toast.loading_user')}</div>;
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
            case 'dashboard':
            default:
                return <Dashboard onSelectProject={handleSelectProject} />;
        }
    };
    
    if (!session && !backendConfigError) {
        return <Homepage />;
    }

    if (!user && !backendConfigError) {
        return <div className="bg-gray-900 min-h-screen flex items-center justify-center text-white">{t('toast.loading')}</div>;
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col">
            {apiKeyError && <ApiKeyBanner />}
            {backendConfigError && <BackendBanner />}
            
            <header className="bg-black/30 border-b border-gray-700/50 px-4 sm:px-6 h-16 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center space-x-6">
                    <a href="#" onClick={(e) => { e.preventDefault(); handleSetView('dashboard'); }} className="flex items-center space-x-2 text-white">
                        <SparklesIcon className="w-7 h-7 text-indigo-500" />
                        <span className="font-bold text-lg hidden sm:inline">{t('app.name')}</span>
                    </a>
                    <nav className="hidden md:flex items-center space-x-2">
                        <button onClick={() => handleSetView('dashboard')} className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'dashboard' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-800'}`}><DashboardIcon className="w-5 h-5 inline mr-2"/>{t('nav.dashboard')}</button>
                        <button onClick={() => handleSetView('calendar')} className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'calendar' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-800'}`}><CalendarIcon className="w-5 h-5 inline mr-2"/>{t('nav.calendar')}</button>
                        <button onClick={() => handleSetView('channel')} className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'channel' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-800'}`}><ChartPieIcon className="w-5 h-5 inline mr-2"/>{t('nav.my_channel')}</button>
                    </nav>
                </div>
                <div className="flex items-center space-x-4">
                    <LanguageSwitcher variant="header" />
                    <a href="https://github.com/google/genai-js" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white" title={t('nav.powered_by')}><GithubIcon className="w-6 h-6" /></a>
                    <UserMenu onNavigate={handleSetView} />
                </div>
            </header>
          
            <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                <div className="w-full max-w-7xl mx-auto">{renderCurrentView()}</div>
            </main>
    
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