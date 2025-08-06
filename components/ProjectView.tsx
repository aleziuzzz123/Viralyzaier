import React, { useState, useEffect } from 'react';
import { Project, Script as ScriptType, WorkflowStep, Platform, Blueprint } from '../types';
import { TitleIcon, ScriptIcon, SparklesIcon, TrashIcon, PhotoIcon, CtaIcon, LockClosedIcon, CheckIcon, YouTubeIcon, TikTokIcon, InstagramIcon, MusicNoteIcon, RocketLaunchIcon, CheckBadgeIcon, LightBulbIcon, MagicWandIcon } from './Icons';
import ScriptGenerator from './ScriptGenerator';
import Launchpad from './Launchpad';
import TutorialCallout from './TutorialCallout';
import { useAppContext } from '../contexts/AppContext';
import BlueprintStep from './BlueprintStep';
import FinalEditStep from './FinalEditStep';
import * as supabaseService from '../services/supabaseService';
import { getErrorMessage } from '../utils';

interface ProjectViewProps {
    project: Project;
}

const platformIcons: { [key in Platform]: React.FC<{className?: string}> } = {
    youtube_long: YouTubeIcon,
    youtube_short: YouTubeIcon,
    tiktok: TikTokIcon,
    instagram: InstagramIcon,
};

interface ProjectStepperProps {
    steps: { name: string; icon: React.ElementType }[];
    currentStep: number;
    unlockedStep: number;
    onStepSelect: (step: number) => void;
    t: (key: string) => string;
}

const ProjectStepper: React.FC<ProjectStepperProps> = ({ steps, currentStep, unlockedStep, onStepSelect, t }) => {
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
    { name: 'project_view.stepper_blueprint', icon: LightBulbIcon },
    { name: 'project_view.stepper_script_editor', icon: ScriptIcon },
    { name: 'project_view.stepper_creative_studio', icon: PhotoIcon },
    { name: 'project_view.stepper_launch', icon: RocketLaunchIcon },
];

const ProjectView: React.FC<ProjectViewProps> = ({ project }) => {
    const { 
        handleUpdateProject, handleDeleteProject, 
        dismissedTutorials, addToast, t, user
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
                competitorAnalysis: { // Placeholder since it's part of the same step now
                    ...project.competitorAnalysis,
                    videoTitle: project.topic,
                }
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
                return <FinalEditStep project={project} onProceed={() => advanceWorkflow(4)} />;
            case 4:
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
                        {t('project_view.tutorial_callout_new')}
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