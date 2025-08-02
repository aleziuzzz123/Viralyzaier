

import React, { useState, useEffect, useMemo } from 'react';
import { Project, Script, Platform, ScriptOptimization, PlanId } from '../types';
import { generateOptimizedScript } from '../services/geminiService';
import { SparklesIcon, LightBulbIcon, CtaIcon, PencilIcon, MagicWandIcon } from './Icons';
import { useAppContext } from '../contexts/AppContext';
import { PLANS } from '../services/paymentService';
import ViralityGauge from './ViralityGauge';


const ScriptGenerator: React.FC<{
    project: Project;
    onScriptGenerated: (script: Script) => void;
    onProceed: () => void;
    platform: Platform;
}> = ({ project, onScriptGenerated, onProceed, platform }) => {
    const { user, consumeCredits, addToast, t } = useAppContext();

    type Tab = 'generate' | 'optimize';
    const [activeTab, setActiveTab] = useState<Tab>('generate');
    
    // Inputs
    const [topic, setTopic] = useState(project.topic || '');
    const [pastedScript, setPastedScript] = useState('');
    
    const planLimits: Record<PlanId, number> = { 'free': 60, 'pro': 600, 'viralyzaier': 3600 };
    const userPlanLimit = user ? planLimits[user.subscription.planId] : 60;
    const [scriptLength, setScriptLength] = useState(Math.min(60, userPlanLimit));

    // Processing State
    type ProcessingStatus = 'idle' | 'processing' | 'done';
    const [status, setStatus] = useState<ProcessingStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [optimizationResult, setOptimizationResult] = useState<ScriptOptimization | null>(null);

    // Animation state
    const [currentScore, setCurrentScore] = useState(0);
    const [log, setLog] = useState<string[]>([]);
    const [highlightedTarget, setHighlightedTarget] = useState<string | null>(null);

    // Dynamic Credit Calculation
    const calculateCredits = (lengthInSeconds: number): number => {
        const baseCost = 5;
        if (lengthInSeconds <= 60) return baseCost;
        // 1 extra credit for each additional minute (or part thereof)
        const additionalMinutes = Math.ceil((lengthInSeconds - 60) / 60);
        return baseCost + additionalMinutes;
    };

    const estimateScriptLength = (text: string) => {
        const words = text.trim().split(/\s+/).length;
        const wpm = 150; // average speaking rate
        return Math.round((words / wpm) * 60);
    };

    const creditsNeeded = useMemo(() => {
        if (activeTab === 'generate') {
            return calculateCredits(scriptLength);
        } else {
            if (!pastedScript.trim()) return 5; // Default if empty
            const estimatedLength = estimateScriptLength(pastedScript);
            return calculateCredits(estimatedLength);
        }
    }, [activeTab, scriptLength, pastedScript]);


    useEffect(() => {
        if (status === 'processing' && optimizationResult) {
            const { initialScore, finalScore, analysisLog } = optimizationResult;
            let score = initialScore;
            setCurrentScore(score);
            setLog([]);
            
            const totalDuration = 4000; // 4 seconds for the whole animation
            const stepDuration = totalDuration / analysisLog.length;

            analysisLog.forEach((item, index) => {
                setTimeout(() => {
                    setLog(prev => [...prev, item.step]);
                    setHighlightedTarget(item.target);
                }, index * stepDuration);
            });
            
            const scoreInterval = setInterval(() => {
                score += (finalScore - initialScore) / (totalDuration / 50);
                if (score >= finalScore) {
                    setCurrentScore(finalScore);
                    clearInterval(scoreInterval);
                } else {
                    setCurrentScore(score);
                }
            }, 50);

            setTimeout(() => {
                setHighlightedTarget(null);
                setCurrentScore(finalScore); // Ensure it lands on the final score
            }, totalDuration);
        }
    }, [status, optimizationResult]);

    const formatTime = (seconds: number) => {
        if (seconds < 60) return t('script_optimizer.length_unit_seconds', { s: seconds });
        return t('script_optimizer.length_unit_minutes', { m: Math.round(seconds / 60) });
    };

    const handleStartOptimization = async () => {
        let hasError = false;
        if (activeTab === 'generate' && !topic.trim()) {
            setError(t('script_optimizer.error_topic_missing'));
            hasError = true;
        }
        if (activeTab === 'optimize' && !pastedScript.trim()) {
            setError(t('script_optimizer.error_script_missing'));
            hasError = true;
        }
        if (hasError) return;

        if (!await consumeCredits(creditsNeeded)) return;

        setStatus('processing');
        setError(null);

        try {
            const result = await generateOptimizedScript(
                platform,
                scriptLength,
                activeTab === 'generate' ? { topic } : { userScript: pastedScript }
            );
            setOptimizationResult(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : t('script_optimizer.error_generation'));
            setStatus('idle');
        }
    };

    const handleAcceptScript = () => {
        if (optimizationResult?.finalScript) {
            onScriptGenerated(optimizationResult.finalScript);
        }
    };

    const renderIdleState = () => (
        <div className="max-w-4xl mx-auto space-y-8">
            <header className="text-center">
                <h1 className="text-4xl font-bold text-white">{t('script_optimizer.title')}</h1>
                <p className="mt-2 text-lg text-gray-400">{t('script_optimizer.subtitle')}</p>
            </header>
            
            <div className="bg-gray-800/50 p-2 rounded-xl border border-gray-700 max-w-sm mx-auto flex items-center">
                <button onClick={() => setActiveTab('generate')} className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'generate' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>{t('script_optimizer.generate_tab')}</button>
                <button onClick={() => setActiveTab('optimize')} className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'optimize' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>{t('script_optimizer.optimize_tab')}</button>
            </div>
            
            <div className="bg-gray-900/40 p-8 rounded-2xl">
                {activeTab === 'generate' && (
                    <div className="space-y-6 animate-fade-in">
                        <div>
                            <label htmlFor="topic" className="block text-lg font-semibold text-white mb-2">{t('script_optimizer.topic_label')}</label>
                            <input id="topic" type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder={t('script_optimizer.topic_placeholder')} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div>
                            <label htmlFor="length" className="block text-lg font-semibold text-white mb-2">{t('script_optimizer.length_label')}: <span className="font-bold text-indigo-400">{formatTime(scriptLength)}</span></label>
                            <input id="length" type="range" min="10" max={userPlanLimit} step="10" value={scriptLength} onChange={e => setScriptLength(Number(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                            {userPlanLimit < 3600 && <p className="text-xs text-gray-500 mt-2">{t('script_optimizer.plan_limit_reached', { limit: formatTime(userPlanLimit) })}</p>}
                        </div>
                        <button onClick={handleStartOptimization} className="w-full inline-flex items-center justify-center px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg">
                            <SparklesIcon className="w-6 h-6 mr-3" />
                            {t('script_optimizer.generate_button', { credits: creditsNeeded })}
                        </button>
                    </div>
                )}
                 {activeTab === 'optimize' && (
                    <div className="space-y-6 animate-fade-in">
                         <div>
                            <label htmlFor="pastedScript" className="block text-lg font-semibold text-white mb-2">{t('script_optimizer.paste_label')}</label>
                            <textarea id="pastedScript" value={pastedScript} onChange={e => setPastedScript(e.target.value)} rows={10} placeholder={t('script_optimizer.paste_placeholder')} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
                        </div>
                        <button onClick={handleStartOptimization} className="w-full inline-flex items-center justify-center px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg">
                            <MagicWandIcon className="w-6 h-6 mr-3" />
                            {t('script_optimizer.optimize_button', { credits: creditsNeeded })}
                        </button>
                    </div>
                )}
            </div>
            {error && <p className="text-red-400 text-center mt-4">{error}</p>}
        </div>
    );

    const renderProcessingState = () => (
        <div className="animate-fade-in-up space-y-8">
            <header className="text-center">
                <h1 className="text-3xl font-bold text-white">{t('script_optimizer.processing_title')}</h1>
                <p className="mt-2 text-lg text-gray-400">{t('script_optimizer.processing_subtitle')}</p>
            </header>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-1 bg-gray-800/50 p-6 rounded-2xl border border-gray-700 space-y-6">
                    <div className="flex flex-col items-center">
                        <h3 className="text-xl font-bold text-white mb-4">{t('script_optimizer.virality_score')}</h3>
                        <ViralityGauge score={currentScore} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white mb-4">{t('script_optimizer.analysis_log')}</h3>
                        <ul className="space-y-3">
                            {log.map((item, i) => (
                                <li key={i} className="flex items-center text-sm text-gray-300 animate-fade-in-up" style={{animationDelay: `${i*100}ms`}}>
                                    <SparklesIcon className="w-4 h-4 mr-3 text-indigo-400 flex-shrink-0" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
                <div className="lg:col-span-2 bg-gray-900/50 p-6 rounded-2xl border border-gray-700 min-h-[50vh]">
                    <div className="space-y-4">
                        <div className={`p-4 rounded-lg transition-all duration-300 ${highlightedTarget === 'hooks' ? 'bg-indigo-900/50 ring-2 ring-indigo-500' : 'bg-gray-800'}`}>
                            <h4 className="font-bold text-white mb-2">{t('script_generator.hooks_title')}</h4>
                            <p className="text-sm text-gray-400">{optimizationResult?.finalScript.hooks[0] || '...'}</p>
                        </div>
                        <div className={`p-4 rounded-lg transition-all duration-300 ${highlightedTarget?.startsWith('scene') ? 'bg-indigo-900/50 ring-2 ring-indigo-500' : 'bg-gray-800'}`}>
                            <h4 className="font-bold text-white mb-2">{t('script_generator.script_title')}</h4>
                            <p className="text-sm text-gray-400">{optimizationResult?.finalScript.scenes[0].visual || '...'}</p>
                        </div>
                        <div className={`p-4 rounded-lg transition-all duration-300 ${highlightedTarget === 'cta' ? 'bg-indigo-900/50 ring-2 ring-indigo-500' : 'bg-gray-800'}`}>
                            <h4 className="font-bold text-white mb-2">{t('script_generator.cta_title')}</h4>
                            <p className="text-sm text-gray-400">{optimizationResult?.finalScript.cta || '...'}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
    
    const renderDoneState = () => (
        <div className="animate-fade-in-up space-y-8">
            <header className="text-center">
                <h1 className="text-3xl font-bold text-white">{t('script_optimizer.final_script_title')}</h1>
                <p className="mt-2 text-lg text-gray-400">Your script is now optimized and ready to go!</p>
            </header>

            <div className="flex flex-col items-center bg-gray-800/50 p-6 rounded-2xl border border-gray-700 max-w-sm mx-auto">
                <h3 className="text-xl font-bold text-white mb-4">{t('script_optimizer.virality_score_final')}</h3>
                {optimizationResult && <ViralityGauge score={optimizationResult.finalScore} size="sm" />}
            </div>
            
            {optimizationResult?.finalScript && (
                 <div className="space-y-8">
                    <div>
                        <h3 className="flex items-center text-xl font-bold text-white mb-4"><LightBulbIcon className="w-6 h-6 mr-3 text-yellow-300"/>{t('script_generator.hooks_title')}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {optimizationResult.finalScript.hooks.map((hook, i) => (
                                <div key={i} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 text-gray-300">
                                    "{hook}"
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-xl font-bold text-white mb-4">{t('script_generator.script_title')}</h3>
                        <div className="overflow-x-auto bg-gray-800/50 p-1 rounded-lg border border-gray-700">
                            <table className="w-full text-left">
                                <thead className="bg-gray-900/50 text-xs text-gray-300 uppercase">
                                    <tr>
                                        <th className="p-3">{t('script_generator.table_time')}</th>
                                        <th className="p-3">{t('script_generator.table_visual')}</th>
                                        <th className="p-3">{t('script_generator.table_voiceover')}</th>
                                        <th className="p-3">{t('script_generator.table_on_screen_text')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {optimizationResult.finalScript.scenes.map((scene, i) => (
                                        <tr key={i} className="border-t border-gray-700">
                                            <td className="p-3 font-mono text-sm text-indigo-400">{scene.timecode}</td>
                                            <td className="p-3 text-sm text-gray-300">{scene.visual}</td>
                                            <td className="p-3 text-sm text-gray-300">{scene.voiceover}</td>
                                            <td className="p-3 font-bold text-sm text-amber-300">{scene.onScreenText}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div>
                        <h3 className="text-xl font-bold text-white mb-4">{t('script_generator.cta_title')}</h3>
                        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 text-gray-200 font-semibold italic">
                            "{optimizationResult.finalScript.cta}"
                        </div>
                    </div>

                     <div className="mt-8 text-center">
                        <button onClick={handleAcceptScript} className="inline-flex items-center justify-center px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg">
                            {t('script_generator.proceed_button')}
                            <CtaIcon className="w-5 h-5 ml-3" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
    
    if (status === 'idle') return renderIdleState();
    if (status === 'processing') {
        // Show processing screen, but if results are ready, start transitioning to done
        if (optimizationResult && log.length === optimizationResult.analysisLog.length) {
            setTimeout(() => setStatus('done'), 1000);
        }
        return renderProcessingState();
    }
    if (status === 'done') return renderDoneState();

    return null; // Should not happen
};

export default ScriptGenerator;