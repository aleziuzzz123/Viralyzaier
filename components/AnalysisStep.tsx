import React, { useState, useEffect } from 'react';
import { Project, Analysis } from '../types.ts';
import { useAppContext } from '../contexts/AppContext.tsx';
import * as geminiService from '../services/geminiService.ts';
import AnalysisLoader from './AnalysisLoader.tsx';
import AnalysisResult from './AnalysisResult.tsx';

interface AnalysisStepProps {
    project: Project;
    onProceedToLaunchpad: () => void;
    onReturnToStudio: () => void;
}

const AnalysisStep: React.FC<AnalysisStepProps> = ({ project, onProceedToLaunchpad, onReturnToStudio }) => {
    const { handleUpdateProject, addToast } = useAppContext();
    const [isLoading, setIsLoading] = useState(!project.analysis);
    const [analysisResult, setAnalysisResult] = useState<Analysis | null>(project.analysis);
    const [analysisAttempted, setAnalysisAttempted] = useState(false);

    useEffect(() => {
        // If the project is rendering, we just wait. The real-time subscription will trigger a re-render when it's done.
        if (project.status === 'Rendering') {
            setIsLoading(true);
            return;
        }

        // Only run analysis if it hasn't been done before and we haven't tried yet.
        if (!project.analysis && !analysisAttempted) {
            const performAnalysis = async () => {
                setIsLoading(true);
                setAnalysisAttempted(true); // Mark that we're trying, to prevent loops
                try {
                    // The `publishedUrl` at this stage is the temporary URL of the assembled preview video.
                    if (!project.publishedUrl) {
                        throw new Error("Cannot analyze video without a rendered preview. Please return to the studio and try assembling again.");
                    }
                    
                    const frames = project.moodboard || [];
                     if (frames.length === 0) {
                        throw new Error("Cannot analyze video without visual references (moodboard is empty). Please return to Stage 1.");
                    }
                    
                    const result = await geminiService.analyzeVideo(frames.slice(0, 3), project.title || project.topic || 'Untitled Video', project.platform);
                    
                    const updateSuccess = await handleUpdateProject({ id: project.id, analysis: result });
                    
                    if (!updateSuccess) {
                        addToast("Could not save analysis results to the server. Results are shown locally.", "error");
                    }

                    setAnalysisResult(result);

                } catch (e) {
                    addToast(e instanceof Error ? e.message : 'Analysis failed.', 'error');
                    onReturnToStudio();
                } finally {
                    setIsLoading(false);
                }
            };
            performAnalysis();
        } else if (project.analysis) {
            // If analysis already exists, just show it.
            setAnalysisResult(project.analysis);
            setIsLoading(false);
        }
    }, [project.id, project.analysis, project.status, project.moodboard, project.title, project.topic, project.platform, project.publishedUrl, handleUpdateProject, addToast, onReturnToStudio, analysisAttempted]);

    if (isLoading || project.status === 'Rendering') {
        return <AnalysisLoader frames={project.moodboard || []} />;
    }

    if (analysisResult) {
        return <AnalysisResult 
                    result={analysisResult} 
                    onReset={onReturnToStudio}
                    videoPreviewUrl={project.publishedUrl} 
                    onProceedToLaunchpad={onProceedToLaunchpad}
                />;
    }
    
    // Fallback case
    return <AnalysisLoader frames={project.moodboard || []} />;
};

export default AnalysisStep;