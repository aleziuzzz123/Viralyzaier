import React from 'react';
import { Project, WorkflowStep } from '../types.ts';
import { useAppContext } from '../contexts/AppContext.tsx';
import ScriptGenerator from './ScriptGenerator.tsx';
import FinalEditStep from './FinalEditStep.tsx';
import Launchpad from './Launchpad.tsx';
import TutorialCallout from './TutorialCallout.tsx';
import { TranslationKey } from '../translations.ts';
import AnalysisStep from './AnalysisStep.tsx';

interface ProjectViewProps {
    project: Project;
}

export const ProjectView: React.FC<ProjectViewProps> = ({ project }) => {
    const { handleUpdateProject, t, dismissedTutorials } = useAppContext();

    const handleScriptSaved = (script: Project['script']) => {
        if (!script) return;
        handleUpdateProject({
            id: project.id,
            script: script,
            workflowStep: 3,
        });
    };

    const handleProceedToAnalysis = () => {
        handleUpdateProject({
            id: project.id,
            workflowStep: 4,
        });
    };
    
    const handleProceedToLaunchpad = () => {
        handleUpdateProject({
            id: project.id,
            workflowStep: 5,
        });
    };

    const handleReturnToStudio = () => {
        handleUpdateProject({
            id: project.id,
            workflowStep: 3
        });
    };
    
    const renderContent = () => {
        // Since blueprint creation is now a separate view, the project view starts at step 2.
        // If a project somehow ends up at step 1, we show a message.
        switch (project.workflowStep) {
            case 2:
                return <ScriptGenerator project={project} onScriptSaved={handleScriptSaved} />;
            case 3:
                return <FinalEditStep project={project} />;
            case 4:
                return <AnalysisStep project={project} onProceedToLaunchpad={handleProceedToLaunchpad} onReturnToStudio={handleReturnToStudio} />;
            case 5:
                return <Launchpad project={project} />;
            default:
                return <div className="text-center text-gray-500">This project's blueprint has not been generated. Please start a new project.</div>;
        }
    };
    
    const steps: { nameKey: TranslationKey, step: WorkflowStep }[] = [
        { nameKey: 'project_view.stepper_blueprint', step: 1 },
        { nameKey: 'project_view.stepper_script_editor', step: 2 },
        { nameKey: 'project_view.stepper_creative_studio', step: 3 },
        { nameKey: 'project_view.stepper_analysis', step: 4 },
        { nameKey: 'project_view.stepper_launchpad', step: 5 },
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
            
            {project.workflowStep === 2 && !dismissedTutorials.includes('project_view_new') && (
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