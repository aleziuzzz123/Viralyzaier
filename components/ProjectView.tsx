import React, { useState, useEffect } from 'react';
import { Project, Analysis, Script as ScriptType, WorkflowStep, Platform } from '../types';
import { TitleIcon, ScriptIcon, SparklesIcon, TrashIcon, PhotoIcon, CtaIcon, LockClosedIcon, CheckIcon, YouTubeIcon, TikTokIcon, InstagramIcon, MusicNoteIcon, RocketLaunchIcon, TrendIcon, TargetIcon, CheckBadgeIcon, LightBulbIcon } from './Icons';
import TitleOptimizer from './TitleOptimizer';
import ScriptGenerator from './ScriptGenerator';
import AnalysisResult from './AnalysisResult';
import VideoUploader from './VideoUploader';
import AssetStudio from './AssetStudio';
import Storyboard from './Storyboard';
import Launchpad from './Launchpad';
import TutorialCallout from './TutorialCallout';
import { analyzeVideo } from '../services/geminiService';
import { useAppContext } from '../contexts/AppContext';
import CompetitorAnalysis from './CompetitorAnalysis';
import TrendExplorer from './TrendExplorer';
import AnalysisLoader from './AnalysisLoader';

interface ProjectViewProps {
    project: Project;
}

const platformIcons: { [key in Platform]: React.FC<{className?: string}> } = {
    youtube_long: YouTubeIcon,
    youtube_short: YouTubeIcon,
    tiktok: TikTokIcon,
    instagram: InstagramIcon,
};

