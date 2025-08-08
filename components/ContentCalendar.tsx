import React, { useState } from 'react';
import { SparklesIcon, XCircleIcon } from './Icons.tsx';
import { getSchedulingSuggestion } from '../services/geminiService.ts';
import { useAppContext } from '../contexts/AppContext.tsx';

interface CalendarProps {
}

// Helper to get days in a month
const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

interface ParsedSuggestionProps {
    text: string;
}

const ParsedSuggestion: React.FC<ParsedSuggestionProps> = ({ text }) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return (
        <p className="text-gray-300 text-lg">
            {parts.map((part, index) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={index} className="text-indigo-300">{part.slice(2, -2)}</strong>;
                }
                return part;
            })}
        </p>
    );
};

const ContentCalendar: React.FC<CalendarProps> = () => {
    const { projects, consumeCredits, addToast, setActiveProjectId, t } = useAppContext();
    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    
    // State for AI Assistant
    const [isAssistantLoading, setIsAssistantLoading] = useState(false);
    const [assistantResult, setAssistantResult] = useState<string | null>(null);
    const [assistantTopic, setAssistantTopic] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

    const calendarDays = Array.from({ length: firstDay }, (_, i) => ({ key: `empty-${i}`, date: null, projects: [] }))
        .concat(Array.from({ length: daysInMonth }, (_, i) => {
            const dayDate = new Date(currentYear, currentMonth, i + 1);
            const dayProjects = projects.filter(p => {
                if (!p.scheduledDate) return false;
                const pDate = new Date(p.scheduledDate);
                return pDate.getFullYear() === currentYear && pDate.getMonth() === currentMonth && pDate.getDate() === (i + 1);
            });
            return { key: dayDate.toISOString(), date: dayDate, projects: dayProjects };
        }));

    const handlePrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };
    
    const handleNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const handleAISchedule = async () => {
        if (!assistantTopic.trim()) {
            addToast(t('toast.enter_topic_for_ai'), 'error');
            return;
        }
        if (!await consumeCredits(1)) return;
        setIsAssistantLoading(true);
        try {
            const suggestion = await getSchedulingSuggestion(assistantTopic);
            setAssistantResult(suggestion);
        } catch (e) {
            addToast(e instanceof Error ? e.message : t('toast.failed_get_suggestion'), 'error');
        } finally {
            setIsAssistantLoading(false);
        }
    };
    
    const openAssistantModal = () => {
        setIsModalOpen(true);
        setAssistantResult(null);
        setAssistantTopic('');
    };

    const monthName = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' });

    return (
        <div className="animate-fade-in-up">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                 <div>
                    <h1 className="text-4xl lg:text-5xl font-black text-white">{t('calendar.title')}</h1>
                    <p className="mt-2 text-lg text-gray-400">{t('calendar.subtitle')}</p>
                </div>
                <button
                    onClick={openAssistantModal}
                    className="mt-4 md:mt-0 inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg"
                >
                    <SparklesIcon className="w-6 h-6 mr-2" />
                    {t('calendar.ai_assistant_button')}
                </button>
            </header>
            
            <div className="bg-gray-800/50 border border-gray-700 rounded-2xl shadow-2xl p-6">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-gray-700">&lt;</button>
                    <h2 className="text-2xl font-bold text-white">{monthName} {currentYear}</h2>
                    <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-gray-700">&gt;</button>
                </div>

                <div className="grid grid-cols-7 gap-px bg-gray-700">
                    {[t('calendar.day_sun'), t('calendar.day_mon'), t('calendar.day_tue'), t('calendar.day_wed'), t('calendar.day_thu'), t('calendar.day_fri'), t('calendar.day_sat')].map(day => (
                        <div key={day} className="text-center font-bold text-xs text-gray-400 py-2 bg-gray-900/50">{day}</div>
                    ))}
                    {calendarDays.map(day => (
                        <div key={day.key} className="bg-gray-900/70 h-32 p-2 overflow-y-auto">
                           {day.date && <span className="text-sm font-semibold text-gray-300">{day.date.getDate()}</span>}
                           <div className="space-y-1 mt-1">
                               {day.projects.map(p => (
                                   <div 
                                      key={p.id}
                                      onClick={() => setActiveProjectId(p.id)}
                                      className="text-xs p-1.5 rounded bg-indigo-600 text-white font-semibold truncate cursor-pointer hover:bg-indigo-500"
                                    >
                                       {p.name}
                                   </div>
                               ))}
                           </div>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* AI Assistant Modal */}
            {isModalOpen && (
                <div 
                    className="fixed inset-0 modal-overlay flex items-center justify-center animate-fade-in-up" 
                    style={{ animationDuration: '0.3s' }}
                    onClick={() => setIsModalOpen(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="assistant-modal-title"
                >
                    <div 
                        className="bg-gray-800 border border-indigo-500/50 rounded-2xl shadow-2xl w-full max-w-md m-4 p-8 text-center transform transition-all"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white">
                            <XCircleIcon className="w-8 h-8"/>
                        </button>
                        <div className="mx-auto bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-full w-fit mb-6">
                            <SparklesIcon className="w-10 h-10 text-white" />
                        </div>
                        <h2 id="assistant-modal-title" className="text-2xl font-bold text-white mb-3">{t('calendar.modal_title')}</h2>
                        
                        {!assistantResult ? (
                            <>
                                <p className="text-gray-300 mb-6">{t('calendar.modal_subtitle')}</p>
                                <input
                                    type="text"
                                    value={assistantTopic}
                                    onChange={(e) => setAssistantTopic(e.target.value)}
                                    placeholder={t('calendar.modal_placeholder')}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
                                />
                                <button
                                    onClick={handleAISchedule}
                                    disabled={isAssistantLoading}
                                    className="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all disabled:bg-gray-600 disabled:cursor-wait"
                                >
                                    {isAssistantLoading ? t('calendar.modal_loading') : t('calendar.modal_button')}
                                </button>
                            </>
                        ) : (
                            <>
                                <ParsedSuggestion text={assistantResult} />
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="w-full mt-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all"
                                >
                                    {t('calendar.modal_close_button')}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContentCalendar;