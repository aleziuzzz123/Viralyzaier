import React, { useEffect } from 'react';
import { Project } from '../types';
import { FilePlusIcon } from './Icons';
import KanbanBoard from './KanbanBoard';
import { PLANS } from '../services/paymentService';
import { useAppContext } from '../contexts/AppContext';
import Loader from './Loader';

interface DashboardProps {
    onSelectProject: (id: string) => void;
    onNewProject: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onSelectProject, onNewProject }) => {
    const { user, projects, t, isInitialLoading } = useAppContext();
    
    useEffect(() => {
        const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
        if (user && projects.length === 0 && !isInitialLoading && !hasSeenOnboarding) {
          onNewProject();
          localStorage.setItem('hasSeenOnboarding', 'true');
        }
    }, [user, projects, isInitialLoading, onNewProject]);

    const planId = user?.subscription?.planId || 'free';
    const currentPlan = PLANS.find(p => p.id === planId) || PLANS.find(p => p.id === 'free')!;
    const creditsUsed = currentPlan.creditLimit - (user?.aiCredits || 0);

    if (isInitialLoading) {
        return <div className="flex justify-center items-center h-64"><Loader /></div>;
    }

    return (
        <div className="animate-fade-in-up space-y-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                    <h1 className="text-4xl lg:text-5xl font-black text-white">
                        {t('dashboard.title')}
                    </h1>
                     {user?.email && <p className="mt-2 text-lg text-gray-400">{t('dashboard.welcome_back', {userName: user.email.split('@')[0]})}</p>}
                </div>
                <div className="flex items-center gap-4 mt-4 md:mt-0">
                     <button
                        onClick={() => onNewProject()}
                        className="inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg"
                    >
                        <FilePlusIcon className="w-6 h-6 mr-2" />
                        {t('dashboard.new_blueprint')}
                    </button>
                </div>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-800/50 p-4 rounded-lg text-center">
                    <p className="text-sm font-semibold text-gray-400">{t('dashboard.total_projects')}</p>
                    <p className="text-4xl font-black text-white mt-1">{projects.length}</p>
                </div>
                <div className="bg-gray-800/50 p-4 rounded-lg text-center">
                    <p className="text-sm font-semibold text-gray-400">{t('dashboard.published_videos')}</p>
                    <p className="text-4xl font-black text-white mt-1">{projects.filter((p: Project) => p.status === 'Published').length}</p>
                </div>
                <div className="bg-gray-800/50 p-4 rounded-lg text-center">
                    <p className="text-sm font-semibold text-gray-400">{t('dashboard.credits_used')}</p>
                    <p className="text-4xl font-black text-white mt-1">{creditsUsed}</p>
                </div>
            </div>

            <div>
                 <h2 className="text-2xl font-bold text-white mb-4">{t('dashboard.workflow_title')}</h2>
                 {projects.length > 0 ? (
                    <KanbanBoard projects={projects} onViewProject={onSelectProject} />
                 ) : (
                    <div className="text-center py-16 px-6 bg-gray-800/50 rounded-2xl">
                        <h2 className="text-2xl font-bold text-white mb-3">{t('dashboard.empty_title')}</h2>
                        <p className="text-gray-400 mb-6">{t('dashboard.empty_subtitle')}</p>
                    </div>
                 )}
            </div>
        </div>
    );
};

export default Dashboard;