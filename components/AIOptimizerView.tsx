import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { OptimizationStep, Script } from '../types.ts';
import { RadialProgress } from './icons/RadialProgress.tsx';

interface AIOptimizerViewProps {
    trace: OptimizationStep[] | null;
    onComplete: (finalScript: Script) => void;
}

const splitByWords = (text: string) => {
    return text.split(/(\s+)/); // Split by whitespace, keeping the whitespace
};

const diffStrings = (oldStr: string, newStr: string) => {
    const oldWords = splitByWords(oldStr);
    const newWords = splitByWords(newStr);
    const dp = Array(newWords.length + 1).fill(null).map(() => Array(oldWords.length + 1).fill(0));

    for (let i = 1; i <= newWords.length; i++) {
        for (let j = 1; j <= oldWords.length; j++) {
            if (newWords[i - 1] === oldWords[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    const result: { value: string, type: 'added' | 'removed' | 'same' }[] = [];
    let i = newWords.length, j = oldWords.length;
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && newWords[i - 1] === oldWords[j - 1]) {
            result.unshift({ value: newWords[i - 1], type: 'same' });
            i--; j--;
        } else if (i > 0 && (j === 0 || dp[i - 1][j] >= dp[i][j - 1])) {
            result.unshift({ value: newWords[i - 1], type: 'added' });
            i--;
        } else if (j > 0 && (i === 0 || dp[i - 1][j] < dp[i][j - 1])) {
            result.unshift({ value: oldWords[j - 1], type: 'removed' });
            j--;
        } else {
            break;
        }
    }
    return result;
};


export const AIOptimizerView: React.FC<AIOptimizerViewProps> = ({ trace, onComplete }) => {
    const [stepIndex, setStepIndex] = useState(0);
    const [currentScore, setCurrentScore] = useState(0);
    const [displayedScript, setDisplayedScript] = useState<any>({ title: '', hook: '', script: '' });
    const scoreIntervalRef = useRef<number | null>(null);
    const [isTurbo, setIsTurbo] = useState(false);

    useEffect(() => {
        if (!trace || trace.length === 0) return;
        
        // Slower, more deliberate pacing to showcase the AI's work
        const stepDelay = isTurbo ? 500 : 2500;
        const scoreAnimationDuration = isTurbo ? 400 : 1500;

        // A recursive function to handle each step's animation
        const animateStep = (index: number) => {
            if (index >= trace.length) {
                // After the final step, wait a moment before completing
                setTimeout(() => onComplete({ ...trace[trace.length - 1].script, id: crypto.randomUUID() } as Script), 1000);
                return;
            }
            
            const currentStep = trace[index];
            // For the first step, we diff against an empty script
            const previousStepScript = index > 0 ? trace[index - 1].script : { title: '', hook: '', script: '' };

            const titleDiff = diffStrings(previousStepScript.title, currentStep.script.title);
            const hookDiff = diffStrings(previousStepScript.hook, currentStep.script.hook);
            const scriptDiff = diffStrings(previousStepScript.script, currentStep.script.script);
            
            setDisplayedScript({ title: titleDiff, hook: hookDiff, script: scriptDiff });
            
            // Animate score smoothly
            if (scoreIntervalRef.current) clearInterval(scoreIntervalRef.current);
            const startScore = index > 0 ? trace[index - 1].score : 0;
            const endScore = currentStep.score;
            const startTime = Date.now();

            scoreIntervalRef.current = window.setInterval(() => {
                const elapsedTime = Date.now() - startTime;
                if (elapsedTime >= scoreAnimationDuration) {
                    setCurrentScore(endScore);
                    if (scoreIntervalRef.current) clearInterval(scoreIntervalRef.current);
                } else {
                    const progress = elapsedTime / scoreAnimationDuration;
                    setCurrentScore(Math.round(startScore + (endScore - startScore) * progress));
                }
            }, 30);
            
            // Set up the next step's animation
            const nextStepTimeout = setTimeout(() => {
                setStepIndex(index + 1); // This triggers the log update visually
                animateStep(index + 1);
            }, stepDelay);

            // Cleanup function to clear timeouts if the component unmounts
            return () => clearTimeout(nextStepTimeout);
        };

        // Start the animation sequence after a brief delay
        const initialTimeout = setTimeout(() => animateStep(0), 100);

        return () => { 
            clearTimeout(initialTimeout);
            if(scoreIntervalRef.current) clearInterval(scoreIntervalRef.current);
        };
    }, [trace, onComplete, isTurbo]);
    
    const renderDiff = (diffs: { value: string, type: 'added' | 'removed' | 'same' }[]) => {
      return diffs.map((part, index) => {
          if (part.type === 'added') return <ins key={index} className="diff">{part.value}</ins>;
          if (part.type === 'removed') return <del key={index} className="diff">{part.value}</del>;
          return <span key={index}>{part.value}</span>;
      });
    };
    

    if (!trace) {
        return (
            <div className="text-center py-16 px-6 bg-[#2A1A5E] rounded-lg border-2 border-dashed border-[#4A3F7A]">
                <div className="flex justify-center items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-[#DAFF00]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <h3 className="text-lg font-medium text-[#F0F0F0]">
                        <span className="animate-pulse">🚀 Initializing AI Optimization Core... Please wait...</span>
                    </h3>
                </div>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-white">🚀 AI Viral Script Optimizer</h2>
                <p className="text-purple-300 mt-1">Watch as our AI improves your script to a 100% virality score...</p>
            </div>

            <div className="w-full bg-[#1A0F3C] rounded-full h-2.5 border border-[#4A3F7A]/50">
                <div className="bg-[#DAFF00] h-2 rounded-full transition-all duration-500 ease-out" style={{ width: `${(stepIndex / trace.length) * 100}%` }}></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-[#2A1A5E]/50 rounded-xl border border-[#4A3F7A]/30 p-6 space-y-4">
                    <h3 className="text-xl font-bold text-[#DAFF00]">{renderDiff(displayedScript.title)}</h3>
                    <div>
                        <h4 className="font-semibold text-purple-200 text-sm tracking-wider uppercase">Hook</h4>
                        <p className="text-[#F0F0F0] mt-1 italic">"{renderDiff(displayedScript.hook)}"</p>
                    </div>
                    <div className="border-t border-[#4A3F7A]/50 pt-4">
                        <h4 className="font-semibold text-purple-200 text-sm tracking-wider uppercase">Full Script</h4>
                        <pre className="text-purple-100/90 mt-2 whitespace-pre-wrap text-sm leading-relaxed font-sans">{renderDiff(displayedScript.script)}</pre>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-[#2A1A5E]/50 rounded-xl border border-[#4A3F7A]/30 p-6 flex flex-col items-center relative">
                        <div className="absolute top-3 right-3">
                            <button onClick={() => setIsTurbo(!isTurbo)} className="flex items-center gap-2 text-xs text-purple-300 hover:text-[#DAFF00] bg-[#1A0F3C]/80 px-2 py-1 rounded-full transition-colors" title="Toggle animation speed">
                                <i className={`fa-solid fa-bolt ${isTurbo ? 'text-[#DAFF00] animate-pulse' : ''}`}></i>
                                <span>{isTurbo ? 'Turbo ON' : 'Turbo OFF'}</span>
                            </button>
                        </div>
                        <h4 className="text-sm font-semibold text-purple-200 uppercase tracking-wider mb-4">Virality Score</h4>
                        <RadialProgress progress={currentScore} size={160} strokeWidth={12} />
                    </div>
                    <div className="bg-[#2A1A5E]/50 rounded-xl border border-[#4A3F7A]/30 p-6">
                        <h4 className="text-sm font-semibold text-purple-200 uppercase tracking-wider mb-4">Optimization Log</h4>
                        <ul className="space-y-3">
                            {trace.map((step, index) => {
                                const isDone = index < stepIndex;
                                const isActive = index === stepIndex;
                                const isPending = index > stepIndex;
                                return (
                                    <li key={index} className="flex items-center gap-3 text-sm transition-all duration-300">
                                        <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full bg-[#1A0F3C] border-2 border-[#4A3F7A]">
                                            {isDone && <i className="fa-solid fa-check text-xs text-green-400"></i>}
                                            {isActive && <div className="w-2 h-2 rounded-full bg-[#DAFF00] animate-pulse"></div>}
                                            {isPending && <div className="w-1.5 h-1.5 rounded-full bg-[#4A3F7A]"></div>}
                                        </div>
                                        <span className={isDone ? 'text-purple-300/60 line-through' : isActive ? 'text-white font-bold' : 'text-purple-300/80'}>{step.log}</span>
                                    </li>
                                )
                            })}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};