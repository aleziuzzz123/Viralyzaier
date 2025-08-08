
import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext.tsx';
import { Language } from '../translations.ts';
import { GlobeIcon, ChevronDownIcon } from './Icons.tsx';

const languageOptions: { code: Language, name: string }[] = [
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'Français' },
    { code: 'es', name: 'Español' },
    { code: 'pt', name: 'Português' },
    { code: 'hi', name: 'हिन्दी' }
];

interface LanguageSwitcherProps {
    variant?: 'header' | 'menu';
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ variant = 'header' }) => {
    const { language, setLanguage } = useAppContext();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (langCode: Language) => {
        setLanguage(langCode);
        setIsOpen(false);
    };
    
    const baseClasses = "flex items-center gap-2 font-semibold transition-colors";
    const variantClasses = {
        header: "text-white bg-white/10 px-3 py-2 rounded-full hover:bg-white/20 text-sm",
        menu: "w-full text-left px-3 py-2 text-sm text-gray-200 rounded-md hover:bg-gray-700 justify-between"
    };

    return (
        <div className="relative" ref={menuRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`${baseClasses} ${variantClasses[variant]}`}
            >
                <GlobeIcon className="w-5 h-5"/>
                {language.toUpperCase()}
                {variant === 'header' && <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
            </button>
            
            {isOpen && (
                <div 
                    className="absolute top-full mt-2 right-0 w-40 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl z-50 animate-fade-in-up" 
                    style={{animationDuration: '0.2s'}}
                >
                    <ul className="p-1">
                        {languageOptions.map(opt => (
                            <li key={opt.code}>
                                <button 
                                    onClick={() => handleSelect(opt.code)}
                                    className={`w-full text-left px-3 py-2 text-sm rounded-md ${language === opt.code ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                                >
                                    {opt.name}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default LanguageSwitcher;