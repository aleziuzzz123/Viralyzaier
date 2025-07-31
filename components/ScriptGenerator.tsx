

import React, { useState, useEffect, useRef } from 'react';
import { Project, Script, Platform } from '../types';
import { generateScript } from '../services/geminiService';
import { SparklesIcon, LightBulbIcon, CtaIcon, DownloadIcon, QuestionMarkCircleIcon } from './Icons';
import { useAppContext } from '../contexts/AppContext';

interface ScriptGeneratorProps {
    project: Project;
    onScriptGenerated: (script: Script) => void;
    onProceed: () => void;
    platform: Platform;
}

const ScriptGenerator: React.FC<ScriptGeneratorProps> = ({ project, onScriptGenerated, onProceed, platform }) => {
    const { consumeCredits, addToast, t } = useAppContext();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [script, setScript] = useState<Script | null>(project.script);

    useEffect(() => {
        setScript(project.script); // Sync with project prop
    }, [project.script]);

    const handleGenerateScript = async () => {
        if (!project.topic || !project.title) {
            setError(t('script_generator.error_brief_missing'));
            return;
        }
        
        if (!await consumeCredits(3)) return; // Updated cost

        setIsLoading(true);
        setError(null);
        try {
            const newScript = await generateScript(project.topic, project.title, platform);
            setScript(newScript);
            onScriptGenerated(newScript);
        } catch (e) {
            setError(e instanceof Error ? e.message : t('script_generator.error_unknown'));
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDownloadImage = (imageSrc: string, filename: string) => {
        try {
            const link = document.createElement('a');
            link.href = imageSrc;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Download failed:', error);
            addToast(t('toast.image_download_failed'), 'error');
        }
    };

    return (
        <div className="space-y-8">
            <header className="text-center">
                <h1 className="text-3xl font-bold text-white">{t('script_generator.title')}</h1>
                <p className="mt-2 text-lg text-gray-400">{t('script_generator.subtitle')}</p>
            </header>

            {!script && (
                 <div className="text-center py-10">
                    <button onClick={handleGenerateScript} disabled={isLoading} className="inline-flex items-center justify-center px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg disabled:bg-gray-500">
                        <SparklesIcon className="w-6 h-6 mr-3" />
                        {isLoading ? t('script_generator.generating') : t('script_generator.generate_button')}
                    </button>
                    {error && <p className="text-red-400 text-center mt-4">{error}</p>}
                </div>
            )}
           
            {isLoading && (
                 <div className="flex flex-col items-center justify-center space-y-4 text-center mt-8">
                    <SparklesIcon className="w-12 h-12 text-amber-400 animate-pulse"/>
                    <p className="text-lg text-gray-200 font-semibold">{t('script_generator.loading_title')}</p>
                    <p className="text-sm text-gray-500">{t('script_generator.loading_subtitle')}</p>
                </div>
            )}
            
            {script && (
                <div className="space-y-8 animate-fade-in-up">
                    <div>
                        <h3 className="flex items-center text-xl font-bold text-white mb-4"><LightBulbIcon className="w-6 h-6 mr-3 text-yellow-300"/>{t('script_generator.hooks_title')}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {script.hooks.map((hook, i) => (
                                <div key={i} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 text-gray-300">
                                    "{hook}"
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {project.moodboard && project.moodboard.length > 0 && (
                        <div>
                            <h3 className="flex items-center text-xl font-bold text-white mb-4 group cursor-help">
                                {t('script_generator.moodboard_title')}
                                <span className="relative">
                                    <QuestionMarkCircleIcon className="w-5 h-5 ml-2 text-gray-500" />
                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-gray-950 border border-indigo-500 text-gray-300 text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                                        {t('script_generator.moodboard_tooltip')}
                                        <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-indigo-500 transform rotate-45"></div>
                                    </span>
                                </span>
                            </h3>
                             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {project.moodboard.map((imgSrc, i) => (
                                    <div key={i} className="relative group aspect-video">
                                        <img src={imgSrc} alt={`Mood board image ${i + 1}`} className="w-full h-full rounded-lg object-cover shadow-lg" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button 
                                                onClick={() => handleDownloadImage(imgSrc, `moodboard_image_${i+1}.jpg`)}
                                                className="flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm text-white font-semibold rounded-full hover:bg-white/30 transition-colors"
                                            >
                                                <DownloadIcon className="w-5 h-5 mr-2" />
                                                {t('script_generator.download_button')}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <h3 className="text-xl font-bold text-white mb-4">{t('script_generator.script_title')}</h3>
                        <div className="overflow-x-auto bg-gray-800/50 p-1 rounded-lg border border-gray-700">
                            <table className="w-full text-left">
                                <thead className="bg-gray-900/50 text-xs text-gray-300 uppercase">
                                    <tr>
                                        <th className="p-3">{t('script_generator.table_time')}</th>
                                        <th className="p-3">{t('script_generator.table_visual')}</th>
                                        <th className="p-3">{t('script_generator.table_voiceover')}</th>
                                        <th className="p-3">{t('script_generator.table_on_screen_text')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {script.scenes.map((scene, i) => (
                                        <tr key={i} className="border-t border-gray-700">
                                            <td className="p-3 font-mono text-sm text-indigo-400">{scene.timecode}</td>
                                            <td className="p-3 text-sm text-gray-300">{scene.visual}</td>
                                            <td className="p-3 text-sm text-gray-300">{scene.voiceover}</td>
                                            <td className="p-3 font-bold text-sm text-amber-300">{scene.onScreenText}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div>
                        <h3 className="text-xl font-bold text-white mb-4">{t('script_generator.cta_title')}</h3>
                        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 text-gray-200 font-semibold italic">
                            "{script.cta}"
                        </div>
                    </div>

                     <div className="mt-8 text-center">
                        <button onClick={onProceed} className="inline-flex items-center justify-center px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg">
                            {t('script_generator.proceed_button')}
                            <CtaIcon className="w-5 h-5 ml-3" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScriptGenerator;
