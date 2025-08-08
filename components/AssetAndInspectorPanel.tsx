import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Project, TimelineState, TimelineClip, Subtitle, SubtitleWord, KeyframeableProperty } from '../types.ts';
import { useAppContext } from '../contexts/AppContext.tsx';
import { SparklesIcon, FilmIcon, PhotoIcon, SearchIcon, UploadIcon, WandSparklesIcon, PaintBrushIcon, SpeakerWaveIcon, FontSizeIcon, LetterSpacingIcon, TypeIcon, MusicNoteIcon, ViewColumnsIcon } from './Icons.tsx';
import { emphasizeSubtitleText } from '../services/geminiService.ts';
import * as vfxService from '../services/vfxService.ts';
import { generateAnimatedImage, generateAiMusic, generateSfx } from '../services/generativeMediaService.ts';
import { uploadFile } from '../services/supabaseService.ts';
import { getErrorMessage } from '../utils.ts';
import { v4 as uuidv4 } from 'uuid';
import { loadGoogleFont } from '../services/fontService.ts';

const DiamondIcon: React.FC<{isActive: boolean, onClick: () => void, className?: string}> = ({ isActive, onClick, className }) => (
    <button onClick={onClick} className={`w-5 h-5 flex items-center justify-center transition-colors ${className}`} title="Toggle keyframe">
        <svg viewBox="0 0 24 24" className={`w-3 h-3 transform transition-all ${isActive ? 'fill-pink-500' : 'fill-gray-600 hover:fill-pink-400'}`}>
            <path d="M12 2 L2 12 L12 22 L22 12 Z" />
        </svg>
    </button>
);

const NumberInput: React.FC<{label: string, value: number, onChange: (v:string) => void, disabled?: boolean, step?: number, icon?: React.ReactNode, onKeyframeToggle?: () => void, isKeyframed?: boolean}> = ({label, value, onChange, disabled, step = 1, icon, onKeyframeToggle, isKeyframed}) => (
    <div className="flex items-end gap-1">
        {onKeyframeToggle && <DiamondIcon isActive={isKeyframed ?? false} onClick={onKeyframeToggle} />}
        <div className="flex-grow">
            <label className="text-xs text-gray-400 flex items-center gap-1">{icon}{label}</label>
            <input type="number" value={value.toFixed(2)} step={step} onChange={e => onChange(e.target.value)} disabled={disabled} className="w-full mt-1 bg-gray-900 rounded-md p-2 text-sm text-white border border-gray-600 disabled:opacity-50" />
        </div>
    </div>
);

const SliderInput: React.FC<{label: string, value: number, onChange: (v:string) => void, min?: number, max?: number, step?: number, onKeyframeToggle?: () => void, isKeyframed?: boolean}> = ({label, value, onChange, min = 0, max = 100, step = 1, onKeyframeToggle, isKeyframed}) => (
    <div className="flex items-end gap-1">
        {onKeyframeToggle && <DiamondIcon isActive={isKeyframed ?? false} onClick={onKeyframeToggle} />}
        <div className="flex-grow">
            <label className="text-xs text-gray-400 flex justify-between"><span>{label}</span> <span>{label === 'Volume' || label === 'Opacity' ? Math.round(value * 100) : value}</span></label>
            <input type="range" value={value} min={min} max={max} step={step} onChange={e => onChange(e.target.value)} className="w-full mt-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-sm" />
        </div>
    </div>
);

const SelectInput: React.FC<{label: string, value: string, onChange: (v:string) => void, options: string[], optionStyles?: {[key: string]: React.CSSProperties} }> = ({label, value, onChange, options, optionStyles}) => (
    <div>
        <label className="text-xs text-gray-400">{label}</label>
        <select value={value} onChange={e => onChange(e.target.value)} className="w-full mt-1 bg-gray-900 rounded-md p-2 text-sm text-white border border-gray-600">
            {options.map(opt => <option key={opt} value={opt} style={optionStyles?.[opt]}>{opt.split(',')[0]}</option>)}
        </select>
    </div>
);

