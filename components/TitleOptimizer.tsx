import React, { useState, useCallback, useEffect } from 'react';
import { analyzeTitles } from '../services/geminiService';
import { TitleAnalysis, Platform, Project } from '../types';
import { PlusIcon, TrashIcon, MagicWandIcon } from './Icons';
import { useAppContext } from '../contexts/AppContext';
import TitleAnalysisResult from './TitleAnalysisResult';

interface TitleOptimizerProps {
    onTitleSelect: (title: string) => void;
    platform: Platform;
}

const TitleOptimizer: React.FC<TitleOptimizerProps> = ({ onTitleSelect, platform }) => {
  const { consumeCredits, projects, activeProjectId, t } = useAppContext();
  const project = projects.find((p: Project) => p.id === activeProjectId);
  const initialTopic = project?.topic || '';

  const [topic, setTopic] = useState(initialTopic);
  const [titles, setTitles] = useState<string[]>(['']);
  const [isLoading, setIsLoading] = useState<{ [key: number]: boolean }>({});
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{ [key: number]: { analysis: TitleAnalysis, suggestions: string[] } }>({});
  const [, setHighlightedTitle] = useState<string | null>(null);

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
        const analysisResults = await analyzeTitles(topic, [titleToOptimize], platform);
        if (analysisResults.analysis.length > 0) {
            setResults(prev => ({
                ...prev,
                [index]: {
                    analysis: analysisResults.analysis[0],
                    suggestions: analysisResults.suggestions
                }
            }));
        }
    } catch (e) {
        setError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
        setIsLoading(prev => ({ ...prev, [index]: false }));
    }
  }, [titles, topic, platform, consumeCredits, t]);
  
  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
        <div>
            <label className="text-sm font-bold text-gray-400">Video Topic</label>
            <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., The future of AI in video editing"
                className="w-full bg-gray-700/50 rounded p-2 mt-1 text-gray-300 border border-gray-600 focus:ring-indigo-500 focus:border-indigo-500"
            />
        </div>
        <div className="space-y-4">
            {titles.map((title, index) => (
                <div key={index} className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => handleTitleChange(index, e.target.value)}
                            placeholder={t('title_optimizer.draft_title_placeholder', { index: index + 1 })}
                            className="flex-grow bg-transparent text-white focus:outline-none"
                            onMouseOver={() => setHighlightedTitle(title)}
                            onMouseOut={() => setHighlightedTitle(null)}
                        />
                        {titles.length > 1 && (
                            <button onClick={() => removeTitleField(index)} className="p-1 text-gray-500 hover:text-red-400" title={t('title_optimizer.remove_title')}>
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        )}
                        <button onClick={() => handleOptimize(index)} disabled={isLoading[index]} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white bg-indigo-600 rounded-full hover:bg-indigo-500 disabled:bg-gray-600">
                            {isLoading[index] ? (
                                <>
                                    <MagicWandIcon className="w-4 h-4 animate-pulse" />
                                    {t('title_optimizer.optimizing')}
                                </>
                            ) : (
                                <>
                                    <MagicWandIcon className="w-4 h-4" />
                                    {t('title_optimizer.optimize_button')}
                                </>
                            )}
                        </button>
                    </div>
                    {results[index] && (
                        <TitleAnalysisResult results={results[index]} onSuggestionSelect={onTitleSelect} />
                    )}
                </div>
            ))}
        </div>
        {error && <p className="text-red-400 text-center">{error}</p>}
        {titles.length < 5 && (
            <button onClick={addTitleField} className="flex items-center gap-1.5 text-sm font-semibold text-indigo-400 hover:text-indigo-300">
                <PlusIcon className="w-4 h-4" /> {t('title_optimizer.add_draft')}
            </button>
        )}
    </div>
  );
};

export default TitleOptimizer;