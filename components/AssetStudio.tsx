

import React, { useState } from 'react';
import { Project, SceneAssets } from '../types';
import { generateVideoClip, generateVoiceover, ELEVENLABS_VOICES } from '../services/generativeMediaService';
import { uploadFile } from '../services/supabaseService';
import { SparklesIcon, CtaIcon, DownloadIcon, PlayIcon, PhotoIcon, MicIcon, RefreshIcon, WarningIcon } from './Icons';
import { useAppContext } from '../contexts/AppContext';
import JSZip from 'jszip';

interface AssetStudioProps {
    project: Project;
    onProceed: () => void;
}

const AssetStudio: React.FC<AssetStudioProps> = ({ project, onProceed }) => {
    const { user, consumeCredits, requirePermission, handleUpdateProject, t, addToast, runwayMlApiKeyError, elevenLabsApiKeyError } = useAppContext();
    const [loadingStates, setLoadingStates] = useState<{ [key: number]: { video?: boolean, audio?: boolean, message: string } }>({});
    const [sceneErrors, setSceneErrors] = useState<{ [key: number]: string }>({});
    const [isBatchLoading, setIsBatchLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    
    const availableVoices = [
        ...ELEVENLABS_VOICES,
        ...(user?.cloned_voices?.filter(v => v.status === 'ready').map(v => ({ id: v.id, name: `${v.name} (Your Voice)` })) || [])
    ];

    const handleGenerateAssets = async (sceneIndex: number, regenerate: boolean = false) => {
        if (!project.script || !user || !requirePermission('viralyzaier')) return;
        if (runwayMlApiKeyError || elevenLabsApiKeyError) {
            addToast("API keys for media generation are not configured.", "error");
            return;
        }

        const scene = project.script.scenes[sceneIndex];
        const hasVideo = !!scene.visual.trim();
        const hasAudio = !!scene.voiceover.trim();
        
        // Don't charge credits for assets that already exist unless we're explicitly regenerating
        const assetsExist = project.assets?.[sceneIndex];
        const creditsForVideo = (!assetsExist?.brollVideo || regenerate) && hasVideo ? 10 : 0;
        const creditsForAudio = (!assetsExist?.audio || regenerate) && hasAudio ? 2 : 0;
        const creditsNeeded = creditsForVideo + creditsForAudio;
        
        if (creditsNeeded === 0 && !regenerate) return;
        if (!await consumeCredits(creditsNeeded)) return;

        setLoadingStates(prev => ({ ...prev, [sceneIndex]: { video: hasVideo, audio: hasAudio, message: t('asset_studio.loading') } }));
        setSceneErrors(prev => ({ ...prev, [sceneIndex]: '' }));

        try {
            const uploadAsset = async (blob: Blob, type: 'video' | 'audio'): Promise<string> => {
                setLoadingStates(prev => ({ ...prev, [sceneIndex]: { ...prev[sceneIndex], message: t('toast.uploading_asset', { type }) } }));
                const extension = type === 'video' ? 'mp4' : 'mp3';
                const path = `${user.id}/${project.id}/scene_${sceneIndex + 1}_${type}.${extension}`;
                const url = await uploadFile(blob, path);
                addToast(t('toast.asset_saved', { type: type.charAt(0).toUpperCase() + type.slice(1) }), 'success');
                return url;
            };

            const videoPromise = creditsForVideo > 0 ? generateVideoClip(scene.visual, project.platform) : Promise.resolve(null);
            if (creditsForVideo > 0) setLoadingStates(prev => ({...prev, [sceneIndex]: {...prev[sceneIndex], message: t('asset_studio.loading_video') } }));
            
            const audioPromise = creditsForAudio > 0 ? generateVoiceover(scene.voiceover, project.voiceoverVoiceId) : Promise.resolve(null);

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
            const errorMessage = e instanceof Error ? e.message : t('asset_studio.error_generation_failed');
            setSceneErrors(prev => ({ ...prev, [sceneIndex]: errorMessage }));
            addToast(errorMessage, 'error');
        } finally {
            setLoadingStates(prev => ({ ...prev, [sceneIndex]: { message: '' } }));
        }
    };
    
    const handleGenerateAllAssets = async () => {
        if (!project.script || !user || !requirePermission('viralyzaier')) return;
         if (runwayMlApiKeyError || elevenLabsApiKeyError) {
            addToast("API keys for media generation are not configured.", "error");
            return;
        }

        const totalCredits = project.script.scenes.reduce((acc, scene, index) => {
             const hasVideo = !!scene.visual.trim() && !project.assets?.[index]?.brollVideo;
             const hasAudio = !!scene.voiceover.trim() && !project.assets?.[index]?.audio;
             return acc + (hasVideo ? 10 : 0) + (hasAudio ? 2 : 0);
        }, 0);
        
        if (totalCredits === 0) {
            addToast("All assets are already generated.", "info");
            return;
        }

        if (!await consumeCredits(totalCredits)) return;

        setIsBatchLoading(true);
        addToast("Starting batch generation... This may take a few minutes.", 'info');
        
        try {
            const assetPromises = project.script.scenes.map(async (scene, index) => {
                const existingAssets = project.assets?.[index];
                const hasVideo = !!scene.visual.trim() && !existingAssets?.brollVideo;
                const hasAudio = !!scene.voiceover.trim() && !existingAssets?.audio;

                const videoBlob = hasVideo ? await generateVideoClip(scene.visual, project.platform) : null;
                const audioBlob = hasAudio ? await generateVoiceover(scene.voiceover, project.voiceoverVoiceId) : null;

                const videoUrl = videoBlob ? await uploadFile(videoBlob, `${user.id}/${project.id}/scene_${index + 1}_video.mp4`) : existingAssets?.brollVideo;
                const audioUrl = audioBlob ? await uploadFile(audioBlob, `${user.id}/${project.id}/scene_${index + 1}_audio.mp3`) : existingAssets?.audio;
                
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
             setSceneErrors(prev => ({ ...prev, 999: errorMsg })); // General error for batch
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
    
    const allScenesGenerated = project.script.scenes.every((scene, index) => {
      const assets = project.assets?.[index];
      const needsVideo = !!scene.visual.trim();
      const needsAudio = !!scene.voiceover.trim();
      return (!needsVideo || !!assets?.brollVideo) && (!needsAudio || !!assets?.audio);
    });

    const isMediaGenerationConfigured = !runwayMlApiKeyError && !elevenLabsApiKeyError;

    return (
        <div className="space-y-8 animate-fade-in-up">
            <header className="text-center">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">{t('asset_studio.title')}</h1>
                <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">{t('asset_studio.subtitle')}</p>
            </header>
            
            {!isMediaGenerationConfigured && (
                <div className="bg-red-900/50 border border-red-500/50 text-red-300 p-4 rounded-lg flex items-center gap-4">
                    <WarningIcon className="w-8 h-8 flex-shrink-0" />
                    <div>
                        <h3 className="font-bold">Media Generation Not Configured</h3>
                        <p className="text-sm">
                            {runwayMlApiKeyError && "RunwayML API Key is not configured. "}
                            {elevenLabsApiKeyError && "ElevenLabs API Key is not configured. "}
                            Please add these to your Vercel Environment Variables to enable video and audio generation.
                        </p>
                    </div>
                </div>
            )}
            
            {sceneErrors[999] && <p className="text-red-400 text-center">{sceneErrors[999]}</p>}

            <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="w-full md:w-1/2">
                    <label htmlFor="voice-select" className="flex items-center text-sm font-bold text-gray-300 mb-2">
                        <MicIcon className="w-5 h-5 mr-2 text-teal-400"/>
                        {t('asset_studio.voice_selection_label')}
                    </label>
                    <select 
                        id="voice-select" 
                        value={project.voiceoverVoiceId || ''} 
                        onChange={e => handleUpdateProject({ id: project.id, voiceoverVoiceId: e.target.value })}
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
                            disabled={isBatchLoading || !isMediaGenerationConfigured}
                            className="inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
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

                            {sceneErrors[index] && <p className="text-red-400 text-center mb-4 bg-red-900/50 p-2 rounded-md">{sceneErrors[index]}</p>}
                            
                            {!sceneAssets && !isLoading && (
                                <div className="text-center">
                                    <button 
                                        onClick={() => handleGenerateAssets(index)}
                                        disabled={!isMediaGenerationConfigured}
                                        className="inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
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
                                    <div className="space-y-2">
                                        <h4 className="font-semibold text-gray-300">{t('asset_studio.b_roll_images_title')}</h4>
                                        <div className="w-full max-w-md mx-auto">
                                            {sceneAssets.brollVideo ? (
                                                <div className="relative group aspect-video">
                                                    <video key={sceneAssets.brollVideo} src={sceneAssets.brollVideo} className="w-full h-full rounded-lg object-cover shadow-lg bg-black" controls loop/>
                                                </div>
                                            ) : (
                                                <div className="aspect-video bg-gray-900 flex items-center justify-center rounded-lg"><PhotoIcon className="w-12 h-12 text-gray-700"/></div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {sceneAssets.audio && (
                                        <div className="space-y-2">
                                            <h4 className="font-semibold text-gray-300">{t('asset_studio.voiceover_audio_title')}</h4>
                                            <audio src={sceneAssets.audio} controls className="w-full" />
                                        </div>
                                    )}

                                    <div className="text-center border-t border-gray-700/50 pt-4">
                                        <button 
                                            onClick={() => handleGenerateAssets(index, true)}
                                            disabled={isLoading || !isMediaGenerationConfigured}
                                            className="inline-flex items-center px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-full transition-colors text-sm disabled:bg-gray-600 disabled:cursor-not-allowed"
                                        >
                                            <RefreshIcon className="w-4 h-4 mr-2" />
                                            Regenerate Scene Assets
                                        </button>
                                    </div>
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