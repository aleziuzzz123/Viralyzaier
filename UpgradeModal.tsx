import React from 'react';
import { CrownIcon, XCircleIcon } from './Icons.tsx';
import { useAppContext } from '../contexts/AppContext.tsx';

const UpgradeModal: React.FC = () => {
    const { isUpgradeModalOpen, setUpgradeModalOpen, upgradeReason, setActiveProjectId, t } = useAppContext();

    if (!isUpgradeModalOpen) return null;

    const handleUpgrade = () => {
        setUpgradeModalOpen(false);
        setActiveProjectId(null); // This will navigate to pricing page via App.tsx logic if current view is project
        // A more direct navigation method would be better, but this works with current setup
    };

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-up" 
            style={{ animationDuration: '0.3s' }}
            onClick={() => setUpgradeModalOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="upgrade-modal-title"
        >
            <div 
                className="bg-gray-800 border border-indigo-500/50 rounded-2xl shadow-2xl w-full max-w-md m-4 p-8 text-center transform transition-all"
                onClick={(e) => e.stopPropagation()}
            >
                <button onClick={() => setUpgradeModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white">
                    <XCircleIcon className="w-8 h-8"/>
                </button>
                
                <div className="mx-auto bg-gradient-to-br from-indigo-500 to-purple-600 p-4 rounded-full w-fit mb-6">
                   <CrownIcon className="w-12 h-12 text-white" />
                </div>
                
                <h2 id="upgrade-modal-title" className="text-3xl font-bold text-white mb-3">{upgradeReason.title}</h2>
                <p className="text-gray-300 mb-8">{upgradeReason.description}</p>
                
                <button
                    onClick={handleUpgrade}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                    {t('upgrade_modal.button')}
                </button>
            </div>
        </div>
    );
};

export default UpgradeModal;