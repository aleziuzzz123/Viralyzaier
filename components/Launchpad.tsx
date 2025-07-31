
import React, { useState } from 'react';
import { Project } from '../types';
import { generateSeo, analyzeAndGenerateThumbnails, generatePromotionPlan } from '../services/geminiService';
import { SparklesIcon, ClipboardCopyIcon, DownloadIcon } from './Icons';
import { useAppContext } from '../contexts/AppContext';

interface LaunchpadProps {
    project: Project;
}

const Launchpad: React.FC<LaunchpadProps> = ({ project }) => {
    const { apiKeyError, user, consumeCredits, addToast, handleUpdateProject, t } = useAppContext();
    const [loading, setLoading] = useState<{ seo?: boolean, thumbnails?: boolean, promotion?: boolean }>({});
    const [error, setError] = useState<string | null>(null);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        addToast(t('toast.copied'), 'success');
    };

    const handleGenerateSeo = async () => {
        if (!project.script || !project.title) return;
        if (apiKeyError) { setError(t('blueprint_modal.error_api_key')); return; }
        if (!await consumeCredits(1)) return;
        setLoading({ seo: true });
        try {
            const seo = await generateSeo(project.title, project.script, project.platform);
            const updatedLaunchPlan = { ...(project.launchPlan || {}), seo };
            await handleUpdateProject({ id: project.id, launchPlan: updatedLaunchPlan });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to generate SEO.');
        } finally {
            setLoading({});
        }
    };
    
    const handleGenerateThumbnails = async () => {
        if (!project.title || !user) return;
        if (apiKeyError) { setError(t('blueprint_modal.error_api_key')); return; }
        if (!await consumeCredits(3)) return;
        setLoading({ thumbnails: true });
        try {
            const thumbnails = await analyzeAndGenerateThumbnails(project.title, project.platform, user.id, project.id);
            const updatedLaunchPlan = { ...(project.launchPlan || {}), thumbnails };
            await handleUpdateProject({ id: project.id, launchPlan: updatedLaunchPlan });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to generate thumbnails.');
        } finally {
            setLoading({});
        }
    };

    const handleGeneratePromotion = async () => {
        if (!project.title) return;
        if (apiKeyError) { setError(t('blueprint_modal.error_api_key')); return; }
        if (!await consumeCredits(1)) return;
        setLoading({ promotion: true });
        try {
            const promotionPlan = await generatePromotionPlan(project.title, project.platform);
            const updatedLaunchPlan = { ...(project.launchPlan || {}), promotionPlan };
            await handleUpdateProject({ id: project.id, launchPlan: updatedLaunchPlan });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to generate promotion plan.');
        } finally {
            setLoading({});
        }
    };

    return (
        <div className="space-y-8 animate-fade-in-up">
            <header className="text-center">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">{t('launchpad.title')}</h1>
                <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">{t('launchpad.subtitle')}</p>
            </header>

            {error && <p className="text-red-400 text-center">{error}</p>}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* SEO */}
                <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 space-y-4">
                    <h3 className="text-2xl font-bold text-white">{t('launchpad.seo_title')}</h3>
                    {project.launchPlan?.seo ? (
                        <div className="space-y-4 animate-fade-in-up">
                            <div>
                                <h4 className="font-semibold text-gray-300 mb-2">{t('launchpad.description_title')}</h4>
                                <div className="bg-gray-900/50 p-3 rounded-lg text-sm text-gray-400 relative">
                                    <p>{project.launchPlan.seo.description}</p>
                                    <button onClick={() => copyToClipboard(project.launchPlan!.seo!.description)} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-white"><ClipboardCopyIcon className="w-4 h-4" /></button>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-300 mb-2">{t('launchpad.tags_title')}</h4>
                                <div className="flex flex-wrap gap-2">
                                    {project.launchPlan.seo.tags.map(tag => <span key={tag} className="px-2 py-1 bg-gray-700 text-xs rounded-full">{tag}</span>)}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <button onClick={handleGenerateSeo} disabled={loading.seo} className="w-full inline-flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-colors disabled:bg-gray-600">
                            <SparklesIcon className="w-5 h-5 mr-2" />
                            {loading.seo ? t('launchpad.seo_generating') : t('launchpad.seo_button')}
                        </button>
                    )}
                </div>

                {/* Thumbnails */}
                <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 space-y-4">
                     <h3 className="text-2xl font-bold text-white">{t('launchpad.thumbnail_title')}</h3>
                     {project.launchPlan?.thumbnails ? (
                         <div className="grid grid-cols-1 gap-4 animate-fade-in-up">
                            {project.launchPlan.thumbnails.map((thumb, i) => (
                                <div key={i} className="relative group aspect-video">
                                    <img src={thumb} alt={`Thumbnail ${i+1}`} className="w-full h-full rounded-lg object-cover" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <a href={thumb} download={`thumbnail_${i+1}.jpg`} className="p-2 bg-white/20 backdrop-blur-sm text-white rounded-full hover:bg-white/30"><DownloadIcon className="w-5 h-5" /></a>
                                    </div>
                                </div>
                            ))}
                         </div>
                     ) : (
                         <button onClick={handleGenerateThumbnails} disabled={loading.thumbnails} className="w-full inline-flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-colors disabled:bg-gray-600">
                             <SparklesIcon className="w-5 h-5 mr-2" />
                            {loading.thumbnails ? t('launchpad.thumbnail_designing') : t('launchpad.thumbnail_button')}
                         </button>
                     )}
                </div>
                
                {/* Promotion Plan */}
                <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 space-y-4">
                     <h3 className="text-2xl font-bold text-white">{t('launchpad.promotion_title')}</h3>
                     {project.launchPlan?.promotionPlan ? (
                         <ul className="space-y-3 animate-fade-in-up">
                            {project.launchPlan.promotionPlan.map((item, i) => (
                                <li key={i} className="bg-gray-900/50 p-3 rounded-lg">
                                    <p className="font-bold text-indigo-400">{item.platform}</p>
                                    <p className="text-sm text-gray-300">{item.action}</p>
                                </li>
                            ))}
                         </ul>
                     ) : (
                         <button onClick={handleGeneratePromotion} disabled={loading.promotion} className="w-full inline-flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-colors disabled:bg-gray-600">
                             <SparklesIcon className="w-5 h-5 mr-2" />
                            {loading.promotion ? t('launchpad.promotion_strategizing') : t('launchpad.promotion_button')}
                         </button>
                     )}
                </div>
            </div>
        </div>
    );
};

export default Launchpad;
