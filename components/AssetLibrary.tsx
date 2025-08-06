

import React, { useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { PhotoIcon, MicIcon, ClipboardCopyIcon } from './Icons';

interface FlatAsset {
    url: string;
    type: 'video' | 'audio';
    projectName: string;
    scene: number;
}

const AssetLibrary: React.FC = () => {
    const { t, projects, addToast } = useAppContext();
    const [activeTab, setActiveTab] = useState<'video' | 'audio'>('video');

    const allAssets = useMemo<FlatAsset[]>(() => {
        return projects.flatMap(project => {
            if (!project.assets) return [];
            return Object.entries(project.assets).flatMap(([sceneIndex, sceneAssets]) => {
                const assets: FlatAsset[] = [];
                if (sceneAssets.visualUrl) {
                    assets.push({
                        url: sceneAssets.visualUrl,
                        type: 'video', // Note: This assumes all visuals in the library are videos.
                        projectName: project.name,
                        scene: parseInt(sceneIndex) + 1,
                    });
                }
                if (sceneAssets.voiceoverUrl) {
                    assets.push({
                        url: sceneAssets.voiceoverUrl,
                        type: 'audio',
                        projectName: project.name,
                        scene: parseInt(sceneIndex) + 1,
                    });
                }
                return assets;
            });
        });
    }, [projects]);

    const filteredAssets = allAssets.filter(asset => asset.type === activeTab);
    
    const handleCopyUrl = (url: string) => {
        navigator.clipboard.writeText(url);
        addToast(t('toast.copied'), 'success');
    };

    return (
        <div className="animate-fade-in-up">
            <header className="text-center mb-12">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">
                    {t('asset_library.title')}
                </h1>
                <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
                    {t('asset_library.subtitle')}
                </p>
            </header>
            
            <div className="border-b border-gray-700 mb-8">
                <nav className="-mb-px flex justify-center space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('video')}
                        className={`${
                            activeTab === 'video' ? 'border-sky-500 text-sky-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
                        } group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                    >
                        <PhotoIcon className="-ml-0.5 mr-2 h-5 w-5" />
                        <span>Video Clips</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('audio')}
                        className={`${
                            activeTab === 'audio' ? 'border-sky-500 text-sky-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
                        } group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                    >
                        <MicIcon className="-ml-0.5 mr-2 h-5 w-5" />
                        <span>Voiceovers</span>
                    </button>
                </nav>
            </div>
            
            {filteredAssets.length === 0 ? (
                 <div className="text-center py-24 px-6 bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-700">
                    <PhotoIcon className="w-16 h-16 mx-auto text-sky-500 mb-6" />
                    <h2 className="text-2xl font-bold text-white mb-3">{t('asset_library.placeholder_title')}</h2>
                    <p className="text-gray-400 max-w-md mx-auto">{t('asset_library.placeholder_subtitle')}</p>
                </div>
            ) : (
                <div className={`grid gap-6 ${activeTab === 'video' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2'}`}>
                    {filteredAssets.map((asset, index) => (
                        <div key={index} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 group space-y-3">
                            {asset.type === 'video' ? (
                                <video src={asset.url} controls loop className="w-full aspect-video rounded-md bg-black object-cover"/>
                            ) : (
                                <audio src={asset.url} controls className="w-full"/>
                            )}
                            <div>
                                <p className="text-sm font-bold text-white truncate">{asset.projectName}</p>
                                <p className="text-xs text-gray-400">Scene {asset.scene}</p>
                            </div>
                            <button onClick={() => handleCopyUrl(asset.url)} className="w-full flex items-center justify-center gap-2 text-xs text-indigo-400 hover:text-white p-2 rounded-md bg-gray-700/50 hover:bg-indigo-600 transition-colors">
                               <ClipboardCopyIcon className="w-4 h-4"/> Copy Asset URL
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AssetLibrary;