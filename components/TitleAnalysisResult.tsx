import React from 'react';
import { TitleAnalysis } from '../types.ts';
import { SparklesIcon } from './Icons.tsx';

interface TitleAnalysisResultProps {
  results: { analysis: TitleAnalysis; suggestions: string[] };
  onSuggestionSelect: (title: string) => void;
}

// This is a placeholder component to ensure the app doesn't crash.
// The full implementation from TitleOptimizer.tsx can be adapted here if needed.
const TitleAnalysisResult: React.FC<TitleAnalysisResultProps> = ({ results, onSuggestionSelect }) => {
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
        <div className="bg-gray-900/70 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-300 mb-2">Analysis:</h4>
            <p className="text-sm text-gray-400">
                <span className={`font-bold ${scoreColor(results.analysis.score)}`}>Score: {results.analysis.score}/100</span> - {results.analysis.cons[0] || "A solid starting point."}
            </p>
        </div>
        <div>
            <h4 className="font-semibold text-gray-300 mb-2 flex items-center"><SparklesIcon className="w-5 h-5 mr-2 text-yellow-300"/>Upgraded Suggestions:</h4>
            <ul className="space-y-2">
                {results.suggestions.map((suggestion, sIndex) => (
                    <li 
                        key={sIndex}
                        onClick={() => onSuggestionSelect(suggestion)}
                        className="group flex items-center justify-between p-3 rounded-md transition-colors cursor-pointer bg-gray-900 hover:bg-indigo-900/50 border border-transparent hover:border-indigo-500/50"
                    >
                        <p className="text-gray-200">{suggestion}</p>
                    </li>
                ))}
            </ul>
        </div>
    </div>
  );
};

export default TitleAnalysisResult;