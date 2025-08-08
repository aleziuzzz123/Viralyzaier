
import React, { useState, useContext } from 'react';
import { supabase } from '../services/supabaseClient.ts';
import { AuthContext } from '../context/AuthContext.tsx';
import type { Plan } from '../types.ts';
import { CrownIcon } from './icons/CrownIcon.tsx';

interface FormState {
    isSaving: boolean;
    message: string | null;
    messageType: 'success' | 'error' | null;
}

interface AccountSettingsViewProps {
    onUpgrade: () => void;
}

const InfoRow: React.FC<{ label: string; value: string; isInput?: boolean; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string }> = ({ label, value, isInput = false, onChange, type = 'text' }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-1 md:gap-4 items-center">
        <label className="text-sm font-medium text-purple-200">{label}</label>
        <div className="md:col-span-2">
            {isInput ? (
                <input
                    type={type}
                    defaultValue={value}
                    onChange={onChange}
                    className="w-full bg-[#1A0F3C] border border-[#4A3F7A] rounded-md py-2 px-3 text-[#F0F0F0] placeholder-purple-300/50 focus:ring-2 focus:ring-[#DAFF00] focus:border-[#DAFF00] focus:outline-none transition duration-200"
                />
            ) : (
                <span className="text-white">{value}</span>
            )}
        </div>
    </div>
);

