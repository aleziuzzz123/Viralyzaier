import React, { useState, useEffect } from 'react';
import { Project, Script as ScriptType, WorkflowStep, Platform, Blueprint } from '../types';
import { ScriptIcon, SparklesIcon, TrashIcon, PhotoIcon, CtaIcon, CheckIcon, YouTubeIcon, TikTokIcon, InstagramIcon, MusicNoteIcon, RocketLaunchIcon, CheckBadgeIcon, LightBulbIcon, MagicWandIcon, ChartPieIcon } from './Icons';
import ScriptGenerator from './ScriptGenerator';
import Launchpad from './Launchpad';
import { useAppContext } from '../contexts/AppContext';
import BlueprintStep from './BlueprintStep';
import FinalEditStep from './FinalEditStep';
import * as supabaseService from '../services/supabaseService';
import { getErrorMessage } from '../utils';
import AnalysisResult from './AnalysisResult';
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

interface ProjectWorkflowGuideProps {
    currentStep: number;
    unlockedStep: number;
    onStepSelect: (step: number) => void;
    t: (key: string) => string;
}

const ProjectWorkflowGuide: React.FC<ProjectWorkflowGuideProps> = ({ currentStep, unlockedStep, onStepSelect, t }) => {
    const steps = [
        { nameKey: 'project_view.stepper_blueprint', icon: LightBulbIcon, description: "Start with a topic and generate a complete strategic plan with a script and visuals." },
        { nameKey: 'project_view.stepper_script_editor', icon: ScriptIcon, description: "Refine your AI-generated script, edit scenes, and choose the perfect hook." },
        { nameKey: 'project_view.stepper_creative_studio', icon: PhotoIcon, description: "Assemble your video, generate assets, add music, captions, and effects." },
        { nameKey: 'project_view.virality_engine', icon: ChartPieIcon, description: "Get a data-driven analysis of your video's viral potential before you publish." },
        { nameKey: 'project_view.stepper_launch', icon: RocketLaunchIcon, description: "Generate thumbnails, SEO, and publish your final video." },
    ];

    return (
        <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700/50 mb-8">
            <h2 className="text-xl font-bold text-white mb-1">Your Project Workflow</h2>
            <p className="text-sm text-gray-400 mb-6">Follow the stages to develop your video. Start with The Spark, refine The Script, then head to the Creative Studio before heading to the Launchpad.</p>
            <nav>
                <ol className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {steps.map((step, index) => {
                        const stepNumber = index + 1;
                        const isUnlocked = stepNumber <= unlockedStep;
                        const isCurrent = stepNumber === currentStep;
                        const isCompleted = stepNumber < unlockedStep;

                        return (
                            <li key={step.nameKey}>
                                <button
                                    onClick={() => isUnlocked && onStepSelect(stepNumber)}
                                    disabled={!isUnlocked}
                                    className={`w-full p-4 rounded-lg border-2 text-left transition-all duration-200 h-full flex flex-col ${
                                        isCurrent ? 'bg-indigo-900/50 border-indigo-500' :
                                        isUnlocked ? 'bg-gray-700/50 border-transparent hover:border-indigo-600' :
                                        'bg-gray-800/30 border-gray-700/50 cursor-not-allowed opacity-60'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className={`p-2 rounded-full ${
                                            isCompleted ? 'bg-green-500/20 text-green-400' :
                                            isUnlocked ? 'bg-indigo-500/20 text-indigo-400' : 'bg-gray-600/50 text-gray-500'
                                        }`}>
                                            {isCompleted ? <CheckIcon className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
                                        </div>
                                        {isCompleted && <span className="text-xs font-bold text-green-400">DONE</span>}
                                    </div>
                                    <p className="mt-3 font-bold text-white">{t(step.nameKey as any)}</p>
                                    <p className="text-xs text-gray-400 mt-1 flex-grow">{step.description}</p>
                                    <p className="text-xs text-gray-500 mt-2 font-bold">STAGE {stepNumber}</p>
                                </button>
                            </li>
                        );
                    })}
                </ol>
            </nav>
        </div>
    );
};


const ProjectView: React.FC<ProjectViewProps> = ({ project }) => {
    const { 
        handleUpdateProject, handleDeleteProject, 
        addToast, t, user
    } = useAppContext();
    
    const [projectName, setProjectName] = useState(project.name);
    const [isNameSaved, setIsNameSaved] = useState(false);
    const [activeStep, setActiveStep] = useState<WorkflowStep>(project.workflowStep);
    
    useEffect(() => {
        setProjectName(project.name);
        setActiveStep(project.workflowStep);
    }, [project.id, project.workflowStep, project.name]);


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
        const newStep = Math.max(project.workflowStep, toStep) as WorkflowStep;
        if (project.workflowStep < newStep) {
            handleUpdateProject({ id: project.id, workflowStep: newStep });
        }
        setActiveStep(toStep);
    };

    const handleBlueprintAccepted = async (blueprint: Blueprint, selectedTitle: string) => {
        if (!user) return;
        try {
             // Upload moodboard images and get URLs
            const moodboardUrls = await Promise.all(
                blueprint.moodboard.map(async (base64Img, index) => {
                    const blob = await supabaseService.dataUrlToBlob(base64Img);
                    const path = `${user.id}/${project.id}/moodboard_${index}.jpg`;
                    return supabaseService.uploadFile(blob, path);
                })
            );
            
            // Update project with all blueprint data
            await handleUpdateProject({
                id: project.id,
                title: selectedTitle,
                name: selectedTitle, // Also update project name
                script: blueprint.script,
                moodboard: moodboardUrls,
            });

            addToast(t('toast.brief_complete'), 'success');
            advanceWorkflow(2);
            
        } catch (error) {
             addToast(`Failed to save blueprint: ${getErrorMessage(error)}`, "error");
        }
    };

    const handleScriptSaved = (script: ScriptType) => {
        handleUpdateProject({id: project.id, script, status: 'Scripting' }).then(() => {
            addToast("Script saved!", "success");
            advanceWorkflow(3);
        });
    };
    
    const renderActiveStep = () => {
        switch(activeStep) {
            case 1:
                return <BlueprintStep project={project} onBlueprintAccepted={handleBlueprintAccepted} />;
            case 2:
                return <ScriptGenerator project={project} onScriptSaved={handleScriptSaved} />;
            case 3:
                return <FinalEditStep project={project} onProceedToNextStage={() => advanceWorkflow(4)} />;
            case 4:
                if (project.status === 'Rendering' || !project.analysis) {
                    return <div className="min-h-[80vh] flex items-center justify-center"><AnalysisLoader frames={project.moodboard || []} /></div>;
                }
                return <AnalysisResult result={project.analysis} onReset={() => setActiveStep(3)} videoPreviewUrl={project.publishedUrl} onProceedToLaunchpad={() => advanceWorkflow(5)} />;
            case 5:
                return <Launchpad project={project} />;
            default:
                return <div>Something went wrong. Current Step: {activeStep}</div>;
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
            
            <ProjectWorkflowGuide 
                currentStep={activeStep}
                unlockedStep={project.workflowStep}
                onStepSelect={(step) => setActiveStep(step as WorkflowStep)}
                t={t}
            />

            <div className="p-1 sm:p-4 bg-black/10 rounded-lg min-h-[60vh]">
                {renderActiveStep()}
            </div>
        </div>
    );
};

export default ProjectView;