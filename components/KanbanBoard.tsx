import React, { useState, useRef, useEffect } from 'react';
import { Project, ProjectStatus, Platform } from '../types';
import { YouTubeIcon, TikTokIcon, InstagramIcon, PlusIcon, PencilIcon, RocketLaunchIcon } from './Icons';
import { useAppContext } from '../contexts/AppContext';

const platformIcons: { [key in Platform]: React.FC<{className?: string}> } = {
    youtube_long: YouTubeIcon,
    youtube_short: YouTubeIcon,
    tiktok: TikTokIcon,
    instagram: InstagramIcon,
};

const statusConfig: { [key in ProjectStatus]: { color: string; bg: string; } } = {
    'Autopilot': { color: 'border-purple-500', bg: 'bg-purple-900/20' },
    'Idea': { color: 'border-sky-500', bg: 'bg-sky-900/20' },
    'Scripting': { color: 'border-amber-500', bg: 'bg-amber-900/20' },
    'Scheduled': { color: 'border-indigo-500', bg: 'bg-indigo-900/20' },
    'Published': { color: 'border-green-500', bg: 'bg-green-900/20' },
};

const ProjectCard: React.FC<{
    project: Project;
    onViewProject: () => void;
}> = ({ project, onViewProject }) => {
    const { user, handleUpdateProject, addToast, t } = useAppContext();
    const [isEditingUrl, setIsEditingUrl] = useState(false);
    const [url, setUrl] = useState(project.publishedUrl || '');
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Robust image URL handling to prevent broken images from race conditions
        if (project.moodboard && project.moodboard.length > 0) {
            setImageUrl(project.moodboard[0]);
        } else if (user?.id && project.id) {
            // Fallback for Autopilot projects where moodboard might not be in state yet
            // This constructs a predictable URL, assuming the first moodboard image is always moodboard_0.jpg
            const predictedUrl = `${(window as any).__env.VITE_SUPABASE_URL}/storage/v1/object/public/assets/${user.id}/${project.id}/moodboard_0.jpg`;
            setImageUrl(predictedUrl);
        } else {
            setImageUrl(null);
        }
    }, [project.moodboard, project.id, user?.id]);

    const handleUrlSave = () => {
        const trimmedUrl = url.trim();
        // Basic URL validation
        if (trimmedUrl && !trimmedUrl.startsWith('http')) {
            addToast('Please enter a valid URL starting with http or https.', 'error');
            return;
        }
        if (trimmedUrl !== (project.publishedUrl || '')) {
             handleUpdateProject({ id: project.id, publishedUrl: trimmedUrl });
             addToast(t('kanban.url_updated'), "success");
        }
        setIsEditingUrl(false);
    };

    useEffect(() => {
        if (isEditingUrl) {
            inputRef.current?.focus();
        }
    }, [isEditingUrl]);

    const handleStartEditing = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditingUrl(true);
    };

    const PlatformIcon = platformIcons[project.platform];

    return (
        <div
            draggable
            onDragStart={(e) => e.dataTransfer.setData('projectId', project.id)}
            className="bg-gray-800 rounded-lg border border-gray-700 hover:border-indigo-500 cursor-pointer transition-all duration-200 shadow-md hover:shadow-indigo-500/10 mb-4 overflow-hidden"
        >
            {imageUrl && (
                <div className="aspect-video w-full bg-gray-900" onClick={onViewProject}>
                    <img src={imageUrl} alt={`${project.name} moodboard`} className="w-full h-full object-cover" />
                </div>
            )}
            <div className="p-4">
                <div onClick={onViewProject}>
                    <div className="flex items-start justify-between">
                        <h4 className="font-bold text-gray-200 truncate pr-2 flex-1">{project.name}</h4>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {project.platform === 'youtube_short' && <span className="text-xs font-bold text-white bg-red-600 px-2 py-0.5 rounded-md">Short</span>}
                            <PlatformIcon className="w-5 h-5 text-gray-500" />
                        </div>
                    </div>
                    <p className="text-sm text-gray-400 truncate mt-1">{project.topic || t('kanban.no_topic')}</p>
                     {project.status === 'Autopilot' && (
                        <div className="mt-2 text-xs font-bold text-purple-400 flex items-center gap-1.5">
                            <RocketLaunchIcon className="w-4 h-4" />
                            AI Generated Idea
                        </div>
                    )}
                     {project.status === 'Scheduled' && project.scheduledDate && (
                        <div className="mt-2 text-xs font-semibold text-indigo-300">
                            {new Date(project.scheduledDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                        </div>
                    )}
                </div>
                {project.status === 'Published' && (
                    <div className="mt-3 pt-3 border-t border-gray-700" onClick={e => e.stopPropagation()}>
                        {isEditingUrl ? (
                            <div className="flex items-center gap-2">
                                <input
                                    ref={inputRef}
                                    type="url"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    onBlur={handleUrlSave}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleUrlSave();
                                        }
                                        if (e.key === 'Escape') {
                                            setUrl(project.publishedUrl || '');
                                            setIsEditingUrl(false);
                                        }
                                    }}
                                    placeholder={t('kanban.url_placeholder')}
                                    className="w-full text-xs bg-gray-900 border border-gray-600 rounded-md px-2 py-1 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                        ) : project.publishedUrl ? (
                            <div className="flex items-center justify-between gap-2">
                                <a 
                                   href={project.publishedUrl} 
                                   target="_blank" 
                                   rel="noopener noreferrer" 
                                   className="text-xs text-indigo-400 hover:underline truncate block flex-grow" 
                                   onClick={e => e.stopPropagation()}
                                   title={project.publishedUrl}
                                >
                                    {project.publishedUrl}
                                </a>
                                <button onClick={handleStartEditing} aria-label={t('kanban.edit_url')} className="p-1 text-gray-400 hover:text-white flex-shrink-0" title={t('kanban.edit_url')}>
                                    <PencilIcon className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <button onClick={handleStartEditing} className="w-full flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-white p-1 rounded-md bg-gray-700/50 hover:bg-gray-700">
                               <PlusIcon className="w-4 h-4"/> {t('kanban.add_url')}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

interface KanbanBoardProps {
    projects: Project[];
    onViewProject: (id: string) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ projects, onViewProject }) => {
    const { addToast, handleUpdateProject, t, openScheduleModal } = useAppContext();
    const statuses: ProjectStatus[] = ['Autopilot', 'Idea', 'Scripting', 'Scheduled', 'Published'];

    const getStatusName = (status: ProjectStatus) => {
        switch(status) {
            case 'Autopilot': return t('kanban.status_autopilot');
            case 'Idea': return t('kanban.status_idea');
            case 'Scripting': return t('kanban.status_scripting');
            case 'Scheduled': return t('kanban.status_scheduled');
            case 'Published': return t('kanban.status_published');
        }
    }

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, newStatus: ProjectStatus) => {
        e.preventDefault();
        const projectId = e.dataTransfer.getData('projectId');
        const project = projects.find(p => p.id === projectId);
        if (project && project.status !== newStatus) {
            if (newStatus === 'Scheduled') {
                openScheduleModal(projectId); // Open modal instead of directly updating
            } else {
                handleUpdateProject({ id: project.id, status: newStatus, scheduledDate: null }); // Clear schedule date if moved out
                addToast(t('kanban.project_moved', {status: getStatusName(newStatus)}), 'success');
            }
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {statuses.map(status => (
                <div 
                    key={status}
                    className={`p-4 rounded-lg h-full min-h-[300px] ${statusConfig[status].bg}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, status)}
                >
                    <h3 className={`font-bold mb-4 pb-2 border-b-2 ${statusConfig[status].color}`}>
                        {getStatusName(status)} ({projects.filter(p => p.status === status).length})
                    </h3>
                    <div className="space-y-4">
                        {projects
                            .filter(p => p.status === status)
                            .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
                            .map(p => (
                                <ProjectCard 
                                    key={p.id} 
                                    project={p} 
                                    onViewProject={() => onViewProject(p.id)}
                                />
                            ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default KanbanBoard;