const ProjectStepper: React.FC<{
    steps: { name: string; icon: React.ElementType }[];
    currentStep: number;
    unlockedStep: number;
    onStepSelect: (step: number) => void;
    t: (key: string) => string;
}> = ({ steps, currentStep, unlockedStep, onStepSelect, t }) => {
    return (
        <nav aria-label="Progress">
            <ol role="list" className="flex items-center">
                {steps.map((step, stepIdx) => {
                    const stepNumber = stepIdx + 1;
                    const isCompleted = stepNumber < unlockedStep;
                    const isCurrentWorkflowStep = stepNumber === unlockedStep;
                    const isLocked = stepNumber > unlockedStep;
                    const isSelected = stepNumber === currentStep;

                    let bubbleContent;
                    let bubbleClasses = 'relative w-9 h-9 flex items-center justify-center rounded-full transition-colors';
                    let labelClasses = `absolute top-10 w-max -translate-x-1/2 left-1/2 text-xs font-semibold`;

                    if (isCompleted) {
                        bubbleContent = <CheckIcon className="w-5 h-5 text-white" aria-hidden="true" />;
                        bubbleClasses += ' bg-indigo-600 hover:bg-indigo-500';
                        labelClasses += ' text-indigo-400';
                    } else if (isCurrentWorkflowStep) {
                        const IconComponent = step.icon;
                        bubbleContent = <IconComponent className="w-5 h-5 text-indigo-400" aria-hidden="true" />;
                        bubbleClasses += ' bg-gray-800 border-2 border-indigo-600';
                        labelClasses += ' text-indigo-400';
                    } else { // Locked
                        bubbleContent = <LockClosedIcon className="w-5 h-5 text-gray-500" aria-hidden="true" />;
                        bubbleClasses += ' bg-gray-800 border-2 border-gray-600 cursor-not-allowed';
                        labelClasses += ' text-gray-400';
                    }
                    
                    if (isSelected) {
                        bubbleClasses += ' ring-2 ring-offset-2 ring-offset-gray-900 ring-pink-500';
                        labelClasses = labelClasses.replace('text-indigo-400', 'text-pink-400').replace('text-gray-400', 'text-pink-400');
                    }

                    return (
                        <li key={step.name} className={`relative ${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
                            {/* Connector line */}
                            {stepIdx < steps.length - 1 && (
                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                    <div className={`h-0.5 w-full ${isCompleted ? 'bg-indigo-600' : 'bg-gray-700'}`} />
                                </div>
                            )}

                             <button
                                onClick={() => !isLocked && onStepSelect(stepNumber as WorkflowStep)}
                                disabled={isLocked}
                                className={bubbleClasses}
                                aria-current={isSelected ? 'step' : undefined}
                            >
                                {bubbleContent}
                                <span className="sr-only">{t(step.name)}</span>
                            </button>
                            
                            <span className={labelClasses}>{t(step.name)}</span>
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
};

const workflowSteps = [
    { name: 'project_view.stepper_strategy', icon: TitleIcon },
    { name: 'project_view.stepper_script', icon: ScriptIcon },
    { name: 'project_view.stepper_assets', icon: PhotoIcon },
    { name: 'project_view.stepper_storyboard', icon: MusicNoteIcon },
    { name: 'project_view.stepper_analysis', icon: SparklesIcon },
    { name: 'project_view.stepper_launch', icon: RocketLaunchIcon },
];

const extractFrames = (videoFile: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const videoUrl = URL.createObjectURL(videoFile);

        video.src = videoUrl;
        video.muted = true;

        const frames: string[] = [];
        const capturePoints = [0.01, 0.3, 0.8]; // Capture at 1%, 30%, 80%
        let captures = 0;

        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const captureFrameAt = (time: number) => {
                video.currentTime = time;
            };

            video.onseeked = () => {
                if (!context) {
                    URL.revokeObjectURL(videoUrl);
                    reject(new Error("Canvas context is not available."));
                    return;
                }
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                const frameDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                frames.push(frameDataUrl);
                captures++;

                if (captures < capturePoints.length) {
                    captureFrameAt(video.duration * capturePoints[captures]);
                } else {
                    URL.revokeObjectURL(videoUrl);
                    resolve(frames);
                }
            };

            video.onerror = (e) => {
                URL.revokeObjectURL(videoUrl);
                reject(new Error("Error loading video for frame extraction."));
            };

            // Start the process
            video.currentTime = video.duration * capturePoints[0];
        };
        
        video.load();
    });
};


const ProjectView: React.FC<ProjectViewProps> = ({ project }) => {
    const { 
        handleUpdateProject, handleDeleteProject, consumeCredits, 
        dismissedTutorials, addToast, t
    } = useAppContext();
    
    const [projectName, setProjectName] = useState(project.name);
    const [isNameSaved, setIsNameSaved] = useState(false);
    const [activeStep, setActiveStep] = useState<WorkflowStep>(project.workflowStep);
    const [activeStrategyTab, setActiveStrategyTab] = useState<'topic' | 'competitor' | 'trend'>('topic');

    // State for the Analysis tab
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
    const [analysisIsLoading, setAnalysisIsLoading] = useState<boolean>(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [analysisFrames, setAnalysisFrames] = useState<string[]>([]);


    const handleFileSelect = (file: File) => {
        setVideoFile(file);
        setAnalysisError(null);
    };
    
    useEffect(() => {
        // Reset state if project changes
        setProjectName(project.name);
        setVideoFile(null);
        setAnalysisError(null);
        setAnalysisIsLoading(false);
        setActiveStep(project.workflowStep);
        setActiveStrategyTab('topic');
    }, [project.id, project.workflowStep]);

    useEffect(() => {
        if (!videoFile) {
            setVideoPreviewUrl(null);
            return;
        }
        const objectUrl = URL.createObjectURL(videoFile);
        setVideoPreviewUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [videoFile]);

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setProjectName(e.target.value);
    };

    const handleNameBlur = () => {
        if (projectName.trim() && projectName !== project.name) {
            handleUpdateProject({ id: project.id, name: projectName.trim() });
            setIsNameSaved(true);
            setTimeout(() => setIsNameSaved(false), 2000);
        } else {
            setProjectName(project.name);
        }
    };
    
    const advanceWorkflow = (toStep: WorkflowStep) => {
        if (project.workflowStep < toStep) {
            handleUpdateProject({ id: project.id, workflowStep: toStep });
        }
        setActiveStep(toStep);
    };

    const handleTitleSelect = (title: string) => {
        const updates: Partial<Project> & { id: string } = { id: project.id, title: title };

        const isFirstCompletion = project.workflowStep < 2;
        if (isFirstCompletion) {
            updates.workflowStep = 2;
        }

        handleUpdateProject(updates).then(() => {
            // After the project state is updated, advance the UI
            if (isFirstCompletion) {
                addToast(t('toast.brief_complete'), 'success');
                setActiveStep(2); // Automatically move to the next step
            } else {
                addToast(t('toast.topic_title_updated'), 'success');
            }
        });
    };

    const handleTrendSelect = (trend: string) => {
        handleUpdateProject({ id: project.id, topic: trend });
        addToast("Project topic updated from trend! Now, optimize titles for it.", 'success');
        // Guide user back to the title optimizer for a seamless workflow
        setActiveStrategyTab('topic');
    };
    
    const handleScriptGenerated = (script: ScriptType) => {
        handleUpdateProject({id: project.id, script, status: 'Scripting', workflowStep: 3 }).then(() => {
            setActiveStep(3); // Automatically move to the next step
        });
    };

    const handleAnalysisComplete = (analysis: Analysis | null) => {
         handleUpdateProject({id: project.id, analysis }).then(() => {
             if (analysis) {
                 advanceWorkflow(6); // Go to launchpad on success
             }
         });
    };
    
    const handleTopicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleUpdateProject({ id: project.id, topic: e.target.value });
    };
    
    const handleAnalyzeClick = React.useCallback(async () => {
        if (!project.title) {
            setAnalysisError(t('project_view.analysis.error_title_missing'));
            return;
        }
        if (!videoFile) {
          setAnalysisError(t('project_view.analysis.error_file_missing'));
          return;
        }
        if (!await consumeCredits(5)) return; // Multimodal analysis is more expensive
        
        setAnalysisIsLoading(true);
        setAnalysisError(null);
        setAnalysisFrames([]); // Reset frames for loader

        try {
            const frames = await extractFrames(videoFile);
            setAnalysisFrames(frames); // Set frames so the cool loader can render
            const result = await analyzeVideo(frames, project.title!, project.platform);
            handleAnalysisComplete(result);
        } catch (e: unknown) {
            setAnalysisError(e instanceof Error ? e.message : t('project_view.analysis.error_unknown'));
            handleAnalysisComplete(null);
        } finally {
            setAnalysisIsLoading(false);
        }
    }, [videoFile, project, consumeCredits, handleAnalysisComplete, project.title, project.platform, t]);

    const handleAnalysisReset = () => {
        handleUpdateProject({id: project.id, analysis: null});
        setVideoFile(null);
        setVideoPreviewUrl(null);
        setAnalysisError(null);
        setActiveStep(5);
    };
    
    const renderActiveStep = () => {
        switch(activeStep) {
            case 1:
                const strategyTabs = [
                    { id: 'topic', name: t('project_view.strategy.from_topic'), icon: TitleIcon },
                    { id: 'competitor', name: t('project_view.strategy.from_competitor'), icon: TargetIcon },
                    { id: 'trend', name: t('project_view.strategy.from_trend'), icon: TrendIcon },
                ];
                return (
                    <div className="w-full mx-auto animate-fade-in-up space-y-12">
                         <header className="text-center">
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-500">Craft Your Strategy</h1>
                            <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">Start with a topic, reverse-engineer a competitor, or ride a breakout trend.</p>
                         </header>
                        
                         <div className="bg-gray-800/30 p-6 rounded-2xl border border-gray-700 max-w-4xl mx-auto flex items-start gap-4">
                            <LightBulbIcon className="w-8 h-8 text-yellow-300 flex-shrink-0 mt-1" />
                            <div>
                                <h3 className="font-bold text-white">Your Starting Point</h3>
                                <p className="text-sm text-gray-400 mt-1">A great video starts with a great strategy. Choose one of the three paths below to define your video's direction and create a high-potential title.</p>
                            </div>
                        </div>

                         <div className="w-full max-w-5xl mx-auto">
                            <div className="border-b border-gray-700 mb-8">
                                <nav className="-mb-px flex justify-center space-x-8" aria-label="Tabs">
                                    {strategyTabs.map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveStrategyTab(tab.id as any)}
                                            className={`${
                                                activeStrategyTab === tab.id
                                                    ? 'border-indigo-500 text-indigo-400'
                                                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
                                            } group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                                        >
                                            <tab.icon className="-ml-0.5 mr-2 h-5 w-5" aria-hidden="true" />
                                            <span>{tab.name}</span>
                                        </button>
                                    ))}
                                </nav>
                            </div>
                            
                            {activeStrategyTab === 'topic' && (
                                <div className="w-full max-w-3xl mx-auto space-y-6">
                                     <div>
                                        <label htmlFor="topic" className="block text-sm font-bold text-gray-300 mb-2">{t('project_view.brief.topic_label')}</label>
                                        <input id="topic" type="text" value={project.topic} onChange={handleTopicChange} placeholder={t('project_view.brief.topic_placeholder')} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                    </div>
                                    <TitleOptimizer onTitleSelect={handleTitleSelect} onBack={() => {}} platform={project.platform} />
                                </div>
                            )}

                            {activeStrategyTab === 'competitor' && <CompetitorAnalysis project={project} onApplyTitle={handleTitleSelect} />}

                            {activeStrategyTab === 'trend' && <TrendExplorer onTrendSelect={handleTrendSelect} />}
                         </div>
                    </div>
                );
            case 2:
                return <ScriptGenerator project={project} onScriptGenerated={handleScriptGenerated} onProceed={() => setActiveStep(3)} platform={project.platform} />;
            case 3:
                return <AssetStudio project={project} onProceed={() => setActiveStep(4)} />;
            case 4:
                return <Storyboard project={project} onProceed={() => setActiveStep(5)} />;
            case 5:
                if (analysisIsLoading) return <AnalysisLoader frames={analysisFrames} />;

                if (project.analysis) {
                    return <AnalysisResult result={project.analysis} onReset={handleAnalysisReset} videoPreviewUrl={videoPreviewUrl || ''} onProceedToLaunchpad={() => setActiveStep(6)} />;
                }
                
                if (project.workflowStep < 5) {
                     return (
                        <div className="text-center py-16 px-6 bg-gray-800/50 rounded-2xl">
                            <h2 className="text-2xl font-bold text-white mb-3">{t('project_view.analysis.locked_title')}</h2>
                            <p className="text-gray-400 mb-6 max-w-md mx-auto">{t('project_view.analysis.locked_subtitle')}</p>
                        </div>
                    );
                }

                const isAnalyzeDisabled = analysisIsLoading || !videoFile;
                return (
                     <div className="w-full flex flex-col items-center">
                        <header className="text-center mb-8">
                            <h1 className="text-3xl font-bold text-white">{t('project_view.analysis.title')}</h1>
                            <p className="mt-2 text-lg text-gray-400">{t('project_view.analysis.subtitle')}</p>
                        </header>
                        {analysisError && <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg relative mb-6 w-full max-w-lg text-center" role="alert">{analysisError}</div>}
                        <div className="w-full max-w-lg mx-auto text-center">
                            <VideoUploader onFileSelect={handleFileSelect} />
                            {videoFile && (
                            <div className="mt-6">
                                <p className="text-gray-300 mb-4">{t('project_view.analysis.selected_file')} <span className="font-semibold text-white">{videoFile.name}</span></p>
                                {videoPreviewUrl && <video src={videoPreviewUrl} controls className="w-full rounded-lg shadow-lg mx-auto max-h-64"></video>}
                                <div className="flex items-center justify-center space-x-4 mt-6" title={isAnalyzeDisabled && !videoFile ? "Please upload a video first" : ""}>
                                    <button onClick={handleAnalyzeClick} disabled={isAnalyzeDisabled} className="inline-flex items-center justify-center px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg disabled:bg-gray-500 disabled:cursor-not-allowed">
                                        <SparklesIcon className="w-6 h-6 mr-3" />
                                        {t('project_view.analysis.button')}
                                    </button>
                                </div>
                            </div>
                            )}
                        </div>
                    </div>
                );
            case 6:
                return <Launchpad project={project} />;
            default:
                return <div>Something went wrong.</div>;
        }
    }

    const PlatformIcon = platformIcons[project.platform];
    const platformName = t(`platform.${project.platform.replace('_', '_name')}` as any);

    return (
        <div className="animate-fade-in-up">
            <header className="flex justify-between items-start mb-6">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <input type="text" value={projectName} onChange={handleNameChange} onBlur={handleNameBlur} onKeyPress={(e) => e.key === 'Enter' && e.currentTarget.blur()} className="text-4xl font-black text-white bg-transparent border-none focus:outline-none focus:ring-0 p-0 truncate" />
                        {isNameSaved && <div className="animate-fade-in text-green-400 flex items-center gap-1 text-sm"><CheckBadgeIcon className="w-6 h-6"/> Saved!</div>}
                    </div>
                     <div className="mt-2 flex items-center gap-3 text-gray-400">
                        <PlatformIcon className="w-6 h-6" />
                        <span className="font-semibold">{platformName}</span>
                    </div>
                </div>
                <button onClick={() => handleDeleteProject(project.id)} className="p-2 text-gray-500 hover:text-red-400 transition-colors flex-shrink-0">
                    <TrashIcon className="w-6 h-6" />
                </button>
            </header>
            
            <div className="flex justify-center mb-12 pt-4">
               <ProjectStepper 
                    steps={workflowSteps} 
                    currentStep={activeStep} 
                    unlockedStep={project.workflowStep} 
                    onStepSelect={(step) => { if(step <= project.workflowStep) setActiveStep(step as WorkflowStep) }}
                    t={t}
                />
            </div>

            {!dismissedTutorials.includes('workflow') && (
                 <div className="mb-8">
                    <TutorialCallout id="workflow">
                        {t('project_view.tutorial_callout')}
                    </TutorialCallout>
                 </div>
             )}

            <div className="p-1 sm:p-4 bg-black/10 rounded-lg min-h-[60vh]">
                {renderActiveStep()}
            </div>
        </div>
    );
};

export default ProjectView;