

import React, { useState, useEffect } from 'react';
import { Project, Blueprint, Platform } from '../types';
import { FilePlusIcon, SparklesIcon, LightBulbIcon, YouTubeIcon, TikTokIcon, InstagramIcon } from './Icons';
import { generateVideoBlueprint } from '../services/geminiService';
import TutorialCallout from './TutorialCallout';
import KanbanBoard from './KanbanBoard';
import { PLANS } from '../services/paymentService';
import { useAppContext } from '../contexts/AppContext';
import Loader from './Loader';

const platformIcons: { [key in Platform]: React.FC<{className?: string}> } = {
    youtube: YouTubeIcon,
    tiktok: TikTokIcon,
    instagram: InstagramIcon,
};

const BlueprintGeneratorModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    const { user, consumeCredits, addToast, handleCreateProjectFromBlueprint, t, prefilledBlueprintPrompt, setPrefilledBlueprintPrompt } = useAppContext();
    const [topicOrUrl, setTopicOrUrl] = useState('');
    const [platform, setPlatform] = useState<Platform | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
    const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
    
    useEffect(() => {
        if (isOpen && prefilledBlueprintPrompt) {
            setTopicOrUrl(prefilledBlueprintPrompt);
            setPrefilledBlueprintPrompt(null); // Consume the pre-filled prompt
            addToast("Prompt pre-filled from performance insights!", 'success');
        }
    }, [isOpen, prefilledBlueprintPrompt, setPrefilledBlueprintPrompt, addToast]);


    const handleGenerate = async () => {
        if (!platform) {
            setError(t('blueprint_modal.error_platform'));
            return;
        }
        if (!topicOrUrl.trim()) {
            setError(t('blueprint_modal.error_topic'));
            return;
        }
        if (!await consumeCredits(5)) return;

        setIsLoading(true);
        setError(null);
        setBlueprint(null);
        setSelectedTitle(null);
        try {
            const result = await generateVideoBlueprint(topicOrUrl, platform);
            setBlueprint(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleUseChannelData = () => {
        if (user?.channelAudit) {
            const audit = user.channelAudit;
            const prompt = `A video idea based on my channel's successful formula: "${audit.viralFormula}", targeting my audience: "${audit.audiencePersona}", and related to my content pillars: ${audit.contentPillars.join(', ')}.`;
            setTopicOrUrl(prompt);
            addToast(t('toast.topic_prefilled'), 'success');
        }
    };

    const handleAccept = () => {
        if (blueprint && selectedTitle) {
            handleCreateProjectFromBlueprint(blueprint, selectedTitle);
            handleClose();
        } else {
            addToast(t('toast.select_title_first'), 'error');
        }
    };

    const handleClose = () => {
        setBlueprint(null);
        setTopicOrUrl('');
        setError(null);
        setSelectedTitle(null);
        setPlatform(null);
        onClose();
    };

    if (!isOpen) return null;
    
    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-up" 
            style={{ animationDuration: '0.3s' }} 
            onClick={handleClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="blueprint-modal-title"
        >
            <div className="bg-gray-800 border border-indigo-500/50 rounded-2xl shadow-2xl w-full max-w-3xl m-4 transform transition-all p-8 text-center max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <header className="mb-6 flex-shrink-0">
                    <h2 id="blueprint-modal-title" className="text-3xl font-bold text-white mb-2 flex items-center justify-center">
                        <LightBulbIcon className="w-8 h-8 mr-3 text-yellow-300"/> {t('blueprint_modal.title')}
                    </h2>
                    <p className="text-gray-400">{t('blueprint_modal.subtitle')}</p>
                </header>
                
                <div className="overflow-y-auto pr-4 -mr-4 space-y-6 flex-grow">
                    {!blueprint && !isLoading && (
                         <div className="space-y-6">
                             <div>
                                <h3 className="text-lg font-semibold text-white mb-3 text-left">{t('blueprint_modal.step1')}</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    {(['youtube', 'tiktok', 'instagram'] as Platform[]).map(p => (
                                        <button key={p} onClick={() => setPlatform(p)} className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-colors ${platform === p ? 'bg-indigo-900/50 border-indigo-500' : 'bg-gray-700/50 border-transparent hover:border-indigo-600'}`}>
                                            {React.createElement(platformIcons[p], { className: "w-10 h-10 mb-2" })}
                                            <span className="font-semibold capitalize">{p}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-lg font-semibold text-white text-left">{t('blueprint_modal.step2')}</h3>
                                    {user?.channelAudit && (
                                        <button 
                                            onClick={handleUseChannelData}
                                            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center"
                                        >
                                            <SparklesIcon className="w-4 h-4 mr-1.5"/>
                                            {t('blueprint_modal.use_channel_data')}
                                        </button>
                                    )}
                                </div>
                                <textarea
                                    value={topicOrUrl}
                                    onChange={e => setTopicOrUrl(e.target.value)}
                                    placeholder={t('blueprint_modal.topic_placeholder')}
                                    rows={3}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <button
                                onClick={handleGenerate}
                                disabled={!platform || !topicOrUrl}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                            >
                                {t('blueprint_modal.generate_button')}
                            </button>
                            {error && <p className="text-red-400 mt-2">{error}</p>}
                        </div>
                    )}
                    
                    {isLoading && (
                         <div className="flex flex-col items-center justify-center space-y-4 text-center mt-8">
                            <SparklesIcon className="w-12 h-12 text-indigo-400 animate-pulse"/>
                            <p className="text-lg text-gray-200 font-semibold">{t('blueprint_modal.loading')}</p>
                            <p className="text-sm text-gray-500">{t('blueprint_modal.loading_subtitle')}</p>
                        </div>
                    )}

                    {blueprint && (
                         <div className="space-y-6 text-left">
                            <div>
                                <h3 className="text-lg font-bold text-white mb-2">{t('blueprint_modal.strategic_summary')}</h3>
                                <p className="text-gray-300 italic">"{blueprint.strategicSummary}"</p>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white mb-2">{t('blueprint_modal.choose_title')}</h3>
                                <ul className="space-y-2">
                                    {blueprint.suggestedTitles.map((title, i) => (
                                        <li key={i}>
                                            <button 
                                                onClick={() => setSelectedTitle(title)}
                                                className={`w-full text-left p-3 rounded-lg transition-all border-2 ${selectedTitle === title ? 'bg-indigo-900/50 border-indigo-500' : 'bg-gray-700/50 border-transparent hover:border-indigo-600'}`}
                                            >
                                                <p className="text-gray-200 font-medium">{title}</p>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white mb-2">{t('blueprint_modal.moodboard')}</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {blueprint.moodboard.map((imgSrc, i) => (
                                        <img key={i} src={imgSrc} alt={`Mood board image ${i + 1}`} className="w-full h-auto rounded-lg object-cover shadow-lg" />
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white mb-2">{t('blueprint_modal.full_script')}</h3>
                                <div className="bg-gray-900/50 p-4 rounded-lg text-sm text-gray-400 max-h-48 overflow-y-auto">
                                    <p><span className="font-bold text-gray-300">{t('blueprint_modal.hook')}</span> {blueprint.script.hooks[0]}</p>
                                    <p className="mt-2"><span className="font-bold text-gray-300">{t('blueprint_modal.scene1')}</span> {blueprint.script.scenes[0].voiceover}</p>
                                    <p className="mt-2"><span className="font-bold text-gray-300">{t('blueprint_modal.cta')}</span> {blueprint.script.cta}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                
                {blueprint && (
                    <div className="pt-6 text-center flex-shrink-0">
                        <button
                            onClick={handleAccept}
                            disabled={!selectedTitle}
                            className="w-full max-w-sm inline-flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg disabled:bg-gray-500 disabled:cursor-not-allowed"
                        >
                            {t('blueprint_modal.accept_button')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

interface DashboardProps {
    onSelectProject: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onSelectProject }) => {
    const { projects, user, dismissedTutorials, addToast, t, isInitialLoading } = useAppContext();
    const [isBlueprintModalOpen, setIsBlueprintModalOpen] = useState(false);
    
    // Smart onboarding for new users
    useEffect(() => {
        // This effect will run once when the user and projects are loaded.
        // If there's a user but no projects, we assume it's a new user experience.
        const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
        if (user && projects.length === 0 && !isInitialLoading && !hasSeenOnboarding) {
          setIsBlueprintModalOpen(true);
          localStorage.setItem('hasSeenOnboarding', 'true');
        }
    }, [user, projects, isInitialLoading]);

    const creditsUsed = (user ? PLANS.find(p => p.id === user.subscription.planId)!.creditLimit : 0) - (user?.aiCredits || 0);

    const handleCreateProject = () => {
         if (user?.subscription.planId === 'free' && projects.length >= 1) {
            addToast("Free Plan Project Limit Reached. Please upgrade.", 'error');
            return;
        }
        setIsBlueprintModalOpen(true);
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
                    {t('dashboard.tutorial_callout')}
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
            
            <BlueprintGeneratorModal 
                isOpen={isBlueprintModalOpen}
                onClose={() => setIsBlueprintModalOpen(false)}
            />
        </div>
    );
};

export default Dashboard;