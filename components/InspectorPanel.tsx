import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Project, TimelineState, TimelineClip, Subtitle, SubtitleWord, KeyframeableProperty, AiVideoModel, NormalizedStockAsset, GiphyAsset } from '../types.ts';
import { useAppContext } from '../contexts/AppContext.tsx';
import { SparklesIcon, FilmIcon, PhotoIcon, SearchIcon, UploadIcon, WandSparklesIcon, PaintBrushIcon, SpeakerWaveIcon, FontSizeIcon, LetterSpacingIcon, TypeIcon, MusicNoteIcon, ViewColumnsIcon, AdjustmentsHorizontalIcon, LayersIcon, TransitionIcon, HelpCircleIcon, MicIcon } from './Icons.tsx';
import { emphasizeSubtitleText } from '../services/geminiService.ts';
import * as vfxService from '../services/vfxService.ts';
import { getErrorMessage } from '../utils.ts';
import { loadGoogleFont } from '../services/fontService.ts';
import HelpModal from './HelpModal.tsx';
import { ELEVENLABS_VOICES } from '../services/generativeMediaService.ts';

// --- Inspector UI Components ---

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

const SelectInput: React.FC<{label: string, value: string, onChange: (v:string) => void, options: (string | {label: string, value: string, disabled?: boolean})[], optionStyles?: {[key: string]: React.CSSProperties} }> = ({label, value, onChange, options, optionStyles}) => (
    <div>
        <label className="text-xs text-gray-400">{label}</label>
        <select value={value} onChange={e => onChange(e.target.value)} className="w-full mt-1 bg-gray-900 rounded-md p-2 text-sm text-white border border-gray-600">
            {options.map(opt => {
                if(typeof opt === 'string') {
                    return <option key={opt} value={opt} style={optionStyles?.[opt]}>{opt.split(',')[0]}</option>
                }
                return <option key={opt.value} value={opt.value} disabled={opt.disabled} style={optionStyles?.[opt.value]}>{opt.label}</option>
            })}
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
    onGenerateAllVoiceovers: () => void;
}

