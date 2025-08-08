
import React, { useState, useContext, useEffect } from 'react';
import { Dashboard } from './Dashboard.tsx';
import type { Client, Plan } from '../types.ts';
import { AuthContext } from '../context/AuthContext.tsx';
import { SalesPage } from './SalesPage.tsx';
import { Oto1Page } from './Oto1Page.tsx';
import { Oto2Page } from './Oto2Page.tsx';
import { Oto3Page } from './Oto3Page.tsx';
import { AuthPage } from './AuthPage.tsx';

type FlowState = 'sales' | 'oto1' | 'oto2' | 'oto3' | 'app' | 'auth';
type PostAuthAction = { planToUpgrade: Plan, nextFlowState: 'oto2' | 'oto3' | 'app' };


export const AppRouter: React.FC = () => {
    const { state, dispatch: authDispatch } = useContext(AuthContext);
    const { user, isLoading } = state;
    
    const [flowState, setFlowState] = useState<FlowState>(user ? 'app' : 'sales');
    const [postAuthAction, setPostAuthAction] = useState<PostAuthAction | null>(null);
    const [impersonatingClient, setImpersonatingClient] = useState<Client | null>(null);

    // This effect handles the post-login action for upgrades.
    useEffect(() => {
        if (user && postAuthAction) {
            authDispatch({ type: 'UPGRADE_PLAN_REQUEST', payload: postAuthAction.planToUpgrade });
            setFlowState(postAuthAction.nextFlowState);
            setPostAuthAction(null); // Clear the action
        }
    }, [user, postAuthAction, authDispatch]);

    const handleRequireAuth = (action: PostAuthAction) => {
        setPostAuthAction(action);
        setFlowState('auth');
    };
    
    const handleLoginAsClient = (client: Client) => {
        setImpersonatingClient(client);
        window.scrollTo(0, 0);
    };

    const handleLogoutClientView = () => {
        setImpersonatingClient(null);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#1A0F3C]">
                <svg className="animate-spin h-10 w-10 text-[#DAFF00]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
        );
    }
    
    if (!user) {
        // --- USER IS LOGGED OUT ---
        switch (flowState) {
            case 'sales':
                return <SalesPage onPurchaseClick={() => setFlowState('oto1')} onDashboardClick={() => setFlowState('auth')} />;
            case 'oto1':
                return <Oto1Page onNavigateToNextStep={() => setFlowState('oto2')} onRequireAuth={() => handleRequireAuth({ planToUpgrade: 'unlimited', nextFlowState: 'oto2' })} />;
            case 'oto2':
                return <Oto2Page onNavigateToNextStep={() => setFlowState('oto3')} onRequireAuth={() => handleRequireAuth({ planToUpgrade: 'dfy', nextFlowState: 'oto3' })} />;
            case 'oto3':
                return <Oto3Page onNavigateToDashboard={() => setFlowState('app')} onRequireAuth={() => handleRequireAuth({ planToUpgrade: 'agency', nextFlowState: 'app' })} />;
            case 'auth':
                return <AuthPage />;
            case 'app': // User tried to access dashboard while logged out
            default:
                return <AuthPage />;
        }
    } else {
        // --- USER IS LOGGED IN ---
        const dashboard = <Dashboard impersonatingClient={impersonatingClient} onLoginAsClient={handleLoginAsClient} onLogoutClientView={handleLogoutClientView} setAppFlowState={setFlowState} />;
        
        switch (flowState) {
            case 'sales':
            case 'auth':
                 // Logged in user should not see these pages, redirect to app
                setFlowState('app');
                return dashboard;
            case 'oto1':
                return <Oto1Page onNavigateToNextStep={() => setFlowState('oto2')} onRequireAuth={() => { /* Not called when logged in */ }} />;
            case 'oto2':
                return <Oto2Page onNavigateToNextStep={() => setFlowState('oto3')} onRequireAuth={() => { /* Not called when logged in */ }} />;
            case 'oto3':
                return <Oto3Page onNavigateToDashboard={() => setFlowState('app')} onRequireAuth={() => { /* Not called when logged in */ }} />;
            case 'app':
            default:
                return dashboard;
        }
    }
};
