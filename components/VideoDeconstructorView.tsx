

import React, { useState, useContext, useCallback } from 'react';
import { deconstructVideo, QUOTA_ERROR_MESSAGE } from '../services/geminiService.ts';
import type { VideoDeconstruction, Script } from '../types.ts';
import { ScriptCard } from './ScriptCard.tsx';
import { DataContext } from '../context/DataContext.tsx';
import { UIContext } from '../context/UIContext.tsx';
import { AuthContext } from '../context/AuthContext.tsx';

interface VideoDeconstructorViewProps {
    onOpenSaveModal: (script: Script) => void;
    onUnsaveScript: (scriptId: string) => void;
    isScriptSaved: (script: Script) => boolean;
    scoringScriptId: string | null;
    onVisualize: (scriptId: string, artStyle: string) => void;
    visualizingScriptId: string | null;
    onToggleSpeech: (script: Script) => void;
    speakingScriptId: string | null;
}

const LoadingState: React.FC = () => (
    <div className="bg-[#2A1A5E]/50 rounded-xl border border-[#4A3F7A]/30 p-8 mt-8 space-y-6 animate-pulse">
        <div className="h-8 bg-slate-700 rounded w-3/4"></div>
        <div className="space-y-4">
            <div className="h-5 bg-slate-700 rounded w-1/4"></div>
            <div className="h-12 bg-slate-700 rounded"></div>
        </div>
        <div className="space-y-4">
            <div className="h-5 bg-slate-700 rounded w-1/4"></div>
            <div className="h-12 bg-slate-700 rounded"></div>
        </div>
        <div className="border-t border-slate-700 my-4"></div>
        <div className="h-8 bg-slate-700 rounded w-1/2"></div>
        <div className="aspect-video bg-slate-700 rounded-lg"></div>
    </div>
);

