

import React, { useState } from 'react';
import { Project, SceneAssets } from '../types';
import { generateVideoClip, generateVoiceover, ELEVENLABS_VOICES } from '../services/generativeMediaService';
import { uploadFile } from '../services/supabaseService';
import { SparklesIcon, CtaIcon, DownloadIcon, PlayIcon, PhotoIcon, MicIcon } from './Icons';
import { useAppContext } from '../contexts/AppContext';
import JSZip from 'jszip';

interface AssetStudioProps {
    project: Project;
    onProceed: () => void;
}

const AssetStudio: React.FC<AssetStudioProps> = ({ project, onProceed }) => {
    const { user, consumeCredits, requirePermission, handleUpdateProject, t, addToast } = useAppContext();
    const [loadingStates, setLoadingStates] = useState<{ [key: number]: { video?: boolean, audio?: boolean, message: string } }>({});
    const [isBatchLoading, setIsBatchLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const availableVoices = [
        ...ELEVENLABS_VOICES,
        ...(user?.cloned_voices?.filter(v => v.status === 'ready').map(v => ({ id: v.id, name: `${v.name} (Your Voice)` })) || [])
    ];

    const handleGenerateAssets = async (sceneIndex: number) => {
        if (!project.script || !user || !requirePermission('viralyzaier')) return;

        const scene = project.script.scenes[sceneIndex];
        const hasVideo = !!scene.visual.trim();
        const hasAudio = !!scene.voiceover.trim();
        const creditsNeeded = (hasVideo ? 10 : 0) + (hasAudio ? 2 : 0);
        
        if (creditsNeeded === 0) return;
        if (!await consumeCredits(creditsNeeded)) return;

        setLoadingStates(prev => ({ ...prev, [sceneIndex]: { video: hasVideo, audio: hasAudio, message: t('asset_studio.loading') } }));
        setError(null);

        try {
            const uploadAsset = async (blob: Blob, type: 'video' | 'audio'): Promise<string> => {
                setLoadingStates(prev => ({ ...prev, [sceneIndex]: { ...prev[sceneIndex], message: t('toast.uploading_asset', { type }) } }));
                const extension = type === 'video' ? 'mp4' : 'mp3';
                const path = `${user.id}/${project.id}/scene_${sceneIndex + 1}_${type}.${extension}`;
                const url = await uploadFile(blob, path);
                addToast(t('toast.asset_saved', { type: type.charAt(0).toUpperCase() + type.slice(1) }), 'success');
                return url;
            };

            const videoPromise = hasVideo ? generateVideoClip(scene.visual, project.platform) : Promise.resolve(null);
            if (hasVideo) setLoadingStates(prev => ({...prev, [sceneIndex]: {...prev[sceneIndex], message: t('asset_studio.loading_video') } }));
            
            const audioPromise = hasAudio ? generateVoiceover(scene.voiceover, project.voiceId) : Promise.resolve(null);

            const [videoBlob, audioBlob] = await Promise.all([videoPromise, audioPromise]);

            let videoUrl: string | undefined = project.assets?.[sceneIndex]?.brollVideo;
            let audioUrl: string | undefined = project.assets?.[sceneIndex]?.audio;

            if (videoBlob) {
                setLoadingStates(prev => ({ ...prev, [sceneIndex]: { ...prev[sceneIndex], video: false } }));
                videoUrl = await uploadAsset(videoBlob, 'video');
            }
            if (audioBlob) {
                setLoadingStates(prev => ({ ...prev, [sceneIndex]: { ...prev[sceneIndex], audio: false } }));
                audioUrl = await uploadAsset(audioBlob, 'audio');
            }
            
            const assets: SceneAssets = {
                brollVideo: videoUrl,
                audio: audioUrl,
                graphics: project.assets?.[sceneIndex]?.graphics || []
            };
            
            const updatedAssets = { ...(project.assets || {}), [sceneIndex]: assets };
            handleUpdateProject({ id: project.id, assets: updatedAssets });

        } catch (e) {
            setError(e instanceof Error ? e.message : t('asset_studio.error_generation_failed'));
            addToast(e instanceof Error ? e.message : t('asset_studio.error_generation_failed'), 'error');
        } finally {
            setLoadingStates(prev => ({ ...prev, [sceneIndex]: { message: '' } }));
        }
    };
    
    const handleGenerateAllAssets = async () => {
        if (!project.script || !user || !requirePermission('viralyzaier')) return;

        const totalCredits = project.script.scenes.reduce((acc, scene) => {
             const hasVideo = !!scene.visual.trim();
             const hasAudio = !!scene.voiceover.trim();
             return acc + (hasVideo ? 10 : 0) + (hasAudio ? 2 : 0);
        }, 0);
        if (!await consumeCredits(totalCredits)) return;

        setIsBatchLoading(true);
        setError(null);
        addToast("Starting batch generation... This may take a few minutes.", 'info');
        
        try {
            const assetPromises = project.script.scenes.map(async (scene, index) => {
                const hasVideo = !!scene.visual.trim();
                const hasAudio = !!scene.voiceover.trim();

                const videoBlob = hasVideo ? await generateVideoClip(scene.visual, project.platform) : null;
                const audioBlob = hasAudio ? await generateVoiceover(scene.voiceover, project.voiceId) : null;

                const videoUrl = videoBlob ? await uploadFile(videoBlob, `${user.id}/${project.id}/scene_${index + 1}_video.mp4`) : undefined;
                const audioUrl = audioBlob ? await uploadFile(audioBlob, `${user.id}/${project.id}/scene_${index + 1}_audio.mp3`) : undefined;
                
                return { brollVideo: videoUrl, audio: audioUrl, graphics: [] };
            });

            const allAssets = await Promise.all(assetPromises);
            addToast("All assets generated! Saving to your project...", 'success');

            const updatedAssets = allAssets.reduce((acc, currentAssets, index) => {
                acc[index] = currentAssets;
                return acc;
            }, {} as { [key: number]: SceneAssets });
            
            handleUpdateProject({ id: project.id, assets: updatedAssets });

        } catch (e) {
             const errorMsg = e instanceof Error ? e.message : t('asset_studio.error_generation_failed');
             setError(errorMsg);
             addToast(errorMsg, 'error');
        } finally {
            setIsBatchLoading(false);
        }
    };

    const handleDownloadAll = async () => {
        if (!project.assets) return;
        setIsDownloading(true);
        try {
            const zip = new JSZip();
            const fetchPromises = Object.entries(project.assets).map(async ([sceneIndex, sceneAssets]) => {
                const folder = zip.folder(`scene_${parseInt(sceneIndex) + 1}`);
                if (!folder) return;

                if (sceneAssets.brollVideo) {
                    const res = await fetch(sceneAssets.brollVideo);
                    const blob = await res.blob();
                    folder.file(`b-roll.mp4`, blob);
                }
                if (sceneAssets.audio) {
                    const res = await fetch(sceneAssets.audio);
                    const blob = await res.blob();
                    folder.file(`voiceover.mp3`, blob);
                }
            });

            await Promise.all(fetchPromises);
            
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

            <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="w-full md:w-1/2">
                    <label htmlFor="voice-select" className="flex items-center text-sm font-bold text-gray-300 mb-2">
                        <MicIcon className="w-5 h-5 mr-2 text-teal-400"/>
                        {t('asset_studio.voice_selection_label')}
                    </label>
                    <select 
                        id="voice-select" 
                        value={project.voiceId || ''} 
                        onChange={e => handleUpdateProject({ id: project.id, voiceId: e.target.value })}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        {availableVoices.map(voice => (
                            <option key={voice.id} value={voice.id}>{voice.name}</option>
                        ))}
                    </select>
                </div>
                 <div className="text-center">
                    {!allScenesGenerated ? (
                        <button
                            onClick={handleGenerateAllAssets}
                            disabled={isBatchLoading}
                            className="inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-colors disabled:bg-gray-600 disabled:cursor-wait"
                        >
                            <SparklesIcon className="w-5 h-5 mr-2" />
                            {isBatchLoading ? t('asset_studio.generating_all') : t('asset_studio.generate_all_button')}
                        </button>
                    ) : (
                        <button
                            onClick={handleDownloadAll}
                            disabled={isDownloading}
                            className="inline-flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-full transition-colors disabled:bg-gray-600 disabled:cursor-wait"
                        >
                            <DownloadIcon className="w-5 h-5 mr-2" />
                            {isDownloading ? t('asset_studio.zipping') : t('asset_studio.download_all_button')}
                        </button>
                    )}
                 </div>
            </div>


            <div className="space-y-10">
                {project.script.scenes.map((scene, index) => {
                    const sceneAssets = project.assets?.[index];
                    const isLoading = loadingStates[index] && (loadingStates[index].video || loadingStates[index].audio);
                    
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
                                    <p className="text-lg text-gray-200 font-semibold">{loadingStates[index]?.message || t('asset_studio.loading')}</p>
                                </div>
                            )}
                            
                            {sceneAssets && (
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="font-semibold text-gray-300 mb-2">{t('asset_studio.b_roll_images_title')}</h4>
                                        <div className="w-full max-w-md mx-auto">
                                            {sceneAssets.brollVideo ? (
                                                <div className="relative group aspect-video">
                                                    <video key={sceneAssets.brollVideo} src={sceneAssets.brollVideo} className="w-full h-full rounded-lg object-cover shadow-lg bg-black" controls loop/>
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <a href={sceneAssets.brollVideo} download={`scene_${index+1}_broll.mp4`} className="p-2 bg-black/50 backdrop-blur-sm text-white rounded-full hover:bg-black/70"><DownloadIcon className="w-5 h-5" /></a>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="aspect-video bg-gray-900 flex items-center justify-center rounded-lg"><PhotoIcon className="w-12 h-12 text-gray-700"/></div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {sceneAssets.audio && (
                                        <div>
                                            <h4 className="font-semibold text-gray-300 mb-2">{t('asset_studio.voiceover_audio_title')}</h4>
                                            <audio src={sceneAssets.audio} controls className="w-full" />
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