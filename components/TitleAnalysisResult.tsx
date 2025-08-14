import React from 'react';
import { TitleAnalysis } from '../types';
import { LightBulbIcon } from './Icons';
import { useAppContext } from '../contexts/AppContext';

interface TitleAnalysisResultProps {
  results: { analysis: TitleAnalysis; suggestions: string[] };
  onSuggestionSelect: (title: string) => void;
}

const TitleAnalysisResult: React.FC<TitleAnalysisResultProps> = ({ results, onSuggestionSelect }) => {
  const { t } = useAppContext();

  if (!results) {
    return null;
  }

  const scoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-lime-400';
    if (score >= 40) return 'text-yellow-400';
    if (score >= 20) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="mt-4 space-y-4 animate-fade-in-up">
      <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-semibold text-indigo-400">{t('title_optimizer.analysis_label')}</p>
            <ul className="text-xs list-disc list-inside text-gray-400 mt-1">
              {results.analysis.pros.map((pro, i) => <li key={i} className="text-green-400/80"><span className="text-gray-400">{pro}</span></li>)}
              {results.analysis.cons.map((con, i) => <li key={i} className="text-red-400/80"><span className="text-gray-400">{con}</span></li>)}
            </ul>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-indigo-400">{t('title_optimizer.score_label')}</p>
            <p className={`text-3xl font-bold ${scoreColor(results.analysis.score)}`}>{results.analysis.score}</p>
          </div>
        </div>
        {results.suggestions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-sm font-semibold text-indigo-400 flex items-center mb-2">
              <LightBulbIcon className="w-4 h-4 mr-2"/> {t('title_optimizer.suggestions_label')}
            </p>
            <ul className="space-y-2">
              {results.suggestions.map((sug, i) => (
                <li key={i} className="group flex items-center justify-between p-2 rounded-md hover:bg-gray-900/50">
                  <p className="text-gray-300 text-sm">{sug}</p>
                  <button onClick={() => onSuggestionSelect(sug)} className="ml-4 flex-shrink-0 px-3 py-1 text-xs font-semibold text-white bg-indigo-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-indigo-500">
                    {t('title_optimizer.select_button')}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default TitleAnalysisResult;