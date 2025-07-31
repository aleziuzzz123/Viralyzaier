
import React from 'react';
import { Plan, PlanId } from '../types';
import { PLANS } from '../services/paymentService';
import { CheckBadgeIcon, CrownIcon } from './Icons';
import { useAppContext } from '../contexts/AppContext';

const PlanCard: React.FC<{ plan: Plan; onSelect: () => void; isCurrent: boolean; t: (key: string, replacements?: { [key: string]: string | number }) => string }> = ({ plan, onSelect, isCurrent, t }) => {
    const isFree = plan.price === 0;
    
    const getPlanName = (id: PlanId) => {
        switch(id) {
            case 'free': return t('pricing.plan_free');
            case 'pro': return t('pricing.plan_pro');
            case 'viralyzaier': return t('pricing.plan_viralyzaier');
        }
    }
    
    const buttonText = isCurrent ? t('pricing.button_current') : isFree ? t('pricing.button_start') : t('pricing.button_upgrade');
    
    return (
        <div className={`relative bg-gray-800/50 p-8 rounded-2xl border-2 transition-all duration-300
            ${plan.isMostPopular ? 'border-indigo-500' : 'border-gray-700'}
            ${isCurrent ? 'transform scale-105 shadow-2xl shadow-indigo-500/10' : 'hover:scale-105'}
        `}>
            {plan.isMostPopular && (
                <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 px-4 py-1 bg-indigo-500 text-white text-sm font-bold rounded-full">
                    {t('pricing.most_popular')}
                </div>
            )}
            
            <div className="text-center">
                 <h3 className="text-3xl font-black text-white">{getPlanName(plan.id)}</h3>
                 <p className="mt-2 text-gray-400">
                    <span className="text-4xl font-extrabold text-white">${plan.price}</span>
                    { !isFree && <span className="text-lg">{t('pricing.price_month')}</span> }
                 </p>
                 <p className="text-sm text-gray-500 mt-1">{t('pricing.credits_limit', {limit: plan.creditLimit})}</p>
            </div>
            
            <ul className="mt-8 space-y-4">
                {plan.features.map((featureKey, i) => (
                    <li key={i} className="flex items-start">
                        <CheckBadgeIcon className="w-6 h-6 mr-3 text-green-400 flex-shrink-0" />
                        <span className="text-gray-300">{t(featureKey as any)}</span>
                    </li>
                ))}
            </ul>
            
            <button
                onClick={onSelect}
                disabled={isCurrent}
                className={`w-full mt-10 py-3 font-bold rounded-lg transition-colors duration-300
                    ${isCurrent ? 'bg-gray-600 text-gray-300 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-500'}
                    ${plan.isMostPopular && !isCurrent && 'bg-indigo-500 hover:bg-indigo-400'}
                `}
            >
                {buttonText}
            </button>
        </div>
    );
};


const PricingPage: React.FC = () => {
    const { user, handleSubscriptionChange, t } = useAppContext();
    
    if (!user) return null;

    return (
        <div className="animate-fade-in-up">
             <header className="text-center mb-12">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-600 flex items-center justify-center">
                    <CrownIcon className="w-12 h-12 mr-4"/>
                    <span>{t('pricing.title')}</span>
                </h1>
                <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
                    {t('pricing.subtitle')}
                </p>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {PLANS.map(plan => (
                    <PlanCard 
                        key={plan.id}
                        plan={plan}
                        onSelect={() => handleSubscriptionChange(plan.id)}
                        isCurrent={user.subscription.planId === plan.id && user.subscription.status === 'active'}
                        t={t}
                    />
                ))}
            </div>
        </div>
    );
};

export default PricingPage;
