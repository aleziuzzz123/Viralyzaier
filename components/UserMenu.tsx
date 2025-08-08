import React, { useState, useRef, useEffect } from 'react';
import { CrownIcon, CreditIcon, LogoutIcon, SparklesIcon, CogIcon } from './Icons.tsx';
import { useAppContext } from '../contexts/AppContext.tsx';
import * as supabase from '../services/supabaseService.ts';
import { PLANS } from '../services/paymentService.ts';

interface UserMenuProps {
    onNavigate: (view: 'pricing' | 'settings') => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ onNavigate }) => {
    const { user, setUser, handleLogout, t, addToast } = useAppContext();
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

    const handleDevUpgrade = async () => {
        if (user) {
            const proPlan = PLANS.find(p => p.id === 'pro');
            if (!proPlan) {
                addToast('Pro plan configuration not found.', 'error');
                return;
            }
            try {
                const updatedUser = await supabase.updateUserProfile(user.id, {
                    subscription: { planId: 'pro', status: 'active', endDate: null },
                    aiCredits: proPlan.creditLimit,
                });
                setUser(updatedUser);
                addToast('Successfully upgraded to Pro Plan (Dev Mode)!', 'success');
                setIsOpen(false);
            } catch (error) {
                addToast(error instanceof Error ? error.message : 'Failed to upgrade plan.', 'error');
            }
        }
    };
    
    if (!user) return null;

    const planName = user.subscription.planId.charAt(0).toUpperCase() + user.subscription.planId.slice(1);
    
    return (
        <div className="relative" ref={menuRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center text-indigo-300 font-bold text-lg hover:ring-2 hover:ring-indigo-500 transition-all"
            >
                {user.email.charAt(0).toUpperCase()}
            </button>
            
            {isOpen && (
                <div className="absolute top-14 right-0 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl animate-fade-in-up" style={{animationDuration: '0.2s'}}>
                    <div className="p-4 border-b border-gray-700">
                        <p className="font-semibold text-white truncate">{user.email}</p>
                        <p className="text-sm text-gray-400">{t('user_menu.welcome')}</p>
                    </div>
                    <div className="p-4 space-y-3">
                         <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center text-gray-300"><CrownIcon className="w-5 h-5 mr-2 text-yellow-400"/>{t('user_menu.plan')}</span>
                            <span className="font-bold text-white">{planName}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center text-gray-300"><CreditIcon className="w-5 h-5 mr-2 text-green-400"/>{t('user_menu.credits')}</span>
                            <span className="font-bold text-white">{user.aiCredits}</span>
                        </div>
                    </div>
                    <div className="p-2 border-t border-gray-700">
                        <button onClick={() => { onNavigate('pricing'); setIsOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-gray-200 rounded-md hover:bg-gray-700 flex items-center">
                            <CrownIcon className="w-5 h-5 mr-2"/>
                            {t('user_menu.manage_subscription')}
                        </button>
                        <button onClick={() => { onNavigate('settings'); setIsOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-gray-200 rounded-md hover:bg-gray-700 flex items-center">
                            <CogIcon className="w-5 h-5 mr-2"/>
                            {t('user_menu.settings')}
                        </button>
                         <button onClick={() => { handleLogout(); setIsOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-red-400 rounded-md hover:bg-gray-700 flex items-center">
                           <LogoutIcon className="w-5 h-5 mr-2"/>
                            {t('user_menu.logout')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserMenu;