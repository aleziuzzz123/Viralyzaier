import React from 'react';
import type { Script } from '../types.ts';
import { ScriptCard } from './ScriptCard.tsx';

interface ScriptDisplayProps {
  script: Script | null;
  isLoading: boolean;
  error: string | null;
  onOpenSaveModal: (script: Script) => void;
  onUnsaveScript: (scriptId: string) => void;
  isScriptSaved: (script: Script) => boolean;
  scoringScriptId: string | null;
  onVisualize: (scriptId: string, artStyle: string) => void;
  isVisualizing: boolean;
  visualizingScriptId: string | null;
  onToggleSpeech: (script: Script) => void;
  speakingScriptId: string | null;
}

const EmptyState: React.FC = () => (
    <div className="text-center py-16 px-6 bg-[#2A1A5E] rounded-lg border-2 border-dashed border-[#4A3F7A]">
      <svg className="mx-auto h-12 w-12 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.5 14h.01M12 14h.01M8.5 14h.01M4.5 18H2v-4.5l6.45-6.45a6.002 6.002 0 018.49 0l2.65 2.65a6 6 0 010 8.49L18 18h-4.5m-3 0h3" />
      </svg>
      <h3 className="mt-2 text-lg font-medium text-[#F0F0F0]">No script generated yet</h3>
      <p className="mt-1 text-sm text-purple-200/80">Use the form above to create your first viral video script.</p>
    </div>
);

export const ScriptDisplay: React.FC<ScriptDisplayProps> = ({ 
  script, 
  isLoading, 
  error, 
  onOpenSaveModal, 
  onUnsaveScript, 
  isScriptSaved, 
  scoringScriptId, 
  onVisualize, 
  visualizingScriptId, 
  onToggleSpeech, 
  speakingScriptId 
}) => {

  if (isLoading) {
    // The loading state is now handled by the AIOptimizerView, so this is a fallback.
    return null;
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg" role="alert">
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  if (!script) {
    return <EmptyState />;
  }
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[#F0F0F0]">Your Optimized Script</h2>
      
      <div key={script.id}>
         <ScriptCard 
            script={script} 
            onOpenSaveModal={onOpenSaveModal} 
            onUnsave={onUnsaveScript} 
            isSaved={isScriptSaved(script)} 
            isScoring={scoringScriptId === script.id} 
            onVisualize={onVisualize}
            isVisualizing={visualizingScriptId === script.id}
            onToggleSpeech={onToggleSpeech}
            isSpeaking={speakingScriptId === script.id}
         />
      </div>
    </div>
  );
};