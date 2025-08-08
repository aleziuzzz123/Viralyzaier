

import React, { useState, useEffect, useRef, useContext } from 'react';
import type { Script, Folder } from '../types.ts';
import { DataContext } from '../context/DataContext.tsx';

interface SaveScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  scriptToSave: Script | null;
  onConfirmSave: (script: Script, folderId: string | null) => void;
  onAddNewFolder: (folderName: string) => string;
}

export const SaveScriptModal: React.FC<SaveScriptModalProps> = ({ 
    isOpen, onClose, scriptToSave, onConfirmSave, onAddNewFolder 
}) => {
  const { state: { folders } } = useContext(DataContext);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (scriptToSave) {
        setSelectedFolderId(scriptToSave.folder_id || null);
    }
    setShowNewFolderInput(false); 
    setNewFolderName('');
  }, [scriptToSave, isOpen]);

  // Focus trapping for accessibility
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };
    
    const currentModalRef = modalRef.current;
    currentModalRef.addEventListener('keydown', handleTabKeyPress);
    firstElement?.focus();

    return () => {
      currentModalRef.removeEventListener('keydown', handleTabKeyPress);
    };
  }, [isOpen]);

  if (!isOpen || !scriptToSave) return null;

  const handleConfirm = () => {
    let folderToSaveTo = selectedFolderId;
    if (showNewFolderInput && newFolderName.trim()) {
        folderToSaveTo = onAddNewFolder(newFolderName.trim());
    }
    onConfirmSave(scriptToSave, folderToSaveTo);
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const { value } = e.target;
      if (value === '--create-new--') {
          setShowNewFolderInput(true);
          setSelectedFolderId(null);
      } else {
          setShowNewFolderInput(false);
          setNewFolderName('');
          setSelectedFolderId(value === "null" ? null : value);
      }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        ref={modalRef}
        className="bg-[#2A1A5E] rounded-xl border border-[#4A3F7A] shadow-2xl shadow-black/50 w-full max-w-md p-6 relative" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-script-title"
      >
        <button onClick={onClose} className="absolute top-3 right-3 text-purple-300 hover:text-white"><i className="fa-solid fa-times text-xl"></i></button>
        <h2 id="save-script-title" className="text-2xl font-bold text-white mb-2">Save Script</h2>
        <p className="text-sm text-purple-200 mb-6">Organize your script by saving it to a folder.</p>
        <div className="space-y-4">
          <div>
            <label htmlFor="folderSelect" className="block text-sm font-medium text-purple-200 mb-2">Choose a Folder</label>
            <select id="folderSelect" value={showNewFolderInput ? '--create-new--' : (selectedFolderId || 'null')} onChange={handleFolderSelect} className="w-full bg-[#1A0F3C] border border-[#4A3F7A] rounded-md py-2.5 pl-4 pr-10 text-[#F0F0F0] focus:ring-2 focus:ring-[#DAFF00] appearance-none bg-no-repeat" style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`}}>
                <option value="null">Save to library (no folder)</option>
                {folders.filter(f => f.id !== 'all').map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                <option value="--create-new--">Create a new folder...</option>
            </select>
            {showNewFolderInput && (
                <div className="mt-2">
                     <input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Enter new folder name..." className="w-full bg-[#1A0F3C] border border-[#DAFF00] rounded-md py-2.5 px-4 text-[#F0F0F0] focus:ring-2 focus:ring-[#DAFF00] outline-none" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleConfirm()} />
                </div>
            )}
          </div>
          <div className="flex justify-end items-center gap-4 pt-4">
            <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-purple-200 bg-transparent rounded-md hover:bg-[#1A0F3C]/50">Cancel</button>
            <button type="button" onClick={handleConfirm} className="px-6 py-2.5 text-sm font-bold bg-[#DAFF00] text-[#1A0F3C] rounded-md hover:bg-opacity-90">Save Script</button>
          </div>
        </div>
      </div>
    </div>
  );
};
