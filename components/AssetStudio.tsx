import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Project, SceneAssets } from '../types';
import { generateVideoClip, generateAnimatedImage, generateVoiceover, ELEVENLABS_VOICES } from '../services/generativeMediaService';
import { uploadFile } from '../services/supabaseService';
import { SparklesIcon, CtaIcon, DownloadIcon, PlayIcon, PhotoIcon, MicIcon, RefreshIcon, WarningIcon, CheckCircleIcon, XCircleIcon, InfoIcon, StopCircleIcon, ChevronDownIcon } from './Icons';
import { useAppContext } from '../contexts/AppContext';
import { getErrorMessage } from '../utils';
import JSZip from 'jszip';

interface AssetStudioProps {
    project: Project;
    onProceed: () => void;
}

type LogEntry = {
    message: string;
    status: 'processing' | 'success' | 'error' | 'info';
};

const BatchProgressView: React.FC<{
    logs: LogEntry[];
    progress: number;
    isComplete: boolean;
    onReturn: () => void;
    t: (key: string, replacements?: { [key: string]: string | number }) => string;
}> = ({ logs, progress, isComplete, onReturn, t }) => {
    const statusIcons = {
        success: <CheckCircleIcon className="w-5 h-5 text-green-400" />,
        error: <XCircleIcon className="w-5 h-5 text-red-400" />,
        info: <InfoIcon className="w-5 h-5 text-gray-400" />,
        processing: <SparklesIcon className="w-5 h-5 text-indigo-400 animate-pulse" />,
    };

    return (
        <div className="w-full max-w-3xl mx-auto space-y-6">
            <header className="text-center">
                <h1 className="text-3xl font-bold text-white">
                    {isComplete ? t('asset_studio.batch.complete_title') : t('asset_studio.batch.title')}
                </h1>
                <p className="mt-2 text-gray-400">
                    {t('asset_studio.batch.subtitle')}
                </p>
            </header>
            
            <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div 
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-out" 
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-700 h-80 overflow-y-auto">
                <h3 className="text-xl font-bold text-white mb-4">{t('asset_studio.batch.log_title')}</h3>
                <ul className="space-y-3">
                    {logs.map((log, i) => (
                        <li key={i} className="flex items-center text-sm text-gray-300 animate-fade-in-up">
                            <div className="w-6 flex-shrink-0">{statusIcons[log.status]}</div>
                            <span>{log.message}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {isComplete && (
                <div className="text-center">
                    <button onClick={onReturn} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-colors">
                        {t('asset_studio.batch.return_button')}
                    </button>
                </div>
            )}
        </div>
    );
};


const AssetStudio: React.FC<AssetStudioProps> = ({ project, onProceed }) => {
    const { user, consumeCredits, requirePermission, handleUpdateProject, t, addToast } = useAppContext();
    const [loadingStates, setLoadingStates] = useState<{ [key: number]: { visual?: boolean, audio?: boolean, message: string } }>({});
    const [sceneErrors, setSceneErrors] = useState<{ [key: number]: string }>({});
    const [localPreviews, setLocalPreviews] = useState<{ [key: string]: { video?: string, image?: string, audio?: string } }>({});
     const [generationTypes, setGenerationTypes] = useState<{ [key: number]: 'video' | 'animated_image' }>(() => {
        const initialTypes: { [key: number]: 'video' | 'animated_image' } = {};
        if (project.assets) {
            Object.keys(project.assets).forEach(key => {
                const sceneIndex = parseInt(key);
                initialTypes[sceneIndex] = project.assets[sceneIndex].generationType || 'video';
            });
        }
        return initialTypes;
    });
    
    // Batch generation state
    const [isBatchGenerating, setIsBatchGenerating] = useState(false);
    const [batchLogs, setBatchLogs] = useState<LogEntry[]>([]);
    const [batchProgress, setBatchProgress] = useState(0);
    const [isBatchComplete, setIsBatchComplete] = useState(false);
    
    const [isDownloading, setIsDownloading] = useState(false);

    // Voice Preview State
    const [isVoiceDropdownOpen, setIsVoiceDropdownOpen] = useState(false);
    const [voicePreviewState, setVoicePreviewState] = useState<{ id: string; status: 'loading' | 'playing' } | null>(null);
    const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
    const voiceDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (voiceDropdownRef.current && !voiceDropdownRef.current.contains(event.target as Node)) {
                setIsVoiceDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const availableVoices = [
        ...ELEVENLABS_VOICES,
        ...(user?.cloned_voices?.filter(v => v.status === 'ready').map(v => ({ id: v.id, name: `${v.name} (Your Voice)` })) || [])
    ];

    const currentVoice = availableVoices.find(v => v.id === project.voiceoverVoiceId) || availableVoices[0];

    const handlePreviewVoice = async (e: React.MouseEvent, voiceId: string) => {
        e.stopPropagation(); // Prevent dropdown from closing
    
        if (audioPreviewRef.current) {
            audioPreviewRef.current.pause();
            audioPreviewRef.current = null;
        }

        if (voicePreviewState?.status === 'playing' && voicePreviewState.id === voiceId) {
            setVoicePreviewState(null);
            return;
        }
    
        setVoicePreviewState({ id: voiceId, status: 'loading' });
    
        try {
            const sampleText = t('asset_studio.voice_preview_text');
            const audioBlob = await generateVoiceover(sampleText, voiceId);
            const audioUrl = URL.createObjectURL(audioBlob);
            
            const audio = new Audio(audioUrl);
            audioPreviewRef.current = audio;
            
            const cleanup = () => {
                setVoicePreviewState(prev => (prev?.id === voiceId ? null : prev));
                URL.revokeObjectURL(audioUrl);
                if (audioPreviewRef.current === audio) {
                    audioPreviewRef.current = null;
                }
            };

            audio.onplay = () => setVoicePreviewState({ id: voiceId, status: 'playing' });
            audio.onended = cleanup;
            audio.onpause = cleanup;
            
            audio.play().catch(err => {
                console.error("Audio playback error:", err);
                cleanup();
            });
    
        } catch (err) {
            addToast(getErrorMessage(err), 'error');
            setVoicePreviewState(null);
        }
    };

    const handleGenerateAssets = async (sceneIndex: number, regenerate: boolean = false) => {
        if (!project.script || !user || !requirePermission('viralyzaier')) return;

        const scene = project.script.scenes[sceneIndex];
        const hasVisual = !!scene.visual.trim();
        const hasAudio = !!scene.voiceover.trim();
        
        const assetsExist = project.assets?.[sceneIndex];
        const generationType = generationTypes[sceneIndex] || 'video';

        const creditsForVideo = (generationType === 'video' && (!assetsExist?.brollVideo || regenerate)) && hasVisual ? 10 : 0;
        const creditsForImage = (generationType === 'animated_image' && (!assetsExist?.brollImage || regenerate)) && hasVisual ? 1 : 0;
        const creditsForAudio = (!assetsExist?.audio || regenerate) && hasAudio ? 2 : 0;
        const creditsNeeded = creditsForVideo + creditsForImage + creditsForAudio;
        
        if (creditsNeeded === 0 && !regenerate) return;
        if (!await consumeCredits(creditsNeeded)) return;

        setLoadingStates(prev => ({ ...prev, [sceneIndex]: { visual: hasVisual, audio: hasAudio, message: t('asset_studio.loading') } }));
        setSceneErrors(prev => ({ ...prev, [sceneIndex]: '' }));

        try {
            const visualPromise = creditsForVideo > 0 
                ? generateVideoClip(scene.visual, project.platform) 
                : creditsForImage > 0
                ? generateAnimatedImage(scene.visual, project.platform)
                : Promise.resolve(null);

            if (creditsForVideo > 0) setLoadingStates(prev => ({...prev, [sceneIndex]: {...prev[sceneIndex], message: t('asset_studio.loading_video') } }));
            
            const audioPromise = creditsForAudio > 0 ? generateVoiceover(scene.voiceover, project.voiceoverVoiceId || availableVoices[0].id) : Promise.resolve(null);

            const [visualBlob, audioBlob] = await Promise.all([visualPromise, audioPromise]);

            const newLocalPreviews: { video?: string, image?: string, audio?: string } = {};
            if (visualBlob) {
                const url = URL.createObjectURL(visualBlob);
                if (generationType === 'video') newLocalPreviews.video = url;
                else newLocalPreviews.image = url;
            }
            if (audioBlob) {
                newLocalPreviews.audio = URL.createObjectURL(audioBlob);
            }
            setLocalPreviews(prev => ({ ...prev, [sceneIndex]: { ...(prev[sceneIndex] || {}), ...newLocalPreviews } }));

            setLoadingStates(prev => ({ ...prev, [sceneIndex]: { message: '' } }));

            // Fire and forget upload
            (async () => {
                let videoUrl: string | undefined = project.assets?.[sceneIndex]?.brollVideo;
                let imageUrl: string | undefined = project.assets?.[sceneIndex]?.brollImage;
                let audioUrl: string | undefined = project.assets?.[sceneIndex]?.audio;

                if (visualBlob) {
                    const type = generationType === 'video' ? 'video' : 'image';
                    const url = await uploadFile(visualBlob, `${user.id}/${project.id}/scene_${sceneIndex + 1}_${type}.${type === 'video' ? 'mp4' : 'jpg'}`);
                    if (type === 'video') {
                        videoUrl = url;
                        imageUrl = undefined;
                    } else {
                        imageUrl = url;
                        videoUrl = undefined;
                    }
                }
                if (audioBlob) {
                    audioUrl = await uploadFile(audioBlob, `${user.id}/${project.id}/scene_${sceneIndex + 1}_audio.mp3`);
                }
                
                const assets: SceneAssets = {
                    brollVideo: videoUrl, brollImage: imageUrl, generationType,
                    audio: audioUrl, graphics: project.assets?.[sceneIndex]?.graphics || []
                };
                
                const updatedAssets = { ...(project.assets || {}), [sceneIndex]: assets };
                await handleUpdateProject({ id: project.id, assets: updatedAssets });
            })().catch(e => {
                const errorMessage = `Upload failed: ${getErrorMessage(e)}`;
                setSceneErrors(prev => ({ ...prev, [sceneIndex]: errorMessage }));
                addToast(errorMessage, 'error');
            });

        } catch (e) {
            const errorMessage = getErrorMessage(e);
            setSceneErrors(prev => ({ ...prev, [sceneIndex]: errorMessage }));
            addToast(errorMessage, 'error');
            setLoadingStates(prev => ({ ...prev, [sceneIndex]: { message: '' } }));
        }
    };
    
    const handleGenerateAllAssets = async () => {
        if (!project.script || !user || !requirePermission('viralyzaier')) return;

        const tasks: { sceneIndex: number; type: 'video' | 'image' | 'audio' }[] = [];
        project.script.scenes.forEach((scene, index) => {
            const generationType = generationTypes[index] || 'video';
            if (!!scene.visual.trim()) {
                if (generationType === 'video' && !project.assets?.[index]?.brollVideo) tasks.push({ sceneIndex: index, type: 'video' });
                if (generationType === 'animated_image' && !project.assets?.[index]?.brollImage) tasks.push({ sceneIndex: index, type: 'image' });
            }
            if (!!scene.voiceover.trim() && !project.assets?.[index]?.audio) tasks.push({ sceneIndex: index, type: 'audio' });
        });

        if (tasks.length === 0) {
            addToast("All assets are already generated.", "info");
            return;
        }
        
        const totalCredits = tasks.reduce((acc, task) => acc + (task.type === 'video' ? 10 : task.type === 'image' ? 1 : 2), 0);
        if (!await consumeCredits(totalCredits)) return;

        setIsBatchGenerating(true);
        setIsBatchComplete(false);
        setBatchLogs([]);
        setBatchProgress(0);

        let completedTasks = 0;
        let successCount = 0;
        let errorCount = 0;
        const updatedAssets = { ...(project.assets || {}) };

        for (const task of tasks) {
            const { sceneIndex, type } = task;
            const scene = project.script.scenes[sceneIndex];
            const logMessage = type === 'audio' 
                ? t('asset_studio.batch.log_starting_audio', { scene: sceneIndex + 1 })
                : t('asset_studio.batch.log_starting_video', { scene: sceneIndex + 1 });
            setBatchLogs(prev => [...prev, { message: logMessage, status: 'processing' }]);

            try {
                let blob: Blob | null = null;
                if (type === 'video') blob = await generateVideoClip(scene.visual, project.platform);
                else if (type === 'image') blob = await generateAnimatedImage(scene.visual, project.platform);
                else blob = await generateVoiceover(scene.voiceover, project.voiceoverVoiceId || availableVoices[0].id);

                if (blob) {
                    const url = URL.createObjectURL(blob);
                    const previewUpdate: { video?: string, image?: string, audio?: string } = {};
                    if (type === 'video') previewUpdate.video = url;
                    else if (type === 'image') previewUpdate.image = url;
                    else if (type === 'audio') previewUpdate.audio = url;
                    setLocalPreviews(prev => ({ ...prev, [sceneIndex]: { ...(prev[sceneIndex] || {}), ...previewUpdate } }));

                    const extension = type === 'video' ? 'mp4' : type === 'image' ? 'jpg' : 'mp3';
                    const cloudUrl = await uploadFile(blob, `${user.id}/${project.id}/scene_${sceneIndex + 1}_${type}.${extension}`);
                    
                    if (!updatedAssets[sceneIndex]) updatedAssets[sceneIndex] = { graphics: [] };
                    if (type === 'video') {
                        updatedAssets[sceneIndex].brollVideo = cloudUrl;
                        updatedAssets[sceneIndex].generationType = 'video';
                    }
                    if (type === 'image') {
                        updatedAssets[sceneIndex].brollImage = cloudUrl;
                        updatedAssets[sceneIndex].generationType = 'animated_image';
                    }
                    if (type === 'audio') updatedAssets[sceneIndex].audio = cloudUrl;

                    const successMessage = type === 'audio' 
                        ? t('asset_studio.batch.log_success_audio', { scene: sceneIndex + 1 })
                        : t('asset_studio.batch.log_success_video', { scene: sceneIndex + 1 });
                    setBatchLogs(prev => [...prev, { message: successMessage, status: 'success' }]);
                    successCount++;
                }
            } catch (e) {
                const errorMessage = e instanceof Error ? e.message : 'Unknown error';
                const failureMessage = (type === 'audio' ? t('asset_studio.batch.log_error_audio', { scene: sceneIndex + 1 }) : t('asset_studio.batch.log_error_video', { scene: sceneIndex + 1 })) + `: ${errorMessage}`;
                setBatchLogs(prev => [...prev, { message: failureMessage, status: 'error' }]);
                errorCount++;
            } finally {
                completedTasks++;
                setBatchProgress((completedTasks / tasks.length) * 100);
            }
        }

        await handleUpdateProject({ id: project.id, assets: updatedAssets });
        setBatchLogs(prev => [...prev, { message: t('asset_studio.batch.log_summary', { successCount, errorCount }), status: 'info' }]);
        setIsBatchComplete(true);
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
                if (sceneAssets.brollImage) {
                    const res = await fetch(sceneAssets.brollImage);
                    const blob = await res.blob();
                    folder.file(`b-roll_image.jpg`, blob);
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
    
    if (isBatchGenerating) {
        return (
            <BatchProgressView 
                logs={batchLogs} 
                progress={batchProgress} 
                isComplete={isBatchComplete} 
                onReturn={() => setIsBatchGenerating(false)}
                t={t}
            />
        );
    }
    
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
        const genType = generationTypes[index] || assets?.generationType || 'video';
        const needsVisual = !!scene.visual.trim();
        const needsAudio = !!scene.voiceover.trim();

        const hasVisual = (genType === 'video' && !!assets?.brollVideo) || (genType === 'animated_image' && !!assets?.brollImage);
        return (!needsVisual || hasVisual) && (!needsAudio || !!assets?.audio);
    });

    return (
        <div className="space-y-8 animate-fade-in-up">
            <header className="text-center">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">{t('asset_studio.title')}</h1>
                <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">{t('asset_studio.subtitle')}</p>
            </header>
            
            {sceneErrors[999] && <p className="text-red-400 text-center">{sceneErrors[999]}</p>}

            <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 flex flex-col md:flex-row items-center justify-between gap-4">
                 <div ref={voiceDropdownRef} className="relative w-full md:w-1/2">
                    <label htmlFor="voice-select-button" className="flex items-center text-sm font-bold text-gray-300 mb-2">
                        <MicIcon className="w-5 h-5 mr-2 text-teal-400"/>
                        {t('asset_studio.voice_selection_label')}
                    </label>
                    <button 
                        id="voice-select-button"
                        onClick={() => setIsVoiceDropdownOpen(prev => !prev)}
                        className="w-full flex items-center justify-between bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        aria-haspopup="listbox"
                        aria-expanded={isVoiceDropdownOpen}
                    >
                        <span>{currentVoice.name}</span>
                        <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform ${isVoiceDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isVoiceDropdownOpen && (
                        <div className="absolute top-full mt-1 w-full bg-gray-800 border border-gray-600 rounded-lg shadow-2xl z-20 max-h-60 overflow-y-auto">
                            <ul role="listbox">
                                {availableVoices.map(voice => (
                                    <li 
                                        key={voice.id} 
                                        className="flex items-center justify-between p-3 hover:bg-indigo-600/20"
                                        role="option"
                                        aria-selected={project.voiceoverVoiceId === voice.id}
                                    >
                                        <button 
                                            onClick={() => {
                                                handleUpdateProject({ id: project.id, voiceoverVoiceId: voice.id });
                                                setIsVoiceDropdownOpen(false);
                                            }}
                                            className="flex-grow text-left text-white"
                                        >
                                            {voice.name}
                                        </button>
                                        <button 
                                            onClick={(e) => handlePreviewVoice(e, voice.id)}
                                            className="p-2 text-gray-400 hover:text-white rounded-full"
                                            title={t('asset_studio.voice_preview_button_tooltip')}
                                        >
                                            {voicePreviewState?.id === voice.id ? (
                                                voicePreviewState.status === 'loading' ? <SparklesIcon className="w-5 h-5 animate-pulse" /> : <StopCircleIcon className="w-5 h-5" />
                                            ) : (
                                                <PlayIcon className="w-5 h-5" />
                                            )}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                 <div className="text-center">
                    {!allScenesGenerated ? (
                        <button
                            onClick={handleGenerateAllAssets}
                            disabled={isBatchGenerating}
                            className="inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                        >
                            <SparklesIcon className="w-5 h-5 mr-2" />
                            {isBatchGenerating ? t('asset_studio.generating_all') : t('asset_studio.generate_all_button')}
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
                    const localScenePreview = localPreviews[index] || {};
                    const isLoading = loadingStates[index] && (loadingStates[index].visual || loadingStates[index].audio);
                    const generationType = generationTypes[index] || sceneAssets?.generationType || 'video';
                    
                    const brollVideoSrc = localScenePreview.video || sceneAssets?.brollVideo;
                    const brollImageSrc = localScenePreview.image || sceneAssets?.brollImage;
                    const audioSrc = localScenePreview.audio || sceneAssets?.audio;

                    return (
                        <div key={index} className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700">
                            <h3 className="text-xl font-bold text-white mb-3">{t('asset_studio.scene_title', { index: index + 1 })} <span className="text-indigo-400">{scene.timecode}</span></h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                                <p><strong className="text-gray-400">{t('asset_studio.visual_label')}</strong> {scene.visual}</p>
                                <p><strong className="text-gray-400">{t('asset_studio.voiceover_label')}</strong> {scene.voiceover}</p>
                                <p><strong className="text-gray-400">{t('asset_studio.on_screen_text_label')}</strong> {scene.onScreenText}</p>
                            </div>

                            <div className="mb-6 bg-gray-900/40 p-3 rounded-lg flex items-center justify-center gap-4">
                                <span className="text-sm font-semibold text-gray-300">{t('asset_studio.generation_type')}:</span>
                                <div className="bg-gray-800 p-1 rounded-full flex items-center text-xs">
                                    <button onClick={() => setGenerationTypes(p => ({...p, [index]: 'video'}))} className={`px-3 py-1 rounded-full font-bold transition-colors ${generationType === 'video' ? 'bg-indigo-600 text-white' : 'text-gray-400'}`}>{t('asset_studio.type_video')} <span className="font-normal opacity-70">{t('asset_studio.cost_video')}</span></button>
                                    <button onClick={() => setGenerationTypes(p => ({...p, [index]: 'animated_image'}))} className={`px-3 py-1 rounded-full font-bold transition-colors ${generationType === 'animated_image' ? 'bg-teal-600 text-white' : 'text-gray-400'}`}>{t('asset_studio.type_animated_image')} <span className="font-normal opacity-70">{t('asset_studio.cost_image')}</span></button>
                                </div>
                                {generationType === 'animated_image' && <span className="text-xs font-bold text-teal-400 bg-teal-900/50 px-2 py-1 rounded-md">{t('asset_studio.cost_saving')}</span>}
                            </div>

                            {sceneErrors[index] && <p className="text-red-400 text-center mb-4 bg-red-900/50 p-2 rounded-md">{sceneErrors[index]}</p>}
                            
                            {(!brollVideoSrc && !brollImageSrc && !audioSrc) && !isLoading && (
                                <div className="text-center">
                                    <button 
                                        onClick={() => handleGenerateAssets(index)}
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
                            
                            {(brollVideoSrc || brollImageSrc || audioSrc) && !isLoading && (
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <h4 className="font-semibold text-gray-300">{t('asset_studio.b_roll_images_title')}</h4>
                                        <div className="w-full max-w-md mx-auto">
                                            {brollVideoSrc ? (
                                                <div className="relative group aspect-video">
                                                    <video key={brollVideoSrc} src={brollVideoSrc} className="w-full h-full rounded-lg object-cover shadow-lg bg-black" controls loop/>
                                                </div>
                                            ) : brollImageSrc ? (
                                                 <div className="relative group aspect-video">
                                                    <img src={brollImageSrc} alt="Generated scene visual" className="w-full h-full rounded-lg object-cover shadow-lg bg-black" />
                                                </div>
                                            ) : (
                                                <div className="aspect-video bg-gray-900 flex items-center justify-center rounded-lg"><PhotoIcon className="w-12 h-12 text-gray-700"/></div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {audioSrc && (
                                        <div className="space-y-2">
                                            <h4 className="font-semibold text-gray-300">{t('asset_studio.voiceover_audio_title')}</h4>
                                            <audio key={audioSrc} src={audioSrc} controls className="w-full" />
                                        </div>
                                    )}

                                    <div className="text-center border-t border-gray-700/50 pt-4">
                                        <button 
                                            onClick={() => handleGenerateAssets(index, true)}
                                            disabled={isLoading}
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