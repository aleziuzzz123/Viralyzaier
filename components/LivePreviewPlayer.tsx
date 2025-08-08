import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { TimelineState, TimelineClip, Subtitle, SubtitleWord } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { WarningIcon } from './Icons';

interface LivePreviewPlayerProps {
    timeline: TimelineState;
    isPlaying: boolean;
    currentTime: number;
    onTimeUpdate: (time: number) => void;
    onEnded: () => void;
    aspectRatio?: '16/9' | '9/16' | '1/1';
    children?: React.ReactNode;
    selectedClipId: string | null;
    onClipUpdate: (clipId: string, updates: Partial<TimelineClip>) => void;
}

const renderSubtitleStyle = (style: Subtitle['style']): React.CSSProperties => {
    const css: React.CSSProperties = {
        fontFamily: style.fontFamily,
        fontSize: `${style.fontSize}px`,
        fontWeight: style.fontWeight,
        letterSpacing: `${style.letterSpacing}px`,
        lineHeight: style.lineHeight,
        color: style.fill.type === 'color' ? style.fill.color : 'transparent',
    };

    const shadows: string[] = [];
    if (style.outline && style.outline.width > 0) {
        const { color, width } = style.outline;
        // Create a more solid outline effect with text-shadow
        for (let i = 0; i < 360; i += 30) {
          const x = Math.cos(i * Math.PI / 180) * width;
          const y = Math.sin(i * Math.PI / 180) * width;
          shadows.push(`${x}px ${y}px 0 ${color}`);
        }
    }
    if (style.shadow) {
        shadows.push(`${style.shadow.offsetX}px ${style.shadow.offsetY}px ${style.shadow.blur}px ${style.shadow.color}`);
    }
    if (shadows.length > 0) {
        css.textShadow = shadows.join(', ');
    }

    if (style.fill.type === 'gradient' && style.fill.gradient) {
        css.backgroundImage = `linear-gradient(${style.fill.gradient.angle}deg, ${style.fill.gradient.start}, ${style.fill.gradient.end})`;
        css.backgroundClip = 'text';
        css.WebkitBackgroundClip = 'text';
    } else if (style.fill.type === 'texture' && style.fill.texture) {
        css.backgroundImage = `url(${style.fill.texture})`;
        css.backgroundClip = 'text';
        css.WebkitBackgroundClip = 'text';
    }

    return css;
};

const renderWordStyle = (style: SubtitleWord['style'] | undefined): React.CSSProperties => {
    if (!style) return {};
    const css: React.CSSProperties = {};
    if (style.fontWeight) css.fontWeight = style.fontWeight;
    if (style.color) css.color = style.color;
    if (style.isItalic) css.fontStyle = 'italic';
    return css;
};

const getClipFilterStyle = (clip: TimelineClip): string => {
    const filters: string[] = [];
    if(clip.color?.lut) {
      switch(clip.color.lut) {
        case 'cancun': filters.push('sepia(0.2) contrast(1.1) saturate(1.2)'); break;
        case 'vintage': filters.push('sepia(0.5) contrast(0.9) brightness(0.9)'); break;
        case 'noir': filters.push('grayscale(1) contrast(1.3)'); break;
        case 'cyberpunk': filters.push('hue-rotate(-50deg) saturate(1.5) contrast(1.1)'); break;
        case 'corporate': filters.push('saturate(0.9) brightness(1.05)'); break;
      }
    }
    if (clip.color?.adjustments) {
        const { exposure = 0, contrast = 0, saturation = 0, temperature = 0 } = clip.color.adjustments;
        filters.push(`brightness(${1 + exposure / 100})`);
        filters.push(`contrast(${1 + contrast / 100})`);
        filters.push(`saturate(${1 + saturation / 100})`);
        if (temperature > 0) filters.push(`sepia(${temperature / 200})`);
        if (temperature < 0) filters.push(`hue-rotate(${temperature / 10}deg)`);
    }
    return filters.join(' ');
};

const getAnimationClass = (clip: TimelineClip, currentTime: number): string => {
    const animation = clip.animation;
    if (!animation) return '';
    const duration = 0.5; // seconds
    if (animation.in && currentTime >= clip.startTime && currentTime < clip.startTime + duration) {
        return `animate-${animation.in}-in`;
    }
    if (animation.out && currentTime <= clip.endTime && currentTime > clip.endTime - duration) {
        return `animate-${animation.out}-out`;
    }
    return 'opacity-100';
}

