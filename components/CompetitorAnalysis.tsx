import React, { useState, useCallback } from 'react';
import { Project, CompetitorAnalysisResult } from '../types.ts';
import { analyzeCompetitorVideo } from '../services/geminiService.ts';
import { SparklesIcon, TargetIcon, LightBulbIcon, CheckIcon } from './Icons.tsx';
import { useAppContext } from '../contexts/AppContext.tsx';

interface CompetitorAnalysisProps {
    project: Project;
    onApplyTitle: (title: string) => void;
}

const CompetitorAnalysis: React.FC<CompetitorAnalysisProps> = ({ project, onApplyTitle }) => {
    const { consumeCredits, handleUpdateProject, t } = useAppContext();
    const [url, setUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<CompetitorAnalysisResult | null>(project.competitorAnalysis);
    const [appliedTitle, setAppliedTitle] = useState<string | null>(null);

    const handleAnalyze = useCallback(async () => {
        if (!url) {
            setError(t('competitor_analysis.error_url_missing'));
            return;
        }
        if (!await consumeCredits(5)) return; // Increased cost

        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const analysisResult = await analyzeCompetitorVideo(url);
            setResult(analysisResult);
            // Also update the project's topic based on the competitor's actual title
            handleUpdateProject({ id: project.id, competitorAnalysis: analysisResult, topic: analysisResult.videoTitle });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [url, project.id, handleUpdateProject, consumeCredits, t]);

    const handleApplyTitle = (title: string) => {
        onApplyTitle(title);
        setAppliedTitle(title);
    };

    return (
        <div className="w-full flex flex-col items-center animate-fade-in-up">
            <div className="w-full max-w-2xl mb-8">
                <div className="flex items-center bg-gray-800 rounded-full shadow-lg border border-gray-700 p-2">
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
                        placeholder={t('competitor_analysis.placeholder')}
                        className="w-full bg-transparent text-white placeholder-gray-500 focus:outline-none px-4"
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleAnalyze}
                        disabled={isLoading}
                        className="flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full p-3 transition-colors duration-300 disabled:bg-gray-500 disabled:cursor-wait"
                    >
                        <TargetIcon className="w-6 h-6" />
                    </button>
                </div>
                {error && <p className="text-red-400 text-center mt-3">{error}</p>}
            </div>

            {isLoading && (
                <div className="flex flex-col items-center justify-center space-y-4 text-center mt-8">
                    <SparklesIcon className="w-12 h-12 text-pink-500 animate-pulse" />
                    <p className="text-lg text-gray-200 font-semibold">{t('competitor_analysis.loading')}</p>
                </div>
            )}
            
            {result && (
                <div className="w-full max-w-5xl space-y-6 animate-fade-in-up">
                    <div className="bg-gray-800/50 rounded-2xl p-6 shadow-2xl border border-gray-700">
                        <h3 className="text-xl font-bold text-white mb-2">{t('competitor_analysis.blueprint_title')}</h3>
                        <p className="text-gray-300 italic">"{result.viralityDeconstruction}"</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gray-800/50 rounded-2xl p-6 shadow-2xl border border-gray-700">
                            <h4 className="text-lg font-bold text-white mb-3">{t('competitor_analysis.structure_title')}</h4>
                            <ul className="space-y-3">
                                {result.stealableStructure.map((item: { step: string; description: string; }, i: number) => (
                                    <li key={i} className="flex items-start">
                                        <div className="bg-gray-900 text-pink-400 font-bold rounded-md w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0">{i + 1}</div>
                                        <div>
                                            <p className="font-semibold text-gray-200">{item.step}</p>
                                            <p className="text-sm text-gray-400">{item.description}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="bg-gray-800/50 rounded-2xl p-6 shadow-2xl border border-gray-700">
                            <h4 className="text-lg font-bold text-white mb-3">{t('competitor_analysis.keywords_title')}</h4>
                             <div className="flex flex-wrap gap-2">
                                {result.extractedKeywords.map((keyword: string, i: number) => (
                                    <span key={i} className="px-3 py-1 bg-gray-700 text-gray-300 text-sm font-medium rounded-full">{keyword}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-gray-800/50 rounded-2xl p-6 shadow-2xl border border-gray-700">
                        <h4 className="flex items-center text-lg font-bold text-white mb-3"><LightBulbIcon className="w-5 h-5 mr-2 text-yellow-300"/>{t('competitor_analysis.upgrades_title')}</h4>
                        <ul className="space-y-2">
                            {result.suggestedTitles.map((title: string, i: number) => (
                                <li key={i} className="group flex items-center justify-between p-3 rounded-md hover:bg-gray-900/50">
                                    <p className="text-gray-200">{title}</p>
                                    <button
                                        onClick={() => handleApplyTitle(title)}
                                        disabled={appliedTitle === title}
                                        className="ml-4 flex-shrink-0 px-3 py-1 text-xs font-semibold text-white bg-indigo-600 rounded-full transition-all hover:bg-indigo-500 disabled:bg-green-600 disabled:cursor-not-allowed flex items-center"
                                    >
                                        {appliedTitle === title ? (
                                            <>
                                                <CheckIcon className="w-4 h-4 mr-1.5" />
                                                {t('competitor_analysis.applied_button')}
                                            </>
                                        ) : (
                                            t('competitor_analysis.apply_button')
                                        )}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {result.sources && result.sources.length > 0 && (
                        <div className="bg-gray-800/50 rounded-2xl p-6 shadow-2xl border border-gray-700">
                            <h4 className="text-lg font-bold text-white mb-3">Sources</h4>
                            <ul className="space-y-2">
                                {result.sources.map((source: { uri: string; title: string; }, i: number) => (
                                    <li key={i} className="text-sm text-gray-400">
                                        <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline truncate block">
                                            {i + 1}. {source.title}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CompetitorAnalysis;