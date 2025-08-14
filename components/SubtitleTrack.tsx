import React, { useState, useRef, useEffect } from 'react';
import { Subtitle, TimelineState } from '../types';

interface SubtitleTrackProps {
    timeline: TimelineState;
    onUpdate: (updates: Partial<TimelineState>) => void;
    duration: number;
    onSelectSubtitle: (id: string | null) => void;
    selectedSubtitleId: string | null;
}

const SubtitleTrack: React.FC<SubtitleTrackProps> = ({ timeline, onUpdate, duration, onSelectSubtitle, selectedSubtitleId }) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingId && inputRef.current) {
            inputRef.current.focus();
        }
    }, [editingId]);

    const handleStartEditing = (sub: Subtitle) => {
        setEditingId(sub.id);
        setEditText(sub.text);
    };

    const handleSaveEdit = () => {
        if (!editingId) return;
        const newSubtitles = timeline.subtitles.map((s: Subtitle) => s.id === editingId ? { ...s, text: editText } : s);
        onUpdate({ subtitles: newSubtitles });
        setEditingId(null);
    };

    return (
        <div className="relative w-full h-12 bg-gray-800 rounded-md my-1">
            {(timeline.subtitles || []).map((sub: Subtitle) => {
                if (typeof sub.start !== 'number' || typeof sub.end !== 'number' || duration === 0) return null;
                const left = (sub.start / duration) * 100;
                const width = ((sub.end - sub.start) / duration) * 100;
                const isSelected = selectedSubtitleId === sub.id;

                return (
                    <div 
                        key={sub.id} 
                        className={`absolute h-full p-1 cursor-pointer group ${isSelected ? 'ring-2 ring-indigo-400 z-10' : ''}`}
                        style={{ left: `${left}%`, width: `${width}%` }}
                        onClick={() => onSelectSubtitle(sub.id)}
                        onDoubleClick={() => handleStartEditing(sub)}
                    >
                        <div className="w-full h-full bg-indigo-600/50 rounded-sm flex items-center justify-center overflow-hidden">
                            {editingId === sub.id ? (
                                <input 
                                    ref={inputRef}
                                    type="text"
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    onBlur={handleSaveEdit}
                                    onKeyDown={(e) => { 
                                        if (e.key === 'Enter') handleSaveEdit(); 
                                        if (e.key === 'Escape') setEditingId(null); 
                                    }}
                                    className="w-full h-full bg-indigo-800 text-white text-xs text-center border-0 outline-none p-0"
                                />
                            ) : (
                                <p className="text-white text-xs truncate px-1">{sub.text}</p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default SubtitleTrack;