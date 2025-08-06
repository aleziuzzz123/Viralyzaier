import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Project, Scene, Script, Analysis, VisualType, StockAsset, AIMusic, Subtitle, TimelineState, BrandIdentity, SceneAssets, ClonedVoice, TimelineTrack, TimelineClip } from '../types';
import * as geminiService from '../services/geminiService';
import * as generativeMediaService from '../services/generativeMediaService';
import { SparklesIcon, PhotoIcon, PlayIcon, RocketLaunchIcon, MusicNoteIcon, SubtitlesIcon, XCircleIcon, VolumeUpIcon, VolumeOffIcon, PaintBrushIcon, CheckIcon, MicIcon, FilmIcon, TypeIcon, PauseIcon, LightBulbIcon } from './Icons';
import { useAppContext } from '../contexts/AppContext';
import { getErrorMessage } from '../utils';
import AnalysisLoader from './AnalysisLoader';
import AnalysisResult from './AnalysisResult';
import AssetPickerModal from './AssetPickerModal';
import SubtitleTrack from './SubtitleTrack';
import * as supabaseService from '../services/supabaseService';
import { ELEVENLABS_VOICES } from '../services/generativeMediaService';
import { v4 as uuidv4 } from 'uuid';

// Helper to initialize timeline state from script
const initializeTimelineFromScript = (script: Script): TimelineState => {
    let currentTime = 0;
    const voiceoverClips: TimelineClip[] = [];
    const aRollClips: TimelineClip[] = [];

    script.scenes.forEach((scene, index) => {
        const duration = 5; // Default 5s per scene
        voiceoverClips.push({
            id: uuidv4(),
            type: 'audio',
            url: '', // Will be filled later
            sceneIndex: index,
            startTime: currentTime,
            endTime: currentTime + duration,
            sourceDuration: duration,
        });
        aRollClips.push({
            id: uuidv4(),
            type: 'image', // Default to image placeholder
            url: '', // Will be filled later
            sceneIndex: index,
            startTime: currentTime,
            endTime: currentTime + duration,
            sourceDuration: duration,
        });
        currentTime += duration;
    });

    return {
        tracks: [
            { id: 'b-roll', type: 'b-roll', clips: [] },
            { id: 'a-roll', type: 'a-roll', clips: aRollClips },
            { id: 'voiceover', type: 'voiceover', clips: voiceoverClips },
            { id: 'music', type: 'music', clips: [] },
            { id: 'sfx', type: 'sfx', clips: [] },
        ],
        subtitles: [],
        voiceoverVolume: 1,
        musicVolume: 0.5,
        isDuckingEnabled: true,
        totalDuration: currentTime,
    };
};

// ... other components and logic from the original file ...

