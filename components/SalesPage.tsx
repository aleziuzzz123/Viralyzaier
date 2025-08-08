

import React, { useState, useEffect } from 'react';
import { CheckCircleIcon } from './icons/CheckCircleIcon.tsx';
import { PlusIcon } from './icons/PlusIcon.tsx';
import { MinusIcon } from './icons/MinusIcon.tsx';
import { TestimonialCard } from './TestimonialCard.tsx';

const CountdownUnit = ({ value, label }: { value: string; label: string }) => (
    <div className="flex flex-col items-center leading-none">
        <span className="text-xl md:text-2xl font-bold">{value}</span>
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
    </div>
);

interface SalesPageProps {
    onPurchaseClick: () => void;
    onDashboardClick: () => void;
}

const locations = ["Cancún, Mexico", "London, UK", "Sydney, Australia", "Tokyo, Japan", "New York, USA", "Berlin, Germany", "Singapore"];

export const SalesPage: React.FC<SalesPageProps> = ({ onPurchaseClick, onDashboardClick }) => {
    const getInitialSeconds = () => {
        const storedEndDate = localStorage.getItem('vidscripthub_timer_end');
        if (storedEndDate) {
            const endDate = parseInt(storedEndDate, 10);
            const now = new Date().getTime();
            const secondsLeft = Math.round((endDate - now) / 1000);
            if (secondsLeft > 0) {
                return secondsLeft;
            }
        }
        // Set a new timer if none exists or it has expired
        const newEndDate = new Date().getTime() + (4 * 3600 + 29 * 60 + 11) * 1000;
        localStorage.setItem('vidscripthub_timer_end', newEndDate.toString());
        return (4 * 3600 + 29 * 60 + 11);
    };

    const [secondsLeft, setSecondsLeft] = useState(getInitialSeconds);
    const [openFaq, setOpenFaq] = useState<number | null>(0);
    
    // State for dynamic social proof
    const [salesCount, setSalesCount] = useState(() => parseInt(localStorage.getItem('vsh_sales_count') || '17', 10));
    const [lastSaleLocation, setLastSaleLocation] = useState(() => localStorage.getItem('vsh_last_sale_location') || 'Cancún, Mexico');
    const [lastUpdate, setLastUpdate] = useState(3);

    const handleFaqToggle = (index: number) => {
        setOpenFaq(openFaq === index ? null : index);
    };

    // Effect for the countdown timer
    useEffect(() => {
        if (secondsLeft <= 0) return;
        const interval = setInterval(() => {
            setSecondsLeft(seconds => (seconds > 0 ? seconds - 1 : 0));
        }, 1000);
        return () => clearInterval(interval);
    }, [secondsLeft]);
    
    // Effect for dynamic social proof
    useEffect(() => {
        const socialProofInterval = setInterval(() => {
            const newSales = Math.floor(Math.random() * 3) + 1; // Add 1 to 3 new sales
            const newLocation = locations[Math.floor(Math.random() * locations.length)];
            const newUpdateMins = Math.floor(Math.random() * 5) + 1;

            setSalesCount(prev => {
                const updatedCount = prev + newSales;
                localStorage.setItem('vsh_sales_count', updatedCount.toString());
                return updatedCount;
            });
            setLastSaleLocation(newLocation);
            setLastUpdate(newUpdateMins);
            localStorage.setItem('vsh_last_sale_location', newLocation);
        }, 20000); // Update every 20 seconds

        return () => clearInterval(socialProofInterval);
    }, []);

    const formatTime = (totalSeconds: number) => {
        if (totalSeconds <= 0) return { days: '00', hours: '00', minutes: '00', seconds: '00' };
        const days = Math.floor(totalSeconds / 86400).toString().padStart(2, '0');
        const hours = Math.floor((totalSeconds % 86400) / 3600).toString().padStart(2, '0');
        const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
        const seconds = (totalSeconds % 60).toString().padStart(2, '0');
        return { days, hours, minutes, seconds };
    };

    const { days, hours, minutes, seconds } = formatTime(secondsLeft);

    const benefits = [
        "Instantly End 'Creator's Block' Forever.",
        "Automate 99% of Your Viral Content Research.",
        "Leverage Google's AI To Ethically 'Clone' Proven Viral Formulas.",
        "Generate Unlimited Scripts For TikTok, Reels & YouTube Shorts."
    ];
    
    const painPoints = [
        {
            image: "images/pain-graveyard.png",
            alt: "A graveyard for videos with low views.",
            title: "The Content Graveyard",
            text: "You spend hours on what you think is a brilliant video... only to see it die a quiet death with less than 200 views. Another masterpiece, buried.",
            imagePosition: 'left' as const
        },
        {
            image: "images/pain-maze.png",
            alt: "A person lost in a maze representing the algorithm.",
            title: "Lost in the Algorithm Maze",
            text: "You see what works for others but can't replicate it. You're lost, just throwing content at the wall, completely guessing what the mysterious algorithm wants to see.",
            imagePosition: 'right' as const
        },
        {
            image: "images/pain-jail.png",
            alt: "A video post trapped behind bars.",
            title: "Trapped in the '100-View Jail'",
            text: "It feels like you're permanently stuck. No matter how good your content is, you can't break out and reach a real audience. It's the most frustrating feeling in the world.",
            imagePosition: 'left' as const
        }
    ];

    const steps = [
        {
            label: "STEP 1",
            icon: "images/step-icon-01-niche.png",
            alt: "Target icon",
            title: "Enter Your Niche",
            text: "Simply tell the AI what your channel is about. It can be anything from \"Dog Training\" to \"Crypto Investing\" or \"Weight Loss for Moms.\""
        },
        {
            label: "STEP 2",
            icon: "images/step-icon-02-analyze.png",
            alt: "AI Brain icon",
            title: "AI Analyzes The Winners",
            text: "Our Google-powered AI instantly scans YouTube for the top-performing videos in your niche, reverse-engineering what's already proven to go viral."
        },
        {
            label: "STEP 3",
            icon: "images/step-icon-03-scripts.png",
            alt: "Script icon",
            title: "Get Your Perfect Script",
            text: "Watch as our AI crafts and perfects a single, high-virality script for you in real-time, taking it from a rough idea to a 100% optimized masterpiece."
        }
    ];
    
    const bonuses = [
        { title: "LIVE Training: \"The 5-Figure Script Agency Blueprint\"", description: "Join our exclusive live training where we reveal how to land your first 3 high-paying script-writing clients this month.", value: 1997, icon: 'fa-solid fa-chalkboard-user', tier: 'ULTIMATE BONUS' },
        { title: "Private 'Viral Creators' Facebook Group", description: "Get direct access to our team, network with other creators, and get feedback on your videos in our private community.", value: 1197, icon: 'fa-solid fa-users', tier: 'ULTIMATE BONUS' },
        { title: "The 'Profit-Ready' Niche Database", description: "A curated database of 50+ low-competition, high-demand niches ready for you to dominate.", value: 997, icon: 'fa-solid fa-database', tier: 'FAST-ACTION BONUS' },
        { title: "The Viral Monetization Blueprint", description: "Learn 5 easy ways to turn your newfound views into actual, spendable cash.", value: 497, icon: 'fa-solid fa-sack-dollar', tier: 'FAST-ACTION BONUS' },
        { title: "The Ultimate Viral Hook Swipe File", description: "50+ proven, copy-paste hooks you can use to make any script instantly more engaging. A taste of our DFY vault!", value: 297, icon: 'fa-solid fa-file-lines', tier: 'FAST-ACTION BONUS' },
    ];
    const mainProductValue = 497;
    const totalBonusValue = bonuses.reduce((sum, item) => sum + item.value, 0);
    const totalValue = mainProductValue + totalBonusValue;


    const faqs = [
        {
          question: "What exactly is Vid Script Hub?",
          answer: "Vid Script Hub is a Google-powered AI app that analyzes the most viral videos in any niche and then writes you completely unique, high-converting video scripts based on those winning formulas. It's designed to eliminate guesswork and help you create content that the algorithm loves, fast."
        },
        {
          question: "Is this really beginner-friendly?",
          answer: "Absolutely. The entire system is built around a simple 3-step process. If you can type in a topic (like 'dog training'), you have all the technical skills you need to get started. We handle all the complex AI analysis for you."
        },
        {
          question: "What if I don't get results?",
          answer: "That's why we offer a 100% risk-free 30-day money-back guarantee. Try Vid Script Hub, generate scripts, post your videos, and if you're not thrilled with the results and the time you've saved, just contact our support desk for a full, prompt refund. No questions asked."
        },
        {
          question: "Is this a one-time payment or a monthly subscription?",
          answer: "For this special launch period, you can get lifetime access to Vid Script Hub for a low, one-time investment. However, once this launch period ends, the price will significantly increase and likely become a monthly subscription. Acting now locks in your lifetime access forever."
        },
        {
          question: "How do I get access to the app?",
          answer: "Once you complete your purchase, you'll be instantly redirected to our private members' area where you can log in and start using Vid Script Hub immediately. Your login details will also be sent to your email address."
        }
      ];
    
    const testimonials = [
        {
            image: "images/testimonial-01.png",
            alt: "Testimonial from Sarah K.",
            quote: "I was stuck at 200 views for MONTHS. My first video using a VidScriptHub script hit 15,000 views overnight. I'm not exaggerating. This tool is a complete game-changer.",
            name: "Sarah K.",
            location: "Fitness Creator"
        },
        {
            image: "images/testimonial-02.png",
            alt: "Testimonial from Mike P.",
            quote: "The amount of time this saves me is insane. I used to spend a full day on research and writing for one video. Now I can generate a week's worth of proven ideas in about 5 minutes. My productivity has 10x'd.",
            name: "Mike P.",
            location: "Marketing Coach"
        },
        {
            image: "images/testimonial-03.png",
            alt: "Testimonial from Chloe T.",
            quote: "I'm not a creative person naturally, so writer's block was my biggest enemy. VidScriptHub is like having a viral marketing genius on my team 24/7. I finally feel confident hitting 'post'!",
            name: "Chloe T.",
            location: "DIY Channel"
        }
    ];

    return (
        <div className="bg-[#1A0F3C] text-[#F0F0F0] antialiased relative">
             <button
                onClick={onDashboardClick}
                className="absolute top-5 right-5 z-50 border-2 border-[#DAFF00] text-[#DAFF00] font-bold py-2 px-5 rounded-full text-sm hover:bg-[#DAFF00] hover:text-[#1A0F3C] transition-all duration-300"
            >
                Dashboard Login
            </button>
            {/* Top Scarcity Bar */}
            <div className="bg-red-600 text-white p-2.5 text-center sticky top-0 z-40">
                <div className="container mx-auto flex flex-col md:flex-row justify-center items-center font-bold text-sm md:text-base">
                    <p className="uppercase tracking-wide mb-2 md:mb-0 md:mr-6">
                        ATTENTION: PRICE DOUBLES PERMANENTLY WHEN THE TIMER HITS ZERO!
                    </p>
                    <div className="flex items-center space-x-3 md:space-x-4 bg-red-700/50 px-4 py-1 rounded-md">
                        <CountdownUnit value={days} label="Days" />
                        <span className="text-xl md:text-2xl font-bold animate-pulse">:</span>
                        <CountdownUnit value={hours} label="Hours" />
                        <span className="text-xl md:text-2xl font-bold animate-pulse">:</span>
                        <CountdownUnit value={minutes} label="Mins" />
                        <span className="text-xl md:text-2xl font-bold animate-pulse">:</span>
                        <CountdownUnit value={seconds} label="Secs" />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main>
                 {/* 'Above the Fold' Section */}
                 <section className="relative overflow-hidden pt-12 pb-16">
                    {/* Floating Shapes */}
                    <img src="images/shape-sparkle-1.png" alt="abstract sparkle shape" className="absolute top-1/4 -left-8 opacity-10 transform-gpu animate-pulse hidden lg:block" style={{animationDuration: '6s'}} />
                    <img src="images/shape-sparkle-2.png" alt="abstract sparkle shape" className="absolute bottom-0 -right-10 opacity-5 transform-gpu animate-bounce hidden lg:block" style={{animationDuration: '8s'}}/>
                    <img src="images/sales-floating-rocket.png" alt="Floating 3D rocket icon" className="absolute top-1/2 -right-12 w-32 h-32 opacity-10 transform-gpu animate-pulse hidden lg:block" style={{animationDuration: '7s'}} />
                    <img src="images/sales-floating-gem.png" alt="Floating 3D gem icon" className="absolute top-1/3 -left-16 w-32 h-32 opacity-10 transform-gpu animate-bounce hidden lg:block" style={{animationDuration: '9s'}} />

                    <div className="container mx-auto max-w-6xl px-4 relative z-10">
                        {/* Headline & Sub-headline */}
                        <div className="text-center mb-12">
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4" style={{ fontFamily: "'Poppins', sans-serif", lineHeight: 1.2 }}>
                            Leaked 'Viral Clone' A.I. Ethically Hijacks Top-Ranking Videos... And Writes You A <span className="text-[#DAFF00]">Unique Viral Script From Scratch</span> in 37 Seconds.
                            </h1>
                            <p className="max-w-4xl mx-auto text-lg md:text-xl text-purple-200/80">
                                Finally, You Can Command The Algorithm To Make YOU Go Viral... Starting In The Next 5 Minutes.
                            </p>
                        </div>

                        {/* Core Proof Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center mb-12">
                            {/* Left Column: VSL */}
                            <div className="w-full">
                                <p className="text-center text-sm uppercase tracking-widest text-purple-300 mb-2 font-semibold">WATCH THIS 2-MINUTE DEMO TO SEE IT IN ACTION...</p>
                                <div className="aspect-video bg-[#2A1A5E] rounded-lg shadow-2xl overflow-hidden border-2 border-[#4A3F7A] flex items-center justify-center">
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-white">Video Sales Letter (VSL)</p>
                                        <i className="fas fa-play-circle text-6xl text-[#DAFF00] mt-4"></i>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Benefits */}
                            <div className="space-y-4">
                                {benefits.map((benefit, index) => (
                                    <div key={index} className="flex items-start space-x-3 bg-[#2A1A5E]/50 p-4 rounded-lg border border-[#4A3F7A]/50">
                                        <CheckCircleIcon className="w-7 h-7 text-[#DAFF00] flex-shrink-0 mt-0.5" />
                                        <span className="text-[#F0F0F0] text-lg font-medium">{benefit}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* CTA Block */}
                        <div className="bg-gradient-to-b from-[#2A1A5E] to-[#2A1A5E]/80 border border-[#4A3F7A] rounded-xl p-8 md:p-12 text-center max-w-3xl mx-auto">
                            <button
                                onClick={onPurchaseClick}
                                className="block w-full bg-[#DAFF00] text-[#1A0F3C] font-bold text-xl md:text-2xl uppercase py-5 px-6 rounded-lg shadow-[0_5px_0px_0px_#a8c400] hover:translate-y-1 hover:shadow-[0_4px_0px_0px_#a8c400] transition-all duration-150 ease-in-out"
                            >
                                GET INSTANT ACCESS TO VID SCRIPT HUB NOW &raquo;
                            </button>
                            <p className="mt-4 text-purple-200 font-semibold">(Limited Time Launch Price: Just $17)</p>

                            {/* Trust Badges */}
                            <div className="mt-8">
                                <div className="flex justify-center items-center space-x-4 flex-wrap">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-6 filter grayscale opacity-75" />
                                <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-5 filter grayscale opacity-75" />
                                <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-7 filter grayscale opacity-75" />
                                <img src="https://upload.wikimedia.org/wikipedia/commons/f/f3/American_Express_logo.svg" alt="American Express" className="h-7 filter grayscale opacity-75" />
                                </div>
                                <div className="mt-6 inline-flex items-center space-x-2 bg-[#2A1A5E] text-purple-200 text-sm px-4 py-2 rounded-full border border-[#4A3F7A]">
                                    <svg className="w-5 h-5 text-[#DAFF00]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                                    <span className="font-semibold">30-Day Money-Back Guarantee</span>
                                </div>
                            </div>
                        </div>

                        {/* Dynamic Social Proof */}
                        <div className="mt-8 text-center text-purple-300">
                            <p>🔥 {salesCount} Copies Sold In The Last Hour... <span className="text-purple-400/80">(Updated {lastUpdate} minutes ago in {lastSaleLocation})</span></p>
                        </div>
                    </div>
                </section>

                {/* 'DEMO VIDEO' Section */}
                <section className="py-16 md:py-24 bg-[#1A0F3C]">
                    <div className="container mx-auto max-w-5xl px-4 text-center">
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
                            See The 'Viral Clone' A.I. In Action
                        </h2>
                        <p className="mt-4 text-lg md:text-xl text-purple-200/80 max-w-3xl mx-auto">
                            Watch us turn one simple keyword into a perfectly optimized, ready-to-shoot viral video script in under 60 seconds.
                        </p>
                        <div className="mt-12 max-w-4xl mx-auto">
                            {/* Video Player Placeholder */}
                            <div className="aspect-video bg-black rounded-xl shadow-2xl shadow-[#DAFF00]/10 overflow-hidden border-2 border-[#4A3F7A] flex items-center justify-center relative group cursor-pointer">
                                <img src="images/video-thumbnail-placeholder.png" alt="Video demo thumbnail" className="absolute w-full h-full object-cover opacity-40 group-hover:opacity-50 transition-opacity duration-300" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                                <div className="relative z-10 flex flex-col items-center">
                                    <div className="w-20 h-20 md:w-24 md:h-24 bg-white/10 rounded-full flex items-center justify-center border-2 border-white/20 backdrop-blur-sm group-hover:scale-110 group-hover:bg-white/20 transition-transform duration-300">
                                        <i className="fas fa-play text-4xl md:text-5xl text-white ml-2"></i>
                                    </div>
                                    <p className="mt-4 text-white font-bold text-lg tracking-wider">WATCH THE DEMO</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 'Problem & Agitation' Section */}
                <section className="py-16 md:py-24 bg-[#F7F8FC] relative overflow-hidden">
                    {/* Floating Shapes */}
                    <img src="images/shape-blob-1.png" alt="abstract shape" className="absolute -top-8 -left-12 opacity-[0.03] transform-gpu rotate-45 hidden lg:block"/>
                    <img src="images/shape-blob-2.png" alt="abstract shape" className="absolute bottom-10 -right-20 opacity-[0.03] transform-gpu -rotate-12 hidden lg:block"/>
                    
                    <div className="container mx-auto max-w-5xl px-4 relative z-10">
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center text-[#1A1A1A] mb-16 md:mb-20" style={{ fontFamily: "'Poppins', sans-serif" }}>
                            Does This Soul-Crushing Cycle Sound Familiar?...
                        </h2>
                        <div className="space-y-16 md:space-y-24">
                            {painPoints.map((point, index) => (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center">
                                    <div className={`flex justify-center ${point.imagePosition === 'right' ? 'md:order-2' : ''}`}>
                                        <img src={point.image} alt={point.alt} className="rounded-lg shadow-xl mx-auto max-w-full h-auto"/>
                                    </div>
                                    <div className={point.imagePosition === 'right' ? 'md:order-1' : ''}>
                                        <h3 className="text-3xl font-bold text-[#1A1A1A] mb-4 text-center md:text-left" style={{ fontFamily: "'Poppins', sans-serif" }}>{point.title}</h3>
                                        <p className="text-lg text-gray-700 leading-relaxed text-center md:text-left">{point.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-20 md:mt-24 text-center">
                            <p className="text-xl md:text-2xl text-gray-800 italic max-w-4xl mx-auto leading-relaxed">
                                "It's enough to make you want to give up entirely. But what if the game wasn't just fair... what if it was finally <span className="text-[#1A0F3C] font-semibold not-italic">rigged in YOUR favor?</span>"
                            </p>
                        </div>
                    </div>
                </section>

                {/* 'Solution & Reveal' Section */}
                <section className="py-16 md:py-24 bg-[#1A0F3C] relative overflow-hidden">
                     <img src="images/shape-sparkle-3.png" alt="abstract sparkle shape" className="absolute top-20 left-10 opacity-10 transform-gpu animate-bounce hidden lg:block" style={{animationDuration: '4s'}} />
                     <img src="images/shape-sparkle-4.png" alt="abstract sparkle shape" className="absolute bottom-16 right-8 opacity-10 transform-gpu animate-pulse hidden lg:block" style={{animationDuration: '5s'}} />
                     <img src="images/shape-sparkle-5.png" alt="abstract sparkle shape" className="absolute top-1/2 -right-4 opacity-10 transform-gpu animate-pulse hidden lg:block" style={{animationDuration: '3s'}}/>
                    
                    <div className="container mx-auto max-w-6xl px-4 relative z-10">
                        <div className="bg-[#2A1A5E] rounded-2xl p-8 md:p-12 lg:p-16 shadow-2xl shadow-[#DAFF00]/5 border border-[#4A3F7A]/50">
                            {/* Reveal Headline */}
                            <div className="text-center mb-12">
                                <p className="text-lg text-purple-200/90 italic mb-4">
                                    It's Enough To Make You Want To Quit... But It Doesn't Have To Be This Way.
                                </p>
                                <h2 className="text-4xl md:text-5xl lg:text-7xl font-extrabold text-center text-[#F0F0F0] mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>
                                    Introducing... Vid Script Hub
                                </h2>
                                <p className="text-xl md:text-2xl font-bold text-[#DAFF00] text-center max-w-4xl mx-auto leading-relaxed">
                                    The World's First 'Viral Clone' App That Uses Google's AI To Write Profit-Pulling Video Scripts For You In Seconds!
                                </p>
                            </div>

                            {/* Hero Mockup */}
                            <div className="my-12 md:my-16 shadow-2xl shadow-black/50 rounded-lg border-2 border-[#4A3F7A]/80">
                                <img src="images/hero-dashboard-mockup.png" alt="Vid Script Hub Dashboard Mockup" className="w-full h-full object-cover rounded-md" />
                            </div>
                            
                            {/* The "3 Simple Steps" Structure */}
                            <div className="mt-16 md:mt-24">
                                <h3 className="text-3xl md:text-4xl font-bold text-center text-[#F0F0F0] mb-12" style={{ fontFamily: "'Poppins', sans-serif" }}>
                                    Get Ready To Dominate Your Niche In Just 3 Simple Steps...
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    {steps.map((step, index) => (
                                        <div key={index} className="bg-[#1A0F3C] p-8 rounded-xl border-2 border-[#4A3F7A] text-center flex flex-col items-center transition-all duration-300 hover:border-[#DAFF00]/80 hover:-translate-y-2">
                                            <p className="text-base font-bold text-[#DAFF00]/80 tracking-widest mb-4">{step.label}</p>
                                            <div className="w-20 h-20 mb-6 rounded-full bg-[#2A1A5E] flex items-center justify-center">
                                                <img src={step.icon} alt={step.alt} className="w-16 h-16"/>
                                            </div>
                                            <h4 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: "'Poppins', sans-serif" }}>{step.title}</h4>
                                            <p className="text-purple-200/80 leading-relaxed">{step.text}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                
                 {/* 'Feature Explosion' Section */}
                 <section className="py-24 md:py-32 bg-[#F7F8FC]">
                    <div className="container mx-auto max-w-6xl px-4">
                        <div className="relative">
                            <img src="images/icon-product.png" alt="Vid Script Hub product icon" className="hidden lg:block absolute -top-24 left-1/2 -translate-x-1/2 w-28 h-28 z-0 transform-gpu hover:scale-110 transition-transform duration-300" />
                            <img src="images/icon-money-stack.png" alt="Stack of money icon" className="hidden lg:block absolute -top-16 left-0 w-24 h-24 z-0 transform-gpu -rotate-12 hover:rotate-0 transition-transform duration-300" />
                            <img src="images/icon-rocket.png" alt="Rocket icon representing viral growth" className="hidden lg:block absolute -top-16 right-0 w-24 h-24 z-0 transform-gpu rotate-12 hover:rotate-0 transition-transform duration-300" />
                            <img src="images/character-pointing.png" alt="Character pointing to the features" className="hidden lg:block absolute -bottom-24 left-0 w-48 h-auto z-20" />
                            <img src="images/character-amazed.png" alt="Character amazed by the features" className="hidden lg:block absolute -bottom-24 right-0 w-48 h-auto z-20" />

                            <div className="relative z-10 max-w-3xl mx-auto bg-white text-[#1A1A1A] rounded-2xl shadow-2xl p-8 md:p-12 lg:p-16 border border-gray-200">
                                <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-8" style={{ fontFamily: "'Poppins', sans-serif" }}>
                                    VidScriptHub Is The ONLY Software On The Market That...
                                </h2>
                                <ul className="space-y-4">
                                    {[
                                        "Turns viral trends into unstoppable script machines.",
                                        "Saves you dozens of hours of manual research effort.",
                                        "Automates the both brainstorming AND writing process.",
                                        "Requires ZERO funnels, coding, or complicated tools.",
                                        "Explodes your list with viral energy by getting you more views.",
                                        "Gives you the confidence to post content consistently."
                                    ].map((benefit, index) => (
                                        <li key={index} className="flex items-start text-lg">
                                            <span className="text-2xl mr-4">⭐</span>
                                            <span className="text-gray-800 leading-relaxed pt-0.5">{benefit}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>
                
                {/* 'Social Proof & Trust' Section */}
                <section className="py-16 md:py-24 bg-[#1A0F3C] relative overflow-hidden">
                    {/* Floating Shapes */}
                    <img src="images/shape-sparkle-6.png" alt="abstract sparkle shape" className="absolute top-10 -right-10 opacity-10 transform-gpu animate-pulse hidden lg:block" style={{animationDuration: '5s'}} />
                    <img src="images/shape-sparkle-7.png" alt="abstract sparkle shape" className="absolute bottom-24 -left-5 opacity-10 transform-gpu animate-bounce hidden lg:block" style={{animationDuration: '7s'}}/>
                    
                    <div className="container mx-auto max-w-5xl px-4 relative z-10">
                        {/* Headline */}
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#F0F0F0]" style={{ fontFamily: "'Poppins', sans-serif", lineHeight: 1.3 }}>
                               PROOF: See How Regular People Are Turning A Single Keyword Into 10,000+ Views... <span className="text-[#DAFF00]">In Their First 24 Hours.</span>
                            </h2>
                            <p className="mt-4 text-lg md:text-xl text-purple-200/80 max-w-3xl mx-auto">
                                This isn't theory. This is what our members are posting right now.
                            </p>
                        </div>

                        {/* Wall of Proof Placeholder */}
                        <div className="my-12 md:my-16 shadow-2xl shadow-black/50 rounded-lg border-2 border-[#4A3F7A]/80">
                           <img src="images/wall-of-proof.png" alt="A collage of testimonials and positive results" className="w-full h-full object-cover rounded-md" />
                        </div>
                        
                        {/* Dynamic Testimonials */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-16">
                            {testimonials.map((testimonial, index) => (
                                <TestimonialCard 
                                    key={index}
                                    {...testimonial}
                                />
                            ))}
                        </div>
                    </div>
                </section>

                {/* 'Human Element' Section */}
                <section className="py-16 md:py-24 bg-[#1A0F3C] text-[#F0F0F0] relative overflow-hidden">
                    <div className="container mx-auto max-w-6xl px-4 relative z-10">
                        <div className="text-center mb-16 md:mb-20">
                            <h2 className="text-4xl md:text-5xl font-bold" style={{ fontFamily: "'Poppins', sans-serif" }}>
                                Let's Break Down Exactly How You'll Win.
                            </h2>
                        </div>
                        
                        <div className="space-y-16 md:space-y-24">
                            {/* Row 1 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center">
                                <div className="text-center md:text-left">
                                    <h3 className="text-3xl font-bold text-[#DAFF00] mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>
                                        The End of the "Blank Page"
                                    </h3>
                                    <p className="text-lg text-purple-200/90 leading-relaxed">
                                        VidScriptHub eliminates your biggest enemy: creative block. You'll never stare at a blank screen wondering what to say again. Our AI delivers proven, structured ideas on demand.
                                    </p>
                                </div>
                                <div className="relative flex justify-center items-center">
                                    <img src="images/float-shape-01.png" alt="abstract floating shape" className="absolute w-full max-w-md h-auto opacity-10 -z-1" />
                                    <img src="images/human-element-01.png" alt="A content creator feeling confident" className="relative z-10 rounded-lg shadow-2xl shadow-black/30 max-w-sm w-full" />
                                </div>
                            </div>

                            {/* Row 2 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center">
                                 <div className="relative flex justify-center items-center md:order-1">
                                    <img src="images/float-shape-02.png" alt="abstract floating shape" className="absolute w-full max-w-md h-auto opacity-10 -z-1" />
                                    <img src="images/human-element-02.png" alt="A person analyzing data on a screen" className="relative z-10 rounded-lg shadow-2xl shadow-black/30 max-w-sm w-full" />
                                </div>
                                <div className="text-center md:text-left md:order-2">
                                    <h3 className="text-3xl font-bold text-[#DAFF00] mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>
                                        From Raw Data To Perfect Scripts
                                    </h3>
                                    <p className="text-lg text-purple-200/90 leading-relaxed">
                                        Our system doesn't just guess. It analyzes real-time viral trends and transforms that complex data into simple, powerful scripts you can use immediately to get results.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Proof of Views Section */}
                <section className="py-16 md:py-24 bg-[#1A0F3C]">
                    <div className="container mx-auto max-w-5xl px-4 text-center">
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#F0F0F0] tracking-tight uppercase" style={{ fontFamily: "'Poppins', sans-serif" }}>
                            WE PULLED OVER 508,084 VIEWS IN JUST 90 DAYS
                        </h2>
                        <h3 className="mt-4 text-3xl md:text-4xl font-extrabold inline-block text-center" style={{ fontFamily: "'Poppins', sans-serif" }}>
                            <span className="bg-[#4A3F7A] text-white px-6 py-3 rounded-lg shadow-lg border-b-4 border-red-500">
                                ALL FROM FACELESS VIDEOS
                            </span>
                        </h3>
                        <div className="mt-12 max-w-4xl mx-auto">
                            <img 
                                src="images/income-proof.png" 
                                alt="Analytics screenshot showing over 508,084 views in 90 days from faceless videos" 
                                className="rounded-xl shadow-2xl w-full h-auto border-4 border-[#4A3F7A]"
                            />
                        </div>
                    </div>
                </section>

                {/* 'Founder's Message' Section */}
                <section className="py-16 md:py-24 bg-[#2A1A5E] text-white">
                    <div className="container mx-auto max-w-4xl px-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                            <div className="md:col-span-1 flex justify-center">
                                <img src="images/founder-alex-jego.png" alt="Alex Jego, Founder of Vid Script Hub" className="w-48 h-48 rounded-full object-cover border-4 border-[#DAFF00] shadow-2xl" />
                            </div>
                            <div className="md:col-span-2 text-center md:text-left">
                                <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>A Message From The Creator</h2>
                                <p className="text-lg text-purple-200/90 leading-relaxed mb-4 italic">
                                    "I was stuck. I knew video was the future, but every time I tried to create content, I'd either get stuck with writer's block, or my videos would flop. I saw others going viral and I couldn't figure out the 'secret'. So, I decided to build it."
                                </p>
                                <p className="text-lg text-purple-200/90 leading-relaxed">
                                    "Vid Script Hub is the tool I wish I had. It's not about guessing; it's about using proven data to give every creator, including you, a fair shot at success. My mission is to level the playing field. Let's make something amazing together."
                                </p>
                                <p className="mt-6 font-bold text-white text-xl">Alex Jego</p>
                                <p className="text-purple-300">Founder, Vid Script Hub</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 'Bonuses & Offer Stack' Section */}
                <section id="offer" className="py-16 md:py-24 bg-[#F7F8FC] text-[#1A1A1A]">
                    <div className="container mx-auto max-w-6xl px-4">
                        <div className="text-center mb-16 md:mb-20">
                            <h2 className="text-4xl md:text-5xl font-extrabold text-[#1A1A1A]" style={{ fontFamily: "'Poppins', sans-serif" }}>
                                Here's Everything You're Getting Today
                            </h2>
                            <p className="mt-4 text-lg text-gray-700 max-w-3xl mx-auto">
                                When you act now, you don't just get the core VidScriptHub app. You get the entire <span className="font-bold">Launch VIP Package</span>, worth over $4,990, absolutely free.
                            </p>
                        </div>
                        
                        <div className="max-w-4xl mx-auto space-y-6">
                            {/* Main Product */}
                            <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-[#1A0F3C] flex flex-col md:flex-row gap-6 items-center">
                                <div className="w-20 h-20 bg-[#1A0F3C] rounded-lg flex items-center justify-center flex-shrink-0">
                                     <i className="fa-solid fa-rocket text-4xl text-[#DAFF00]"></i>
                                </div>
                                <div className="flex-grow text-center md:text-left">
                                    <h3 className="text-2xl font-bold text-[#1A1A1A]">VidScriptHub Main App</h3>
                                    <p className="text-gray-700">The complete, unrestricted access to our revolutionary AI script writing hub.</p>
                                </div>
                                <div className="font-bold text-lg text-center md:text-right flex-shrink-0">
                                    <p className="text-gray-500 line-through text-sm">$997</p>
                                    <p className="text-[#1A1A1A]">Value: ${mainProductValue}</p>
                                </div>
                            </div>
                            
                            {/* Bonuses */}
                            {bonuses.map((bonus, index) => (
                                <div key={index} className="bg-white p-5 rounded-xl shadow-lg border border-gray-200 flex flex-col md:flex-row gap-5 items-center">
                                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <i className={`${bonus.icon} text-3xl text-[#1A1A1A]`}></i>
                                    </div>
                                    <div className="flex-grow text-center md:text-left">
                                        <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                                            <span className="text-sm font-bold bg-yellow-400 text-black px-2 py-0.5 rounded-full">{bonus.tier}</span>
                                            <h3 className="text-xl font-bold text-[#1A1A1A]">{bonus.title}</h3>
                                        </div>
                                        <p className="text-gray-600 text-sm">{bonus.description}</p>
                                    </div>
                                    <div className="font-bold text-lg text-gray-800 flex-shrink-0">
                                        Value: ${bonus.value}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Value Summary & Final CTA */}
                        <div className="mt-20 md:mt-24 text-center max-w-3xl mx-auto">
                            <div className="border-2 border-dashed border-gray-400 rounded-xl p-8 mb-8">
                                <p className="text-2xl font-semibold text-gray-600 uppercase tracking-wider">Total Value You Get Today:</p>
                                <p className="text-7xl md:text-8xl font-extrabold text-[#1A1A1A] my-2">${totalValue.toLocaleString()}</p>
                            </div>
                            
                            <p className="text-xl font-medium text-gray-800 mb-4">Get Everything You See Above...</p>
                            
                             <button
                                onClick={onPurchaseClick}
                                className="block w-full bg-[#DAFF00] text-[#1A0F3C] font-bold text-xl md:text-2xl uppercase py-5 px-6 rounded-lg shadow-[0_5px_0px_0px_#a8c400] hover:translate-y-1 hover:shadow-[0_4px_0px_0px_#a8c400] transition-all duration-150 ease-in-out"
                            >
                                CLICK HERE TO GET VIDSCRIPTHUB + ALL BONUSES
                            </button>
                            <p className="mt-4 text-[#1A0F3C] font-bold text-lg">For A One-Time Investment Of Just $17</p>

                             {/* Trust Badges */}
                             <div className="mt-8">
                                <div className="flex justify-center items-center space-x-4 flex-wrap">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-6 filter grayscale opacity-60" />
                                <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-5 filter grayscale opacity-60" />
                                <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-7 filter grayscale opacity-60" />
                                <img src="https://upload.wikimedia.org/wikipedia/commons/f/f3/American_Express_logo.svg" alt="American Express" className="h-7 filter grayscale opacity-60" />
                                </div>
                                <div className="mt-6 inline-flex items-center space-x-2 bg-white text-gray-700 text-sm px-4 py-2 rounded-full border border-gray-300">
                                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                                    <span className="font-semibold">30-Day Money-Back Guarantee</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                 {/* 'FAQ & Guarantee' Section */}
                <section className="py-16 md:py-24 bg-[#F7F8FC] text-[#1A1A1A]">
                    <div className="container mx-auto max-w-4xl px-4">
                        <div className="text-center mb-16">
                            <h2 className="text-4xl md:text-5xl font-bold" style={{ fontFamily: "'Poppins', sans-serif" }}>Still Have Questions? We Have Answers.</h2>
                            <p className="mt-4 text-lg text-gray-700">We want you to be 100% confident in your decision to join Vid Script Hub today.</p>
                        </div>

                        <div className="max-w-3xl mx-auto space-y-4">
                            {faqs.map((faq, index) => (
                                <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                                    <button 
                                        onClick={() => handleFaqToggle(index)}
                                        className="w-full flex justify-between items-center p-5 text-left font-semibold text-lg bg-white hover:bg-gray-50 transition-colors"
                                    >
                                        <span>{faq.question}</span>
                                        {openFaq === index ? <MinusIcon className="w-6 h-6 text-[#1A1A1A]" /> : <PlusIcon className="w-6 h-6 text-[#1A1A1A]" />}
                                    </button>
                                    <div className={`transition-all duration-300 ease-in-out ${openFaq === index ? 'max-h-96' : 'max-h-0'}`}>
                                        <div className="p-5 bg-white border-t border-gray-200">
                                            <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            <footer className="text-center py-8 bg-[#1A0F3C] border-t border-[#4A3F7A]/30">
                 <p className="text-purple-300/60 text-sm">&copy; {new Date().getFullYear()} Vid Script Hub. All Rights Reserved.</p>
            </footer>
        </div>
    );
};