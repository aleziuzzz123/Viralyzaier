import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Project, NormalizedStockAsset, GiphyAsset, AiVideoModel } from '../types.ts';
import { useAppContext } from '../contexts/AppContext.tsx';
import { SparklesIcon, SearchIcon, UploadIcon, FilmIcon, PhotoIcon, MusicNoteIcon, PlayCircleIcon, PlayIcon, PauseIcon } from './Icons.tsx';
import { searchStockMedia, searchPixabay } from '../services/geminiService.ts';
import { searchJamendoMusic } from '../services/jamendoService.ts';
import { searchGiphy } from '../services/giphyService.ts';
import { generateAiMusic, generateSfx, generateRunwayVideoClip, generateAiImage } from '../services/generativeMediaService.ts';
import { uploadFile } from '../services/supabaseService.ts';
import { getErrorMessage } from '../utils.ts';
import { v4 as uuidv4 } from 'uuid';

interface MediaPanelProps {
    project: Project;
    onAssetSelect: (url: string, type: 'video' | 'image' | 'audio', duration?: number, sourceData?: any) => void;
    activeTarget: { trackId: string; sceneIndex: number; startTime: number; } | null;
    setActiveTarget: (target: { trackId: string; sceneIndex: number; startTime: number; } | null) => void;
}

type LoadingState = { search?: boolean; generate?: boolean; upload?: boolean; };

const ActionPanel: React.FC<{
    onAction: (input: string) => void; placeholder: string; isLoading: boolean; buttonText: string; icon: React.ReactNode;
}> = ({ onAction, placeholder, isLoading, buttonText, icon }) => {
    const [input, setInput] = useState('');
    return (
        <div className="flex items-center gap-2 p-2 bg-gray-900 rounded-lg">
            <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && onAction(input)} placeholder={placeholder} className="flex-grow bg-transparent text-white focus:outline-none px-2" disabled={isLoading}/>
            <button onClick={() => onAction(input)} disabled={isLoading || !input.trim()} className="flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md px-4 py-2 text-sm disabled:bg-gray-500 flex items-center gap-2">
                {icon} {isLoading ? 'Loading...' : buttonText}
            </button>
        </div>
    );
};

const ResultsGrid: React.FC<{
    results: (NormalizedStockAsset | GiphyAsset)[]; onSelect: (url: string, type: 'video' | 'image' | 'audio', duration?: number, sourceData?: any) => void; isLoading: boolean;
}> = ({ results, onSelect, isLoading }) => {
    if (isLoading) return <div className="flex-grow flex items-center justify-center"><SparklesIcon className="w-8 h-8 text-indigo-400 animate-pulse" /></div>;
    if (results.length === 0) return <div className="flex-grow flex items-center justify-center text-gray-500">No results found.</div>;
    
    const handleDragStart = (e: React.DragEvent, result: NormalizedStockAsset | GiphyAsset) => {
        const isGiphy = 'images' in result;
        const assetData = {
            url: isGiphy ? result.images.original.url : result.downloadUrl,
            type: isGiphy ? 'video' : result.type,
            duration: 'duration' in result ? result.duration : undefined,
            sourceData: result
        };
        e.dataTransfer.setData('application/json-asset', JSON.stringify(assetData));
    };

    return (
        <div className="grid grid-cols-2 gap-2 p-2 overflow-y-auto flex-grow">
            {results.map((r: NormalizedStockAsset | GiphyAsset) => {
                const isGiphy = 'images' in r;
                const url = isGiphy ? r.images.original.url : r.downloadUrl;
                const previewUrl = isGiphy ? r.images.fixed_width.url : r.previewImageUrl;
                const type = isGiphy ? 'video' : r.type;
                const duration = 'duration' in r ? r.duration : undefined;
                return (
                    <div 
                        key={r.id} 
                        draggable="true"
                        onDragStart={(e) => handleDragStart(e, r)}
                        onClick={() => onSelect(url, type, duration, r)} 
                        className="aspect-square bg-black rounded-lg overflow-hidden group relative hover:ring-2 ring-indigo-500 focus:outline-none focus:ring-2 cursor-grab"
                    >
                        <img src={previewUrl} alt={isGiphy ? r.title : r.description} className="w-full h-full object-cover" />
                        {type === 'video' && <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><PlayCircleIcon className="w-8 h-8 text-white/80" /></div>}
                    </div>
                );
            })}
        </div>
    );
};

