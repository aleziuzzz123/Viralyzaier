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
    <div className="mt-4 space-y-