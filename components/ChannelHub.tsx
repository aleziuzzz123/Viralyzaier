import React, { useState } from 'react';
import { Opportunity, Platform } from '../types';
import { fetchChannelVideos } from '../services/youtubeService';
import { performChannelAudit } from '../services/geminiService';
import * as supabase from '../services/supabaseService';
import { SparklesIcon, ChartPieIcon, YouTubeIcon } from './Icons';
import { useAppContext } from '../contexts/AppContext';

interface ChannelHubProps {}

const ChannelHub: React.FC<ChannelHubProps> = () => {
    const { user, setUser, handleCreateProjectFromIdea, consumeCredits, requirePermission, addToast, t } = useAppContext();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleConnectChannel = () => {
        if (!user) return;
        const env = (window as any).__env || {};
        const googleClientId = env.VITE_GOOGLE_CLIENT_ID;
        const supabaseUrl = env.VITE_SUPABASE_URL;

        if (!googleClientId || googleClientId.includes('YOUR_')) {
            setError("VITE_GOOGLE_CLIENT_ID is not configured. Please check your index.html file.");
            return;
        }
        if (!supabaseUrl) {
            setError("VITE_SUPABASE_URL is not configured. Please check your index.html file.");
            return;
        }
        
        const redirectUri = `${supabaseUrl}/functions/v1/youtube-oauth-callback`;
        const scope = "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly";

        // Pass the user's Supabase ID in the state parameter for secure and reliable callback handling.
        const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${user.id}`;
        
        window.location.href = oauthUrl;
    };

    const handleAnalyzeChannel = async () => {
        if (!user || !requirePermission('viralyzaier') || !user.youtubeConnected) return;
        if (!await consumeCredits(10)) return; 

        setIsLoading(true);
        setError(null);
        try {
            // Now fetches REAL videos from the user's connected channel
            const videos = await fetchChannelVideos();
            const auditResult = await performChannelAudit(videos);
            const updatedUser = await supabase.updateUserProfile(user.id, { channelAudit: auditResult });
            setUser(updatedUser);
            addToast("Channel audit complete! Your growth plan is ready.", 'success');
        } catch (e) {
            setError(e instanceof Error ? e.message : "An unknown error occurred during channel audit.");
            addToast(e instanceof Error ? e.message : "Failed to audit channel.", "error");
        } finally {
            setIsLoading(false);
        }
    };
    
    if (!user) return null;
    const { channelAudit, youtubeConnected } = user;
    
    const getOpportunityType = (type: 'Quick Win' | 'Growth Bet' | 'Experimental') => {
        switch(type) {
            case 'Quick Win': return t('channel_hub.opportunity_type_win');
            case 'Growth Bet': return t('channel_hub.opportunity_type_bet');
            case 'Experimental': return t('channel_hub.opportunity_type_exp');
            default: return type;
        }
    };

    return (
        <div className="space-y-8 animate-fade-in-up">
            <header className="text-center">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-600">
                    {t('channel_hub.title')}
                </h1>
                <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
                    {t('channel_hub.subtitle')}
                </p>
            </header>

            {error && <p className="text-red-400 text-center bg-red-500/10 p-3 rounded-lg">{error}</p>}

            {!youtubeConnected ? (
                 <div className="text-center py-16 px-6 bg-gray-800/50 rounded-2xl border border-gray-700">
                    <YouTubeIcon className="w-20 h-20 mx-auto text-red-500 mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-3">{t('channel_hub.connect_title')}</h2>
                    <p className="text-gray-400 mb-6 max-w-md mx-auto">{t('channel_hub.connect_subtitle')}</p>
                    <button
                        onClick={handleConnectChannel}
                        className="inline-flex items-center px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg"
                    >
                        <YouTubeIcon className="w-6 h-6 mr-3" />
                        {t('channel_hub.connect_button')}
                    </button>
                </div>
            ) : !channelAudit ? (
                <div className="text-center py-16 px-6 bg-gray-800/50 rounded-2xl border border-gray-700">
                    <ChartPieIcon className="w-16 h-16 mx-auto text-sky-500 mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-3">{t('channel_hub.get_plan_title')}</h2>
                    <p className="text-gray-400 mb-6 max-w-md mx-auto">{t('channel_hub.get_plan_subtitle_connected')}</p>
                    <button
                        onClick={handleAnalyzeChannel}
                        disabled={isLoading}
                        className="inline-flex items-center px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg disabled:bg-gray-600 disabled:cursor-wait"
                    >
                        <SparklesIcon className="w-6 h-6 mr-3" />
                        {isLoading ? t('channel_hub.loading') : t('channel_hub.get_plan_button')}
                    </button>
                </div>
            ) : (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="bg-gray-800/50 p-6 rounded-lg">
                            <h3 className="text-lg font-bold text-white mb-2">{t('channel_hub.pillars_title')}</h3>
                            <ul className="list-disc list-inside text-gray-300 space-y-1">
                                {channelAudit.contentPillars.map((p, i) => <li key={i}>{p}</li>)}
                            </ul>
                        </div>
                         <div className="bg-gray-800/50 p-6 rounded-lg">
                            <h3 className="text-lg font-bold text-white mb-2">{t('channel_hub.persona_title')}</h3>
                            <p className="text-gray-300">{channelAudit.audiencePersona}</p>
                        </div>
                         <div className="bg-gray-800/50 p-6 rounded-lg">
                            <h3 className="text-lg font-bold text-white mb-2">{t('channel_hub.formula_title')}</h3>
                            <p className="text-gray-300">{channelAudit.viralFormula}</p>
                        </div>
                    </div>
                    
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-4 text-center">{t('channel_hub.matrix_title')}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                           {channelAudit.opportunities.map((opp, i) => (
                               <div key={i} className={`p-6 rounded-2xl border-2 ${
                                   opp.type === 'Quick Win' ? 'border-green-500/50 bg-green-900/10' :
                                   opp.type === 'Growth Bet' ? 'border-yellow-500/50 bg-yellow-900/10' :
                                   'border-purple-500/50 bg-purple-900/10'
                               }`}>
                                   <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                                       opp.type === 'Quick Win' ? 'bg-green-500 text-white' :
                                       opp.type === 'Growth Bet' ? 'bg-yellow-500 text-black' :
                                       'bg-purple-500 text-white'
                                   }`}>{getOpportunityType(opp.type)}</span>
                                   <h3 className="text-xl font-bold text-white mt-3">{opp.idea}</h3>
                                   <p className="text-sm text-gray-400 mt-2 mb-4">{opp.reason}</p>
                                   <p className="text-xs text-gray-500 font-medium">{t('channel_hub.opportunity_title_label')}</p>
                                   <p className="text-sm text-gray-300 italic">"{opp.suggestedTitle}"</p>
                                   <button 
                                      onClick={() => handleCreateProjectFromIdea(opp, 'youtube_long')}
                                      className="w-full mt-4 text-center py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
                                    >
                                       {t('channel_hub.opportunity_button')}
                                   </button>
                               </div>
                           ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChannelHub;