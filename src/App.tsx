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
import UserAffiliate from './components/UserAffiliate';
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
  const [showAuth, setShowAuth] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');
  const [publicPage, setPublicPage] = useState<string>('landing');
  
  const { isExpired, userPlan } = useTrades();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref) {
      localStorage.setItem('referredBy', ref);
    }
  }, []);

  useEffect(() => {
    const handleNavigation = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setActiveTab(customEvent.detail);
      }
    };
    window.addEventListener('navigateToTab', handleNavigation);
    return () => window.removeEventListener('navigateToTab', handleNavigation);
  }, []);

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

  const handleAuthSuccess = () => {
    setShowAuth(false);
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-8">
        <div className="flex items-end justify-center gap-3 h-20">
          <div className="w-5 bg-emerald-500 rounded-sm h-8 relative animate-[bounce_1s_infinite_0s] after:content-[''] after:absolute after:w-0.5 after:h-16 after:bg-emerald-500/50 after:-top-4 after:left-1/2 after:-translate-x-1/2 shadow-[0_0_15px_rgba(16,185,129,0.3)]"></div>
          <div className="w-5 bg-rose-500 rounded-sm h-12 relative animate-[bounce_1s_infinite_0.2s] after:content-[''] after:absolute after:w-0.5 after:h-20 after:bg-rose-500/50 after:-top-4 after:left-1/2 after:-translate-x-1/2 shadow-[0_0_15px_rgba(244,63,94,0.3)]"></div>
          <div className="w-5 bg-emerald-500 rounded-sm h-16 relative animate-[bounce_1s_infinite_0.4s] after:content-[''] after:absolute after:w-0.5 after:h-24 after:bg-emerald-500/50 after:-top-4 after:left-1/2 after:-translate-x-1/2 shadow-[0_0_15px_rgba(16,185,129,0.3)]"></div>
          <div className="w-5 bg-rose-500 rounded-sm h-10 relative animate-[bounce_1s_infinite_0.6s] after:content-[''] after:absolute after:w-0.5 after:h-14 after:bg-rose-500/50 after:-top-2 after:left-1/2 after:-translate-x-1/2 shadow-[0_0_15px_rgba(244,63,94,0.3)]"></div>
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
    const allowedExpiredTabs = ['plans', 'payments', 'profile', 'support', 'settings', 'admin'];
    const isAdmin = user?.email === 'exportacoes.extras@gmail.com' || userPlan?.role === 'admin';
    
    if (isExpired && !isAdmin && !allowedExpiredTabs.includes(activeTab)) {
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
      case 'affiliates_user': return <UserAffiliate />;
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
          onNavigate={(tab) => setActiveTab(tab)}
        />
        <main className="flex-1 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
