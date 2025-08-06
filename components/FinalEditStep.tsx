import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Project, Scene, Analysis, VisualType, StockAsset, AIMusic, Subtitle, TimelineState, SFXClip, BrandIdentity } from '../types';
import * as geminiService from '../services/geminiService';
import { SparklesIcon, PhotoIcon, PlayIcon, RocketLaunchIcon, MusicNoteIcon, SubtitlesIcon, XCircleIcon, VolumeUpIcon, VolumeOffIcon, PaintBrushIcon, CheckIcon } from './Icons';
import { useAppContext } from '../contexts/AppContext';
import { getErrorMessage } from '../utils';
import AnalysisLoader from './AnalysisLoader';
import AnalysisResult from './AnalysisResult';
import AssetPickerModal from './AssetPickerModal';
import SubtitleTrack from './SubtitleTrack';

const EditorView: React.FC<{
    project: Project;
    onAnalysisTriggered: (previewUrl: string, frames: string[]) => void;
}> = ({ project, onAnalysisTriggered }) => {
    const { t, handleUpdateProject, addToast, consumeCredits, brandIdentities } = useAppContext();
    const [isRenderingPreview, setIsRenderingPreview] = useState(false);
    const [isMusicLibraryOpen, setIsMusicLibraryOpen] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);

    const videoRef = useRef<HTMLVideoElement>(null);
    
    const activeBrandIdentity = brandIdentities.find(b => b.id === project.activeBrandIdentityId);

    const timeline = useMemo<TimelineState>(() => project.timeline || {
        subtitles: [], musicUrl: null, voiceoverVolume: 1, musicVolume: 0.5, sfx: [], isDuckingEnabled: false,
    }, [project.timeline]);
    
    const videoDuration = videoRef.current?.duration || project.script?.scenes.reduce((acc, s) => {
        const parts = s.timecode.replace('s', '').split('-');
        return acc + (parseInt(parts[1]) - parseInt(parts[0]));
    }, 0) || 60;
    
    const activeSubtitle = timeline.subtitles.find(s => currentTime >= s.start && currentTime <= s.end);
    
    const getSubtitleFont = () => {
        switch(project.style) {
            case 'High-Energy Viral': return "'Inter', sans-serif";
            case 'Cinematic Documentary': return "'Georgia', serif";
            case 'Clean & Corporate': return "'Arial', sans-serif";
            default: return "'Inter', sans-serif";
        }
    };

    const handleRenderPreview = async () => {
        setIsRenderingPreview(true);
        try {
            addToast("Assembling animatic preview...", "info");
            await new Promise(res => setTimeout(res, 2000));
            const firstVisual = Object.values(project.assets).find(a => a.visualUrl && a.visualType !== 'ai_graphic' && a.visualType !== 'ai_image');
            const finalVideoUrl = firstVisual?.visualUrl || 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4';
            const frames = Object.values(project.assets).map(a => a.visualUrl).filter((url): url is string => !!(url && !url.endsWith('.svg'))).slice(0, 3);
            await handleUpdateProject({ id: project.id, publishedUrl: finalVideoUrl });
            onAnalysisTriggered(finalVideoUrl, frames);
        } catch (e) {
             addToast(`Preview failed: ${getErrorMessage(e)}`, 'error');
        } finally {
            setIsRenderingPreview(false);
        }
    };
    
    const handleUpdateTimeline = (updates: Partial<TimelineState>) => {
        const newTimeline = { ...timeline, ...updates };
        handleUpdateProject({ id: project.id, timeline: newTimeline });
    };

    const handleGenerateSubtitles = async () => {
        if (!project.script || !project.style) return;
        if (!await consumeCredits(1)) return;
        addToast("Generating subtitles with AI...", "info");
        try {
            const subtitles = await geminiService.generateSubtitlesFromScript(project.script, project.style);
            handleUpdateTimeline({ subtitles });
            addToast("Subtitles generated successfully!", "success");
        } catch (e) {
            addToast(`Subtitle generation failed: ${getErrorMessage(e)}`, 'error');
        }
    };

    if (!project.script) {
        return <div className="text-center py-16 px-6 bg-gray-800/50 rounded-2xl"><h2 className="text-2xl font-bold text-white mb-3">{t('asset_studio.script_required_title')}</h2><p className="text-gray-400 mb-6 max-w-md mx-auto">{t('asset_studio.script_required_subtitle')}</p></div>
    }

    return (
        <div className="space-y-8">
            <header className="text-center">
                <h1 className="text-4xl font-bold text-white">{t('final_edit.title')}</h1>
                <p className="mt-2 text-lg text-gray-400">{t('final_edit.subtitle')}</p>
            </header>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-black rounded-lg aspect-video relative">
                    <video ref={videoRef} src={project.publishedUrl || 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4'} controls className="w-full h-full" onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)} />
                    {activeSubtitle && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full px-4 text-center pointer-events-none">
                            <span className="p-2 rounded text-lg font-bold" style={{...activeSubtitle.style, fontFamily: getSubtitleFont()}}>
                                {activeSubtitle.text}
                            </span>
                        </div>
                    )}
                    {activeBrandIdentity?.logoUrl && (
                        <img src={activeBrandIdentity.logoUrl} alt="Brand Watermark" className="absolute top-4 right-4 w-24 h-auto opacity-80 pointer-events-none"/>
                    )}
                </div>
                <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 space-y-4">
                     <h3 className="font-bold text-white">Controls</h3>
                     <button onClick={handleGenerateSubtitles} className="w-full flex items-center gap-2 p-2 bg-gray-700 rounded-lg font-semibold hover:bg-indigo-600"><SubtitlesIcon className="w-5 h-5"/> Generate Subtitles</button>
                     <button onClick={() => setIsMusicLibraryOpen(true)} className="w-full flex items-center gap-2 p-2 bg-gray-700 rounded-lg font-semibold hover:bg-indigo-600"><MusicNoteIcon className="w-5 h-5"/> Music Library</button>
                      <button onClick={() => handleUpdateProject({id: project.id, activeBrandIdentityId: brandIdentities[0]?.id || null})} className="w-full flex items-center gap-2 p-2 bg-gray-700 rounded-lg font-semibold hover:bg-indigo-600">Add Watermark</button>
                </div>
            </div>

            <div className="bg-gray-800/50 p-4 rounded-2xl border border-gray-700 space-y-2">
                <h2 className="text-xl font-bold text-white px-2">Timeline</h2>
                <SubtitleTrack timeline={timeline} onUpdate={handleUpdateTimeline} duration={videoDuration} />
            </div>

            <div className="text-center pt-4">
                <button onClick={handleRenderPreview} disabled={isRenderingPreview} className="w-full max-w-sm inline-flex items-center justify-center px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg disabled:bg-gray-600">
                    <SparklesIcon className="w-6 h-6 mr-3" />
                    {isRenderingPreview ? t('final_edit.rendering_preview') : t('final_edit.render_preview_button')}
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