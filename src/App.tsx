import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from './firebase';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './components/Dashboard';
import TradeJournal from './components/TradeJournal';
import Withdrawals from './components/Withdrawals';
import Psychology from './components/Psychology';
import Settings from './components/Settings';
import Profile from './components/Profile';
import Support from './components/Support';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [journalView, setJournalView] = useState<'list' | 'form' | 'detail'>('list');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  if (!isAuthReady) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-primary">Carregando...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
          <span className="material-symbols-outlined text-on-primary text-3xl">show_chart</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-primary font-headline mb-2">C Profit</h1>
        <p className="text-on-surface-variant mb-8 text-center max-w-sm">Seu terminal avançado para acompanhamento de performance e diário de trades.</p>
        <button 
          onClick={handleLogin}
          className="bg-primary text-on-primary px-8 py-4 rounded-full font-bold hover:brightness-110 transition-all shadow-lg shadow-primary/20 flex items-center gap-3"
        >
          <span className="material-symbols-outlined">login</span>
          Entrar com Google
        </button>
      </div>
    );
  }

  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'journal': return <TradeJournal currentView={journalView} onViewChange={setJournalView} />;
      case 'withdrawals': return <Withdrawals />;
      case 'psychology': return <Psychology />;
      case 'settings': return <Settings />;
      case 'profile': return <Profile />;
      case 'support': return <Support />;
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
        />
        <main className="flex-1 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
