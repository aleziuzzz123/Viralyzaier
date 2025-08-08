import React, { useState, useMemo, useCallback } from 'react';
import { Project, Analysis, TimelineState, TimelineClip, Subtitle, TimelineTrack } from '../types';
import * as geminiService from '../services/geminiService';
import { useAppContext } from '../contexts/AppContext';
import { getErrorMessage } from '../utils';
import LivePreviewPlayer from './LivePreviewPlayer';
import Timeline from './Timeline';
import GuideOverlays from './GuideOverlays';
import HelpModal from './HelpModal';
import { PlayIcon, PauseIcon, ViewfinderCircleIcon, ScissorsIcon, RocketLaunchIcon, MagicWandIcon } from './Icons';
import AssetAndInspectorPanel from './AssetAndInspectorPanel';
import GuidedTour from './GuidedTour';

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


const FinalEditStep: React.FC<{ 
    project: Project; 
    onProceedToNextStage: () => void; 
}> = ({ project, onProceedToNextStage }) => {
    const { t, handleUpdateProject, addToast, consumeCredits, invokeEdgeFunction, lockAndExecute } = useAppContext();
    const [timeline, setTimeline] = useState<TimelineState>(() => (project.timeline || initializeTimelineFromScript(project.script)));
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    
    // UI State
    const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
    const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
    const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
    const [selectedSubtitleId, setSelectedSubtitleId] = useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = useState<'16/9' | '9/16' | '1/1'>(project.platform === 'youtube_long' ? '16/9' : '9/16');
    const [showGuides, setShowGuides] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [isPolishing, setIsPolishing] = useState(false);

    const activeSceneIndex = useMemo(() => {
        return timeline.tracks.find(t => t.type === 'a-roll')?.clips.find(c => currentTime >= c.startTime && currentTime < c.endTime)?.sceneIndex ?? 0;
    }, [currentTime, timeline.tracks]);
    
    const handleTimelineUpdate = useCallback((newTimeline: TimelineState) => {
        setTimeline(newTimeline);
        handleUpdateProject({ id: project.id, timeline: newTimeline });
    }, [project.id, handleUpdateProject]);

    const handleUpdateClip = useCallback((clipId: string, updates: Partial<TimelineClip>) => {
        const newTimeline = JSON.parse(JSON.stringify(timeline)); // Deep copy
        let clipFound = false;
        for (const track of newTimeline.tracks as TimelineTrack[]) {
            const clipIndex = track.clips.findIndex((c: TimelineClip) => c.id === clipId);
            if (clipIndex !== -1) {
                if (updates.positioning) track.clips[clipIndex].positioning = { ...track.clips[clipIndex].positioning, ...updates.positioning };
                if (updates.animation) track.clips[clipIndex].animation = { ...track.clips[clipIndex].animation, ...updates.animation };
                if (updates.aiEffects) track.clips[clipIndex].aiEffects = { ...track.clips[clipIndex].aiEffects, ...updates.aiEffects };
                if (updates.effects) track.clips[clipIndex].effects = { ...track.clips[clipIndex].effects, ...updates.effects };
                if (updates.color) track.clips[clipIndex].color = { ...track.clips[clipIndex].color, ...updates.color };
                if (updates.audio) track.clips[clipIndex].audio = { ...track.clips[clipIndex].audio, ...updates.audio };
                
                delete updates.positioning;
                delete updates.animation;
                delete updates.aiEffects;
                delete updates.effects;
                delete updates.color;
                delete updates.audio;
                
                track.clips[clipIndex] = { ...track.clips[clipIndex], ...updates };
                clipFound = true;
                break;
            }
        }
        if (clipFound) handleTimelineUpdate(newTimeline);
    }, [timeline, handleTimelineUpdate]);
    
     const handleUpdateSubtitle = useCallback((subtitleId: string, updates: Partial<Subtitle>) => {
        const newTimeline = JSON.parse(JSON.stringify(timeline));
        const subIndex = newTimeline.subtitles.findIndex((s: Subtitle) => s.id === subtitleId);
        if (subIndex > -1) {
            newTimeline.subtitles[subIndex] = { ...newTimeline.subtitles[subIndex], ...updates };
            handleTimelineUpdate(newTimeline);
        }
    }, [timeline, handleTimelineUpdate]);

    const handleSplitClip = () => {
        const clipToSplitId = selectedClipId || timeline.tracks.flatMap(t => t.clips).find(c => currentTime > c.startTime && currentTime < c.endTime)?.id;
        if (!clipToSplitId) {
            addToast("Select a clip or move playhead over a clip to split.", "info");
            return;
        }
        
        const newTimeline = JSON.parse(JSON.stringify(timeline));
        let splitDone = false;
        for (const track of newTimeline.tracks) {
            const clipIndex = track.clips.findIndex((c: TimelineClip) => c.id === clipToSplitId);
            if (clipIndex > -1) {
                const clip = track.clips[clipIndex];
                if (currentTime > clip.startTime && currentTime < clip.endTime) {
                    const originalEndTime = clip.endTime;
                    clip.endTime = currentTime;
                    
                    const newClip: TimelineClip = {
                        ...clip,
                        id: `${clip.id}_split_${Date.now()}`,
                        startTime: currentTime,
                        endTime: originalEndTime
                    };
                    track.clips.splice(clipIndex + 1, 0, newClip);
                    splitDone = true;
                    break;
                }
            }
        }
        if(splitDone) {
            handleTimelineUpdate(newTimeline);
            addToast("Clip split!", "success");
        } else {
            addToast("Playhead must be inside the clip to split.", "error");
        }
    };
    
    const handleSelect = (id: string | null, type: 'clip' | 'subtitle') => {
        if (type === 'clip') {
            setSelectedClipId(id);
            setSelectedSubtitleId(null);
        } else {
            setSelectedSubtitleId(id);
            setSelectedClipId(null);
        }
    };

    const handleAiPolish = () => lockAndExecute(async () => {
        if (!project.script) return;
        if (!await consumeCredits(5)) return;
        setIsPolishing(true);
        addToast("AI is polishing your video... This may take a moment.", "info");
        try {
            const { timeline: polishedTimeline } = await invokeEdgeFunction<{ timeline: TimelineState }>('ai-polish', {
                timeline,
                script: project.script,
                projectId: project.id,
            });
            handleTimelineUpdate(polishedTimeline);
            addToast("AI Polish complete! SFX and motion added.", "success");
        } catch (e) {
            addToast(`AI Polish failed: ${getErrorMessage(e)}`, "error");
        } finally {
            setIsPolishing(false);
        }
    });
    
    const handleProceedToAnalysis = async () => {
        await handleUpdateProject({id: project.id, status: 'Rendering'});
        onProceedToNextStage();
    }

    if (!project.script) {
        return <div className="text-center py-16 px-6 bg-gray-800/50 rounded-2xl"><h2 className="text-2xl font-bold text-white mb-3">{t('asset_studio.script_required_title')}</h2><p className="text-gray-400 mb-6 max-w-md mx-auto">{t('asset_studio.script_required_subtitle')}</p></div>
    }

    return (
        <div className="flex flex-col h-[80vh] bg-gray-900 rounded-2xl border border-gray-700 animate-fade-in-up" data-tour="editor-main">
            <GuidedTour />
            <div className="flex-1 flex min-h-0 relative">
                <aside className={`absolute top-0 bottom-0 left-0 bg-gray-800/80 backdrop-blur-sm border-r border-gray-700 z-20 transition-transform duration-300 ${isLeftPanelOpen ? 'translate-x-0' : '-translate-x-full'} w-80 p-4 flex flex-col`}>
                    <h3 className="text-lg font-bold text-white mb-4">Transcript</h3>
                    <div className="overflow-y-auto flex-grow">
                        {project.script.scenes.map((scene, index) => {
                             const clip = timeline.tracks.find(t => t.type === 'a-roll')?.clips.find(c => c.sceneIndex === index);
                            return <div key={index} onClick={() => setCurrentTime(clip?.startTime ?? 0)} className={`p-3 rounded-lg cursor-pointer transition-colors ${activeSceneIndex === index ? 'bg-indigo-600/50' : 'hover:bg-gray-700/50'}`}>
                                <p className="font-bold text-white">Scene {index+1}</p>
                                <p className="text-sm text-gray-300">{scene.voiceover}</p>
                            </div>
                        })}
                    </div>
                </aside>

                <main className={`h-full transition-all duration-300 flex flex-col ${isLeftPanelOpen ? 'pl-80' : 'pl-0'} ${isRightPanelOpen ? 'pr-96' : 'pr-0'}`}>
                    <div className="flex-1 flex flex-col items-center justify-center p-4 bg-black relative" data-tour="video-preview">
                         <LivePreviewPlayer 
                            timeline={timeline}
                            isPlaying={isPlaying}
                            currentTime={currentTime}
                            onTimeUpdate={setCurrentTime}
                            onEnded={() => setIsPlaying(false)}
                            aspectRatio={aspectRatio}
                            onClipUpdate={handleUpdateClip}
                            selectedClipId={selectedClipId}
                        >
                           {showGuides && <GuideOverlays aspectRatio={aspectRatio} />}
                        </LivePreviewPlayer>
                        
                    </div>
                </main>
                <div data-tour="add-media">
                    <AssetAndInspectorPanel 
                        isOpen={isRightPanelOpen}
                        project={project}
                        timeline={timeline}
                        onTimelineUpdate={handleTimelineUpdate}
                        selectedClipId={selectedClipId}
                        selectedSubtitleId={selectedSubtitleId}
                        onClipUpdate={handleUpdateClip}
                        onSubtitleUpdate={handleUpdateSubtitle}
                        activeSceneIndex={activeSceneIndex}
                    />
                </div>
            </div>
            
            <footer className="flex-shrink-0 p-2 bg-gray-900/70 border-t-2 border-gray-700">
                <div className="flex justify-between items-center px-2 mb-2">
                    <div className="flex items-center gap-2">
                         <button onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)} className={`p-2 rounded-md text-xs font-semibold ${isLeftPanelOpen ? 'bg-indigo-600' : 'bg-gray-700'} `}>Transcript</button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsPlaying(!isPlaying)} className="p-3 bg-gray-700 rounded-full text-white hover:bg-indigo-600">
                            {isPlaying ? <PauseIcon className="w-5 h-5"/> : <PlayIcon className="w-5 h-5"/>}
                        </button>
                        <button onClick={handleSplitClip} className="p-3 bg-gray-700 rounded-full text-white hover:bg-indigo-600" title="Split Clip (at playhead)">
                           <ScissorsIcon className="w-5 h-5"/>
                        </button>
                         <button onClick={handleAiPolish} disabled={isPolishing} className="p-3 bg-gray-700 rounded-full text-white hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-wait" title="AI Polish (5 Credits)">
                           <MagicWandIcon className={`w-5 h-5 ${isPolishing ? 'animate-pulse' : ''}`}/>
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 p-1 bg-gray-800 rounded-md">
                            <button onClick={() => setAspectRatio('16/9')} className={`px-2 py-1 text-xs rounded ${aspectRatio === '16/9' ? 'bg-indigo-600' : ''}`}>16:9</button>
                            <button onClick={() => setAspectRatio('9/16')} className={`px-2 py-1 text-xs rounded ${aspectRatio === '9/16' ? 'bg-indigo-600' : ''}`}>9:16</button>
                            <button onClick={() => setAspectRatio('1/1')} className={`px-2 py-1 text-xs rounded ${aspectRatio === '1/1' ? 'bg-indigo-600' : ''}`}>1:1</button>
                        </div>
                        <button onClick={() => setShowGuides(!showGuides)} className={`p-2 rounded-md ${showGuides ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`} title={t('layout_toolkit.guides_zones')}><ViewfinderCircleIcon className="w-5 h-5"/></button>
                        <button onClick={() => setIsHelpOpen(true)} className="p-2 text-gray-300 hover:bg-gray-700 rounded-md">Help</button>
                         <button onClick={() => setIsRightPanelOpen(!isRightPanelOpen)} className={`p-2 rounded-md text-xs font-semibold ${isRightPanelOpen ? 'bg-indigo-600' : 'bg-gray-700'}`}>Assets / Inspector</button>
                    </div>
                </div>
                <div data-tour="timeline">
                    <Timeline timeline={timeline} onUpdate={handleTimelineUpdate} currentTime={currentTime} onSeek={setCurrentTime} onClipSelect={(id) => handleSelect(id, 'clip')} onSubtitleSelect={(id) => handleSelect(id, 'subtitle')} selectedClipId={selectedClipId} selectedSubtitleId={selectedSubtitleId} />
                </div>
                 <div className="text-center pt-4">
                    <button onClick={handleProceedToAnalysis} className="w-full max-w-sm inline-flex items-center justify-center px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg">
                        <RocketLaunchIcon className="w-6 h-6 mr-3" />
                        {t('final_edit.render_preview_button')}
                    </button>
                </div>
            </footer>

            <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
        </div>
    );
};


export default FinalEditStep;
