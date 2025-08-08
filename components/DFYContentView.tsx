

import React, { useState, useMemo, useCallback, useEffect, useContext } from 'react';
import type { Script } from '../types.ts';
import { ScriptCard } from './ScriptCard.tsx';
import { RemixScriptModal } from './RemixScriptModal.tsx';
import { generateBonusPdf } from '../services/pdfService.ts';
import { DataContext } from '../context/DataContext.tsx';
import { AuthContext } from '../context/AuthContext.tsx';

const niches = ['All', 'Weight Loss', 'Make Money', 'Fitness', 'Productivity', 'Tech', 'DIY', 'Cooking', 'Pets', 'Travel', 'Real Estate', 'Psychology', 'Personal Finance', 'Gaming', 'Parenting', 'Car Detailing', 'Relationships', 'Philosophy', 'History', 'Career'];

const viralHooks = {
    "Controversial & Bold Statements": [
        "Everything you know about [topic] is a lie.",
        "I'm about to get cancelled for this, but someone has to say it...",
        "Hot take: [Popular opinion/product] is actually terrible and here's the proof.",
        "Unpopular opinion: You should be doing [counter-intuitive action] instead of [common action].",
        "Stop doing [common activity] right now. It's killing your [results].",
        "The [industry] is lying to you about [topic].",
        "Your [teacher/parent/boss] was wrong about [topic].",
        "Here's the uncomfortable truth about [popular trend].",
    ],
    "Problem & Agitation Hooks": [
        "The real reason you're failing at [goal]. (It's not what you think).",
        "You're making this one mistake with [topic] and it's costing you dearly.",
        "If you have [specific problem], you need to watch this entire video.",
        "Your [product/item] is dirtier than you think. Let's look under a microscope.",
        "The ugly truth about the [industry/topic] industry they don't want you to see.",
        "Your [body part] pain isn't from [common reason], it's from this.",
        "This 'healthy' habit is actually making you [negative outcome].",
        "Why you feel so tired all the time.",
    ],
    "Question & Curiosity Hooks": [
        "What if I told you that [common belief] is completely wrong?",
        "Why is nobody talking about this [topic/method]?",
        "How I went from [negative state] to [positive state] in 30 days.",
        "Have you ever wondered how [desirable outcome] is possible with so little effort?",
        "What's the real difference between [item A] and [item B]?",
        "Did you know about the secret feature inside your [common object]?",
        "Can you spot the mistake in this [image/video clip]?",
        "How much does it really cost to [achieve something]?",
    ],
    "Listicle & \"How-To\" Hooks": [
        "3 signs you're about to [achieve a goal/face a problem].",
        "Here's my 5-step process for a perfect [result] every single time.",
        "The top 5 [tools/apps/books] for [niche] that feel like a cheat code.",
        "Here's how to [do something difficult] in under 60 seconds.",
        "The only 3 [exercises/tips/tricks] you'll ever need for [topic].",
        "My 4-part framework for mastering [skill].",
        "7 things I wish I knew before I started [activity].",
        "The A-B-C method for solving [problem].",
    ],
    "Relatability & \"Us vs. Them\" Hooks": [
        "POV: You're a [specific type of person] and this happens every time.",
        "Tell me you're a [niche enthusiast] without telling me you're a [niche enthusiast]. I'll go first.",
        "They don't want you to know this secret about [topic].",
        "Rich people do this one thing differently when it comes to [topic].",
        "The top 1% have been using this [method/tool] for years.",
        "If you remember this, your childhood was awesome.",
        "Finally, someone says it: [common relatable frustration].",
        "Every [specific group] needs to hear this right now."
    ]
};

const bonuses = [
    { title: "Profit Niches Exposed", description: "Our secret list of 20+ underexploited niches where you can go viral fast.", icon: "fa-solid fa-lightbulb" },
    { title: "The 60-Second Video Toolkit", description: "A simple checklist for shooting high-quality viral videos with just your smartphone.", icon: "fa-solid fa-camera" },
    { title: "The Viral Monetization Blueprint", description: "Learn 5 easy ways to turn your newfound views into actual, spendable cash.", icon: "fa-solid fa-sack-dollar" },
];

type Tab = 'Scripts' | 'Hooks' | 'Audio' | 'Bonuses';

interface DFYContentViewProps {
    onOpenSaveModal: (script: Script) => void;
    onUnsaveScript: (scriptId: string) => void;
    isScriptSaved: (script: Script) => boolean;
    scoringScriptId: string | null;
    onVisualize: (scriptId: string, artStyle: string) => void;
    visualizingScriptId: string | null;
    onToggleSpeech: (script: Script) => void;
    speakingScriptId: string | null;
    onRemixScript: (baseScript: Script, newTopic: string) => void;
    isRemixing: boolean;
}