const InspectorPanel: React.FC<InspectorProps> = ({ project, selectedClip, selectedSubtitle, onUpdateClip, onUpdateSubtitle, currentTime, onGenerateAllVoiceovers }) => {
    const { user, consumeCredits, addToast, fonts, t, lockAndExecute, handleUpdateProject } = useAppContext();
    type InspectorTab = 'layout' | 'text' | 'vfx' | 'polish' | 'audio';
    const [activeTab, setActiveTab] = useState<InspectorTab>('layout');
    const [isEmphasizing, setIsEmphasizing] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);

    useEffect(() => {
        if (selectedSubtitle || selectedClip?.type === 'text') {
            setActiveTab('text');
        } else if (selectedClip) {
            const isVisual = selectedClip.type === 'video' || selectedClip.type === 'image';
            const hasAudio = selectedClip.type === 'audio' || selectedClip.type === 'video';
            if (isVisual && (activeTab !== 'vfx' && activeTab !== 'polish' && activeTab !== 'layout')) {
                setActiveTab('layout');
            } else if (hasAudio && !isVisual) {
                setActiveTab('audio');
            }
        }
    }, [selectedClip, selectedSubtitle]);

    const handleStyleChange = (updater: (style: Subtitle['style']) => Subtitle['style']) => {
        if (selectedSubtitle) {
            const newStyle = updater(selectedSubtitle.style);
            onUpdateSubtitle(selectedSubtitle.id, { style: newStyle });
        } else if (selectedClip?.type === 'text') {
            const newStyle = updater(selectedClip.style as Subtitle['style']);
            onUpdateClip(selectedClip.id, { style: newStyle });
        }
    };

    const handleAiEmphasize = () => lockAndExecute(async () => {
        const textToEmphasize = selectedSubtitle?.text || selectedClip?.text;
        if (!textToEmphasize || !await consumeCredits(1)) return;
        setIsEmphasizing(true);
        try {
            const emphasizedWords = await emphasizeSubtitleText(textToEmphasize);
            if (selectedSubtitle) {
                onUpdateSubtitle(selectedSubtitle.id, { words: emphasizedWords as SubtitleWord[] });
            } else if (selectedClip) {
                // This logic needs to be implemented if clips can have word-level styling
            }
            addToast("Emphasis applied!", "success");
        } catch(e) { addToast(getErrorMessage(e), 'error'); } 
        finally { setIsEmphasizing(false); }
    });
    
    const handleNumericChange = (field: KeyframeableProperty, value: string) => {
        if (!selectedClip) return;
        const numericValue = parseFloat(value);
        if (isNaN(numericValue)) return;
        if(['x', 'y', 'scale', 'rotation'].includes(field)) onUpdateClip(selectedClip.id, { positioning: { ...(selectedClip.positioning || {}), [field]: numericValue } as any });
        else onUpdateClip(selectedClip.id, { [field]: numericValue });
    };

    const handleKeyframeToggle = (property: KeyframeableProperty) => {
        if (!selectedClip) return;
        const existingKeyframes = selectedClip.keyframes?.[property] || [];
        const keyframeAtCurrentTime = existingKeyframes.find(kf => Math.abs(kf.time - currentTime) < 0.01);
        let newKeyframes;
        if (keyframeAtCurrentTime) newKeyframes = existingKeyframes.filter(kf => Math.abs(kf.time - currentTime) >= 0.01);
        else {
            const currentValue = ['x', 'y', 'scale', 'rotation'].includes(property) ? selectedClip.positioning?.[property as 'x'] : selectedClip[property as 'opacity'];
            newKeyframes = [...existingKeyframes, { time: currentTime, value: currentValue as number }].sort((a, b) => a.time - b.time);
        }
        onUpdateClip(selectedClip.id, { keyframes: { ...selectedClip.keyframes, [property]: newKeyframes } });
    };
    
    const hasKeyframe = (property: KeyframeableProperty) => selectedClip?.keyframes?.[property]?.some(kf => Math.abs(kf.time - currentTime) < 0.01) ?? false;

    const handleColorAdjustmentChange = (field: keyof NonNullable<TimelineClip['color']>['adjustments'], value: string) => {
        if (!selectedClip) return;
        const numericValue = parseFloat(value);
        if (!isNaN(numericValue)) onUpdateClip(selectedClip.id, { color: { ...(selectedClip.color || {}), adjustments: { ...(selectedClip.color?.adjustments || {}), [field]: numericValue } } as any });
    };
    
    const handleAiEffect = (effect: 'backgroundRemoved' | 'retouch') => lockAndExecute(async () => {
        if (!selectedClip || !await consumeCredits(effect === 'backgroundRemoved' ? 5 : 2)) return;
        addToast(`Applying ${effect}...`, 'info');
        try {
            const newUrl = await (effect === 'backgroundRemoved' ? vfxService.removeBackground : vfxService.applyRetouch)(selectedClip.url);
            onUpdateClip(selectedClip.id, { url: newUrl, aiEffects: { ...(selectedClip.aiEffects || {}), [effect]: true }});
            addToast(`${effect} applied!`, 'success');
        } catch (e) { addToast(getErrorMessage(e), 'error'); }
    });

    const handleAudioEffect = (effect: 'enhance') => lockAndExecute(async () => {
        if(!selectedClip || !await consumeCredits(2)) return;
        addToast('Applying AI audio enhancement...', 'info');
        try {
            const newUrl = await vfxService.applyAudioEnhance(selectedClip.url);
            onUpdateClip(selectedClip.id, { url: newUrl, audio: { ...(selectedClip.audio || {}), enhance: true } });
            addToast('Audio enhanced!', 'success');
        } catch(e) { addToast(getErrorMessage(e), 'error'); }
    });

    const renderTextEditor = (
        style: Subtitle['style'], 
        onStyleChange: (updater: (style: Subtitle['style']) => Subtitle['style']) => void
    ) => {
        const applyPreset = (preset: 'mrbeast' | 'hormozi') => {
            onStyleChange(s => {
                if (preset === 'mrbeast') return { ...s, fontFamily: 'Arial Black, sans-serif', fontWeight: 900, fontSize: 52, outline: { color: '#000000', width: 5 }, fill: { type: 'color', color: '#FFFFFF' } };
                return { ...s, fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 48, fill: { type: 'color', color: '#22c55e' } };
            });
        };

        return (
            <div className="p-4 space-y-4">
                <h5 className="font-semibold text-gray-300 text-sm">{t('text_engine.viral_styles')}</h5>
                <div className="grid grid-cols-2 gap-2"><button onClick={() => applyPreset('mrbeast')} className="p-2 text-xs bg-gray-700 rounded text-center hover:bg-indigo-600">{t('text_engine.style_mrbeast')}</button><button onClick={() => applyPreset('hormozi')} className="p-2 text-xs bg-gray-700 rounded text-center hover:bg-indigo-600">{t('text_engine.style_hormozi')}</button></div>
                <h5 className="font-semibold text-gray-300 text-sm">{t('text_engine.ai_emphasis')}</h5>
                <button onClick={handleAiEmphasize} disabled={isEmphasizing} className="w-full p-2 text-xs bg-gray-700 rounded text-center hover:bg-indigo-600 disabled:opacity-50 flex items-center justify-center gap-2"><SparklesIcon className="w-4 h-4" /> {isEmphasizing ? t('text_engine.ai_emphasis_loading') : t('text_engine.ai_emphasis')}</button>
                <h5 className="font-semibold text-gray-300 text-sm">{t('text_engine.font_control')}</h5>
                <SelectInput label="Font Family" value={style.fontFamily} onChange={v => { loadGoogleFont(v); onStyleChange(s => ({...s, fontFamily: v})); }} options={['Inter, sans-serif', ...fonts.map(f => f.family)]} optionStyles={fonts.reduce((acc, font) => ({ ...acc, [font.family]: { fontFamily: font.family } }), {})} />
                <div className="grid grid-cols-2 gap-2"><NumberInput icon={<FontSizeIcon className="w-4 h-4"/>} label="Size" value={style.fontSize} onChange={v => onStyleChange(s => ({...s, fontSize: parseFloat(v)}))} /><NumberInput icon={<LetterSpacingIcon className="w-4 h-4"/>} label="Spacing" value={style.letterSpacing} onChange={v => onStyleChange(s => ({...s, letterSpacing: parseFloat(v)}))} /></div>
                <h5 className="font-semibold text-gray-300 text-sm">{t('text_engine.advanced_styling')}</h5>
                <div className="grid grid-cols-3 gap-2"><div><label className="text-xs text-gray-400">Fill</label><input type="color" value={style.fill.color} onChange={e => onStyleChange(s => ({...s, fill: {...s.fill, color: e.target.value}}))} className="w-full mt-1 bg-gray-900 border-gray-600 rounded"/></div><div><label className="text-xs text-gray-400">Outline</label><input type="color" value={style.outline?.color || '#000000'} onChange={e => onStyleChange(s => ({...s, outline: {...s.outline, color: e.target.value}}))} className="w-full mt-1 bg-gray-900 border-gray-600 rounded"/></div><NumberInput label="Width" value={style.outline?.width || 0} onChange={v => onStyleChange(s => ({...s, outline: {...s.outline, width: parseFloat(v)}}))}/></div>
            </div>
        )
    };
    
    const renderProjectControls = () => {
        const sceneCount = project.script?.scenes.length || 0;
        const voiceOptions = [
            ...ELEVENLABS_VOICES.map(v => ({ label: v.name, value: v.id })),
            ...(user?.cloned_voices.map(v => ({ label: `${v.name} (Cloned)`, value: v.id, disabled: v.status !== 'ready' })) || [])
        ];
        return (
            <div className="p-4 space-y-4">
                <h5 className="font-semibold text-gray-300 text-sm">{t('color_audio_studio.narrator_title')}</h5>
                <SelectInput 
                    label="Select Narrator Voice"
                    value={project.voiceoverVoiceId || ''}
                    onChange={v => handleUpdateProject({id: project.id, voiceoverVoiceId: v})}
                    options={voiceOptions}
                />
                <button 
                    onClick={onGenerateAllVoiceovers}
                    className="w-full p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 text-sm"
                >
                    <MicIcon className="w-5 h-5"/>
                    Generate All Voiceovers ({sceneCount} Cr)
                </button>
            </div>
        )
    };

    const renderClipInspector = () => {
        if (!selectedClip) return null;
        const isVisual = selectedClip.type === 'video' || selectedClip.type === 'image';
        const hasAudio = selectedClip.type === 'audio' || selectedClip.type === 'video';
        const isText = selectedClip.type === 'text';
        const clipTrack = project.timeline?.tracks.find(t => t.clips.some(c => c.id === selectedClip!.id));
        const isBrollOrOverlay = clipTrack && (clipTrack.id === 'b-roll' || clipTrack.id === 'overlay');

        return (
            <div className="space-y-4">
                <div className="flex bg-gray-900 rounded-lg p-1 mx-4">
                    {isVisual && <button onClick={() => setActiveTab('layout')} className={`flex-1 text-xs p-1 rounded ${activeTab === 'layout' ? 'bg-indigo-600' : ''}`}>{t('layout_toolkit.title')}</button>}
                    {isText && <button onClick={() => setActiveTab('text')} className={`flex-1 text-xs p-1 rounded ${activeTab === 'text' ? 'bg-indigo-600' : ''}`}>Text</button>}
                    {isVisual && <button onClick={() => setActiveTab('vfx')} className={`flex-1 text-xs p-1 rounded ${activeTab === 'vfx' ? 'bg-indigo-600' : ''}`}>{t('vfx_hub.title')}</button>}
                    {isVisual && <button onClick={() => setActiveTab('polish')} className={`flex-1 text-xs p-1 rounded ${activeTab === 'polish' ? 'bg-indigo-600' : ''}`}>{t('color_audio_studio.title')}</button>}
                    {hasAudio && !isVisual && <button onClick={() => setActiveTab('audio')} className={`flex-1 text-xs p-1 rounded ${activeTab === 'audio' ? 'bg-indigo-600' : ''}`}>Audio</button>}
                </div>

                <div className="space-y-4">
                    {activeTab === 'text' && isText && renderTextEditor(selectedClip.style as Subtitle['style'], (updater) => onUpdateClip(selectedClip.id, { style: updater(selectedClip.style as Subtitle['style']) }))}
                    
                    {activeTab === 'layout' && isVisual && (
                         <div className="p-4 space-y-3">
                            <div className="grid grid-cols-2 gap-2"><NumberInput label="X" value={selectedClip!.positioning?.x ?? 50} onChange={v => handleNumericChange('x', v)} onKeyframeToggle={() => handleKeyframeToggle('x')} isKeyframed={hasKeyframe('x')} /><NumberInput label="Y" value={selectedClip!.positioning?.y ?? 50} onChange={v => handleNumericChange('y', v)} onKeyframeToggle={() => handleKeyframeToggle('y')} isKeyframed={hasKeyframe('y')} /></div>
                            <div className="grid grid-cols-2 gap-2"><NumberInput label="Scale" value={selectedClip!.positioning?.scale ?? 1} onChange={v => handleNumericChange('scale', v)} step={0.05} onKeyframeToggle={() => handleKeyframeToggle('scale')} isKeyframed={hasKeyframe('scale')} /><NumberInput label="Rotation" value={selectedClip!.positioning?.rotation ?? 0} onChange={v => handleNumericChange('rotation', v)} onKeyframeToggle={() => handleKeyframeToggle('rotation')} isKeyframed={hasKeyframe('rotation')} /></div>
                            {isBrollOrOverlay && (
                                <><h5 className="font-semibold text-gray-300 text-sm pt-2">{t('layout_toolkit.smart_layouts')}</h5><div className="grid grid-cols-2 gap-2"><button onClick={() => onUpdateClip(selectedClip!.id, { positioning: { ...(selectedClip!.positioning || {}), width: 100, height: 100, x: 50, y: 50 } as any })} className="p-2 text-xs bg-gray-700 rounded text-center hover:bg-indigo-600">Full Screen</button><button onClick={() => onUpdateClip(selectedClip!.id, { positioning: { ...(selectedClip!.positioning || {}), width: 30, height: 30, x: 85, y: 85 } as any })} className="p-2 text-xs bg-gray-700 rounded text-center hover:bg-indigo-600">PiP BR</button><button onClick={() => onUpdateClip(selectedClip!.id, { positioning: { ...(selectedClip!.positioning || {}), width: 50, height: 100, x: 25, y: 50 } as any })} className="p-2 text-xs bg-gray-700 rounded text-center hover:bg-indigo-600 flex items-center justify-center gap-1"><ViewColumnsIcon className="w-4 h-4"/> Split V</button><button onClick={() => onUpdateClip(selectedClip!.id, { positioning: { ...(selectedClip!.positioning || {}), width: 100, height: 50, x: 50, y: 25 } as any })} className="p-2 text-xs bg-gray-700 rounded text-center hover:bg-indigo-600 flex items-center justify-center gap-1"><ViewColumnsIcon className="w-4 h-4 transform rotate-90"/> Split H</button></div></>
                            )}
                        </div>
                    )}
                    
                    {activeTab === 'vfx' && isVisual && (
                        <div className="p-4 space-y-3">
                            <SliderInput label="Opacity" value={selectedClip!.opacity} min={0} max={1} step={0.01} onChange={v => handleNumericChange('opacity', v)} onKeyframeToggle={() => handleKeyframeToggle('opacity')} isKeyframed={hasKeyframe('opacity')} />
                            <div className="flex items-center justify-between pt-2"><h5 className="font-semibold text-gray-300 text-sm">Ken Burns</h5><input type="checkbox" checked={!!selectedClip!.effects?.kenBurns} onChange={(e) => onUpdateClip(selectedClip!.id, { effects: { ...(selectedClip!.effects || {}), kenBurns: e.target.checked ? { direction: 'in' } : undefined } })} className="toggle-checkbox" /></div>
                            <h5 className="font-semibold text-gray-300 text-sm pt-2">{t('vfx_hub.ai_effects_title')}</h5>
                            <button onClick={() => handleAiEffect('backgroundRemoved')} className="w-full text-xs p-2 bg-gray-700 rounded hover:bg-indigo-600">{t('vfx_hub.effect_remove_bg')}</button>
                        </div>
                    )}

                     {activeTab === 'polish' && isVisual && (
                         <div className="p-4 space-y-3">
                             <h5 className="font-semibold text-gray-300 text-sm">{t('color_audio_studio.luts_title')}</h5>
                             <div className="grid grid-cols-3 gap-2"><button onClick={() => onUpdateClip(selectedClip!.id, { color: {...(selectedClip!.color || {}), lut: 'cancun'}})} className="p-2 text-xs bg-gray-700 rounded text-center hover:bg-indigo-600">{t('color_audio_studio.lut_cancun')}</button><button onClick={() => onUpdateClip(selectedClip!.id, { color: {...(selectedClip!.color || {}), lut: 'vintage'}})} className="p-2 text-xs bg-gray-700 rounded text-center hover:bg-indigo-600">{t('color_audio_studio.lut_vintage')}</button><button onClick={() => onUpdateClip(selectedClip!.id, { color: {...(selectedClip!.color || {}), lut: 'noir'}})} className="p-2 text-xs bg-gray-700 rounded text-center hover:bg-indigo-600">{t('color_audio_studio.lut_noir')}</button></div>
                             <h5 className="font-semibold text-gray-300 text-sm pt-2">{t('color_audio_studio.fine_tuning_title')}</h5>
                             <SliderInput label={t('color_audio_studio.exposure')} value={selectedClip!.color?.adjustments?.exposure ?? 0} min={-100} max={100} onChange={v => handleColorAdjustmentChange('exposure', v)} />
                             <SliderInput label={t('color_audio_studio.contrast')} value={selectedClip!.color?.adjustments?.contrast ?? 0} min={-100} max={100} onChange={v => handleColorAdjustmentChange('contrast', v)} />
                             <SliderInput label={t('color_audio_studio.saturation')} value={selectedClip!.color?.adjustments?.saturation ?? 0} min={-100} max={100} onChange={v => handleColorAdjustmentChange('saturation', v)} />
                         </div>
                     )}

                     {activeTab === 'audio' && hasAudio && (
                         <div className="p-4 space-y-3">
                            <SliderInput label="Volume" value={selectedClip!.volume} min={0} max={1} step={0.01} onChange={v => handleNumericChange('volume', v)} onKeyframeToggle={() => handleKeyframeToggle('volume')} isKeyframed={hasKeyframe('volume')} />
                            <h5 className="font-semibold text-gray-300 text-sm pt-2">{t('color_audio_studio.audio_mastering_title')}</h5>
                            <div className="flex items-center justify-between p-2 bg-gray-900 rounded-lg"><label htmlFor="enhance-toggle" className="text-xs text-gray-300">{t('color_audio_studio.auto_enhance_desc')}</label><input id="enhance-toggle" type="checkbox" checked={!!selectedClip!.audio?.enhance} onChange={(e) => e.target.checked && handleAudioEffect('enhance')} className="toggle-checkbox" /></div>
                            <SelectInput label={t('color_audio_studio.voice_changer_title')} value={selectedClip!.audio?.voicePreset || 'none'} onChange={v => onUpdateClip(selectedClip.id, { audio: {...(selectedClip!.audio || {}), voicePreset: v as any }})} options={['none', 'podcast', 'cinematic', 'radio']} />
                        </div>
                     )}
                </div>
            </div>
        );
    };

    return (
        <aside className="h-full bg-gray-800/80 backdrop-blur-sm border-l border-gray-700 z-10 w-full flex flex-col" data-tour="inspector">
            <div className="p-2 border-b border-gray-700 flex items-center bg-gray-800 justify-between">
                <h3 className="font-bold text-white pl-2">Inspector</h3>
                <button onClick={() => setIsHelpOpen(true)} className="p-2 text-gray-400 hover:text-white"><HelpCircleIcon className="w-5 h-5"/></button>
            </div>
            
            <div className="flex-grow overflow-y-auto">
                {!selectedClip && !selectedSubtitle ? (
                    renderProjectControls()
                ) : (selectedSubtitle || selectedClip?.type === 'text') ? (
                    renderTextEditor(
                        (selectedSubtitle?.style || selectedClip?.style) as Subtitle['style'], 
                        handleStyleChange
                    )
                ) : (
                    renderClipInspector()
                )}
            </div>
            <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
        </aside>
    );
};

export default InspectorPanel;