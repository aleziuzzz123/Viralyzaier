import React, { useRef, useCallback, useState, useEffect } from 'react';
import { TimelineState, TimelineClip } from '../types.ts';
import { MusicNoteIcon, MicIcon, FilmIcon, SubtitlesIcon, LayersIcon, TransitionIcon, XIcon, PlusCircleIcon, SparklesIcon } from './Icons.tsx';
import SubtitleTrack from './SubtitleTrack.tsx';

interface TimelineProps {
    timeline: TimelineState;
    onUpdate: (newTimeline: TimelineState) => void;
    currentTime: number;
    onSeek: (time: number) => void;
    onClipSelect: (clipId: string | null) => void;
    onSubtitleSelect: (subtitleId: string | null) => void;
    selectedClipId: string | null;
    selectedSubtitleId: string | null;
    onAddMediaClick: (trackId: string, sceneIndex: number, startTime: number) => void;
    onGenerateVoiceover: () => void;
    onGenerateAiBroll: (sceneIndex: number) => void;
    activeSceneIndex: number;
}

const trackConfig: { [key: string]: { icon: React.FC<{className?: string}>, color: string, name: string } } = {
    'overlay': { icon: LayersIcon, color: 'bg-teal-500/80', name: 'Overlays' },
    'b-roll': { icon: FilmIcon, color: 'bg-sky-500/80', name: 'B-Roll' },
    'a-roll': { icon: FilmIcon, color: 'bg-blue-500/80', name: 'A-Roll' },
    'voiceover': { icon: MicIcon, color: 'bg-green-500/80', name: 'Voiceover' },
    'music': { icon: MusicNoteIcon, color: 'bg-purple-500/80', name: 'Music' },
    'sfx': { icon: MusicNoteIcon, color: 'bg-pink-500/80', name: 'SFX' },
    'text': { icon: SubtitlesIcon, color: 'bg-yellow-500/80', name: 'Text' }
};

const TransitionPicker: React.FC<{onSelect: (type: TimelineClip['transition']['type']) => void; onClose: () => void}> = ({ onSelect, onClose }) => {
    const transitions: NonNullable<TimelineClip['transition']>['type'][] = ['glitch', 'whip_pan', 'film_burn'];
    return (
        <div className="absolute -top-2 transform -translate-y-full left-1/2 -translate-x-1/2 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-30 p-2 flex gap-2">
            {transitions.map(t => (
                <button key={t} onClick={() => onSelect(t)} className="p-2 text-xs text-white bg-gray-700 rounded hover:bg-indigo-600">{t}</button>
            ))}
             <button onClick={onClose} className="p-2 text-xs text-white bg-red-700 rounded hover:bg-red-600"><XIcon className="w-4 h-4"/></button>
        </div>
    );
};

