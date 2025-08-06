import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Project, Scene, Script, Analysis, VisualType, StockAsset, AIMusic, Subtitle, TimelineState, BrandIdentity, SceneAssets, ClonedVoice, TimelineTrack, TimelineClip } from '../types';
import * as geminiService from '../services/geminiService';
import * as generativeMediaService from '../services/generativeMediaService';
import * as vfxService from '../services/vfxService';
import { SparklesIcon, PhotoIcon, PlayIcon, RocketLaunchIcon, MusicNoteIcon, SubtitlesIcon, XCircleIcon, VolumeUpIcon, VolumeOffIcon, PaintBrushIcon, CheckIcon, MicIcon, FilmIcon, TypeIcon, PauseIcon, LightBulbIcon, WandSparklesIcon, LayersIcon, TransitionIcon, SearchIcon, FontSizeIcon, LetterSpacingIcon, LineHeightIcon, AdjustmentsHorizontalIcon, SpeakerWaveIcon } from './Icons';
import { useAppContext } from '../contexts/AppContext';
import { getErrorMessage } from '../utils';
import AnalysisLoader from './AnalysisLoader';
import AnalysisResult from './AnalysisResult';
import AssetPickerModal from './AssetPickerModal';
import SubtitleTrack from './SubtitleTrack';
import * as supabaseService from '../services/supabaseService';
import { ELEVENLABS_VOICES } from '../services/generativeMediaService';
import { v4 as uuidv4 } from 'uuid';
import LivePreviewPlayer from './LivePreviewPlayer';
import Timeline from './Timeline';

// Helper to initialize timeline state from script
const initializeTimelineFromScript = (script: Script): TimelineState => {
    let currentTime = 0;
    const voiceoverClips: TimelineClip[] = [];
    const aRollClips: TimelineClip[] = [];

    script.scenes.forEach((scene, index) => {
        const duration = 5; // Default 5s per scene
        voiceoverClips.push({
            id: `vo_${index}`,
            type: 'audio',
            url: '', // Will be filled later
            sceneIndex: index,
            startTime: currentTime,
            endTime: currentTime + duration,
            sourceDuration: duration,
        });
        aRollClips.push({
            id: `ar_${index}`,
            type: 'image', // Default to image placeholder
            url: '', // Will be filled later
            sceneIndex: index,
            startTime: currentTime,
            endTime: currentTime + duration,
            sourceDuration: duration,
        });
        currentTime += duration;
    });

    return {
        tracks: [
            { id: 'overlay', type: 'overlay', clips: [] },
            { id: 'b-roll', type: 'b-roll', clips: [] },
            { id: 'a-roll', type: 'a-roll', clips: aRollClips },
            { id: 'voiceover', type: 'voiceover', clips: voiceoverClips },
            { id: 'music', type: 'music', clips: [] },
            { id: 'sfx', type: 'sfx', clips: [] },
            { id: 'text', type: 'text', clips: [] },
        ],
        subtitles: [],
        voiceoverVolume: 1,
        musicVolume: 0.5,
        isDuckingEnabled: true,
        totalDuration: currentTime,
    };
};

