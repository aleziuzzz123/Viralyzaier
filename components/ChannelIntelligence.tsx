
import React, { useState, useEffect } from 'react';
import { Project, ChannelStats, VideoPerformance, PerformanceReview, ContentGapSuggestion } from '../types';
import { fetchChannelStats, fetchVideoPerformance } from '../services/youtubeService';
import { reviewVideoPerformance, suggestContentGaps } from '../services/geminiService';
import { ChartBarIcon, SparklesIcon, LightBulbIcon, ThumbsUpIcon } from './Icons';
import { useAppContext } from '../contexts/AppContext';

interface ChannelIntelligenceProps {
    project: Project;
}

const StatCard: React.FC<{ label: string; value: string | number; }> = ({ label, value }) => (
    <div className="bg-gray-800/70 p-4 rounded-lg">
        <p className="text-sm text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-white">{typeof value === 'number' ? value.toLocaleString() : value}</p>
    </div>
);

const ChannelIntelligence: React.FC<ChannelIntelligenceProps> = ({ project }) => {
    const { consumeCredits, handleCreateProjectFromIdea, t } = useAppContext();
    const [stats, setStats] = useState<ChannelStats | null>(null);
    const [performance, setPerformance] = useState<VideoPerformance | null>(null);
    const [review, setReview] = useState<PerformanceReview | null>(null);
    const [suggestions, setSuggestions] = useState<ContentGapSuggestion[] | null>(null);
    const [isLoading, setIsLoading] = useState({ stats: true, performance: true, review: false, gaps: false });
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(prev => ({ ...prev, stats: true, performance: true }));
            setError(null);
            try {
                const [channelStats, videoPerformance] = await Promise.all([
                    fetchChannelStats(),
                    fetchVideoPerformance(project.id)
                ]);
                setStats(channelStats);
                setPerformance(videoPerformance);
            } catch (e) {
                setError(t('channel_intelligence.error_load'));
            } finally {
                setIsLoading(prev => ({ ...prev, stats: false, performance: false }));
            }
        };
        loadInitialData();
    }, [project.id, t]);

    const handleGetReview = async () => {
        if (!performance) return;
        if (!await consumeCredits(2)) return;
        
        setIsLoading(prev => ({ ...prev, review: true }));
        setError(null);
        try {
            const result = await reviewVideoPerformance(performance);
            setReview(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : t('channel_intelligence.error_generate_review'));
        } finally {
            setIsLoading(prev => ({ ...prev, review: false }));
        }
    };
    
    const handleGetSuggestions = async () => {
        if (!stats) return;
        if (!await consumeCredits(3)) return;

        setIsLoading(prev => ({ ...prev, gaps: true }));
        setError(null);
        try {
            const successfulTopics = [stats.topPerformingVideo.title, project.title || 'Untitled'];
            const result = await suggestContentGaps(successfulTopics, 'DIY & Crafting'); // Niche could be dynamic
            setSuggestions(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : t('channel_intelligence.error_generate_suggestions'));
        } finally {
            setIsLoading(prev => ({ ...prev, gaps: false }));
        }
    };

    return (
        <div className="space-y-8 animate-fade-in-up">
            <header className="text-center">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-500">{t('channel_intelligence.title')}</h1>
                <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">{t('channel_intelligence.subtitle')}</p>
            </header>
            
            {error && <p className="text-red-400 text-center">{error}</p>}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 {isLoading.stats ? <p>{t('channel_intelligence.stats_loading')}</p> : stats && <>
                    <StatCard label={t('channel_intelligence.subscribers')} value={stats.subscriberCount} />
                    <StatCard label={t('channel_intelligence.total_views')} value={stats.totalViews} />
                    <StatCard label={t('channel_intelligence.total_videos')} value={stats.totalVideos} />
                    <StatCard label={t('channel_intelligence.top_video_views')} value={stats.topPerformingVideo.views} />
                </>}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Performance Review */}
                <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 space-y-4">
                    <h3 className="text-2xl font-bold text-white">{t('channel_intelligence.performance_review_title')}</h3>
                    {isLoading.performance ? <p>{t('channel_intelligence.performance_loading')}</p> : performance && (
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <StatCard label={t('channel_intelligence.views')} value={performance.views} />
                            <StatCard label={t('channel_intelligence.likes')} value={performance.likes} />
                            <StatCard label={t('channel_intelligence.comments')} value={performance.comments} />
                            <StatCard label={t('channel_intelligence.retention')} value={`${performance.retention}%`} />
                        </div>
                    )}
                    
                    {review ? (
                        <div className="space-y-4 pt-4 animate-fade-in-up">
                           <p className="italic text-gray-300 bg-gray-900/50 p-3 rounded-lg">"{review.summary}"</p>
                           <div className="bg-gray-900/50 p-4 rounded-lg">
                               <h4 className="font-semibold text-green-400 flex items-center mb-2"><ThumbsUpIcon className="w-5 h-5 mr-2"/> {t('channel_intelligence.what_worked')}</h4>
                               <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
                                   {review.whatWorked.map((item, i) => <li key={i}>{item}</li>)}
                               </ul>
                           </div>
                           <div className="bg-gray-900/50 p-4 rounded-lg">
                               <h4 className="font-semibold text-yellow-400 flex items-center mb-2"><LightBulbIcon className="w-5 h-5 mr-2"/> {t('channel_intelligence.what_to_improve')}</h4>
                               <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
                                   {review.whatToImprove.map((item, i) => <li key={i}>{item}</li>)}
                               </ul>
                           </div>
                        </div>
                    ) : (
                         <div className="text-center pt-4">
                            <button onClick={handleGetReview} disabled={isLoading.review || !performance} className="inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-colors disabled:bg-gray-600">
                                <SparklesIcon className="w-5 h-5 mr-2" />
                                {isLoading.review ? t('channel_intelligence.analyzing') : t('channel_intelligence.generate_review_button')}
                            </button>
                        </div>
                    )}
                </div>
                
                {/* Content Gap Analysis */}
                <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 space-y-4">
                    <h3 className="text-2xl font-bold text-white">{t('channel_intelligence.content_gap_title')}</h3>
                    <p className="text-gray-400">{t('channel_intelligence.content_gap_subtitle')}</p>
                     {suggestions ? (
                        <div className="space-y-4 pt-4 animate-fade-in-up">
                            {suggestions.map((s, i) => (
                                <div key={i} className="bg-gray-900/50 p-4 rounded-lg">
                                    <h4 className="font-bold text-lg text-cyan-300 flex items-center"><LightBulbIcon className="w-5 h-5 mr-2"/> {s.idea}</h4>
                                    <p className="text-sm text-gray-400 mt-1 mb-3 italic">{t('channel_intelligence.why_it_works')} {s.reason}</p>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {s.potentialTitles.map((title, ti) => (
                                           <span key={ti} className="text-xs px-2 py-1 bg-gray-700 rounded-full">{title}</span>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => handleCreateProjectFromIdea(s, project.platform)}
                                        className="w-full text-center py-2 text-sm font-semibold bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 transition-colors"
                                    >
                                        {t('channel_intelligence.create_project_button')}
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center pt-4">
                             <button onClick={handleGetSuggestions} disabled={isLoading.gaps || !stats} className="inline-flex items-center px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-full transition-colors disabled:bg-gray-600">
                                <SparklesIcon className="w-5 h-5 mr-2" />
                                {isLoading.gaps ? t('channel_intelligence.discovering') : t('channel_intelligence.suggest_ideas_button')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChannelIntelligence;
