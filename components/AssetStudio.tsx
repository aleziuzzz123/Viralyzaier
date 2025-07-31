
import React, { useState } from 'react';
import { Project, SceneAssets } from '../types';
import { generateSceneAssets } from '../services/geminiService';
import { SparklesIcon, CtaIcon, DownloadIcon, PlayIcon } from './Icons';
import { useAppContext } from '../contexts/AppContext';
import JSZip from 'jszip';

interface AssetStudioProps {
    project: Project;
    onProceed: () => void;
}

const AssetStudio: React.FC<AssetStudioProps> = ({ project, onProceed }) => {
    const { user, consumeCredits, apiKeyError, handleUpdateProject, t, addToast } = useAppContext();
    const [loadingStates, setLoadingStates] = useState<{ [key: number]: boolean }>({});
    const [isBatchLoading, setIsBatchLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerateAssets = async (sceneIndex: number) => {
        if (!project.script || !user) return;
        if (apiKeyError) {
            setError(t('asset_studio.error_api_key'));
            return;
        }
        if (!await consumeCredits(2)) return;

        setLoadingStates(prev => ({ ...prev, [sceneIndex]: true }));
        setError(null);
        try {
            const scene = project.script.scenes[sceneIndex];
            const assets = await generateSceneAssets(scene.visual, scene.onScreenText, project.platform, user.id, project.id, sceneIndex);
            
            const updatedAssets = { ...(project.assets || {}), [sceneIndex]: assets };
            handleUpdateProject({ ...project, id: project.id, assets: updatedAssets });

        } catch (e) {
            setError(e instanceof Error ? e.message : t('asset_studio.error_generation_failed'));
        } finally {
            setLoadingStates(prev => ({ ...prev, [sceneIndex]: false }));
        }
    };
    
    const handleGenerateAllAssets = async () => {
        if (!project.script || !user) return;
        const totalCredits = project.script.scenes.length * 2;
        if (!await consumeCredits(totalCredits)) return;

        setIsBatchLoading(true);
        setError(null);
        const allLoadingStates: { [key: number]: boolean } = project.script.scenes.reduce((acc, _, index) => ({...acc, [index]: true}), {});
        setLoadingStates(allLoadingStates);

        try {
            const assetPromises = project.script.scenes.map((scene, index) => 
                generateSceneAssets(scene.visual, scene.onScreenText, project.platform, user.id, project.id, index)
            );
            const allAssets = await Promise.all(assetPromises);

            const updatedAssets = allAssets.reduce((acc, currentAssets, index) => {
                acc[index] = currentAssets;
                return acc;
            }, {} as { [key: number]: SceneAssets });
            
            handleUpdateProject({ id: project.id, assets: updatedAssets });

        } catch (e) {
             setError(e instanceof Error ? e.message : t('asset_studio.error_generation_failed'));
        } finally {
            setIsBatchLoading(false);
            setLoadingStates({});
        }
    };

    const handleDownloadAll = async () => {
        if (!project.assets) return;
        setIsDownloading(true);
        try {
            const zip = new JSZip();
            const assetPromises = Object.entries(project.assets).flatMap(([sceneIndex, sceneAssets]) => {
                const folder = zip.folder(`scene_${parseInt(sceneIndex) + 1}`);
                if (!folder) return [];
                const promises: Promise<void>[] = [];

                sceneAssets.images.forEach((url, i) => {
                    promises.push(fetch(url).then(res => res.blob()).then(blob => { folder.file(`b-roll_${i + 1}.jpg`, blob); }));
                });
                sceneAssets.graphics.forEach((url, i) => {
                    promises.push(fetch(url).then(res => res.blob()).then(blob => { folder.file(`graphic_${i + 1}.png`, blob); }));
                });
                if (sceneAssets.audio) {
                    promises.push(fetch(sceneAssets.audio).then(res => res.blob()).then(blob => { folder.file(`voiceover.wav`, blob); }));
                }
                return promises;
            });

            await Promise.all(assetPromises);
            
            const content = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `${project.name.replace(/\s+/g, '_')}_assets.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

        } catch (err) {
            console.error(err);
            addToast(t('toast.image_download_failed'), 'error');
        } finally {
            setIsDownloading(false);
        }
    };
    
    const handleDownload = (url: string, filename: string) => {
        const link = document.createElement('a');
        link.href = url;
        link.target = "_blank"; // Open in new tab to download
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const playVoiceover = (text: string) => {
        if(window.speechSynthesis.speaking) window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
    };

    if (!project.script) {
        return (
            <div className="text-center py-16 px-6 bg-gray-800/50 rounded-2xl">
                <h2 className="text-2xl font-bold text-white mb-3">{t('asset_studio.script_required_title')}</h2>
                <p className="text-gray-400 mb-6 max-w-md mx-auto">{t('asset_studio.script_required_subtitle')}</p>
            </div>
        );
    }
    
    const allScenesGenerated = project.script.scenes.every((_, index) => project.assets?.[index]);

    return (
        <div className="space-y-8 animate-fade-in-up">
            <header className="text-center">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">{t('asset_studio.title')}</h1>
                <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">{t('asset_studio.subtitle')}</p>
            </header>
            
            {error && <p className="text-red-400 text-center">{error}</p>}
            
            {!allScenesGenerated ? (
                <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                    <button
                        onClick={handleGenerateAllAssets}
                        disabled={isBatchLoading}
                        className="inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-colors disabled:bg-gray-600 disabled:cursor-wait"
                    >
                        <SparklesIcon className="w-5 h-5 mr-2" />
                        {isBatchLoading ? t('asset_studio.generating_all') : t('asset_studio.generate_all_button', { count: project.script.scenes.length * 2 })}
                    </button>
                    <p className="text-xs text-gray-500 mt-2">{t('asset_studio.generate_individually_note')}</p>
                </div>
            ) : (
                <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                    <button
                        onClick={handleDownloadAll}
                        disabled={isDownloading}
                        className="inline-flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-full transition-colors disabled:bg-gray-600 disabled:cursor-wait"
                    >
                        <DownloadIcon className="w-5 h-5 mr-2" />
                        {isDownloading ? t('asset_studio.zipping') : t('asset_studio.download_all_button')}
                    </button>
                </div>
            )}

            <div className="space-y-10">
                {project.script.scenes.map((scene, index) => {
                    const sceneAssets = project.assets?.[index];
                    const isLoading = loadingStates[index];
                    
                    return (
                        <div key={index} className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700">
                            <h3 className="text-xl font-bold text-white mb-3">{t('asset_studio.scene_title', { index: index + 1 })} <span className="text-indigo-400">{scene.timecode}</span></h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-6">
                                <p><strong className="text-gray-400">{t('asset_studio.visual_label')}</strong> {scene.visual}</p>
                                <p><strong className="text-gray-400">{t('asset_studio.voiceover_label')}</strong> {scene.voiceover}</p>
                                <p><strong className="text-gray-400">{t('asset_studio.on_screen_text_label')}</strong> {scene.onScreenText}</p>
                            </div>
                            
                            {!sceneAssets && !isLoading && (
                                <div className="text-center">
                                    <button 
                                        onClick={() => handleGenerateAssets(index)}
                                        className="inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-colors"
                                    >
                                        <SparklesIcon className="w-5 h-5 mr-2" />
                                        {t('asset_studio.generate_scene_button')}
                                    </button>
                                </div>
                            )}

                             {isLoading && (
                                 <div className="flex flex-col items-center justify-center space-y-4 text-center mt-8">
                                    <SparklesIcon className="w-12 h-12 text-teal-400 animate-pulse"/>
                                    <p className="text-lg text-gray-200 font-semibold">{t('asset_studio.loading')}</p>
                                </div>
                            )}
                            
                            {sceneAssets && (
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="font-semibold text-gray-300 mb-2">{t('asset_studio.b_roll_images_title')}</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {sceneAssets.images.map((img, i) => (
                                                 <div key={i} className="relative group aspect-video">
                                                    <img src={img} alt={`B-roll ${i+1}`} className="w-full h-full rounded-lg object-cover shadow-lg" />
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <button onClick={() => handleDownload(img, `scene_${index+1}_broll_${i+1}.jpg`)} className="p-2 bg-white/20 backdrop-blur-sm text-white rounded-full hover:bg-white/30"><DownloadIcon className="w-5 h-5" /></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    {sceneAssets.graphics.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold text-gray-300 mb-2">{t('asset_studio.text_graphics_title')}</h4>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                 {sceneAssets.graphics.map((img, i) => (
                                                     <div key={i} className="relative group aspect-video bg-gray-900/50 rounded-lg">
                                                        <img src={img} alt={`Graphic ${i+1}`} className="w-full h-full rounded-lg object-contain p-2" />
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                           <button onClick={() => handleDownload(img, `scene_${index+1}_graphic_${i+1}.png`)} className="p-2 bg-white/20 backdrop-blur-sm text-white rounded-full hover:bg-white/30"><DownloadIcon className="w-5 h-5" /></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {sceneAssets.audio && (
                                        <div>
                                            <h4 className="font-semibold text-gray-300 mb-2">{t('asset_studio.voiceover_audio_title')}</h4>
                                            <div className="bg-gray-900/50 p-3 rounded-lg flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <button onClick={() => playVoiceover(scene.voiceover)} className="p-2 bg-indigo-600 rounded-full text-white hover:bg-indigo-500"><PlayIcon className="w-4 h-4"/></button>
                                                    <span className="text-sm text-gray-400">{t('asset_studio.play_audio_button')}</span>
                                                </div>
                                                <button onClick={() => handleDownload(sceneAssets.audio!, `scene_${index+1}_audio.wav`)} className="flex items-center px-3 py-1.5 bg-gray-700 text-white text-xs font-semibold rounded-full hover:bg-gray-600"><DownloadIcon className="w-4 h-4 mr-2" /> {t('asset_studio.download_asset_button')}</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {allScenesGenerated && (
                <div className="mt-12 text-center">
                    <button 
                        onClick={onProceed} 
                        className="inline-flex items-center justify-center px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg"
                    >
                        {t('asset_studio.proceed_button')}
                        <CtaIcon className="w-5 h-5 ml-3" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default AssetStudio;
