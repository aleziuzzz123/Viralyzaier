import React, { useState, useRef, useEffect } from 'react';
import { Subtitle, TimelineState } from '../types';
import { PaintBrushIcon } from './Icons';

interface SubtitleTrackProps {
    timeline: TimelineState;
    onUpdate: (updates: Partial<TimelineState>) => void;
    duration: number;
    isPlaying: boolean;
    currentTime: number;
}

const AnimatedSubtitle: React.FC<{ subtitle: Subtitle, isVisible: boolean }> = ({ subtitle, isVisible }) => {
    if (!isVisible) return null;

    return (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 p-2 rounded-lg" style={{ backgroundColor: subtitle.style.backgroundColor }}>
            <p className="text-xl font-bold text-center" style={{ color: subtitle.style.color }}>
                {subtitle.words?.map((word, index) => (
                    <span key={index} className="inline-block" style={{
                        animation: `word-fade-in 0.2s ease-out forwards`,
                        animationDelay: `${word.start}ms`,
                        opacity: 0,
                    }}>
                        {word.word}&nbsp;
                    </span>
                ))}
            </p>
             <style>{`
                @keyframes word-fade-in {
                    to { opacity: 1; }
                }
            `}</style>
        </div>
    );
};


const SubtitleTrack: React.FC<SubtitleTrackProps> = ({ timeline, onUpdate, duration, isPlaying, currentTime }) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const [stylePopoverId, setStylePopoverId] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (editingId && inputRef.current) {
            inputRef.current.focus();
        }
    }, [editingId]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setStylePopoverId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleStartEditing = (sub: Subtitle) => {
        setEditingId(sub.id);
        setEditText(sub.text);
    };

    const handleSaveEdit = () => {
        if (!editingId) return;
        const newSubtitles = timeline.subtitles.map(s => s.id === editingId ? { ...s, text: editText } : s);
        onUpdate({ subtitles: newSubtitles });
        setEditingId(null);
    };

    const handleStyleChange = (id: string, field: 'color' | 'backgroundColor', value: string) => {
        const newSubtitles = timeline.subtitles.map(s => s.id === id ? { ...s, style: { ...s.style, [field]: value } } : s);
        onUpdate({ subtitles: newSubtitles });
    };

    if (duration === 0) return null; // Prevent division by zero
    
    const activeSubtitle = isPlaying ? timeline.subtitles.find(s => currentTime >= s.start && currentTime < s.end) : null;


    return (
        <div className="w-full h-10 bg-gray-900/50 rounded relative">
            {timeline.subtitles.map(sub => (
                <div 
                    key={sub.id} 
                    style={{ 
                        left: `${(sub.start / duration) * 100}%`, 
                        width: `${((sub.end - sub.start) / duration) * 100}%` 
                    }} 
                    className="absolute h-full p-1 group" 
                >
                    <div className="w-full h-full bg-indigo-500/80 rounded text-white text-[10px] px-1 overflow-hidden flex items-center" onClick={() => handleStartEditing(sub)}>
                        {editingId === sub.id ? (
                            <input 
                                ref={inputRef}
                                type="text" 
                                value={editText} 
                                onChange={e => setEditText(e.target.value)} 
                                onBlur={handleSaveEdit} 
                                onKeyDown={e => {
                                    if(e.key === 'Enter') handleSaveEdit();
                                    if(e.key === 'Escape') setEditingId(null);
                                }}
                                className="w-full h-full bg-transparent outline-none text-[10px]" 
                            />
                        ) : ( 
                            <span className="truncate">{sub.text}</span>
                        )}
                    </div>
                    <button 
                        onClick={() => setStylePopoverId(prev => prev === sub.id ? null : sub.id)} 
                        className="absolute -top-2 -right-2 p-0.5 bg-gray-600 rounded-full text-white hover:bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <PaintBrushIcon className="w-3 h-3"/>
                    </button>
                     {stylePopoverId === sub.id && (
                        <div ref={popoverRef} className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-950 p-2 rounded-lg border border-gray-700 z-10 space-y-2">
                            <label className="flex items-center gap-2 text-xs text-white">
                                Text:
                                <input type="color" value={sub.style.color} onChange={e => handleStyleChange(sub.id, 'color', e.target.value)} className="w-8 h-6 bg-transparent border-none cursor-pointer" />
                            </label>
                            <label className="flex items-center gap-2 text-xs text-white">
                                BG:
                                <input type="color" value={sub.style.backgroundColor} onChange={e => handleStyleChange(sub.id, 'backgroundColor', e.target.value)} className="w-8 h-6 bg-transparent border-none cursor-pointer" />
                            </label>
                        </div>
                     )}
                </div>
            ))}
             {activeSubtitle && <AnimatedSubtitle subtitle={activeSubtitle} isVisible={isPlaying} />}
        </div>
    );
};

export default SubtitleTrack;