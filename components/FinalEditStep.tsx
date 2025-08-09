import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Project, TimelineState, TimelineClip, Subtitle } from '../types.ts';
import { useAppContext } from '../contexts/AppContext.tsx';
import { getErrorMessage } from '../utils.ts';
import LivePreviewPlayer from './LivePreviewPlayer.tsx';
import Timeline from './Timeline.tsx';
import GuideOverlays from './GuideOverlays.tsx';
import { PlayIcon, PauseIcon, ViewfinderCircleIcon, ScissorsIcon, RocketLaunchIcon, UndoIcon, RedoIcon } from './Icons.tsx';
import InspectorPanel from './InspectorPanel.tsx';
import GuidedTour from './GuidedTour.tsx';
import { v4 as uuidv4 } from 'uuid';
import ViralityGauge from './ViralityGauge.tsx';
import MediaPanel from './MediaPanel.tsx';
import { generateVoiceover, generateRunwayVideoClip } from '../services/generativeMediaService.ts';
import { getAiBrollSuggestion, searchStockMedia } from '../services/geminiService.ts';
import { uploadFile } from '../services/supabaseService.ts';

const calculateViralityScore = (timeline: TimelineState | null): number => {
    if (!timeline) return 0;
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
    const { 
      user, t, addToast, consumeCredits, invokeEdgeFunction, lockAndExecute,
      activeTimeline: timeline, updateActiveTimeline, commitTimelineChange, 
      undo, redo, canUndo, canRedo
    } = useAppContext();
    
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [viralityScore, setViralityScore] = useState(0);
    
    const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
    const [selectedSubtitleId, setSelectedSubtitleId] = useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = useState<'16/9' | '9/16' | '1/1'>(project.videoSize === '16:9' ? '16/9' : project.videoSize === '9:16' ? '9/16' : '1/1');
    const [showGuides, setShowGuides] = useState(false);
    
    const [activeMediaTarget, setActiveMediaTarget] = useState<{trackId: string; sceneIndex: number; startTime: number} | null>(null);

     useEffect(() => {
      setViralityScore(calculateViralityScore(timeline));
    }, [timeline]);
    
    const handleSplitClip = useCallback(() => {
        if (!timeline) return;
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
        if(splitDone) commitTimelineChange(newTimeline);
        else addToast("Playhead must be inside the clip to split.", "error");
    }, [selectedClipId, timeline, currentTime, commitTimelineChange, addToast]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
            if (!timeline) return;

            if (e.key === ' ') { e.preventDefault(); setIsPlaying(p => !p); }
            if (e.key.toLowerCase() === 's') { e.preventDefault(); handleSplitClip(); }
            if (e.key === 'ArrowLeft') { e.preventDefault(); setCurrentTime(t => Math.max(0, t - 0.1)); }
            if (e.key === 'ArrowRight') { e.preventDefault(); setCurrentTime(t => Math.min(timeline.totalDuration, t + 0.1)); }
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [timeline, undo, redo, handleSplitClip]);


    const activeSceneIndex = useMemo(() => {
        if (!timeline) return 0;
        return timeline.tracks.find(t => t.type === 'a-roll')?.clips.find(c => currentTime >= c.startTime && currentTime < c.endTime)?.sceneIndex ?? 0;
    }, [currentTime, timeline]);
    
    const handleUpdateClip = useCallback((clipId: string, updates: Partial<TimelineClip>) => {
        if (!timeline) return;
        const newTimeline = JSON.parse(JSON.stringify(timeline));
        let clipFound = false;
        for (const track of newTimeline.tracks) {
            const clipIndex = track.clips.findIndex((c: TimelineClip) => c.id === clipId);
            if (clipIndex !== -1) {
                const originalClip = track.clips[clipIndex];
                track.clips[clipIndex] = { ...originalClip, ...updates };
                clipFound = true;
                break;
            }
        }
        if (clipFound) updateActiveTimeline(newTimeline, false);
    }, [timeline, updateActiveTimeline]);
    
     const handleUpdateSubtitle = useCallback((subtitleId: string, updates: Partial<Subtitle>) => {
        if (!timeline) return;
        const newTimeline = JSON.parse(JSON.stringify(timeline));
        const subIndex = newTimeline.subtitles.findIndex((s: Subtitle) => s.id === subtitleId);
        if (subIndex > -1) newTimeline.subtitles[subIndex] = { ...newTimeline.subtitles[subIndex], ...updates };
        updateActiveTimeline(newTimeline, false);
    }, [timeline, updateActiveTimeline]);
    
    const handleAssetSelected = (url: string, type: 'video' | 'image' | 'audio', duration?: number, sourceData?: any) => {
        if (!timeline) return;
        let target = activeMediaTarget;
        const newTimeline = JSON.parse(JSON.stringify(timeline));
        let newClip: TimelineClip;

        if (!target) {
            const defaultTrackId = type === 'audio' ? 'music' : sourceData.provider === 'giphy' ? 'overlay' : 'b-roll';
            const track = newTimeline.tracks.find((t: any) => t.id === defaultTrackId);
            if (track) {
                 const clipDuration = duration || (defaultTrackId === 'music' ? newTimeline.totalDuration : 5);
                 const startTime = defaultTrackId === 'music' ? 0 : currentTime;
                 newClip = { rev:1, id: uuidv4(), type: type as any, url, sceneIndex: -1, startTime, endTime: startTime + clipDuration, sourceDuration: clipDuration, opacity: 1, volume: type === 'audio' ? 1 : 0, positioning: { width: 50, height: 50, x: 50, y: 50, zIndex: 10, rotation: 0, scale: 1 }, keyframes: {} } as TimelineClip;
                 track.clips.push(newClip);
            }
        } else {
             const track = newTimeline.tracks.find((t: any) => t.id === target.trackId);
             if (!track) return addToast("Target track not found.", "error");

             const { trackId, sceneIndex, startTime: targetStartTime } = target;
             if (trackId === 'music' || trackId === 'sfx') {
                const isMusic = trackId === 'music';
                const clipDuration = duration || (isMusic ? newTimeline.totalDuration : 2);
                const startTime = isMusic ? 0 : targetStartTime;
                newClip = { rev: 1, id: uuidv4(), type: 'audio', url, sceneIndex: -1, startTime, endTime: startTime + clipDuration, sourceDuration: clipDuration, opacity: 1, volume: 1, keyframes: {} } as TimelineClip;
                if (isMusic) track.clips = [newClip]; else track.clips.push(newClip);
            } else { // Visual Tracks
                const aRollClip = newTimeline.tracks.find((t: any) => t.id === 'a-roll')?.clips.find((c: any) => c.sceneIndex === sceneIndex);
                const startTime = aRollClip?.startTime ?? targetStartTime;
                const clipDuration = aRollClip ? (aRollClip.endTime - aRollClip.startTime) : duration ?? 5;
                newClip = { rev:1, id: uuidv4(), type: type as 'video' | 'image', url, sceneIndex, startTime, endTime: startTime + clipDuration, sourceDuration: clipDuration, opacity: 1, volume: 0, positioning: { width: 100, height: 100, x: 50, y: 50, zIndex: trackId === 'b-roll' ? 5 : 1, rotation: 0, scale: 1 }, effects: {}, aiEffects: {}, animation: {}, color: { adjustments: { exposure: 0, contrast: 0, saturation: 0, temperature: 0 } }, keyframes: {} } as TimelineClip;
                
                if (trackId === 'a-roll' && sceneIndex > -1) {
                    const clipIndex = track.clips.findIndex((c:any) => c.sceneIndex === sceneIndex);
                    if (clipIndex > -1) {
                       newClip.startTime = track.clips[clipIndex].startTime; newClip.endTime = track.clips[clipIndex].endTime; newClip.id = track.clips[clipIndex].id;
                       track.clips[clipIndex] = { ...track.clips[clipIndex], ...newClip };
                    }
                } else track.clips.push(newClip);
            }
        }
        
        commitTimelineChange(newTimeline);
        addToast("Asset added to timeline!", "success");
        setActiveMediaTarget(null);
    };

    const handleClipCommit = (clipId: string, updates: Partial<TimelineClip>) => {
        if (!timeline) return;
        const newTimeline = JSON.parse(JSON.stringify(timeline));
        for (const track of newTimeline.tracks) {
            const clipIndex = track.clips.findIndex((c: TimelineClip) => c.id === clipId);
            if (clipIndex !== -1) {
                track.clips[clipIndex] = { ...track.clips[clipIndex], ...updates };
                commitTimelineChange(newTimeline);
                return;
            }
        }
    };
    
    const handleSelect = (id: string | null, type: 'clip' | 'subtitle') => {
        if (type === 'clip') { setSelectedClipId(id); setSelectedSubtitleId(null); } 
        else { setSelectedSubtitleId(id); setSelectedClipId(null); }
    };

    const handleProceedToAnalysis = () => lockAndExecute(async () => {
        addToast("Sending video to the render queue...", "info");
        try {
            await invokeEdgeFunction('video-stitcher', { projectId: project.id, timeline: timeline });
            onProceedToNextStage();
        } catch (e) { addToast(`Failed to start render job: ${getErrorMessage(e)}`, 'error'); }
    });
    
    const onGenerateAllVoiceovers = () => lockAndExecute(async () => {
        if (!project.script || !timeline) return;

        const voiceoverTrackIndex = timeline.tracks.findIndex(t => t.id === 'voiceover');
        if (voiceoverTrackIndex === -1) {
            addToast("No voiceover track found.", "error");
            return;
        }

        const newTimeline = JSON.parse(JSON.stringify(timeline));
        const voiceoverTrack = newTimeline.tracks[voiceoverTrackIndex];
        const clipsToGenerate = voiceoverTrack.clips.filter((c: TimelineClip) => !c.url);
        const creditsToConsume = clipsToGenerate.length;

        if (creditsToConsume === 0) {
            addToast("All voiceovers are already generated.", "info");
            return;
        }

        if (!(await consumeCredits(creditsToConsume))) {
            return;
        }
        
        addToast(`Generating ${creditsToConsume} voiceovers... this may take a moment.`, "info");

        const generationPromises = project.script.scenes
            .filter((scene, index) => clipsToGenerate.some((c: TimelineClip) => c.sceneIndex === index))
            .map(scene => {
                const clip = clipsToGenerate.find((c: TimelineClip) => c.sceneIndex === scene.sceneIndex);
                if (!clip) return Promise.resolve({ index: -1, url: null });
                return generateVoiceover(scene.voiceover, project.voiceoverVoiceId || undefined)
                    .then(blob => uploadFile(blob, `${user!.id}/${project.id}/voiceovers/vo_scene_${clip.sceneIndex}.mp3`))
                    .then(url => ({ index: clip.sceneIndex, url }))
                    .catch(err => {
                        console.error(`Failed to generate voiceover for scene ${clip.sceneIndex + 1}:`, err);
                        addToast(`Voiceover for scene ${clip.sceneIndex + 1} failed.`, 'error');
                        return { index: clip.sceneIndex, url: null };
                    });
            });

        const results = await Promise.all(generationPromises);

        results.forEach(({ index, url }) => {
            if (url !== null && index !== -1) {
                const clipIndex = voiceoverTrack.clips.findIndex((c: TimelineClip) => c.sceneIndex === index);
                if (clipIndex !== -1) {
                    voiceoverTrack.clips[clipIndex].url = url;
                }
            }
        });

        commitTimelineChange(newTimeline);
        addToast("Voiceover generation complete.", "success");
    });
    
    const handleGenerateAiBroll = (sceneIndex: number) => lockAndExecute(async () => {
        if (!project.script || !timeline) return;
        const scene = project.script.scenes[sceneIndex];
        if (!scene) return;

        addToast(`Generating B-Roll for Scene ${sceneIndex + 1}...`, "info");
        try {
            const suggestion = await getAiBrollSuggestion(scene.visual);
            let assetUrl: string | null = null;
            let duration: number | undefined = undefined;

            if (suggestion.type === 'stock' && suggestion.query) {
                if (!(await consumeCredits(1))) return;
                const results = await searchStockMedia(suggestion.query, 'videos');
                if (results.length > 0) {
                    assetUrl = results[0].downloadUrl;
                    duration = results[0].duration;
                } else {
                    addToast(`No stock footage found for "${suggestion.query}". Trying AI generation...`, 'info');
                    if (!(await consumeCredits(10))) return;
                    const blob = await generateRunwayVideoClip(scene.visual, project.platform);
                    assetUrl = await uploadFile(blob, `${user!.id}/${project.id}/ai-broll/${uuidv4()}.mp4`);
                    duration = 5;
                }
            } else if (suggestion.type === 'ai_video' && suggestion.prompt) {
                if (!(await consumeCredits(10))) return;
                const blob = await generateRunwayVideoClip(suggestion.prompt, project.platform);
                assetUrl = await uploadFile(blob, `${user!.id}/${project.id}/ai-broll/${uuidv4()}.mp4`);
                duration = 5;
            }

            if (assetUrl) {
                const aRollClip = timeline.tracks.find(t => t.id === 'a-roll')?.clips.find(c => c.sceneIndex === sceneIndex);
                if (aRollClip) {
                    const target = { trackId: 'b-roll', sceneIndex, startTime: aRollClip.startTime };
                    setActiveMediaTarget(target);
                    handleAssetSelected(assetUrl, 'video', duration);
                }
                addToast("AI B-Roll added to timeline!", "success");
            } else {
                addToast("Could not find or generate a suitable B-Roll clip. This could be due to safety filters or a temporary issue.", "error");
            }
        } catch (e) {
            addToast(getErrorMessage(e), 'error');
        }
    });

    const selectedClip = useMemo(() => {
        if (!selectedClipId || !timeline) return null;
        for (const track of timeline.tracks) {
            const clip = track.clips.find(c => c.id === selectedClipId);
            if (clip) return clip;
        }
        return null;
    }, [selectedClipId, timeline]);
    
    const selectedSubtitle = useMemo(() => {
        if (!selectedSubtitleId || !timeline) return null;
        return timeline.subtitles.find(s => s.id === selectedSubtitleId) || null;
    }, [selectedSubtitleId, timeline]);

    if (!timeline) {
        return <div className="text-center py-16 px-6 bg-gray-800/50 rounded-2xl"><h2 className="text-2xl font-bold text-white mb-3">{t('asset_studio.script_required_title')}</h2><p className="text-gray-400 mb-6 max-w-md mx-auto">{t('asset_studio.script_required_subtitle')}</p></div>
    }
    
    const CentralToolbar = () => (
         <div className="flex justify-between items-center px-2 py-1">
            <div className="flex items-center gap-2">
                <button onClick={undo} disabled={!canUndo} className="p-2 text-gray-300 hover:text-white disabled:opacity-50"><UndoIcon className="w-5 h-5"/></button>
                <button onClick={redo} disabled={!canRedo} className="p-2 text-gray-300 hover:text-white disabled:opacity-50"><RedoIcon className="w-5 h-5"/></button>
                <ViralityGauge score={viralityScore} size="sm" />
            </div>
            <div className="flex items-center gap-2">
                <button onClick={() => setIsPlaying(!isPlaying)} className="p-3 bg-gray-700 rounded-full text-white hover:bg-indigo-600">{isPlaying ? <PauseIcon className="w-5 h-5"/> : <PlayIcon className="w-5 h-5"/>}</button>
                <button onClick={handleSplitClip} className="p-3 bg-gray-700 rounded-full text-white hover:bg-indigo-600" title="Split Clip"><ScissorsIcon className="w-5 h-5"/></button>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={() => setShowGuides(!showGuides)} className={`p-2 rounded-md ${showGuides ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`} title={t('layout_toolkit.guides_zones')}><ViewfinderCircleIcon className="w-5 h-5"/></button>
                 <button onClick={handleProceedToAnalysis} className="inline-flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-full transition-all text-sm">
                    <RocketLaunchIcon className="w-5 h-5 mr-2" />
                    Assemble & Analyze
                </button>
            </div>
        </div>
    );

    return (
        <div className="grid grid-cols-12 gap-4 h-[85vh] bg-gray-900 rounded-2xl border border-gray-700 animate-fade-in-up p-4" data-tour="editor-main">
            <GuidedTour />
            
            <div className="col-span-3 h-full overflow-hidden rounded-lg">
                <MediaPanel project={project} onAssetSelect={handleAssetSelected} activeTarget={activeMediaTarget} setActiveTarget={setActiveMediaTarget} />
            </div>
            
            <div className="col-span-6 h-full flex flex-col gap-4">
                <main className="flex-[1] bg-black rounded-lg relative flex items-center justify-center min-h-0" data-tour="video-preview">
                     <LivePreviewPlayer 
                        timeline={timeline} isPlaying={isPlaying} currentTime={currentTime} onTimeUpdate={setCurrentTime} onEnded={() => setIsPlaying(false)} aspectRatio={aspectRatio} selectedClipId={selectedClipId} onClipUpdate={handleClipCommit} onPlaceholderClick={(trackId, sceneIndex, startTime) => setActiveMediaTarget({trackId, sceneIndex, startTime})}
                     >
                       {showGuides && <GuideOverlays aspectRatio={aspectRatio} />}
                    </LivePreviewPlayer>
                </main>
                <div className="flex-[1] flex flex-col bg-gray-800/50 rounded-lg p-2 border border-gray-700 min-h-0">
                    <CentralToolbar />
                    <div data-tour="timeline" className="mt-2 flex-grow overflow-hidden">
                        <Timeline timeline={timeline} onUpdatePreview={updateActiveTimeline} onUpdateCommit={commitTimelineChange} currentTime={currentTime} onSeek={setCurrentTime} onClipSelect={(id) => handleSelect(id, 'clip')} onSubtitleSelect={(id) => handleSelect(id, 'subtitle')} selectedClipId={selectedClipId} selectedSubtitleId={selectedSubtitleId} onAddMediaClick={(trackId, sceneIndex, startTime) => setActiveMediaTarget({trackId, sceneIndex, startTime})} onGenerateAiBroll={handleGenerateAiBroll} activeSceneIndex={activeSceneIndex} />
                    </div>
                </div>
            </div>

            <div className="col-span-3 h-full overflow-hidden rounded-lg">
                <InspectorPanel 
                    project={project} selectedClip={selectedClip} selectedSubtitle={selectedSubtitle} onUpdateClip={handleUpdateClip} onUpdateSubtitle={handleUpdateSubtitle} currentTime={currentTime} onGenerateAllVoiceovers={onGenerateAllVoiceovers}
                />
            </div>
        </div>
    );
};

export default FinalEditStep;