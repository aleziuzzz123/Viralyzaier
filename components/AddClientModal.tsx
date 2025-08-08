

import React, { useState, useContext } from 'react';
import type { Client } from '../types.ts';
import { DataContext } from '../context/DataContext.tsx';

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddClient: (clientData: Omit<Client, 'id' | 'status'>) => void;
}

export const AddClientModal: React.FC<AddClientModalProps> = ({ isOpen, onClose, onAddClient }) => {
  const { dispatch: dataDispatch } = useContext(DataContext);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Both name and email are required.');
      return;
    }
    // Basic email validation
    if (!/\S+@\S+\.\S+/.test(email)) {
        setError('Please enter a valid email address.');
        return;
    }

    setError('');
    onAddClient({ name, email, avatar: '' });
    setName('');
    setEmail('');
  };
  
  const handleClose = () => {
    setName('');
    setEmail('');
    setError('');
    onClose();
  }

  return (
    <div 
        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
        onClick={handleClose}
    >
      <div 
        className="bg-[#2A1A5E] rounded-xl border border-[#4A3F7A] shadow-2xl shadow-black/50 w-full max-w-md p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
            onClick={handleClose}
            className="absolute top-3 right-3 text-purple-300 hover:text-white transition-colors duration-200"
        >
            <i className="fa-solid fa-times text-xl"></i>
        </button>

        <h2 className="text-2xl font-bold text-white mb-6">Add New Client</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="clientName" className="block text-sm font-medium text-purple-200 mb-2">
              Client Name
            </label>
            <input
              id="clientName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., John Smith"
              className="w-full bg-[#1A0F3C] border border-[#4A3F7A] rounded-md py-2.5 px-4 text-[#F0F0F0] placeholder-purple-300/50 focus:ring-2 focus:ring-[#DAFF00] focus:border-[#DAFF00] focus:outline-none transition duration-200"
              required
            />
          </div>
          <div>
            <label htmlFor="clientEmail" className="block text-sm font-medium text-purple-200 mb-2">
              Client Email
            </label>
            <input
              id="clientEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g., client@email.com"
              className="w-full bg-[#1A0F3C] border border-[#4A3F7A] rounded-md py-2.5 px-4 text-[#F0F0F0] placeholder-purple-300/50 focus:ring-2 focus:ring-[#DAFF00] focus:border-[#DAFF00] focus:outline-none transition duration-200"
              required
            />
          </div>
          
          {error && <p className="text-sm text-red-400">{error}</p>}
          
          <div className="flex justify-end items-center gap-4 pt-4">
            <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2.5 text-sm font-bold text-purple-200 bg-transparent rounded-md hover:bg-[#1A0F3C]/50 transition-colors duration-200"
            >
                Cancel
            </button>
             <button
              type="submit"
              className="px-6 py-2.5 text-sm font-bold bg-[#DAFF00] text-[#1A0F3C] rounded-md hover:bg-opacity-90 transition-all duration-200"
            >
              Add Client
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
