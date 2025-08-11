import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext.tsx';
import ViralityGauge from './ViralityGauge.tsx';
import { SparklesIcon } from './Icons.tsx';
import Loader from './Loader.tsx';

interface AnalysisLoaderProps {
    frames: string[];
}

const AnalysisLoader: React.FC<AnalysisLoaderProps> = ({ frames }) => {
    const { t } = useAppContext();
    const [currentScore, setCurrentScore] = useState(0);
    const [log, setLog] = useState<string[]>([]);
    const [highlightedFrame, setHighlightedFrame] = useState(0);

    const analysisSteps = [
        t('analysis_loader.analyzing_hook'),
        t('analysis_loader.evaluating_pacing'),
        t('analysis_loader.checking_cta'),
        t('analysis_loader.compiling_report'),
        t('analysis_loader.finalizing_score'),
    ];

    useEffect(() => {
        if (frames.length > 0) {
            const interval = setInterval(() => {
                setLog(prev => {
                    if (prev.length >= analysisSteps.length) return [analysisSteps[0]];
                    return [...prev, analysisSteps[prev.length]];
                });
                setCurrentScore(prev => (prev + 7) % 93); // loop score
                setHighlightedFrame(prev => (prev + 1) % (frames.length || 1));
            }, 1500);

            return () => clearInterval(interval);
        }
    }, [analysisSteps, frames.length]);

    if (frames.length === 0) {
        return <div className="min-h-[60vh] flex items-center justify-center"><Loader /></div>;
    }

    return (
        <div className="animate-fade-in-up space-y-8 w-full max-w-5xl mx-auto">
            <header className="text-center">
                <h1 className="text-3xl font-bold text-white">{t('analysis_loader.title')}</h1>
                <p className="mt-2 text-lg text-gray-400">{t('analysis_loader.subtitle')}</p>
            </header>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-1 bg-gray-800/50 p-6 rounded-2xl border border-gray-700 space-y-6">
                    <div className="flex flex-col items-center">
                        <h3 className="text-xl font-bold text-white mb-4">{t('script_optimizer.virality_score')}</h3>
                        <ViralityGauge score={currentScore} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white mb-4">{t('script_optimizer.analysis_log')}</h3>
                        <ul className="space-y-3 h-36">
                            {log.map((item, i) => (
                                <li key={i} className="flex items-center text-sm text-gray-300 animate-fade-in-up">
                                    <SparklesIcon className="w-4 h-4 mr-3 text-indigo-400 flex-shrink-0" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
                <div className="lg:col-span-2 bg-gray-900/50 p-6 rounded-2xl border border-gray-700 min-h-[50vh]">
                    <h3 className="text-xl font-bold text-white mb-4">{t('analysis_loader.keyframes')}</h3>
                    <div className="grid grid-cols-3 gap-4">
                        {frames.map((frame, index) => (
                            <div key={index} className={`relative aspect-video rounded-lg overflow-hidden transition-all duration-300 ${highlightedFrame === index ? 'ring-4 ring-indigo-500 scale-105' : 'ring-2 ring-transparent'}`}>
                                <img src={frame} alt={`Keyframe ${index + 1}`} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/30"></div>
                                {highlightedFrame === index && (
                                    <div className="absolute inset-0 bg-indigo-500/30 animate-pulse"></div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalysisLoader;