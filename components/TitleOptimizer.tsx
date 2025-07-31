
import React, { useState, useCallback, useEffect } from 'react';
import { analyzeTitles } from '../services/geminiService';
import { TitleAnalysis, Platform } from '../types';
import { SparklesIcon, PlusIcon, TrashIcon, LightBulbIcon, MagicWandIcon } from './Icons';
import { useAppContext } from '../contexts/AppContext';

interface TitleOptimizerProps {
    onTitleSelect: (title: string) => void;
    onBack: () => void;
    platform: Platform;
}

const scoreColor = (score: number) => {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-lime-400';
  if (score >= 40) return 'text-yellow-400';
  if (score >= 20) return 'text-orange-400';
  return 'text-red-400';
};

const TitleOptimizer: React.FC<TitleOptimizerProps> = ({ onTitleSelect, onBack, platform }) => {
  const { apiKeyError, consumeCredits, projects, activeProjectId, t } = useAppContext();
  const project = projects.find(p => p.id === activeProjectId);
  const initialTopic = project?.topic || '';

  const [topic, setTopic] = useState(initialTopic);
  const [titles, setTitles] = useState<string[]>(['']);
  const [isLoading, setIsLoading] = useState<{[key: number]: boolean}>({});
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{[key: number]: { analysis: TitleAnalysis, suggestions: string[] } }>({});

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
      const newResults = {...results};
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
      setError(t('title_optimizer.error_text_missing', {index: index + 1}));
      return;
    }
    if (apiKeyError) {
      setError(t('title_optimizer.error_api_key'));
      return;
    }
    if (!await consumeCredits(1)) return;

    setIsLoading(prev => ({...prev, [index]: true}));
    setError(null);

    try {
      // We only send one title at a time for optimization
      const apiResult = await analyzeTitles(topic, [titleToOptimize], platform);
      setResults(prev => ({...prev, [index]: { analysis: apiResult.analysis[0], suggestions: apiResult.suggestions }}));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(prev => ({...prev, [index]: false}));
    }
  }, [topic, titles, apiKeyError, consumeCredits, platform, t]);
  
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
                    {titles.length > 1 && (
                       <button
                        onClick={() => removeTitleField(index)}
                        className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                        title={t('title_optimizer.remove_title')}
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    )}
                    <button
                        onClick={() => handleOptimize(index)}
                        disabled={isLoading[index]}
                        className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors flex items-center disabled:bg-gray-500 disabled:cursor-wait"
                    >
                        <MagicWandIcon className="w-5 h-5 mr-2"/>
                        {isLoading[index] ? t('title_optimizer.optimizing') : t('title_optimizer.optimize_button')}
                    </button>
                  </div>
                  
                  {results[index] && (
                    <div className="mt-4 space-y-4 animate-fade-in-up">
                        <div className="bg-gray-900/70 p-4 rounded-lg">
                            <h4 className="font-semibold text-gray-300 mb-2">{t('title_optimizer.analysis_label')}</h4>
                            <p className="text-sm text-gray-400">
                                <span className={`font-bold ${scoreColor(results[index].analysis.score)}`}>{t('title_optimizer.score_label')} {results[index].analysis.score}/100</span> - {results[index].analysis.cons[0] || t('title_optimizer.analysis_fallback')}
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-300 mb-2 flex items-center"><LightBulbIcon className="w-5 h-5 mr-2 text-yellow-300"/>{t('title_optimizer.suggestions_label')}</h4>
                            <ul className="space-y-2">
                                {results[index].suggestions.slice(0, 3).map((suggestion, sIndex) => (
                                    <li 
                                        key={sIndex}
                                        onClick={() => onTitleSelect(suggestion)}
                                        className="group flex items-center justify-between p-3 rounded-md bg-gray-900 hover:bg-indigo-900/50 transition-all cursor-pointer border border-transparent hover:border-indigo-500"
                                    >
                                        <p className="text-gray-200">{suggestion}</p>
                                        <span className="px-3 py-1 text-xs font-semibold text-white bg-indigo-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                            {t('title_optimizer.select_button')}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center">
              <div>
                {titles.length < 5 && (
                  <button
                    onClick={addTitleField}
                    className="mt-2 flex items-center text-sm font-semibold text-indigo-400 hover:text-indigo-300"
                  >
                    <PlusIcon className="w-5 h-5 mr-1" />
                    {t('title_optimizer.add_draft')}
                  </button>
                )}
              </div>
            </div>
        </div>
         {error && <p className="text-red-400 text-center mt-6 w-full">{error}</p>}
    </div>
  );
};

export default TitleOptimizer;
