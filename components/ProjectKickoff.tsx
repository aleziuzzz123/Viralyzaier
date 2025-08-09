import React, { useState } from 'react';
import { Project, Blueprint, VideoStyle, Platform, BrandIdentity, ClonedVoice } from '../types.ts';
import { useAppContext } from '../contexts/AppContext.tsx';
import { generateVideoBlueprint } from '../services/geminiService.ts';
import { LightBulbIcon, CheckCircleIcon, SparklesIcon, FilmIcon, TypeIcon, RocketLaunchIcon, PlayIcon, StopCircleIcon } from './Icons.tsx';
import { getErrorMessage } from '../utils.ts';
import { ELEVENLABS_VOICES, generateVoiceover } from '../services/generativeMediaService.ts';

interface ProjectKickoffProps {
    onProjectCreated: (projectId: string) => void;
    onExit: () => void;
}

const ProjectKickoff: React.FC<ProjectKickoffProps> = ({ onProjectCreated, onExit }) => {
    const { user, t, consumeCredits, addToast, lockAndExecute, brandIdentities, handleCreateProjectForBlueprint } = useAppContext();
    const [step, setStep] = useState(1);
    const [topic, setTopic] = useState('');
    const [videoStyle, setVideoStyle] = useState<VideoStyle>('High-Energy Viral');
    const [videoSize, setVideoSize] = useState<'16:9' | '9:16' | '1:1'>('16:9');
    const [videoLength, setVideoLength] = useState(60);
    const [narrator, setNarrator] = useState('pNInz6obpgDQGcFmaJgB');
    const [selectedBrandId, setSelectedBrandId] = useState<string | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState<string[]>([]);
    const [error, setError] = useState('');
    
    const selectedBrand = brandIdentities.find(b => b.id === selectedBrandId);

    const handleGenerate = () => lockAndExecute(async () => {
        if (!topic.trim()) {
            setError("Please provide a topic for your video.");
            return;
        }
        if (!await consumeCredits(5)) return;

        setIsLoading(true);
        setError('');
        setProgress([]);
        
        try {
            const derivedPlatform: Platform = videoSize === '16:9' ? 'youtube_long' : videoSize === '9:16' ? 'youtube_short' : 'instagram';
            const blueprint = await generateVideoBlueprint(topic, derivedPlatform, videoStyle, (msg) => setProgress(prev => [...prev, msg]), videoLength, selectedBrand);
            const newProjectId = await handleCreateProjectForBlueprint(topic, derivedPlatform, blueprint.suggestedTitles[0], narrator, videoSize, blueprint);
            if (newProjectId) {
                onProjectCreated(newProjectId);
            } else {
                throw new Error("Project creation failed after blueprint generation.");
            }
        } catch (e) {
            const errorMessage = getErrorMessage(e);
            setError(errorMessage);
            addToast(errorMessage, 'error');
            setIsLoading(false);
        }
    });
    
    const styleOptions: { id: VideoStyle, name: string, description: string, icon: React.FC<{className?:string}> }[] = [
        { id: 'High-Energy Viral', name: t('style.viral_name'), description: t('style.viral_desc'), icon: SparklesIcon },
        { id: 'Cinematic Documentary', name: t('style.cinematic_name'), description: t('style.cinematic_desc'), icon: FilmIcon },
        { id: 'Clean & Corporate', name: t('style.corporate_name'), description: t('style.corporate_desc'), icon: TypeIcon },
        { id: 'Animation', name: 'Animation', description: 'Engaging animated video for complex topics.', icon: FilmIcon },
        { id: 'Historical Documentary', name: 'Historical Doc', description: 'Narrative-driven historical content with archival feel.', icon: FilmIcon },
        { id: 'Vlog', name: 'Vlog Style', description: 'Personal, conversational, and direct-to-camera.', icon: FilmIcon },
        { id: 'Whiteboard', name: 'Whiteboard', description: 'Animated whiteboard drawings for educational content.', icon: FilmIcon },
    ];
    
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center space-y-6 text-center w-full max-w-2xl mx-auto py-12">
                <div className="relative"><SparklesIcon className="w-16 h-16 text-indigo-400" /><SparklesIcon className="w-8 h-8 text-pink-400 absolute -top-2 -right-2 animate-pulse" /></div>
                <h2 className="text-2xl font-bold text-white">{t('blueprint_modal.loading')}</h2>
                <p className="text-gray-400">{t('blueprint_modal.loading_subtitle')}</p>
                <div className="bg-gray-900/50 p-4 rounded-lg w-full min-h-[100px]"><ul className="space-y-2">{progress.map((msg, i) => (<li key={i} className="flex items-center text-sm text-gray-300 animate-fade-in-up"><SparklesIcon className="w-4 h-4 mr-3 text-indigo-400 flex-shrink-0" />{msg}</li>))}</ul></div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in-up space-y-8 max-w-4xl mx-auto">
            <header className="text-center">
                <h1 className="text-4xl font-bold text-white">Create New Project Blueprint</h1>
                <p className="mt-2 text-lg text-gray-400">Follow these steps to generate a complete strategic plan for your next video.</p>
            </header>
            
            <div className="space-y-6 bg-gray-800/50 p-8 rounded-2xl border border-gray-700">
                {/* Step 1: Core Idea */}
                <div>
                    <h3 className="text-xl font-bold text-white mb-3">1. The Core Idea</h3>
                    <textarea value={topic} onChange={e => setTopic(e.target.value)} placeholder={t('blueprint_modal.topic_placeholder')} rows={3} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                {/* Step 2: Define Video */}
                <div>
                     <h3 className="text-xl font-bold text-white mb-3">2. Define Your Video</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Brand Identity */}
                        <div>
                            <label className="font-semibold text-white">Brand Identity (Optional)</label>
                            <select value={selectedBrandId || ''} onChange={e => setSelectedBrandId(e.target.value || undefined)} className="w-full mt-2 bg-gray-900 border border-gray-600 rounded-lg p-3 text-white">
                                <option value="">No Brand Identity</option>
                                {brandIdentities.map(brand => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
                            </select>
                        </div>
                        {/* Video Style */}
                         <div>
                            <label className="font-semibold text-white">Video Style</label>
                            <select value={videoStyle} onChange={e => setVideoStyle(e.target.value as VideoStyle)} className="w-full mt-2 bg-gray-900 border border-gray-600 rounded-lg p-3 text-white">{styleOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}</select>
                        </div>
                        {/* Video Length */}
                        <div>
                            <label className="font-semibold text-white">Video Length: {videoLength}s</label>
                            <input type="range" min="30" max="300" step="30" value={videoLength} onChange={e => setVideoLength(parseInt(e.target.value))} className="w-full mt-2" />
                        </div>
                        {/* Video Size */}
                        <div>
                            <label className="font-semibold text-white">Video Size</label>
                            <div className="flex gap-2 mt-2">
                                <button onClick={() => setVideoSize('16:9')} className={`flex-1 text-xs py-2 rounded ${videoSize === '16:9' ? 'bg-indigo-600' : 'bg-gray-700'}`}>16:9 (Horizontal)</button>
                                <button onClick={() => setVideoSize('9:16')} className={`flex-1 text-xs py-2 rounded ${videoSize === '9:16' ? 'bg-indigo-600' : 'bg-gray-700'}`}>9:16 (Vertical)</button>
                                <button onClick={() => setVideoSize('1:1')} className={`flex-1 text-xs py-2 rounded ${videoSize === '1:1' ? 'bg-indigo-600' : 'bg-gray-700'}`}>1:1 (Square)</button>
                            </div>
                        </div>
                        {/* Narrator */}
                        <div className="md:col-span-2">
                            <label className="font-semibold text-white">Narrator</label>
                            <select value={narrator} onChange={e => setNarrator(e.target.value)} className="w-full mt-2 bg-gray-900 border border-gray-600 rounded-lg p-3 text-white">
                                <optgroup label="Your Voices">{user?.cloned_voices.map(v => <option key={v.id} value={v.id} disabled={v.status !== 'ready'}>{v.name} ({v.status})</option>)}</optgroup>
                                <optgroup label="Standard Voices">{ELEVENLABS_VOICES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</optgroup>
                            </select>
                        </div>
                     </div>
                </div>

                <div className="text-center pt-6 border-t border-gray-700">
                    <button onClick={handleGenerate} className="inline-flex items-center justify-center px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg">
                        <SparklesIcon className="w-6 h-6 mr-3" />
                        {t('blueprint_modal.generate_button')}
                    </button>
                    {error && <p className="text-red-400 mt-4">{error}</p>}
                </div>
            </div>
        </div>
    );
};

export default ProjectKickoff;
