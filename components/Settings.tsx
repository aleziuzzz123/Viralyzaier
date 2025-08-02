import React, { useState, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { SparklesIcon, UploadIcon, UserCircleIcon, TrashIcon } from './Icons'; // Assuming you have a YouTube icon or we can add one
import { invokeEdgeFunction } from '../services/supabaseService';
import { ClonedVoice } from '../types';

// A simple YouTube icon component to add to your Icons file or use directly
const YouTubeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
        <path d="m10 15 5-3-5-3z" />
    </svg>
);


const Settings: React.FC = () => {
    const { user, t, requirePermission, addToast, setUser, consumeCredits } = useAppContext();
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [voiceName, setVoiceName] = useState('');
    const [isCloning, setIsCloning] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setSelectedFiles(Array.from(event.target.files));
        }
    };

    // --- THIS IS THE NEW, CORRECT FUNCTION FOR THE YOUTUBE BUTTON ---
    const handleYoutubeConnect = async () => {
        // 1. Reads the Google Client ID from your Vercel variables.
        const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

        // Shows a message if the variable is somehow missing.
        if (!googleClientId) {
            alert("Configuration Error: Google Client ID is missing.");
            console.error("VITE_GOOGLE_CLIENT_ID is not set in Vercel environment variables.");
            return;
        }

        // 2. The address of your Supabase Edge Function.
        const redirectUri = 'https://wpgrfukcnpcoyruymxdd.supabase.co/functions/v1/youtube-oauth-callback';

        // 3. The permissions you are asking for.
        const scope = [
            'https://www.googleapis.com/auth/youtube.readonly',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile'
        ].join(' ');

        // 4. Builds the correct URL to send the user to Google.
        const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        googleAuthUrl.searchParams.set('client_id', googleClientId);
        googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
        googleAuthUrl.searchParams.set('response_type', 'code');
        googleAuthUrl.searchParams.set('scope', scope);
        googleAuthUrl.searchParams.set('access_type', 'offline');
        googleAuthUrl.searchParams.set('prompt', 'consent');

        // 5. Sends the user to Google to get their permission.
        window.location.href = googleAuthUrl.toString();
    };


    const handleCloneVoice = useCallback(async () => {
        if (!requirePermission('viralyzaier')) return;
        if (!voiceName.trim()) {
            setError('Please provide a name for your voice.');
            return;
        }
        if (selectedFiles.length === 0) {
            setError('Please upload at least one audio sample.');
            return;
        }
        if (!await consumeCredits(50)) return;

        setIsCloning(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('name', voiceName);
            selectedFiles.forEach(file => {
                formData.append('files', file);
            });
            
            const newVoice: ClonedVoice = await invokeEdgeFunction('elevenlabs-voice-cloning', formData);
            
            setUser(prevUser => {
                if (!prevUser) return null;
                const updatedVoices = [...(prevUser.cloned_voices || []), newVoice];
                return { ...prevUser, cloned_voices: updatedVoices };
            });

            addToast(t('toast.voice_cloned'), 'success');
            setVoiceName('');
            setSelectedFiles([]);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(errorMessage);
            addToast(errorMessage, 'error');
        } finally {
            setIsCloning(false);
        }

    }, [requirePermission, voiceName, selectedFiles, consumeCredits, setUser, addToast, t]);

    const handleDevClone = async () => {
        if (!requirePermission('viralyzaier')) return;
         if (!await consumeCredits(50)) return;
        setUser(prevUser => {
            if (!prevUser) return null;
            const newVoice = { id: `dev_${Date.now()}`, name: voiceName || 'Dev Voice', status: 'ready' } as ClonedVoice;
            const updatedVoices = [...(prevUser.cloned_voices || []), newVoice];
            return { ...prevUser, cloned_voices: updatedVoices };
        });
        addToast("Dev voice added successfully!", 'success');
    }

    return (
        <div className="animate-fade-in-up space-y-12">
            <header className="text-center">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white">{t('settings.title')}</h1>
                <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">{t('settings.subtitle')}</p>
            </header>

            {/* --- NEW YOUTUBE CONNECTION SECTION --- */}
            <div className="max-w-4xl mx-auto bg-gray-800/50 p-8 rounded-2xl border border-gray-700">
                <h2 className="text-2xl font-bold text-white mb-2 flex items-center">
                    <YouTubeIcon className="w-6 h-6 mr-3 text-red-500" />
                    YouTube Integration
                </h2>
                <p className="text-gray-400 mb-6">Connect your YouTube channel to allow Viralyzaier to access your channel statistics and help you grow.</p>
                <button
                    onClick={handleYoutubeConnect}
                    className="w-full inline-flex items-center justify-center px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full transition-colors"
                >
                    <YouTubeIcon className="w-5 h-5 mr-2" />
                    Connect YouTube Channel
                </button>
            </div>


            {/* --- EXISTING VOICE CLONING SECTION --- */}
            <div className="max-w-4xl mx-auto bg-gray-800/50 p-8 rounded-2xl border border-gray-700">
                <h2 className="text-2xl font-bold text-white mb-2 flex items-center">
                    <SparklesIcon className="w-6 h-6 mr-3 text-purple-400" />
                    {t('settings.voice_cloning_title')}
                </h2>
                <p className="text-gray-400 mb-6">{t('settings.voice_cloning_desc')}</p>

                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-3">{t('settings.your_voices')}</h3>
                        {user?.cloned_voices && user.cloned_voices.length > 0 ? (
                            <ul className="space-y-3">
                                {user.cloned_voices.map(voice => (
                                    <li key={voice.id} className="bg-gray-900/50 p-3 rounded-lg flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <UserCircleIcon className="w-6 h-6 text-gray-400" />
                                            <span className="font-medium text-white">{voice.name}</span>
                                        </div>
                                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                                            voice.status === 'ready' ? 'bg-green-500 text-white' : 
                                            voice.status === 'pending' ? 'bg-yellow-500 text-black' : 'bg-red-500 text-white'
                                        }`}>
                                            {voice.status === 'ready' ? t('settings.status_ready') : voice.status === 'pending' ? t('settings.status_pending') : t('settings.status_failed')}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-500 italic">No voices cloned yet.</p>
                        )}
                    </div>
                    
                    <div className="border-t border-gray-700 pt-6 space-y-4">
                         <input
                            type="text"
                            value={voiceName}
                            onChange={(e) => setVoiceName(e.target.value)}
                            placeholder={t('settings.voice_name_placeholder')}
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                         <div>
                            <p className="text-sm text-gray-400 mb-2">{t('settings.upload_samples_desc')}</p>
                            <label className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gray-700 text-white rounded-lg cursor-pointer hover:bg-gray-600">
                                <UploadIcon className="w-6 h-6" />
                                <span>{selectedFiles.length > 0 ? `${selectedFiles.length} file(s) selected` : t('settings.upload_button')}</span>
                                <input type="file" multiple accept="audio/mpeg, audio/wav" onChange={handleFilechange} className="hidden" />
                            </label>
                        </div>
                        {error && <p className="text-red-400 text-sm">{error}</p>}
                        <button 
                            onClick={handleCloneVoice} 
                            disabled={isCloning || !voiceName || selectedFiles.length === 0}
                            className="w-full inline-flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-colors disabled:bg-gray-600 disabled:cursor-wait"
                        >
                             <SparklesIcon className="w-5 h-5 mr-2" />
                            {isCloning ? t('settings.cloning_in_progress') : t('settings.start_cloning_button')}
                        </button>
                        <button onClick={handleDevClone} className="w-full mt-2 text-sm text-purple-400 rounded-md hover:bg-gray-700 flex items-center justify-center font-bold p-2">
                           <SparklesIcon className="w-5 h-5 mr-2"/>
                            Dev Add Voice (No API)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;

