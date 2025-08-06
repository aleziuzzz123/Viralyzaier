import React, { useState, useEffect, useCallback } from 'react';
import { Project, VisualType, StockAsset, UserAsset, Scene } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { XCircleIcon, SparklesIcon, UploadIcon, FilmIcon, SearchIcon, PhotoIcon, TypeIcon } from './Icons';
import { searchStockMedia, generateTextGraphic } from '../services/geminiService';
import { generateVideoClip, generateAnimatedImage } from '../services/generativeMediaService';
import { uploadFile } from '../services/supabaseService';
import { getErrorMessage } from '../utils';
import { v4 as uuidv4 } from 'uuid';

interface AssetPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project;
    scene: Scene;
    onAssetSelect: (url: string, type: VisualType) => void;
}

const AssetPickerModal: React.FC<AssetPickerModalProps> = ({ isOpen, onClose, project, scene, onAssetSelect }) => {
    const { t, user, handleUpdateProject, addToast, consumeCredits, lockAndExecute } = useAppContext();
    const [activeTab, setActiveTab] = useState<'ai' | 'stock'>('ai');
    
    // Stock Media State
    const [stockSearch, setStockSearch] = useState(scene.visual);
    const [stockType, setStockType] = useState<'videos' | 'photos'>('videos');
    const [stockResults, setStockResults] = useState<StockAsset[]>([]);
    const [isStockLoading, setIsStockLoading] = useState(false);
    
    // AI Generation State
    const [isGenerating, setIsGenerating] = useState(false);

    const handleStockSearch = useCallback(async () => {
        setIsStockLoading(true);
        setStockResults([]);
        try {
            const results = await searchStockMedia(stockSearch, stockType);
            let mappedResults: StockAsset[] = [];
            if (stockType === 'videos' && results.videos) {
                mappedResults = results.videos.map((v: any) => ({
                    id: v.id,
                    url: v.video_files.find((f: any) => f.quality === 'hd')?.link || v.video_files[0].link,
                    type: 'video',
                    description: `Video by ${v.user.name}`,
                    user: { name: v.user.name, url: v.user.url }
                }));
            } else if (stockType === 'photos' && results.photos) {
                mappedResults = results.photos.map((p: any) => ({
                    id: p.id,
                    url: p.src.large,
                    type: 'photo',
                    description: p.alt || `Photo by ${p.photographer}`,
                    user: { name: p.photographer, url: p.photographer_url }
                }));
            }
            setStockResults(mappedResults);
        } catch (e) {
            addToast(`Stock search failed: ${getErrorMessage(e)}`, 'error');
        } finally {
            setIsStockLoading(false);
        }
    }, [stockSearch, addToast, stockType]);
    
    useEffect(() => {
        if(isOpen && activeTab === 'stock' && stockResults.length === 0) {
            handleStockSearch();
        }
    }, [isOpen, activeTab, stockType, handleStockSearch, stockResults.length]);

    const handleGenerate = (type: 'video' | 'image' | 'graphic') => lockAndExecute(async () => {
        setIsGenerating(true);
        let cost = 0;
        let generationFunc: () => Promise<string | Blob>;
        let visualType: VisualType = 'ai_image';

        switch(type) {
            case 'video':
                cost = 10;
                visualType = 'ai_video';
                generationFunc = () => generateVideoClip(scene.visual, project.platform);
                break;
            case 'image':
                cost = 1;
                visualType = 'ai_image';
                generationFunc = () => generateAnimatedImage(scene.visual, project.platform);
                break;
            case 'graphic':
                cost = 1;
                visualType = 'ai_graphic';
                generationFunc = () => generateTextGraphic(scene.onScreenText || scene.visual);
                break;
        }

        if (!await consumeCredits(cost)) {
            setIsGenerating(false);
            return;
        }

        try {
            addToast(`Generating AI ${type}... this may take a minute.`, 'info');
            const result = await generationFunc();
            const assetBlob = result instanceof Blob ? result : await (await fetch(result)).blob();
            
            addToast(t('toast.uploading_asset', { type }), 'info');
            const subtype = assetBlob.type.split('/')[1];
            const extension = subtype === 'svg+xml' ? 'svg' : subtype.split('+')[0]; // handle svg+xml, etc.
            
            const path = `${user!.id}/${project.id}/ai_assets/${uuidv4()}.${extension}`;
            const assetUrl = await uploadFile(assetBlob, path);
            onAssetSelect(assetUrl, visualType);
        } catch (e) {
            addToast(`AI generation failed: ${getErrorMessage(e)}`, 'error');
        } finally {
            setIsGenerating(false);
        }
    });
    
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center animate-fade-in-up" style={{ animationDuration: '0.3s' }} onClick={onClose}>
            <div className="bg-gray-800 border border-indigo-500/50 rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] m-4 flex flex-col" onClick={(e) => e.stopPropagation()}>
                <header className="p-6 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-2xl font-bold text-white">{t('final_edit.replace_modal_title')}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white"><XCircleIcon className="w-8 h-8"/></button>
                </header>
                
                <div className="flex-grow flex min-h-0">
                    <aside className="w-64 bg-gray-900/50 p-4 border-r border-gray-700 flex-shrink-0">
                        <nav className="space-y-2">
                            <button onClick={() => setActiveTab('ai')} className={`w-full flex items-center gap-3 p-3 rounded-lg text-left font-semibold transition-colors ${activeTab === 'ai' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}><SparklesIcon className="w-5 h-5"/> {t('final_edit.replace_modal_ai_assets')}</button>
                            <button onClick={() => setActiveTab('stock')} className={`w-full flex items-center gap-3 p-3 rounded-lg text-left font-semibold transition-colors ${activeTab === 'stock' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}><FilmIcon className="w-5 h-5"/> {t('final_edit.replace_modal_stock_media')}</button>
                        </nav>
                    </aside>
                    
                    <main className="flex-grow p-6 overflow-y-auto">
                        {activeTab === 'ai' && (
                            <div className="space-y-6">
                                <div className="bg-gray-900/50 p-4 rounded-lg">
                                    <p className="text-sm font-semibold text-gray-300">Visual Prompt:</p>
                                    <p className="text-gray-200 mt-1 italic">"{scene.visual}"</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <button onClick={() => handleGenerate('video')} disabled={isGenerating} className="p-4 bg-gray-700 rounded-lg text-center hover:bg-indigo-700 disabled:bg-gray-600"><FilmIcon className="w-8 h-8 mx-auto mb-2"/>Generate AI Video<span className="block text-xs text-gray-400">(10 Credits)</span></button>
                                    <button onClick={() => handleGenerate('image')} disabled={isGenerating} className="p-4 bg-gray-700 rounded-lg text-center hover:bg-indigo-700 disabled:bg-gray-600"><PhotoIcon className="w-8 h-8 mx-auto mb-2"/>Generate AI Image<span className="block text-xs text-gray-400">(1 Credit)</span></button>
                                    <button onClick={() => handleGenerate('graphic')} disabled={isGenerating || !scene.onScreenText} title={!scene.onScreenText ? "No on-screen text in script for this scene" : ""} className="p-4 bg-gray-700 rounded-lg text-center hover:bg-indigo-700 disabled:bg-gray-600 disabled:opacity-50"><TypeIcon className="w-8 h-8 mx-auto mb-2"/>Generate Text Graphic<span className="block text-xs text-gray-400">(1 Credit)</span></button>
                                </div>
                            </div>
                        )}
                        {activeTab === 'stock' && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 pb-4">
                                    <input type="search" value={stockSearch} onChange={e => setStockSearch(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleStockSearch()} placeholder={t('final_edit.search_stock_placeholder')} className="flex-grow bg-gray-900 border-gray-600 rounded-lg p-3 text-white"/>
                                    <button onClick={handleStockSearch} className="p-3 bg-indigo-600 rounded-lg text-white"><SearchIcon className="w-6 h-6"/></button>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setStockType('videos')} className={`px-4 py-2 rounded-full font-semibold text-sm ${stockType === 'videos' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300'}`}>Videos</button>
                                    <button onClick={() => setStockType('photos')} className={`px-4 py-2 rounded-full font-semibold text-sm ${stockType === 'photos' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300'}`}>Photos</button>
                                </div>
                                {isStockLoading ? <p className="text-gray-400 text-center py-8">Loading...</p> : stockResults.length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {stockResults.map(asset => ( <div key={asset.id} onClick={() => onAssetSelect(asset.url, 'stock')} className="aspect-video bg-black rounded-lg overflow-hidden cursor-pointer group relative">
                                            {asset.type === 'video' ? ( <video src={asset.url} loop muted autoPlay className="w-full h-full object-cover"/> ) : ( <img src={asset.url} alt={asset.description} className="w-full h-full object-cover"/> )}
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><p className="text-white font-bold">Select</p></div>
                                            <a href={asset.user.url} target="_blank" rel="noopener noreferrer" className="absolute bottom-1 right-1 text-white text-[10px] bg-black/50 px-1 rounded opacity-70 group-hover:opacity-100 transition-opacity">by {asset.user.name}</a>
                                        </div> ))}
                                    </div>
                                ) : <p className="text-gray-500 text-center py-8">{t('final_edit.no_stock_results')}</p>}
                                <div className="text-center text-xs text-gray-500 pt-4">
                                    <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer">Photos and Videos provided by Pexels</a>
                                </div>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
};

export default AssetPickerModal;