export const AccountSettingsView: React.FC<AccountSettingsViewProps> = ({ onUpgrade }) => {
    const { state: authState } = useContext(AuthContext);
    const { user } = authState;

    const [profileState, setProfileState] = useState<FormState>({ isSaving: false, message: null, messageType: null });
    const [passwordState, setPasswordState] = useState<FormState>({ isSaving: false, message: null, messageType: null });
    
    if (!user) return null;

    const handleFormSubmit = async (
        e: React.FormEvent,
        setState: React.Dispatch<React.SetStateAction<FormState>>,
        successMessage: string
    ) => {
        e.preventDefault();
        setState({ isSaving: true, message: null, messageType: null });
        
        // This is a placeholder for actual API calls
        // For example, to update user metadata or password with Supabase
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        setState({ isSaving: false, message: successMessage, messageType: 'success' });
        setTimeout(() => setState({ isSaving: false, message: null, messageType: null }), 3000);
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
    };

    const planNameMapping: Record<Plan, string> = {
        basic: 'Basic',
        unlimited: 'Unlimited',
        dfy: 'DFY Content Vault',
        agency: 'Agency & Reseller License'
    };
    
    const nextPlan: Record<Plan, Plan | null> = {
        basic: 'unlimited',
        unlimited: 'dfy',
        dfy: 'agency',
        agency: null,
    };
    
    const currentPlanName = planNameMapping[user.plan];
    const nextPlanName = nextPlan[user.plan] ? planNameMapping[nextPlan[user.plan] as Plan] : null;

    const planBenefits: Record<Plan, string[]> = {
        basic: ['Core Script Generator', 'Save Up to 20 Scripts'],
        unlimited: ['Unlimited Script Generations', 'Video Deconstructor', 'Trending Topics Hub', 'Advanced Tones'],
        dfy: ['All Unlimited Features', 'DFY Content Vault', 'Viral Hooks Library', 'Trending Audio Masterclass'],
        agency: ['All DFY Features', 'Agency Dashboard', 'Manage Client Accounts', 'Reseller Rights']
    };
    const currentBenefits = planBenefits[user.plan];


    return (
        <div className="space-y-10">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Account Settings</h1>
                <p className="text-purple-300">Manage your profile, password, and subscription plan.</p>
            </div>

            {/* Profile Information Section */}
            <form onSubmit={(e) => handleFormSubmit(e, setProfileState, "Profile updated successfully!")}>
                <section className="bg-[#2A1A5E]/50 rounded-xl border border-[#4A3F7A]/30 shadow-lg">
                    <div className="p-6 border-b border-[#4A3F7A]/30">
                        <h2 className="text-xl font-bold text-white">Profile Information</h2>
                        <p className="text-sm text-purple-300 mt-1">Update your personal details.</p>
                    </div>
                    <div className="p-6 space-y-4">
                        <InfoRow label="Full Name" value={user.name} isInput />
                        <InfoRow label="Email Address" value={user.email} isInput type="email" />
                    </div>
                    <div className="p-6 bg-[#1A0F3C]/50 rounded-b-xl flex justify-between items-center gap-4">
                        <button 
                            type="button"
                            onClick={handleSignOut}
                            className="px-5 py-2 text-sm font-bold text-red-400 bg-red-900/50 rounded-md hover:bg-red-900/80 transition-all duration-200"
                        >
                           <i className="fa-solid fa-arrow-right-from-bracket mr-2"></i>
                           Sign Out
                        </button>
                        <div className="flex items-center gap-4">
                            {profileState.message && (
                                <span className={`text-sm ${profileState.messageType === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                    {profileState.message}
                                </span>
                            )}
                            <button 
                                type="submit"
                                disabled={profileState.isSaving}
                                className="px-5 py-2 w-32 text-sm font-bold bg-[#DAFF00] text-[#1A0F3C] rounded-md hover:bg-opacity-90 transition-all duration-200 disabled:bg-slate-700 disabled:text-slate-400"
                            >
                                {profileState.isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </section>
            </form>
            
            {/* Password Management Section */}
            <form onSubmit={(e) => handleFormSubmit(e, setPasswordState, "Password updated successfully!")}>
                <section className="bg-[#2A1A5E]/50 rounded-xl border border-[#4A3F7A]/30 shadow-lg">
                    <div className="p-6 border-b border-[#4A3F7A]/30">
                        <h2 className="text-xl font-bold text-white">Password Management</h2>
                        <p className="text-sm text-purple-300 mt-1">Change your password for security.</p>
                    </div>
                    <div className="p-6 space-y-4">
                        <InfoRow label="Current Password" value="" isInput type="password" />
                        <InfoRow label="New Password" value="" isInput type="password" />
                        <InfoRow label="Confirm New Password" value="" isInput type="password" />
                    </div>
                    <div className="p-6 bg-[#1A0F3C]/50 rounded-b-xl flex justify-end items-center gap-4">
                        {passwordState.message && (
                            <span className={`text-sm ${passwordState.messageType === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                {passwordState.message}
                            </span>
                        )}
                        <button 
                            type="submit"
                            disabled={passwordState.isSaving}
                            className="px-5 py-2 w-36 text-sm font-bold bg-[#DAFF00] text-[#1A0F3C] rounded-md hover:bg-opacity-90 transition-all duration-200 disabled:bg-slate-700 disabled:text-slate-400"
                        >
                            {passwordState.isSaving ? 'Updating...' : 'Update Password'}
                        </button>
                    </div>
                </section>
            </form>
            
            {/* Subscription Plan Section */}
            <section className="bg-[#2A1A5E]/50 rounded-xl border border-[#4A3F7A]/30 shadow-lg">
                <div className="p-6 border-b border-[#4A3F7A]/30">
                    <h2 className="text-xl font-bold text-white">My Subscription</h2>
                    <p className="text-sm text-purple-300 mt-1">View your current plan and upgrade for more features.</p>
                </div>
                <div className="p-6">
                    <div className="bg-gradient-to-tr from-[#2A1A5E] to-[#4A3F7A]/50 rounded-2xl p-6 md:p-8 border-2 border-[#DAFF00]/50 shadow-2xl shadow-[#DAFF00]/10 flex flex-col md:flex-row items-center gap-8">
                        <div className="flex-shrink-0 text-center">
                            <div className="w-24 h-24 rounded-full bg-[#1A0F3C] flex items-center justify-center mb-2 mx-auto border-4 border-[#DAFF00]/80">
                                <CrownIcon className="w-12 h-12 text-[#DAFF00]" />
                            </div>
                            <h3 className="text-2xl font-bold text-white">{currentPlanName}</h3>
                            <p className="text-xs text-purple-300 uppercase tracking-wider">Current Plan</p>
                        </div>

                        <div className="flex-grow w-full">
                            <h4 className="font-semibold text-white mb-3">Your plan includes:</h4>
                            <ul className="space-y-2 mb-6">
                                {currentBenefits.map((benefit, index) => (
                                    <li key={index} className="flex items-center text-sm text-purple-200">
                                        <i className="fa-solid fa-check-circle text-green-400 mr-2.5"></i>
                                        {benefit}
                                    </li>
                                ))}
                            </ul>

                            {user.plan !== 'agency' ? (
                                <button onClick={onUpgrade} className="w-full px-5 py-3 text-base font-bold bg-[#DAFF00] text-[#1A0F3C] rounded-md hover:bg-opacity-90 transition-all duration-200 transform hover:scale-105">
                                    <i className="fa-solid fa-rocket mr-2"></i>
                                    {nextPlanName ? `Upgrade to ${nextPlanName}` : 'Upgrade Plan'}
                                </button>
                            ) : (
                                <p className="text-center font-semibold bg-green-500/10 text-green-300 py-3 rounded-md">You have the maximum tier!</p>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};
