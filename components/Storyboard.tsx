
import React, { useState, useEffect } from 'react';
import { Project, SoundDesign } from '../types';
import { generateSoundDesign } from '../services/geminiService';
import { SparklesIcon, CtaIcon, MusicNoteIcon, PlayIcon, PauseIcon } from './Icons';
import { useAppContext } from '../contexts/AppContext';

interface StoryboardProps {
    project: Project;
    onProceed: () => void;
}

const parseTimecode = (timecode: string): { start: number, end: number, duration: number } => {
    const parts = timecode.replace('s', '').split('-');
    const start = parseInt(parts[0], 10) || 0;
    const end = parseInt(parts[1], 10) || start + 1;
    return { start, end, duration: end - start };
};

const Storyboard: React.FC<StoryboardProps> = ({ project, onProceed }) => {
    const { apiKeyError, consumeCredits, handleUpdateProject, t } = useAppContext();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedVibe, setSelectedVibe] = useState('Uplifting');

    // Animatic Player State
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
    const [currentVisual, setCurrentVisual] = useState<string | null>(null);
    
    useEffect(() => {
        // Cleanup on component unmount
        return () => {
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    useEffect(() => {
        let sceneTimeout: ReturnType<typeof setTimeout>;
        if (isPlaying && project.script && project.assets) {
            const scene = project.script.scenes[currentSceneIndex];
            if (!scene) {
                setIsPlaying(false); // End of script
                return;
            }

            // Display visual
            const visualToShow = project.assets[currentSceneIndex]?.images[0] || project.moodboard?.[0] || null;
            setCurrentVisual(visualToShow);

            // Play voiceover
            if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(scene.voiceover);
            window.speechSynthesis.speak(utterance);

            // Set timeout for next scene
            const { duration } = parseTimecode(scene.timecode);
            sceneTimeout = setTimeout(() => {
                setCurrentSceneIndex(prev => prev + 1);
            }, duration * 1000);
        }
        return () => clearTimeout(sceneTimeout);
    }, [isPlaying, currentSceneIndex, project.script, project.assets]);

    const handleGenerateSoundDesign = async () => {
        if (!project.script) {
            setError(t('storyboard.error_script_missing'));
            return;
        }
        if (apiKeyError) {
            setError(t('storyboard.error_api_key'));
            return;
        }
        if (!await consumeCredits(1)) return;

        setIsLoading(true);
        setError(null);
        try {
            const result = await generateSoundDesign(project.script, selectedVibe, project.topic);
            handleUpdateProject({ id: project.id, soundDesign: result });
        } catch (e) {
            setError(e instanceof Error ? e.message : t('storyboard.error_generation_failed'));
        } finally {
            setIsLoading(false);
        }
    };

    const togglePlayAnimatic = () => {
        if (isPlaying) {
            setIsPlaying(false);
            if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
            setCurrentSceneIndex(0);
            setCurrentVisual(null);
        } else {
            setCurrentSceneIndex(0);
            setIsPlaying(true);
        }
    };

    if (!project.script || !project.assets || Object.keys(project.assets).length < project.script.scenes.length) {
         return (
            <div className="text-center py-16 px-6 bg-gray-800/50 rounded-2xl">
                <h2 className="text-2xl font-bold text-white mb-3">{t('storyboard.assets_required_title')}</h2>
                <p className="text-gray-400 mb-6 max-w-md mx-auto">{t('storyboard.assets_required_subtitle')}</p>
            </div>
        );
    }
    
    const vibeOptions = [
        { value: 'Uplifting', label: t('storyboard.vibe_uplifting') },
        { value: 'Dramatic', label: t('storyboard.vibe_dramatic') },
        { value: 'Corporate', label: t('storyboard.vibe_corporate') },
        { value: 'Funny', label: t('storyboard.vibe_funny') },
        { value: 'Mysterious', label: t('storyboard.vibe_mysterious') },
    ];

    return (
        <div className="space-y-8 animate-fade-in-up">
            <header className="text-center">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-500">{t('storyboard.title')}</h1>
                <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">{t('storyboard.subtitle')}</p>
            </header>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Sound Designer */}
                <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700">
                    <h3 className="text-2xl font-bold text-white mb-4">{t('storyboard.sound_designer_title')}</h3>
                    {!project.soundDesign ? (
                        <div className="space-y-4">
                            <p className="text-gray-300">{t('storyboard.sound_designer_subtitle')}</p>
                            <div>
                                <label htmlFor="vibe-select" className="block text-sm font-bold text-gray-300 mb-2">{t('storyboard.vibe_label')}</label>
                                <select id="vibe-select" value={selectedVibe} onChange={e => setSelectedVibe(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                    {vibeOptions.map(option => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </div>
                            <button onClick={handleGenerateSoundDesign} disabled={isLoading} className="w-full inline-flex items-center justify-center px-6 py-3 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold rounded-full transition-colors disabled:bg-gray-600">
                                <SparklesIcon className="w-5 h-5 mr-2" />
                                {isLoading ? t('storyboard.generating') : t('storyboard.generate_button')}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-fade-in-up">
                             <div>
                                <h4 className="font-semibold text-gray-300 mb-2">{t('storyboard.music_title')}</h4>
                                <p className="bg-gray-900/50 p-3 rounded-lg text-sm text-gray-400">{project.soundDesign.music}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-300 mb-2">{t('storyboard.sfx_title')}</h4>
                                <ul className="list-disc list-inside text-gray-300 text-sm space-y-1 bg-gray-900/50 p-3 rounded-lg">
                                    {project.soundDesign.sfx.map((s, i) => <li key={i}><strong className="text-indigo-400">{s.timecode}:</strong> {s.description}</li>)}
                                </ul>
                            </div>
                        </div>
                    )}
                     {error && <p className="text-red-400 text-center mt-4">{error}</p>}
                </div>

                {/* Animatic Player */}
                <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 flex flex-col">
                    <h3 className="text-2xl font-bold text-white mb-4">{t('storyboard.animatic_title')}</h3>
                     <div className="aspect-video w-full bg-black rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
                        {currentVisual ? (
                            <img key={currentVisual} src={currentVisual} className="w-full h-full object-contain animate-fade-in-up" style={{animationDuration: '0.3s'}} alt="Animatic scene"/>
                        ) : (
                            <div className="text-center text-gray-500">
                                <MusicNoteIcon className="w-16 h-16 mx-auto" />
                                <p>{t('storyboard.animatic_placeholder')}</p>
                            </div>
                        )}
                        {isPlaying && (
                            <div className="absolute bottom-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center animate-pulse">
                                <div className="w-2 h-2 bg-white rounded-full mr-2"></div> {t('storyboard.animatic_live')}
                            </div>
                        )}
                    </div>
                    <button onClick={togglePlayAnimatic} className="w-full inline-flex items-center justify-center gap-3 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-colors">
                        {isPlaying ? <PauseIcon className="w-6 h-6"/> : <PlayIcon className="w-6 h-6"/>}
                        {isPlaying ? t('storyboard.stop_button') : t('storyboard.play_button')}
                    </button>
                </div>
            </div>

            <div className="mt-12 text-center">
                <button 
                    onClick={onProceed} 
                    className="inline-flex items-center justify-center px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg"
                >
                    {t('storyboard.proceed_button')}
                    <CtaIcon className="w-5 h-5 ml-3" />
                </button>
            </div>
        </div>
    );
};

export default Storyboard;