export const DFYContentView: React.FC<DFYContentViewProps> = ({ 
    onOpenSaveModal, onUnsaveScript, isScriptSaved, scoringScriptId,
    onVisualize, visualizingScriptId, onToggleSpeech, speakingScriptId, onRemixScript, isRemixing
}) => {
    const { state: { user } } = useContext(AuthContext);
    const { dispatch: dataDispatch } = useContext(DataContext);
    const [activeTab, setActiveTab] = useState<Tab>('Scripts');
    const [activeNiche, setActiveNiche] = useState('All');
    const [activeTone, setActiveTone] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [dfyScripts, setDfyScripts] = useState<Script[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [remixModalOpen, setRemixModalOpen] = useState(false);
    const [scriptToRemix, setScriptToRemix] = useState<Script | null>(null);

    const addNotification = useCallback((message: string) => {
        if(user) {
           dataDispatch({ type: 'ADD_NOTIFICATION_REQUEST', payload: { message, userId: user.id } });
        }
    }, [dataDispatch, user]);

    useEffect(() => {
        fetch('/data/dfy-scripts.json')
            .then(res => {
                if (!res.ok) { throw new Error(`HTTP error! status: ${res.status}`); }
                return res.json();
            })
            .then((data: Script[]) => {
                setDfyScripts(data);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Failed to load DFY scripts:", err);
                addNotification("Error: Could not load the DFY script library.");
                setIsLoading(false);
            });
    }, [addNotification]);
    
    const tones = useMemo(() => ['All', ...Array.from(new Set(dfyScripts.map(s => s.tone)))], [dfyScripts]);

    const filteredScripts = useMemo(() => {
        let scripts = dfyScripts;
        if (activeNiche !== 'All') {
            scripts = scripts.filter(script => script.niche === activeNiche);
        }
        if (activeTone !== 'All') {
            scripts = scripts.filter(script => script.tone === activeTone);
        }
        if (searchTerm) {
            scripts = scripts.filter(script => 
                script.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                script.script.toLowerCase().includes(searchTerm.toLowerCase()) ||
                script.hook.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        return scripts;
    }, [activeNiche, activeTone, searchTerm, dfyScripts]);
    
    const handleOpenRemixModal = (script: Script) => {
        setScriptToRemix(script);
        setRemixModalOpen(true);
    };

    const handleConfirmRemix = (baseScript: Script, newTopic: string) => {
        onRemixScript(baseScript, newTopic);
        setRemixModalOpen(false);
    };
    
    const handleHookCopy = useCallback((hookText: string) => {
        navigator.clipboard.writeText(hookText);
        addNotification("Hook copied to clipboard!");
    }, [addNotification]);

    const handleDownloadBonus = (title: string) => {
        addNotification(`Generating PDF for "${title}"...`);
        try {
            generateBonusPdf(title);
        } catch (error) {
            console.error("PDF Generation failed:", error);
            addNotification("Sorry, could not generate the PDF at this time.");
        }
    };

    const TabButton: React.FC<{tabName: Tab, currentTab: Tab, children: React.ReactNode, icon: string}> = ({ tabName, currentTab, children, icon }) => (
        <button onClick={() => setActiveTab(tabName)} className={`flex-1 group flex items-center justify-center gap-2 px-3 py-3 text-sm font-bold rounded-t-lg transition-all duration-200 border-b-4 ${currentTab === tabName ? 'text-[#DAFF00] border-[#DAFF00]' : 'text-purple-300 border-transparent hover:text-white hover:bg-[#4A3F7A]/30'}`}>
            <i className={`${icon} transition-colors duration-200 ${currentTab === tabName ? 'text-[#DAFF00]' : 'text-purple-300/70 group-hover:text-white'}`}></i>
            {children}
        </button>
    );

    const FilterButton: React.FC<{label: string, activeLabel: string, onClick: () => void}> = ({ label, activeLabel, onClick }) => (
        <button onClick={onClick} className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors duration-200 ${activeLabel === label ? 'bg-[#DAFF00] text-[#1A0F3C]' : 'bg-[#2A1A5E] text-purple-200 hover:bg-[#4A3F7A]/80'}`}>
            {label}
        </button>
    );


    const renderContent = () => {
        switch (activeTab) {
            case 'Scripts':
                return (
                    <>
                        <div className="flex flex-col md:flex-row gap-4 mb-6">
                            <div className="relative flex-grow">
                                <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-purple-300/50"></i>
                                <input type="text" placeholder="Search all DFY scripts..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-[#1A0F3C] border border-[#4A3F7A] rounded-md py-2.5 pl-10 pr-4 text-[#F0F0F0] placeholder-purple-300/50 focus:ring-2 focus:ring-[#DAFF00] focus:border-[#DAFF00] focus:outline-none transition duration-200" />
                            </div>
                        </div>
                        <div className="space-y-4 mb-6">
                            <div>
                                <h4 className="text-xs font-semibold uppercase text-purple-300/80 mb-2">Filter by Niche</h4>
                                <div className="flex flex-wrap gap-2">
                                    {niches.map(niche => (
                                        <FilterButton key={niche} label={niche} activeLabel={activeNiche} onClick={() => setActiveNiche(niche)} />
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-semibold uppercase text-purple-300/80 mb-2">Filter by Tone</h4>
                                 <div className="flex flex-wrap gap-2">
                                    {tones.map(tone => (
                                        <FilterButton key={tone} label={tone} activeLabel={activeTone} onClick={() => setActiveTone(tone)} />
                                    ))}
                                </div>
                            </div>
                        </div>

                         {isLoading ? (
                            <div className="space-y-6">
                                {[...Array(3)].map((_, i) => <div key={i} className="bg-[#2A1A5E] p-6 rounded-xl animate-pulse h-64"></div>)}
                            </div>
                        ) : filteredScripts.length > 0 ? (
                            <div className="space-y-6">
                                {filteredScripts.map(script => (
                                    <ScriptCard
                                        key={script.id}
                                        script={script}
                                        onOpenSaveModal={onOpenSaveModal}
                                        onUnsave={onUnsaveScript}
                                        isSaved={isScriptSaved(script)}
                                        isScoring={scoringScriptId === script.id}
                                        addNotification={addNotification}
                                        onVisualize={onVisualize}
                                        isVisualizing={visualizingScriptId === script.id}
                                        onRemix={handleOpenRemixModal}
                                        onToggleSpeech={onToggleSpeech}
                                        isSpeaking={speakingScriptId === script.id}
                                    />
                                ))}
                            </div>
                        ) : (
                             <div className="text-center py-16 px-6 bg-[#1A0F3C]/50 rounded-lg border-2 border-dashed border-[#4A3F7A]">
                                <i className="fa-regular fa-face-sad-tear text-4xl text-purple-300 mb-4"></i>
                                <h3 className="mt-2 text-lg font-medium text-[#F0F0F0]">No Scripts Found</h3>
                                <p className="mt-1 text-sm text-purple-200/80">Your search and filter criteria did not match any scripts.</p>
                            </div>
                        )}
                    </>
                );
            case 'Hooks':
                return (
                    <div className="space-y-8">
                        {Object.entries(viralHooks).map(([category, hooks]) => (
                            <div key={category} className="bg-[#2A1A5E]/50 rounded-xl border border-[#4A3F7A]/30 p-6">
                                <h3 className="text-xl font-bold text-[#DAFF00] mb-4">{category}</h3>
                                <div className="space-y-3">
                                    {hooks.map((hook, index) => (
                                        <div key={index} className="flex items-center justify-between gap-4 p-3 bg-[#1A0F3C] rounded-lg">
                                            <p className="text-purple-100 italic">"{hook}"</p>
                                            <button onClick={() => handleHookCopy(hook)} className="text-purple-300 hover:text-white transition-colors duration-200 flex-shrink-0" title="Copy hook"><i className="fa-solid fa-copy"></i></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                );
            case 'Audio':
                return (
                    <div className="bg-[#2A1A5E]/50 rounded-xl border border-[#4A3F7A]/30 p-6 md:p-8 space-y-8">
                        <div className="text-center">
                            <i className="fa-solid fa-headphones-simple text-4xl text-[#DAFF00] mb-3"></i>
                            <h2 className="text-3xl font-bold text-white mb-2">The Trending Audio Masterclass</h2>
                            <p className="text-purple-200 max-w-2xl mx-auto">Your quick-start guide to using trending audio to get more views, even if your content isn't perfect.</p>
                        </div>
                        <div className="space-y-6 text-purple-200/90 leading-relaxed max-w-3xl mx-auto">
                           <div className="border-t border-[#4A3F7A]/50 pt-6">
                                <h3 className="text-xl font-bold text-white mb-3"><span className="text-[#DAFF00]">Step 1:</span> Understand WHY It Works</h3>
                                <p>The algorithm's #1 goal is to keep people on the app. When a sound is trending, the algorithm actively pushes videos using that sound to more users, because it knows people are already engaging with it. By using a trending sound, you're essentially "hitching a ride" on a rocket that's already taking off. It's one of the easiest ways to get your video in front of a new audience.</p>
                           </div>
                           <div className="border-t border-[#4A3F7A]/50 pt-6">
                                <h3 className="text-xl font-bold text-white mb-3"><span className="text-[#DAFF00]">Step 2:</span> How to FIND Trending Audio (The Right Way)</h3>
                                <p className="mb-4">Don't just use any sound you hear. Look for these specific signals:</p>
                                <ul className="space-y-3 pl-5">
                                    <li className="flex items-start gap-3"><i className="fa-solid fa-arrow-up-right-dots text-green-400 mt-1"></i><span>Look for the little arrow icon next to a sound. This is TikTok or Instagram explicitly telling you "This sound is trending RIGHT NOW."</span></li>
                                    <li className="flex items-start gap-3"><i className="fa-solid fa-video text-green-400 mt-1"></i><span>Check the video count. A sound with 5k-50k videos is often in the sweet spot. It's popular, but not yet completely saturated.</span></li>
                                    <li className="flex items-start gap-3"><i className="fa-solid fa-calendar-day text-green-400 mt-1"></i><span>Check the dates on the top videos. Are they from the last few days? If so, the trend is current. If they're from weeks ago, you might have missed the peak.</span></li>
                                </ul>
                           </div>
                            <div className="border-t border-[#4A3F7A]/50 pt-6">
                                <h3 className="text-xl font-bold text-white mb-3"><span className="text-[#DAFF00]">Step 3:</span> Match the Audio to Your Niche</h3>
                                <p>This is the secret sauce. Don't just do the dance. Find a way to apply the audio's theme or format to YOUR niche. If a sound is a "before and after" format, show a before and after of your client's results, your weight loss journey, or a dirty car you detailed. This combination of a familiar trend with your unique content is what makes people stop scrolling.</p>
                           </div>
                           <div className="bg-[#1A0F3C] p-5 rounded-lg border-l-4 border-[#DAFF00]">
                                <h4 className="font-bold text-white">PRO TIP: Save Sounds Instantly</h4>
                                <p className="text-sm mt-1">Whenever you're scrolling and hear a sound you might want to use later, tap the sound and hit "Add to Favorites." Create a collection of potential sounds so you're never starting from scratch when it's time to create.</p>
                           </div>
                        </div>
                    </div>
                );
             case 'Bonuses':
                return (
                     <div className="bg-[#2A1A5E]/50 rounded-xl border border-[#4A3F7A]/30 p-6 md:p-8 space-y-8">
                        <div className="text-center">
                            <i className="fa-solid fa-gift text-4xl text-[#DAFF00] mb-3"></i>
                            <h2 className="text-3xl font-bold text-white mb-2">Your Launch Bonuses</h2>
                            <p className="text-purple-200 max-w-2xl mx-auto">Thank you for your purchase! Here are the special bonuses included with your order.</p>
                        </div>
                        <div className="space-y-6 max-w-3xl mx-auto">
                            {bonuses.map(bonus => (
                                <div key={bonus.title} className="bg-[#1A0F3C] rounded-lg p-5 flex flex-col md:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <i className={`${bonus.icon} text-2xl text-[#DAFF00] w-8 text-center`}></i>
                                        <div>
                                            <h3 className="font-bold text-white">{bonus.title}</h3>
                                            <p className="text-xs text-purple-200">{bonus.description}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => handleDownloadBonus(bonus.title)} className="w-full md:w-auto flex-shrink-0 bg-[#DAFF00] text-[#1A0F3C] font-bold py-2 px-4 rounded-md text-sm hover:bg-opacity-90 transition-all">
                                        <i className="fa-solid fa-download mr-2"></i>Download PDF
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                );
        }
    }

    return (
        <div>
            <RemixScriptModal 
                isOpen={remixModalOpen}
                onClose={() => setRemixModalOpen(false)}
                baseScript={scriptToRemix}
                onConfirmRemix={handleConfirmRemix}
                isRemixing={isRemixing}
            />

            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Done-For-You Content Vault</h1>
                <p className="text-purple-300">Your private library of proven scripts, hooks, and bonuses.</p>
            </div>
            
            <div className="border-b border-[#4A3F7A]/30 mb-6">
                <div className="flex -mb-px">
                    <TabButton tabName="Scripts" currentTab={activeTab} icon="fa-solid fa-scroll">DFY Scripts</TabButton>
                    <TabButton tabName="Hooks" currentTab={activeTab} icon="fa-solid fa-fish-fins">Viral Hooks</TabButton>
                    <TabButton tabName="Audio" currentTab={activeTab} icon="fa-solid fa-headphones-simple">Audio Masterclass</TabButton>
                    <TabButton tabName="Bonuses" currentTab={activeTab} icon="fa-solid fa-gift">Bonuses</TabButton>
                </div>
            </div>
            {renderContent()}
        </div>
    );
};