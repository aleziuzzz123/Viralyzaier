
import React, { useState } from 'react';
import { SparklesIcon, YouTubeIcon, TikTokIcon, InstagramIcon, PlayCircleIcon, LightBulbIcon, ScriptIcon, PhotoIcon, MusicNoteIcon, RocketLaunchIcon, UserGroupIcon, ChevronDownIcon } from './Icons';
import LoginModal from './LoginModal';
import { useAppContext } from '../contexts/AppContext';
import LanguageSwitcher from './LanguageSwitcher';

// AI-Generated images embedded as Base64 Data URLs.
// You can replace these with your own image files later, e.g., src="/image/hero-app-preview.jpg"
const generatedImages = {
    featureBlueprint: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=`,
    featureScript: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=`,
    featureAssets: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=`,
    avatar1: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAq0lEQVR4nO3WsQ2AMAwAwXgD8eWbWcAB+G1gCKQxJb9JTu7sAIAxGRF/AIgZ621EtG8/EdGS2YYAERFtJbMhQEQk5y0BEJEyZgMQEX+vsg0BImJ/yTYEiIj89rYFqFpjmsY9PzDGYv+dMUaMsb/vbrqd5/l6A4AxlwDAuPz/9wAIwKAyA+cArM8FAMBcDgDGRgB8uAMAwKkyA+cArM8FAMBcDgDGRgB8uAMAwKkyA+cAvA8AALjZDjA/xRgrFDBpAAAAAElFTkSuQmCC`,
    avatar2: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAWklEQVR4nO3WsQkAMAwDQWr/oXstF2hIAnkX14m9GwsA4H/rBhIRkbTtS0S0kcz2hAATERIRbSSzPSFARKTnLQkQETJmJgAR8f+q2Z4QIOL/JdszAkTkt7ctQH0BCAD2t4xif3UoAAAAAElFTkSuQmCC`,
    avatar3: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAABJ0lEQVR4nO2XMQ6CQQxEyxaWFpZGe2M9hgeQMA8gUFi7txc2Fl7CgRwCgnWBMSYkd2baxImX/JLZzKz/nU2W6gMAAJiI171HRLSZzOAFiGg/EdE2Ijp/APpX1k/A3p+A3tZl6b6n3J+u+l5W+i+l+3w/dJ8lA+0oK2dr6F0EJPgAnYgIT0XoTET6KkN/RWiMiKqRERsi8X+MiKxGRGyIxP6xQG5F5L2W67IuAADciQgAERkRIbI/QGxFyL0KkdkcERHvRERsiMj7EiLy/1sRAZ8vXwEA7EYdQIuIeDYwE/9nYBvfgBn5H5m/AVmE1/8BoC5Aav3K+B8V32MiAohYHyBwPSACiFgfoHA9IAKIWB+gcD0gAohYH6BwPSA/gM4UCVv4/58XAAAAAElFTkSuQmCC`,
};


const FAQItem: React.FC<{ question: string, answer: string }> = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-gray-700 py-6">
            <dt>
                <button onClick={() => setIsOpen(!isOpen)} className="flex w-full items-start justify-between text-left text-white">
                    <span className="text-base font-semibold leading-7">{question}</span>
                    <span className="ml-6 flex h-7 items-center">
                        <ChevronDownIcon className={`h-6 w-6 transform transition-transform ${isOpen ? '-rotate-180' : 'rotate-0'}`} />
                    </span>
                </button>
            </dt>
            {isOpen && (
                <dd className="mt-2 pr-12">
                    <p className="text-base leading-7 text-gray-300">{answer}</p>
                </dd>
            )}
        </div>
    );
};

