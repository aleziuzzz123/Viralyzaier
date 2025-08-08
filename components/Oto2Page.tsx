
import React from 'react';

interface Oto2PageProps {
    onUpgrade: () => void;
    onDecline: () => void;
}

export const Oto2Page: React.FC<Oto2PageProps> = ({ onUpgrade, onDecline }) => {

    const features = [
        {
            icon: "images/oto2-icon-scripts.png",
            alt: "Icon of stacked scripts",
            headline: "100+ DFY Viral Scripts",
            text: "Get instant access to our vault of proven scripts in the hottest niches like Make Money, Weight Loss, and Fitness."
        },
        {
            icon: "images/oto2-icon-hooks.png",
            alt: "Icon of a fishing hook",
            headline: "50+ 'Viral Hook' Swipe File",
            text: "A fill-in-the-blank library of scroll-stopping hooks you can use to make any video instantly more engaging."
        },
        {
            icon: "images/oto2-icon-audio.png",
            alt: "Icon of sound waves",
            headline: "Trending Audio Cheat Sheet",
            text: "Our simple guide to spotting and using trending sounds on TikTok & Reels to trick the algorithm into giving you views."
        }
    ];

    return (
        <div className="bg-[#F7F8FC] text-[#1A1A1A] antialiased min-h-screen flex flex-col justify-center py-12 px-4 relative overflow-hidden">
            <img src="images/oto2-flying-folder.png" alt="Floating 3D folder icon" className="absolute top-1/4 -left-12 w-32 h-32 opacity-5 transform-gpu animate-bounce hidden lg:block" style={{animationDuration: '9s'}} />
            <img src="images/oto2-flying-star.png" alt="Floating 3D star icon" className="absolute bottom-1/3 -right-12 w-28 h-28 opacity-5 transform-gpu animate-pulse hidden lg:block" style={{animationDuration: '7s'}} />

            <div className="w-full max-w-5xl mx-auto text-center relative z-10">

                {/* Headline */}
                <h1 className="text-4xl md:text-6xl font-extrabold" style={{ fontFamily: "'Poppins', sans-serif" }}>
                    Want To Put VidScriptHub On <span className="text-[#2A1A5E]">Complete Autopilot?</span>
                </h1>
                <p className="text-lg md:text-xl font-semibold mt-4 text-gray-700 max-w-3xl mx-auto">
                    This Is Your ONE CHANCE To Clone Our Private "Done-For-You" Vault of Profit-Ready Scripts & Viral Assets...
                </p>
                <div className="w-24 h-1.5 bg-gray-300 mx-auto my-12 rounded-full"></div>

                {/* Core Offer */}
                <div className="bg-white rounded-2xl p-8 md:p-12 shadow-xl border border-gray-200">
                    {/* The Problem */}
                    <p className="text-xl text-gray-600 leading-relaxed italic max-w-3xl mx-auto mb-8">
                        "You now have the tool to create amazing scripts... but you still have to do the initial research. <span className="font-semibold text-[#1A1A1A] not-italic">What if you're too busy? Or just want the fastest results possible?</span>"
                    </p>

                    {/* The Solution Image */}
                    <div className="my-10">
                        <img 
                            src="images/oto2-dfy-vault.png" 
                            alt="VidScriptHub DFY Content Vault" 
                            className="max-w-xl h-auto mx-auto rounded-lg shadow-2xl"
                        />
                    </div>
                    
                    {/* The Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center my-16">
                        {features.map((feature, index) => (
                            <div key={index} className="flex flex-col items-center">
                                <img src={feature.icon} alt={feature.alt} className="h-20 w-20 mb-4"/>
                                <h3 className="text-xl font-bold text-[#1A1A1A] mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>{feature.headline}</h3>
                                <p className="text-gray-600 leading-relaxed">{feature.text}</p>
                            </div>
                        ))}
                    </div>

                    {/* Showcase Section */}
                    <div className="my-16 text-left max-w-3xl mx-auto">
                        <h3 className="text-2xl md:text-3xl font-bold text-center text-[#1A1A1A] mb-8" style={{ fontFamily: "'Poppins', sans-serif" }}>Here's A Taste Of What's Inside The Vault...</h3>

                        {/* DFY Scripts Showcase */}
                        <div className="bg-[#F7F8FC] p-6 rounded-lg shadow-md border border-gray-200 mb-6">
                            <h4 className="font-bold text-xl text-[#1A1A1A] mb-3">Instantly Download Scripts Like:</h4>
                            <ul className="list-disc list-inside space-y-2 text-gray-700">
                                <li>"3 'Healthy' Foods That Are Actually Scams"</li>
                                <li>"The Easiest Side Hustle You Can Start TODAY"</li>
                                <li>"This Fitness Myth is Destroying Your Progress"</li>
                                <li>"Why Your 'Perfect' Lawn is an Ecological Dead Zone"</li>
                                <li className="font-semibold">"... and 96+ more proven winners!"</li>
                            </ul>
                        </div>

                        {/* Viral Hooks Showcase */}
                        <div className="bg-[#F7F8FC] p-6 rounded-lg shadow-md border border-gray-200">
                            <h4 className="font-bold text-xl text-[#1A1A1A] mb-3">Copy-Paste Hooks From Our Swipe File:</h4>
                            <ul className="list-disc list-inside space-y-2 text-gray-700 italic">
                                <li>"Everything you know about [topic] is a lie."</li>
                                <li>"The real reason you're failing at [goal]. (It's not what you think)."</li>
                                <li>"3 signs you're about to [achieve a goal/face a problem]."</li>
                                <li className="font-semibold not-italic">"... and 47+ more scroll-stoppers!"</li>
                            </ul>
                        </div>
                    </div>

                    {/* Irresistible Extra */}
                    <div className="max-w-3xl mx-auto my-12">
                        <div className="bg-gradient-to-r from-purple-800 to-indigo-700 text-white rounded-xl p-8 shadow-2xl border-2 border-purple-400">
                            <h3 className="text-center text-3xl font-extrabold tracking-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>
                                <span className="text-yellow-300">PLUS:</span> Your Vault Is Always Growing!
                            </h3>
                            <p className="text-center mt-4 text-purple-200 leading-relaxed text-lg">
                                We add <span className="font-bold text-white bg-yellow-400/20 px-2 py-1 rounded">20 NEW, PROFESSIONALLY-WRITTEN DFY SCRIPTS</span> to your vault EVERY single month. You'll always have the freshest, most relevant content at your fingertips, forever!
                            </p>
                        </div>
                    </div>


                    {/* Call to Action (CTA) Block */}
                    <div className="max-w-xl mx-auto">
                        <button 
                            onClick={onUpgrade}
                            className="block w-full bg-[#DAFF00] text-[#1A0F3C] font-bold text-xl md:text-2xl uppercase py-5 px-6 rounded-lg shadow-[0_5px_0px_0px_#a8c400] hover:translate-y-1 hover:shadow-[0_4px_0px_0px_#a8c400] transition-all duration-150 ease-in-out"
                        >
                            YES! Add The DFY Content Bank To My Order!
                        </button>
                        <button 
                            onClick={onDecline}
                            className="block mt-6 text-gray-500 hover:text-black transition-colors duration-200 text-sm underline"
                        >
                            No thanks, I'm happy to do all the research and hard work myself.
                        </button>
                    </div>
                </div>
            </div>
             <p className="text-gray-400 text-xs mt-8 text-center">&copy; {new Date().getFullYear()} Vid Script Hub. All Rights Reserved.</p>
        </div>
    );
};
