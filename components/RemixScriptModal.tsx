

import React, { useState, useEffect } from 'react';
import type { Script } from '../types.ts';

interface RemixScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmRemix: (baseScript: Script, newTopic: string) => void;
  baseScript: Script | null;
  isRemixing: boolean;
}

export const RemixScriptModal: React.FC<RemixScriptModalProps> = ({
  isOpen,
  onClose,
  onConfirmRemix,
  baseScript,
  isRemixing
}) => {
  const [newTopic, setNewTopic] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNewTopic('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen || !baseScript) {
    return null;
  }

  const handleConfirm = () => {
    if (!newTopic.trim()) {
      setError('Please enter a topic to remix.');
      return;
    }
    setError('');
    onConfirmRemix(baseScript, newTopic);
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#2A1A5E] rounded-xl border border-[#4A3F7A] shadow-2xl shadow-black/50 w-full max-w-md p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-purple-300 hover:text-white transition-colors duration-200"
        >
          <i className="fa-solid fa-times text-xl"></i>
        </button>

        <div className="flex items-center space-x-3 mb-6">
            <i className="fa-solid fa-arrows-spin text-2xl text-[#DAFF00]"></i>
            <h2 className="text-2xl font-bold text-white">Remix This Script</h2>
        </div>

        <p className="text-sm text-purple-200 mb-4">
          You're remixing the script: <strong className="text-white italic">"{baseScript.title}"</strong>.
        </p>

        <div className="space-y-4">
          <div>
            <label htmlFor="newTopic" className="block text-sm font-medium text-purple-200 mb-2">
              Enter your specific topic, product, or angle:
            </label>
            <input
              id="newTopic"
              type="text"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              placeholder="e.g., 'My new brand of keto cookies'"
              className="w-full bg-[#1A0F3C] border border-[#4A3F7A] rounded-md py-2.5 px-4 text-[#F0F0F0] placeholder-purple-300/50 focus:ring-2 focus:ring-[#DAFF00] focus:border-[#DAFF00] focus:outline-none transition duration-200"
              required
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end items-center gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-bold text-purple-200 bg-transparent rounded-md hover:bg-[#1A0F3C]/50"
              disabled={isRemixing}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isRemixing}
              className="px-6 py-2.5 text-sm font-bold bg-[#DAFF00] text-[#1A0F3C] rounded-md hover:bg-opacity-90 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isRemixing ? 'Remixing...' : 'Generate Remix'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};