interface InspectorProps {
    project: Project;
    selectedClip: TimelineClip | null;
    selectedSubtitle: Subtitle | null;
    onUpdateClip: (clipId: string, updates: Partial<TimelineClip>) => void;
    onUpdateSubtitle: (subtitleId: string, updates: Partial<Subtitle>) => void;
    currentTime: number;
}

const Inspector: React.FC<InspectorProps> = ({ project, selectedClip, selectedSubtitle, onUpdateClip, onUpdateSubtitle, currentTime }) => {
    const { consumeCredits, addToast, fonts } = useAppContext();
    const [activeTab, setActiveTab] = useState<'transform' | 'effects' | 'color' | 'audio'>('transform');
    const [isEmphasizing, setIsEmphasizing] = useState(false);

    // Text Inspector Logic
    const handleSubtitleChange = (field: keyof Subtitle['style'], value: any) => {
        if (!selectedSubtitle) return;
        if (field === 'fontFamily') {
            loadGoogleFont(value);
        }
        onUpdateSubtitle(selectedSubtitle.id, { style: { ...selectedSubtitle.style, [field]: value } });
    };
    
    const handleNestedSubtitleChange = (field: 'fill' | 'outline' | 'shadow', subField: string, value: any) => {
        if (!selectedSubtitle) return;
        const newStyle = { ...selectedSubtitle.style, [field]: { ...(selectedSubtitle.style[field as ('fill' | 'outline' | 'shadow')] || {}), [subField]: value }};
        onUpdateSubtitle(selectedSubtitle.id, { style: newStyle as any });
    };

    const applyTextStylePreset = (preset: 'mrbeast' | 'hormozi') => {
        if (!selectedSubtitle) return;
        let newStyle: Subtitle['style'];
        if (preset === 'mrbeast') {
            newStyle = { ...selectedSubtitle.style, fontFamily: 'Arial Black, sans-serif', fontWeight: 900, fontSize: 52, outline: { color: '#000000', width: 5 }, fill: { type: 'color', color: '#FFFFFF' } };
        } else { // Hormozi
            newStyle = { ...selectedSubtitle.style, fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 48, fill: { type: 'color', color: '#22c55e' } };
        }
        onUpdateSubtitle(selectedSubtitle.id, { style: newStyle });
    };
    
    const handleAiEmphasize = async () => {
        if (!selectedSubtitle) return;
        if (!await consumeCredits(1)) return;
        setIsEmphasizing(true);
        try {
            const emphasizedWords = await emphasizeSubtitleText(selectedSubtitle.text);
            const originalWords = selectedSubtitle.words || [];
            
            const newWords = originalWords.map(word => {
                const emphasis = emphasizedWords.find(eWord => eWord.word === word.word);
                return emphasis ? { ...word, style: { ...word.style, ...emphasis.style } } : word;
            });
            onUpdateSubtitle(selectedSubtitle.id, { words: newWords });
            addToast("Emphasis applied!", "success");
        } catch(e) {
            addToast(getErrorMessage(e), 'error');
        } finally {
            setIsEmphasizing(false);
        }
    };
    
    // Clip Inspector Logic
    const handleNumericChange = (field: KeyframeableProperty, value: string) => {
        if (!selectedClip) return;
        const numericValue = parseFloat(value);
        if (!isNaN(numericValue)) {
            if(['x', 'y', 'scale', 'rotation'].includes(field)) {
                 onUpdateClip(selectedClip.id, { positioning: { ...(selectedClip.positioning || {}), [field]: numericValue } as any });
            } else {
                 onUpdateClip(selectedClip.id, { [field]: numericValue });
            }
        }
    };

    const handleKeyframeToggle = (property: KeyframeableProperty) => {
        if (!selectedClip) return;
        const existingKeyframes = selectedClip.keyframes?.[property] || [];
        const keyframeAtCurrentTime = existingKeyframes.find(kf => Math.abs(kf.time - currentTime) < 0.01);

        let newKeyframes;
        if (keyframeAtCurrentTime) {
            newKeyframes = existingKeyframes.filter(kf => Math.abs(kf.time - currentTime) >= 0.01);
        } else {
            const currentValue = ['x', 'y', 'scale', 'rotation'].includes(property) 
                ? selectedClip.positioning?.[property as 'x'] 
                : selectedClip[property as 'opacity'];
            newKeyframes = [...existingKeyframes, { time: currentTime, value: currentValue as number }].sort((a, b) => a.time - b.time);
        }
        onUpdateClip(selectedClip.id, { keyframes: { ...selectedClip.keyframes, [property]: newKeyframes } });
    };
    
    const hasKeyframe = (property: KeyframeableProperty) => {
        return selectedClip?.keyframes?.[property]?.some(kf => Math.abs(kf.time - currentTime) < 0.01) ?? false;
    };

    const handleColorAdjustmentChange = (field: keyof NonNullable<TimelineClip['color']>['adjustments'], value: string) => {
        if (!selectedClip) return;
        const numericValue = parseFloat(value);
        if (!isNaN(numericValue)) {
            const newColor = { ...(selectedClip.color || {}), adjustments: { ...(selectedClip.color?.adjustments || {}), [field]: numericValue } };
            onUpdateClip(selectedClip.id, { color: newColor as any });
        }
    };
    
    const handleAiEffect = async (effect: 'backgroundRemoved' | 'retouch') => {
        if (!selectedClip) return;
        const cost = effect === 'backgroundRemoved' ? 5 : 2;
        if (!await consumeCredits(cost)) return;
        addToast(`Applying ${effect}...`, 'info');
        try {
            const serviceFunc = effect === 'backgroundRemoved' ? vfxService.removeBackground : vfxService.applyRetouch;
            const newUrl = await serviceFunc(selectedClip.url);
            onUpdateClip(selectedClip.id, { url: newUrl, aiEffects: { ...(selectedClip.aiEffects || {}), [effect]: true }});
            addToast(`${effect} applied!`, 'success');
        } catch (e) { addToast(getErrorMessage(e), 'error'); }
    };

    const handleAudioEffect = async (effect: 'enhance') => {
        if(!selectedClip) return;
        if (!await consumeCredits(2)) return;
        addToast('Applying AI audio enhancement...', 'info');
        try {
            const newUrl = await vfxService.applyAudioEnhance(selectedClip.url);
            onUpdateClip(selectedClip.id, { url: newUrl, audio: { ...(selectedClip.audio || {}), enhance: true } });
            addToast('Audio enhanced!', 'success');
        } catch(e) { addToast(getErrorMessage(e), 'error'); }
    }
    
    // RENDER LOGIC
    if (selectedSubtitle) {
        const fontOptions = ['Inter, sans-serif', ...fonts.map(f => f.family)];
        return (
            <div className="p-4 space-y-4">
                <h4 className="font-bold text-white text-lg border-b border-gray-700 pb-2">Text Inspector</h4>
                <div className="space-y-3">
                    <h5 className="font-semibold text-gray-300 text-sm">Viral Style Library</h5>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => applyTextStylePreset('mrbeast')} className="p-2 text-xs bg-gray-700 rounded text-center hover:bg-indigo-600">MrBeast Style</button>
                        <button onClick={() => applyTextStylePreset('hormozi')} className="p-2 text-xs bg-gray-700 rounded text-center hover:bg-indigo-600">Hormozi Style</button>
                    </div>
                </div>
                 <div className="space-y-3">
                    <h5 className="font-semibold text-gray-300 text-sm">AI Tools</h5>
                     <button onClick={handleAiEmphasize} disabled={isEmphasizing} className="w-full p-2 text-xs bg-gray-700 rounded text-center hover:bg-indigo-600 disabled:opacity-50 flex items-center justify-center gap-2">
                        <SparklesIcon className="w-4 h-4" /> {isEmphasizing ? 'Emphasizing...' : 'AI Emphasize (1 Cr)'}
                    </button>
                </div>
                <div className="space-y-3">
                    <h5 className="font-semibold text-gray-300 text-sm">Font Control</h5>
                    <SelectInput 
                        label="Font Family"
                        value={selectedSubtitle.style.fontFamily}
                        onChange={v => handleSubtitleChange('fontFamily', v)}
                        options={fontOptions}
                        optionStyles={fontOptions.reduce((acc, font) => ({ ...acc, [font]: { fontFamily: font } }), {})}
                    />
                    <div className="grid grid-cols-2 gap-2">
                        <NumberInput icon={<FontSizeIcon className="w-4 h-4"/>} label="Size" value={selectedSubtitle.style.fontSize} onChange={v => handleSubtitleChange('fontSize', parseFloat(v))} />
                        <NumberInput icon={<LetterSpacingIcon className="w-4 h-4"/>} label="Spacing" value={selectedSubtitle.style.letterSpacing} onChange={v => handleSubtitleChange('letterSpacing', parseFloat(v))} />
                    </div>
                </div>
                 <div className="space-y-3">
                    <h5 className="font-semibold text-gray-300 text-sm">Advanced Styling</h5>
                    <div className="grid grid-cols-3 gap-2">
                        <div><label className="text-xs text-gray-400">Fill</label><input type="color" value={selectedSubtitle.style.fill.color} onChange={e => handleNestedSubtitleChange('fill', 'color', e.target.value)} className="w-full mt-1 bg-gray-900 border-gray-600 rounded"/></div>
                        <div><label className="text-xs text-gray-400">Outline</label><input type="color" value={selectedSubtitle.style.outline?.color || '#000000'} onChange={e => handleNestedSubtitleChange('outline', 'color', e.target.value)} className="w-full mt-1 bg-gray-900 border-gray-600 rounded"/></div>
                        <NumberInput label="Width" value={selectedSubtitle.style.outline?.width || 0} onChange={v => handleNestedSubtitleChange('outline', 'width', parseFloat(v))}/>
                    </div>
                </div>
            </div>
        );
    }
    
    if (selectedClip) {
         const pos = selectedClip.positioning;
         const isVisual = selectedClip.type === 'video' || selectedClip.type === 'image';
         const hasAudio = selectedClip.type === 'audio' || selectedClip.type === 'video';
         const color = selectedClip.color?.adjustments;
         const clipTrack = project.timeline?.tracks.find(t => t.clips.some(c => c.id === selectedClip.id));
         const isBrollOrOverlay = clipTrack && (clipTrack.id === 'b-roll' || clipTrack.id === 'overlay');

         return (
            <div className="p-4 space-y-4">
                <h4 className="font-bold text-white text-lg border-b border-gray-700 pb-2">Clip Inspector: <span className="text-indigo-400">{selectedClip.id.substring(0,8)}</span></h4>
                 <div className="flex bg-gray-900 rounded-lg p-1">
                    {isVisual && <button onClick={() => setActiveTab('transform')} className={`flex-1 text-xs p-1 rounded ${activeTab === 'transform' ? 'bg-indigo-600' : ''}`}>Transform</button>}
                    {isVisual && <button onClick={() => setActiveTab('effects')} className={`flex-1 text-xs p-1 rounded ${activeTab === 'effects' ? 'bg-indigo-600' : ''}`}>Effects</button>}
                    {isVisual && <button onClick={() => setActiveTab('color')} className={`flex-1 text-xs p-1 rounded ${activeTab === 'color' ? 'bg-indigo-600' : ''}`}>Color</button>}
                    {hasAudio && <button onClick={() => setActiveTab('audio')} className={`flex-1 text-xs p-1 rounded ${activeTab === 'audio' ? 'bg-indigo-600' : ''}`}>Audio</button>}
                </div>

                {activeTab === 'transform' && isVisual && (
                     <div className="space-y-3">
                        <h5 className="font-semibold text-gray-300 text-sm">Transform</h5>
                        <div className="grid grid-cols-2 gap-2">
                            <NumberInput label="X" value={pos?.x ?? 0} onChange={v => handleNumericChange('x', v)} onKeyframeToggle={() => handleKeyframeToggle('x')} isKeyframed={hasKeyframe('x')} />
                            <NumberInput label="Y" value={pos?.y ?? 0} onChange={v => handleNumericChange('y', v)} onKeyframeToggle={() => handleKeyframeToggle('y')} isKeyframed={hasKeyframe('y')} />
                            <NumberInput label="Scale" value={pos?.scale ?? 1} onChange={v => handleNumericChange('scale', v)} step={0.05} onKeyframeToggle={() => handleKeyframeToggle('scale')} isKeyframed={hasKeyframe('scale')} />
                            <NumberInput label="Rotation" value={pos?.rotation ?? 0} onChange={v => handleNumericChange('rotation', v)} onKeyframeToggle={() => handleKeyframeToggle('rotation')} isKeyframed={hasKeyframe('rotation')} />
                        </div>
                        {isBrollOrOverlay && (
                            <div className="space-y-3 pt-4">
                                <h5 className="font-semibold text-gray-300 text-sm">Smart Layouts</h5>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => onUpdateClip(selectedClip.id, { positioning: { ...(selectedClip.positioning || {}), width: 100, height: 100, x: 50, y: 50 } as any })} className="p-2 text-xs bg-gray-700 rounded text-center hover:bg-indigo-600">Full Screen</button>
                                    <button onClick={() => onUpdateClip(selectedClip.id, { positioning: { ...(selectedClip.positioning || {}), width: 30, height: 30, x: 85, y: 85 } as any })} className="p-2 text-xs bg-gray-700 rounded text-center hover:bg-indigo-600">PiP Bottom-Right</button>
                                    <button onClick={() => onUpdateClip(selectedClip.id, { positioning: { ...(selectedClip.positioning || {}), width: 50, height: 100, x: 25, y: 50 } as any })} className="p-2 text-xs bg-gray-700 rounded text-center hover:bg-indigo-600 flex items-center justify-center gap-1"><ViewColumnsIcon className="w-4 h-4"/> Split (V)</button>
                                    <button onClick={() => onUpdateClip(selectedClip.id, { positioning: { ...(selectedClip.positioning || {}), width: 100, height: 50, x: 50, y: 25 } as any })} className="p-2 text-xs bg-gray-700 rounded text-center hover:bg-indigo-600 flex items-center justify-center gap-1"><ViewColumnsIcon className="w-4 h-4 transform rotate-90"/> Split (H)</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {activeTab === 'effects' && isVisual && (
                    <div className="space-y-3">
                        <SliderInput label="Opacity" value={selectedClip.opacity} min={0} max={1} step={0.01} onChange={v => handleNumericChange('opacity', v)} onKeyframeToggle={() => handleKeyframeToggle('opacity')} isKeyframed={hasKeyframe('opacity')} />
                         <div className="flex items-center justify-between pt-2">
                             <h5 className="font-semibold text-gray-300 text-sm">Ken Burns</h5>
                             <input type="checkbox" checked={!!selectedClip.effects?.kenBurns} onChange={(e) => onUpdateClip(selectedClip.id, { effects: { ...(selectedClip.effects || {}), kenBurns: e.target.checked ? { direction: 'in' } : undefined } })} className="toggle-checkbox" />
                         </div>
                         <h5 className="font-semibold text-gray-300 text-sm pt-2">AI Effects</h5>
                         <button onClick={() => handleAiEffect('backgroundRemoved')} className="w-full text-xs p-2 bg-gray-700 rounded hover:bg-indigo-600">Remove Background (5 Cr)</button>
                    </div>
                )}

                 {activeTab === 'color' && isVisual && (
                     <div className="space-y-3">
                         <h5 className="font-semibold text-gray-300 text-sm">Color Grade (LUTs)</h5>
                         <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => onUpdateClip(selectedClip.id, { color: {...(selectedClip.color || {}), lut: 'cancun'}})} className="p-2 text-xs bg-gray-700 rounded text-center hover:bg-indigo-600">Cancun</button>
                            <button onClick={() => onUpdateClip(selectedClip.id, { color: {...(selectedClip.color || {}), lut: 'vintage'}})} className="p-2 text-xs bg-gray-700 rounded text-center hover:bg-indigo-600">Vintage</button>
                            <button onClick={() => onUpdateClip(selectedClip.id, { color: {...(selectedClip.color || {}), lut: 'noir'}})} className="p-2 text-xs bg-gray-700 rounded text-center hover:bg-indigo-600">Noir</button>
                         </div>
                         <h5 className="font-semibold text-gray-300 text-sm pt-2">Fine-Tuning</h5>
                         <SliderInput label="Exposure" value={color?.exposure ?? 0} min={-100} max={100} onChange={v => handleColorAdjustmentChange('exposure', v)} />
                         <SliderInput label="Contrast" value={color?.contrast ?? 0} min={-100} max={100} onChange={v => handleColorAdjustmentChange('contrast', v)} />
                         <SliderInput label="Saturation" value={color?.saturation ?? 0} min={-100} max={100} onChange={v => handleColorAdjustmentChange('saturation', v)} />
                     </div>
                 )}

                 {activeTab === 'audio' && hasAudio && (
                     <div className="space-y-3">
                        <h5 className="font-semibold text-gray-300 text-sm">Audio</h5>
                        <SliderInput label="Volume" value={selectedClip.volume} min={0} max={1} step={0.01} onChange={v => handleNumericChange('volume', v)} onKeyframeToggle={() => handleKeyframeToggle('volume')} isKeyframed={hasKeyframe('volume')} />
                        <h5 className="font-semibold text-gray-300 text-sm pt-2">AI Mastering</h5>
                         <div className="flex items-center justify-between p-2 bg-gray-900 rounded-lg">
                            <label htmlFor="enhance-toggle" className="text-xs text-gray-300">Auto-Enhance Voice (2 Cr)</label>
                            <input id="enhance-toggle" type="checkbox" checked={!!selectedClip.audio?.enhance} onChange={(e) => e.target.checked && handleAudioEffect('enhance')} className="toggle-checkbox" />
                         </div>
                         <SelectInput label="Voice Preset" value={selectedClip.audio?.voicePreset || 'none'} onChange={v => onUpdateClip(selectedClip.id, { audio: {...(selectedClip.audio || {}), voicePreset: v as any }})} options={['none', 'podcast', 'cinematic', 'radio']} />
                    </div>
                 )}
            </div>
         );
    }
    
    return <div className="text-center text-gray-400 text-sm p-8">Select a clip or subtitle on the timeline to inspect and edit it.</div>;
};

interface AssetAndInspectorPanelProps {
    project: Project;
    selectedClipId: string | null;
    selectedSubtitleId: string | null;
    onClipUpdate: (clipId: string, updates: Partial<TimelineClip>) => void;
    onSubtitleUpdate: (subtitleId: string, updates: Partial<Subtitle>) => void;
    currentTime: number;
}

const AssetAndInspectorPanel: React.FC<AssetAndInspectorPanelProps> = ({ project, selectedClipId, selectedSubtitleId, onClipUpdate, onSubtitleUpdate, currentTime }) => {
    const { timeline } = project;

    const selectedClip = useMemo(() => {
        if (!selectedClipId || !timeline) return null;
        for (const track of timeline.tracks) { const clip = track.clips.find(c => c.id === selectedClipId); if (clip) return clip; }
        return null;
    }, [selectedClipId, timeline]);
    
     const selectedSubtitle = useMemo(() => {
        if (!selectedSubtitleId || !timeline) return null;
        return timeline.subtitles.find(s => s.id === selectedSubtitleId) || null;
    }, [selectedSubtitleId, timeline]);

    return (
        <aside className="absolute top-0 bottom-0 right-0 h-full bg-gray-800/80 backdrop-blur-sm border-l border-gray-700 z-20 w-96 flex flex-col">
            <div className="p-2 border-b border-gray-700 flex items-center bg-gray-800">
                <h3 className="flex-1 py-2 text-sm font-semibold text-white text-center">Inspector</h3>
            </div>
            
            <div className="flex-grow overflow-y-auto">
                <Inspector 
                    project={project}
                    selectedClip={selectedClip} 
                    selectedSubtitle={selectedSubtitle} 
                    onUpdateClip={onClipUpdate} 
                    onUpdateSubtitle={onSubtitleUpdate} 
                    currentTime={currentTime} 
                />
            </div>
        </aside>
    );
};

export default AssetAndInspectorPanel;
