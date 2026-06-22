import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './components/Dashboard';
import TradeJournal from './components/TradeJournal';
import Withdrawals from './components/Withdrawals';
import Community from './components/Community';
import Panorama from './components/Panorama';
import Settings from './components/Settings';
import Profile from './components/Profile';
import Plans from './components/Plans';
import Payments from './components/Payments';
import AdminPanel from './components/AdminPanel';
import Support from './components/Support';
import Planner from './components/Planner';
import UserAffiliate from './components/UserAffiliate';
import GlobalChatWidget from './components/GlobalChatWidget';
import MobileBottomNav from './components/MobileBottomNav';
import { useTrades } from './hooks/useTrades';

import Auth from './components/Auth';
import Landing from './components/Landing';
import Termos from './components/Termos';
import Privacidade from './components/Privacidade';
import Ajuda from './components/Ajuda';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [journalView, setJournalView] = useState<'list' | 'form' | 'detail'>(() => {
    const saved = localStorage.getItem('journalView');
    return (saved as 'list' | 'form' | 'detail') || 'list';
  });

  useEffect(() => {
    localStorage.setItem('journalView', journalView);
  }, [journalView]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [copiedCoupon, setCopiedCoupon] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');
  const [authInitialPlan, setAuthInitialPlan] = useState<string>('mensal_6');
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
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      if (!currentUser) {
        setShowAuth(false); // Reset to landing when logged out
        setAuthInitialMode('login');
      } else {
        // Automatically sync setting files from Firestore to localStorage on mount
        try {
          const uDoc = await getDoc(doc(db, 'usuarios', currentUser.uid));
          if (uDoc.exists()) {
            const uData = uDoc.data();
            if (uData.settings) {
              const s = uData.settings;
              if (s.dateFormat) localStorage.setItem('app_date_format', s.dateFormat);
              if (s.sessionType) localStorage.setItem('app_session_type', s.sessionType);
              if (s.defaultTradeType) localStorage.setItem('app_default_trade_type', s.defaultTradeType);
              if (s.defaultCommunityFeed) localStorage.setItem('app_default_community_feed', s.defaultCommunityFeed);
              if (s.showCommunityFilter !== undefined) localStorage.setItem('app_show_community_filter', s.showCommunityFilter.toString());
              if (s.visibleMarkets) localStorage.setItem('app_visible_markets', s.visibleMarkets);
              if (s.sessions) localStorage.setItem('app_sessions', JSON.stringify(s.sessions));
            }
          }
        } catch (error) {
          console.error("Error loading settings from Firestore in App.tsx:", error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAuthSuccess = (isNewUser?: boolean) => {
    setShowAuth(false);
    if (isNewUser) {
      setActiveTab('payments');
    }
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
      return <Auth onSuccess={handleAuthSuccess} initialMode={authInitialMode} initialPlan={authInitialPlan} />;
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
        onRegisterClick={(planId?: string) => {
          setAuthInitialMode('register');
          if (planId) setAuthInitialPlan(planId);
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
      case 'panorama': return <Panorama />;
      case 'charts': return null;
      case 'community': return <Community />;
      case 'settings': return <Settings />;
      case 'profile': return <Profile />;
      case 'plans': return <Plans />;
      case 'payments': return <Payments />;
      case 'admin': 
        if (isAdmin) return <AdminPanel />;
        return <Dashboard />;
      case 'support': return <Support />;
      case 'planner': return <Planner />;
      case 'affiliates_user': return <UserAffiliate />;
      default: return <Dashboard />;
    }
  };

  const handleCopyCoupon = () => {
    navigator.clipboard.writeText('CPROFIT83%OFF');
    setCopiedCoupon(true);
    setTimeout(() => setCopiedCoupon(false), 3000);
  };

  const showCouponBanner = !!user && 
    (userPlan?.plan_type === 'trial_15' || userPlan?.plan_type === 'trial_30' || userPlan?.plan_type === 'Iniciante' || isExpired) && 
    !isBannerDismissed;

  return (
    <div className="bg-background text-white font-body min-h-screen flex selection:bg-primary-container selection:text-white relative">
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
        {localStorage.getItem('partnerModeActive') === 'true' && (
          <div className="bg-[#00f5a0]/15 border-b border-[#00f5a0]/30 px-6 py-2.5 flex items-center justify-between text-[#00f5a0] text-xs font-semibold select-none animate-in fade-in slide-in-from-top duration-300">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">handshake</span>
              <span>Sessão de Parceiro de Portfólio Ativa: Você está acessando a conta e dados de <strong>{auth.currentUser?.displayName}</strong></span>
            </div>
            <button 
              type="button"
              onClick={() => auth.signOut()}
              className="hover:underline flex items-center gap-1 font-bold"
            >
              Excluir Sessão <span className="material-symbols-outlined text-xs">logout</span>
            </button>
          </div>
        )}
        <main className="flex-1 overflow-y-auto pb-24 md:pb-6">
          {renderContent()}
        </main>
      </div>

      <MobileBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {activeTab === 'community' && <GlobalChatWidget isSidebarOpen={isSidebarOpen} />}

      {showCouponBanner && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-[#0d1425] border-2 border-[#00f5a0]/40 rounded-3xl p-5 shadow-[0_10px_50px_rgba(0,245,160,0.2)] animate-in slide-in-from-bottom duration-500 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#00f5a0]/15 rounded-xl flex items-center justify-center text-[#00f5a0] shrink-0">
                 <span className="material-symbols-outlined text-xl">local_activity</span>
              </div>
              <p className="font-extrabold text-xs uppercase tracking-wider text-[#00f5a0]">🎁 Cupom de 83% Ativado!</p>
            </div>
            <button 
              onClick={() => setIsBannerDismissed(true)} 
              className="text-white/40 hover:text-white transition-colors p-1"
              title="Fechar"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
          
          <div className="mt-3 space-y-3">
            <p className="text-[11px] text-white/80 leading-relaxed font-semibold">
              Obtenha um <strong className="text-white font-black">Desconto de 83% Vitalício</strong> ao migrar para qualquer um dos planos profissionais. Copie e cole o código abaixo!
            </p>
            
            <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 justify-between">
              <code className="text-[#00f5a0] font-black tracking-widest text-xs font-mono">CPROFIT83%OFF</code>
              <button 
                onClick={handleCopyCoupon}
                className="bg-[#00f5a0] hover:bg-[#00f5a0]/80 text-black px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 shrink-0"
              >
                <span className="material-symbols-outlined text-[10px]">content_copy</span>
                {copiedCoupon ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
            
            <button
              onClick={() => {
                setActiveTab('plans');
              }}
              className="w-full bg-[#00f5a0] hover:bg-[#00f5a0]/80 text-black text-xs py-2 rounded-xl font-black uppercase tracking-widest transition-all"
            >
              Ver Planos e Assinar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
