
import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext.tsx';

interface PersonalizationModalProps {
    isOpen: boolean;
    onComplete: (data: { niche: string; platforms: ('tiktok' | 'instagram' | 'youtube')[]; tone: string }) => void;
}

const niches = ['Fitness', 'Make Money', 'Real Estate', 'Cooking', 'Tech', 'Travel', 'Gaming', 'Fashion'];
const tones = ['Funny', 'Inspirational', 'Educational', 'Shocking', 'Heartwarming', 'Action-Packed'];
const platformOptions = [
    { id: 'tiktok', name: 'TikTok', icon: 'fa-brands fa-tiktok' },
    { id: 'instagram', name: 'Instagram', icon: 'fa-brands fa-instagram' },
    { id: 'youtube', name: 'YouTube', icon: 'fa-brands fa-youtube' }
] as const;


export const PersonalizationModal: React.FC<PersonalizationModalProps> = ({ isOpen, onComplete }) => {
    const { dispatch } = useContext(AuthContext);
    const [step, setStep] = useState(1);
    const [niche, setNiche] = useState('');
    const [customNiche, setCustomNiche] = useState('');
    const [platforms, setPlatforms] = useState<('tiktok' | 'instagram' | 'youtube')[]>([]);
    const [preferredTone, setPreferredTone] = useState('');

    if (!isOpen) return null;
    
    const handleNext = () => setStep(s => s + 1);
    const handleBack = () => setStep(s => s - 1);
    
    const handlePlatformToggle = (platformId: 'tiktok' | 'instagram' | 'youtube') => {
        setPlatforms(prev => 
            prev.includes(platformId) 
                ? prev.filter(p => p !== platformId) 
                : [...prev, platformId]
        );
    };

    const handleComplete = () => {
        const finalNiche = niche === 'custom' ? customNiche : niche;
        if (finalNiche && platforms.length > 0 && preferredTone) {
            onComplete({ niche: finalNiche, platforms, tone: preferredTone });
        }
    };
    
    const isStep1Valid = niche && (niche !== 'custom' || customNiche);
    const isStep2Valid = platforms.length > 0;
    const isStep3Valid = preferredTone;

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div>
                        <h3 className="text-xl font-bold text-white mb-2">What's your primary niche?</h3>
                        <p className="text-sm text-purple-200/80 mb-6">This helps us find trends relevant to you.</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {niches.map(n => (
                                <button key={n} onClick={() => setNiche(n)} className={`py-3 px-2 text-sm font-semibold rounded-lg transition-all duration-200 ${niche === n ? 'bg-[#DAFF00] text-[#1A0F3C] ring-2 ring-white' : 'bg-[#1A0F3C] text-purple-100 hover:bg-[#4A3F7A]/50'}`}>{n}</button>
                            ))}
                             <button onClick={() => setNiche('custom')} className={`py-3 px-2 text-sm font-semibold rounded-lg transition-all duration-200 ${niche === 'custom' ? 'bg-[#DAFF00] text-[#1A0F3C] ring-2 ring-white' : 'bg-[#1A0F3C] text-purple-100 hover:bg-[#4A3F7A]/50'}`}>Other</button>
                        </div>
                        {niche === 'custom' && (
                             <input type="text" value={customNiche} onChange={(e) => setCustomNiche(e.target.value)} placeholder="Type your niche..." className="mt-4 w-full bg-[#1A0F3C] border border-[#DAFF00] rounded-md py-2.5 px-4 text-[#F0F0F0] placeholder-purple-300/50 focus:ring-2 focus:ring-[#DAFF00] focus:outline-none" autoFocus />
                        )}
                    </div>
                );
            case 2:
                return (
                    <div>
                        <h3 className="text-xl font-bold text-white mb-2">Which platforms do you post on?</h3>
                        <p className="text-sm text-purple-200/80 mb-6">Select all that apply.</p>
                        <div className="space-y-3">
                            {platformOptions.map(p => (
                                <button key={p.id} onClick={() => handlePlatformToggle(p.id)} className={`w-full text-left p-4 rounded-lg flex items-center gap-4 transition-all duration-200 ${platforms.includes(p.id) ? 'bg-[#DAFF00] text-[#1A0F3C] ring-2 ring-white' : 'bg-[#1A0F3C] text-purple-100 hover:bg-[#4A3F7A]/50'}`}>
                                    <i className={`${p.icon} text-2xl w-8 text-center`}></i>
                                    <span className="font-semibold">{p.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div>
                        <h3 className="text-xl font-bold text-white mb-2">What's your preferred tone?</h3>
                        <p className="text-sm text-purple-200/80 mb-6">You can always change this later for each script.</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {tones.map(t => (
                                <button key={t} onClick={() => setPreferredTone(t)} className={`py-3 px-2 text-sm font-semibold rounded-lg transition-all duration-200 ${preferredTone === t ? 'bg-[#DAFF00] text-[#1A0F3C] ring-2 ring-white' : 'bg-[#1A0F3C] text-purple-100 hover:bg-[#4A3F7A]/50'}`}>{t}</button>
                            ))}
                        </div>
                    </div>
                );
            case 4:
                 return (
                    <div className="text-center">
                        <div className="w-20 h-20 rounded-full bg-[#DAFF00] text-[#1A0F3C] flex items-center justify-center mx-auto mb-6">
                            <i className="fa-solid fa-check text-4xl"></i>
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">You're All Set!</h3>
                        <p className="text-purple-200/80 mb-6">Your dashboard is now personalized. Let's start creating some viral content!</p>
                    </div>
                );
        }
    }

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-[#2A1A5E] rounded-xl border border-[#4A3F7A] shadow-2xl w-full max-w-lg relative overflow-hidden">
                {step === 1 && (
                     <div className="p-8 text-center border-b border-[#4A3F7A]/50">
                        <i className="fa-solid fa-wand-magic-sparkles text-4xl text-[#DAFF00] mb-3"></i>
                        <h2 className="text-3xl font-bold text-white">Welcome to Vid Script Hub!</h2>
                        <p className="text-purple-200 mt-2">Let's quickly personalize your experience.</p>
                    </div>
                )}
                <div className="p-8">
                    {renderStep()}
                </div>
                <div className="p-6 bg-[#1A0F3C]/50 flex justify-between items-center">
                    {step > 1 && step < 4 ? (
                        <button onClick={handleBack} className="px-6 py-2.5 text-sm font-bold text-purple-200 bg-transparent rounded-md hover:bg-[#1A0F3C]">Back</button>
                    ) : <div></div>}
                    
                    {step < 3 && <button onClick={handleNext} disabled={!isStep1Valid} className="px-6 py-2.5 text-sm font-bold bg-[#DAFF00] text-[#1A0F3C] rounded-md hover:bg-opacity-90 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed">Next</button>}
                    {step === 2 && <button onClick={handleNext} disabled={!isStep2Valid} className="px-6 py-2.5 text-sm font-bold bg-[#DAFF00] text-[#1A0F3C] rounded-md hover:bg-opacity-90 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed">Next</button>}
                    {step === 3 && <button onClick={handleNext} disabled={!isStep3Valid} className="px-6 py-2.5 text-sm font-bold bg-[#DAFF00] text-[#1A0F3C] rounded-md hover:bg-opacity-90 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed">Finish</button>}
                    {step === 4 && <button onClick={handleComplete} className="w-full px-6 py-3 text-lg font-bold bg-[#DAFF00] text-[#1A0F3C] rounded-md hover:bg-opacity-90">Let's Go!</button>}
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-[#1A0F3C]">
                    <div className="h-1 bg-[#DAFF00] transition-all duration-300" style={{width: `${(step/4)*100}%`}}></div>
                </div>
            </div>
        </div>
    );
};
