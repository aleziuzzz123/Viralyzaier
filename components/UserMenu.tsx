import React, { useState, useRef, useEffect } from 'react';
import { CrownIcon, CreditIcon, LogoutIcon, CogIcon } from './Icons';
import { useAppContext } from '../contexts/AppContext';

interface UserMenuProps {
    onNavigate: (view: 'pricing' | 'settings') => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ onNavigate }) => {
    const { user, handleLogout, t } = useAppContext();
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
    
    if (!user) return null;

    const planId = user.subscription?.planId || 'free';
    const planName = planId.charAt(0).toUpperCase() + planId.slice(1);
    
    return (
        <div className="relative" ref={menuRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                    {user.email ? user.email.charAt(0).toUpperCase() : '?'}
                </div>
            </button>
            {isOpen && (
                <div 
                    className="absolute top-full right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl z-20 animate-fade-in-up" 
                    style={{animationDuration: '0.2s'}}
                >
                    <div className="p-4 border-b border-gray-700">
                        <p className="font-semibold text-white truncate">{user.email}</p>
                        <p className="text-sm text-gray-400">{t('user_menu.welcome')}</p>
                    </div>
                    <div className="p-4 space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-400">{t('user_menu.plan')}:</span>
                            <span className="font-bold text-white flex items-center">
                                {planName}
                                {planId !== 'free' && <CrownIcon className="w-4 h-4 ml-1.5 text-yellow-400"/>}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-400">{t('user_menu.credits')}:</span>
                            <span className="font-bold text-white">{user.aiCredits}</span>
                        </div>
                    </div>
                    <div className="p-2">
                        <button onClick={() => { onNavigate('pricing'); setIsOpen(false); }} className="w-full text-left flex items-center px-3 py-2 text-sm text-gray-200 rounded-md hover:bg-gray-700">
                            <CreditIcon className="w-5 h-5 mr-3 text-gray-400" />
                            {t('user_menu.manage_subscription')}
                        </button>
                        <button onClick={() => { onNavigate('settings'); setIsOpen(false); }} className="w-full text-left flex items-center px-3 py-2 text-sm text-gray-200 rounded-md hover:bg-gray-700">
                            <CogIcon className="w-5 h-5 mr-3 text-gray-400" />
                            {t('user_menu.settings')}
                        </button>
                        <button onClick={handleLogout} className="w-full text-left flex items-center px-3 py-2 text-sm text-red-400 rounded-md hover:bg-red-500/20">
                            <LogoutIcon className="w-5 h-5 mr-3" />
                            {t('user_menu.logout')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserMenu;