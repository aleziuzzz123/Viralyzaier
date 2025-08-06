
import React, { useRef, useCallback, useState } from 'react';
import { TimelineState, TimelineClip } from '../types';
import { MusicNoteIcon, MicIcon, FilmIcon, SubtitlesIcon, LayersIcon } from './Icons';

interface TimelineProps {
    timeline: TimelineState;
    onUpdate: (newTimeline: TimelineState) => void;
    currentTime: number;
    onSeek: (time: number) => void;
    onClipSelect: (clipId: string | null) => void;
    selectedClipId: string | null;
}

const trackConfig: { [key: string]: { icon: React.FC<{className?: string}>, color: string } } = {
    'overlay': { icon: LayersIcon, color: 'bg-teal-500/80' },
    'b-roll': { icon: FilmIcon, color: 'bg-sky-500/80' },
    'a-roll': { icon: FilmIcon, color: 'bg-blue-500/80' },
    'voiceover': { icon: MicIcon, color: 'bg-green-500/80' },
    'music': { icon: MusicNoteIcon, color: 'bg-purple-500/80' },
    'sfx': { icon: MusicNoteIcon, color: 'bg-pink-500/80' },
    'text': { icon: SubtitlesIcon, color: 'bg-yellow-500/80' },
};

const Timeline: React.FC<TimelineProps> = ({ timeline, onUpdate, currentTime, onSeek, onClipSelect, selectedClipId }) => {
    const timelineContainerRef = useRef<HTMLDivElement>(null);
    const isDraggingPlayheadRef = useRef(false);
    
    // States for clip interaction
    const [draggingClip, setDraggingClip] = useState<{ clipId: string; trackId: string; initialX: number; initialStartTime: number; } | null>(null);
    const [resizingClip, setResizingClip] = useState<{ clipId: string; trackId: string; edge: 'start' | 'end'; initialX: number; initialTime: number; } | null>(null);

    const handleSeekFromEvent = (e: MouseEvent | React.MouseEvent) => {
        if (!timelineContainerRef.current) return;
        const rect = timelineContainerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        onSeek(percentage * timeline.totalDuration);
    };

    const handleDragPlayheadMove = useCallback((e: MouseEvent) => {
        if (isDraggingPlayheadRef.current) handleSeekFromEvent(e);
    }, [handleSeekFromEvent]);

    const handleDragPlayheadEnd = useCallback(() => {
        isDraggingPlayheadRef.current = false;
        window.removeEventListener('mousemove', handleDragPlayheadMove);
        window.removeEventListener('mouseup', handleDragPlayheadEnd);
    }, [handleDragPlayheadMove]);

    const handleDragPlayheadStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isDraggingPlayheadRef.current = true;
        window.addEventListener('mousemove', handleDragPlayheadMove);
        window.addEventListener('mouseup', handleDragPlayheadEnd);
    }, [handleDragPlayheadMove, handleDragPlayheadEnd]);
    
    // --- Clip Interaction Logic ---

    const handleClipInteractionMove = useCallback((e: MouseEvent) => {
        if (!timelineContainerRef.current) return;
        const rect = timelineContainerRef.current.getBoundingClientRect();
        const pixelsPerSecond = rect.width / timeline.totalDuration;
        
        if (draggingClip) {
            const deltaX = e.clientX - draggingClip.initialX;
            const deltaTime = deltaX / pixelsPerSecond;
            let newStartTime = draggingClip.initialStartTime + deltaTime;
            
            const newTimeline = JSON.parse(JSON.stringify(timeline));
            const track = newTimeline.tracks.find((t: any) => t.id === draggingClip.trackId);
            const clip = track.clips.find((c: any) => c.id === draggingClip.clipId);
            
            const duration = clip.endTime - clip.startTime;
            newStartTime = Math.max(0, Math.min(newStartTime, timeline.totalDuration - duration));
            
            clip.startTime = newStartTime;
            clip.endTime = newStartTime + duration;
            onUpdate(newTimeline);

        } else if (resizingClip) {
            const deltaX = e.clientX - resizingClip.initialX;
            const deltaTime = deltaX / pixelsPerSecond;
            let newTime = resizingClip.initialTime + deltaTime;

            const newTimeline = JSON.parse(JSON.stringify(timeline));
            const track = newTimeline.tracks.find((t: any) => t.id === resizingClip.trackId);
            const clip = track.clips.find((c: any) => c.id === resizingClip.clipId);

            if (resizingClip.edge === 'start') {
                newTime = Math.max(0, Math.min(newTime, clip.endTime - 0.5)); // Min clip duration 0.5s
                clip.startTime = newTime;
            } else {
                newTime = Math.max(clip.startTime + 0.5, Math.min(newTime, timeline.totalDuration));
                clip.endTime = newTime;
            }
            onUpdate(newTimeline);
        }
    }, [timeline, onUpdate, draggingClip, resizingClip]);

    const handleClipInteractionEnd = useCallback(() => {
        window.removeEventListener('mousemove', handleClipInteractionMove);
        window.removeEventListener('mouseup', handleClipInteractionEnd);
        setDraggingClip(null);
        setResizingClip(null);
    }, [handleClipInteractionMove]);

    const handleClipDragStart = (e: React.MouseEvent, clip: TimelineClip, trackId: string) => {
        e.stopPropagation();
        setDraggingClip({
            clipId: clip.id,
            trackId,
            initialX: e.clientX,
            initialStartTime: clip.startTime,
        });
        window.addEventListener('mousemove', handleClipInteractionMove);
        window.addEventListener('mouseup', handleClipInteractionEnd);
    };

    const handleClipResizeStart = (e: React.MouseEvent, clip: TimelineClip, trackId: string, edge: 'start' | 'end') => {
        e.stopPropagation();
        setResizingClip({
            clipId: clip.id,
            trackId,
            edge,
            initialX: e.clientX,
            initialTime: edge === 'start' ? clip.startTime : clip.endTime,
        });
        window.addEventListener('mousemove', handleClipInteractionMove);
        window.addEventListener('mouseup', handleClipInteractionEnd);
    };

    const playheadPosition = `${(currentTime / timeline.totalDuration) * 100}%`;

    return (
        <div className="flex flex-col space-y-1 select-none">
            {/* Timeline Ruler & Playhead */}
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
                     <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-500 rounded-full" />
                </div>
            </div>
            
            {/* Tracks */}
            <div className="space-y-1">
                {timeline.tracks.map(track => (
                    <div key={track.id} className="h-10 flex items-center bg-gray-800/50 rounded">
                        <div className="w-24 h-full flex items-center justify-center bg-gray-700/50 rounded-l flex-shrink-0">
                            {trackConfig[track.type] && React.createElement(trackConfig[track.type].icon, { className: 'w-5 h-5 text-gray-400'})}
                        </div>
                        <div className="relative flex-grow h-full">
                            {track.clips.map(clip => (
                                <div 
                                    key={clip.id} 
                                    onMouseDown={(e) => handleClipDragStart(e, clip, track.id)}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (['a-roll', 'b-roll', 'overlay', 'voiceover'].includes(track.type)) {
                                            onClipSelect(selectedClipId === clip.id ? null : clip.id);
                                        }
                                    }}
                                    className={`absolute h-full rounded flex items-center px-2 overflow-hidden text-xs text-white transition-all group ${trackConfig[track.type]?.color || 'bg-gray-600'} ${selectedClipId === clip.id ? 'ring-2 ring-pink-500 z-10' : ''} ${draggingClip || resizingClip ? 'cursor-grabbing' : 'cursor-grab'}`}
                                    style={{
                                        left: `${(clip.startTime / timeline.totalDuration) * 100}%`,
                                        width: `${((clip.endTime - clip.startTime) / timeline.totalDuration) * 100}%`,
                                    }}
                                >
                                    <span className="truncate">{clip.type === 'image' || clip.type === 'video' ? `Scene ${clip.sceneIndex + 1}` : clip.id}</span>
                                    {/* Resize Handles */}
                                    <div onMouseDown={(e) => handleClipResizeStart(e, clip, track.id, 'start')} className="absolute left-0 top-0 w-2 h-full cursor-ew-resize z-10"/>
                                    <div onMouseDown={(e) => handleClipResizeStart(e, clip, track.id, 'end')} className="absolute right-0 top-0 w-2 h-full cursor-ew-resize z-10"/>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Timeline;