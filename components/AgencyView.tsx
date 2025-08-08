

import React, { useMemo, useContext, useCallback } from 'react';
import type { Client } from '../types.ts';
import { DataContext } from '../context/DataContext.tsx';
import { AuthContext } from '../context/AuthContext.tsx';
import { sendClientInvite } from '../services/geminiService.ts';

interface AgencyViewProps {
    onRemoveClient: (clientId: string) => void;
    onOpenAddClientModal: () => void;
    onLoginAsClient: (client: Client) => void;
    onOpenEditClientModal: (client: Client) => void;
}

const statusStyles = {
    Active: 'bg-green-500/10 text-green-400',
    Pending: 'bg-yellow-500/10 text-yellow-400',
    Inactive: 'bg-red-500/10 text-red-400',
};

const AgencyStatCard: React.FC<{ icon: string; value: number; label: string }> = ({ icon, value, label }) => (
    <div className="bg-[#2A1A5E] p-4 rounded-xl border border-[#4A3F7A]/50 flex items-center space-x-4">
        <div className="bg-[#1A0F3C] p-3 rounded-lg"><i className={`${icon} text-2xl text-[#DAFF00]`}></i></div>
        <div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-sm text-purple-200">{label}</p>
        </div>
    </div>
);


export const AgencyView: React.FC<AgencyViewProps> = ({ onRemoveClient, onOpenAddClientModal, onLoginAsClient, onOpenEditClientModal }) => {
    
    const { state: { user } } = useContext(AuthContext);
    const { state: { clients }, dispatch: dataDispatch } = useContext(DataContext);

    const addNotification = useCallback((message: string) => {
        if(user) {
            dataDispatch({ type: 'ADD_NOTIFICATION_REQUEST', payload: { message, userId: user.id } });
        }
    }, [dataDispatch, user]);

    const stats = useMemo(() => {
        const total = clients.length;
        const active = clients.filter(c => c.status === 'Active').length;
        const pending = clients.filter(c => c.status === 'Pending').length;
        return { total, active, pending };
    }, [clients]);

    const handleSendInvite = async (client: Client) => {
        addNotification(`Sending invite to ${client.name}...`);
        try {
            await sendClientInvite(client.email);
            const updatedClient = { ...client, status: 'Active' as const };
            dataDispatch({ type: 'UPDATE_CLIENT_REQUEST', payload: { updatedClient } });
            addNotification(`Invite sent successfully to ${client.name}. Client is now active.`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            addNotification(`Failed to send invite: ${errorMessage}`);
            console.error("Failed to send invite:", error);
        }
    }

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">My Client Dashboard</h1>
                    <p className="text-purple-300">Add, manage, and log in to your client accounts.</p>
                </div>
                <button onClick={onOpenAddClientModal} className="mt-4 md:mt-0 w-full md:w-auto flex items-center justify-center bg-[#DAFF00] text-[#1A0F3C] font-bold py-2.5 px-6 rounded-md hover:bg-opacity-90 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-[#DAFF00]/50"><i className="fa-solid fa-plus mr-2"></i>Add New Client</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <AgencyStatCard icon="fa-solid fa-users" value={stats.total} label="Total Clients" />
                <AgencyStatCard icon="fa-solid fa-user-check" value={stats.active} label="Active Clients" />
                <AgencyStatCard icon="fa-solid fa-user-clock" value={stats.pending} label="Pending Invitations" />
            </div>

            <div className="bg-[#2A1A5E]/50 rounded-xl border border-[#4A3F7A]/30 shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[#4A3F7A]/50">
                        <thead className="bg-[#1A0F3C]/50"><tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-purple-200 uppercase tracking-wider">Client Name</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-purple-200 uppercase tracking-wider">Client Email</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-purple-200 uppercase tracking-wider">Status</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-purple-200 uppercase tracking-wider">Actions</th>
                        </tr></thead>
                        <tbody className="divide-y divide-[#4A3F7A]/30">
                            {clients.length > 0 ? clients.map((client) => (
                                <tr key={client.id} className="hover:bg-[#1A0F3C]/30 transition-colors duration-200">
                                    <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center"><div className="w-8 h-8 mr-3 bg-[#DAFF00] rounded-full flex items-center justify-center font-bold text-[#1A0F3C] text-xs flex-shrink-0">{client.avatar || client.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()}</div><div className="text-sm font-medium text-white">{client.name}</div></div></td>
                                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-purple-300">{client.email}</div></td>
                                    <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[client.status]}`}>{client.status}</span></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end space-x-2 md:space-x-4">
                                            {client.status === 'Pending' && (
                                                <button onClick={() => handleSendInvite(client)} className="text-purple-300 hover:text-green-400 transition-colors duration-200 text-xs font-bold bg-[#1A0F3C] px-3 py-1.5 rounded-md border border-[#4A3F7A] hover:border-green-400/50" title="Send Invite">
                                                    <i className="fa-solid fa-paper-plane mr-2"></i>Send Invite
                                                </button>
                                            )}
                                            <button onClick={() => onLoginAsClient(client)} className="text-purple-300 hover:text-[#DAFF00] transition-colors duration-200" title="Log In As Client"><i className="fa-solid fa-arrow-right-to-bracket w-5 h-5"></i></button>
                                            <button onClick={() => onOpenEditClientModal(client)} className="text-purple-300 hover:text-blue-400 transition-colors duration-200" title="Edit Client"><i className="fa-solid fa-pencil w-5 h-5"></i></button>
                                            <button onClick={() => onRemoveClient(client.id)} className="text-purple-300 hover:text-red-400 transition-colors duration-200" title="Remove Client"><i className="fa-solid fa-trash-can w-5 h-5"></i></button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (<tr><td colSpan={4} className="text-center py-10 px-6 text-purple-300">No clients found. Click "Add New Client" to get started.</td></tr>)}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