const Homepage: React.FC = () => {
    const { t } = useAppContext();
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

    const testimonials = [
        {
            quote: t('homepage.testimonial1_quote'),
            author: t('homepage.testimonial1_author'),
            handle: "@casey_creates",
            avatar: generatedImages.avatar1,
        },
        {
            quote: t('homepage.testimonial2_quote'),
            author: t('homepage.testimonial2_author'),
            handle: "@techtrends_yt",
            avatar: generatedImages.avatar2,
        },
        {
            quote: t('homepage.testimonial3_quote'),
            author: t('homepage.testimonial3_author'),
            handle: "@growthco",
            avatar: generatedImages.avatar3,
        },
    ];
    
    const workflowSteps = [
        { name: t('project_view.stepper_strategy'), icon: LightBulbIcon },
        { name: t('project_view.stepper_script'), icon: ScriptIcon },
        { name: t('project_view.stepper_assets'), icon: PhotoIcon },
        { name: t('project_view.stepper_storyboard'), icon: MusicNoteIcon },
        { name: t('project_view.stepper_analysis'), icon: SparklesIcon },
        { name: t('project_view.stepper_launch'), icon: RocketLaunchIcon },
    ];
    
    const userPersonas = [
        { icon: LightBulbIcon, title: t('homepage.persona1_title'), description: t('homepage.persona1_desc') },
        { icon: UserGroupIcon, title: t('homepage.persona2_title'), description: t('homepage.persona2_desc') },
        { icon: YouTubeIcon, title: t('homepage.persona3_title'), description: t('homepage.persona3_desc') },
    ];
    
    const faqs = [
        { question: t('homepage.faq1_q'), answer: t('homepage.faq1_a') },
        { question: t('homepage.faq2_q'), answer: t('homepage.faq2_a') },
        { question: t('homepage.faq3_q'), answer: t('homepage.faq3_a') },
        { question: t('homepage.faq4_q'), answer: t('homepage.faq4_a') },
    ];

    return (
        <div className="bg-gray-900 text-white">
            {/* Abstract Shapes */}
            <div className="absolute top-0 left-0 -translate-x-1/4 -translate-y-1/2 w-[60rem] h-[60rem] rounded-full bg-gradient-to-r from-indigo-600/30 to-purple-600/30 blur-3xl opacity-40" aria-hidden="true" />
            <div className="absolute bottom-[-20rem] right-0 translate-x-1/4 w-[50rem] h-[50rem] rounded-full bg-gradient-to-l from-sky-500/30 to-teal-500/30 blur-3xl opacity-30" aria-hidden="true" />

            <div className="relative isolate">
                <header className="absolute top-0 left-0 right-0 z-10 p-4">
                    <div className="container mx-auto flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                            <SparklesIcon className="w-8 h-8 text-indigo-500" />
                            <span className="font-bold text-xl">{t('app.name')}</span>
                        </div>
                         <div className="flex items-center space-x-4">
                            <LanguageSwitcher variant="header" />
                            <button
                                onClick={() => setIsLoginModalOpen(true)}
                                className="font-semibold text-white bg-white/10 px-4 py-2 rounded-full hover:bg-white/20 transition-colors"
                            >
                                {t('homepage.login')}
                            </button>
                        </div>
                    </div>
                </header>

                <main>
                    {/* Hero Section */}
                    <section className="relative pt-40 pb-24 text-center">
                        <div className="container mx-auto px-4">
                            <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 leading-tight">
                                {t('homepage.title')}
                            </h1>
                            <p className="mt-6 text-lg md:text-xl text-gray-300 max-w-3xl mx-auto">
                                {t('homepage.subtitle')}
                            </p>
                            <div className="mt-10">
                                <button
                                    onClick={() => setIsLoginModalOpen(true)}
                                    className="inline-flex items-center justify-center px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg shadow-indigo-500/20"
                                >
                                    {t('homepage.get_started_free')}
                                </button>
                            </div>

                            <div className="mt-16 w-full max-w-4xl mx-auto">
                                <div 
                                    onClick={() => alert("This would open a promo video!")} 
                                    className="aspect-video bg-black rounded-2xl shadow-2xl shadow-indigo-500/10 border border-white/10 ring-1 ring-white/10 flex items-center justify-center cursor-pointer group"
                                >
                                   <div className="relative w-full h-full flex items-center justify-center">
                                       {/* You can add a background thumbnail image here */}
                                       <div className="absolute inset-0 bg-gray-900 opacity-50"></div> 
                                       <PlayCircleIcon className="w-24 h-24 text-white/70 group-hover:text-white transition-colors duration-300 transform group-hover:scale-110" />
                                   </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Social Proof */}
                    <section className="pb-24">
                        <div className="container mx-auto px-4">
                            <p className="text-center text-gray-400 font-semibold">{t('homepage.social_proof')}</p>
                            <div className="mt-8 flex justify-center items-center gap-x-12 opacity-60">
                                <YouTubeIcon className="h-8 text-white" />
                                <TikTokIcon className="h-8 text-white" />
                                <InstagramIcon className="h-10 text-white" />
                            </div>
                        </div>
                    </section>

                    {/* How It Works Section */}
                    <section className="py-24 sm:py-32 bg-white/5">
                         <div className="container mx-auto px-4 text-center">
                             <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{t('homepage.workflow_title')}</h2>
                             <p className="mt-4 text-lg text-gray-400">{t('homepage.workflow_subtitle')}</p>
                             <div className="mt-16 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-4">
                                 {workflowSteps.map((step, index) => (
                                     <React.Fragment key={step.name}>
                                         <div className="flex flex-col items-center gap-3 text-center w-36">
                                            <div className="bg-gray-800 border-2 border-indigo-500/50 rounded-full p-4">
                                                <step.icon className="h-8 w-8 text-indigo-400" />
                                            </div>
                                            <h3 className="font-bold text-white">{step.name}</h3>
                                        </div>
                                        {index < workflowSteps.length - 1 && (
                                            <div className="h-1 w-12 md:h-0.5 md:w-16 bg-gray-700 hidden md:block"></div>
                                        )}
                                     </React.Fragment>
                                 ))}
                             </div>
                         </div>
                    </section>

                     {/* Who is this for Section */}
                    <section className="bg-gray-900 py-24 sm:py-32">
                        <div className="container mx-auto px-4 text-center">
                            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{t('homepage.personas_title')}</h2>
                            <p className="mt-4 text-lg text-gray-400">{t('homepage.personas_subtitle')}</p>
                            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
                                {userPersonas.map(persona => (
                                    <div key={persona.title} className="bg-gray-800/50 border border-gray-700 p-8 rounded-2xl text-left">
                                        <div className="bg-indigo-600/20 text-indigo-400 rounded-lg p-3 inline-block">
                                            <persona.icon className="h-8 w-8" />
                                        </div>
                                        <h3 className="mt-6 text-xl font-bold text-white">{persona.title}</h3>
                                        <p className="mt-2 text-gray-400">{persona.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                    
                    {/* Testimonial Section */}
                    <section className="bg-white/5 py-24 sm:py-32">
                        <div className="container mx-auto px-4">
                            <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
                                {t('homepage.testimonials_title')}
                            </h2>
                            <div className="mt-16 grid grid-cols-1 gap-8 sm:gap-6 lg:grid-cols-3">
                                {testimonials.map((testimonial, index) => (
                                    <div key={index} className="pt-8 sm:inline-block sm:w-full sm:px-4">
                                        <figure className="rounded-2xl bg-gray-800/80 p-8 text-sm leading-6 backdrop-blur-sm border border-white/10">
                                            <blockquote className="text-gray-300">
                                                <p>“{testimonial.quote}”</p>
                                            </blockquote>
                                            <figcaption className="mt-6 flex items-center gap-x-4">
                                                <img className="h-10 w-10 rounded-full bg-gray-700" src={testimonial.avatar} alt="User avatar"/>
                                                <div>
                                                    <div className="font-semibold text-white">{testimonial.author}</div>
                                                    <div className="text-gray-400">{testimonial.handle}</div>
                                                </div>
                                            </figcaption>
                                        </figure>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                    
                     {/* FAQ Section */}
                    <section className="bg-gray-900 py-24 sm:py-32">
                        <div className="container mx-auto px-4 max-w-4xl">
                             <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
                                {t('homepage.faq_title')}
                            </h2>
                            <dl className="mt-10 space-y-4">
                                {faqs.map(faq => <FAQItem key={faq.question} {...faq} />)}
                            </dl>
                        </div>
                    </section>

                     {/* Final CTA Section */}
                    <section className="py-24 sm:py-32">
                        <div className="container mx-auto px-4 text-center">
                            <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">{t('homepage.cta_title')}</h2>
                            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-300">
                                {t('homepage.cta_subtitle')}
                            </p>
                            <div className="mt-10">
                                <button
                                    onClick={() => setIsLoginModalOpen(true)}
                                    className="inline-flex items-center justify-center px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg shadow-indigo-500/20"
                                >
                                    {t('homepage.cta_button')}
                                </button>
                            </div>
                        </div>
                    </section>
                </main>

                <footer className="py-8 border-t border-gray-800">
                    <div className="container mx-auto px-4 text-center text-gray-500">
                        {t('homepage.footer_text', {year: new Date().getFullYear()})}
                    </div>
                </footer>
            </div>
            <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
        </div>
    );
};

export default Homepage;
