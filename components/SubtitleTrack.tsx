import React, { useState, useRef, useEffect } from 'react';
import { Subtitle, TimelineState } from '../types.ts';

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
    
    const handleSubtitleClick = (e: React.MouseEvent, subId: string) => {
        e.stopPropagation();
        onSelectSubtitle(selectedSubtitleId === subId ? null : subId);
    };

    if (duration === 0) return null; // Prevent division by zero

    return (
        <div className="w-full h-12 bg-gray-900/50 rounded relative">
            {timeline.subtitles.map((sub: Subtitle) => (
                <div 
                    key={sub.id} 
                    style={{ 
                        left: `${(sub.start / duration) * 100}%`, 
                        width: `${((sub.end - sub.start) / duration) * 100}%` 
                    }} 
                    className="absolute h-full p-1 group" 
                >
                    <div 
                        className={`w-full h-full bg-indigo-500/80 rounded text-white text-xs px-2 overflow-hidden flex items-center cursor-pointer transition-all ${selectedSubtitleId === sub.id ? 'ring-2 ring-pink-500' : ''}`} 
                        onClick={(e) => handleSubtitleClick(e, sub.id)}
                        onDoubleClick={() => handleStartEditing(sub)}
                    >
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
                                className="w-full h-full bg-transparent outline-none text-xs" 
                            />
                        ) : ( 
                            <span className="truncate">{sub.text}</span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default SubtitleTrack;