

import React, { useState, useEffect, useCallback, useContext } from 'react';
import type { Script, Trend } from '../types.ts';
import { fetchTrendingTopics, QUOTA_ERROR_MESSAGE } from '../services/geminiService.ts';
import { ScriptCard } from './ScriptCard.tsx';
import { TrendCard } from './TrendCard.tsx';
import { AuthContext } from '../context/AuthContext.tsx';
import { DataContext } from '../context/DataContext.tsx';
import { UIContext } from '../context/UIContext.tsx';

interface DashboardHomeViewProps {
    onNavigate: (view: string) => void;
    recentScripts: Script[];
    onOpenSaveModal: (script: Script) => void;
    onUnsaveScript: (scriptId: string) => void;
    isScriptSaved: (script: Script) => boolean;
    scoringScriptId: string | null;
    onGenerateForTrend: (topic: string) => void;
    agencyClientCount: number;
    watchedTrends: Trend[];
    onWatchTrend: (trend: Trend) => void;
    onUnwatchTrend: (topic: string) => void;
    isTrendWatched: (topic: string) => boolean;
    onVisualize: (scriptId: string, artStyle: string) => void;
    visualizingScriptId: string | null;
    scriptOfTheDay?: Script;
    onToggleSpeech: (script: Script) => void;
    speakingScriptId: string | null;
}

const SkeletonTrendCard: React.FC = () => (
    <div className="bg-[#2A1A5E] rounded-xl border border-[#4A3F7A] p-6 shadow-lg animate-pulse flex flex-col space-y-4 h-[320px]">
        <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-full bg-slate-700 flex-shrink-0"></div>
            <div className="flex-grow space-y-2 pt-2">
                <div className="h-5 bg-slate-700 rounded w-3/4"></div>
                <div className="h-4 bg-slate-700 rounded w-full"></div>
                <div className="h-4 bg-slate-700 rounded w-5/6"></div>
            </div>
        </div>
        <div className="space-y-3 pt-4 border-t border-slate-700/50">
             <div className="h-4 bg-slate-700 rounded w-1/2"></div>
             <div className="h-4 bg-slate-700 rounded w-1/3"></div>
        </div>
         <div className="mt-auto pt-4">
            <div className="h-9 bg-slate-700 rounded-md w-full"></div>
        </div>
    </div>
);

const QuickActionCard: React.FC<{icon: string, title: string, description: string, onClick: () => void}> = ({icon, title, description, onClick}) => (
    <button onClick={onClick} className="bg-[#2A1A5E] p-6 rounded-xl border border-[#4A3F7A] text-left hover:border-[#DAFF00] hover:-translate-y-1 transition-all duration-300 w-full flex items-start space-x-4">
        <i className={`${icon} text-3xl text-[#DAFF00] mt-1`}></i>
        <div>
            <h3 className="text-lg font-bold text-white">{title}</h3>
            <p className="text-sm text-purple-200/80">{description}</p>
        </div>
    </button>
);