const EditorView: React.FC<{
    project: Project;
    onAnalysisTriggered: (previewUrl: string, frames: string[]) => void;
}> = ({ project, onAnalysisTriggered }) => {
    const { t, user, handleUpdateProject, addToast, consumeCredits, lockAndExecute } = useAppContext();
    const [timeline, setTimeline] = useState<TimelineState>(() => (project.script ? initializeTimelineFromScript(project.script) : { tracks: [], subtitles: [], voiceoverVolume: 1, musicVolume: 0.5, isDuckingEnabled: true, totalDuration: 0 }));
    const [activeSceneIndex, setActiveSceneIndex] = useState<number>(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState<{ [key: string]: boolean }>({});
    
    // States for Asset Foundry
    const [rightPanelTab, setRightPanelTab] = useState<'assets' | 'vfx' | 'text' | 'polish'>('assets');
    const [musicPrompt, setMusicPrompt] = useState('');
    const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
    const [selectedSubtitleId, setSelectedSubtitleId] = useState<string | null>(null);
    const [objectToRemove, setObjectToRemove] = useState('');
    const [giphySearch, setGiphySearch] = useState('');
    const [giphyResults, setGiphyResults] = useState<{url: string}[]>([]);
    
    const selectedClip = useMemo(() => {
        if (!selectedClipId) return null;
        for (const track of timeline.tracks) {
            const clip = track.clips.find(c => c.id === selectedClipId);
            if (clip) return clip;
        }
        return null;
    }, [selectedClipId, timeline.tracks]);
    
    const selectedSubtitle = useMemo(() => {
        return timeline.subtitles.find(sub => sub.id === selectedSubtitleId) || null;
    }, [selectedSubtitleId, timeline.subtitles]);
    
    const voiceoverTrack = useMemo(() => timeline.tracks.find(t => t.type === 'voiceover'), [timeline.tracks]);

    const handleTimelineUpdate = (newTimeline: TimelineState, debounce: boolean = true) => {
        setTimeline(newTimeline);
        // FIX: Timeline persistence disabled due to missing 'timeline' column in the database.
        // This prevents the app from crashing but means timeline changes are not saved.
        // To re-enable, add a 'timeline' JSON column to the 'projects' table and uncomment the line below.
        // handleUpdateProject({ id: project.id, timeline: newTimeline });
    };
    
    const handleSeek = (time: number) => {
        setCurrentTime(time);
        const sceneIndex = timeline.tracks.find(t => t.type === 'a-roll')?.clips.find(c => time >= c.startTime && time < c.endTime)?.sceneIndex;
        if (sceneIndex !== undefined && sceneIndex !== activeSceneIndex) {
            setActiveSceneIndex(sceneIndex);
        }
    }
    
     const handleUpdateClip = (clipId: string, updates: Partial<TimelineClip>) => {
        const newTimeline = JSON.parse(JSON.stringify(timeline)); // Deep copy is safer
        let clipFound = false;
        for (const track of newTimeline.tracks) {
            const clipIndex = track.clips.findIndex((c: TimelineClip) => c.id === clipId);
            if (clipIndex !== -1) {
                track.clips[clipIndex] = { ...track.clips[clipIndex], ...updates };
                clipFound = true;
                break;
            }
        }
        if (clipFound) {
            handleTimelineUpdate(newTimeline, false);
        }
    };
    
    const handleUpdateSubtitle = (subtitleId: string, updates: Partial<Subtitle> | { style: Partial<Subtitle['style']> }) => {
        const newSubtitles = timeline.subtitles.map(sub => {
            if (sub.id === subtitleId) {
                const newStyle = { ...sub.style, ...('style' in updates ? updates.style : {}) };
                const newSub = { ...sub, ...updates, style: newStyle };
                if (updates.style && 'fill' in updates.style) {
                    newSub.style.fill = { ...sub.style.fill, ...updates.style.fill };
                }
                return newSub;
            }
            return sub;
        });
        handleTimelineUpdate({ ...timeline, subtitles: newSubtitles }, false);
    };


    const handleGenerateVoiceover = (sceneIndex: number) => lockAndExecute(async () => {
        if (!project.script || !project.voiceoverVoiceId) return;
        if (!await consumeCredits(1)) return;
        
        setIsLoading(prev => ({ ...prev, [`vo-${sceneIndex}`]: true }));
        try {
            const text = project.script.scenes[sceneIndex].voiceover;
            const audioBlob = await generativeMediaService.generateVoiceover(text, project.voiceoverVoiceId);
            const path = `${user!.id}/${project.id}/voiceovers/scene_${sceneIndex}.mp3`;
            const audioUrl = await supabaseService.uploadFile(audioBlob, path);
            
            const newTimeline = { ...timeline };
            const voTrack = newTimeline.tracks.find(t => t.type === 'voiceover')!;
            const clip = voTrack.clips.find(c => c.sceneIndex === sceneIndex);
            if(clip) clip.url = audioUrl;
            
            handleTimelineUpdate(newTimeline, false);
            addToast(`Voiceover for Scene ${sceneIndex+1} generated!`, 'success');
        } catch(e) {
            addToast(`Voiceover generation failed: ${getErrorMessage(e)}`, 'error');
        } finally {
            setIsLoading(prev => ({ ...prev, [`vo-${sceneIndex}`]: false }));
        }
    });

    const handleAssetAdd = (url: string, type: VisualType, targetTrack: 'a-roll' | 'b-roll' = 'a-roll') => {
        const newTimeline = JSON.parse(JSON.stringify(timeline));
        
        if (targetTrack === 'a-roll') {
            const aRollTrack = newTimeline.tracks.find((t: TimelineTrack) => t.type === 'a-roll')!;
            const clip = aRollTrack.clips.find((c: TimelineClip) => c.sceneIndex === activeSceneIndex);
            if(clip) {
                clip.url = url;
                clip.type = type === 'stock' || type === 'user' || type === 'ai_video' ? 'video' : 'image';
            }
        } else { // b-roll
            const bRollTrack = newTimeline.tracks.find((t: TimelineTrack) => t.type === 'b-roll')!;
            const aRollClip = newTimeline.tracks.find((t: TimelineTrack) => t.type === 'a-roll')?.clips.find((c: TimelineClip) => c.sceneIndex === activeSceneIndex);
            if (aRollClip) {
                bRollTrack.clips.push({
                    id: uuidv4(),
                    type: type === 'stock' || type === 'user' || type === 'ai_video' ? 'video' : 'image',
                    url: url,
                    sceneIndex: activeSceneIndex,
                    startTime: aRollClip.startTime,
                    endTime: aRollClip.endTime,
                    sourceDuration: aRollClip.sourceDuration
                });
            }
        }
        
        handleTimelineUpdate(newTimeline, false);
        setIsModalOpen(false);
        addToast(`Visual for Scene ${activeSceneIndex+1} updated!`, 'success');
    };

    const handleGenerateMusic = () => lockAndExecute(async () => {
        if (!musicPrompt.trim()) return;
        if (!await consumeCredits(5)) return;
        setIsLoading(prev => ({...prev, music: true}));
        try {
            const audioBlob = await generativeMediaService.generateAiMusic(musicPrompt, Math.ceil(timeline.totalDuration));
            const path = `${user!.id}/${project.id}/music/${uuidv4()}.mp3`;
            const audioUrl = await supabaseService.uploadFile(audioBlob, path);
            
            const newTimeline = { ...timeline };
            const musicTrack = newTimeline.tracks.find(t => t.type === 'music')!;
            musicTrack.clips = [{ id: uuidv4(), type: 'audio', url: audioUrl, sceneIndex: -1, startTime: 0, endTime: timeline.totalDuration, sourceDuration: timeline.totalDuration }];
            handleTimelineUpdate(newTimeline, false);
            addToast("AI music added to your project!", "success");
        } catch(e) {
            addToast(`Music generation failed: ${getErrorMessage(e)}`, 'error');
        } finally {
            setIsLoading(prev => ({...prev, music: false}));
        }
    });

    const handleGenerateSubtitles = () => lockAndExecute(async () => {
        if (!project.script) return;
        if (!await consumeCredits(2)) return;
        setIsLoading(prev => ({...prev, subs: true}));
        try {
            const subtitles = await geminiService.generateAnimatedSubtitles(project.script);
            handleTimelineUpdate({ ...timeline, subtitles }, false);
            addToast("Animated subtitles generated!", "success");
        } catch(e) {
            addToast(`Subtitle generation failed: ${getErrorMessage(e)}`, 'error');
        } finally {
             setIsLoading(prev => ({...prev, subs: false}));
        }
    });
    
    // VFX Handlers
    const handleAnimationChange = (type: 'in' | 'out', value: string) => {
        if (!selectedClipId) return;
        const currentAnimation = selectedClip?.animation || {};
        const newAnimation = { ...currentAnimation, [type]: value === 'none' ? undefined : value };
        handleUpdateClip(selectedClipId, { animation: newAnimation });
    };

    const handleTransitionChange = (value: string) => {
        if (!selectedClipId) return;
        const newTransition = value === 'none' ? undefined : { type: value as any, duration: 1 };
        handleUpdateClip(selectedClipId, { transition: newTransition });
    };

    const handleAiEffect = (effect: 'backgroundRemoved' | 'retouch') => lockAndExecute(async () => {
        if (!selectedClip || !selectedClip.url) return;
        const cost = effect === 'backgroundRemoved' ? 5 : 2;
        if (!await consumeCredits(cost)) return;
        
        setIsLoading(prev => ({ ...prev, [effect]: true }));
        try {
            const serviceCall = effect === 'backgroundRemoved' ? vfxService.removeBackground : vfxService.applyRetouch;
            const newUrl = await serviceCall(selectedClip.url);
            const newEffects = { ...selectedClip.aiEffects, [effect]: true };
            handleUpdateClip(selectedClip.id, { url: newUrl, aiEffects: newEffects });
            addToast(`AI effect '${effect}' applied!`, 'success');
        } catch (e) {
            addToast(`Failed to apply effect: ${getErrorMessage(e)}`, 'error');
        } finally {
            setIsLoading(prev => ({ ...prev, [effect]: false }));
        }
    });

    const handleRemoveObject = () => lockAndExecute(async () => {
        if (!selectedClip || !selectedClip.url || !objectToRemove.trim()) return;
        if (!await consumeCredits(5)) return;

        setIsLoading(prev => ({ ...prev, objectRemove: true }));
        try {
            const newUrl = await vfxService.removeObject(selectedClip.url, objectToRemove);
            const newEffects = { ...selectedClip.aiEffects, objectRemoved: objectToRemove };
            handleUpdateClip(selectedClip.id, { url: newUrl, aiEffects: newEffects });
            addToast(`Attempting to remove '${objectToRemove}'...`, 'success');
            setObjectToRemove('');
        } catch (e) {
            addToast(`Failed to remove object: ${getErrorMessage(e)}`, 'error');
        } finally {
            setIsLoading(prev => ({ ...prev, objectRemove: false }));
        }
    });

    const handleAddOverlay = (url: string) => {
        const newTimeline = JSON.parse(JSON.stringify(timeline));
        const overlayTrack = newTimeline.tracks.find((t:TimelineTrack) => t.type === 'overlay')!;
        overlayTrack.clips.push({
            id: uuidv4(),
            type: 'video',
            url: url,
            sceneIndex: -1,
            startTime: currentTime,
            endTime: currentTime + 4,
            sourceDuration: 4,
        });
        handleTimelineUpdate(newTimeline, false);
    };
    
    const handleGiphySearch = async () => {
        if (!giphySearch.trim()) return;
        setIsLoading(prev => ({ ...prev, giphy: true }));
        const results = await vfxService.searchGiphy(giphySearch);
        setGiphyResults(results);
        setIsLoading(prev => ({ ...prev, giphy: false }));
    };
    
    const handleApplyViralStyle = (style: 'mrbeast' | 'hormozi') => {
        if (!selectedSubtitleId) return;
        let styleUpdates: Partial<Subtitle['style']> = {};
        if (style === 'mrbeast') {
            styleUpdates = {
                fontFamily: 'Inter, sans-serif',
                fontWeight: 900,
                fontSize: 64,
                fill: { type: 'color', color: '#FFFFFF' },
                outline: { color: '#000000', width: 6 },
                shadow: { color: 'rgba(0,0,0,0.5)', blur: 5, offsetX: 0, offsetY: 5 },
            };
        } else if (style === 'hormozi') {
            styleUpdates = {
                fontFamily: 'Inter, sans-serif',
                fontWeight: 800,
                fontSize: 52,
                fill: { type: 'color', color: '#FFFF00' },
                outline: { color: '#000000', width: 2 },
            };
        }
        handleUpdateSubtitle(selectedSubtitleId, { style: styleUpdates });
    };

    const handleAiEmphasize = () => lockAndExecute(async () => {
        if (!selectedSubtitle) return;
        if (!await consumeCredits(1)) return;
        setIsLoading(prev => ({...prev, emphasize: true}));
        try {
            const emphasisData = await geminiService.emphasizeSubtitleText(selectedSubtitle.text);
            const originalWords = selectedSubtitle.words || [];
            const newWords = originalWords.map((wordData, index) => ({
                ...wordData,
                style: {
                    ...wordData.style,
                    ...(emphasisData[index]?.style || {}),
                }
            }));
            handleUpdateSubtitle(selectedSubtitle.id, { words: newWords });
            addToast("AI emphasis applied!", "success");
        } catch(e) {
            addToast(`Failed to apply AI emphasis: ${getErrorMessage(e)}`, 'error');
        } finally {
            setIsLoading(prev => ({...prev, emphasize: false}));
        }
    });

    const handleAssembleVideo = () => lockAndExecute(async () => {
        addToast("Preparing to analyze video...", "info");
        const previewUrl = 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4';
        const aRollTrack = timeline.tracks.find(t => t.type === 'a-roll');
        const frames = aRollTrack?.clips.slice(0, 3).map(c => c.url).filter(Boolean) as string[] || [];
        if (frames.length === 0 && project.moodboard) {
            frames.push(...project.moodboard);
        }
        if (frames.length === 0) {
            addToast("Please add at least one visual to the timeline before analyzing.", "error");
            return;
        }
        await handleUpdateProject({ id: project.id, publishedUrl: previewUrl });
        onAnalysisTriggered(previewUrl, frames);
    });
    
     // Polish Handlers
    const handleLutChange = (lut: string) => {
        if (!selectedClip) return;
        const newColor = { ...selectedClip.color, lut: lut === 'none' ? undefined : lut as any };
        handleUpdateClip(selectedClip.id, { color: newColor });
    };

    const handleAdjustmentChange = (adjustment: 'exposure' | 'contrast' | 'saturation' | 'temperature', value: number) => {
        if (!selectedClip) return;
        const currentAdjustments = selectedClip.color?.adjustments || { exposure: 0, contrast: 0, saturation: 0, temperature: 0 };
        const newAdjustments = { ...currentAdjustments, [adjustment]: value };
        const newColor = { ...selectedClip.color, adjustments: newAdjustments };
        handleUpdateClip(selectedClip.id, { color: newColor });
    };

    const handleAudioEnhance = () => lockAndExecute(async () => {
        if (!selectedClip || !selectedClip.url) return;
        if (!await consumeCredits(2)) return;
        
        setIsLoading(prev => ({ ...prev, audioEnhance: true }));
        try {
            const newUrl = await vfxService.applyAudioEnhance(selectedClip.url);
            const newAudio = { ...selectedClip.audio, enhance: true };
            handleUpdateClip(selectedClip.id, { url: newUrl, audio: newAudio });
            addToast(`AI audio enhancement applied!`, 'success');
        } catch (e) {
            addToast(`Failed to apply audio enhancement: ${getErrorMessage(e)}`, 'error');
        } finally {
            setIsLoading(prev => ({ ...prev, audioEnhance: false }));
        }
    });

    const handleVoicePresetChange = (preset: string) => lockAndExecute(async () => {
        if (!selectedClip || !selectedClip.url) return;
        if (preset !== 'none' && !await consumeCredits(1)) return;
        
        setIsLoading(prev => ({ ...prev, voicePreset: true }));
        try {
            const newUrl = preset === 'none' ? selectedClip.url : await vfxService.applyVoicePreset(selectedClip.url, preset);
            const newAudio = { ...selectedClip.audio, voicePreset: preset === 'none' ? undefined : preset as any };
            handleUpdateClip(selectedClip.id, { url: newUrl, audio: newAudio });
            addToast(`AI voice preset applied!`, 'success');
        } catch (e) {
            addToast(`Failed to apply voice preset: ${getErrorMessage(e)}`, 'error');
        } finally {
            setIsLoading(prev => ({ ...prev, voicePreset: false }));
        }
    });

    if (!project.script) {
        return <div className="text-center py-16 px-6 bg-gray-800/50 rounded-2xl"><h2 className="text-2xl font-bold text-white mb-3">{t('asset_studio.script_required_title')}</h2><p className="text-gray-400 mb-6 max-w-md mx-auto">{t('asset_studio.script_required_subtitle')}</p></div>
    }

    return (
        <div className="flex flex-col h-[calc(100vh - 16rem)] animate-fade-in-up">
            <div className="flex flex-1 min-h-0">
                {/* Left Panel: Transcript */}
                <aside className="w-[30%] p-4 overflow-y-auto bg-gray-800/50 rounded-l-lg border-r border-gray-700">
                    <h3 className="text-lg font-bold text-white mb-4">Transcript</h3>
                    <div className="space-y-4">
                        {project.script.scenes.map((scene, index) => {
                            const clip = timeline.tracks.find(t => t.type === 'a-roll')?.clips.find(c => c.sceneIndex === index);
                            return (
                                <div key={index} onClick={() => handleSeek(clip?.startTime ?? 0)} className={`p-3 rounded-lg cursor-pointer transition-colors ${activeSceneIndex === index ? 'bg-indigo-600/50' : 'hover:bg-gray-700/50'}`}>
                                    <p className="font-bold text-white">Scene {index+1} ({scene.timecode})</p>
                                    <p className="text-sm text-gray-300">{scene.voiceover}</p>
                                </div>
                            )
                        })}
                    </div>
                </aside>
                {/* Center Panel: Preview */}
                <main className="w-[40%] p-4 flex flex-col items-center justify-center bg-black">
                    <LivePreviewPlayer 
                        timeline={timeline}
                        isPlaying={isPlaying}
                        currentTime={currentTime}
                        onTimeUpdate={setCurrentTime}
                        onEnded={() => setIsPlaying(false)}
                        aspectRatio={project.platform === 'youtube_long' ? '16/9' : '9/16'}
                    />
                     <div className="flex items-center justify-center gap-4 mt-4">
                        <button onClick={() => setIsPlaying(!isPlaying)} className="p-3 bg-gray-700 rounded-full text-white hover:bg-indigo-600">
                            {isPlaying ? <PauseIcon className="w-6 h-6"/> : <PlayIcon className="w-6 h-6"/>}
                        </button>
                    </div>
                </main>
                 {/* Right Panel: Universal Asset Foundry */}
                <aside className="w-[30%] p-4 flex flex-col bg-gray-800/50 rounded-r-lg border-l border-gray-700">
                    <div className="flex-shrink-0 border-b border-gray-700 mb-4">
                        <nav className="-mb-px flex space-x-4">
                            <button onClick={() => setRightPanelTab('assets')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-semibold text-sm ${rightPanelTab === 'assets' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-white'}`}>Scene & Project</button>
                            <button onClick={() => setRightPanelTab('vfx')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-semibold text-sm ${rightPanelTab === 'vfx' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-white'}`}>{t('vfx_hub.title')}</button>
                             <button onClick={() => setRightPanelTab('text')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-semibold text-sm ${rightPanelTab === 'text' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-white'}`}>{t('text_engine.title')}</button>
                             <button onClick={() => setRightPanelTab('polish')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-semibold text-sm ${rightPanelTab === 'polish' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-white'}`}>{t('color_audio_studio.title')}</button>
                        </nav>
                    </div>

                    <div className="flex-grow overflow-y-auto pr-2 -mr-4">
                        {rightPanelTab === 'assets' && (
                            <div className="space-y-4">
                                <h4 className="font-semibold text-gray-300">Scene {activeSceneIndex+1} Assets</h4>
                                <div className="bg-gray-900/50 p-3 rounded-lg space-y-3">
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-300">Visual</h4>
                                        <button onClick={() => setIsModalOpen(true)} className="w-full mt-1 text-center py-2 text-sm font-semibold bg-sky-600 text-white rounded-lg hover:bg-sky-500">Replace Visual</button>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-300">Voiceover</h4>
                                        <button onClick={() => handleGenerateVoiceover(activeSceneIndex)} disabled={isLoading[`vo-${activeSceneIndex}`]} className="w-full mt-1 text-center py-2 text-sm font-semibold bg-sky-600 text-white rounded-lg hover:bg-sky-500 disabled:bg-gray-600">
                                            {isLoading[`vo-${activeSceneIndex}`] ? "Generating..." : "Generate VO (1 Credit)"}
                                        </button>
                                    </div>
                                </div>
                                <h4 className="font-semibold text-gray-300 pt-4 border-t border-gray-700">Project Assets</h4>
                                <div className="bg-gray-900/50 p-3 rounded-lg space-y-3">
                                   <div>
                                       <h4 className="text-sm font-semibold text-gray-300">AI Music</h4>
                                        <div className="flex gap-2">
                                            <input value={musicPrompt} onChange={e => setMusicPrompt(e.target.value)} type="text" placeholder="e.g., epic cinematic" className="flex-grow bg-gray-700 border-gray-600 rounded-md p-2 text-xs text-white"/>
                                            <button onClick={handleGenerateMusic} disabled={isLoading['music']} className="p-2 bg-indigo-600 rounded-md text-white disabled:bg-gray-600"><SparklesIcon className="w-4 h-4"/></button>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-300">AI Transcription</h4>
                                        <button onClick={handleGenerateSubtitles} disabled={isLoading['subs']} className="w-full mt-1 text-center py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:bg-gray-600">
                                            {isLoading['subs'] ? 'Generating...' : 'Generate Captions (2 Cr)'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        {rightPanelTab === 'vfx' && (!selectedClip || (selectedClip.type !== 'video' && selectedClip.type !== 'image')) ? (
                             <div className="text-center text-gray-500 pt-10">{t('vfx_hub.no_clip_selected')}</div>
                        ) : rightPanelTab === 'vfx' && selectedClip && (
                            <div className="space-y-4">
                                {/* Animations */}
                                <div className="bg-gray-900/50 p-3 rounded-lg space-y-2">
                                    <h4 className="font-semibold text-white flex items-center gap-2"><TransitionIcon className="w-5 h-5"/>{t('vfx_hub.animations_title')}</h4>
                                    <select onChange={e => handleAnimationChange('in', e.target.value)} value={selectedClip?.animation?.in || 'none'} className="w-full bg-gray-700 text-sm p-2 rounded-md"><option value="none">{t('vfx_hub.animation_in')}: {t('vfx_hub.animation_none')}</option><option value="fade">Fade In</option><option value="slide">Slide In</option><option value="rise">Rise In</option></select>
                                    <select onChange={e => handleAnimationChange('out', e.target.value)} value={selectedClip?.animation?.out || 'none'} className="w-full bg-gray-700 text-sm p-2 rounded-md"><option value="none">{t('vfx_hub.animation_out')}: {t('vfx_hub.animation_none')}</option><option value="fade">Fade Out</option><option value="slide">Slide Out</option><option value="rise">Rise Out</option></select>
                                </div>
                                {/* Transitions */}
                                <div className="bg-gray-900/50 p-3 rounded-lg space-y-2">
                                    <h4 className="font-semibold text-white flex items-center gap-2"><TransitionIcon className="w-5 h-5"/>{t('vfx_hub.transitions_title')}</h4>
                                    <select onChange={e => handleTransitionChange(e.target.value)} value={selectedClip?.transition?.type || 'none'} className="w-full bg-gray-700 text-sm p-2 rounded-md"><option value="none">{t('vfx_hub.animation_none')}</option><option value="glitch">{t('vfx_hub.transition_glitch')}</option><option value="whip_pan">{t('vfx_hub.transition_whip_pan')}</option><option value="film_burn">{t('vfx_hub.transition_film_burn')}</option></select>
                                </div>
                                 {/* AI Effects */}
                                <div className="bg-gray-900/50 p-3 rounded-lg space-y-2">
                                    <h4 className="font-semibold text-white flex items-center gap-2"><WandSparklesIcon className="w-5 h-5"/>{t('vfx_hub.ai_effects_title')}</h4>
                                    <button onClick={() => handleAiEffect('backgroundRemoved')} disabled={isLoading['backgroundRemoved']} className="w-full text-sm p-2 rounded-md bg-sky-600 hover:bg-sky-500 disabled:bg-gray-600">{t('vfx_hub.effect_remove_bg')}</button>
                                    <button onClick={() => handleAiEffect('retouch')} disabled={isLoading['retouch']} className="w-full text-sm p-2 rounded-md bg-sky-600 hover:bg-sky-500 disabled:bg-gray-600">{t('vfx_hub.effect_retouch')}</button>
                                    <div className="flex gap-2">
                                        <input value={objectToRemove} onChange={e => setObjectToRemove(e.target.value)} placeholder={t('vfx_hub.remove_object_placeholder')} className="flex-grow bg-gray-700 text-xs p-2 rounded-md" />
                                        <button onClick={handleRemoveObject} disabled={isLoading['objectRemove']} className="px-3 text-sm rounded-md bg-sky-600 hover:bg-sky-500 disabled:bg-gray-600">{t('vfx_hub.remove_object_button')}</button>
                                    </div>
                                </div>
                                {/* Overlays */}
                                <div className="bg-gray-900/50 p-3 rounded-lg space-y-2">
                                    <h4 className="font-semibold text-white flex items-center gap-2"><LayersIcon className="w-5 h-5"/>{t('vfx_hub.overlays_title')}</h4>
                                    <p className="text-xs text-gray-400">{t('vfx_hub.overlay_stickers')}</p>
                                    <div className="flex gap-2">
                                        <input onKeyPress={e => e.key === 'Enter' && handleGiphySearch()} value={giphySearch} onChange={e => setGiphySearch(e.target.value)} placeholder={t('vfx_hub.search_giphy')} className="flex-grow bg-gray-700 text-xs p-2 rounded-md" />
                                        <button onClick={handleGiphySearch} disabled={isLoading['giphy']} className="p-2 rounded-md bg-indigo-600"><SearchIcon className="w-4 h-4"/></button>
                                    </div>
                                    {giphyResults.length > 0 && <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">{giphyResults.map(r => <img key={r.url} src={r.url} onClick={() => handleAddOverlay(r.url)} className="w-full h-full object-cover rounded cursor-pointer"/>)}</div>}
                                    <p className="text-xs text-gray-400 pt-2 border-t border-gray-700">{t('vfx_hub.overlay_effects')}</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button onClick={() => handleAddOverlay('film-grain-url')} className="text-xs p-2 rounded-md bg-gray-700 hover:bg-gray-600">{t('vfx_hub.film_grain')}</button>
                                        <button onClick={() => handleAddOverlay('lens-flare-url')} className="text-xs p-2 rounded-md bg-gray-700 hover:bg-gray-600">{t('vfx_hub.lens_flare')}</button>
                                        <button onClick={() => handleAddOverlay('dust-url')} className="text-xs p-2 rounded-md bg-gray-700 hover:bg-gray-600">{t('vfx_hub.dust')}</button>
                                    </div>
                                </div>
                            </div>
                        )}
                        {rightPanelTab === 'text' && !selectedSubtitle ? (
                             <div className="text-center text-gray-500 pt-10">{t('text_engine.no_subtitle_selected')}</div>
                        ) : rightPanelTab === 'text' && selectedSubtitle && (
                            <div className="space-y-4">
                                <div className="bg-gray-900/50 p-3 rounded-lg space-y-2">
                                    <h4 className="font-semibold text-white">{t('text_engine.viral_styles')}</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => handleApplyViralStyle('mrbeast')} className="p-2 text-sm rounded-md bg-gray-700 hover:bg-gray-600">{t('text_engine.style_mrbeast')}</button>
                                        <button onClick={() => handleApplyViralStyle('hormozi')} className="p-2 text-sm rounded-md bg-gray-700 hover:bg-gray-600">{t('text_engine.style_hormozi')}</button>
                                    </div>
                                </div>
                                <div className="bg-gray-900/50 p-3 rounded-lg space-y-4">
                                    <h4 className="font-semibold text-white">{t('text_engine.font_control')}</h4>
                                    <div className="flex items-center gap-2"><FontSizeIcon className="w-5 h-5 text-gray-400"/><label className="text-sm w-20">{t('text_engine.font_size')}</label><input type="range" min="12" max="128" value={selectedSubtitle.style.fontSize} onChange={e => handleUpdateSubtitle(selectedSubtitle.id, { style: { fontSize: parseInt(e.target.value) } })} className="flex-grow"/></div>
                                    <div className="flex items-center gap-2"><PaintBrushIcon className="w-5 h-5 text-gray-400"/><label className="text-sm w-20">{t('text_engine.font_weight')}</label><input type="range" min="100" max="900" step="100" value={selectedSubtitle.style.fontWeight} onChange={e => handleUpdateSubtitle(selectedSubtitle.id, { style: { fontWeight: parseInt(e.target.value) } })} className="flex-grow"/></div>
                                    <div className="flex items-center gap-2"><LetterSpacingIcon className="w-5 h-5 text-gray-400"/><label className="text-sm w-20">{t('text_engine.letter_spacing')}</label><input type="range" min="-5" max="20" value={selectedSubtitle.style.letterSpacing} onChange={e => handleUpdateSubtitle(selectedSubtitle.id, { style: { letterSpacing: parseInt(e.target.value) } })} className="flex-grow"/></div>
                                    <div className="flex items-center gap-2"><LineHeightIcon className="w-5 h-5 text-gray-400"/><label className="text-sm w-20">{t('text_engine.line_height')}</label><input type="range" min="0.8" max="2" step="0.1" value={selectedSubtitle.style.lineHeight} onChange={e => handleUpdateSubtitle(selectedSubtitle.id, { style: { lineHeight: parseFloat(e.target.value) } })} className="flex-grow"/></div>
                                </div>
                                 <div className="bg-gray-900/50 p-3 rounded-lg space-y-2">
                                    <h4 className="font-semibold text-white">{t('text_engine.advanced_styling')}</h4>
                                    <div><label className="text-sm">{t('text_engine.fill')}: </label><input type="color" value={selectedSubtitle.style.fill.color} onChange={e => handleUpdateSubtitle(selectedSubtitle.id, { style: { fill: { type: 'color', color: e.target.value } }})} /></div>
                                    <div><label className="text-sm">{t('text_engine.outline')}: </label><input type="color" value={selectedSubtitle.style.outline?.color || '#000000'} onChange={e => handleUpdateSubtitle(selectedSubtitle.id, { style: { outline: { ...selectedSubtitle.style.outline, color: e.target.value } }})} /><input type="range" min="0" max="10" value={selectedSubtitle.style.outline?.width || 0} onChange={e => handleUpdateSubtitle(selectedSubtitle.id, { style: { outline: { ...selectedSubtitle.style.outline, width: parseInt(e.target.value) } }})} /></div>
                                    <div><label className="text-sm">{t('text_engine.shadow')}: </label><input type="color" value={selectedSubtitle.style.shadow?.color || '#000000'} onChange={e => handleUpdateSubtitle(selectedSubtitle.id, { style: { shadow: { ...selectedSubtitle.style.shadow, color: e.target.value } }})} /></div>
                                </div>
                                <div className="text-center pt-2">
                                     <button onClick={handleAiEmphasize} disabled={isLoading['emphasize']} className="w-full p-2 text-sm rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600">{isLoading['emphasize'] ? t('text_engine.ai_emphasis_loading') : t('text_engine.ai_emphasis')}</button>
                                </div>
                            </div>
                        )}
                        {rightPanelTab === 'polish' && (!selectedClip) ? (
                            <div className="text-center text-gray-500 pt-10">{t('color_audio_studio.no_clip_selected')}</div>
                        ) : rightPanelTab === 'polish' && selectedClip && (selectedClip.type === 'video' || selectedClip.type === 'image') ? (
                             <div className="space-y-4">
                                <div className="bg-gray-900/50 p-3 rounded-lg space-y-3">
                                    <h4 className="font-semibold text-white flex items-center gap-2"><AdjustmentsHorizontalIcon className="w-5 h-5"/>{t('color_audio_studio.color_grading_title')}</h4>
                                    <p className="text-xs text-gray-400">{t('color_audio_studio.luts_title')}</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['none', 'cancun', 'vintage', 'noir', 'cyberpunk', 'corporate'] as const).map(lut => (
                                            <button key={lut} onClick={() => handleLutChange(lut)} className={`p-2 text-xs rounded-md capitalize ${selectedClip.color?.lut === lut || (lut === 'none' && !selectedClip.color?.lut) ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'}`}>{t(lut === 'none' ? 'vfx_hub.animation_none' : `color_audio_studio.lut_${lut}`)}</button>
                                        ))}
                                    </div>
                                     <p className="text-xs text-gray-400 pt-2 border-t border-gray-700">{t('color_audio_studio.fine_tuning_title')}</p>
                                    <div className="space-y-2">
                                        {(['exposure', 'contrast', 'saturation', 'temperature'] as const).map(adj => (
                                            <div key={adj} className="grid grid-cols-3 items-center text-sm">
                                                <label className="text-gray-300 capitalize">{t(`color_audio_studio.${adj}`)}</label>
                                                <input type="range" min="-100" max="100" value={selectedClip.color?.adjustments?.[adj] || 0} onChange={e => handleAdjustmentChange(adj, parseInt(e.target.value))} className="col-span-2"/>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : rightPanelTab === 'polish' && selectedClip && voiceoverTrack?.clips.some(c => c.id === selectedClip.id) ? (
                            <div className="space-y-4">
                                <div className="bg-gray-900/50 p-3 rounded-lg space-y-3">
                                     <h4 className="font-semibold text-white flex items-center gap-2"><SpeakerWaveIcon className="w-5 h-5"/>{t('color_audio_studio.audio_mastering_title')}</h4>
                                     <button onClick={handleAudioEnhance} disabled={isLoading['audioEnhance']} className="w-full text-left p-3 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:bg-gray-600">
                                         <span className="font-semibold">{t('color_audio_studio.auto_enhance_label')}</span>
                                         <span className="block text-xs opacity-80">{t('color_audio_studio.auto_enhance_desc')}</span>
                                     </button>
                                     <div>
                                        <label className="text-sm font-semibold">{t('color_audio_studio.voice_changer_title')}</label>
                                        <select onChange={e => handleVoicePresetChange(e.target.value)} value={selectedClip.audio?.voicePreset || 'none'} className="w-full mt-1 bg-gray-700 text-sm p-2 rounded-md">
                                            {(['none', 'podcast', 'cinematic', 'radio', 'robot'] as const).map(p => <option key={p} value={p}>{t(`color_audio_studio.voice_preset_${p}`)}</option>)}
                                        </select>
                                     </div>
                                     <div>
                                        <label className="text-sm font-semibold">{t('color_audio_studio.narrator_title')}</label>
                                        <select value={project.voiceoverVoiceId || ''} onChange={e => handleUpdateProject({ id: project.id, voiceoverVoiceId: e.target.value })} className="w-full mt-1 bg-gray-700 text-sm p-2 rounded-md">
                                            <optgroup label={t('color_audio_studio.your_voices')}>
                                                {user?.cloned_voices.map(v => <option key={v.id} value={v.id} disabled={v.status !== 'ready'}>{v.name} ({v.status})</option>)}
                                            </optgroup>
                                            <optgroup label={t('color_audio_studio.standard_voices')}>
                                                {ELEVENLABS_VOICES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                            </optgroup>
                                        </select>
                                     </div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </aside>
            </div>
            {/* Bottom Panel: Timeline */}
            <footer className="flex-shrink-0 p-4 bg-gray-900/70 border-t-2 border-gray-700">
                <Timeline timeline={timeline} onUpdate={handleTimelineUpdate} currentTime={currentTime} onSeek={handleSeek} onClipSelect={(id) => { setSelectedClipId(id); setSelectedSubtitleId(null); }} selectedClipId={selectedClipId} />
                <div className="mt-1">
                    <SubtitleTrack timeline={timeline} onUpdate={(updates) => handleTimelineUpdate({...timeline, ...updates})} duration={timeline.totalDuration} currentTime={currentTime} onSelectSubtitle={(id) => { setSelectedSubtitleId(id); setSelectedClipId(null); }} selectedSubtitleId={selectedSubtitleId} />
                </div>
            </footer>
             <div className="text-center pt-8">
                <button onClick={handleAssembleVideo} className="w-full max-w-sm inline-flex items-center justify-center px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg">
                    <RocketLaunchIcon className="w-6 h-6 mr-3" />
                    {t('final_edit.render_preview_button')}
                </button>
            </div>
            <AssetPickerModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                project={project}
                scene={project.script.scenes[activeSceneIndex]}
                onAssetAdd={handleAssetAdd}
            />
        </div>
    );
};

const FinalEditStep: React.FC<{ project: Project; onProceed: () => void; }> = ({ project, onProceed }) => {
    const { addToast, handleUpdateProject, t } = useAppContext();
    const getInitialView = () => project.analysis ? 'analysis' : 'editor';
    const [view, setView] = useState<'editor' | 'loading' | 'analysis'>(getInitialView());
    const [analysisResult, setAnalysisResult] = useState<Analysis | null>(project.analysis);
    const [videoPreview, setVideoPreview] = useState<{ url: string; frames: string[] } | null>(project.publishedUrl ? { url: project.publishedUrl, frames: project.moodboard || [] } : null);
    
    const handleAnalysisTriggered = async (previewUrl: string, frames: string[]) => {
        if (!project.title) {
            addToast("Project title not found, cannot perform analysis.", "error"); return;
        }
        setVideoPreview({ url: previewUrl, frames });
        setView('loading');
        try {
            const result = await geminiService.analyzeVideo(frames, project.title, project.platform);
            setAnalysisResult(result);
            await handleUpdateProject({ id: project.id, analysis: result });
            setView('analysis');
        } catch (e) {
            addToast(`Analysis failed: ${getErrorMessage(e)}`, 'error');
            setView('editor');
        }
    };

    const handleReset = () => {
        setView('editor');
        setAnalysisResult(null);
        setVideoPreview(null);
        handleUpdateProject({ id: project.id, analysis: null, publishedUrl: null });
    };

    switch (view) {
        case 'loading':
            return <div className="min-h-[60vh] flex items-center justify-center"><AnalysisLoader frames={videoPreview?.frames || []} /></div>;
        case 'analysis':
            if (analysisResult && videoPreview) {
                return <AnalysisResult result={analysisResult} onReset={handleReset} videoPreviewUrl={videoPreview.url} onProceedToLaunchpad={onProceed} />;
            }
            setView('editor'); return null;
        case 'editor':
        default:
            return <EditorView project={project} onAnalysisTriggered={handleAnalysisTriggered} />;
    }
};

export default FinalEditStep;