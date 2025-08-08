import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { TimelineState, TimelineClip, Subtitle, SubtitleWord, KeyframeableProperty } from '../types.ts';
import { useAppContext } from '../contexts/AppContext.tsx';
import { WarningIcon } from './Icons.tsx';

// Helper to interpolate keyframe values
const interpolateKeyframes = (keyframes: { time: number; value: number }[] | undefined, currentTime: number, defaultValue: number): number => {
    if (!keyframes || keyframes.length === 0) return defaultValue;
    if (keyframes.length === 1) return keyframes[0].value;

    if (currentTime <= keyframes[0].time) return keyframes[0].value;
    if (currentTime >= keyframes[keyframes.length - 1].time) return keyframes[keyframes.length - 1].value;

    const nextKfIndex = keyframes.findIndex(kf => kf.time > currentTime);
    const prevKf = keyframes[nextKfIndex - 1];
    const nextKf = keyframes[nextKfIndex];

    if (!prevKf || !nextKf) return defaultValue;

    const progress = (currentTime - prevKf.time) / (nextKf.time - prevKf.time);
    return prevKf.value + (nextKf.value - prevKf.value) * progress;
};


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
        for (let i = 0; i < 360; i += 30) {
          const x = Math.cos(i * Math.PI / 180) * width;
          const y = Math.sin(i * Math.PI / 180) * width;
          shadows.push(`${x}px ${y}px 0 ${color}`);
        }
    }
    if (style.shadow) {
        shadows.push(`${style.shadow.offsetX}px ${style.shadow.offsetY}px ${style.shadow.blur}px ${style.shadow.color}`);
    }
    if (shadows.length > 0) { css.textShadow = shadows.join(', '); }

    if (style.fill.type === 'gradient' && style.fill.gradient) {
        css.backgroundImage = `linear-gradient(${style.fill.gradient.angle}deg, ${style.fill.gradient.start}, ${style.fill.gradient.end})`;
        css.backgroundClip = 'text';
    } else if (style.fill.type === 'texture' && style.fill.texture) {
        css.backgroundImage = `url(${style.fill.texture})`;
        css.backgroundClip = 'text';
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
      }
    }
    if (clip.color?.adjustments) {
        const { exposure = 0, contrast = 0, saturation = 0 } = clip.color.adjustments;
        filters.push(`brightness(${1 + exposure / 100})`);
        filters.push(`contrast(${1 + contrast / 100})`);
        filters.push(`saturate(${1 + saturation / 100})`);
    }
    return filters.join(' ');
};

const LivePreviewPlayer: React.FC<LivePreviewPlayerProps> = ({
    timeline, isPlaying, currentTime, onTimeUpdate, onEnded, aspectRatio = '16/9', children, selectedClipId, onClipUpdate
}) => {
    const mediaRefs = useRef<Record<string, HTMLMediaElement | null>>({});
    const playerContainerRef = useRef<HTMLDivElement>(null);
    const [mediaErrors, setMediaErrors] = useState<Record<string, string | null>>({});

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

    const activeSubtitle = timeline.subtitles.find(s => currentTime >= s.start && currentTime < s.end);
    
    return (
        <div ref={playerContainerRef} className="w-full max-w-full bg-black rounded-lg overflow-hidden relative" style={{ aspectRatio }}>
            {timeline.tracks.map(track => track.clips.map(clip => {
                const isVisible = currentTime >= clip.startTime && currentTime < clip.endTime;
                if (!isVisible) return null;
                const hasError = !!mediaErrors[clip.id];

                // Keyframe Interpolation
                const scale = interpolateKeyframes(clip.keyframes?.scale, currentTime, clip.positioning?.scale ?? 1);
                const x = interpolateKeyframes(clip.keyframes?.x, currentTime, clip.positioning?.x ?? 0);
                const y = interpolateKeyframes(clip.keyframes?.y, currentTime, clip.positioning?.y ?? 0);
                const rotation = interpolateKeyframes(clip.keyframes?.rotation, currentTime, clip.positioning?.rotation ?? 0);
                const opacity = interpolateKeyframes(clip.keyframes?.opacity, currentTime, clip.opacity ?? 1);

                const positionStyle: React.CSSProperties = {
                    left: `${x}%`,
                    top: `${y}%`,
                    width: `${clip.positioning?.width || 100}%`,
                    height: `${clip.positioning?.height || 100}%`,
                    transform: `translateX(-50%) translateY(-50%) rotate(${rotation}deg) scale(${scale})`,
                    zIndex: clip.positioning?.zIndex || (track.type === 'overlay' ? 10 : 1),
                    opacity: opacity
                };

                const baseClasses = 'absolute object-cover';

                if (hasError) {
                    return (
                        <div key={clip.id} style={positionStyle} className={`${baseClasses} bg-red-900/50 flex flex-col items-center justify-center text-red-300 p-2`}>
                            <WarningIcon className="w-8 h-8" /><p className="text-sm font-bold text-center mt-2">Media Error</p><p className="text-xs text-center mt-1">{mediaErrors[clip.id]}</p>
                        </div>
                    );
                }
                
                if (!clip.url?.trim() && clip.type !== 'text') return null;
                const filterStyle = { filter: getClipFilterStyle(clip) };
                const isVideo = clip.type === 'video' || clip.url.includes('.mp4') || clip.url.includes('.webm') || clip.url.includes('giphy');
                const kenBurnsClass = clip.effects?.kenBurns ? `ken-burns-${clip.effects.kenBurns.direction}` : '';
                const animationDuration = `${clip.endTime - clip.startTime}s`;

                if (track.type === 'voiceover' || track.type === 'music' || track.type === 'sfx') {
                     return <audio key={clip.id} id={clip.id} ref={el => { mediaRefs.current[clip.id] = el; if(el) el.volume = interpolateKeyframes(clip.keyframes?.volume, currentTime, clip.volume); }} src={clip.url} onError={(e) => handleMediaError(e, clip.id)} />
                }
                
                 if (clip.type === 'text') {
                    return (
                        <div key={clip.id} style={positionStyle} className={`${baseClasses} flex items-center justify-center p-4`}>
                            <p style={renderSubtitleStyle(clip.style as Subtitle['style'])} className="text-center">{clip.text}</p>
                        </div>
                    )
                }

                 return (
                    <div key={clip.id} style={positionStyle} className={`${baseClasses} ${selectedClipId === clip.id ? 'outline outline-2 outline-pink-500 outline-offset-2' : ''} ${track.type === 'overlay' ? 'cursor-move' : ''}`}>
                        {isVideo ? (
                            <video id={clip.id} ref={el => { mediaRefs.current[clip.id] = el }} src={clip.url} muted loop style={filterStyle} className={`w-full h-full ${kenBurnsClass}`} onError={(e) => handleMediaError(e, clip.id)}/>
                        ) : (
                            <img id={clip.id} src={clip.url} style={{...filterStyle, animationDuration}} className={`w-full h-full ${kenBurnsClass}`} onError={(e) => handleMediaError(e, clip.id)} />
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