const Timeline: React.FC<TimelineProps> = ({ timeline, onUpdate, currentTime, onSeek, onClipSelect, onSubtitleSelect, selectedClipId, selectedSubtitleId, onAddMediaClick, onGenerateVoiceover, onGenerateAiBroll, activeSceneIndex }) => {
    const timelineContainerRef = useRef<HTMLDivElement>(null);
    const isDraggingPlayheadRef = useRef(false);
    
    const [draggingClip, setDraggingClip] = useState<{ clipId: string; trackId: string; initialX: number; initialStartTime: number; ghostLeft: number; ghostWidth: number; } | null>(null);
    const [resizingClip, setResizingClip] = useState<{ clipId: string; trackId: string; edge: 'start' | 'end'; initialX: number; initialTime: number; } | null>(null);
    const [transitionPicker, setTransitionPicker] = useState<{ clipId: string; left: number } | null>(null);

    const handleSeekFromEvent = (e: MouseEvent | React.MouseEvent) => {
        if (!timelineContainerRef.current) return;
        const rect = timelineContainerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        onSeek(percentage * timeline.totalDuration);
    };

    const handleDragPlayheadMove = useCallback((e: MouseEvent) => {
        if (isDraggingPlayheadRef.current) handleSeekFromEvent(e);
    }, [onSeek, timeline.totalDuration]);

    const handleDragPlayheadEnd = useCallback(() => {
        isDraggingPlayheadRef.current = false;
        document.removeEventListener('mousemove', handleDragPlayheadMove);
        document.removeEventListener('mouseup', handleDragPlayheadEnd);
    }, [handleDragPlayheadMove]);

    const handleDragPlayheadStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isDraggingPlayheadRef.current = true;
        document.addEventListener('mousemove', handleDragPlayheadMove);
        document.addEventListener('mouseup', handleDragPlayheadEnd);
    }, [handleDragPlayheadMove, handleDragPlayheadEnd]);
    
    const handleClipInteractionMove = useCallback((e: MouseEvent) => {
        if (!timelineContainerRef.current || timeline.totalDuration === 0) return;
        const rect = timelineContainerRef.current.getBoundingClientRect();
        const pixelsPerSecond = rect.width / timeline.totalDuration;
        
        if (draggingClip) {
            const track = timeline.tracks.find((t: any) => t.id === draggingClip.trackId);
            if (!track) return;
            const clip = track.clips.find((c: any) => c.id === draggingClip.clipId);
            if (!clip) return;
            const duration = clip.endTime - clip.startTime;
            const deltaX = e.clientX - draggingClip.initialX;
            const deltaTime = deltaX / pixelsPerSecond;
            let newStartTime = draggingClip.initialStartTime + deltaTime;
            newStartTime = Math.max(0, Math.min(newStartTime, timeline.totalDuration - duration));
            
            setDraggingClip(prev => prev ? {...prev, ghostLeft: (newStartTime / timeline.totalDuration) * 100 } : null);

        } else if (resizingClip) {
            const newTimeline = JSON.parse(JSON.stringify(timeline));
            const track = newTimeline.tracks.find((t: any) => t.id === resizingClip.trackId);
            const clip = track.clips.find((c: any) => c.id === resizingClip.clipId);
            const deltaX = e.clientX - resizingClip.initialX;
            const deltaTime = deltaX / pixelsPerSecond;
            let newTime = resizingClip.initialTime + deltaTime;

            if (resizingClip.edge === 'start') {
                newTime = Math.max(0, Math.min(newTime, clip.endTime - 0.5));
                clip.startTime = newTime;
            } else {
                newTime = Math.max(clip.startTime + 0.5, Math.min(newTime, timeline.totalDuration));
                clip.endTime = newTime;
            }
            onUpdate(newTimeline);
        }
    }, [timeline, onUpdate, draggingClip, resizingClip]);

    const handleClipInteractionEnd = useCallback((e: MouseEvent) => {
        if (draggingClip) {
            const rect = timelineContainerRef.current!.getBoundingClientRect();
            const pixelsPerSecond = rect.width / timeline.totalDuration;
            const deltaX = e.clientX - draggingClip.initialX;
            const deltaTime = deltaX / pixelsPerSecond;
            
            const newTimeline = JSON.parse(JSON.stringify(timeline));
            const track = newTimeline.tracks.find((t: any) => t.id === draggingClip.trackId);
            const clip = track.clips.find((c: any) => c.id === draggingClip.clipId);
            const duration = clip.endTime - clip.startTime;
            let newStartTime = draggingClip.initialStartTime + deltaTime;
            newStartTime = Math.max(0, Math.min(newStartTime, timeline.totalDuration - duration));
            clip.startTime = newStartTime;
            clip.endTime = newStartTime + duration;
            onUpdate(newTimeline);
        }
        
        document.removeEventListener('mousemove', handleClipInteractionMove);
        document.removeEventListener('mouseup', handleClipInteractionEnd);
        setDraggingClip(null);
        setResizingClip(null);
    }, [handleClipInteractionMove, draggingClip, onUpdate, timeline]);

    useEffect(() => {
      if (draggingClip || resizingClip) {
          document.addEventListener('mousemove', handleClipInteractionMove);
          document.addEventListener('mouseup', handleClipInteractionEnd);
      }
      return () => {
        document.removeEventListener('mousemove', handleClipInteractionMove);
        document.removeEventListener('mouseup', handleClipInteractionEnd);
      };
    }, [draggingClip, resizingClip, handleClipInteractionMove, handleClipInteractionEnd]);

    const handleClipDragStart = (e: React.MouseEvent, clip: TimelineClip, trackId: string) => {
        e.stopPropagation();
        const width = ((clip.endTime - clip.startTime) / timeline.totalDuration) * 100;
        const left = (clip.startTime / timeline.totalDuration) * 100;
        setDraggingClip({ clipId: clip.id, trackId, initialX: e.clientX, initialStartTime: clip.startTime, ghostLeft: left, ghostWidth: width });
    };

    const handleClipResizeStart = (e: React.MouseEvent, clip: TimelineClip, trackId: string, edge: 'start' | 'end') => {
        e.stopPropagation();
        setResizingClip({ clipId: clip.id, trackId, edge, initialX: e.clientX, initialTime: edge === 'start' ? clip.startTime : clip.endTime });
    };

    const handleSetTransition = (type: NonNullable<TimelineClip['transition']>['type']) => {
        if (!transitionPicker) return;
        const newTimeline = JSON.parse(JSON.stringify(timeline));
        let updated = false;
        for (const track of newTimeline.tracks) {
            const clip = track.clips.find((c:any) => c.id === transitionPicker.clipId);
            if(clip) {
                clip.transition = { type, duration: 0.5 };
                updated = true;
                break;
            }
        }
        if(updated) onUpdate(newTimeline);
        setTransitionPicker(null);
    };

    const playheadPosition = `${(currentTime / timeline.totalDuration) * 100}%`;
    const allKeyframes = (clip: TimelineClip) => Object.values(clip.keyframes || {}).flat();

    return (
        <div className="flex select-none">
            {/* Track Headers */}
            <div className="w-40 flex-shrink-0 space-y-1">
                <div className="h-8"></div>
                <div className="h-10"></div>
                {timeline.tracks.map(track => (
                    <div key={track.id} className="h-10 flex items-center justify-between bg-gray-700/50 rounded-l p-2 text-xs font-bold text-gray-300 gap-2">
                        <div className="flex items-center gap-2 truncate">
                            {trackConfig[track.type] && React.createElement(trackConfig[track.type].icon, { className: 'w-4 h-4 text-gray-400'})}
                            <span className="truncate">{trackConfig[track.type]?.name || track.type}</span>
                        </div>
                        {track.type === 'voiceover' && (
                            <button onClick={onGenerateVoiceover} title="Generate full script voiceover (1 credit per scene)" className="p-1 text-gray-400 hover:text-indigo-400"><SparklesIcon className="w-4 h-4"/></button>
                        )}
                        {track.type === 'b-roll' && (
                            <button onClick={() => onGenerateAiBroll(activeSceneIndex)} title="Generate AI B-Roll for current scene (costs vary)" className="p-1 text-gray-400 hover:text-indigo-400"><SparklesIcon className="w-4 h-4"/></button>
                        )}
                        {['overlay', 'music', 'sfx'].includes(track.type) && (
                            <button onClick={() => onAddMediaClick(track.id, -1, currentTime)} className="text-gray-400 hover:text-white"><PlusCircleIcon className="w-4 h-4" /></button>
                        )}
                    </div>
                ))}
            </div>

             {/* Timeline Tracks */}
            <div className="flex-grow flex flex-col space-y-1">
                <div ref={timelineContainerRef} className="h-8 bg-gray-800 rounded-t-lg relative cursor-pointer" onClick={(e) => handleSeekFromEvent(e)}>
                    <div className="absolute inset-0 flex justify-between px-2">
                        {[...Array(Math.floor(timeline.totalDuration / 5) + 1)].map((_, i) => (
                            <div key={i} style={{ left: `${(i * 5 / timeline.totalDuration) * 100}%` }} className="absolute h-full flex flex-col items-start">
                                <div className="w-px h-2 bg-gray-500"></div>
                                <span className="text-xs text-gray-500 -ml-1">{i * 5}s</span>
                            </div>
                        ))}
                    </div>
                    <div 
                        className="absolute top-0 h-full w-1 bg-red-500 cursor-ew-resize z-20" 
                        style={{ left: playheadPosition, transform: 'translateX(-50%)' }}
                        onMouseDown={handleDragPlayheadStart}
                    >
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-500 rounded-full border-2 border-white" />
                    </div>
                </div>
            
                <SubtitleTrack timeline={timeline} onUpdate={(updates) => onUpdate({...timeline, ...updates})} duration={timeline.totalDuration} currentTime={currentTime} onSelectSubtitle={onSubtitleSelect} selectedSubtitleId={selectedSubtitleId} />
                {timeline.tracks.map((track) => (
                    <div key={track.id} className="h-10 relative bg-gray-800/50 rounded-r">
                        {track.clips.map((clip, clipIndex) => {
                            const showTransitionHandle = (track.type === 'a-roll' || track.type === 'b-roll') && clipIndex > 0;
                            const leftPos = (clip.startTime / timeline.totalDuration) * 100;

                            if (!clip.url && (track.type === 'a-roll' || track.type === 'b-roll')) {
                                return (
                                    <div key={clip.id} style={{ left: `${leftPos}%`, width: `${((clip.endTime - clip.startTime) / timeline.totalDuration) * 100}%` }} className="absolute h-full p-1">
                                        <button onClick={() => onAddMediaClick(track.id, clip.sceneIndex, clip.startTime)} className="w-full h-full bg-gray-700/30 rounded border-2 border-dashed border-gray-600 hover:bg-gray-700/50 hover:border-indigo-500 flex items-center justify-center">
                                            <PlusCircleIcon className="w-5 h-5 text-gray-500" />
                                        </button>
                                    </div>
                                )
                            }

                            return (
                            <React.Fragment key={clip.id}>
                            {showTransitionHandle && (
                                <div className="absolute top-1/2 -translate-y-1/2 h-5 w-5 z-20" style={{ left: `${leftPos}%`, transform: 'translate(-50%, -50%)' }}>
                                    <button onClick={() => setTransitionPicker({ clipId: clip.id, left: leftPos })} className="w-full h-full flex items-center justify-center bg-gray-600 rounded-full border-2 border-gray-800 hover:bg-indigo-500">
                                        <TransitionIcon className="w-3 h-3 text-white"/>
                                    </button>
                                    {transitionPicker?.clipId === clip.id && <TransitionPicker onSelect={handleSetTransition} onClose={() => setTransitionPicker(null)} />}
                                </div>
                            )}
                            <div 
                                onMouseDown={(e) => handleClipDragStart(e, clip, track.id)}
                                onClick={(e) => { e.stopPropagation(); onClipSelect(selectedClipId === clip.id ? null : clip.id); }}
                                className={`absolute h-full rounded flex items-center px-2 overflow-hidden text-xs text-white transition-all group ${trackConfig[track.type]?.color || 'bg-gray-600'} ${selectedClipId === clip.id ? 'ring-2 ring-pink-500 z-10' : ''} ${draggingClip?.clipId === clip.id ? 'opacity-50' : ''} ${resizingClip ? 'cursor-ew-resize' : 'cursor-grab'}`}
                                style={{ left: `${leftPos}%`, width: `${((clip.endTime - clip.startTime) / timeline.totalDuration) * 100}%` }}
                            >
                                <span className="truncate">{clip.type === 'image' || clip.type === 'video' ? `Scene ${clip.sceneIndex + 1}` : clip.id}</span>
                                {allKeyframes(clip).map((kf, i) => (
                                    <div key={i} className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-pink-400 rounded-full" style={{left: `${(kf.time - clip.startTime) / (clip.endTime - clip.startTime) * 100}%`}}></div>
                                ))}
                                <div onMouseDown={(e) => handleClipResizeStart(e, clip, track.id, 'start')} className="absolute left-0 top-0 w-2 h-full cursor-ew-resize z-10 group-hover:bg-white/20"/>
                                <div onMouseDown={(e) => handleClipResizeStart(e, clip, track.id, 'end')} className="absolute right-0 top-0 w-2 h-full cursor-ew-resize z-10 group-hover:bg-white/20"/>
                                {clip.transition && (
                                    <div className="absolute -left-2 top-1/2 -translate-y-1/2 bg-indigo-500 p-1 rounded-full z-20">
                                        <TransitionIcon className="w-3 h-3 text-white"/>
                                    </div>
                                )}
                            </div>
                            </React.Fragment>
                        )})}
                        {draggingClip && (
                            <div className={`absolute h-full rounded flex items-center px-2 overflow-hidden text-xs text-white bg-gray-500/50 border-2 border-dashed border-white`} style={{ left: `${draggingClip.ghostLeft}%`, width: `${draggingClip.ghostWidth}%`}}>
                                <span className="truncate">{draggingClip.clipId}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Timeline;