import React, { useRef, useCallback, useState, useEffect } from 'react';
import { TimelineState, TimelineClip } from '../types.ts';
import { MusicNoteIcon, MicIcon, FilmIcon, SubtitlesIcon, LayersIcon, TransitionIcon, XIcon, PlusCircleIcon, SparklesIcon } from './Icons.tsx';
import SubtitleTrack from './SubtitleTrack.tsx';

interface TimelineProps {
    timeline: TimelineState;
    onUpdatePreview: (newTimeline: TimelineState, addToHistory: boolean) => void;
    onUpdateCommit: (newTimeline: TimelineState) => void;
    currentTime: number;
    onSeek: (time: number) => void;
    onClipSelect: (clipId: string | null) => void;
    onSubtitleSelect: (subtitleId: string | null) => void;
    selectedClipId: string | null;
    selectedSubtitleId: string | null;
    onAddMediaClick: (trackId: string, sceneIndex: number, startTime: number) => void;
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
             <button onClick={() => onClose()} className="p-2 text-xs text-white bg-red-700 rounded hover:bg-red-600"><XIcon className="w-4 h-4"/></button>
        </div>
    );
};

const Timeline: React.FC<TimelineProps> = ({ timeline, onUpdatePreview, onUpdateCommit, currentTime, onSeek, onClipSelect, onSubtitleSelect, selectedClipId, selectedSubtitleId, onAddMediaClick, onGenerateAiBroll, activeSceneIndex }) => {
    const timelineContainerRef = useRef<HTMLDivElement>(null);
    const animationFrameRef = useRef<number | null>(null);
    
    const [interaction, setInteraction] = useState<{ type: 'drag' | 'resizeStart' | 'resizeEnd' | 'playhead', clipId: string, trackId: string, initialX: number, initialTime: number, initialWidth: number, snapTargets: number[] } | null>(null);
    const [ghost, setGhost] = useState<{left: number, width: number} | null>(null);
    const [snapLine, setSnapLine] = useState<number | null>(null);

    const handleSeekFromEvent = (e: MouseEvent | React.MouseEvent) => {
        if (!timelineContainerRef.current || timeline.totalDuration === 0) return;
        const rect = timelineContainerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        onSeek(percentage * timeline.totalDuration);
    };

    const handleInteractionEnd = useCallback(() => {
        if (!interaction) return;

        const { type, clipId, trackId } = interaction;
        if ((type === 'drag' || type.startsWith('resize')) && ghost) {
            const newTimeline = JSON.parse(JSON.stringify(timeline));
            const track = newTimeline.tracks.find((t: any) => t.id === trackId);
            const clip = track?.clips.find((c: any) => c.id === clipId);
            if (clip) {
                const newStartTime = (ghost.left / 100) * timeline.totalDuration;
                const newEndTime = newStartTime + (ghost.width / 100) * timeline.totalDuration;
                clip.startTime = newStartTime;
                clip.endTime = newEndTime;
                onUpdateCommit(newTimeline);
            }
        }
        
        setInteraction(null);
        setGhost(null);
        setSnapLine(null);
        window.removeEventListener('mousemove', handleInteractionMove);
        window.removeEventListener('mouseup', handleInteractionEnd);
        if (animationFrameRef.current) window.cancelAnimationFrame(animationFrameRef.current);
    }, [interaction, ghost, timeline, onUpdateCommit]);

    const handleInteractionMove = useCallback((e: MouseEvent) => {
        if (!interaction || !timelineContainerRef.current) return;

        e.preventDefault();
        
        if (animationFrameRef.current) window.cancelAnimationFrame(animationFrameRef.current);

        animationFrameRef.current = requestAnimationFrame(() => {
            if (!interaction || !timelineContainerRef.current) return; // Re-check inside rAF

            if (interaction.type === 'playhead') {
                handleSeekFromEvent(e);
                return;
            }

            const rect = timelineContainerRef.current.getBoundingClientRect();
            const pixelsPerSecond = rect.width / timeline.totalDuration;
            const deltaX = e.clientX - interaction.initialX;
            const deltaTime = deltaX / pixelsPerSecond;

            const { type, clipId, trackId, snapTargets, initialTime } = interaction;
            let currentSnap: number | null = null;

            if (type === 'drag') {
                const track = timeline.tracks.find(t => t.id === trackId);
                const clip = track?.clips.find(c => c.id === clipId);
                if (!clip) return;

                const duration = clip.endTime - clip.startTime;
                let newStartTime = initialTime + deltaTime;
                newStartTime = Math.max(0, Math.min(newStartTime, timeline.totalDuration - duration));
                let newEndTime = newStartTime + duration;

                for (const snapPos of snapTargets) {
                    if (Math.abs(snapPos - newStartTime) < 0.2) { newStartTime = snapPos; currentSnap = snapPos; break; }
                    if (Math.abs(snapPos - newEndTime) < 0.2) { newStartTime = snapPos - duration; currentSnap = snapPos; break; }
                }

                setGhost({ left: (newStartTime / timeline.totalDuration) * 100, width: (duration / timeline.totalDuration) * 100 });
            } else if (type.startsWith('resize')) {
                const track = timeline.tracks.find(t => t.id === trackId);
                const clip = track?.clips.find(c => c.id === clipId);
                if (!clip) return;
                
                let newTime = initialTime + deltaTime;

                for (const snapPos of snapTargets) {
                    if (Math.abs(snapPos - newTime) < 0.2) { newTime = snapPos; currentSnap = snapPos; break; }
                }

                if (type === 'resizeStart') {
                    const constrainedTime = Math.max(0, Math.min(newTime, clip.endTime - 0.5));
                    const newWidth = ((clip.endTime - constrainedTime) / timeline.totalDuration) * 100;
                    setGhost({ left: (constrainedTime / timeline.totalDuration) * 100, width: newWidth });
                } else { // resizeEnd
                    const constrainedTime = Math.max(clip.startTime + 0.5, Math.min(newTime, timeline.totalDuration));
                    const newWidth = ((constrainedTime - clip.startTime) / timeline.totalDuration) * 100;
                    setGhost({ left: (clip.startTime / timeline.totalDuration) * 100, width: newWidth });
                }
            }

            setSnapLine(currentSnap !== null ? (currentSnap / timeline.totalDuration) * 100 : null);
        });
    }, [interaction, timeline]);

    const startInteraction = (type: 'drag' | 'resizeStart' | 'resizeEnd' | 'playhead', e: React.MouseEvent, clip?: TimelineClip, trackId?: string) => {
        e.preventDefault();
        e.stopPropagation();

        if (type === 'playhead') {
            setInteraction({ type } as any);
        } else if (clip && trackId) {
            const snapTargets = timeline.tracks
                .flatMap(t => t.clips)
                .filter(c => c.id !== clip.id)
                .flatMap(c => [c.startTime, c.endTime]);
            snapTargets.push(currentTime);

            setInteraction({
                type,
                clipId: clip.id,
                trackId,
                initialX: e.clientX,
                initialTime: type === 'resizeEnd' ? clip.endTime : clip.startTime,
                initialWidth: e.currentTarget.getBoundingClientRect().width,
                snapTargets,
            });
            setGhost({ left: (clip.startTime / timeline.totalDuration) * 100, width: ((clip.endTime - clip.startTime) / timeline.totalDuration) * 100 });
        }
        
        window.addEventListener('mousemove', handleInteractionMove);
        window.addEventListener('mouseup', handleInteractionEnd);
    };
    
    const handleDropOnTrack = (e: React.DragEvent, trackId: string) => {
        e.preventDefault();
        const assetData = JSON.parse(e.dataTransfer.getData('application/json-asset'));
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const dropTime = (x / rect.width) * timeline.totalDuration;
        
        onAddMediaClick(trackId, -1, dropTime);
    };

    const playheadPosition = `${(currentTime / timeline.totalDuration) * 100}%`;
    const allKeyframes = (clip: TimelineClip) => Object.values(clip.keyframes || {}).flat();

    return (
        <div className="flex select-none h-full">
            {/* Track Headers */}
            <div className="w-40 flex-shrink-0 space-y-1">
                <div className="h-8"></div>
                <div className="h-12"></div> {/* Subtitle Track Spacer */}
                {timeline.tracks.map(track => (
                    <div key={track.id} className="h-12 flex items-center justify-between bg-gray-700/50 rounded-l p-2 text-xs font-bold text-gray-300 gap-2">
                        <div className="flex items-center gap-2 truncate">
                            {trackConfig[track.type] && React.createElement(trackConfig[track.type].icon, { className: 'w-4 h-4 text-gray-400'})}
                            <span className="truncate">{trackConfig[track.type]?.name || track.type}</span>
                        </div>
                        {track.type === 'b-roll' && (
                            <button onClick={() => onGenerateAiBroll(activeSceneIndex)} title="Generate AI B-Roll for current scene (costs vary)" className="p-1 text-gray-400 hover:text-indigo-400"><SparklesIcon className="w-4 h-4"/></button>
                        )}
                        {['overlay', 'music', 'sfx', 'text'].includes(track.type) && (
                            <button onClick={() => onAddMediaClick(track.id, -1, currentTime)} className="text-gray-400 hover:text-white flex items-center gap-1">
                                <PlusCircleIcon className="w-4 h-4" /> 
                                <span className="text-xs">{track.type === 'text' ? "Add Text" : "Add"}</span>
                            </button>
                        )}
                    </div>
                ))}
            </div>

             {/* Timeline Tracks */}
            <div className="flex-grow flex flex-col space-y-1 overflow-y-auto overflow-x-hidden pr-2 relative">
                <div ref={timelineContainerRef} className="h-8 bg-gray-800 rounded-t-lg relative cursor-pointer" onMouseDown={(e) => startInteraction('playhead', e)}>
                    <div className="absolute inset-0 flex justify-between px-2">
                        {[...Array(Math.floor(timeline.totalDuration / 5) + 1)].map((_, i) => (
                            <div key={i} style={{ left: `${(i * 5 / timeline.totalDuration) * 100}%` }} className="absolute h-full flex flex-col items-start">
                                <div className="w-px h-2 bg-gray-500"></div>
                                <span className="text-xs text-gray-500 -ml-1">{i * 5}s</span>
                            </div>
                        ))}
                    </div>
                </div>
            
                <SubtitleTrack timeline={timeline} onUpdate={(updates) => onUpdateCommit({...timeline, ...updates})} duration={timeline.totalDuration} currentTime={currentTime} onSelectSubtitle={onSubtitleSelect} selectedSubtitleId={selectedSubtitleId} />
                {timeline.tracks.map((track) => (
                    <div key={track.id} className="h-12 relative bg-gray-800/50 rounded-r" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDropOnTrack(e, track.id)}>
                        {track.clips.map((clip) => {
                            if (!clip.url && (track.type === 'a-roll' || track.type === 'b-roll')) {
                                return (
                                    <div key={clip.id} style={{ left: `${(clip.startTime / timeline.totalDuration) * 100}%`, width: `${((clip.endTime - clip.startTime) / timeline.totalDuration) * 100}%` }} className="absolute h-full p-1">
                                        <button onClick={() => onAddMediaClick(track.id, clip.sceneIndex, clip.startTime)} className="w-full h-full bg-gray-700/30 rounded border-2 border-dashed border-gray-600 hover:bg-gray-700/50 hover:border-indigo-500 flex items-center justify-center">
                                            <PlusCircleIcon className="w-5 h-5 text-gray-500" />
                                        </button>
                                    </div>
                                )
                            }
                            return (
                                <div 
                                    key={clip.id}
                                    onMouseDown={(e) => startInteraction('drag', e, clip, track.id)}
                                    onClick={(e) => { e.stopPropagation(); onClipSelect(selectedClipId === clip.id ? null : clip.id); }}
                                    className={`absolute h-full rounded flex items-center px-2 overflow-hidden text-xs text-white transition-opacity group ${trackConfig[track.type]?.color || 'bg-gray-600'} ${selectedClipId === clip.id ? 'ring-2 ring-pink-500 z-10' : ''} ${interaction?.clipId === clip.id ? 'opacity-0' : 'opacity-100'} cursor-grab`}
                                    style={{ left: `${(clip.startTime / timeline.totalDuration) * 100}%`, width: `${((clip.endTime - clip.startTime) / timeline.totalDuration) * 100}%` }}
                                >
                                    <span className="truncate">{clip.text || (clip.type === 'image' || clip.type === 'video' ? `Scene ${clip.sceneIndex + 1}` : clip.id)}</span>
                                    {allKeyframes(clip).map((kf, i) => (
                                        <div key={i} className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-pink-400 rounded-full z-30" style={{left: `${(kf.time - clip.startTime) / (clip.endTime - clip.startTime) * 100}%`}}></div>
                                    ))}
                                    <div onMouseDown={(e) => startInteraction('resizeStart', e, clip, track.id)} className="absolute left-0 top-0 w-2 h-full cursor-ew-resize z-10 group-hover:bg-white/20"/>
                                    <div onMouseDown={(e) => startInteraction('resizeEnd', e, clip, track.id)} className="absolute right-0 top-0 w-2 h-full cursor-ew-resize z-10 group-hover:bg-white/20"/>
                                </div>
                            );
                        })}
                        {interaction && interaction.clipId && ghost && (
                            <div className={`absolute h-full rounded flex items-center px-2 overflow-hidden text-xs text-white bg-gray-500/50 border-2 border-dashed border-white pointer-events-none z-20`} style={{ left: `${ghost.left}%`, width: `${ghost.width}%`}}>
                                <span className="truncate">{interaction.clipId}</span>
                            </div>
                        )}
                    </div>
                ))}
                
                {/* Playhead and Snapline */}
                <div 
                    className="absolute top-0 bottom-0 w-1 bg-red-500 cursor-ew-resize z-20" 
                    style={{ left: playheadPosition, transform: 'translateX(-50%)' }}
                    onMouseDown={(e) => startInteraction('playhead', e)}
                >
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-500 rounded-full border-2 border-white" />
                </div>
                 {snapLine !== null && (
                    <div className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-20 pointer-events-none" style={{ left: `${snapLine}%` }}></div>
                )}
            </div>
        </div>
    );
};

export default Timeline;