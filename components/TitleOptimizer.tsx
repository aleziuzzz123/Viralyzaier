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
  const [isLoading, setIsLoading] = useState<{[key: number]: boolean}>({});
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{[key: number]: { analysis: TitleAnalysis, suggestions: string[] } }>({});
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
                      className="flex-grow bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder