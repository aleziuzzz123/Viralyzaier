// components/LivePreviewPlayer.tsx
import React, { useRef, useEffect, useState } from 'react';
import { TimelineState, TimelineClip } from '../types';

interface LivePreviewPlayerProps {
    timeline: TimelineState;
    isPlaying: boolean;
    currentTime: number;
    onTimeUpdate: (time: number) => void;
    onEnded: () => void;
    aspectRatio?: '16/9' | '9/16';
}

const LivePreviewPlayer: React.FC<LivePreviewPlayerProps> = ({
    timeline,
    isPlaying,
    currentTime,
    onTimeUpdate,
    onEnded,
    aspectRatio = '16/9'
}) => {
    const mediaRefs = useRef<Record<string, HTMLMediaElement | null>>({});
    const animationFrameRef = useRef<number | null>(null);
    const [masterClockId, setMasterClockId] = useState<string | null>(null);

    const aRollTrack = timeline.tracks.find(t => t.type === 'a-roll');
    const bRollTrack = timeline.tracks.find(t => t.type === 'b-roll');
    const voiceoverTrack = timeline.tracks.find(t => t.type === 'voiceover');
    const musicTrack = timeline.tracks.find(t => t.type === 'music');
    const sfxTrack = timeline.tracks.find(t => t.type === 'sfx');
    const allClips = timeline.tracks.flatMap(t => t.clips);
    
    useEffect(() => {
        // The first voiceover clip is the most reliable master clock
        const firstVoiceoverClip = voiceoverTrack?.clips.find(c => c.url);
        setMasterClockId(firstVoiceoverClip?.id || null);
    }, [voiceoverTrack]);

    const updateCurrentTime = () => {
        const masterClock = masterClockId ? mediaRefs.current[masterClockId] : null;
        if (masterClock && !masterClock.paused) {
            onTimeUpdate(masterClock.currentTime);
            animationFrameRef.current = requestAnimationFrame(updateCurrentTime);
        }
    };
    
    useEffect(() => {
        Object.values(mediaRefs.current).forEach(media => {
            if (media) {
                if (isPlaying) {
                    // Start playback only if the playhead is within the clip's duration
                    const clip = allClips.find(c => c.id === media?.id);
                    if (clip && currentTime >= clip.startTime && currentTime <= clip.endTime) {
                         media.play().catch(e => console.error("Playback error:", e));
                    }
                } else {
                    media.pause();
                }
            }
        });

        if (isPlaying) {
            animationFrameRef.current = requestAnimationFrame(updateCurrentTime);
        } else {
            if (animationFrameRef.current !== null) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        }

        return () => {
            if (animationFrameRef.current !== null) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isPlaying]);
    
    // Sync all clips to the master clock
    useEffect(() => {
        Object.values(mediaRefs.current).forEach(media => {
            if (media && Math.abs(media.currentTime - currentTime) > 0.2) { // Tolerance of 200ms
                media.currentTime = currentTime;
            }
        });
    }, [currentTime]);

    const activeSubtitle = isPlaying ? timeline.subtitles.find(s => currentTime >= s.start && currentTime < s.end) : null;
    
    return (
        <div className="w-full bg-black rounded-lg overflow-hidden relative" style={{ aspectRatio }}>
            {/* Render A-Roll */}
            {aRollTrack?.clips.map(clip => {
                 const isVisible = currentTime >= clip.startTime && currentTime < clip.endTime;
                 if (!isVisible || !clip.url) return null;
                 return clip.type === 'video' ? (
                    <video key={clip.id} id={clip.id} ref={el => { mediaRefs.current[clip.id] = el }} src={clip.url} muted className="absolute inset-0 w-full h-full object-cover"/>
                 ) : (
                    <img key={clip.id} id={clip.id} src={clip.url} className="absolute inset-0 w-full h-full object-cover"/>
                 )
            })}
            
            {/* Render B-Roll */}
             {bRollTrack?.clips.map(clip => {
                 const isVisible = currentTime >= clip.startTime && currentTime < clip.endTime;
                 if (!isVisible || !clip.url) return null;
                 return <video key={clip.id} id={clip.id} ref={el => { mediaRefs.current[clip.id] = el }} src={clip.url} muted className="absolute inset-0 w-full h-full object-cover"/>
            })}

            {/* Render Subtitles */}
            {activeSubtitle && (
                 <div className="absolute bottom-12 left-1/2 -translate-x-1/2 p-2 rounded-lg" style={{ backgroundColor: activeSubtitle.style.backgroundColor }}>
                    <p className="text-xl font-bold text-center" style={{ color: activeSubtitle.style.color }}>
                        {activeSubtitle.words?.map((word, index) => (
                            <span key={index} className={`inline-block transition-opacity duration-200 ${currentTime * 1000 >= (activeSubtitle.start * 1000 + word.start) ? 'opacity-100' : 'opacity-0'}`}>
                                {word.word}&nbsp;
                            </span>
                        ))}
                    </p>
                </div>
            )}
            
            {/* Audio Elements (not visible) */}
             {voiceoverTrack?.clips.map(clip => clip.url && <audio key={clip.id} id={clip.id} ref={el => {
                mediaRefs.current[clip.id] = el;
                if (el) el.volume = timeline.voiceoverVolume;
                if (el && clip.id === masterClockId) el.onended = () => onEnded();
             }} src={clip.url} />)}
             {musicTrack?.clips.map(clip => clip.url && <audio key={clip.id} id={clip.id} ref={el => {
                 mediaRefs.current[clip.id] = el;
                 if(el) el.volume = timeline.musicVolume;
             }} src={clip.url} loop/>)}
             {sfxTrack?.clips.map(clip => clip.url && <audio key={clip.id} id={clip.id} ref={el => {
                 mediaRefs.current[clip.id] = el;
                 if (el) el.volume = timeline.voiceoverVolume; // Use main volume for SFX
             }} src={clip.url}/>)}
        </div>
    );
};

export default LivePreviewPlayer;