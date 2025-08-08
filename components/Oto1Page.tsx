
import React from 'react';
import { CheckCircleIcon } from './icons/CheckCircleIcon.tsx';

interface Oto1PageProps {
    onUpgrade: () => void;
    onDecline: () => void;
}

export const Oto1Page: React.FC<Oto1PageProps> = ({ onUpgrade, onDecline }) => {

    const benefits = [
        "UNLIMITED Script Generations",
        "UNLIMITED Niche Searches",
        "UNLIMITED Viral Analysis"
    ];

    const newFeatures = [
        {
            title: "Unlock Advanced Tonal Styles",
            description: "(Humorous, Controversial, Shocking & More!)"
        },
        {
            title: "Unlock The \"Trending Topics\" Forecaster",
            description: ""
        }
    ];

    return (
        <div className="bg-[#1A0F3C] text-[#F0F0F0] antialiased min-h-screen flex items-center justify-center py-12 px-4 relative overflow-hidden">
            <img src="images/oto1-flying-infinity.png" alt="Floating 3D infinity symbol" className="absolute top-1/4 -left-12 w-32 h-32 opacity-10 transform-gpu animate-pulse hidden lg:block" style={{animationDuration: '7s'}} />
            <img src="images/oto1-flying-chart.png" alt="Floating 3D upward chart" className="absolute bottom-1/4 -right-12 w-32 h-32 opacity-10 transform-gpu animate-bounce hidden lg:block" style={{animationDuration: '9s'}} />

            <div className="w-full max-w-4xl mx-auto text-center relative z-10">
                {/* Pattern Interrupt Headline */}
                <h1 className="text-5xl md:text-7xl font-extrabold text-[#DAFF00]" style={{ fontFamily: "'Poppins', sans-serif" }}>
                    WAIT!
                </h1>
                <p className="text-2xl md:text-3xl font-bold mt-2 mb-4">Your Order Is Not Complete...</p>
                <p className="text-lg md:text-xl text-purple-200/80 max-w-3xl mx-auto">
                    You've Made A Smart Choice, But Your Account Is Currently Limited. Read The Page Below To See How To Remove All Restrictions...
                </p>
                <div className="w-24 h-1 bg-[#DAFF00]/50 mx-auto my-12 rounded-full"></div>

                {/* Core Offer */}
                <div className="bg-[#2A1A5E] rounded-2xl p-8 md:p-12 shadow-2xl shadow-[#DAFF00]/5 border border-[#4A3F7A]/50">
                    {/* The Problem */}
                    <p className="text-xl text-purple-200 leading-relaxed italic max-w-3xl mx-auto mb-8">
                        "Right now, you're limited to 30 searches a month. What happens when you find a winning niche on day 5? Your momentum dies. <span className="not-italic font-semibold text-white">The pros never limit their potential.</span>"
                    </p>

                    {/* The Solution Image */}
                    <div className="my-10">
                         <img 
                            src="images/oto1-unlimited-concept.png" 
                            alt="VidScriptHub Unlimited Concept" 
                            className="max-w-md h-auto mx-auto rounded-lg shadow-xl shadow-black/30"
                        />
                    </div>

                    {/* The Upgrade Pitch */}
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-8" style={{ fontFamily: "'Poppins', sans-serif" }}>
                        Upgrade To VidScriptHub <span className="text-[#DAFF00]">UNLIMITED</span> And 10x Your Content Output Instantly.
                    </h2>

                    {/* Benefit List */}
                    <div className="max-w-2xl mx-auto text-left space-y-4 mb-12">
                        {benefits.map((benefit, index) => (
                             <div key={index} className="flex items-center space-x-3 bg-[#1A0F3C]/50 p-4 rounded-lg">
                                <CheckCircleIcon className="w-7 h-7 text-[#DAFF00] flex-shrink-0" />
                                <span className="text-[#F0F0F0] text-lg font-medium">{benefit}</span>
                            </div>
                        ))}
                        {newFeatures.map((feature, index) => (
                             <div key={index} className="flex items-center space-x-3 bg-[#1A0F3C]/50 p-4 rounded-lg">
                                <CheckCircleIcon className="w-7 h-7 text-[#DAFF00] flex-shrink-0" />
                                <div>
                                    <span className="text-[#F0F0F0] text-lg font-bold">
                                        <span className="text-xs uppercase bg-[#DAFF00] text-[#1A0F3C] font-bold px-2 py-0.5 rounded-full mr-2">NEW FEATURE</span>
                                        {feature.title}
                                    </span>
                                    {feature.description && <span className="text-purple-300 ml-1">{feature.description}</span>}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Call to Action (CTA) Block */}
                    <div className="max-w-xl mx-auto">
                        <div className="bg-[#1A0F3C] border-2 border-[#DAFF00] rounded-xl p-6 shadow-lg shadow-[#DAFF00]/20">
                            <h3 className="text-xl font-bold text-white">Get The UNLIMITED Upgrade Now!</h3>
                            <p className="text-5xl font-extrabold text-[#DAFF00] my-3">$67</p>
                            <p className="font-semibold text-white text-lg">One-Time Payment</p>
                            <p className="text-purple-300 text-sm mt-1 line-through">(Normally $47/Month After Launch)</p>
                            <button 
                                onClick={onUpgrade}
                                className="block w-full bg-[#DAFF00] text-[#1A0F3C] font-bold text-xl md:text-2xl uppercase py-5 px-6 rounded-lg shadow-[0_5px_0px_0px_#a8c400] hover:translate-y-1 hover:shadow-[0_4px_0px_0px_#a8c400] transition-all duration-150 ease-in-out mt-6"
                            >
                                YES! UPGRADE MY ACCOUNT NOW!
                            </button>
                        </div>
                        <button 
                            onClick={onDecline}
                            className="block mt-6 text-purple-300/70 hover:text-white transition-colors duration-200 text-sm underline"
                        >
                            No thanks, I don't want to go unlimited. I understand I will lose access to this one-time offer forever and my account will remain limited.
                        </button>
                    </div>
                </div>
                
                 <p className="text-purple-300/40 text-xs mt-8">&copy; {new Date().getFullYear()} Vid Script Hub. All Rights Reserved.</p>
            </div>
        </div>
    );
};
