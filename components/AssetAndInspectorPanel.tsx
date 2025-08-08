import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Project, TimelineState, StockAsset, TimelineClip, Subtitle, SubtitleWord } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { SparklesIcon, FilmIcon, PhotoIcon, SearchIcon, UploadIcon, WandSparklesIcon, PaintBrushIcon, SpeakerWaveIcon, FontSizeIcon, LetterSpacingIcon, TypeIcon } from './Icons';
import { searchStockMedia, emphasizeSubtitleText, generateTextGraphic } from '../services/geminiService';
import * as vfxService from '../services/vfxService';
import { generateVideoClip, generateAnimatedImage } from '../services/generativeMediaService';
import { uploadFile } from '../services/supabaseService';
import { getErrorMessage } from '../utils';
import { v4 as uuidv4 } from 'uuid';

interface InspectorProps {
    selectedClip: TimelineClip | null;
    selectedSubtitle: Subtitle | null;
    onUpdateClip: (clipId: string, updates: Partial<TimelineClip>) => void;
    onUpdateSubtitle: (subtitleId: string, updates: Partial<Subtitle>) => void;
}

const Inspector: React.FC<InspectorProps> = ({ selectedClip, selectedSubtitle, onUpdateClip, onUpdateSubtitle }) => {
    const { consumeCredits, addToast } = useAppContext();
    const [activeTab, setActiveTab] = useState<'transform' | 'effects' | 'color' | 'audio'>('transform');
    const [isEmphasizing, setIsEmphasizing] = useState(false);

    // Text Inspector Logic
    const handleSubtitleChange = (field: keyof Subtitle['style'], value: any) => {
        if (!selectedSubtitle) return;
        onUpdateSubtitle(selectedSubtitle.id, { style: { ...selectedSubtitle.style, [field]: value } });
    };
    
    const handleNestedSubtitleChange = (field: 'fill' | 'outline' | 'shadow', subField: string, value: any) => {
        if (!selectedSubtitle) return;
        const newStyle = { ...selectedSubtitle.style, [field]: { ...selectedSubtitle.style[field], [subField]: value }};
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
    const handleNumericChange = (field: 'x' | 'y' | 'scale' | 'rotation' | 'width' | 'height', value: string) => {
        if (!selectedClip) return;
        const numericValue = parseFloat(value);
        if (!isNaN(numericValue)) {
            onUpdateClip(selectedClip.id, { positioning: { ...selectedClip.positioning!, [field]: numericValue } });
        }
    };

    const handleSliderChange = (field: 'opacity' | 'volume', value: string) => {
        if (!selectedClip) return;
        const numericValue = parseFloat(value);
        if (!isNaN(numericValue)) { onUpdateClip(selectedClip.id, { [field]: numericValue }); }
    };

    const handleColorAdjustmentChange = (field: keyof NonNullable<TimelineClip['color']>['adjustments'], value: string) => {
        if (!selectedClip) return;
        const numericValue = parseFloat(value);
        if (!isNaN(numericValue)) {
            const newColor = { ...selectedClip.color, adjustments: { ...selectedClip.color?.adjustments, [field]: numericValue } };
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
            onUpdateClip(selectedClip.id, { url: newUrl, aiEffects: { ...selectedClip.aiEffects, [effect]: true }});
            addToast(`${effect} applied!`, 'success');
        } catch (e) { addToast(getErrorMessage(e), 'error'); }
    };
    
    // RENDER LOGIC
    if (selectedSubtitle) {
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
                    <div className="grid grid-cols-2 gap-2">
                        <NumberInput icon={<FontSizeIcon className="w-4 h-4"/>} label="Size" value={selectedSubtitle.style.fontSize} onChange={v => handleSubtitleChange('fontSize', parseFloat(v))} />
                        <NumberInput icon={<LetterSpacingIcon className="w-4 h-4"/>} label="Spacing" value={selectedSubtitle.style.letterSpacing} onChange={v => handleSubtitleChange('letterSpacing', parseFloat(v))} />
                    </div>
                </div>
                 <div className="space-y-3">
                    <h5 className="font-semibold text-gray-300 text-sm">Advanced Styling</h5>
                    <div className="grid grid-cols-3 gap-2">
                        <div><label className="text-xs text-gray-400">Fill</label><input type="color" value={selectedSubtitle.style.fill.color} onChange={e => handleNestedSubtitleChange('fill', 'color', e.target.value)} className="w-full mt-1 bg-gray-900"/></div>
                        <div><label className="text-xs text-gray-400">Outline</label><input type="color" value={selectedSubtitle.style.outline?.color || '#000000'} onChange={e => handleNestedSubtitleChange('outline', 'color', e.target.value)} className="w-full mt-1 bg-gray-900"/></div>
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
                            <NumberInput label="X" value={pos?.x ?? 0} onChange={v => handleNumericChange('x', v)} disabled={!pos} />
                            <NumberInput label="Y" value={pos?.y ?? 0} onChange={v => handleNumericChange('y', v)} disabled={!pos} />
                            <NumberInput label="Scale" value={pos?.scale ?? 1} onChange={v => handleNumericChange('scale', v)} disabled={!pos} step={0.05} />
                            <NumberInput label="Rotation" value={pos?.rotation ?? 0} onChange={v => handleNumericChange('rotation', v)} disabled={!pos} />
                        </div>
                    </div>
                )}
                
                {activeTab === 'effects' && isVisual && (
                    <div className="space-y-3">
                        <SliderInput label="Opacity" value={selectedClip.opacity} min={0} max={1} step={0.01} onChange={v => handleSliderChange('opacity', v)} />
                        <h5 className="font-semibold text-gray-300 text-sm pt-2">Animations</h5>
                        <div className="grid grid-cols-2 gap-2">
                            <SelectInput label="In" value={selectedClip.animation?.in || 'none'} onChange={v => onUpdateClip(selectedClip.id, { animation: {...selectedClip.animation, in: v as any}})} options={['none', 'fade', 'slide', 'rise']} />
                            <SelectInput label="Out" value={selectedClip.animation?.out || 'none'} onChange={v => onUpdateClip(selectedClip.id, { animation: {...selectedClip.animation, out: v as any}})} options={['none', 'fade', 'slide', 'rise']} />
                        </div>
                         <h5 className="font-semibold text-gray-300 text-sm pt-2">AI Effects</h5>
                         <button onClick={() => handleAiEffect('backgroundRemoved')} className="w-full text-xs p-2 bg-gray-700 rounded hover:bg-indigo-600">Remove Background (5 Cr)</button>
                    </div>
                )}

                 {activeTab === 'color' && isVisual && (
                     <div className="space-y-3">
                         <h5 className="font-semibold text-gray-300 text-sm">Color Grade (LUTs)</h5>
                         <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => onUpdateClip(selectedClip.id, { color: {...selectedClip.color, lut: 'cancun'}})} className="p-2 text-xs bg-gray-700 rounded text-center hover:bg-indigo-600">Cancun</button>
                            <button onClick={() => onUpdateClip(selectedClip.id, { color: {...selectedClip.color, lut: 'vintage'}})} className="p-2 text-xs bg-gray-700 rounded text-center hover:bg-indigo-600">Vintage</button>
                            <button onClick={() => onUpdateClip(selectedClip.id, { color: {...selectedClip.color, lut: 'noir'}})} className="p-2 text-xs bg-gray-700 rounded text-center hover:bg-indigo-600">Noir</button>
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
                        <SliderInput label="Volume" value={selectedClip.volume} min={0} max={1} step={0.01} onChange={v => handleSliderChange('volume', v)} />
                    </div>
                 )}
            </div>
         );
    }
    
    return <div className="text-center text-gray-400 text-sm p-8">Select a clip or subtitle on the timeline to inspect and edit it.</div>;
};


