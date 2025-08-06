import React, { useState, useEffect, useRef } from 'react';
import { Project, Blueprint, Platform } from '../types';
import { FilePlusIcon, SparklesIcon, LightBulbIcon, YouTubeIcon, TikTokIcon, InstagramIcon, CheckCircleIcon } from './Icons';
import TutorialCallout from './TutorialCallout';
import KanbanBoard from './KanbanBoard';
import { PLANS } from '../services/paymentService';
import { useAppContext } from '../contexts/AppContext';
import { getErrorMessage } from '../utils';
import Loader from './Loader';

const platformConfig: { [key in Platform]: { icon: React.FC<{className?: string}>, nameKey: string, descKey: string } } = {
    youtube_long: { icon: YouTubeIcon, nameKey: 'platform.youtube_long_name', descKey: 'platform.youtube_long_desc' },
    youtube_short: { icon: YouTubeIcon, nameKey: 'platform.youtube_short_name', descKey: 'platform.youtube_short_desc' },
    tiktok: { icon: TikTokIcon, nameKey: 'platform.tiktok_name', descKey: 'platform.tiktok_desc' },
    instagram: { icon: InstagramIcon, nameKey: 'platform.instagram_name', descKey: 'platform.instagram_desc' },
};

interface NewProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const NewProjectModal: React.FC<NewProjectModalProps> = ({ isOpen, onClose }) => {
    const { user, handleCreateProjectForBlueprint, t, addToast, lockAndExecute } = useAppContext();
    const [topicOrUrl, setTopicOrUrl] = useState('');
    const [platform, setPlatform] = useState<Platform | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleCreate = () => lockAndExecute(async () => {
        if (!platform) {
            setError(t('blueprint_modal.error_platform'));
            return;
        }
        if (!topicOrUrl.trim()) {
            setError(t('blueprint_modal.error_topic'));
            return;
        }
        
        await handleCreateProjectForBlueprint(topicOrUrl, platform, topicOrUrl);
        handleClose();
    });

    const handleClose = () => {
        setTopicOrUrl('');
        setError(null);
        setPlatform(null);
        onClose();
    };

    if (!isOpen) return null;
    
    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start pt-12 md:pt-20 justify-center z-50 animate-fade-in-up" 
            style={{ animationDuration: '0.3s' }} 
            onClick={handleClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-project-modal-title"
        >
            <div className="bg-gray-800 border border-indigo-500/50 rounded-2xl shadow-2xl w-full max-w-2xl m-4 transform transition-all p-6 text-center flex flex-col" onClick={(e) => e.stopPropagation()}>
                <header className="mb-4 flex-shrink-0">
                    <h2 id="new-project-modal-title" className="text-3xl font-bold text-white mb-2 flex items-center justify-center">
                        <FilePlusIcon className="w-8 h-8 mr-3 text-indigo-400"/> {t('dashboard.new_blueprint')}
                    </h2>
                    <p className="text-gray-400">{t('blueprint_modal.subtitle')}</p>
                </header>
                
                <div className="space-y-6">
                    <div>
                       <h3 className="text-lg font-semibold text-white mb-2 text-left">{t('blueprint_modal.step1')}</h3>
                       <div className="grid grid-cols-2 gap-4">
                           {(['youtube_long', 'youtube_short', 'tiktok', 'instagram'] as Platform[]).map(p => {
                                const config = platformConfig[p];
                                return (
                                   <button key={p} onClick={() => setPlatform(p)} className={`text-left p-4 rounded-lg border-2 transition-colors ${platform === p ? 'bg-indigo-900/50 border-indigo-500' : 'bg-gray-700/50 border-transparent hover:border-indigo-600'}`}>
                                       <div className="flex items-center gap-3">
                                           {React.createElement(config.icon, { className: "w-8 h-8" })}
                                           <span className="font-bold text-white">{t(config.nameKey as any)}</span>
                                       </div>
                                       <p className="text-xs text-gray-400 mt-2">{t(config.descKey as any)}</p>
                                   </button>
                                )
                           })}
                       </div>
                   </div>
                   <div>
                       <h3 className="text-lg font-semibold text-white text-left mb-2">{t('blueprint_modal.step2')}</h3>
                       <textarea
                           value={topicOrUrl}
                           onChange={e => setTopicOrUrl(e.target.value)}
                           placeholder={t('blueprint_modal.topic_placeholder')}
                           rows={2}
                           className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                       />
                   </div>
                   <button
                       onClick={handleCreate}
                       className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors"
                   >
                       {t('new_project_modal.create_button')}
                   </button>
                   {error && <p className="text-red-400 mt-2">{error}</p>}
               </div>
            </div>
        </div>
    );
};

