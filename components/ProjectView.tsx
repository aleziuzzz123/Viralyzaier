import React from 'react';
import { Project, Blueprint, Script as ScriptType, WorkflowStep } from '../types.ts';
import { useAppContext } from '../contexts/AppContext.tsx';
import BlueprintStep from './BlueprintStep.tsx';
import ScriptGenerator from './ScriptGenerator.tsx';
import FinalEditStep from './FinalEditStep.tsx';
import Launchpad from './Launchpad.tsx';
import TutorialCallout from './TutorialCallout.tsx';
import { TranslationKey } from '../translations.ts';

interface ProjectViewProps {
    project: Project;
}

export const ProjectView: React.FC<ProjectViewProps> = ({ project }) => {
    const { handleUpdateProject, t, dismissedTutorials, addToast } = useAppContext();

    const handleBlueprintAccepted = (blueprint: Blueprint, selectedTitle: string) => {
        handleUpdateProject({
            id: project.id,
            script: blueprint.script,
            title: selectedTitle,
            moodboard: blueprint.moodboard,
            workflowStep: 2,
        });
        addToast(t('toast.brief_complete'));
    };

    const handleScriptSaved = (script: ScriptType) => {
        handleUpdateProject({
            id: project.id,
            script: script,
            workflowStep: 3,
        });
    };

    const handleProceedToLaunchpad = () => {
        handleUpdateProject({
            id: project.id,
            workflowStep: 4,
        });
    };
    
    const renderContent = () => {
        switch (project.workflowStep) {
            case 1:
                return <BlueprintStep project={project} onBlueprintAccepted={handleBlueprintAccepted} />;
            case 2:
                return <ScriptGenerator project={project} onScriptSaved={handleScriptSaved} />;
            case 3:
                return <FinalEditStep project={project} onProceedToNextStage={handleProceedToLaunchpad} />;
            case 4:
            case 5:
                return <Launchpad project={project} />;
            default:
                return <div className="text-center text-gray-500">Invalid project state. Please contact support.</div>;
        }
    };
    
    const steps: { nameKey: TranslationKey, step: WorkflowStep }[] = [
        { nameKey: 'project_view.stepper_blueprint', step: 1 },
        { nameKey: 'project_view.stepper_script_editor', step: 2 },
        { nameKey: 'project_view.stepper_creative_studio', step: 3 },
        { nameKey: 'project_view.stepper_launch', step: 4 },
    ];

    return (
        <div className="space-y-8">
            <nav className="p-4 bg-gray-800/50 rounded-xl">
                <ol className="flex items-center justify-center space-x-2 sm:space-x-4">
                    {steps.map((step, index) => (
                        <li key={step.step} className="flex items-center">
                            <div className="flex items-center">
                                <span className={`flex items-center justify-center w-8 h-8 rounded-full font-bold transition-colors ${project.workflowStep >= step.step ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
                                    {project.workflowStep > step.step ? '✓' : step.step}
                                </span>
                                <span className={`hidden sm:inline ml-3 font-medium transition-colors ${project.workflowStep >= step.step ? 'text-white' : 'text-gray-500'}`}>
                                    {t(step.nameKey)}
                                </span>
                            </div>
                            {index < steps.length - 1 && (
                                <div className={`hidden sm:block w-8 sm:w-16 h-0.5 transition-colors ${project.workflowStep > step.step ? 'bg-indigo-600' : 'bg-gray-700'} mx-2 sm:mx-4`}></div>
                            )}
                        </li>
                    ))}
                </ol>
            </nav>
            
            {project.workflowStep === 1 && !dismissedTutorials.includes('project_view_new') && (
                 <TutorialCallout id="project_view_new">
                    {t('project_view.tutorial_callout_new')}
                </TutorialCallout>
            )}

            <div className="mt-8">
                {renderContent()}
            </div>
        </div>
    );
};