const NumberInput: React.FC<{label: string, value: number, onChange: (v:string) => void, disabled?: boolean, step?: number, icon?: React.ReactNode}> = ({label, value, onChange, disabled, step = 1, icon}) => (
    <div>
        <label className="text-xs text-gray-400 flex items-center gap-1">{icon}{label}</label>
        <input type="number" value={value} step={step} onChange={e => onChange(e.target.value)} disabled={disabled} className="w-full mt-1 bg-gray-900 rounded-md p-2 text-sm text-white border border-gray-600 disabled:opacity-50" />
    </div>
);

const SliderInput: React.FC<{label: string, value: number, onChange: (v:string) => void, min?: number, max?: number, step?: number}> = ({label, value, onChange, min = 0, max = 100, step = 1}) => (
    <div>
        <label className="text-xs text-gray-400 flex justify-between"><span>{label}</span> <span>{Math.round(value * (label === 'Volume' || label === 'Opacity' ? 100 : 1))}%</span></label>
        <input type="range" value={value} min={min} max={max} step={step} onChange={e => onChange(e.target.value)} className="w-full mt-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-sm" />
    </div>
);

const SelectInput: React.FC<{label: string, value: string, onChange: (v:string) => void, options: string[]}> = ({label, value, onChange, options}) => (
    <div>
        <label className="text-xs text-gray-400">{label}</label>
        <select value={value} onChange={e => onChange(e.target.value)} className="w-full mt-1 bg-gray-900 rounded-md p-2 text-sm text-white border border-gray-600">
            {options.map(opt => <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>)}
        </select>
    </div>
);


