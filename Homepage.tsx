import React, { useState } from 'react';
import { SparklesIcon, YouTubeIcon, TikTokIcon, InstagramIcon, PlayCircleIcon, LightBulbIcon, ScriptIcon, PhotoIcon, MusicNoteIcon, RocketLaunchIcon, UserGroupIcon, ChevronDownIcon, UserCircleIcon } from './Icons.tsx';
import LoginModal from './LoginModal.tsx';
import { useAppContext } from '../contexts/AppContext.tsx';
import LanguageSwitcher from './LanguageSwitcher.tsx';

const generatedImages = {
    featureBlueprint: `https://storage.googleapis.com/generative-ai-codelabs/Viralyzer%205.0%20App%20Dev/feature_blueprint.jpeg`,
    featureStudio: `https://storage.googleapis.com/generative-ai-codelabs/Viralyzer%205.0%20App%20Dev/feature_studio.jpeg`,
    featureGenerative: `https://storage.googleapis.com/generative-ai-codelabs/Viralyzer%205.0%20App%20Dev/feature_generative.jpeg`,
    featureAutopilot: `https://storage.googleapis.com/generative-ai-codelabs/Viralyzer%205.0%20App%20Dev/feature_autopilot.jpeg`,
    promoVideo: `https://storage.googleapis.com/generative-ai-codelabs/Viralyzer%205.0%20App%20Dev/final_promo_01.mp4`,
    testimonial1: `https://storage.googleapis.com/generative-ai-codelabs/Viralyzer%205.0%20App%20Dev/testimonial_01.jpeg`,
    testimonial2: `https://storage.googleapis.com/generative-ai-codelabs/Viralyzer%205.0%20App%20Dev/testimonial_02.jpeg`,
    testimonial3: `https://storage.googleapis.com/generative-ai-codelabs/Viralyzer%205.0%20App%20Dev/testimonial_03.jpeg`
};

interface FAQItemProps {
    q: string;
    a: string;
}

