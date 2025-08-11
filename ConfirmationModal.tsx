import React from 'react';
import { XCircleIcon, WarningIcon } from './Icons.tsx';
import { useAppContext } from '../contexts/AppContext.tsx';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    children: React.ReactNode;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, children }) => {
    const { t } = useAppContext();
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 modal-overlay flex items-center justify-center animate-fade-in-up" 
            style={{ animationDuration: '0.3s' }}
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirmation-modal-title"
        >
            <div 
                className="bg-gray-800 border border-red-500/50 rounded-2xl shadow-2xl w-full max-w-md m-4 p-8 text-center transform transition-all"
                onClick={(e) => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">
                    <XCircleIcon className="w-8 h-8"/>
                </button>
                
                <div className="mx-auto bg-red-900/50 border border-red-500/50 p-4 rounded-full w-fit mb-6">
                   <WarningIcon className="w-12 h-12 text-red-400" />
                </div>
                
                <h2 id="confirmation-modal-title" className="text-3xl font-bold text-white mb-3">{title}</h2>
                <p className="text-gray-300 mb-8">{children}</p>
                
                <div className="flex justify-center gap-4">
                     <button
                        onClick={onClose}
                        className="w-full py-3 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded-lg transition-all"
                    >
                        {t('confirmation_modal.cancel')}
                    </button>
                    <button
                        onClick={onConfirm}
                        className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all"
                    >
                        {t('confirmation_modal.confirm')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;