export const VideoDeconstructorView: React.FC<VideoDeconstructorViewProps> = ({ 
    onOpenSaveModal, onUnsaveScript, isScriptSaved, scoringScriptId, onVisualize, visualizingScriptId, onToggleSpeech, speakingScriptId
}) => {
    const { state: { user } } = useContext(AuthContext);
    const { dispatch: dataDispatch } = useContext(DataContext);
    const { dispatch: uiDispatch } = useContext(UIContext);
    const [videoUrl, setVideoUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<VideoDeconstruction | null>(null);
    const [sources, setSources] = useState<{ uri: string; title: string }[]>([]);

    const addNotification = useCallback((message: string) => {
        if(user) {
            dataDispatch({ type: 'ADD_NOTIFICATION_REQUEST', payload: { message, userId: user.id } });
        }
    }, [dataDispatch, user]);

    const isValidUrl = (url: string) => {
        try {
            const newUrl = new URL(url);
            return newUrl.protocol === 'http:' || newUrl.protocol === 'https:';
        } catch (_) {
            return false;
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!videoUrl || !isValidUrl(videoUrl)) {
            setError("Please enter a valid YouTube video URL.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setResult(null);
        setSources([]);
        addNotification("AI is deconstructing the video...");
        try {
            const { deconstruction, sources: fetchedSources } = await deconstructVideo(videoUrl);
            setResult(deconstruction);
            setSources(fetchedSources);
            addNotification("Video deconstruction complete!");
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            if (errorMessage === QUOTA_ERROR_MESSAGE) {
                uiDispatch({ type: 'SET_QUOTA_ERROR', payload: errorMessage });
            } else {
                setError(errorMessage);
                addNotification(`Error deconstructing video: ${errorMessage}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const renderAnalysisCard = (title: string, content: string, icon: string) => (
        <div className="bg-[#1A0F3C] p-4 rounded-lg">
            <h4 className="font-semibold text-purple-200 text-sm tracking-wider uppercase mb-2"><i className={`${icon} mr-2 text-[#DAFF00]/70`}></i>{title}</h4>
            <p className="text-white/90 text-sm">{content}</p>
        </div>
    );

    return (
        <div>
            <div className="text-center mb-8">
                <i className="fa-solid fa-person-burst text-4xl text-[#DAFF00] mb-3"></i>
                <h1 className="text-3xl font-bold text-white mb-2">Viral Video Deconstructor</h1>
                <p className="text-purple-300 max-w-2xl mx-auto">Paste any YouTube URL to analyze its viral formula and generate new ideas from it.</p>
            </div>

            <form onSubmit={handleSubmit} className="mb-8">
                <div className="flex flex-col md:flex-row gap-2">
                    <input
                        type="url"
                        value={videoUrl}
                        onChange={(e) => { setVideoUrl(e.target.value); setError(null); }}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="w-full bg-[#1A0F3C] border border-[#4A3F7A] rounded-md py-3 px-4 text-[#F0F0F0] placeholder-purple-300/50 focus:ring-2 focus:ring-[#DAFF00] focus:border-[#DAFF00] focus:outline-none transition duration-200"
                        required
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !videoUrl}
                        className="w-full md:w-auto flex-shrink-0 flex items-center justify-center bg-[#DAFF00] text-[#1A0F3C] font-bold py-3 px-6 rounded-md hover:bg-opacity-90 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-200"
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-[#1A0F3C]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Deconstructing...
                            </>
                        ) : (
                            "Analyze Video"
                        )}
                    </button>
                </div>
                 {error && <p className="text-red-400 text-sm mt-2 text-center md:text-left">{error}</p>}
            </form>
            
            {isLoading && <LoadingState />}
            
            {result && (
                <div className="bg-[#2A1A5E]/50 rounded-xl border border-[#4A3F7A]/30 p-6 md:p-8 mt-8">
                    <h2 className="text-2xl font-bold text-white mb-1">Deconstruction of:</h2>
                    <p className="text-[#DAFF00] italic mb-6">"{result.title}"</p>

                    <div className="grid md:grid-cols-2 gap-4 mb-8">
                        {renderAnalysisCard('The Hook', result.analysis.hook, 'fa-solid fa-fish')}
                        {renderAnalysisCard('The Structure', result.analysis.structure, 'fa-solid fa-sitemap')}
                        {renderAnalysisCard('Value Proposition', result.analysis.valueProposition, 'fa-solid fa-gift')}
                        {renderAnalysisCard('Call To Action', result.analysis.callToAction, 'fa-solid fa-bullhorn')}
                    </div>

                    {result.thumbnailAnalysis && (
                         <div className="border-t border-[#4A3F7A]/50 pt-8 mt-8">
                             <h3 className="text-2xl font-bold text-white mb-6">Thumbnail Analysis & Ideas</h3>
                             <div className="bg-[#1A0F3C] p-4 rounded-lg mb-6">
                                <h4 className="font-semibold text-purple-200 text-sm tracking-wider uppercase mb-2"><i className="fa-solid fa-lightbulb mr-2 text-[#DAFF00]/70"></i>Effectiveness Analysis</h4>
                                <p className="text-white/90 text-sm">{result.thumbnailAnalysis.effectiveness}</p>
                             </div>
                             <h4 className="font-semibold text-purple-200 text-sm tracking-wider uppercase mb-3">Generated Thumbnail Ideas:</h4>
                             <div className="grid md:grid-cols-3 gap-4">
                                {result.thumbnailAnalysis.ideas.map((idea, index) => (
                                    <div key={index} className="bg-[#1A0F3C] p-4 rounded-lg border border-[#4A3F7A]/50 flex flex-col">
                                        <p className="font-bold text-center text-[#DAFF00] text-lg mb-2">"{idea.title}"</p>
                                        <p className="text-xs text-purple-200 leading-relaxed text-center">{idea.visual}</p>
                                    </div>
                                ))}
                             </div>
                         </div>
                    )}
                    
                    <div className="border-t border-[#4A3F7A]/50 pt-8 mt-8">
                         <h3 className="text-2xl font-bold text-white mb-6">New Scripts Based On This Formula:</h3>
                         <div className="space-y-6">
                            {result.generatedScripts.map(script => (
                                <ScriptCard
                                    key={script.id}
                                    script={script}
                                    onOpenSaveModal={onOpenSaveModal}
                                    onUnsave={onUnsaveScript}
                                    isSaved={isScriptSaved(script)}
                                    isScoring={scoringScriptId === script.id}
                                    onVisualize={onVisualize}
                                    isVisualizing={visualizingScriptId === script.id}
                                    onToggleSpeech={onToggleSpeech}
                                    isSpeaking={speakingScriptId === script.id}
                                />
                            ))}
                         </div>
                    </div>

                    {sources.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-[#4A3F7A]/30">
                            <h3 className="text-sm font-semibold text-purple-300 uppercase tracking-wider mb-3">Data Sources</h3>
                            <ul className="list-disc list-inside space-y-2">
                                {sources.map((source, index) => (
                                    <li key={index} className="text-xs">
                                        <a 
                                            href={source.uri} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-purple-300 hover:text-[#DAFF00] underline"
                                        >
                                            {source.title || source.uri}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