const AudioResultItem: React.FC<{ result: NormalizedStockAsset, onSelect: (url: string, type: 'audio', duration?: number) => void }> = ({ result, onSelect }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    const togglePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (audioRef.current) { if (isPlaying) audioRef.current.pause(); else audioRef.current.play(); setIsPlaying(!isPlaying); }
    };
    
    useEffect(() => {
        const audio = audioRef.current;
        const handleEnded = () => setIsPlaying(false);
        audio?.addEventListener('ended', handleEnded);
        return () => audio?.removeEventListener('ended', handleEnded);
    }, []);

    return (
        <div className="flex items-center gap-3 p-2 bg-gray-700/50 rounded-lg">
            <audio ref={audioRef} src={result.downloadUrl} preload="metadata" />
            <button onClick={togglePlay} className="p-1">{ isPlaying ? <PauseIcon className="w-5 h-5 text-white" /> : <PlayIcon className="w-5 h-5 text-white" /> }</button>
            <div className="flex-grow min-w-0"><p className="text-sm font-semibold text-white truncate">{result.description}</p></div>
            <button onClick={() => onSelect(result.downloadUrl, 'audio', result.duration)} className="flex-shrink-0 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-md hover:bg-indigo-500">Add</button>
        </div>
    );
};

const MediaPanel: React.FC<MediaPanelProps> = ({ project, onAssetSelect, activeTarget, setActiveTarget }) => {
    const { user, lockAndExecute, addToast } = useAppContext();
    const [loading, setLoading] = useState<LoadingState>({});
    const [results, setResults] = useState<(NormalizedStockAsset | GiphyAsset)[]>([]);
    
    const assetType = useMemo(() => {
        if (!activeTarget) return 'visual';
        switch (activeTarget.trackId) {
            case 'a-roll': case 'b-roll': case 'overlay': return 'visual';
            case 'music': return 'music'; case 'sfx': return 'sfx'; default: return 'visual';
        }
    }, [activeTarget]);
    
    const [activeTab, setActiveTab] = useState(assetType);
    useEffect(() => { setActiveTab(assetType); }, [assetType]);

    const handleGenerateVideo = (prompt: string) => lockAndExecute(async () => {
        setLoading({ generate: true });
        try {
            const blob = await generateRunwayVideoClip(prompt, project.platform);
            const url = await uploadFile(blob, `${user!.id}/${project.id}/ai-assets/${uuidv4()}.mp4`);
            onAssetSelect(url, 'video');
        } catch (e) { addToast(getErrorMessage(e), 'error'); } 
        finally { setLoading({}); }
    });

    const handleGenerateImage = (prompt: string) => lockAndExecute(async () => {
        setLoading({ generate: true }); setResults([]);
        try {
            const blob = await generateAiImage(prompt, project.platform);
            const url = await uploadFile(blob, `${user!.id}/${project.id}/ai-assets/${uuidv4()}.jpg`);
            setResults([{ id: uuidv4(), previewImageUrl: url, downloadUrl: url, type: 'image', description: prompt, provider: 'pexels'}]);
        } catch (e) { addToast(getErrorMessage(e), 'error'); } 
        finally { setLoading({ generate: false }); }
    });

    const handleGenerateAudio = (prompt: string, type: 'music' | 'sfx') => lockAndExecute(async () => {
        setLoading({ generate: true }); setResults([]);
        try {
            const blob = type === 'music' ? await generateAiMusic(prompt, 30) : await generateSfx(prompt);
            const url = await uploadFile(blob, `${user!.id}/${project.id}/ai-assets/${uuidv4()}.mp3`);
            setResults([{ id: uuidv4(), previewImageUrl: 'https://storage.googleapis.com/gemini-web-assets/notebook-assets/music_placeholder.png', downloadUrl: url, type: 'audio', description: `AI: ${prompt}`, provider: 'jamendo', duration: type === 'music' ? 30 : 2 }]);
        } catch (e) { addToast(getErrorMessage(e), 'error'); } 
        finally { setLoading({ generate: false }); }
    });

    const handleUpload = useCallback((file: File) => lockAndExecute(async () => {
        const assetType = file.type.startsWith('video') ? 'video' : 'image';
        setLoading({ upload: true });
        try {
            addToast(`Uploading...`, 'info');
            const path = `${user!.id}/${project.id}/uploads/${uuidv4()}.${file.name.split('.').pop()}`;
            const publicUrl = await uploadFile(file, path);
            onAssetSelect(publicUrl, assetType);
        } catch (err) { addToast(`Upload failed: ${getErrorMessage(err)}`, 'error'); } 
        finally { setLoading({}); }
    }), [user, project.id, onAssetSelect, addToast, lockAndExecute]);

    const handleSearch = (query: string, source: 'pexels' | 'pixabay' | 'giphy' | 'jamendo', type: 'videos' | 'photos') => lockAndExecute(async () => {
        setLoading({ search: true }); setResults([]);
        try {
            let searchResults: (NormalizedStockAsset | GiphyAsset)[];
            if (source === 'pexels') searchResults = await searchStockMedia(query, type);
            else if (source === 'pixabay') searchResults = await searchPixabay(query, type);
            else if (source === 'giphy') searchResults = await searchGiphy(query, 'stickers');
            else searchResults = await searchJamendoMusic(query);
            setResults(searchResults);
        } catch (e) { addToast(getErrorMessage(e), 'error'); } 
        finally { setLoading({}); }
    });

    const renderTabs = () => {
        const visualTabs = ['ai_video', 'ai_image', 'stock', 'giphy', 'upload'];
        const audioTabs = { 'music': ['stock_music', 'ai_music'], 'sfx': ['ai_sfx'] };
        let currentTabs: string[] = [];
        if(assetType === 'visual') currentTabs = visualTabs;
        else if (assetType === 'music') currentTabs = audioTabs.music;
        else if (assetType === 'sfx') currentTabs = audioTabs.sfx;

        return (
            <div className="flex border-b border-gray-700 flex-shrink-0 p-1">
                {currentTabs.map(tabId => (
                    <button key={tabId} onClick={() => { setActiveTab(tabId); setResults([]); }} className={`flex-1 py-1 text-xs rounded ${activeTab === tabId ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>{tabId.replace(/_/g, ' ').toUpperCase()}</button>
                ))}
            </div>
        );
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'ai_video': return <div className="p-2"><ActionPanel onAction={(p) => handleGenerateVideo(p)} placeholder="Describe a video to generate..." isLoading={!!loading.generate} buttonText="Generate (10 Cr)" icon={<SparklesIcon className="w-4 h-4"/>} /></div>;
            case 'ai_image': return <div className="p-2"><ActionPanel onAction={(p) => handleGenerateImage(p)} placeholder="Describe an image to create..." isLoading={!!loading.generate} buttonText="Generate (1 Cr)" icon={<PhotoIcon className="w-4 h-4"/>} /></div>;
            case 'stock': return <div className="p-2"><ActionPanel onAction={(q) => handleSearch(q, 'pexels', 'videos')} placeholder="Search stock videos..." isLoading={!!loading.search} buttonText="Search" icon={<SearchIcon className="w-4 h-4"/>} /></div>;
            case 'giphy': return <div className="p-2"><ActionPanel onAction={(q) => handleSearch(q, 'giphy', 'videos')} placeholder="Search GIPHY stickers..." isLoading={!!loading.search} buttonText="Search" icon={<SearchIcon className="w-4 h-4"/>} /></div>;
            case 'upload': return <div className="p-2"><input type="file" onChange={(e) => e.target.files && handleUpload(e.target.files[0])} accept="video/*,image/*" className="hidden" id="upload-input" /><label htmlFor="upload-input" className="w-full flex items-center justify-center gap-2 p-4 bg-gray-900 border-2 border-dashed rounded-lg cursor-pointer hover:border-indigo-500"><UploadIcon className="w-6 h-6 text-gray-500"/>{loading.upload ? "Uploading..." : "Click to browse"}</label></div>;
            case 'stock_music': return <div className="p-2"><ActionPanel onAction={(q) => handleSearch(q, 'jamendo', 'videos')} placeholder="Search music (e.g., 'upbeat')..." isLoading={!!loading.search} buttonText="Search" icon={<SearchIcon className="w-4 h-4"/>} /></div>;
            case 'ai_music': return <div className="p-2"><ActionPanel onAction={(p) => handleGenerateAudio(p, 'music')} placeholder="Describe music to generate..." isLoading={!!loading.generate} buttonText="Generate (2 Cr)" icon={<SparklesIcon className="w-4 h-4"/>} /></div>;
            case 'ai_sfx': return <div className="p-2"><ActionPanel onAction={(p) => handleGenerateAudio(p, 'sfx')} placeholder="Describe a sound effect..." isLoading={!!loading.generate} buttonText="Generate (1 Cr)" icon={<SparklesIcon className="w-4 h-4"/>} /></div>;
            default: return null;
        }
    };
    
    const renderResults = () => {
        if (assetType === 'music' || assetType === 'sfx') {
            return (
                <div className="p-2 space-y-2 overflow-y-auto flex-grow">
                    {results.map(r => 'downloadUrl' in r && r.type === 'audio' && <AudioResultItem key={r.id} result={r} onSelect={onAssetSelect} />)}
                </div>
            );
        }
        return <ResultsGrid results={results} onSelect={onAssetSelect} isLoading={!!loading.search || !!loading.generate} />;
    };

    return (
        <aside className="h-full bg-gray-800/50 flex flex-col" data-tour="add-media">
            {renderTabs()}
            {renderContent()}
            {renderResults()}
        </aside>
    );
};

export default MediaPanel;