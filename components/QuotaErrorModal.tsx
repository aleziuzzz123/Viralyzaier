

import React, { useContext } from 'react';
import { UIContext } from '../context/UIContext.tsx';

export const QuotaErrorModal: React.FC = () => {
    const { state, dispatch } = useContext(UIContext);
    const { quotaError } = state;

    if (!quotaError) return null;

    const handleClose = () => {
        dispatch({ type: 'CLEAR_QUOTA_ERROR' });
    };

    const handleGoToQuotas = () => {
        window.open('https://console.cloud.google.com/iam-admin/quotas', '_blank');
        handleClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-red-900/50 border-2 border-red-500 rounded-xl shadow-2xl w-full max-w-lg p-8 relative text-white text-center">
                <i className="fa-solid fa-signal text-5xl text-red-400 mb-4"></i>
                <h2 className="text-3xl font-bold text-white mb-4">API Quota Limit Reached</h2>
                <p className="text-red-200 mb-6 leading-relaxed">{quotaError}</p>
                <div className="flex flex-col sm:flex-row gap-4">
                    <button onClick={handleClose} className="w-full px-6 py-3 text-sm font-bold bg-white/10 text-white rounded-md hover:bg-white/20 transition-colors duration-200">
                        I'll Check Later
                    </button>
                    <button onClick={handleGoToQuotas} className="w-full px-6 py-3 text-sm font-bold bg-[#DAFF00] text-[#1A0F3C] rounded-md hover:bg-opacity-90 transition-all duration-200">
                        <i className="fa-solid fa-arrow-up-right-from-square mr-2"></i>
                        Open Google Cloud Quotas
                    </button>
                </div>
            </div>
        </div>
    );
};
