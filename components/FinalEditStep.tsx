import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Project, Analysis, TimelineState, TimelineClip, Subtitle, TimelineTrack } from '../types.ts';
import * as geminiService from '../services/geminiService.ts';
import { generateVoiceover, generateRunwayVideoClip } from '../services/generativeMediaService.ts';
import { uploadFile } from '../services/supabaseService.ts';
import { useAppContext } from '../contexts/AppContext.tsx';
import { getErrorMessage } from '../utils.ts';
import LivePreviewPlayer from './LivePreviewPlayer.tsx';
import Timeline from './Timeline.tsx';
import GuideOverlays from './GuideOverlays.tsx';
import HelpModal from './HelpModal.tsx';
import { PlayIcon, PauseIcon, ViewfinderCircleIcon, ScissorsIcon, RocketLaunchIcon, MagicWandIcon, SparklesIcon, UndoIcon, RedoIcon } from './Icons.tsx';
import AssetAndInspectorPanel from './AssetAndInspectorPanel.tsx';
import AssetPickerModal from './AssetPickerModal.tsx';
import GuidedTour from './GuidedTour.tsx';
import { v4 as uuidv4 } from 'uuid';
import ViralityGauge from './ViralityGauge.tsx';

// Helper to initialize timeline state from script
const initializeTimelineFromScript = (script: Project['script']): TimelineState => {
    if (!script) return { tracks: [], subtitles: [], voiceoverVolume: 1, musicVolume: 0.5, isDuckingEnabled: true, totalDuration: 0 };
    let currentTime = 0;
    const voiceoverClips: TimelineClip[] = [];
    const aRollClips: TimelineClip[] = [];

    script.scenes.forEach((scene, index) => {
        const wordCount = scene.voiceover.split(/\s+/).filter(Boolean).length;
        const estimatedDuration = Math.max(3, wordCount / 2.5); // Min 3s, avg 2.5 words/sec

        voiceoverClips.push({ id: `vo_${index}`, type: 'audio', url: '', sceneIndex: index, startTime: currentTime, endTime: currentTime + estimatedDuration, sourceDuration: estimatedDuration, opacity: 1, volume: 1 });
        aRollClips.push({ id: `ar_${index}`, type: 'image', url: '', sceneIndex: index, startTime: currentTime, endTime: currentTime + estimatedDuration, sourceDuration: estimatedDuration, opacity: 1, volume: 1, effects: {}, aiEffects: {}, animation: {}, color: { adjustments: { exposure: 0, contrast: 0, saturation: 0, temperature: 0 }} });
        currentTime += estimatedDuration;
    });

    return {
        tracks: [
            { id: 'overlay', type: 'overlay', clips: [] },
            { id: 'text', type: 'text', clips: [] },
            { id: 'b-roll', type: 'b-roll', clips: [] },
            { id: 'a-roll', type: 'a-roll', clips: aRollClips },
            { id: 'voiceover', type: 'voiceover', clips: voiceoverClips },
            { id: 'music', type: 'music', clips: [] },
            { id: 'sfx', type: 'sfx', clips: [] },
        ],
        subtitles: [],
        voiceoverVolume: 1,
        musicVolume: 0.5,
        isDuckingEnabled: true,
        totalDuration: currentTime,
    };
};

const calculateViralityScore = (timeline: TimelineState): number => {
    let score = 50; // Base score
    const bRollClips = timeline.tracks.find(t => t.id === 'b-roll')?.clips.length || 0;
    const sfxClips = timeline.tracks.find(t => t.id === 'sfx')?.clips.length || 0;
    const musicClips = timeline.tracks.find(t => t.id === 'music')?.clips.length || 0;
    const subtitles = timeline.subtitles.length > 0;
    const cuts = timeline.tracks.find(t => t.id === 'a-roll')?.clips.length || 1;
    const pacing = timeline.totalDuration / cuts;

    if (pacing < 5) score += 15; // Good, fast pacing
    if (bRollClips > cuts * 0.5) score += 15; // Healthy amount of b-roll
    if (musicClips > 0) score += 10;
    if (sfxClips > 3) score += 5;
    if (subtitles) score += 5;

    return Math.min(99, Math.max(10, score)); // Clamp score
}


