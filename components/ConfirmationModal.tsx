import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#2A1A5E] rounded-xl border border-[#4A3F7A] shadow-2xl w-full max-w-md p-6 relative" onClick={(e) => e.stopPropagation()}>
        <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-900/50">
                <i className="fa-solid fa-triangle-exclamation text-red-400 text-xl"></i>
            </div>
            <h3 className="text-lg leading-6 font-bold text-white mt-4" id="modal-title">
                {title}
            </h3>
            <div className="mt-2">
                <p className="text-sm text-purple-200">
                    {message}
                </p>
            </div>
        </div>
        <div className="mt-6 flex justify-center gap-4">
          <button
            type="button"
            className="px-6 py-2.5 text-sm font-bold text-purple-200 bg-transparent rounded-md hover:bg-[#1A0F3C]/50 transition-colors duration-200 w-full"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-6 py-2.5 text-sm font-bold bg-red-600 text-white rounded-md hover:bg-red-700 transition-all duration-200 w-full"
            onClick={onConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};
