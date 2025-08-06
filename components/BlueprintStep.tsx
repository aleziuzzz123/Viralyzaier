import React, { useState } from 'react';
import { Project, Blueprint, VideoStyle } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { generateVideoBlueprint } from '../services/geminiService';
import CompetitorAnalysis from './CompetitorAnalysis';
import TrendExplorer from './TrendExplorer';
import { LightBulbIcon, TargetIcon, TrendIcon, CheckCircleIcon, SparklesIcon, FilmIcon, TypeIcon } from './Icons';
import Loader from './Loader';
import { getErrorMessage } from '../utils';

interface BlueprintStepProps {
    project: Project;
    onBlueprintAccepted: (blueprint: Blueprint, selectedTitle: string) => void;
}

interface BlueprintLoaderProps {
    progress: string[];
}

const BlueprintLoader: React.FC<BlueprintLoaderProps> = ({ progress }) => {
    const { t } = useAppContext();
    return (
        <div className="flex flex-col items-center justify-center space-y-6 text-center w-full max-w-2xl mx-auto py-12">
            <div className="relative">
                <SparklesIcon className="w-16 h-16 text-indigo-400" />
                <SparklesIcon className="w-8 h-8 text-pink-400 absolute -top-2 -right-2 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-white">{t('blueprint_modal.loading')}</h2>
            <p className="text-gray-400">{t('blueprint_modal.loading_subtitle')}</p>
            <div className="bg-gray-900/50 p-4 rounded-lg w-full min-h-[100px]">
                <ul className="space-y-2">
                    {progress.map((msg, i) => (
                        <li key={i} className="flex items-center text-sm text-gray-300 animate-fade-in-up">
                            <SparklesIcon className="w-4 h-4 mr-3 text-indigo-400 flex-shrink-0" />
                            {msg}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

interface BlueprintResultProps {
    blueprint: Blueprint;
    project: Project;
    onAccept: (selectedTitle: string) => void;
}

const BlueprintResult: React.FC<BlueprintResultProps> = ({ blueprint, project, onAccept }) => {
    const { t } = useAppContext();
    const [selectedTitle, setSelectedTitle] = useState(blueprint.suggestedTitles[0]);

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700">
                <h3 className="text-xl font-bold text-white mb-2">{t('blueprint_modal.strategic_summary')}</h3>
                <p className="text-gray-300 italic">"{blueprint.strategicSummary}"</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700">
                    <h3 className="text-xl font-bold text-white mb-4">{t('blueprint_modal.choose_title')}</h3>
                    <ul className="space-y-3">
                        {blueprint.suggestedTitles.map((title, i) => (
                            <li key={i} onClick={() => setSelectedTitle(title)} className={`p-3 rounded-lg cursor-pointer transition-colors border-2 ${selectedTitle === title ? 'bg-indigo-900/50 border-indigo-500' : 'bg-gray-900/50 border-transparent hover:border-indigo-600'}`}>
                                <p className="text-white">{title}</p>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700">
                    <h3 className="text-xl font-bold text-white mb-4">{t('blueprint_modal.moodboard')}</h3>
                    <div className="grid grid-cols-3 gap-2">
                        {blueprint.moodboard.map((img, i) => <img key={i} src={img} alt={`Moodboard image ${i + 1}`} className="w-full aspect-square object-cover rounded-md" />)}
                    </div>
                </div>
            </div>
            <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700">
                <h3 className="text-xl font-bold text-white mb-4">{t('blueprint_modal.full_script')}</h3>
                <div className="space-y-4 max-h-80 overflow-y-auto pr-4 text-sm">
                    <p><strong className="text-indigo-400">{t('blueprint_modal.hook')}</strong> <span className="text-gray-300">{blueprint.script.hooks[0]}</span></p>
                    {blueprint.script.scenes.map((scene, i) => (
                         <p key={i}><strong className="text-indigo-400">{`Scene ${i + 1} (${scene.timecode}):`}</strong> <span className="text-gray-300">{scene.voiceover}</span></p>
                    ))}
                    <p><strong className="text-indigo-400">{t('blueprint_modal.cta')}</strong> <span className="text-gray-300">{blueprint.script.cta}</span></p>
                </div>
            </div>
            <div className="text-center">
                <button onClick={() => onAccept(selectedTitle)} className="w-full max-w-sm inline-flex items-center justify-center px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg">
                    <CheckCircleIcon className="w-6 h-6 mr-3" />
                    {t('blueprint_modal.accept_button')}
                </button>
            </div>
        </div>
    );
};


const BlueprintStep: React.FC<BlueprintStepProps> = ({ project, onBlueprintAccepted }) => {
    const { t, consumeCredits, addToast, handleUpdateProject, setPrefilledBlueprintPrompt, prefilledBlueprintPrompt, brandIdentities } = useAppContext();
    const [activeTab, setActiveTab] = useState<'topic' | 'competitor' | 'trend'>('topic');
    const [topic, setTopic] = useState(prefilledBlueprintPrompt || project.topic);
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState<string[]>([]);
    const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedStyle, setSelectedStyle] = useState<VideoStyle>('High-Energy Viral');
    
    // Clear prefilled prompt after using it once
    useState(() => {
        if(prefilledBlueprintPrompt) setPrefilledBlueprintPrompt(null);
    });
    
    const styleOptions: { id: VideoStyle, name: string, description: string, icon: React.FC<{className?:string}> }[] = [
        { id: 'High-Energy Viral', name: t('style.viral_name'), description: t('style.viral_desc'), icon: SparklesIcon },
        { id: 'Cinematic Documentary', name: t('style.cinematic_name'), description: t('style.cinematic_desc'), icon: FilmIcon },
        { id: 'Clean & Corporate', name: t('style.corporate_name'), description: t('style.corporate_desc'), icon: TypeIcon },
    ];

    const handleGenerateBlueprint = async () => {
        if (!topic.trim()) {
            setError(t('blueprint_modal.error_topic'));
            return;
        }
        if (!await consumeCredits(5)) return;

        setIsLoading(true);
        setError(null);
        setBlueprint(null);
        setProgress([]);

        try {
            const activeBrandIdentity = brandIdentities.find(b => b.id === project.activeBrandIdentityId);
            const bp = await generateVideoBlueprint(
                topic, 
                project.platform, 
                selectedStyle, 
                (msg) => { setProgress(prev => [...prev, msg]); },
                project.desiredLengthInSeconds,
                activeBrandIdentity
            );
            setBlueprint(bp);
        } catch (e) {
            const errorMessage = getErrorMessage(e);
            setError(errorMessage);
            addToast(errorMessage, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleTrendSelect = (trend: string) => {
        handleUpdateProject({ id: project.id, topic: trend });
        addToast("Project topic updated from trend! Now, generate your blueprint.", 'success');
        setActiveTab('topic');
        setTopic(trend);
    };

    const tabs = [
        { id: 'topic', name: t('project_view.strategy.from_topic'), icon: LightBulbIcon },
        { id: 'competitor', name: t('project_view.strategy.from_competitor'), icon: TargetIcon },
        { id: 'trend', name: t('project_view.strategy.from_trend'), icon: TrendIcon },
    ];
    
    if (isLoading) return <BlueprintLoader progress={progress} />;
    if (blueprint) return <BlueprintResult blueprint={blueprint} project={project} onAccept={(title) => onBlueprintAccepted(blueprint, title)} />;

    return (
        <div className="w-full mx-auto animate-fade-in-up space-y-12">
            <header className="text-center">
                <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-500">{t('project_view.brief.title')}</h1>
                <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">{t('project_view.brief.subtitle')}</p>
            </header>
            
            <div className="w-full max-w-5xl mx-auto">
                <div className="border-b border-gray-700 mb-8">
                    <nav className="-mb-px flex justify-center space-x-8" aria-label="Tabs">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`${activeTab === tab.id ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'} group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                            >
                                <tab.icon className="-ml-0.5 mr-2 h-5 w-5" aria-hidden="true" />
                                <span>{tab.name}</span>
                            </button>
                        ))}
                    </nav>
                </div>
                
                {activeTab === 'topic' && (
                    <div className="w-full max-w-3xl mx-auto space-y-8 text-center">
                        <div>
                           <h3 className="text-lg font-semibold text-white mb-3 text-left">{t('style.select_title')}</h3>
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                               {styleOptions.map(style => (
                                   <button key={style.id} onClick={() => setSelectedStyle(style.id)} className={`text-left p-4 rounded-lg border-2 transition-colors ${selectedStyle === style.id ? 'bg-indigo-900/50 border-indigo-500' : 'bg-gray-700/50 border-transparent hover:border-indigo-600'}`}>
                                       <div className="flex items-center gap-3">
                                           <style.icon className="w-6 h-6 text-indigo-400" />
                                           <span className="font-bold text-white">{style.name}</span>
                                       </div>
                                       <p className="text-xs text-gray-400 mt-2">{style.description}</p>
                                   </button>
                               ))}
                           </div>
                       </div>
                    
                        <div>
                            <label htmlFor="topic" className="text-lg font-semibold text-white mb-2 text-left block">{t('blueprint_modal.step2')}</label>
                            <textarea
                                id="topic"
                                value={topic}
                                onChange={e => setTopic(e.target.value)}
                                placeholder={t('blueprint_modal.topic_placeholder')}
                                rows={2}
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <button onClick={handleGenerateBlueprint} className="inline-flex items-center justify-center px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg">
                            <SparklesIcon className="w-6 h-6 mr-3" />
                            {t('blueprint_modal.generate_button')}
                        </button>
                        {error && <p className="text-red-400 mt-2">{error}</p>}
                    </div>
                )}

                {activeTab === 'competitor' && <CompetitorAnalysis project={project} onApplyTitle={(title) => {
                    handleUpdateProject({ id: project.id, title: title, topic: title });
                    setActiveTab('topic');
                    setTopic(title);
                }} />}

                {activeTab === 'trend' && <TrendExplorer onTrendSelect={handleTrendSelect} />}
            </div>
        </div>
    );
};

export default BlueprintStep;