interface AssetAndInspectorPanelProps {
    isOpen: boolean;
    project: Project;
    timeline: TimelineState;
    onTimelineUpdate: (newTimeline: TimelineState) => void;
    selectedClipId: string | null;
    selectedSubtitleId: string | null;
    onClipUpdate: (clipId: string, updates: Partial<TimelineClip>) => void;
    onSubtitleUpdate: (subtitleId: string, updates: Partial<Subtitle>) => void;
    activeSceneIndex: number;
}

const AssetAndInspectorPanel: React.FC<AssetAndInspectorPanelProps> = ({ isOpen, project, timeline, onTimelineUpdate, selectedClipId, selectedSubtitleId, onClipUpdate, onSubtitleUpdate, activeSceneIndex }) => {
    const { t, user, addToast, consumeCredits, lockAndExecute } = useAppContext();
    const [activeTab, setActiveTab] = useState<'add' | 'inspector'>('add');
    
    // "Add Media" State
    const [stockSearch, setStockSearch] = useState(project.topic || 'business');
    const [stockType, setStockType] = useState<'videos' | 'photos'>('videos');
    const [stockResults, setStockResults] = useState<StockAsset[]>([]);
    const [isStockLoading, setIsStockLoading] = useState(false);
    const [aiPrompt, setAiPrompt] = useState(project.script?.scenes[activeSceneIndex]?.visual || '');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    
    useEffect(() => {
        setAiPrompt(project.script?.scenes[activeSceneIndex]?.visual || '');
    }, [activeSceneIndex, project.script]);

    const handleAddAssetToTimeline = (url: string, type: 'video' | 'image', targetTrack: 'a-roll' | 'b-roll' | 'overlay') => {
        const newTimeline = JSON.parse(JSON.stringify(timeline));
        const track = newTimeline.tracks.find((t: any) => t.id === targetTrack);
        if (!track) return;

        let newClip: TimelineClip;
        if(targetTrack === 'a-roll' || targetTrack === 'b-roll') {
            const aRollClip = timeline.tracks.find(t => t.id === 'a-roll')?.clips[activeSceneIndex];
            if (!aRollClip) return;
            newClip = { id: uuidv4(), type: type, url: url, sceneIndex: activeSceneIndex, startTime: aRollClip.startTime, endTime: aRollClip.endTime, sourceDuration: aRollClip.endTime - aRollClip.startTime, opacity: 1, volume: type === 'video' ? 1: 0, effects: {}, aiEffects: {}, animation: {}, color: { adjustments: { exposure: 0, contrast: 0, saturation: 0, temperature: 0 }} };
        } else { // Overlay
             newClip = { id: uuidv4(), type: type, url: url, sceneIndex: -1, startTime: 0, endTime: 5, sourceDuration: 5, opacity: 1, volume: type === 'video' ? 1: 0, positioning: { width: 25, height: 25, x: 10, y: 10, zIndex: 10, rotation: 0, scale: 1 }, effects: {}, aiEffects: {}, animation: {}, color: { adjustments: { exposure: 0, contrast: 0, saturation: 0, temperature: 0 }} };
        }
        
        if (targetTrack === 'a-roll') {
            track.clips[activeSceneIndex] = newClip;
        } else {
            track.clips.push(newClip);
        }
        
        onTimelineUpdate(newTimeline);
        addToast("Asset added to timeline!", "success");
    };

    const handleStockSearch = useCallback(async () => {
        setIsStockLoading(true);
        setStockResults([]);
        try {
            const results = await searchStockMedia(stockSearch, stockType);
            const mappedResults = (stockType === 'videos' ? results.videos : results.photos)?.map((item: any): StockAsset => ({
                id: item.id,
                url: stockType === 'videos' ? (item.video_files.find((f: any) => f.quality === 'hd' && f.width > 1000)?.link || item.video_files[0].link) : item.src.large,
                type: stockType === 'videos' ? 'video' : 'photo',
                description: item.alt || `By ${item.user?.name || item.photographer}`,
                user: { name: item.user?.name || item.photographer, url: item.user?.url || item.photographer_url }
            })) || [];
            setStockResults(mappedResults);
        } catch (e) { addToast(`Stock search failed: ${getErrorMessage(e)}`, 'error'); } finally { setIsStockLoading(false); }
    }, [stockSearch, addToast, stockType]);

    const handleGenerate = (type: 'video' | 'image' | 'graphic') => lockAndExecute(async () => {
        if (!aiPrompt.trim()) { addToast("Please enter a prompt.", "error"); return; }
        setIsGenerating(true);
        const cost = type === 'video' ? 10 : 1;
        if (!await consumeCredits(cost)) { setIsGenerating(false); return; }

        try {
            addToast(`Generating AI ${type}... this may take a minute.`, 'info');
            const result = await (type === 'video' ? generateVideoClip(aiPrompt, project.platform) : type === 'image' ? generateAnimatedImage(aiPrompt, project.platform) : generateTextGraphic(aiPrompt));
            const assetBlob = result instanceof Blob ? result : await (await fetch(result)).blob();
            
            addToast(t('toast.uploading_asset', { type }), 'info');
            const path = `${user!.id}/${project.id}/ai_assets/${uuidv4()}.${assetBlob.type.split('/')[1]}`;
            const assetUrl = await uploadFile(assetBlob, path);
            handleAddAssetToTimeline(assetUrl, type === 'video' ? 'video' : 'image', 'a-roll');
        } catch (e) { addToast(`AI generation failed: ${getErrorMessage(e)}`, 'error'); } finally { setIsGenerating(false); }
    });
    
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || !user) return;
        const file = event.target.files[0];
        if (!file.type.startsWith('video/') && !file.type.startsWith('image/')) { addToast("Invalid file type.", "error"); return; }

        setIsUploading(true);
        try {
            const path = `${user.id}/${project.id}/user_uploads/${uuidv4()}.${file.name.split('.').pop()}`;
            const publicUrl = await uploadFile(file, path);
            handleAddAssetToTimeline(publicUrl, file.type.startsWith('video') ? 'video' : 'image', 'a-roll');
        } catch (e) { addToast(`Upload failed: ${getErrorMessage(e)}`, 'error'); } finally { setIsUploading(false); }
    };
    
    const selectedClip = useMemo(() => {
        if (!selectedClipId) return null;
        for (const track of timeline.tracks) {
            const clip = track.clips.find(c => c.id === selectedClipId);
            if (clip) return clip;
        }
        return null;
    }, [selectedClipId, timeline]);
    
     const selectedSubtitle = useMemo(() => {
        if (!selectedSubtitleId) return null;
        return timeline.subtitles.find(s => s.id === selectedSubtitleId) || null;
    }, [selectedSubtitleId, timeline]);

    useEffect(() => {
        if(selectedClipId || selectedSubtitleId) {
            setActiveTab('inspector');
        }
    }, [selectedClipId, selectedSubtitleId]);
    
    const renderAddMedia = () => (
        <div className="p-4 space-y-6">
            <div>
                <h4 className="font-bold text-white mb-2">Generate AI Media</h4>
                <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} rows={2} className="w-full bg-gray-900 rounded-md p-2 text-sm text-white border border-gray-600" />
                <div className="grid grid-cols-3 gap-2 mt-2">
                    <button onClick={() => handleGenerate('video')} disabled={isGenerating} className="p-2 text-xs bg-gray-700 rounded text-center hover:bg-indigo-600 disabled:opacity-50">AI Video (10cr)</button>
                    <button onClick={() => handleGenerate('image')} disabled={isGenerating} className="p-2 text-xs bg-gray-700 rounded text-center hover:bg-indigo-600 disabled:opacity-50">AI Image (1cr)</button>
                    <button onClick={() => handleGenerate('graphic')} disabled={isGenerating} className="p-2 text-xs bg-gray-700 rounded text-center hover:bg-indigo-600 disabled:opacity-50">Text Graphic (1cr)</button>
                </div>
            </div>
            <div>
                <h4 className="font-bold text-white mb-2">Search Stock Media</h4>
                <div className="flex gap-2">
                    <input type="search" value={stockSearch} onChange={e => setStockSearch(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleStockSearch()} className="flex-grow w-full bg-gray-900 rounded-md p-2 text-sm text-white border border-gray-600"/>
                    <button onClick={handleStockSearch} className="p-2 bg-gray-700 rounded hover:bg-indigo-600"><SearchIcon className="w-5 h-5"/></button>
                </div>
                <div className="flex gap-2 mt-2">
                    <button onClick={() => setStockType('videos')} className={`flex-1 p-1 text-xs rounded ${stockType === 'videos' ? 'bg-indigo-600' : 'bg-gray-700'}`}>Videos</button>
                    <button onClick={() => setStockType('photos')} className={`flex-1 p-1 text-xs rounded ${stockType === 'photos' ? 'bg-indigo-600' : 'bg-gray-700'}`}>Photos</button>
                </div>
                <div className="mt-2 h-48 overflow-y-auto grid grid-cols-2 gap-2">
                    {isStockLoading ? <p>Loading...</p> : stockResults.map(asset => (
                        <img key={asset.id} src={asset.url} onClick={() => handleAddAssetToTimeline(asset.url, asset.type === 'photo' ? 'image' : asset.type, 'a-roll')} className="w-full h-24 object-cover rounded cursor-pointer" />
                    ))}
                </div>
            </div>
            <div>
                <h4 className="font-bold text-white mb-2">Upload Your Media</h4>
                <label className="w-full flex items-center justify-center gap-2 p-3 bg-gray-700 text-white rounded-lg cursor-pointer hover:bg-gray-600">
                    <UploadIcon className="w-5 h-5" />
                    <span>{isUploading ? "Uploading..." : "Upload File"}</span>
                    <input type="file" accept="video/*,image/*" onChange={handleFileUpload} className="hidden" />
                </label>
            </div>
        </div>
    );

    return (
        <aside className={`absolute top-0 bottom-0 right-0 bg-gray-800/80 backdrop-blur-sm border-l border-gray-700 z-20 transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'} w-96 flex flex-col`}>
            <div className="p-2 border-b border-gray-700 flex items-center bg-gray-800">
                <button onClick={() => setActiveTab('add')} className={`flex-1 py-2 text-sm font-semibold rounded-md ${activeTab === 'add' ? 'bg-indigo-600 text-white' : 'text-gray-300'}`}>Add Media</button>
                <button onClick={() => setActiveTab('inspector')} className={`flex-1 py-2 text-sm font-semibold rounded-md ${activeTab === 'inspector' ? 'bg-indigo-600 text-white' : 'text-gray-300'}`} data-tour="inspector">Inspector</button>
            </div>
            
            <div className="flex-grow overflow-y-auto">
                {activeTab === 'add' ? renderAddMedia() : <Inspector selectedClip={selectedClip} selectedSubtitle={selectedSubtitle} onUpdateClip={onClipUpdate} onUpdateSubtitle={onSubtitleUpdate} />}
            </div>
        </aside>
    );
};

export default AssetAndInspectorPanel;