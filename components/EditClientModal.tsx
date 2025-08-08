
import React, { useState, useEffect, useContext } from 'react';
import type { Client } from '../types.ts';
import { DataContext } from '../context/DataContext.tsx';

interface EditClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateClient: (client: Client) => void;
  client: Client | null;
}

export const EditClientModal: React.FC<EditClientModalProps> = ({ isOpen, onClose, onUpdateClient, client }) => {
  const { dispatch: dataDispatch } = useContext(DataContext);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [error, setError] = useState('');

  useEffect(() => {
    if (client) {
      setName(client.name);
      setEmail(client.email);
      setStatus(client.status === 'Active' ? 'Active' : 'Inactive');
    }
  }, [client]);

  if (!isOpen || !client) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) { setError('Both name and email are required.'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Please enter a valid email address.'); return; }
    setError('');
    onUpdateClient({ ...client, name, email, status });
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#2A1A5E] rounded-xl border border-[#4A3F7A] shadow-2xl w-full max-w-md p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 text-purple-300 hover:text-white"><i className="fa-solid fa-times text-xl"></i></button>
        <h2 className="text-2xl font-bold text-white mb-6">Edit Client</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="editClientName" className="block text-sm font-medium text-purple-200 mb-2">Client Name</label>
            <input id="editClientName" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-[#1A0F3C] border border-[#4A3F7A] rounded-md py-2.5 px-4 text-[#F0F0F0] focus:ring-2 focus:ring-[#DAFF00] outline-none" required />
          </div>
          <div>
            <label htmlFor="editClientEmail" className="block text-sm font-medium text-purple-200 mb-2">Client Email</label>
            <input id="editClientEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#1A0F3C] border border-[#4A3F7A] rounded-md py-2.5 px-4 text-[#F0F0F0] focus:ring-2 focus:ring-[#DAFF00] outline-none" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-2">Client Status</label>
            <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setStatus(status === 'Active' ? 'Inactive' : 'Active')}>
              <div className={`w-14 h-7 flex items-center rounded-full p-1 duration-300 ease-in-out ${status === 'Active' ? 'bg-[#DAFF00]' : 'bg-[#1A0F3C]'}`}>
                <div className={`bg-white w-5 h-5 rounded-full shadow-md transform duration-300 ease-in-out ${status === 'Active' ? 'translate-x-7' : ''}`}></div>
              </div>
              <span className={`font-semibold ${status === 'Active' ? 'text-[#DAFF00]' : 'text-purple-300'}`}>{status}</span>
            </div>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end items-center gap-4 pt-4">
            <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-purple-200 bg-transparent rounded-md hover:bg-[#1A0F3C]/50">Cancel</button>
            <button type="submit" className="px-6 py-2.5 text-sm font-bold bg-[#DAFF00] text-[#1A0F3C] rounded-md hover:bg-opacity-90">Update Client</button>
          </div>
        </form>
      </div>
    </div>
  );
};
