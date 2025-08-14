import React, { useState, useCallback, useEffect } from 'react';
import { analyzeTitles } from '../services/geminiService.ts';
import { TitleAnalysis, Platform, Project } from '../types.ts';
import { PlusIcon, TrashIcon, LightBulbIcon, MagicWandIcon } from './Icons.tsx';
import { useAppContext } from '../contexts/AppContext.tsx';

interface TitleOptimizerProps {
    onTitleSelect: (title: string) => void;
    platform: Platform;
}

const scoreColor = (score: number) => {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-lime-400';
  if (score >= 40) return 'text-yellow-400';
  if (score >= 20) return 'text-orange-400';
  return 'text-red-400';
};

const TitleOptimizer: React.FC<TitleOptimizerProps> = ({ onTitleSelect, platform }) => {
  const { consumeCredits, projects, activeProjectId, t } = useAppContext();
  const project = projects.find((p: Project) => p.id === activeProjectId);
  const initialTopic = project?.topic || '';

  const [topic, setTopic] = useState(initialTopic);
  const [titles, setTitles] = useState<string[]>(['']);
  const [isLoading, setIsLoading] = useState<{ [key: number]: boolean }>({});
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{ [key: number]: { analysis: TitleAnalysis, suggestions: string[] } }>({});
  const [highlightedTitle, setHighlightedTitle] = useState<string | null>(null);

  useEffect(() => {
    setTopic(initialTopic);
  }, [initialTopic]);

  const handleTitleChange = (index: number, value: string) => {
    const newTitles = [...titles];
    newTitles[index] = value;
    setTitles(newTitles);
  };

  const addTitleField = () => {
    if (titles.length < 5) {
      setTitles([...titles, '']);
    }
  };

  const removeTitleField = (index: number) => {
    if (titles.length > 1) {
      const newTitles = titles.filter((_, i) => i !== index);
      setTitles(newTitles);
      const newResults = { ...results };
      delete newResults[index];
      setResults(newResults);
    }
  };

  const handleOptimize = useCallback(async (index: number) => {
    const titleToOptimize = titles[index];
    if (!topic.trim()) {
      setError(t('title_optimizer.error_topic_missing'));
      return;
    }
    if (!titleToOptimize.trim()) {
      setError(t('title_optimizer.error_text_missing', { index: index + 1 }));
      return;
    }
    if (!await consumeCredits(1)) return;

    setIsLoading(prev => ({ ...prev, [index]: true }));
    setError(null);

    try {
      // We only send one title at a time for optimization
      const apiResult = await analyzeTitles(topic, [titleToOptimize], platform);
      setResults(prev => ({ ...prev, [index]: { analysis: apiResult.analysis[0], suggestions: apiResult.suggestions } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(prev => ({ ...prev, [index]: false }));
    }
  }, [topic, titles, consumeCredits, platform, t]);
  
  return (
    <div className="w-full flex flex-col items-center">
        <div className="w-full max-w-3xl space-y-6">
            <div className="space-y-4">
              {titles.map((title, index) => (
                <div key={index} className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 transition-all duration-300">
                  <div className="flex items-center space-x-3">
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => handleTitleChange(index, e.target.value)}
                      placeholder={t('title_optimizer.draft_title_placeholder', {index: index + 1})}
                      className="flex-grow bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                     <button onClick={() => handleOptimize(index)} disabled={isLoading[index]} className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors duration-300 disabled:bg-gray-500">
                        <MagicWandIcon className="w-5 h-5" />
                        <span>{isLoading[index] ? t('title_optimizer.optimizing') : t('title_optimizer.optimize_button')}</span>
                    </button>
                    {titles.length > 1 && (
                        <button onClick={() => removeTitleField(index)} title={t('title_optimizer.remove_title')} className="p-2 text-gray-500 hover:text-red-400">
                            <TrashIcon className="w-5 h-5" />
                        </button>
                    )}
                  </div>
                  {results[index] && (
                    <div className="mt-4 space-y-4">
                        <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-semibold text-indigo-400">{t('title_optimizer.analysis_label')}</p>
                                    <ul className="text-xs list-disc list-inside text-gray-400 mt-1">
                                        {results[index].analysis.pros.map((pro, i) => <li key={i} className="text-green-400/80"><span className="text-gray-400">{pro}</span></li>)}
                                        {results[index].analysis.cons.map((con, i) => <li key={i} className="text-red-400/80"><span className="text-gray-400">{con}</span></li>)}
                                    </ul>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-semibold text-indigo-400">{t('title_optimizer.score_label')}</p>
                                    <p className={`text-3xl font-bold ${scoreColor(results[index].analysis.score)}`}>{results[index].analysis.score}</p>
                                </div>
                            </div>
                            {results[index].suggestions.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-700">
                                <p className="text-sm font-semibold text-indigo-400 flex items-center mb-2">
                                <LightBulbIcon className="w-4 h-4 mr-2"/> {t('title_optimizer.suggestions_label')}
                                </p>
                                <ul className="space-y-2">
                                {results[index].suggestions.map((sug, i) => (
                                    <li key={i} className="group flex items-center justify-between p-2 rounded-md hover:bg-gray-900/50">
                                    <p className="text-gray-300 text-sm">{sug}</p>
                                    <button onClick={() => { onTitleSelect(sug); setHighlightedTitle(sug); }} className="ml-4 flex-shrink-0 px-3 py-1 text-xs font-semibold text-white bg-indigo-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-indigo-500">
                                        {t('title_optimizer.select_button')}
                                    </button>
                                    </li>
                                ))}
                                </ul>
                            </div>
                            )}
                        </div>
                    </div>
                   )}
                </div>
              ))}
            </div>

            <div className="w-full max-w-3xl mt-4 flex justify-between items-center">
                <button onClick={addTitleField} disabled={titles.length >= 5} className="flex items-center gap-1 text-sm font-semibold text-indigo-400 hover:text-indigo-300 disabled:opacity-50">
                    <PlusIcon className="w-4 h-4" /> {t('title_optimizer.add_draft')}
                </button>
            </div>

            {error && <p className="text-red-400 text-center mt-4">{error}</p>}
        </div>
    </div>
  );
};

export default TitleOptimizer;