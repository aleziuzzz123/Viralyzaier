
import React from 'react';

interface Oto3PageProps {
    onUpgrade: () => void;
    onDecline: () => void;
}

export const Oto3Page: React.FC<Oto3PageProps> = ({ onUpgrade, onDecline }) => {

    const profitPaths = [
        {
            headline: "Your Own Turnkey Software Business",
            image: "images/oto3-funnel.png",
            alt: "A sales funnel diagram",
            text: "We will give you a special link. You just send traffic to it. We've already built the high-converting sales pages, we handle the product delivery, and we handle all the customer support. You simply collect 100% of the profits from every sale in the funnel."
        },
        {
            headline: "Your Own Script-Writing Agency",
            image: "images/oto3-agency-dashboard.png",
            alt: "An agency dashboard showing multiple clients",
            text: "Instantly unlock the Agency Dashboard inside your account, allowing you to add up to 10 clients. Charge them monthly for viral script services and use VidScriptHub to do all the work for you in minutes. A true business-in-a-box."
        }
    ];

    return (
        <div className="bg-[#1A0F3C] text-[#F0F0F0] antialiased min-h-screen flex flex-col items-center justify-center py-12 px-4 relative overflow-hidden">
            <img src="images/oto3-flying-crown.png" alt="Floating 3D crown icon" className="absolute top-20 -left-12 w-28 h-28 opacity-10 transform-gpu animate-bounce hidden lg:block" style={{animationDuration: '9s'}} />
            <img src="images/oto3-flying-briefcase.png" alt="Floating 3D briefcase icon" className="absolute bottom-1/4 -right-16 w-32 h-32 opacity-10 transform-gpu animate-pulse hidden lg:block" style={{animationDuration: '7s'}} />

            <div className="w-full max-w-5xl mx-auto text-center relative z-10">

                {/* Headline */}
                <h1 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: "'Poppins', sans-serif" }}>
                    FINAL UPGRADE: Don't Just Use VidScriptHub...
                </h1>
                <p className="text-4xl md:text-6xl lg:text-7xl font-extrabold mt-2 mb-4 text-[#DAFF00]" style={{ fontFamily: "'Poppins', sans-serif", lineHeight: 1.2 }}>
                    SELL IT AS YOUR OWN
                </p>
                <p className="text-2xl md:text-3xl font-bold">And Keep 100% Of The Profits!</p>
                
                <div className="w-24 h-1 bg-[#DAFF00]/50 mx-auto my-12 rounded-full"></div>

                {/* Core Offer */}
                <div className="bg-[#2A1A5E] rounded-2xl p-8 md:p-12 shadow-2xl shadow-[#DAFF00]/5 border border-[#4A3F7A]/50">
                    <p className="text-xl text-purple-200 leading-relaxed italic max-w-3xl mx-auto mb-12">
                       "You've seen the power of VidScriptHub. You know it works. This is your one and only chance to get on the other side of the table and turn our proven product into your personal income stream."
                    </p>
                    
                    {/* Two Paths to Profit */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 my-12 text-left">
                        {profitPaths.map((path, index) => (
                             <div key={index} className="bg-[#1A0F3C] p-6 rounded-xl border border-[#4A3F7A]">
                                 <h3 className="text-2xl font-bold text-[#DAFF00] mb-4 text-center" style={{ fontFamily: "'Poppins', sans-serif" }}>{path.headline}</h3>
                                 <img src={path.image} alt={path.alt} className="rounded-lg shadow-lg mb-4 w-full h-auto" />
                                 <p className="text-purple-200/90 leading-relaxed">{path.text}</p>
                            </div>
                        ))}
                    </div>

                    {/* Proof of Ownership */}
                    <div className="my-12">
                         <h3 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>You Get The Official License To Do Both!</h3>
                         <img 
                            src="images/oto3-license.png" 
                            alt="Official Agency & Reseller License Certificate" 
                            className="max-w-2xl h-auto mx-auto rounded-lg shadow-2xl border-2 border-[#DAFF00]/50"
                        />
                    </div>

                    {/* Income Proof Section */}
                    <div className="my-16">
                        <h3 className="text-3xl font-bold text-white mb-6" style={{ fontFamily: "'Poppins', sans-serif" }}>
                            Visualize Your Potential Earnings...
                        </h3>
                        <p className="text-lg text-purple-200/80 max-w-3xl mx-auto mb-8">
                            Our top resellers are already seeing results like this. With a proven, high-converting offer, your affiliate dashboard could look like this too.
                        </p>
                        <img 
                            src="images/oto3-earnings-proof.png" 
                            alt="A dashboard showing reseller earnings of over $1,500" 
                            className="max-w-2xl h-auto mx-auto rounded-lg shadow-2xl border-2 border-[#4A3F7A]/80 [filter:drop-shadow(0_10px_15px_rgba(218,255,0,0.1))]"
                        />
                    </div>


                    {/* Call to Action (CTA) Block */}
                    <div className="max-w-xl mx-auto mt-12">
                        <button onClick={onUpgrade} className="block w-full bg-[#DAFF00] text-[#1A0F3C] font-bold text-xl md:text-2xl uppercase py-5 px-6 rounded-lg shadow-[0_5px_0px_0px_#a8c400] hover:translate-y-1 hover:shadow-[0_4px_0px_0px_#a8c400] transition-all duration-150 ease-in-out">
                            YES! I Want The Agency & Reseller License To VidScriptHub!
                        </button>
                        <button onClick={onDecline} className="block mt-6 text-purple-300/70 hover:text-white transition-colors duration-200 text-sm underline">
                           No thanks, I understand this is my only chance to get a reseller license and I'm happy to pass on keeping 100% of the profits.
                        </button>
                    </div>
                </div>
            </div>
             <p className="text-purple-300/40 text-xs mt-8 text-center">&copy; {new Date().getFullYear()} Vid Script Hub. All Rights Reserved.</p>
        </div>
    );
};
