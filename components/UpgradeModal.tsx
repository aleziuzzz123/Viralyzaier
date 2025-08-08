
import React from 'react';
import type { Plan } from '../types.ts';
import { CrownIcon } from './icons/CrownIcon.tsx';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  requiredPlan: Plan;
  featureName: string;
}

const planDetails: Record<Plan, { name: string; description: string }> = {
    basic: { name: 'Basic', description: 'Access to core features.' },
    unlimited: { name: 'Unlimited', description: 'Unlock advanced tools like the Trend Forecaster and advanced tonal styles.' },
    dfy: { name: 'DFY Content Vault', description: 'Get access to our library of professionally written, ready-to-use scripts and assets.' },
    agency: { name: 'Agency License', description: 'Manage client accounts and run your own script-writing service.' },
};

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, onUpgrade, requiredPlan, featureName }) => {
  if (!isOpen) return null;

  const details = planDetails[requiredPlan];

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-title"
    >
      <div
        className="bg-gradient-to-br from-[#2A1A5E] to-[#1A0F3C] rounded-xl border-2 border-[#DAFF00]/80 shadow-2xl shadow-[#DAFF00]/10 w-full max-w-md p-8 relative text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-purple-300 hover:text-white transition-colors duration-200"
        >
          <i className="fa-solid fa-times text-xl"></i>
        </button>
        
        <CrownIcon className="w-16 h-16 text-yellow-400 mx-auto mb-4" />

        <h2 id="upgrade-title" className="text-2xl font-bold text-white mb-2">
          Unlock This Premium Feature
        </h2>
        <p className="text-purple-200 mb-6">
          To use <strong className="text-white">"{featureName}"</strong>, please upgrade to the <strong className="text-[#DAFF00]">{details.name}</strong> plan.
        </p>
        
        <div className="bg-black/20 p-4 rounded-lg mb-6 text-left">
            <p className="text-white font-semibold">By upgrading, you will unlock:</p>
            <p className="text-purple-200 text-sm mt-1">{details.description}</p>
        </div>

        <div className="flex flex-col gap-3">
            <button
                type="button"
                onClick={onUpgrade}
                className="w-full px-6 py-3 text-base font-bold bg-[#DAFF00] text-[#1A0F3C] rounded-md hover:bg-opacity-90 transition-all transform hover:scale-105"
            >
                Upgrade to {details.name}
            </button>
            <button
                type="button"
                onClick={onClose}
                className="w-full px-6 py-2 text-sm font-medium text-purple-300 rounded-md hover:text-white"
            >
                Maybe Later
            </button>
        </div>
      </div>
    </div>
  );
};