const FAQItem: React.FC<FAQItemProps> = ({ q, a }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-gray-700 py-6">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center text-left">
                <h4 className="text-lg font-semibold text-white">{q}</h4>
                <ChevronDownIcon className={`w-6 h-6 text-indigo-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && <p className="mt-4 text-gray-400 animate-fade-in">{a}</p>}
        </div>
    );
};

export const LandingPage: React.FC = () => {
    const { t } = useAppContext();
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    
    const year = new Date().getFullYear();

    const workflowFeatures = [
        { titleKey: 'homepage.feature_blueprint_title', descKey: 'homepage.feature_blueprint_desc', image: generatedImages.featureBlueprint, icon: LightBulbIcon },
        { titleKey: 'homepage.feature_studio_title', descKey: 'homepage.feature_studio_desc', image: generatedImages.featureStudio, icon: ScriptIcon },
        { titleKey: 'homepage.feature_generative_title', descKey: 'homepage.feature_generative_desc', image: generatedImages.featureGenerative, icon: PhotoIcon },
        { titleKey: 'homepage.feature_autopilot_title', descKey: 'homepage.feature_autopilot_desc', image: generatedImages.featureAutopilot, icon: RocketLaunchIcon },
    ];
    
    const testimonials = [
        { quoteKey: 'homepage.testimonial1_quote', authorKey: 'homepage.testimonial1_author', image: generatedImages.testimonial1 },
        { quoteKey: 'homepage.testimonial2_quote', authorKey: 'homepage.testimonial2_author', image: generatedImages.testimonial2 },
        { quoteKey: 'homepage.testimonial3_quote', authorKey: 'homepage.testimonial3_author', image: generatedImages.testimonial3 },
    ];

    const faqs = [
        { qKey: 'homepage.faq1_q', aKey: 'homepage.faq1_a' },
        { qKey: 'homepage.faq2_q', aKey: 'homepage.faq2_a' },
        { qKey: 'homepage.faq3_q', aKey: 'homepage.faq3_a' },
        { qKey: 'homepage.faq4_q', aKey: 'homepage.faq4_a' },
    ];

    return (
        <div className="bg-gray-900 text-white">
            <header className="absolute top-0 left-0 right-0 z-10 p-4">
                <div className="container mx-auto flex justify-between items-center">
                    <a href="#" className="flex items-center space-x-2 text-white">
                        <SparklesIcon className="w-7 h-7 text-indigo-500" />
                        <span className="font-bold text-xl">{t('app.name')}</span>
                    </a>
                    <div className="flex items-center space-x-4">
                        <LanguageSwitcher variant="header" />
                        <button onClick={() => setIsLoginModalOpen(true)} className="text-sm font-semibold hover:text-indigo-400">{t('homepage.login')}</button>
                        <button onClick={() => setIsLoginModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-full text-sm">{t('homepage.get_started_free')}</button>
                    </div>
                </div>
            </header>
            
            <main>
                <section className="relative h-screen flex items-center justify-center text-center overflow-hidden">
                    <video autoPlay loop muted playsInline className="absolute z-0 w-auto min-w-full min-h-full max-w-none" poster={generatedImages.featureStudio}>
                        <source src={generatedImages.promoVideo} type="video/mp4" />
                    </video>
                    <div className="absolute inset-0 bg-black/60"></div>
                    <div className="relative z-10 px-4">
                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-600">{t('homepage.title')}</h1>
                        <p className="mt-4 text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">{t('homepage.subtitle')}</p>
                        <button onClick={() => setIsLoginModalOpen(true)} className="mt-8 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-8 rounded-full text-lg transition-transform transform hover:scale-105">{t('homepage.get_started_free')}</button>
                    </div>
                </section>
                
                <section className="py-20 text-center">
                    <p className="text-gray-500 font-semibold uppercase tracking-wider">{t('homepage.social_proof')}</p>
                    <div className="flex justify-center items-center space-x-8 mt-6">
                        <YouTubeIcon className="w-20 h-20 text-gray-600" />
                        <TikTokIcon className="w-16 h-16 text-gray-600" />
                        <InstagramIcon className="w-16 h-16 text-gray-600" />
                    </div>
                </section>

                <section className="py-20 px-4">
                    <div className="container mx-auto text-center">
                        <h2 className="text-3xl md:text-4xl font-bold">{t('homepage.workflow_title')}</h2>
                        <p className="mt-4 text-gray-400 max-w-2xl mx-auto">{t('homepage.workflow_subtitle')}</p>
                        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {workflowFeatures.map((feature, i) => (
                                <div key={i} className="bg-gray-800/50 p-6 rounded-lg text-left">
                                    <feature.icon className="w-8 h-8 text-indigo-400 mb-4" />
                                    <h3 className="text-xl font-bold">{t(feature.titleKey as any)}</h3>
                                    <p className="mt-2 text-gray-400">{t(feature.descKey as any)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="py-20 bg-gray-900/50 px-4">
                    <div className="container mx-auto text-center">
                        <h2 className="text-3xl md:text-4xl font-bold">{t('homepage.testimonials_title')}</h2>
                        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
                             {testimonials.map((testimonial, i) => (
                                <div key={i} className="bg-gray-800 p-8 rounded-lg">
                                    <p className="text-gray-300 italic">"{t(testimonial.quoteKey as any)}"</p>
                                    <div className="flex items-center mt-6">
                                        <img src={testimonial.image} alt={t(testimonial.authorKey as any)} className="w-12 h-12 rounded-full mr-4"/>
                                        <div>
                                            <p className="font-bold text-white">{t(testimonial.authorKey as any).split(',')[0]}</p>
                                            <p className="text-sm text-gray-400">{t(testimonial.authorKey as any).split(',')[1]}</p>
                                        </div>
                                    </div>
                                </div>
                             ))}
                        </div>
                    </div>
                </section>
                
                 <section className="py-20 px-4">
                    <div className="container mx-auto max-w-3xl">
                        <h2 className="text-3xl md:text-4xl font-bold text-center">{t('homepage.faq_title')}</h2>
                        <div className="mt-8">
                            {faqs.map(faq => <FAQItem key={faq.qKey} q={t(faq.qKey as any)} a={t(faq.aKey as any)} />)}
                        </div>
                    </div>
                </section>

                <section className="py-20 text-center bg-gradient-to-t from-indigo-900/30 to-gray-900 px-4">
                    <div className="container mx-auto">
                        <h2 className="text-3xl md:text-4xl font-bold">{t('homepage.cta_title')}</h2>
                        <p className="mt-4 text-gray-400 max-w-xl mx-auto">{t('homepage.cta_subtitle')}</p>
                         <button onClick={() => setIsLoginModalOpen(true)} className="mt-8 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-8 rounded-full text-lg transition-transform transform hover:scale-105">{t('homepage.cta_button')}</button>
                    </div>
                </section>
            </main>
            
            <footer className="py-8 border-t border-gray-800">
                <div className="container mx-auto text-center text-gray-500">
                    <p>{t('homepage.footer_text', { year })}</p>
                </div>
            </footer>

            <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
        </div>
    );
};