export const DashboardHomeView: React.FC<DashboardHomeViewProps> = ({
    onNavigate,
    recentScripts,
    onOpenSaveModal,
    onUnsaveScript,
    isScriptSaved,
    scoringScriptId,
    onGenerateForTrend,
    agencyClientCount,
    watchedTrends,
    onWatchTrend,
    onUnwatchTrend,
    isTrendWatched,
    onVisualize,
    visualizingScriptId,
    scriptOfTheDay,
    onToggleSpeech,
    speakingScriptId
}) => {
    const { state: { user } } = useContext(AuthContext);
    const { dispatch: dataDispatch } = useContext(DataContext);
    const { dispatch: uiDispatch } = useContext(UIContext);
    const [trendingTopics, setTrendingTopics] = useState<Trend[]>([]);
    const [sources, setSources] = useState<{ uri: string; title: string }[]>([]);
    const [isLoadingTrends, setIsLoadingTrends] = useState(true);
    const [trendError, setTrendError] = useState<string | null>(null);

     const addNotification = useCallback((message: string) => {
        if(user) {
            dataDispatch({ type: 'ADD_NOTIFICATION_REQUEST', payload: { message, userId: user.id } });
        }
    }, [dataDispatch, user]);

    const loadTrends = useCallback(async (forceRefresh: boolean = false) => {
        const cacheKey = 'vsh_trending_topics';
        setIsLoadingTrends(true);
        setTrendError(null);

        if (forceRefresh) {
            sessionStorage.removeItem(cacheKey);
            addNotification("Refreshing trending topics...");
        } else {
            const cachedData = sessionStorage.getItem(cacheKey);
            if (cachedData) {
                const { trends, sources, timestamp } = JSON.parse(cachedData);
                // Cache valid for 15 minutes
                if (new Date().getTime() - timestamp < 15 * 60 * 1000) {
                    setTrendingTopics(trends.slice(0, 2));
                    setSources(sources);
                    setIsLoadingTrends(false);
                    return;
                }
            }
        }

        try {
            const { trends, sources } = await fetchTrendingTopics(user?.primary_niche);
            const cachePayload = { trends, sources, timestamp: new Date().getTime() };
            sessionStorage.setItem(cacheKey, JSON.stringify(cachePayload));
            setTrendingTopics(trends.slice(0, 2)); 
            setSources(sources);
            if (forceRefresh) {
              addNotification("Trends refreshed!");
            }
        } catch (error) {
            console.error("Failed to load trends for dashboard home:", error);
            const errorMessage = error instanceof Error ? error.message : "Could not fetch trends."
            if (errorMessage === QUOTA_ERROR_MESSAGE) {
                uiDispatch({ type: 'SET_QUOTA_ERROR', payload: errorMessage });
            } else {
                setTrendError(errorMessage);
                addNotification(`Failed to load trends for dashboard home: ${errorMessage}`);
            }
        } finally {
            setIsLoadingTrends(false);
        }
    }, [addNotification, user?.primary_niche, uiDispatch]);
    
    useEffect(() => {
        loadTrends();
    }, [loadTrends]);

    return (
        <div className="space-y-10">
            <div>
                <h1 className="text-3xl font-bold text-white">Today's Hub</h1>
                <p className="text-purple-300">Your daily dose of personalized viral inspiration.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <QuickActionCard icon="fa-solid fa-wand-magic-sparkles" title="Generate New Scripts" description="Start with a fresh topic or keyword." onClick={() => onNavigate('Script Generator')} />
                <QuickActionCard icon="fa-solid fa-gem" title="Browse DFY Content Vault" description="Get proven scripts, hooks, and more." onClick={() => onNavigate('DFY Content Vault')} />
            </div>

            {/* Personalized "For You" Section */}
            <div className="bg-[#2A1A5E]/30 border-2 border-[#4A3F7A]/50 rounded-xl p-6 space-y-8">
                <h2 className="text-2xl font-bold text-white text-center"><i className="fa-regular fa-user text-[#DAFF00] mr-2"></i> For You</h2>
                
                {/* Personalized Trend Radar */}
                <section>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-white">Personalized Trend Radar</h3>
                        <button onClick={() => loadTrends(true)} disabled={isLoadingTrends} className="text-purple-300 hover:text-white disabled:text-purple-300/50 disabled:cursor-wait transition-colors" title="Refresh Trends">
                            <i className={`fa-solid fa-rotate-right ${isLoadingTrends ? 'animate-spin' : ''}`}></i>
                        </button>
                    </div>
                     <div className="space-y-6">
                        {isLoadingTrends ? (
                            <>
                                <SkeletonTrendCard />
                                <SkeletonTrendCard />
                            </>
                        ) : trendError ? (
                             <div className="bg-red-900/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg text-center" role="alert">
                                <p className="text-sm font-semibold">{trendError}</p>
                            </div>
                        ) : (
                            trendingTopics.map((trend) => (
                                <TrendCard 
                                    key={trend.topic}
                                    trend={trend}
                                    onGenerateForTrend={onGenerateForTrend}
                                    onWatchTrend={onWatchTrend}
                                    onUnwatchTrend={onUnwatchTrend}
                                    isWatched={isTrendWatched(trend.topic)}
                                />
                            ))
                        )}
                     </div>
                </section>
                
                {/* Script of the Day */}
                {scriptOfTheDay && (
                    <section>
                         <h3 className="text-xl font-bold text-white mb-4">DFY Script of the Day</h3>
                         <ScriptCard
                            script={scriptOfTheDay}
                            onOpenSaveModal={onOpenSaveModal}
                            onUnsave={onUnsaveScript}
                            isSaved={isScriptSaved(scriptOfTheDay)}
                            isScoring={scoringScriptId === scriptOfTheDay.id}
                            onVisualize={onVisualize}
                            isVisualizing={visualizingScriptId === scriptOfTheDay.id}
                            onToggleSpeech={onToggleSpeech}
                            isSpeaking={speakingScriptId === scriptOfTheDay.id}
                        />
                    </section>
                )}
            </div>


            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Scripts Section */}
                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">Resume Your Work</h2>
                    <div className="space-y-6">
                        {recentScripts.length > 0 ? (
                            recentScripts.map(script => (
                                <ScriptCard
                                    key={script.id}
                                    script={script}
                                    onOpenSaveModal={onOpenSaveModal}
                                    onUnsave={onUnsaveScript}
                                    isSaved={isScriptSaved(script)}
                                    isScoring={scoringScriptId === script.id}
                                    isSavedView={true}
                                    onVisualize={onVisualize}
                                    isVisualizing={visualizingScriptId === script.id}
                                    onToggleSpeech={onToggleSpeech}
                                    isSpeaking={speakingScriptId === script.id}
                                />
                            ))
                        ) : (
                            <div className="text-center py-10 px-6 bg-[#2A1A5E]/50 rounded-lg border-2 border-dashed border-[#4A3F7A]">
                                <i className="fa-solid fa-bookmark text-3xl text-purple-300 mb-4"></i>
                                <h3 className="font-medium text-[#F0F0F0]">No Saved Scripts Yet</h3>
                                <p className="text-sm text-purple-200/80">Generate scripts and save your favorites to see them here.</p>
                            </div>
                        )}
                    </div>
                </section>
                
                {/* Watchlist & Agency Snapshot Column */}
                 <div className="space-y-8">
                    {watchedTrends.length > 0 && (
                        <section>
                             <h2 className="text-2xl font-bold text-white mb-4">Your Trend Watchlist</h2>
                             <div className="space-y-4">
                                {watchedTrends.slice(0, 2).map((trend) => (
                                    <TrendCard 
                                        key={trend.topic}
                                        trend={trend} 
                                        onGenerateForTrend={onGenerateForTrend}
                                        onWatchTrend={onWatchTrend}
                                        onUnwatchTrend={onUnwatchTrend}
                                        isWatched={isTrendWatched(trend.topic)}
                                    />
                                ))}
                             </div>
                        </section>
                    )}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">Agency Snapshot</h2>
                        <div className="bg-[#2A1A5E]/50 rounded-xl p-6 space-y-4 border border-[#4A3F7A]/30">
                             <div className="flex justify-between items-center">
                                <span className="font-semibold text-purple-200">Active Clients</span>
                                <span className="font-bold text-white text-2xl">{agencyClientCount}</span>
                            </div>
                            <button onClick={() => onNavigate('Manage Clients')} className="w-full text-center bg-transparent border-2 border-[#4A3F7A] text-purple-200 font-bold py-2 px-3 rounded-md hover:bg-[#2A1A5E] hover:text-white transition-all duration-200 text-sm mt-2">
                                Go to Agency Dashboard
                            </button>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};
