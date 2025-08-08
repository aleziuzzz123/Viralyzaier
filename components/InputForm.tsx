

import React, { useState, useEffect, useContext } from 'react';
import type { EnhancedTopic } from '../types.ts';
import { AuthContext } from '../context/AuthContext.tsx';
import { CrownIcon } from './icons/CrownIcon.tsx';

interface InputFormProps {
  onStartOptimization: (task: { mode: 'generate', data: { topic: string, tone: string, lengthInSeconds: number } } | { mode: 'optimize', data: { title: string, hook: string, script: string } }) => void;
  isLoading: boolean;
  initialTopic?: string;
  setInitialTopic: (topic: string | undefined) => void;
  onEnhanceTopic: (topic: string) => void;
  isEnhancing: boolean;
  enhancedTopics: EnhancedTopic[];
  onSelectEnhancedTopic: (topic: string) => void;
  onOpenUpgradeModal: (requiredPlan: 'unlimited' | 'dfy' | 'agency', featureName: string) => void;
}

export const InputForm: React.FC<InputFormProps> = ({ 
    onStartOptimization, 
    isLoading, 
    initialTopic, 
    setInitialTopic,
    onEnhanceTopic,
    isEnhancing,
    enhancedTopics,
    onSelectEnhancedTopic,
    onOpenUpgradeModal,
}) => {
  const { state: { user } } = useContext(AuthContext);
  const { primary_niche: primaryNiche, preferred_tone: preferredTone, plan } = user || {};
  const [mode, setMode] = useState<'generate' | 'optimize'>('generate');

  // State for 'generate' mode
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('Funny');
  const [length, setLength] = useState(60);
  
  // State for 'optimize' mode
  const [userTitle, setUserTitle] = useState('');
  const [userHook, setUserHook] = useState('');
  const [userScript, setUserScript] = useState('');

  const tones = ['Funny', 'Inspirational', 'Educational', 'Heartwarming', 'Action-Packed'];
  const advancedTones = ['Controversial', 'Shocking', 'Luxury & Aspirational', 'Data-Driven'];
  
  const isAdvancedLocked = plan === 'basic';

  useEffect(() => {
    if (initialTopic) { setTopic(initialTopic); } 
    else if (primaryNiche) { setTopic(primaryNiche); }
    if (preferredTone) { setTone(preferredTone); }
  }, [initialTopic, primaryNiche, preferredTone]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'generate' && topic.trim()) {
      onStartOptimization({ mode: 'generate', data: { topic, tone, lengthInSeconds: length } });
      setInitialTopic(undefined);
    } else if (mode === 'optimize' && userScript.trim()) {
      onStartOptimization({ mode: 'optimize', data: { title: userTitle, hook: userHook, script: userScript } });
    }
  };
  
  const handleTopicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setTopic(e.target.value);
      if(initialTopic) { setInitialTopic(undefined); }
  }

  const handleSelectAndGenerate = (selectedTopic: string) => {
    setTopic(selectedTopic);
    onSelectEnhancedTopic(selectedTopic);
    onStartOptimization({ mode: 'generate', data: { topic: selectedTopic, tone, lengthInSeconds: length } });
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) return `${minutes}m`;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const renderToneButton = (t: string, isAdvanced: boolean = false) => (
    <button key={t} type="button" onClick={() => {
        if(isAdvanced && isAdvancedLocked) {
            onOpenUpgradeModal('unlimited', 'Advanced Tonal Styles');
            return;
        }
        setTone(t);
    }} 
    className={`px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#2A1A5E] focus:ring-[#DAFF00] ${tone === t ? 'bg-[#DAFF00] text-[#1A0F3C]' : 'bg-[#1A0F3C] text-purple-200 hover:bg-[#4A3F7A]/50'}`}
    >
      {t}
    </button>
  );

  const isGenerateSubmitDisabled = isLoading || !topic.trim() || isEnhancing;
  const isOptimizeSubmitDisabled = isLoading || !userScript.trim();

  return (
    <div className="bg-[#2A1A5E]/50 rounded-xl border border-[#4A3F7A]/30 shadow-lg mb-10">
      <div className="flex border-b border-[#4A3F7A]/30">
        <button onClick={() => setMode('generate')} className={`flex-1 py-3 font-bold text-center transition-colors duration-200 ${mode === 'generate' ? 'bg-[#DAFF00]/10 text-[#DAFF00] border-b-2 border-[#DAFF00]' : 'text-purple-300 hover:bg-[#DAFF00]/5'}`}>
          <i className="fa-solid fa-wand-magic-sparkles mr-2"></i>Generate New Script
        </button>
        <button onClick={() => setMode('optimize')} className={`flex-1 py-3 font-bold text-center transition-colors duration-200 ${mode === 'optimize' ? 'bg-[#DAFF00]/10 text-[#DAFF00] border-b-2 border-[#DAFF00]' : 'text-purple-300 hover:bg-[#DAFF00]/5'}`}>
          <i className="fa-solid fa-rocket mr-2"></i>Optimize Your Script
        </button>
      </div>

      <div className="p-6">
        <form onSubmit={handleSubmit}>
          {mode === 'generate' ? (
            <div className="space-y-6">
              <div>
                <label htmlFor="topic" className="block text-sm font-medium text-purple-200 mb-2">Enter Your Niche or Keyword...</label>
                <div className="flex gap-2">
                    <input id="topic" type="text" value={topic} onChange={handleTopicChange} placeholder="e.g., 'Healthy dog food recipes'" className="w-full bg-[#1A0F3C] border border-[#4A3F7A] rounded-md py-3 px-4 text-[#F0F0F0] placeholder-purple-300/50 focus:ring-2 focus:ring-[#DAFF00] focus:border-[#DAFF00] focus:outline-none transition duration-200" required/>
                    <button type="button" onClick={() => onEnhanceTopic(topic)} disabled={isGenerateSubmitDisabled} className="flex-shrink-0 flex items-center justify-center bg-[#1A0F3C] border-2 border-[#DAFF00] text-[#DAFF00] font-bold py-3 px-4 rounded-md hover:bg-[#DAFF00] hover:text-[#1A0F3C] disabled:bg-slate-700 disabled:text-slate-400 disabled:border-slate-600 disabled:cursor-not-allowed transition-all duration-200" title="Supercharge Topic">
                        {isEnhancing ? <svg className="animate-spin h-5 w-5" xmlns="http://www.w.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <i className="fa-solid fa-bolt"></i>}
                    </button>
                </div>
              </div>
              
              {(isEnhancing || enhancedTopics.length > 0) && (
                 <div className="bg-[#1A0F3C]/50 rounded-lg p-4 space-y-3">
                     <h4 className="text-sm font-semibold text-purple-200 text-center">AI Suggested Angles (Click to Generate)</h4>
                     {isEnhancing && <div className="text-center text-purple-300 text-sm animate-pulse">Analyzing topic...</div>}
                     {enhancedTopics.map((suggestion, index) => (
                        <button key={index} type="button" onClick={() => handleSelectAndGenerate(suggestion.angle)} className="w-full text-left p-3 bg-[#2A1A5E] rounded-md hover:bg-[#4A3F7A]/50 transition-colors duration-200">
                            <p className="font-semibold text-white">{suggestion.angle}</p>
                            <p className="text-xs text-purple-300/80 mt-1">{suggestion.rationale}</p>
                        </button>
                     ))}
                 </div>
              )}

              <div>
                <label htmlFor="length" className="flex justify-between items-center text-sm font-medium text-purple-200 mb-2"><span>Script Length</span><span className="font-bold text-[#DAFF00] bg-[#1A0F3C] px-2 py-1 rounded-md text-xs">{formatDuration(length)}</span></label>
                <input id="length" type="range" min="10" max="600" step="5" value={length} onChange={(e) => setLength(parseInt(e.target.value, 10))} className="w-full h-2 rounded-lg appearance-none cursor-pointer"/>
              </div>

              <div>
                <label className="block text-sm font-medium text-purple-200 mb-3">Select Script Tone</label>
                <div className="flex flex-wrap gap-2">{tones.map(t => renderToneButton(t))}</div>
              </div>
              
              <div className="pt-4 px-4 pb-4 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-2 bg-[#DAFF00] text-[#1A0F3C] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-[#DAFF00]/20">
                        <CrownIcon className="w-4 h-4" />
                        <span>Premium</span>
                    </div>
                </div>
                <div className={`p-4 rounded-lg relative overflow-hidden transition-all duration-300 ${isAdvancedLocked ? 'bg-black/20 border border-purple-600/50' : 'bg-gradient-to-b from-[#DAFF00]/10 to-transparent border border-[#DAFF00]/30'}`}>
                   {isAdvancedLocked && (
                    <div 
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center z-10 cursor-pointer group p-4 text-center"
                        onClick={() => onOpenUpgradeModal('unlimited', 'Advanced Tonal Styles')}
                    >
                        <CrownIcon className="w-10 h-10 text-[#DAFF00] mb-3 drop-shadow-lg group-hover:scale-110 transition-transform duration-200" />
                        <span className="font-bold text-white group-hover:text-[#DAFF00] transition-colors">Upgrade to Unlock</span>
                        <span className="text-xs text-purple-300 mt-1">Access Controversial, Shocking, and other advanced styles.</span>
                    </div>
                  )}
                  <div className={isAdvancedLocked ? 'opacity-30 blur-sm' : ''}>
                    <label className="block text-sm font-medium text-white mb-3 text-center tracking-wide">Advanced Tonal Styles</label>
                    <div className="flex flex-wrap gap-2 justify-center">{advancedTones.map(t => renderToneButton(t, true))}</div>
                  </div>
                </div>
              </div>


              <button type="submit" disabled={isGenerateSubmitDisabled} className="w-full flex items-center justify-center bg-[#DAFF00] text-[#1A0F3C] font-bold py-4 px-4 rounded-md hover:bg-opacity-90 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 disabled:scale-100 focus:outline-none focus:ring-4 focus:ring-[#DAFF00]/50 text-lg">
                {isLoading ? <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-[#1A0F3C]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Analyzing & Optimizing...</> : <><i className="fa-solid fa-wand-magic-sparkles mr-2"></i>Generate Script</>}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
               <div>
                <label htmlFor="userTitle" className="block text-sm font-medium text-purple-200 mb-2">Video Title (Optional)</label>
                <input id="userTitle" type="text" value={userTitle} onChange={(e) => setUserTitle(e.target.value)} placeholder="Your catchy title" className="w-full bg-[#1A0F3C] border border-[#4A3F7A] rounded-md py-2 px-3 text-[#F0F0F0] placeholder-purple-300/50 focus:ring-2 focus:ring-[#DAFF00] focus:border-[#DAFF00]"/>
              </div>
              <div>
                <label htmlFor="userHook" className="block text-sm font-medium text-purple-200 mb-2">Hook / Intro (Optional)</label>
                <input id="userHook" type="text" value={userHook} onChange={(e) => setUserHook(e.target.value)} placeholder="Your attention-grabbing first 3 seconds" className="w-full bg-[#1A0F3C] border border-[#4A3F7A] rounded-md py-2 px-3 text-[#F0F0F0] placeholder-purple-300/50 focus:ring-2 focus:ring-[#DAFF00] focus:border-[#DAFF00]"/>
              </div>
              <div>
                <label htmlFor="userScript" className="block text-sm font-medium text-purple-200 mb-2">Your Script</label>
                <textarea id="userScript" value={userScript} onChange={(e) => setUserScript(e.target.value)} rows={8} placeholder="Paste your full script here..." className="w-full bg-[#1A0F3C] border border-[#4A3F7A] rounded-md py-2 px-3 text-[#F0F0F0] placeholder-purple-300/50 focus:ring-2 focus:ring-[#DAFF00] focus:border-[#DAFF00]" required></textarea>
              </div>
              <button type="submit" disabled={isOptimizeSubmitDisabled} className="w-full flex items-center justify-center bg-[#DAFF00] text-[#1A0F3C] font-bold py-4 px-4 rounded-md hover:bg-opacity-90 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 disabled:scale-100 focus:outline-none focus:ring-4 focus:ring-[#DAFF00]/50 text-lg">
                {isLoading ? <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-[#1A0F3C]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Analyzing & Optimizing...</> : <><i className="fa-solid fa-rocket mr-2"></i>Optimize My Script</>}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