const EditorView: React.FC<{
    project: Project;
    onAnalysisTriggered: (previewUrl: string, frames: string[]) => void;
}> = ({ project, onAnalysisTriggered }) => {
    const { t, user, handleUpdateProject, addToast, consumeCredits, lockAndExecute } = useAppContext();
    const [timeline, setTimeline] = useState<TimelineState>(() => {
        if (project.timeline) return project.timeline;
        if (project.script) return initializeTimelineFromScript(project.script);
        // Fallback for an empty timeline
        return { tracks: [], subtitles: [], voiceoverVolume: 1, musicVolume: 0.5, isDuckingEnabled: true, totalDuration: 0 };
    });
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    
    // States for new features
    const [musicPrompt, setMusicPrompt] = useState('');
    const [sfxPrompt, setSfxPrompt] = useState('');

    const handleTimelineUpdate = (newTimeline: TimelineState) => {
        setTimeline(newTimeline);
        handleUpdateProject({ id: project.id, timeline: newTimeline });
    };
    
    // All the new AI generation handlers will go here
    const handleGenerateMusic = () => lockAndExecute(async () => {
        if (!musicPrompt.trim()) {
            addToast("Please enter a prompt for the music.", "error");
            return;
        }
        if (!await consumeCredits(5)) return;
        addToast("Generating AI music...", 'info');
        try {
            const audioBlob = await generativeMediaService.generateAiMusic(musicPrompt, Math.floor(timeline.totalDuration));
            const path = `${user!.id}/${project.id}/music/${uuidv4()}.mp3`;
            const audioUrl = await supabaseService.uploadFile(audioBlob, path);

            const newMusicClip: TimelineClip = {
                id: uuidv4(), type: 'audio', url: audioUrl, sceneIndex: -1,
                startTime: 0, endTime: timeline.totalDuration, sourceDuration: timeline.totalDuration
            };
            const musicTrack = timeline.tracks.find(t => t.type === 'music')!;
            musicTrack.clips = [newMusicClip]; // Replace any existing music

            handleTimelineUpdate({ ...timeline, tracks: [...timeline.tracks] });
            addToast("AI Music added to timeline!", 'success');
        } catch (e) {
            addToast(`Music generation failed: ${getErrorMessage(e)}`, 'error');
        }
    });

    const handleGenerateSfx = (time: number) => lockAndExecute(async () => {
        if (!sfxPrompt) return;
        if (!await consumeCredits(1)) return;
        addToast("Generating SFX...", 'info');
        try {
            const audioBlob = await generativeMediaService.generateSfx(sfxPrompt);
            const path = `${user!.id}/${project.id}/sfx/${uuidv4()}.mp3`;
            const audioUrl = await supabaseService.uploadFile(audioBlob, path);

            const newSfxClip: TimelineClip = {
                id: uuidv4(), type: 'audio', url: audioUrl, sceneIndex: -1,
                startTime: time, endTime: time + 2, sourceDuration: 2 // Assume 2s SFX
            };
            const sfxTrack = timeline.tracks.find(t => t.type === 'sfx')!;
            sfxTrack.clips.push(newSfxClip);

            handleTimelineUpdate({ ...timeline, tracks: [...timeline.tracks] });
            setSfxPrompt('');
        } catch (e) {
            addToast(`SFX generation failed: ${getErrorMessage(e)}`, 'error');
        }
    });

    const handleGenerateBroll = (sceneIndex: number) => lockAndExecute(async () => {
        if (!project.script) return;
        if (!await consumeCredits(10)) return;
        addToast("Generating AI B-Roll...", 'info');
        try {
            const scene = project.script.scenes[sceneIndex];
            const videoBlob = await generativeMediaService.generateAiBroll(scene.visual, project.platform);
            const path = `${user!.id}/${project.id}/b-roll/${uuidv4()}.mp4`;
            const videoUrl = await supabaseService.uploadFile(videoBlob, path);
            
            const voiceoverClip = timeline.tracks.find(t => t.type === 'voiceover')!.clips[sceneIndex];
            const newBrollClip: TimelineClip = {
                id: uuidv4(), type: 'video', url: videoUrl, sceneIndex,
                startTime: voiceoverClip.startTime, endTime: voiceoverClip.endTime, sourceDuration: 5
            };
            const brollTrack = timeline.tracks.find(t => t.type === 'b-roll')!;
            brollTrack.clips.push(newBrollClip);
            handleTimelineUpdate({ ...timeline, tracks: [...timeline.tracks] });

        } catch (e) {
             addToast(`B-Roll generation failed: ${getErrorMessage(e)}`, 'error');
        }
    });
    
    const handleGenerateAnimatedSubtitles = () => lockAndExecute(async () => {
        if (!project.script) return;
        if (!await consumeCredits(2)) return;
        addToast("Generating animated subtitles...", 'info');
        try {
            const subtitles = await geminiService.generateAnimatedSubtitles(project.script);
            handleTimelineUpdate({ ...timeline, subtitles });
            addToast("Animated subtitles generated!", 'success');
        } catch (e) {
            addToast(`Subtitle generation failed: ${getErrorMessage(e)}`, 'error');
        }
    });

    const handleAssembleVideo = () => lockAndExecute(async () => {
        // This remains a simulation but acknowledges the new structure
        addToast("Assembling final video... (simulation)", "info");
        const aRollTrack = timeline.tracks.find(t => t.type === 'a-roll');
        const firstVideo = aRollTrack?.clips.find(c => c.type === 'video');
        const previewUrl = firstVideo?.url || 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4';
        const frames = aRollTrack?.clips.slice(0, 3).map(c => c.url).filter(Boolean) as string[] || [];
        onAnalysisTriggered(previewUrl, frames);
    });

    if (!project.script) {
        return <div className="text-center py-16 px-6 bg-gray-800/50 rounded-2xl"><h2 className="text-2xl font-bold text-white mb-3">{t('asset_studio.script_required_title')}</h2><p className="text-gray-400 mb-6 max-w-md mx-auto">{t('asset_studio.script_required_subtitle')}</p></div>
    }

    // A simplified timeline component for brevity
    const Timeline = () => (
        <div className="bg-gray-900 p-2 rounded-lg space-y-1">
            {timeline.tracks.map(track => (
                 <div key={track.id} className="h-10 bg-gray-800 rounded relative">
                     <span className="absolute left-1 top-1 text-[10px] font-bold text-gray-500 uppercase">{track.type}</span>
                    {track.clips.map(clip => (
                        <div key={clip.id} className="absolute h-full bg-indigo-500/50 border border-indigo-400 rounded p-1" style={{ left: `${(clip.startTime/timeline.totalDuration)*100}%`, width: `${((clip.endTime - clip.startTime)/timeline.totalDuration)*100}%` }}>
                             <p className="text-white text-[10px] truncate">{clip.type} scene {clip.sceneIndex+1}</p>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
    
    // This is a highly simplified UI for all the new features.
    return (
        <div className="space-y-8">
            <header className="text-center">
                <h1 className="text-4xl font-bold text-white">Creative Studio 3.0</h1>
                <p className="mt-2 text-lg text-gray-400">Assemble your video on the new AI-powered timeline.</p>
            </header>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                    <div className="aspect-video bg-black rounded-lg">
                        {/* Video Preview Would Go Here */}
                    </div>
                    <Timeline />
                    <SubtitleTrack timeline={timeline} onUpdate={(u) => handleTimelineUpdate({...timeline, ...u})} duration={timeline.totalDuration} isPlaying={isPlaying} currentTime={currentTime} />
                </div>
                <div className="lg:col-span-1 space-y-4">
                     <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                        <h3 className="text-lg font-bold text-white mb-3 flex items-center"><LightBulbIcon className="w-5 h-5 mr-2"/> AI Actions</h3>
                        <div className="space-y-2">
                            <button onClick={handleGenerateAnimatedSubtitles} className="w-full text-center py-2 text-sm font-semibold bg-indigo-600/80 text-white rounded-lg hover:bg-indigo-500">Generate Animated Subs (2 Cr)</button>
                             <button onClick={() => handleGenerateBroll(0)} className="w-full text-center py-2 text-sm font-semibold bg-indigo-600/80 text-white rounded-lg hover:bg-indigo-500">Generate B-Roll for Scene 1 (10 Cr)</button>
                        </div>
                    </div>
                    <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                         <h3 className="text-lg font-bold text-white mb-3 flex items-center"><MusicNoteIcon className="w-5 h-5 mr-2"/> AI Music & SFX</h3>
                          <div className="flex gap-2">
                            <input value={musicPrompt} onChange={e => setMusicPrompt(e.target.value)} type="text" placeholder="Music prompt (e.g. upbeat)" className="flex-grow bg-gray-900 border-gray-600 rounded-lg p-2 text-sm"/>
                            <button onClick={handleGenerateMusic} className="p-2 bg-indigo-600 rounded-lg"><SparklesIcon className="w-5 h-5"/></button>
                         </div>
                          <div className="flex gap-2 mt-2">
                            <input value={sfxPrompt} onChange={e => setSfxPrompt(e.target.value)} type="text" placeholder="SFX prompt (e.g. whoosh)" className="flex-grow bg-gray-900 border-gray-600 rounded-lg p-2 text-sm"/>
                            <button onClick={() => handleGenerateSfx(currentTime)} className="p-2 bg-indigo-600 rounded-lg"><SparklesIcon className="w-5 h-5"/></button>
                         </div>
                    </div>
                </div>
            </div>

            <div className="text-center pt-4">
                <button onClick={handleAssembleVideo} className="w-full max-w-sm inline-flex items-center justify-center px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-full">
                    <SparklesIcon className="w-6 h-6 mr-3" />
                    Assemble & Analyze
                </button>
            </div>
        </div>
    );
}

const FinalEditStep: React.FC<{ project: Project; onProceed: () => void; }> = ({ project, onProceed }) => {
    const { t, addToast, handleUpdateProject } = useAppContext();
    const getInitialView = () => project.analysis ? 'analysis' : 'editor';
    const [view, setView] = useState<'editor' | 'loading' | 'analysis'>(getInitialView());
    const [analysisResult, setAnalysisResult] = useState<Analysis | null>(project.analysis);
    const [videoPreview, setVideoPreview] = useState<{ url: string; frames: string[] } | null>(project.publishedUrl ? { url: project.publishedUrl, frames: [] } : null);
    
    const handleAnalysisTriggered = async (previewUrl: string, frames: string[]) => {
        if (!project.title) {
            addToast("Project title not found, cannot perform analysis.", "error"); return;
        }
        setVideoPreview({ url: previewUrl, frames });
        setView('loading');
        try {
            const result = await geminiService.analyzeVideo(frames, project.title, project.platform);
            setAnalysisResult(result);
            await handleUpdateProject({ id: project.id, analysis: result });
            setView('analysis');
        } catch (e) {
            addToast(`Analysis failed: ${getErrorMessage(e)}`, 'error');
            setView('editor');
        }
    };

    const handleReset = () => {
        setView('editor');
        setAnalysisResult(null);
        setVideoPreview(null);
        handleUpdateProject({ id: project.id, analysis: null, publishedUrl: null });
    };

    switch (view) {
        case 'loading':
            return <div className="min-h-[60vh] flex items-center justify-center"><AnalysisLoader frames={videoPreview?.frames || []} /></div>;
        case 'analysis':
            if (analysisResult && videoPreview) {
                return <AnalysisResult result={analysisResult} onReset={handleReset} videoPreviewUrl={videoPreview.url} onProceedToLaunchpad={onProceed} />;
            }
            setView('editor'); return null;
        case 'editor':
        default:
            return <EditorView project={project} onAnalysisTriggered={handleAnalysisTriggered} />;
    }
};

export default FinalEditStep;
