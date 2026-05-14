import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from './firebase';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './components/Dashboard';
import TradeJournal from './components/TradeJournal';
import Withdrawals from './components/Withdrawals';
import Community from './components/Community';
import Settings from './components/Settings';
import Profile from './components/Profile';
import Plans from './components/Plans';
import Payments from './components/Payments';
import AdminPanel from './components/AdminPanel';
import Support from './components/Support';
import Planner from './components/Planner';
import { useTrades } from './hooks/useTrades';

import Auth from './components/Auth';
import Landing from './components/Landing';
import Termos from './components/Termos';
import Privacidade from './components/Privacidade';
import Ajuda from './components/Ajuda';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [journalView, setJournalView] = useState<'list' | 'form' | 'detail'>('list');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [needsPlanSelection, setNeedsPlanSelection] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');
  const [publicPage, setPublicPage] = useState<string>('landing');
  
  const { isExpired, userPlan } = useTrades();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      if (!currentUser) {
        setShowAuth(false); // Reset to landing when logged out
        setAuthInitialMode('login');
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAuthSuccess = (isNewUser: boolean) => {
    setShowAuth(false);
    if (isNewUser) {
      setNeedsPlanSelection(true);
    }
  };

  if (!isAuthReady) {
    return <div className="min-h-screen bg-[#0b1326] flex items-center justify-center text-primary font-black uppercase tracking-[0.2em] animate-pulse">Iniciando Terminal...</div>;
  }

  // Se o usuário acabou de se cadastrar e precisa escolher um plano
  if (user && needsPlanSelection) {
    return (
      <div className="min-h-screen bg-background overflow-y-auto">
        <div className="p-8 max-w-7xl mx-auto text-center space-y-8">
           <div className="space-y-4">
             <h1 className="text-5xl font-black text-on-surface font-headline uppercase italic tracking-tighter">Bem-vindo ao <span className="text-primary italic">Terminal</span></h1>
             <p className="text-on-surface-variant max-w-2xl mx-auto">Para começar sua jornada rumo à consistência, selecione o nível de acesso que melhor se adapta às suas operações de mercado.</p>
           </div>
           
           <Plans hideHeader />
           
           <div className="flex flex-col items-center gap-4 mt-8 pb-12">
             <button 
               onClick={() => setNeedsPlanSelection(false)}
               className="bg-surface-container-high text-on-surface-variant hover:text-on-surface px-10 py-4 rounded-full text-xs font-black uppercase tracking-widest transition-all border border-outline-variant/10 shadow-lg"
             >
               Pular por enquanto (Plano Iniciante)
             </button>
             <p className="text-[10px] text-on-surface-variant opacity-50 uppercase tracking-[0.2em]">Você pode alterar seu plano a qualquer momento nas configurações.</p>
           </div>
        </div>
      </div>
    );
  }

  if (!user) {
    if (showAuth) {
      return <Auth onSuccess={handleAuthSuccess} initialMode={authInitialMode} />;
    }
    if (publicPage === 'termos') {
      return <Termos onBack={() => setPublicPage('landing')} />;
    }
    if (publicPage === 'privacidade') {
      return <Privacidade onBack={() => setPublicPage('landing')} />;
    }
    if (publicPage === 'ajuda') {
      return <Ajuda onBack={() => setPublicPage('landing')} />;
    }
    return (
      <Landing 
        onLoginClick={() => {
          setAuthInitialMode('login');
          setShowAuth(true);
        }} 
        onRegisterClick={() => {
          setAuthInitialMode('register');
          setShowAuth(true);
        }}
        onNavigate={setPublicPage}
      />
    );
  }

  const renderContent = () => {
    // Se o plano estiver expirado, forçar exibição da página de planos
    const allowedExpiredTabs = ['plans', 'payments', 'profile', 'support', 'settings'];
    if (isExpired && !allowedExpiredTabs.includes(activeTab)) {
      return <Plans forcedExpired />;
    }

    switch(activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'journal': return <TradeJournal currentView={journalView} onViewChange={setJournalView} />;
      case 'withdrawals': return <Withdrawals />;
      case 'community': return <Community />;
      case 'settings': return <Settings />;
      case 'profile': return <Profile />;
      case 'plans': return <Plans />;
      case 'payments': return <Payments />;
      case 'admin': 
        if (user?.email === 'exportacoes.extras@gmail.com') return <AdminPanel />;
        return <Dashboard />;
      case 'support': return <Support />;
      case 'planner': return <Planner />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="bg-background text-white font-body min-h-screen flex selection:bg-primary-container selection:text-white">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={isSidebarOpen} 
      />
      <div className="flex-1 flex flex-col min-h-screen w-full overflow-hidden">
        <Topbar 
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
          onProfileClick={() => setActiveTab('profile')}
          onPlansClick={() => setActiveTab('plans')}
        />
        <main className="flex-1 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
