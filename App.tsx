
import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider } from './context/AuthContext.tsx';
import { DataProvider } from './context/DataContext.tsx';
import { UIProvider } from './context/UIContext.tsx';
import { supabase } from './services/supabaseClient.ts';
import type { Session, Plan, Client } from './types.ts';
import { SalesPage } from './components/SalesPage.tsx';
import { Oto1Page } from './components/Oto1Page.tsx';
import { Oto2Page } from './components/Oto2Page.tsx';
import { Oto3Page } from './components/Oto3Page.tsx';
import { AuthPage } from './components/AuthPage.tsx';
import { Dashboard } from './components/Dashboard.tsx';

type FlowState = 'sales' | 'oto1' | 'oto2' | 'oto3' | 'app' | 'auth';
type PendingUpgrade = { plan: Plan, nextState: FlowState };

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [flowState, setFlowState] = useState<FlowState>('sales');
  const [guestPlan, setGuestPlan] = useState<Plan | null>(null);
  const [pendingUpgrade, setPendingUpgrade] = useState<PendingUpgrade | null>(null);
  const [impersonatingClient, setImpersonatingClient] = useState<Client | null>(null);


  useEffect(() => {
    const getSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        if (session) {
            if (pendingUpgrade) {
                // Let the auth context handle the upgrade, then move to the next state
                setFlowState(pendingUpgrade.nextState);
                setPendingUpgrade(null); // Clear pending upgrade
            } else {
                setFlowState('app');
            }
        }
        setIsLoadingSession(false);
    }
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
          if (pendingUpgrade) {
             setFlowState(pendingUpgrade.nextState);
             setPendingUpgrade(null);
          } else {
             setFlowState('app');
          }
      } else {
          // If user signs out, reset to sales page
          setFlowState('sales');
          setGuestPlan(null);
          setPendingUpgrade(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [pendingUpgrade]);

  const handleUpgradeClick = (plan: Plan, nextState: FlowState) => {
    if (session) { // User is logged in, upgrade directly
        // The actual upgrade logic is handled by AuthContext, this just moves the flow
        setFlowState(nextState);
    } else { // User is a guest, needs to sign up
        setPendingUpgrade({ plan, nextState });
        setFlowState('auth');
    }
  };
  
  const handleLoginAsClient = (client: Client) => {
      setImpersonatingClient(client);
      window.scrollTo(0, 0);
  };

  const handleLogoutClientView = () => {
      setImpersonatingClient(null);
  };
  
  const renderFlow = () => {
      if (session) {
          // Logged-in user flow
           switch (flowState) {
              case 'oto2':
                  return <Oto2Page onUpgrade={() => handleUpgradeClick('dfy', 'oto3')} onDecline={() => setFlowState('oto3')} />;
              case 'oto3':
                  return <Oto3Page onUpgrade={() => handleUpgradeClick('agency', 'app')} onDecline={() => setFlowState('app')} />;
              case 'app':
              default:
                   return (
                      <Dashboard 
                          impersonatingClient={impersonatingClient}
                          onLoginAsClient={handleLoginAsClient}
                          onLogoutClientView={handleLogoutClientView}
                          onNavigate={(state) => setFlowState(state)}
                      />
                  );
          }
      }
      
      // Logged-out (guest) user flow
      switch (flowState) {
          case 'sales':
              return <SalesPage onPurchaseClick={() => setFlowState('oto1')} onDashboardClick={() => setFlowState('auth')} />;
          case 'oto1':
              return <Oto1Page onUpgrade={() => handleUpgradeClick('unlimited', 'oto2')} onDecline={() => setFlowState('oto2')} />;
          case 'oto2':
              return <Oto2Page onUpgrade={() => handleUpgradeClick('dfy', 'oto3')} onDecline={() => setFlowState('oto3')} />;
          case 'oto3':
              // If they decline the final offer, they enter guest mode with a basic plan.
              return <Oto3Page onUpgrade={() => handleUpgradeClick('agency', 'app')} onDecline={() => { setGuestPlan('basic'); setFlowState('app'); }} />;
          case 'auth':
              return <AuthPage />;
          case 'app':
              // This is Guest Mode
              return (
                  <Dashboard 
                      impersonatingClient={null}
                      onLoginAsClient={() => {}} // Not possible in guest mode
                      onLogoutClientView={() => {}}
                      onNavigate={(state) => setFlowState(state)}
                  />
              );
          default:
              return <SalesPage onPurchaseClick={() => setFlowState('oto1')} onDashboardClick={() => setFlowState('auth')} />;
      }
  };


  if (isLoadingSession) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-[#1A0F3C]">
             <svg className="animate-spin h-10 w-10 text-[#DAFF00]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        </div>
    );
  }

  return (
    <AuthProvider session={session} guestPlan={guestPlan} pendingUpgradePlan={pendingUpgrade?.plan}>
        <UIProvider>
            <DataProvider>
                {renderFlow()}
            </DataProvider>
        </UIProvider>
    </AuthProvider>
  );
};

export default App;
