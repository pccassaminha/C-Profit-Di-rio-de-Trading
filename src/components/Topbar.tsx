import React, { useState, useRef, useEffect } from 'react';
import { useCurrency } from '../contexts/CurrencyContext';
import { auth, db } from '../firebase';
import { useTrades } from '../hooks/useTrades';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreError';

export default function Topbar({ 
  toggleSidebar, 
  onProfileClick,
  onPlansClick,
  onNavigate
}: { 
  toggleSidebar?: () => void, 
  onProfileClick?: () => void,
  onPlansClick?: () => void,
  onNavigate?: (tab: string) => void
}) {
  const { currency, setCurrency } = useCurrency();
  const { userPlan } = useTrades();
  const currentUser = auth.currentUser;
  const isSuperAdmin = currentUser?.email === 'exportacoes.extras@gmail.com';
  const isAdmin = isSuperAdmin || userPlan?.role === 'admin';
  const userName = currentUser?.displayName || 'Usuário';
  const initial = userName.charAt(0).toUpperCase();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  // Load seen broadcasts from localStorage
  useEffect(() => {
    if (currentUser) {
      const key = `seen_broadcasts_${currentUser.uid}`;
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          setSeenIds(JSON.parse(stored));
        }
      } catch (e) {
        console.error('Error loading seen notifications:', e);
      }
    }
  }, [currentUser]);

  // Subscribe to real-time broadcasts
  useEffect(() => {
    if (!currentUser) return;

    const bQ = query(collection(db, 'broadcasts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(bQ, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBroadcasts(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'broadcasts');
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Handle clicks outside dropdowns to close them
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef, bellRef]);

  const handleNavigate = (tab: string) => {
    setDropdownOpen(false);
    if (onNavigate) {
      onNavigate(tab);
    } else if (tab === 'profile' && onProfileClick) {
      onProfileClick();
    }
  };

  const handleBellClick = () => {
    const nextState = !notificationsOpen;
    setNotificationsOpen(nextState);

    if (nextState && currentUser && broadcasts.length > 0) {
      // Mark all current broadcasts as read/seen
      const allIds = broadcasts.map(b => b.id);
      const updatedSeen = Array.from(new Set([...seenIds, ...allIds]));
      setSeenIds(updatedSeen);
      
      const key = `seen_broadcasts_${currentUser.uid}`;
      try {
        localStorage.setItem(key, JSON.stringify(updatedSeen));
      } catch (e) {
        console.error('Error saving seen notifications:', e);
      }
    }
  };

  const unreadCount = broadcasts.filter(b => !seenIds.includes(b.id)).length;

  return (
    <header className="flex justify-between items-center px-6 w-full h-20 sticky top-0 z-40 bg-background border-b border-outline-variant/20">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar}
          className="w-10 h-10 rounded-full border border-outline-variant/20 flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors"
        >
          <span className="material-symbols-outlined text-sm">menu</span>
        </button>
        <div className="flex md:hidden items-center gap-2">
          <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary text-sm">show_chart</span>
          </div>
          <span className="text-xl font-black tracking-tight text-primary font-headline">C Profit</span>
        </div>
      </div>

      <div className="flex items-center gap-4 relative">
        {/* BELL NOTIFICATION ICON */}
        <div className="relative" ref={bellRef}>
          <button
            onClick={handleBellClick}
            className={`w-10 h-10 rounded-full border border-outline-variant/20 flex items-center justify-center transition-colors relative ${notificationsOpen ? 'bg-surface-container-high ring-2 ring-primary text-primary' : 'text-on-surface hover:bg-surface-container'}`}
          >
            <span className="material-symbols-outlined text-xl">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-error text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>

          {/* NOTIFICATION BOX DROPDOWN */}
          {notificationsOpen && (
            <div className="absolute top-full right-0 mt-3 w-80 max-h-[450px] bg-surface-container-high border border-outline-variant/20 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 duration-200 origin-top-right flex flex-col">
              <div className="p-4 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container">
                <p className="font-bold text-sm text-on-surface">Comunicados & Avisos</p>
                {unreadCount > 0 && (
                  <span className="text-[10px] bg-primary/20 text-primary font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {unreadCount} Novo{unreadCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2 max-h-[350px]">
                {broadcasts.length === 0 ? (
                  <div className="text-center py-8 px-4 text-on-surface-variant text-xs italic">
                    Nenhum comunicado oficial por enquanto.
                  </div>
                ) : (
                  broadcasts.map((b) => {
                    const isNew = !seenIds.includes(b.id);
                    return (
                      <div 
                        key={b.id} 
                        className={`p-3.5 rounded-xl border transition-colors ${
                          isNew 
                            ? 'bg-primary/5 border-primary/20 shadow-sm' 
                            : 'bg-surface-container border-outline-variant/5'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="material-symbols-outlined text-primary text-[18px]">campaign</span>
                          <span className="text-[10px] uppercase tracking-wider font-extrabold text-primary">
                            {b.author || 'Admin'}
                          </span>
                          <span className="text-[9px] text-on-surface-variant ml-auto opacity-70">
                            {b.createdAt ? new Date(b.createdAt.toDate ? b.createdAt.toDate() : b.createdAt).toLocaleDateString() : ''}
                          </span>
                        </div>
                        <p className="text-xs text-on-surface font-medium leading-relaxed whitespace-pre-wrap">
                          {b.message}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={dropdownRef}>
          <div 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={`flex items-center gap-2 bg-surface-container border border-outline-variant/20 rounded-full pl-1 pr-4 py-1 cursor-pointer hover:bg-surface-container-high transition-colors ${dropdownOpen ? 'ring-2 ring-primary bg-surface-container-high' : ''}`}
          >
            <div className="w-8 h-8 rounded-full bg-on-surface text-background flex items-center justify-center font-bold text-xs overflow-hidden">
              {auth.currentUser?.photoURL ? (
                <img src={auth.currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <span className="text-on-surface text-sm font-medium">{userName.split(' ')[0]}</span>
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant transition-transform duration-200" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
          </div>

          {dropdownOpen && (
            <div className="absolute top-full right-0 mt-3 w-56 bg-surface-container-high border border-outline-variant/20 rounded-2xl shadow-xl overflow-hidden py-2 z-50 animate-in fade-in slide-in-from-top-4 duration-200 origin-top-right">
              <button 
                onClick={() => handleNavigate('profile')}
                className="w-full text-left px-4 py-3 text-sm text-on-surface hover:bg-surface-container hover:text-primary transition-colors flex items-center gap-3"
              >
                <span className="material-symbols-outlined text-[18px]">person</span>
                Meu Perfil
              </button>
              <button 
                onClick={() => handleNavigate('settings')}
                className="w-full text-left px-4 py-3 text-sm text-on-surface hover:bg-surface-container hover:text-primary transition-colors flex items-center gap-3 border-t border-outline-variant/10"
              >
                <span className="material-symbols-outlined text-[18px]">settings</span>
                Configurações
              </button>
              <button 
                onClick={() => handleNavigate('support')}
                className="w-full text-left px-4 py-3 text-sm text-on-surface hover:bg-surface-container hover:text-primary transition-colors flex items-center gap-3 border-t border-outline-variant/10"
              >
                <span className="material-symbols-outlined text-[18px]">help</span>
                Suporte
              </button>
              {isAdmin && (
                <button 
                  onClick={() => handleNavigate('admin')}
                  className="w-full text-left px-4 py-3 text-sm text-primary hover:bg-surface-container transition-colors flex items-center gap-3 border-t border-outline-variant/10"
                >
                  <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                  Administração
                </button>
              )}
              <button 
                onClick={() => auth.signOut()}
                className="w-full text-left px-4 py-3 text-sm text-error hover:bg-error/10 transition-colors flex items-center gap-3 border-t border-outline-variant/10 font-bold"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                Sair da Conta
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