interface DashboardProps {
    onSelectProject: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onSelectProject }) => {
    const { user, projects, dismissedTutorials, addToast, t, isInitialLoading } = useAppContext();
    const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
    
    useEffect(() => {
        const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
        if (user && projects.length === 0 && !isInitialLoading && !hasSeenOnboarding) {
          setIsNewProjectModalOpen(true);
          localStorage.setItem('hasSeenOnboarding', 'true');
        }
    }, [user, projects, isInitialLoading]);

    const creditsUsed = (user ? PLANS.find(p => p.id === user.subscription.planId)!.creditLimit : 0) - (user?.aiCredits || 0);

    const handleCreateProject = () => {
         if (user?.subscription.planId === 'free' && projects.length >= 1) {
            addToast("Free Plan Project Limit Reached. Please upgrade.", 'error');
            return;
        }
        setIsNewProjectModalOpen(true);
    };

    if (isInitialLoading) {
        return <div className="flex justify-center items-center h-64"><Loader /></div>;
    }

    return (
        <div className="animate-fade-in-up space-y-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                    <h1 className="text-4xl lg:text-5xl font-black text-white">
                        {t('dashboard.title')}
                    </h1>
                     {user?.email && <p className="mt-2 text-lg text-gray-400">{t('dashboard.welcome_back', {userName: user.email.split('@')[0]})}</p>}
                </div>
                <button
                    onClick={handleCreateProject}
                    className="mt-4 md:mt-0 inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg"
                >
                    <FilePlusIcon className="w-6 h-6 mr-2" />
                    {t('dashboard.new_blueprint')}
                </button>
            </header>

            {projects.length === 0 && !dismissedTutorials.includes('welcome') && (
                <TutorialCallout id="welcome">
                    {t('dashboard.tutorial_callout_new')}
                </TutorialCallout>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-800/50 p-4 rounded-lg text-center">
                    <p className="text-sm font-semibold text-gray-400">{t('dashboard.total_projects')}</p>
                    <p className="text-4xl font-black text-white mt-1">{projects.length}</p>
                </div>
                <div className="bg-gray-800/50 p-4 rounded-lg text-center">
                    <p className="text-sm font-semibold text-gray-400">{t('dashboard.published_videos')}</p>
                    <p className="text-4xl font-black text-white mt-1">{projects.filter(p => p.status === 'Published').length}</p>
                </div>
                <div className="bg-gray-800/50 p-4 rounded-lg text-center">
                    <p className="text-sm font-semibold text-gray-400">{t('dashboard.credits_used')}</p>
                    <p className="text-4xl font-black text-white mt-1">{creditsUsed}</p>
                </div>
            </div>

            <div>
                 <h2 className="text-2xl font-bold text-white mb-4">{t('dashboard.workflow_title')}</h2>
                 {projects.length > 0 ? (
                    <KanbanBoard projects={projects} onViewProject={onSelectProject} />
                 ) : (
                    <div className="text-center py-16 px-6 bg-gray-800/50 rounded-2xl">
                        <h2 className="text-2xl font-bold text-white mb-3">{t('dashboard.empty_title')}</h2>
                        <p className="text-gray-400 mb-6">{t('dashboard.empty_subtitle')}</p>
                    </div>
                 )}
            </div>
            
            <NewProjectModal 
                isOpen={isNewProjectModalOpen}
                onClose={() => setIsNewProjectModalOpen(false)}
            />
        </div>
    );
};

export default Dashboard;