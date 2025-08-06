import React, { useState, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { SparklesIcon, UploadIcon, UserCircleIcon, TrashIcon, RefreshIcon } from './Icons';
import { invokeEdgeFunction } from '../services/supabaseService';
import { ClonedVoice } from '../types';
import BrandIdentityHub from './BrandIdentityHub';

const Settings: React.FC = () => {
    const { user, t, requirePermission, addToast, setUser, consumeCredits } = useAppContext();
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [voiceName, setVoiceName] = useState('');
    const [isCloning, setIsCloning] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            const files = Array.from(event.target.files);
            // Limit to 5 files for sanity
            if (files.length > 5) {
                addToast("You can upload a maximum of 5 files.", "error");
                setSelectedFiles(files.slice(0, 5));
            } else {
                setSelectedFiles(files);
            }
        }
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
    
    const handleSyncVoices = async () => {
        if (!user) return;
        setIsSyncing(true);
        try {
            const syncedVoices = await invokeEdgeFunction('elevenlabs-sync-voices', {});
            setUser(prevUser => prevUser ? { ...prevUser, cloned_voices: syncedVoices } : null);
            addToast("Voice statuses have been updated!", "success");
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to sync voices.';
            addToast(errorMessage, 'error');
        } finally {
            setIsSyncing(false);
        }
    };


    return (
        <div className="animate-fade-in-up space-y-12">
            <header className="text-center">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white">{t('settings.title')}</h1>
                <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">{t('settings.subtitle')}</p>
            </header>
            
            <BrandIdentityHub />

            <div className="max-w-4xl mx-auto bg-gray-800/50 p-8 rounded-2xl border border-gray-700">
                <h2 className="text-2xl font-bold text-white mb-2 flex items-center">
                    <SparklesIcon className="w-6 h-6 mr-3 text-purple-400" />
                    {t('settings.voice_cloning_title')}
                </h2>
                <p className="text-gray-400 mb-6">{t('settings.voice_cloning_desc')}</p>

                <div className="space-y-6">
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-lg font-semibold text-white">{t('settings.your_voices')}</h3>
                             <button onClick={handleSyncVoices} disabled={isSyncing} className="flex items-center text-xs font-semibold text-indigo-400 hover:text-indigo-300 disabled:opacity-50">
                                <RefreshIcon className={`w-4 h-4 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
                                {isSyncing ? 'Syncing...' : 'Refresh Status'}
                            </button>
                        </div>
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
                         <h3 className="text-lg font-semibold text-white">Add a New Voice</h3>
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
                                <input type="file" multiple accept="audio/mpeg, audio/wav" onChange={handleFileChange} className="hidden" />
                            </label>
                             {selectedFiles.length > 0 && (
                                <ul className="mt-3 text-xs text-gray-400 list-disc list-inside">
                                    {selectedFiles.map(f => <li key={f.name}>{f.name}</li>)}
                                </ul>
                            )}
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
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;