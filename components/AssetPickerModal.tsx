import React, { useState, useCallback, useEffect } from 'react';
import { Project, NormalizedStockAsset, GiphyAsset, AiVideoModel } from '../types.js';
import { useAppContext } from '../contexts/AppContext.js';
import { SparklesIcon, FilmIcon, PhotoIcon, SearchIcon, UploadIcon, XCircleIcon, TypeIcon, MusicNoteIcon } from './Icons.js';
import { searchStockMedia, generateTextGraphic } from '../services/geminiService.js';
import { generateRunwayVideoClip, generateAnimatedImage, generateAiMusic, generateSfx } from '../services/generativeMediaService.js';
import { startFreepikVideoGeneration, pollFreepikTask } from '../services/freepikService.js';
import { searchJamendoMusic } from '../services/jamendoService.js';
import { searchGiphy } from '../services/giphyService.js';
import { uploadFile } from '../services/supabaseService.js';
import { getErrorMessage } from '../utils.js';

interface AssetPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddAsset: (url: string, type: 'video' | 'image' | 'audio' | 'text', targetTrack: string, options: { sceneIndex?: number; startTime?: number; duration?: number }) => void;
    context: { trackId: string; sceneIndex: number; startTime: number } | null;
    project: Project;
}

const AssetPickerModal: React.FC<AssetPickerModalProps> = ({ isOpen, onClose, onAddAsset, context, project }) => {
    const { user, addToast, consumeCredits, lockAndExecute } = useAppContext();
    const [activeTab, setActiveTab] = useState('visuals');

    // Visuals State
    const [stockSearch, setStockSearch] = useState(project.topic || 'business');
    const [stockType, setStockType] = useState<'videos' | 'photos'>('videos');
    const [stockResults, setStockResults] = useState<NormalizedStockAsset[]>([]);
    const [isStockLoading, setIsStockLoading] = useState(false);
    
    // AI Video State
    const [aiVideoModel, setAiVideoModel] = useState<AiVideoModel>('runwayml');
    const [aiPrompt, setAiPrompt] = useState(project.script?.scenes[context?.sceneIndex ?? 0]?.visual || '');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    
    // Audio State
    const [audioSearch, setAudioSearch] = useState('cinematic');
    const [audioResults, setAudioResults] = useState<NormalizedStockAsset[]>([]);
    const [isAudioLoading, setIsAudioLoading] = useState(false);
    const [aiMusicPrompt, setAiMusicPrompt] = useState('upbeat corporate synth track');
    const [aiMusicDuration, setAiMusicDuration] = useState(60);
    const [aiSfxPrompt, setAiSfxPrompt] = useState('a cinematic whoosh');
    
    // Giphy State
    const [giphySearch, setGiphySearch] = useState('reaction');
    const [giphyType, setGiphyType] = useState<'stickers' | 'gifs'>('stickers');
    const [giphyResults, setGiphyResults] = useState<GiphyAsset[]>([]);
    const [isGiphyLoading, setIsGiphyLoading] = useState(false);
    
    useEffect(() => {
        if(isOpen) {
            handleStockSearch();
            handleAudioSearch();
        }
    }, [isOpen]);

    const handleAdd = (url: string, type: 'video' | 'image' | 'audio', track: string, options?: { duration?: number }) => {
        if (!context) return;
        onAddAsset(url, type, track, { sceneIndex: context.sceneIndex, startTime: context.startTime, ...options });
        onClose();
    };

    const handleStockSearch = useCallback(async () => {
        if (!user) return;
        setIsStockLoading(true);
        setStockResults([]);
        try {
            const results = await searchStockMedia(stockSearch, stockType);
            setStockResults(results);
        } catch (e) { addToast(`Stock search failed: ${getErrorMessage(e)}`, 'error'); } finally { setIsStockLoading(false); }
    }, [stockSearch, addToast, stockType, user, project.id]);
    
    const handleAudioSearch = useCallback(async () => {
        if (!user) return;
        setIsAudioLoading(true);
        setAudioResults([]);
        try {
            const results = await searchJamendoMusic(audioSearch);
            setAudioResults(results);
        } catch(e) { addToast(`Music search failed: ${getErrorMessage(e)}`, 'error'); } finally { setIsAudioLoading(false); }
    }, [audioSearch, addToast, user, project.id]);
    
    const handleGiphySearch = useCallback(async () => {
        setIsGiphyLoading(true);
        setGiphyResults([]);
        try {
            const results = await searchGiphy(giphySearch, giphyType);
            setGiphyResults(results);
        } catch (e) {
            addToast(`GIPHY search failed: ${getErrorMessage(e)}`, 'error');
        } finally {
            setIsGiphyLoading(false);
        }
    }, [giphySearch, giphyType, addToast]);
    
    const handleGenerate = (type: 'video' | 'image' | 'graphic' | 'music' | 'sfx') => lockAndExecute(async () => {
        let cost: number;
        
        switch(type) {
            case 'video': cost = 10; break;
            case 'image': cost = 1; break;
            case 'graphic': cost = 1; break;
            case 'music': cost = 3; break;
            case 'sfx': cost = 1; break;
            default: return;
        }

        if (type === 'video' && !aiPrompt.trim()) { addToast("Please enter a prompt.", "error"); return; }
        if (type === 'music' && !aiMusicPrompt.trim()) { addToast("Please enter a music prompt.", "error"); return; }
        if (type === 'sfx' && !aiSfxPrompt.trim()) { addToast("Please enter a SFX prompt.", "error"); return; }

        setIsGenerating(true);
        if (!await consumeCredits(cost)) { setIsGenerating(false); return; }

        try {
            addToast(`Generating AI ${type}... this may take a minute.`, 'info');
            
            let resultBlob: Blob;
            let successType: 'video' | 'image' | 'audio' = 'video';
            let targetTrack = context?.trackId || 'a-roll';
            let duration: number | undefined;

            if (type === 'video') {
                successType = 'video';
                if (aiVideoModel === 'runwayml') {
                    resultBlob = await generateRunwayVideoClip(aiPrompt, project.platform);
                } else {
                    const firstFrame = await generateAnimatedImage(aiPrompt, project.platform);
                    const reader = new FileReader();
                    reader.readAsDataURL(firstFrame);
                    await new Promise<void>(resolve => reader.onloadend = () => resolve());
                    const firstFrameBase64 = reader.result as string;

                    let payload: any;
                    if (aiVideoModel === 'kling') {
                        payload = { image: firstFrameBase64, duration: '5', prompt: aiPrompt };
                    } else if (aiVideoModel === 'minimax') {
                        payload = { first_frame_image: firstFrameBase64, prompt: aiPrompt, duration: 6 };
                    } else if (aiVideoModel === 'seedance') {
                        payload = { image: firstFrameBase64, prompt: aiPrompt, duration: '5' };
                    }
                    
                    const taskId = await startFreepikVideoGeneration(aiVideoModel, payload);
                    addToast(`Video task started (ID: ${taskId.slice(0, 8)}). Polling for result...`, 'info');
                    const videoUrl = await pollFreepikTask(aiVideoModel, taskId);
                    const videoResponse = await fetch(videoUrl);
                    if (!videoResponse.ok) throw new Error("Failed to download generated video from Freepik.");
                    resultBlob = await videoResponse.blob();
                }
            } else if (type === 'image') {
                resultBlob = await generateAnimatedImage(aiPrompt, project.platform);
                successType = 'image';
            } else if (type === 'graphic') {
                const dataUrl = await generateTextGraphic(aiPrompt);
                const res = await fetch(dataUrl);
                resultBlob = await res.blob();
                successType = 'image';
            } else if (type === 'music') {
                resultBlob = await generateAiMusic(aiMusicPrompt, aiMusicDuration);
                successType = 'audio';
                targetTrack = 'music';
                duration = aiMusicDuration;
            } else { // sfx
                resultBlob = await generateSfx(aiSfxPrompt);
                successType = 'audio';
                targetTrack = 'sfx';
            }

            addToast(`Uploading ${type} asset...`, 'info');
            const path = `${user!.id}/${project.id}/ai_assets/${Date.now()}.${resultBlob.type.split('/')[1]}`;
            const assetUrl = await uploadFile(resultBlob, path);
            handleAdd(assetUrl, successType, targetTrack, { duration });

        } catch (e) { addToast(`AI generation failed: ${getErrorMessage(e)}`, 'error'); } finally { setIsGenerating(false); }
    });

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || !user || !context) return;
        const file = event.target.files[0];
        if (!file.type.startsWith('video/') && !file.type.startsWith('image/')) { addToast("Invalid file type.", "error"); return; }

        setIsUploading(true);
        try {
            const path = `${user.id}/${project.id}/user_uploads/${Date.now()}_${file.name}`;
            const publicUrl = await uploadFile(file, path);
            handleAdd(publicUrl, file.type.startsWith('video') ? 'video' : 'image', context.trackId);
        } catch (e) { addToast(`Upload failed: ${getErrorMessage(e)}`, 'error'); } finally { setIsUploading(false); }
    };

    if (!isOpen) return null;

    const renderVisuals = () => (
         <div className="space-y-6">
            <div>
                <h4 className="font-bold text-white mb-2">Generate AI Media</h4>
                <div className="flex gap-2 mb-2">
                    <label htmlFor="ai-model-select" className="text-sm font-semibold text-gray-300 self-center">Model:</label>
                    <select id="ai-model-select" value={aiVideoModel} onChange={e => setAiVideoModel(e.target.value as AiVideoModel)} className="flex-grow bg-gray-900 border border-gray-600 rounded-md p-1 text-xs text-white">
                        <option value="runwayml">RunwayML</option>
                        <option value="kling">Kling v2</option>
                        <option value="minimax">MiniMax Hailuo</option>
                        <option value="seedance">Seedance Pro</option>
                    </select>
                </div>
                <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} rows={2} placeholder="Enter a detailed prompt for your visual..." className="w-full bg-gray-900 rounded-md p-2 text-sm text-white border border-gray-600" />
                <div className="grid grid-cols-3 gap-2 mt-2">
                    <button onClick={() => handleGenerate('video')} disabled={isGenerating} className="p-2 text-xs bg-gray-700 rounded text-center hover:bg-indigo-600 disabled:opacity-50">AI Video (10cr)</button>
                    <button onClick={() => handleGenerate('image')} disabled={isGenerating} className="p-2 text-xs bg-gray-700 rounded text-center hover:bg-indigo-600 disabled:opacity-50">AI Image (1cr)</button>
                    <button onClick={() => handleGenerate('graphic')} disabled={isGenerating} className="p-2 text-xs bg-gray-700 rounded text-center hover:bg-indigo-600 disabled:opacity-50">Text Graphic (1cr)</button>
                </div>
            </div>
            <div>
                <h4 className="font-bold text-white mb-2">Search Stock Media</h4>
                 <div className="flex gap-2 mb-2">
                    <button className={`flex-1 p-1 text-xs rounded bg-indigo-600`}>Pexels (Free)</button>
                </div>
                <div className="flex gap-2">
                    <input type="search" value={stockSearch} onChange={e => setStockSearch(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleStockSearch()} className="flex-grow w-full bg-gray-900 rounded-md p-2 text-sm text-white border border-gray-600"/>
                    <button onClick={handleStockSearch} className="p-2 bg-gray-700 rounded hover:bg-indigo-600"><SearchIcon className="w-5 h-5"/></button>
                </div>
                <div className="flex gap-2 mt-2">
                    <button onClick={() => setStockType('videos')} className={`flex-1 p-1 text-xs rounded ${stockType === 'videos' ? 'bg-indigo-600' : 'bg-gray-700'}`}>Videos</button>
                    <button onClick={() => setStockType('photos')} className={`flex-1 p-1 text-xs rounded ${stockType === 'photos' ? 'bg-indigo-600' : 'bg-gray-700'}`}>Photos</button>
                </div>
                <div className="mt-2 h-48 overflow-y-auto grid grid-cols-2 gap-2 p-1 bg-gray-900/50 rounded">
                    {isStockLoading ? <p className="text-gray-400 text-sm">Loading...</p> : stockResults.map(asset => (
                        <div key={`${asset.provider}-${asset.id}`} className="relative cursor-pointer group" onClick={() => handleAdd(asset.downloadUrl, asset.type, context?.trackId || 'a-roll')}>
                            <img src={asset.previewImageUrl} className="w-full h-24 object-cover rounded" alt={asset.description}/>
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <p className="text-white font-bold text-lg">Add</p>
                            </div>
                        </div>
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

    const renderAudio = () => (
        <div className="space-y-6">
            <div>
                <h4 className="font-bold text-white mb-2">Search Stock Music</h4>
                <div className="flex gap-2 mb-2">
                     <button className={`flex-1 p-1 text-xs rounded bg-indigo-600`}>Jamendo (Free)</button>
                </div>
                <div className="flex gap-2">
                    <input type="search" value={audioSearch} onChange={e => setAudioSearch(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleAudioSearch()} placeholder="Search for music..." className="flex-grow w-full bg-gray-900 rounded-md p-2 text-sm text-white border border-gray-600"/>
                    <button onClick={handleAudioSearch} className="p-2 bg-gray-700 rounded hover:bg-indigo-600"><SearchIcon className="w-5 h-5"/></button>
                </div>
                 <div className="mt-2 h-40 overflow-y-auto space-y-2 p-1 bg-gray-900/50 rounded">
                    {isAudioLoading ? <p className="text-gray-400 text-sm">Loading...</p> : audioResults.map(track => (
                        <div key={`${track.provider}-${track.id}`} onClick={() => handleAdd(track.downloadUrl, 'audio', 'music', { duration: track.duration })} className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-700 cursor-pointer">
                           <img src={track.previewImageUrl} alt={track.description} className="w-10 h-10 rounded object-cover" />
                           <div className="flex-1 truncate">
                                <p className="text-sm font-semibold text-white truncate">{track.description}</p>
                           </div>
                           {track.duration && <p className="text-xs text-gray-500">{Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}</p>}
                        </div>
                    ))}
                 </div>
            </div>
             <div>
                <h4 className="font-bold text-white mb-2">Generate AI Music (3cr)</h4>
                <input value={aiMusicPrompt} onChange={e => setAiMusicPrompt(e.target.value)} className="w-full bg-gray-900 rounded-md p-2 text-sm text-white border border-gray-600" />
                <div className="flex gap-2 mt-2 items-center">
                    <input type="range" min="10" max="180" value={aiMusicDuration} onChange={e => setAiMusicDuration(parseInt(e.target.value, 10))} className="w-full" />
                    <span className="text-xs text-gray-400 w-20 text-right">{aiMusicDuration}s</span>
                    <button onClick={() => handleGenerate('music')} disabled={isGenerating} className="p-2 text-xs bg-gray-700 rounded hover:bg-indigo-600 disabled:opacity-50">Generate</button>
                </div>
            </div>
             <div>
                <h4 className="font-bold text-white mb-2">Generate AI SFX (1cr)</h4>
                <div className="flex gap-2 mt-2">
                    <input value={aiSfxPrompt} onChange={e => setAiSfxPrompt(e.target.value)} className="flex-grow w-full bg-gray-900 rounded-md p-2 text-sm text-white border border-gray-600" />
                    <button onClick={() => handleGenerate('sfx')} disabled={isGenerating} className="p-2 text-xs bg-gray-700 rounded hover:bg-indigo-600 disabled:opacity-50">Generate</button>
                </div>
            </div>
        </div>
    );
    
    const renderGiphy = () => (
        <div className="space-y-6">
            <div>
                <h4 className="font-bold text-white mb-2">Search GIPHY</h4>
                <div className="flex gap-2">
                    <input type="search" value={giphySearch} onChange={e => setGiphySearch(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleGiphySearch()} placeholder="Search for stickers or GIFs..." className="flex-grow w-full bg-gray-900 rounded-md p-2 text-sm text-white border border-gray-600"/>
                    <button onClick={handleGiphySearch} className="p-2 bg-gray-700 rounded hover:bg-indigo-600"><SearchIcon className="w-5 h-5"/></button>
                </div>
                <div className="flex gap-2 mt-2">
                    <button onClick={() => setGiphyType('stickers')} className={`flex-1 p-1 text-xs rounded ${giphyType === 'stickers' ? 'bg-indigo-600' : 'bg-gray-700'}`}>Stickers (Transparent)</button>
                    <button onClick={() => setGiphyType('gifs')} className={`flex-1 p-1 text-xs rounded ${giphyType === 'gifs' ? 'bg-indigo-600' : 'bg-gray-700'}`}>GIFs</button>
                </div>
                <div className="mt-2 h-96 overflow-y-auto grid grid-cols-2 gap-2 p-1 bg-gray-900/50 rounded">
                    {isGiphyLoading ? <p className="text-gray-400 text-sm">Loading...</p> : giphyResults.map(asset => (
                        <div key={asset.id} className="relative cursor-pointer group" onClick={() => handleAdd(asset.images.original.url, 'image', 'overlay')}>
                            <img src={asset.images.fixed_width.url} alt={asset.title} className="w-full h-24 object-contain rounded bg-black/20" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <p className="text-white font-bold text-lg">Add</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-40 animate-fade-in-up" style={{ animationDuration: '0.3s' }} onClick={onClose}>
            <div className="bg-gray-800 border border-indigo-500/50 rounded-2xl shadow-2xl w-full max-w-lg m-4 p-6 flex flex-col text-left" onClick={(e) => e.stopPropagation()}>
                <header className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">Add Media to {context?.trackId}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white"><XCircleIcon className="w-7 h-7"/></button>
                </header>
                <div className="border-b border-gray-700">
                    <nav className="-mb-px flex space-x-4">
                        <button onClick={() => setActiveTab('visuals')} className={`py-2 px-1 border-b-2 text-sm font-medium ${activeTab === 'visuals' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-white'}`}>Visuals</button>
                        <button onClick={() => setActiveTab('audio')} className={`py-2 px-1 border-b-2 text-sm font-medium ${activeTab === 'audio' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-white'}`}>Music & SFX</button>
                        <button onClick={() => setActiveTab('giphy')} className={`py-2 px-1 border-b-2 text-sm font-medium ${activeTab === 'giphy' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-white'}`}>Stickers & GIFs</button>
                    </nav>
                </div>
                <div className="py-4 overflow-y-auto max-h-[70vh] p-1">
                   {activeTab === 'visuals' && renderVisuals()}
                   {activeTab === 'audio' && renderAudio()}
                   {activeTab === 'giphy' && renderGiphy()}
                </div>
            </div>
        </div>
    );
};

export default AssetPickerModal;