const FinalEditStep: React.FC<{ 
    project: Project; 
    onProceedToNextStage: () => void; 
}> = ({ project, onProceedToNextStage }) => {
    const { user, t, handleUpdateProject, addToast, consumeCredits, invokeEdgeFunction, lockAndExecute } = useAppContext();
    
    const [history, setHistory] = useState<TimelineState[]>([project.timeline || initializeTimelineFromScript(project.script)]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const timeline = history[historyIndex];

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [viralityScore, setViralityScore] = useState(0);
    
    const [isAssetPickerOpen, setIsAssetPickerOpen] = useState(false);
    const [assetPickerContext, setAssetPickerContext] = useState<{ trackId: string; sceneIndex: number; startTime: number; } | null>(null);
    const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
    const [selectedSubtitleId, setSelectedSubtitleId] = useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = useState<'16/9' | '9/16' | '1/1'>(project.platform === 'youtube_long' ? '16/9' : '9/16');
    const [showGuides, setShowGuides] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [isPolishing, setIsPolishing] = useState(false);

    useEffect(() => {
      setViralityScore(calculateViralityScore(timeline));
    }, [timeline]);

    const updateTimeline = useCallback((newTimeline: TimelineState, debounceSave: boolean = false) => {
        const newHistory = history.slice(0, historyIndex + 1);
        setHistory([...newHistory, newTimeline]);
        setHistoryIndex(newHistory.length);
        if (!debounceSave) {
          handleUpdateProject({ id: project.id, timeline: newTimeline });
        }
    }, [project.id, handleUpdateProject, history, historyIndex]);
    
    const handleUndo = () => { if (historyIndex > 0) setHistoryIndex(historyIndex - 1); };
    const handleRedo = () => { if (historyIndex < history.length - 1) setHistoryIndex(historyIndex + 1); };

    const activeSceneIndex = useMemo(() => {
        return timeline.tracks.find(t => t.type === 'a-roll')?.clips.find(c => currentTime >= c.startTime && currentTime < c.endTime)?.sceneIndex ?? 0;
    }, [currentTime, timeline.tracks]);

    const handleAddAssetToTimeline = useCallback((url: string, type: 'video' | 'image' | 'audio' | 'text', targetTrack: string, options: { sceneIndex?: number; startTime?: number; duration?: number } = {}) => {
        const newTimeline = JSON.parse(JSON.stringify(timeline));
        const track = newTimeline.tracks.find((t: any) => t.id === targetTrack);
        if (!track) return;
        
        let newClip: TimelineClip;

        if (targetTrack === 'music' || targetTrack === 'sfx') {
            const isMusic = targetTrack === 'music';
            const duration = options.duration || (isMusic ? timeline.totalDuration : 2);
            const startTime = isMusic ? 0 : options.startTime ?? currentTime;

            newClip = { id: uuidv4(), type: 'audio', url, sceneIndex: -1, startTime, endTime: startTime + duration, sourceDuration: duration, opacity: 1, volume: 1, effects: {}, aiEffects: {}, animation: {} };
            if (isMusic) track.clips = [newClip];
            else track.clips.push(newClip);
        } else if (targetTrack === 'text') {
             newClip = { id: uuidv4(), type: 'text', url: '', text: 'Your Text Here', sceneIndex: -1, startTime: currentTime, endTime: currentTime + 5, sourceDuration: 5, opacity: 1, volume: 0, positioning: { width: 80, height: 20, x: 50, y: 50, zIndex: 20, rotation: 0, scale: 1 }, style: { fontFamily: 'Inter, sans-serif', fontSize: 48, fontWeight: 800, letterSpacing: -1, lineHeight: 1.2, fill: { type: 'color', color: '#FFFFFF' }, outline: { color: '#000000', width: 4 }, backgroundColor: 'rgba(0,0,0,0)' } };
             track.clips.push(newClip);
        } else { // Visual Tracks
            const sceneIndex = options.sceneIndex ?? -1;
            const aRollClip = timeline.tracks.find(t => t.id === 'a-roll')?.clips[sceneIndex];
            const startTime = aRollClip?.startTime ?? options.startTime ?? currentTime;
            const duration = aRollClip ? (aRollClip.endTime - aRollClip.startTime) : options.duration ?? 5;

            newClip = { id: uuidv4(), type: type as 'video' | 'image', url, sceneIndex, startTime, endTime: startTime + duration, sourceDuration: duration, opacity: 1, volume: 1, positioning: { width: 100, height: 100, x: 50, y: 50, zIndex: targetTrack === 'b-roll' ? 5 : 1, rotation: 0, scale: 1 }, effects: {}, aiEffects: {}, animation: {}, color: { adjustments: { exposure: 0, contrast: 0, saturation: 0, temperature: 0 } } };
            
            if (targetTrack === 'a-roll' && sceneIndex > -1) track.clips[sceneIndex] = newClip;
            else track.clips.push(newClip);
        }
        
        updateTimeline(newTimeline);
        addToast("Asset added to timeline!", "success");
    }, [timeline, addToast, currentTime, updateTimeline]);

    const handleUpdateClip = useCallback((clipId: string, updates: Partial<TimelineClip>) => {
        const newTimeline = JSON.parse(JSON.stringify(timeline));
        let clipFound = false;
        for (const track of newTimeline.tracks as TimelineTrack[]) {
            const clipIndex = track.clips.findIndex((c: TimelineClip) => c.id === clipId);
            if (clipIndex !== -1) {
                const originalClip = track.clips[clipIndex];
                const updatedClip = { ...originalClip, ...updates };

                if (updates.positioning) updatedClip.positioning = { ...(originalClip.positioning as any), ...updates.positioning };
                if (updates.animation) updatedClip.animation = { ...originalClip.animation, ...updates.animation };
                if (updates.aiEffects) updatedClip.aiEffects = { ...originalClip.aiEffects, ...updates.aiEffects };
                if (updates.effects) updatedClip.effects = { ...originalClip.effects, ...updates.effects };
                if (updates.color) updatedClip.color = { ...(originalClip.color as any), ...updates.color };
                if (updates.audio) updatedClip.audio = { ...originalClip.audio, ...updates.audio };
                if (updates.keyframes) updatedClip.keyframes = { ...originalClip.keyframes, ...updates.keyframes };
                
                track.clips[clipIndex] = updatedClip;
                clipFound = true;
                break;
            }
        }
        if (clipFound) updateTimeline(newTimeline, true);
    }, [timeline, updateTimeline]);
    
     const handleUpdateSubtitle = useCallback((subtitleId: string, updates: Partial<Subtitle>) => {
        const newTimeline = JSON.parse(JSON.stringify(timeline));
        const subIndex = newTimeline.subtitles.findIndex((s: Subtitle) => s.id === subtitleId);
        if (subIndex > -1) newTimeline.subtitles[subIndex] = { ...newTimeline.subtitles[subIndex], ...updates };
        updateTimeline(newTimeline, true);
    }, [timeline, updateTimeline]);

    const handleSplitClip = () => {
        const clipToSplitId = selectedClipId || timeline.tracks.flatMap(t => t.clips).find(c => currentTime > c.startTime && currentTime < c.endTime)?.id;
        if (!clipToSplitId) return addToast("Select a clip or move playhead over a clip to split.", "info");
        
        const newTimeline = JSON.parse(JSON.stringify(timeline));
        let splitDone = false;
        for (const track of newTimeline.tracks) {
            const clipIndex = track.clips.findIndex((c: TimelineClip) => c.id === clipToSplitId);
            if (clipIndex > -1) {
                const clip = track.clips[clipIndex];
                if (currentTime > clip.startTime && currentTime < clip.endTime) {
                    const originalEndTime = clip.endTime;
                    clip.endTime = currentTime;
                    
                    const newClip: TimelineClip = { ...clip, id: uuidv4(), startTime: currentTime, endTime: originalEndTime };
                    track.clips.splice(clipIndex + 1, 0, newClip);
                    splitDone = true;
                    break;
                }
            }
        }
        if(splitDone) updateTimeline(newTimeline);
        else addToast("Playhead must be inside the clip to split.", "error");
    };
    
    const handleSelect = (id: string | null, type: 'clip' | 'subtitle') => {
        if (type === 'clip') { setSelectedClipId(id); setSelectedSubtitleId(null); } 
        else { setSelectedSubtitleId(id); setSelectedClipId(null); }
    };

    const handleAiPolish = () => lockAndExecute(async () => {
        if (!project.script) return;
        if (!await consumeCredits(5)) return;
        setIsPolishing(true);
        addToast("AI is polishing your video... This may take a moment.", "info");
        try {
            const { timeline: polishedTimeline } = await invokeEdgeFunction<{ timeline: TimelineState }>('ai-polish', { timeline, script: project.script, projectId: project.id });
            updateTimeline(polishedTimeline);
            addToast("AI Polish complete! SFX and motion added.", "success");
        } catch (e) { addToast(`AI Polish failed: ${getErrorMessage(e)}`, "error"); } 
        finally { setIsPolishing(false); }
    });

    const handleGenerateFullVoiceover = () => lockAndExecute(async () => {
        if (!project.script || !project.voiceoverVoiceId || !user) return addToast("Project script or voice is not set.", "error");
        if (!await consumeCredits(project.script.scenes.length)) return;
        addToast(`Starting voiceover generation... This may take a moment.`, 'info');
        
        const newTimeline = JSON.parse(JSON.stringify(timeline));
        const voiceoverTrack = newTimeline.tracks.find((t: TimelineTrack) => t.id === 'voiceover');
        if (!voiceoverTrack) return;
        
        for (const [index, scene] of project.script.scenes.entries()) {
             try {
                addToast(`Generating voiceover for scene ${index + 1}...`, 'info');
                const audioBlob = await generateVoiceover(scene.voiceover, project.voiceoverVoiceId!);
                const path = `${user.id}/${project.id}/voiceovers/scene_${index}.mp3`;
                const audioUrl = await uploadFile(audioBlob, path);
                const clipIndex = voiceoverTrack.clips.findIndex((c: TimelineClip) => c.sceneIndex === index);
                if (clipIndex > -1) voiceoverTrack.clips[clipIndex].url = audioUrl;
            } catch (e) { addToast(`Failed to generate voiceover for scene ${index + 1}: ${getErrorMessage(e)}`, 'error'); }
        }
        updateTimeline(newTimeline);
        addToast("Voiceover generation complete!", "success");
    });
    
    const handleGenerateAiBroll = (sceneIndex: number) => lockAndExecute(async () => {
        if (!project.script || !user) return;
        const sceneText = project.script.scenes[sceneIndex]?.visual;
        if (!sceneText) return addToast("No visual description for this scene.", "error");
        if (!await consumeCredits(1)) return;
        addToast("AI is deciding on the best B-Roll...", "info");
        try {
            const suggestion = await geminiService.getAiBrollSuggestion(sceneText);
            let assetUrl: string, assetType: 'video' | 'image' = 'video';

            if (suggestion.type === 'stock' && suggestion.query) {
                addToast(`Searching stock media for: "${suggestion.query}"`, 'info');
                const stockResults = await geminiService.searchStockMedia(suggestion.query, 'videos');
                const firstResult = stockResults[0];
                if (!firstResult) throw new Error("No stock video found.");
                assetUrl = firstResult.downloadUrl;
                assetType = firstResult.type as 'video' | 'image';
            } else if (suggestion.type === 'ai_video' && suggestion.prompt) {
                 if (!await consumeCredits(10)) return;
                 addToast(`Generating AI video for: "${suggestion.prompt}"`, 'info');
                 const videoBlob = await generateRunwayVideoClip(suggestion.prompt, project.platform);
                 const path = `${user.id}/${project.id}/ai_broll/scene_${sceneIndex}.mp4`;
                 assetUrl = await uploadFile(videoBlob, path);
            } else throw new Error("AI returned an invalid suggestion.");
            
            const aRollClip = timeline.tracks.find(t => t.id === 'a-roll')?.clips[sceneIndex];
            if (!aRollClip) throw new Error("Could not find corresponding A-roll clip.");
            handleAddAssetToTimeline(assetUrl, assetType, 'b-roll', { sceneIndex, startTime: aRollClip.startTime, duration: aRollClip.endTime - aRollClip.startTime });
        } catch (e) { addToast(`AI B-Roll failed: ${getErrorMessage(e)}`, 'error'); }
    });

    const handleProceedToAnalysis = async () => {
        await handleUpdateProject({id: project.id, status: 'Rendering'});
        onProceedToNextStage();
    };

    const openAssetPicker = (trackId: string, sceneIndex: number, startTime: number) => {
        setAssetPickerContext({ trackId, sceneIndex, startTime });
        setIsAssetPickerOpen(true);
    };

    if (!project.script) {
        return <div className="text-center py-16 px-6 bg-gray-800/50 rounded-2xl"><h2 className="text-2xl font-bold text-white mb-3">{t('asset_studio.script_required_title')}</h2><p className="text-gray-400 mb-6 max-w-md mx-auto">{t('asset_studio.script_required_subtitle')}</p></div>
    }

    return (
        <div className="flex flex-col h-[85vh] bg-gray-900 rounded-2xl border border-gray-700 animate-fade-in-up" data-tour="editor-main">
            <GuidedTour />
            <div className="flex-1 flex min-h-0 relative">
                <main className="h-full flex flex-col w-full pr-96">
                    <div className="flex-1 flex flex-col items-center justify-center p-4 bg-black relative" data-tour="video-preview">
                         <LivePreviewPlayer timeline={timeline} isPlaying={isPlaying} currentTime={currentTime} onTimeUpdate={setCurrentTime} onEnded={() => setIsPlaying(false)} aspectRatio={aspectRatio} selectedClipId={selectedClipId} onClipUpdate={handleUpdateClip}>
                           {showGuides && <GuideOverlays aspectRatio={aspectRatio} />}
                        </LivePreviewPlayer>
                    </div>
                </main>

                 <AssetAndInspectorPanel project={project} selectedClipId={selectedClipId} selectedSubtitleId={selectedSubtitleId} onClipUpdate={handleUpdateClip} onSubtitleUpdate={handleUpdateSubtitle} currentTime={currentTime} />
            </div>
            
            <footer className="flex-shrink-0 p-2 bg-gray-900/70 border-t-2 border-gray-700">
                <div className="flex justify-between items-center px-2 mb-2">
                    <div className="flex items-center gap-2">
                        <button onClick={handleUndo} disabled={historyIndex === 0} className="p-2 text-gray-300 hover:text-white disabled:opacity-50"><UndoIcon className="w-5 h-5"/></button>
                        <button onClick={handleRedo} disabled={historyIndex === history.length - 1} className="p-2 text-gray-300 hover:text-white disabled:opacity-50"><RedoIcon className="w-5 h-5"/></button>
                        <ViralityGauge score={viralityScore} size="sm" />
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsPlaying(!isPlaying)} className="p-3 bg-gray-700 rounded-full text-white hover:bg-indigo-600">{isPlaying ? <PauseIcon className="w-5 h-5"/> : <PlayIcon className="w-5 h-5"/>}</button>
                        <button onClick={handleSplitClip} className="p-3 bg-gray-700 rounded-full text-white hover:bg-indigo-600" title="Split Clip"><ScissorsIcon className="w-5 h-5"/></button>
                        <button onClick={handleAiPolish} disabled={isPolishing} className="p-3 bg-gray-700 rounded-full text-white hover:bg-indigo-600 disabled:opacity-50" title="AI Polish (5 Cr)"><MagicWandIcon className={`w-5 h-5 ${isPolishing ? 'animate-pulse' : ''}`}/></button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleAddAssetToTimeline('', 'text', 'text')} className="p-2 text-gray-300 hover:bg-gray-700 rounded-md">Add Text</button>
                        <button onClick={() => setShowGuides(!showGuides)} className={`p-2 rounded-md ${showGuides ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`} title={t('layout_toolkit.guides_zones')}><ViewfinderCircleIcon className="w-5 h-5"/></button>
                        <button onClick={() => setIsHelpOpen(true)} className="p-2 text-gray-300 hover:bg-gray-700 rounded-md">Help</button>
                    </div>
                </div>
                <div data-tour="timeline">
                    <Timeline timeline={timeline} onUpdate={updateTimeline} currentTime={currentTime} onSeek={setCurrentTime} onClipSelect={(id) => handleSelect(id, 'clip')} onSubtitleSelect={(id) => handleSelect(id, 'subtitle')} selectedClipId={selectedClipId} selectedSubtitleId={selectedSubtitleId} onAddMediaClick={openAssetPicker} onGenerateVoiceover={handleGenerateFullVoiceover} onGenerateAiBroll={handleGenerateAiBroll} activeSceneIndex={activeSceneIndex} />
                </div>
                 <div className="text-center pt-4">
                    <button onClick={handleProceedToAnalysis} className="w-full max-w-sm inline-flex items-center justify-center px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg">
                        <RocketLaunchIcon className="w-6 h-6 mr-3" />
                        {t('final_edit.assemble_and_analyze_button')}
                    </button>
                </div>
            </footer>

            <AssetPickerModal isOpen={isAssetPickerOpen} onClose={() => setIsAssetPickerOpen(false)} onAddAsset={handleAddAssetToTimeline} context={assetPickerContext} project={project} />
            <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
        </div>
    );
};

export default FinalEditStep;