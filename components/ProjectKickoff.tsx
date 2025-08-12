import React, { useState } from 'react';
import { VideoStyle, Platform, BrandIdentity, ClonedVoice } from '../types.ts';
import { useAppContext } from '../contexts/AppContext.tsx';
import { generateVideoBlueprint } from '../services/geminiService.ts';
import { SparklesIcon, FilmIcon, TypeIcon, PaintBrushIcon } from './Icons.tsx';
import { getErrorMessage } from '../utils.ts';
import { ELEVENLABS_VOICES } from '../services/generativeMediaService.ts';

interface ProjectKickoffProps {
    onProjectCreated: (projectId: string) => void;
    onExit: () => void;
}

const ProjectKickoff: React.FC<ProjectKickoffProps> = ({ onProjectCreated, onExit }) => {
    const { user, t, consumeCredits, addToast, lockAndExecute, brandIdentities, handleCreateProjectForBlueprint } = useAppContext();
    const [topic, setTopic] = useState('');
    const [videoStyle, setVideoStyle] = useState<VideoStyle>('High-Energy Viral');
    const [videoSize, setVideoSize] = useState<'16:9' | '9:16' | '1:1'>('16:9');
    const [videoLength, setVideoLength] = useState(60);
    const [narrator, setNarrator] = useState('pNInz6obpgDQGcFmaJgB');
    const [selectedBrandId, setSelectedBrandId] = useState<string | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState<string[]>([]);
    const [error, setError] = useState('');
    
    const selectedBrand = brandIdentities.find((b: BrandIdentity) => b.id === selectedBrandId);

    const handleGenerate = () => lockAndExecute(async () => {
        if (!topic.trim()) { setError("Please provide a topic for your video."); return; }
        if (!await consumeCredits(5)) return;
        setIsLoading(true); setError(''); setProgress([]);
        try {
            const derivedPlatform: Platform = videoSize === '16:9' ? 'youtube_long' : 'youtube_short';
            const blueprint = await generateVideoBlueprint(topic, derivedPlatform, videoStyle, (msg: string) => setProgress(prev => [...prev, msg]), videoLength, selectedBrand);
            const newProjectId = await handleCreateProjectForBlueprint(topic, derivedPlatform, blueprint.suggestedTitles[0], narrator, videoSize, blueprint);
            if (newProjectId) onProjectCreated(newProjectId);
            else throw new Error("Project creation failed after blueprint generation.");
        } catch (e) {
            const errorMessage = getErrorMessage(e);
            setError(errorMessage); addToast(errorMessage, 'error'); setIsLoading(false);
        }
    });
    
    const styleOptions: { id: VideoStyle, name: string, icon: React.FC<{className?:string}> }[] = [
        { id: 'High-Energy Viral', name: t('style.viral_name'), icon: SparklesIcon },
        { id: 'Cinematic Documentary', name: t('style.cinematic_name'), icon: FilmIcon },
        { id: 'Clean & Corporate', name: t('style.corporate_name'), icon: TypeIcon },
        { id: 'Animation', name: 'Animation', icon: PaintBrushIcon },
        { id: 'Vlog', name: 'Vlog Style', icon: FilmIcon },
    ];
    
    if (isLoading) return <div className="flex flex-col items-center justify-center space-y-6 text-center w-full max-w-2xl mx-auto py-12"><SparklesIcon className="w-16 h-16 text-indigo-400 animate-pulse" /><h2 className="text-2xl font-bold text-white">{t('blueprint_modal.loading')}</h2><div className="bg-gray-900/50 p-4 rounded-lg w-full min-h-[100px]"><ul className="space-y-2">{progress.map((msg: string, i: number) => (<li key={i} className="flex items-center text-sm text-gray-300 animate-fade-in-up"><SparklesIcon className="w-4 h-4 mr-3 text-indigo-400 flex-shrink-0" />{msg}</li>))}</ul></div></div>;

    return (
        <div className="animate-fade-in-up space-y-8 max-w-4xl mx-auto">
            <header className="text-center"><h1 className="text-4xl font-bold text-white">Create New Project Blueprint</h1><p className="mt-2 text-lg text-gray-400">Follow these steps to generate a complete strategic plan for your next video.</p></header>
            <div className="space-y-6 bg-gray-800/50 p-8 rounded-2xl border border-gray-700">
                <div><h3 className="text-xl font-bold text-white mb-3">1. The Core Idea</h3><textarea value={topic} onChange={e => setTopic(e.target.value)} placeholder={t('blueprint_modal.topic_placeholder')} rows={3} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><h3 className="text-xl font-bold text-white mb-3">2. Define Your Video</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label className="font-semibold text-white">Video Style</label><div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">{styleOptions.map(opt => (<button key={opt.id} onClick={() => setVideoStyle(opt.id)} className={`p-3 text-center rounded-lg border-2 transition-all ${videoStyle === opt.id ? 'bg-indigo-600 border-indigo-500' : 'bg-gray-700/50 border-gray-700 hover:border-gray-600'}`}><opt.icon className={`w-6 h-6 mx-auto mb-1 ${videoStyle === opt.id ? 'text-white' : 'text-gray-400'}`} /><p className={`text-xs font-semibold ${videoStyle === opt.id ? 'text-white' : 'text-gray-300'}`}>{opt.name}</p></button>))}</div></div><div className="space-y-6"><div><label className="font-semibold text-white">Brand Identity (Optional)</label><select value={selectedBrandId || ''} onChange={e => setSelectedBrandId(e.target.value || undefined)} className="w-full mt-2 bg-gray-900 border border-gray-600 rounded-lg p-3 text-white"><option value="">No Brand Identity</option>{brandIdentities.map((brand: BrandIdentity) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></div><div><label className="font-semibold text-white">Video Length: {videoLength}s</label><input type="range" min="30" max="300" step="30" value={videoLength} onChange={e => setVideoLength(parseInt(e.target.value))} className="w-full mt-2" /></div><div><label className="font-semibold text-white">Video Size</label><div className="flex gap-2 mt-2"><button onClick={() => setVideoSize('16:9')} className={`flex-1 text-xs py-2 rounded ${videoSize === '16:9' ? 'bg-indigo-600' : 'bg-gray-700'}`}>16:9 (Horizontal)</button><button onClick={() => setVideoSize('9:16')} className={`flex-1 text-xs py-2 rounded ${videoSize === '9:16' ? 'bg-indigo-600' : 'bg-gray-700'}`}>9:16 (Vertical)</button><button onClick={() => setVideoSize('1:1')} className={`flex-1 text-xs py-2 rounded ${videoSize === '1:1' ? 'bg-indigo-600' : 'bg-gray-700'}`}>1:1 (Square)</button></div></div></div><div className="md:col-span-2"><label className="font-semibold text-white">Narrator</label><select value={narrator} onChange={e => setNarrator(e.target.value)} className="w-full mt-2 bg-gray-900 border border-gray-600 rounded-lg p-3 text-white"><optgroup label="Your Voices">{user?.cloned_voices.map((v: ClonedVoice) => <option key={v.id} value={v.id} disabled={v.status !== 'ready'}>{v.name} ({v.status})</option>)}</optgroup><optgroup label="Standard Voices">{ELEVENLABS_VOICES.map((v: { id: string; name: string; }) => <option key={v.id} value={v.id}>{v.name}</option>)}</optgroup></select></div></div></div>
                <div className="text-center pt-6 border-t border-gray-700"><button onClick={handleGenerate} className="inline-flex items-center justify-center px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg"><SparklesIcon className="w-6 h-6 mr-3" />{t('blueprint_modal.generate_button')}</button>{error && <p className="text-red-400 mt-4">{error}</p>}</div>
            </div>
             <div className="text-center"><button onClick={onExit} className="text-gray-400 hover:text-white text-sm font-semibold">&larr; Back to Dashboard</button></div>
        </div>
    );
};

export default ProjectKickoff;