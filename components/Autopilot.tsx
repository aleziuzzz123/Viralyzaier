import React, { useState, useRef } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { generateAutopilotBacklog } from '../services/geminiService';
import * as supabase from '../services/supabaseService';
import { SparklesIcon, RocketLaunchIcon, PlusIcon, TrashIcon } from './Icons';
import { Project } from '../types';

const Autopilot: React.FC = () => {
    const { user, setUser, consumeCredits, requirePermission, addToast, t, addProjects, setActiveProjectId, lockAndExecute } = useAppContext();
    const [pillars, setPillars] = useState<string[]>(user?.content_pillars || []);
    const [newPillar, setNewPillar] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleAddPillar = () => {
        if (newPillar.trim() && pillars.length < 5 && !pillars.includes(newPillar.trim())) {
            const updatedPillars = [...pillars, newPillar.trim()];
            setPillars(updatedPillars);
            setNewPillar('');
            updatePillarsInDb(updatedPillars);
        }
    };
    
    const handleRemovePillar = (pillarToRemove: string) => {
        const updatedPillars = pillars.filter(p => p !== pillarToRemove);
        setPillars(updatedPillars);
        updatePillarsInDb(updatedPillars);
    };

    const updatePillarsInDb = async (updatedPillars: string[]) => {
        if (!user) return;
        try {
            const updatedUser = await supabase.updateUserProfile(user.id, { content_pillars: updatedPillars });
            setUser(updatedUser);
        } catch (error) {
            addToast("Failed to save content pillars.", "error");
        }
    };

    const handleGenerateBacklog = () => lockAndExecute(async () => {
        if (!user || !user.channelAudit || !requirePermission('viralyzaier')) return;
        if (pillars.length === 0) {
            addToast("Please add at least one content pillar.", "error");
            return;
        }
        
        setIsLoading(true);
        
        try {
            if (!await consumeCredits(25)) {
                // Manually reset loading if credits fail, as finally block won't be reached in the same way.
                setIsLoading(false);
                return;
            }
            
            const newBlueprints = await generateAutopilotBacklog('youtube_long', pillars, user.channelAudit);
            
            const createdProjects: Project[] = [];
            // Process each blueprint sequentially to create a stable project ID before uploading assets.
            for (const bp of newBlueprints) {
                const title = bp.suggestedTitles[0] || 'AI Generated Idea';
                
                // 1. Create a placeholder project to get an ID.
                const initialProjectData: Omit<Project, 'id' | 'lastUpdated'> = {
                    name: title, status: 'Autopilot', platform: bp.platform,
                    topic: bp.strategicSummary, title: title, script: bp.script,
                    moodboard: [], // Moodboard is initially empty
                    workflowStep: 2, analysis: null, competitorAnalysis: null, 
                    scheduledDate: null, assets: {}, soundDesign: null, 
                    launchPlan: null, performance: null, publishedUrl: undefined,
                };
                const newProject = await supabase.createProject(initialProjectData, user.id);

                // 2. Upload moodboard images to a structured path using the new project ID.
                const moodboardUrls = await Promise.all(
                    bp.moodboard.map(async (base64Img, index) => {
                        const blob = await supabase.dataUrlToBlob(base64Img);
                        const path = `${user!.id}/${newProject.id}/moodboard_${index}.jpg`;
                        return supabase.uploadFile(blob, path);
                    })
                );

                // 3. Update the project with the final moodboard URLs.
                const finalProject = await supabase.updateProject(newProject.id, { moodboard: moodboardUrls });
                createdProjects.push(finalProject);
            }
            
            addProjects(createdProjects);
            addToast("Content backlog generated! Your new ideas are on the dashboard.", 'success');
            setActiveProjectId(null);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to generate backlog.';
            addToast(errorMessage, 'error');
        } finally {
            setIsLoading(false);
        }
    });

    if (!user?.channelAudit) {
        return (
            <div className="text-center py-16 px-6 bg-gray-800/50 rounded-2xl">
                <h2 className="text-2xl font-bold text-white mb-3">{t('autopilot.no_audit_title')}</h2>
                <p className="text-gray-400 mb-6 max-w-md mx-auto">{t('autopilot.no_audit_desc')}</p>
            </div>
        );
    }
    
    return (
        <div className="animate-fade-in-up space-y-12">
            <header className="text-center">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">{t('autopilot.title')}</h1>
                <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">{t('autopilot.subtitle')}</p>
            </header>

            <div className="max-w-3xl mx-auto bg-gray-800/50 p-8 rounded-2xl border border-gray-700 space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-2">{t('autopilot.pillars_title')}</h2>
                    <p className="text-gray-400 mb-4">{t('autopilot.pillars_desc')}</p>
                    <div className="flex items-center gap-2 mb-4">
                        <input
                            type="text"
                            value={newPillar}
                            onChange={e => setNewPillar(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && handleAddPillar()}
                            placeholder={t('autopilot.pillar_placeholder')}
                            className="flex-grow bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button onClick={handleAddPillar} className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg"><PlusIcon className="w-6 h-6"/></button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {pillars.map(pillar => (
                            <div key={pillar} className="bg-gray-700 text-white px-3 py-1.5 rounded-full flex items-center gap-2 text-sm font-semibold">
                                <span>{pillar}</span>
                                <button onClick={() => handleRemovePillar(pillar)} className="text-gray-400 hover:text-red-400"><TrashIcon className="w-4 h-4"/></button>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="border-t border-gray-700 pt-6 text-center">
                     <button 
                        onClick={handleGenerateBacklog} 
                        disabled={isLoading || pillars.length === 0}
                        className="w-full max-w-sm inline-flex items-center justify-center px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-full transition-colors disabled:bg-gray-600 disabled:cursor-wait"
                    >
                         <RocketLaunchIcon className="w-5 h-5 mr-2" />
                        {isLoading ? t('autopilot.generating') : t('autopilot.generate_backlog_button')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Autopilot;