const LivePreviewPlayer: React.FC<LivePreviewPlayerProps> = ({
    timeline, isPlaying, currentTime, onTimeUpdate, onEnded, aspectRatio = '16/9', children, selectedClipId, onClipUpdate
}) => {
    const mediaRefs = useRef<Record<string, HTMLMediaElement | null>>({});
    const playerContainerRef = useRef<HTMLDivElement>(null);
    const [mediaErrors, setMediaErrors] = useState<Record<string, string | null>>({});
    const [draggingOverlay, setDraggingOverlay] = useState<{clipId: string, type: 'move' | 'resize' | 'rotate', initialMouseX: number, initialMouseY: number, initialClipData: any} | null>(null);

    const handleMediaError = useCallback((e: React.SyntheticEvent<HTMLMediaElement | HTMLImageElement, Event>, clipId: string) => {
        const media = e.currentTarget as HTMLMediaElement;
        let errorMsg = 'Unknown media error.';
        if (media.error) {
            switch (media.error.code) {
                case media.error.MEDIA_ERR_SRC_NOT_SUPPORTED: errorMsg = 'Media format not supported or file not found.'; break;
            }
        }
        setMediaErrors(prev => ({ ...prev, [clipId]: errorMsg }));
    }, []);

    const allClips = useMemo(() => timeline.tracks.flatMap(t => t.clips), [timeline.tracks]);

    useEffect(() => {
        Object.values(mediaRefs.current).forEach(media => {
            if (media) {
                const clip = allClips.find(c => c.id === media?.id);
                if (!clip || mediaErrors[clip.id]) return;
                
                const isMediaActive = currentTime >= clip.startTime && currentTime <= clip.endTime;
                if (isPlaying && isMediaActive) {
                    if (media.paused) media.play().catch(e => {});
                } else {
                    if (!media.paused) media.pause();
                }
            }
        });
    }, [isPlaying, currentTime, allClips, mediaErrors]);
    
    useEffect(() => {
        Object.values(mediaRefs.current).forEach(media => {
             if (media) {
                const clip = allClips.find(c => c.id === media?.id);
                if (!clip) return;
                const localTime = currentTime - clip.startTime;
                if (localTime >= 0 && localTime < clip.sourceDuration && Math.abs(media.currentTime - localTime) > 0.2) {
                    media.currentTime = localTime;
                }
            }
        });
    }, [currentTime, allClips]);

    const handleOverlayInteractionStart = (e: React.MouseEvent, clip: TimelineClip, type: 'move' | 'resize' | 'rotate') => {
        e.preventDefault();
        e.stopPropagation();
        setDraggingOverlay({
            clipId: clip.id,
            type,
            initialMouseX: e.clientX,
            initialMouseY: e.clientY,
            initialClipData: {
                x: clip.positioning?.x || 50,
                y: clip.positioning?.y || 50,
                width: clip.positioning?.width || 20,
                height: clip.positioning?.height || 20,
                rotation: clip.positioning?.rotation || 0,
            },
        });
    };
    
    const handleOverlayInteractionMove = useCallback((e: MouseEvent) => {
        if (!draggingOverlay || !playerContainerRef.current) return;
        const rect = playerContainerRef.current.getBoundingClientRect();
        const clip = allClips.find(c => c.id === draggingOverlay.clipId);
        if(!clip) return;
        
        let newPositioning = { ...clip.positioning, ...draggingOverlay.initialClipData };

        if (draggingOverlay.type === 'move') {
            const deltaX = (e.clientX - draggingOverlay.initialMouseX) / rect.width * 100;
            const deltaY = (e.clientY - draggingOverlay.initialMouseY) / rect.height * 100;
            newPositioning.x = draggingOverlay.initialClipData.x + deltaX;
            newPositioning.y = draggingOverlay.initialClipData.y + deltaY;
            newPositioning.x = Math.max(0, Math.min(100 - newPositioning.width, newPositioning.x));
            newPositioning.y = Math.max(0, Math.min(100 - newPositioning.height, newPositioning.y));
        } else if (draggingOverlay.type === 'rotate') {
            const centerX = rect.left + (newPositioning.x + newPositioning.width / 2) / 100 * rect.width;
            const centerY = rect.top + (newPositioning.y + newPositioning.height / 2) / 100 * rect.height;
            const initialAngle = Math.atan2(draggingOverlay.initialMouseY - centerY, draggingOverlay.initialMouseX - centerX) * (180 / Math.PI);
            const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
            const angleDelta = currentAngle - initialAngle;
            newPositioning.rotation = (draggingOverlay.initialClipData.rotation + angleDelta + 360) % 360;
        }

        onClipUpdate(draggingOverlay.clipId, { positioning: newPositioning as any });

    }, [draggingOverlay, onClipUpdate, allClips]);

    const handleOverlayInteractionEnd = useCallback(() => {
        setDraggingOverlay(null);
    }, []);

    useEffect(() => {
        if(draggingOverlay) {
            window.addEventListener('mousemove', handleOverlayInteractionMove);
            window.addEventListener('mouseup', handleOverlayInteractionEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleOverlayInteractionMove);
            window.removeEventListener('mouseup', handleOverlayInteractionEnd);
        }
    }, [draggingOverlay, handleOverlayInteractionMove, handleOverlayInteractionEnd]);

    const activeSubtitle = timeline.subtitles.find(s => currentTime >= s.start && currentTime < s.end);
    
    return (
        <div ref={playerContainerRef} className="w-full max-w-full bg-black rounded-lg overflow-hidden relative" style={{ aspectRatio }}>
            {timeline.tracks.map(track => track.clips.map(clip => {
                const isVisible = currentTime >= clip.startTime && currentTime < clip.endTime;
                if (!isVisible) return null;
                const hasError = !!mediaErrors[clip.id];

                const positionStyle: React.CSSProperties = {
                    left: `${clip.positioning?.x || 0}%`,
                    top: `${clip.positioning?.y || 0}%`,
                    width: `${clip.positioning?.width || 100}%`,
                    height: `${clip.positioning?.height || 100}%`,
                    transform: `rotate(${clip.positioning?.rotation || 0}deg) scale(${clip.positioning?.scale || 1})`,
                    zIndex: clip.positioning?.zIndex || (track.type === 'overlay' ? 10 : 1),
                    opacity: clip.opacity
                };

                const baseClasses = 'absolute object-cover';

                if (hasError) {
                    return (
                        <div key={clip.id} style={positionStyle} className={`${baseClasses} bg-red-900/50 flex flex-col items-center justify-center text-red-300 p-2`}>
                            <WarningIcon className="w-8 h-8" />
                            <p className="text-sm font-bold text-center mt-2">Media Error</p>
                            <p className="text-xs text-center mt-1">{mediaErrors[clip.id]}</p>
                        </div>
                    );
                }
                
                if (!clip.url?.trim()) return null;
                const filterStyle = { filter: getClipFilterStyle(clip) };
                const animationClass = getAnimationClass(clip, currentTime);
                const isVideo = clip.type === 'video' || clip.url.includes('.mp4') || clip.url.includes('.webm') || clip.url.includes('giphy');
                
                if (track.type === 'voiceover' || track.type === 'music' || track.type === 'sfx') {
                     return <audio key={clip.id} id={clip.id} ref={el => { mediaRefs.current[clip.id] = el; if(el) el.volume = clip.volume * (track.type === 'voiceover' ? timeline.voiceoverVolume : track.type === 'music' ? timeline.musicVolume : 1); }} src={clip.url} onError={(e) => handleMediaError(e, clip.id)} />
                }

                 return (
                    <div 
                        key={clip.id} 
                        style={positionStyle} 
                        className={`${baseClasses} ${selectedClipId === clip.id ? 'outline outline-2 outline-pink-500 outline-offset-2' : ''} ${track.type === 'overlay' ? 'cursor-move' : ''} ${animationClass}`}
                        onMouseDown={(e) => track.type === 'overlay' && handleOverlayInteractionStart(e, clip, 'move')}
                    >
                        {isVideo ? (
                            <video id={clip.id} ref={el => { mediaRefs.current[clip.id] = el }} src={clip.url} muted loop style={filterStyle} className="w-full h-full" onError={(e) => handleMediaError(e, clip.id)}/>
                        ) : (
                            <img id={clip.id} src={clip.url} style={filterStyle} className="w-full h-full" onError={(e) => handleMediaError(e, clip.id)} />
                        )}
                         {track.type === 'overlay' && selectedClipId === clip.id && (
                            <>
                                <div className="absolute -top-1 -left-1 w-3 h-3 bg-white rounded-full border-2 border-pink-500 cursor-nwse-resize"></div>
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full border-2 border-pink-500 cursor-nesw-resize"></div>
                                <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-white rounded-full border-2 border-pink-500 cursor-nesw-resize"></div>
                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white rounded-full border-2 border-pink-500 cursor-nwse-resize"></div>
                                <div onMouseDown={(e) => handleOverlayInteractionStart(e, clip, 'rotate')} className="absolute -top-5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full border-2 border-pink-500 cursor-alias" title="Rotate"></div>
                            </>
                        )}
                    </div>
                 );
            }))}
            
            {activeSubtitle && (
                 <div className="absolute bottom-[15%] left-1/2 -translate-x-1/2 w-[90%] pointer-events-none z-20">
                    <p style={renderSubtitleStyle(activeSubtitle.style)} className="text-center drop-shadow-lg">
                        {activeSubtitle.words?.length ? activeSubtitle.words?.map((word, index) => (
                            <span key={index} style={renderWordStyle(word.style)}>{word.word}&nbsp;</span>
                        )) : activeSubtitle.text}
                    </p>
                </div>
            )}

            {children}
        </div>
    );
};

export default LivePreviewPlayer;
