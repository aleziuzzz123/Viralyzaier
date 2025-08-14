import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { BrandIdentity } from '../types';
import { PlusIcon, PencilIcon, TrashIcon, XCircleIcon, PaintBrushIcon, UploadIcon } from './Icons';
import { uploadFile } from '../services/supabaseService';
import { getErrorMessage } from '../utils';
import { v4 as uuidv4 } from 'uuid';

interface BrandIdentityModalProps {
    isOpen: boolean;
    onClose: () => void;
    identityToEdit: BrandIdentity | null;
}

// Modal component for creating/editing brand identities
const BrandIdentityModal: React.FC<BrandIdentityModalProps> = ({ isOpen, onClose, identityToEdit }) => {
    const { user, handleCreateBrandIdentity, handleUpdateBrandIdentity, addToast } = useAppContext();
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [identity, setIdentity] = useState<Omit<BrandIdentity, 'id' | 'created_at' | 'user_id'> & { logoUrl?: string }>(() => {
        return identityToEdit || {
            name: '',
            toneOfVoice: 'Witty & Sarcastic',
            writingStyleGuide: '',
            colorPalette: { primary: '#6366f1', secondary: '#ec4899', accent: '#f59e0b' },
            fontSelection: 'Inter',
            thumbnailFormula: 'Reaction',
            visualStyleGuide: '',
            targetAudience: '',
            channelMission: '',
            logoUrl: '',
        };
    });

    const handleChange = (field: keyof typeof identity, value: any) => {
        setIdentity(prev => ({ ...prev, [field]: value }));
    };
    
    const handleColorChange = (colorField: 'primary' | 'secondary' | 'accent', value: string) => {
        setIdentity(prev => ({
            ...prev,
            colorPalette: { ...prev.colorPalette, [colorField]: value }
        }));
    };
    
    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !user) return;
        const file = e.target.files[0];
        setIsUploadingLogo(true);
        try {
            const path = `${user.id}/brand_logos/${uuidv4()}.${file.name.split('.').pop()}`;
            const publicUrl = await uploadFile(file, path);
            handleChange('logoUrl', publicUrl);
            addToast("Logo uploaded successfully!", "success");
        } catch(err) {
            addToast(`Logo upload failed: ${getErrorMessage(err)}`, 'error');
        } finally {
            setIsUploadingLogo(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (identityToEdit) {
            await handleUpdateBrandIdentity(identityToEdit.id, identity);
        } else {
            await handleCreateBrandIdentity(identity);
        }
        onClose();
    };

    if (!isOpen) return null;

    const toneOptions = ["Witty & Sarcastic", "Authoritative & Formal", "Empathetic & Gentle", "High-Energy & Humorous"];
    const thumbnailFormulas = ["Reaction", "Object-focused", "Headline-driven"];

    return (
        <div className="fixed inset-0 modal-overlay flex items-start pt-12 md:pt-20 justify-center z-50 animate-fade-in-up" style={{ animationDuration: '0.3s' }} onClick={onClose}>
            <div className="bg-gray-800 border border-indigo-500/50 rounded-2xl shadow-2xl w-full max-w-3xl m-4 transform transition-all p-8 flex flex-col text-left" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white"><XCircleIcon className="w-8 h-8"/></button>
                <h2 className="text-2xl font-bold text-white mb-4">{identityToEdit ? 'Edit Brand Identity' : 'Create New Brand Identity'}</h2>
                <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Column 1 */}
                        <div className="space-y-6">
                             <div>
                                <label className="font-semibold text-white">Identity Name</label>
                                <input type="text" value={identity.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="e.g., My Tech Channel" className="w-full mt-2 bg-gray-900 border border-gray-600 rounded-lg p-3 text-white" required />
                            </div>
                             <div>
                                <label className="font-semibold text-white">Brand Logo</label>
                                 <div className="mt-2 flex items-center gap-4">
                                     {identity.logoUrl && <img src={identity.logoUrl} alt="Brand Logo" className="w-16 h-16 rounded-md object-contain bg-white/10" />}
                                    <label className="flex-1 flex items-center justify-center gap-2 p-3 bg-gray-700 text-white rounded-lg cursor-pointer hover:bg-gray-600">
                                        <UploadIcon className="w-5 h-5"/>
                                        <span>{isUploadingLogo ? "Uploading..." : "Upload Logo"}</span>
                                        <input type="file" accept="image/png, image/jpeg" onChange={handleLogoUpload} className="hidden" />
                                    </label>
                                </div>
                            </div>
                             <div>
                                <label className="font-semibold text-white">Color Palette</label>
                                <div className="flex gap-4 mt-2">
                                    <div className="flex-1">
                                        <label className="text-xs text-gray-400">Primary</label>
                                        <input type="color" value={identity.colorPalette.primary} onChange={(e) => handleColorChange('primary', e.target.value)} className="w-full h-10 mt-1 bg-gray-900 border-gray-600 rounded"/>
                                    </div>
                                    <div className="flex-1">
                                         <label className="text-xs text-gray-400">Secondary</label>
                                        <input type="color" value={identity.colorPalette.secondary} onChange={(e) => handleColorChange('secondary', e.target.value)} className="w-full h-10 mt-1 bg-gray-900 border-gray-600 rounded"/>
                                    </div>
                                     <div className="flex-1">
                                         <label className="text-xs text-gray-400">Accent</label>
                                        <input type="color" value={identity.colorPalette.accent} onChange={(e) => handleColorChange('accent', e.target.value)} className="w-full h-10 mt-1 bg-gray-900 border-gray-600 rounded"/>
                                    </div>
                                </div>
                            </div>
                             <div>
                                <label className="font-semibold text-white">Tone of Voice</label>
                                <select value={identity.toneOfVoice} onChange={(e) => handleChange('toneOfVoice', e.target.value)} className="w-full mt-2 bg-gray-900 border border-gray-600 rounded-lg p-3 text-white">
                                    {toneOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="font-semibold text-white">Writing Style Guide</label>
                                <textarea value={identity.writingStyleGuide} onChange={(e) => handleChange('writingStyleGuide', e.target.value)} rows={3} placeholder="e.g., Always start with a question. Use simple language." className="w-full mt-2 bg-gray-900 border border-gray-600 rounded-lg p-3 text-white"></textarea>
                            </div>
                        </div>

                        {/* Column 2 */}
                        <div className="space-y-6">
                            <div>
                                <label className="font-semibold text-white">Thumbnail Formula</label>
                                <select value={identity.thumbnailFormula} onChange={(e) => handleChange('thumbnailFormula', e.target.value)} className="w-full mt-2 bg-gray-900 border border-gray-600 rounded-lg p-3 text-white">
                                    {thumbnailFormulas.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="font-semibold text-white">Visual Style Guide</label>
                                <textarea value={identity.visualStyleGuide} onChange={(e) => handleChange('visualStyleGuide', e.target.value)} rows={4} placeholder="e.g., Use cinematic, slow-motion b-roll. Dark, moody aesthetic." className="w-full mt-2 bg-gray-900 border border-gray-600 rounded-lg p-3 text-white"></textarea>
                            </div>
                            <div>
                                <label className="font-semibold text-white">Target Audience</label>
                                <textarea value={identity.targetAudience} onChange={(e) => handleChange('targetAudience', e.target.value)} rows={3} placeholder="e.g., Beginner programmers learning Python." className="w-full mt-2 bg-gray-900 border border-gray-600 rounded-lg p-3 text-white"></textarea>
                            </div>
                             <div>
                                <label className="font-semibold text-white">Channel Mission</label>
                                <textarea value={identity.channelMission} onChange={(e) => handleChange('channelMission', e.target.value)} rows={3} placeholder="e.g., To make complex financial topics accessible." className="w-full mt-2 bg-gray-900 border border-gray-600 rounded-lg p-3 text-white"></textarea>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-gray-700">
                        <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors">
                            {identityToEdit ? 'Save Changes' : 'Create Identity'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const BrandIdentityHub: React.FC = () => {
    const { brandIdentities, handleDeleteBrandIdentity } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [identityToEdit, setIdentityToEdit] = useState<BrandIdentity | null>(null);

    const openCreateModal = () => {
        setIdentityToEdit(null);
        setIsModalOpen(true);
    };

    const openEditModal = (identity: BrandIdentity) => {
        setIdentityToEdit(identity);
        setIsModalOpen(true);
    };

    return (
         <div className="max-w-4xl mx-auto bg-gray-800/50 p-8 rounded-2xl border border-gray-700">
             <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-2 flex items-center">
                        <PaintBrushIcon className="w-6 h-6 mr-3 text-sky-400" />
                        AI Brand Identity Hub
                    </h2>
                    <p className="text-gray-400">Define your brand's voice and style for consistent AI generation.</p>
                </div>
                <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors">
                    <PlusIcon className="w-5 h-5" /> New Identity
                </button>
             </div>

             <div className="space-y-4">
                {brandIdentities.length > 0 ? (
                    brandIdentities.map((identity: BrandIdentity) => (
                        <div key={identity.id} className="bg-gray-900/50 p-4 rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                {identity.logoUrl && <img src={identity.logoUrl} alt={`${identity.name} logo`} className="w-12 h-12 rounded-md object-contain bg-white/10" />}
                                <div>
                                    <h3 className="font-bold text-white">{identity.name}</h3>
                                    <p className="text-sm text-gray-400">{identity.targetAudience}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => openEditModal(identity)} className="p-2 text-gray-400 hover:text-indigo-400"><PencilIcon className="w-5 h-5" /></button>
                                <button onClick={() => handleDeleteBrandIdentity(identity.id)} className="p-2 text-gray-400 hover:text-red-400"><TrashIcon className="w-5 h-5" /></button>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-center py-8 text-gray-500 italic">No brand identities created yet. Create one to get started!</p>
                )}
             </div>
             
             <BrandIdentityModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} identityToEdit={identityToEdit} />
         </div>
    );
};

export default BrandIdentityHub;