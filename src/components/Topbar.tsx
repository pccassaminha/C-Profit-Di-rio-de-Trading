import React, { useState, useRef, useEffect } from 'react';
import { useCurrency } from '../contexts/CurrencyContext';
import { auth, db } from '../firebase';
import { useTrades } from '../hooks/useTrades';
import { Menu, Bell, MessageSquare, UserPlus, MessageCircle, Megaphone, ChevronDown, User, Settings, HelpCircle, Shield, LogOut, Sparkles, Smartphone, BellRing } from 'lucide-react';
import { collection, query, onSnapshot, orderBy, where, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import NotificationCenterModal from './NotificationCenterModal';
import { checkAndNotifySubscriptionExpiry, requestPushPermission } from '../services/notificationService';

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
  const isSuperAdmin = currentUser?.email === 'exportacoes.extras@gmail.com' || currentUser?.email === 'omilionario.extra@gmail.com' || userPlan?.role === 'admin';

  const [dbPhoto, setDbPhoto] = useState<string | null>(null);
  const [dbName, setDbName] = useState<string>('');

  useEffect(() => {
    if (!currentUser) return;
    
    // Listen to "usuarios" doc
    const unsub = onSnapshot(doc(db, 'usuarios', currentUser.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.photoURL) setDbPhoto(data.photoURL);
        if (data.nome) setDbName(data.nome);
      } else {
        // Fallback to "users" doc
        onSnapshot(doc(db, 'users', currentUser.uid), (altSnap) => {
          if (altSnap.exists()) {
            const altData = altSnap.data();
            if (altData.photoURL) setDbPhoto(altData.photoURL);
            if (altData.nome) setDbName(altData.nome);
          }
        });
      }
    });
    
    return () => unsub();
  }, [currentUser]);

  const userName = dbName || currentUser?.displayName || 'Usuário';
  const initial = userName.charAt(0).toUpperCase();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [chatUnreads, setChatUnreads] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushPermission(Notification.permission);
    }
  }, []);

  const handleEnablePush = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await requestPushPermission();
      setPushPermission(perm);
      if (perm === 'granted') {
        alert('Notificações ativadas com sucesso!');
      } else if (perm === 'denied') {
        alert('As notificações foram bloqueadas. Você precisa permitir nas configurações do seu navegador ou dispositivo.');
      }
    }
  };

  const [showPushToast, setShowPushToast] = useState(false);

  useEffect(() => {
    // Only show if we don't have permission and haven't previously dismissed
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        const dismissed = localStorage.getItem('push_prompt_dismissed');
        if (!dismissed) {
          // Show prompt slightly after login/load
          const timer = setTimeout(() => setShowPushToast(true), 3000);
          return () => clearTimeout(timer);
        }
      }
    }
  }, []);

  const handleDismissPushToast = () => {
    setShowPushToast(false);
    localStorage.setItem('push_prompt_dismissed', 'true');
  };

  const handleEnablePushFromToast = async () => {
    setShowPushToast(false);
    await handleEnablePush();
  };

  // Automatic subscription expiry check
  useEffect(() => {
    if (currentUser && userPlan) {
      checkAndNotifySubscriptionExpiry(userPlan, currentUser.uid);
    }
  }, [currentUser, userPlan]);

  // Subscribe to real-time pending friend requests
  useEffect(() => {
    if (!currentUser) return;
    const qFr = query(
      collection(db, 'friend_requests'),
      where('receiverId', '==', currentUser.uid),
      where('status', '==', 'pending')
    );
    const unsubFr = onSnapshot(qFr, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFriendRequests(items);
    }, (error) => {
      console.error('Error fetching friend requests in topbar:', error);
    });
    return () => unsubFr();
  }, [currentUser]);

  const [roomInvites, setRoomInvites] = useState<any[]>([]);

  // Subscribe to real-time pending room invites
  useEffect(() => {
    if (!currentUser) return;
    const qRi = query(
      collection(db, 'room_invites'),
      where('receiverId', '==', currentUser.uid),
      where('status', '==', 'pending')
    );
    const unsubRi = onSnapshot(qRi, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRoomInvites(items);
    }, (error) => {
      console.error('Error fetching room invites in topbar:', error);
    });
    return () => unsubRi();
  }, [currentUser]);

  const handleAcceptRoomInvite = async (invite: any) => {
    try {
      await updateDoc(doc(db, 'room_invites', invite.id), { status: 'accepted' });
      await updateDoc(doc(db, 'chats', invite.roomId), {
        participants: arrayUnion(currentUser?.uid)
      });
      alert('Entraste na sala de bate-papo com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao aceitar convite.');
    }
  };

  const handleDeclineRoomInvite = async (invite: any) => {
    try {
      await updateDoc(doc(db, 'room_invites', invite.id), { status: 'declined' });
      alert('Convite recusado.');
    } catch (err) {
      console.error(err);
      alert('Erro ao recusar convite.');
    }
  };
  
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
      console.warn('Error fetching broadcasts:', error);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Subscribe to real-time chat unreads
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', currentUser.uid)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const unreads: any[] = [];
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const count = data.unreadCount?.[currentUser.uid];
        if (count && count > 0) {
          unreads.push({
            id: doc.id,
            count,
            type: data.type,
            name: data.type === 'group' ? data.name : 'Mensagem Direta',
            senderName: data.lastSenderName || 'Alguém',
          });
        }
      });
      setChatUnreads(unreads);
    });
    return () => unsub();
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

  const totalUnreadChats = chatUnreads.reduce((sum, chat) => sum + chat.count, 0);
  const unreadCount = broadcasts.filter(b => !seenIds.includes(b.id)).length + totalUnreadChats + friendRequests.length + roomInvites.length;

  return (
    <header className="flex justify-between items-center px-4 md:px-6 w-full sticky top-0 z-40 bg-background border-b border-outline-variant/20 h-[calc(64px+env(safe-area-inset-top))] md:h-[calc(80px+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)]">
      <div className="flex items-center gap-3">
        <button 
          onClick={toggleSidebar}
          className="w-10 h-10 rounded-full border border-outline-variant/20 hidden md:flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors"
        >
          <Menu className="w-4 h-4" />
        </button>
        <div className="flex md:hidden items-center gap-2 select-none">
          <img 
            src="https://i.postimg.cc/v8qJ6KTk/C-profit.png" 
            alt="C Profit Logo" 
            className="h-[28px] w-auto drop-shadow-md rounded" 
            loading="eager"
            decoding="async"
          />
          <span className="text-sm font-extrabold tracking-tight text-primary font-headline uppercase">Profit</span>
        </div>
      </div>

      <div className="flex items-center gap-4 relative">
        {/* BELL NOTIFICATION ICON */}
        <div className="relative" ref={bellRef}>
          <button
            onClick={handleBellClick}
            className={`w-10 h-10 rounded-full border border-outline-variant/20 flex items-center justify-center transition-colors relative ${notificationsOpen ? 'bg-surface-container-high ring-2 ring-primary text-primary' : 'text-on-surface hover:bg-surface-container'}`}
          >
            <Bell className="w-5 h-5" />
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
              
              {pushPermission !== 'granted' && pushPermission !== 'denied' && (
                <div className="p-3 bg-secondary/10 border-b border-secondary/20 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <BellRing className="w-4 h-4 text-secondary" />
                    <span className="text-xs font-bold text-on-surface">Ativar Notificações</span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant leading-tight">Receba alertas em tempo real sobre mensagens e faturamento.</p>
                  <button 
                    onClick={handleEnablePush}
                    className="mt-1 bg-secondary text-on-secondary text-xs font-bold py-1.5 px-3 rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Ativar Agora
                  </button>
                </div>
              )}
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2 max-h-[350px]">
                {chatUnreads.map(c => (
                  <div 
                    key={c.id} 
                    onClick={() => {
                        setNotificationsOpen(false);
                        if (onNavigate) {
                           onNavigate('community');
                           // small delay so it navigates then opens
                           setTimeout(() => {
                              window.dispatchEvent(new CustomEvent('openGlobalChat'));
                           }, 300);
                        }
                    }}
                    className="p-3.5 rounded-xl border transition-colors bg-primary/5 border-primary/20 shadow-sm cursor-pointer hover:bg-primary/10"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <MessageSquare className="w-[18px] h-[18px] text-primary" />
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-primary">
                        Nova Mensagem
                      </span>
                    </div>
                    <p className="text-xs text-on-surface font-medium leading-relaxed">
                      Você tem <strong className="font-black text-primary">{c.count}</strong> mensagem(ns) não lida(s) de <strong className="font-bold">{c.type === 'group' ? c.name : c.senderName}</strong>. Clique aqui para ir para a comunidade.
                    </p>
                  </div>
                ))}
                {friendRequests.map(fr => (
                  <div 
                    key={fr.id} 
                    onClick={() => {
                        setNotificationsOpen(false);
                        if (onNavigate) {
                           onNavigate('community');
                        }
                    }}
                    className="p-3.5 rounded-xl border transition-colors bg-secondary/5 border-secondary/20 shadow-sm cursor-pointer hover:bg-secondary/10 flex items-center gap-2.5"
                  >
                    <img 
                      src={fr.senderPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(fr.senderName)}&background=random`} 
                      alt={fr.senderName} 
                      className="w-9 h-9 rounded-xl object-cover shrink-0 border border-outline-variant/10" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <UserPlus className="w-4 h-4 text-secondary" />
                        <span className="text-[10px] uppercase tracking-wider font-extrabold text-secondary">
                          Novo Pedido
                        </span>
                      </div>
                      <p className="text-[11px] text-on-surface leading-tight">
                        <strong className="font-bold text-on-surface">{fr.senderName}</strong> enviou um pedido de amizade. Toque aqui para decidir na Comunidade!
                      </p>
                    </div>
                  </div>
                ))}
                {roomInvites.map(invite => (
                  <div 
                    key={invite.id} 
                    className="p-3.5 rounded-xl border transition-colors bg-primary/5 border-primary/25 shadow-sm space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-[18px] h-[18px] text-primary" />
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-primary">
                        Convite de Sala
                      </span>
                    </div>
                    <p className="text-[11px] text-on-surface leading-snug">
                      O trader <strong className="text-primary font-bold">{invite.senderName}</strong> convidou-te para fazer parte de sua sala <strong className="text-primary font-bold">"{invite.roomName}"</strong>.
                    </p>
                    <div className="flex gap-2 justify-end">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAcceptRoomInvite(invite);
                        }}
                        className="px-2.5 py-1 bg-primary text-on-primary text-[9px] font-bold rounded-lg uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                      >
                        Aceitar
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeclineRoomInvite(invite);
                        }}
                        className="px-2.5 py-1 bg-error/10 text-error text-[9px] font-bold rounded-lg uppercase tracking-wider hover:bg-error/20 active:scale-95 transition-all cursor-pointer"
                      >
                        Recusar
                      </button>
                    </div>
                  </div>
                ))}
                {broadcasts.length === 0 && chatUnreads.length === 0 && friendRequests.length === 0 && roomInvites.length === 0 ? (
                  <div className="text-center py-8 px-4 text-on-surface-variant text-xs italic">
                    Nenhuma notificação por enquanto.
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
                          <Megaphone className="w-[18px] h-[18px] text-primary" />
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

              {/* Botão para abrir a Central Completa de Notificações, Balanço Semanal e Faturamento */}
              <div className="p-2 border-t border-outline-variant/10 bg-surface-container">
                <button
                  type="button"
                  onClick={() => {
                    setNotificationsOpen(false);
                    setIsNotificationModalOpen(true);
                  }}
                  className="w-full py-2 bg-[#00f5a0]/15 hover:bg-[#00f5a0]/25 text-[#00f5a0] rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all border border-[#00f5a0]/30"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Abrir Central de Balanços & Push
                </button>
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
              {dbPhoto || auth.currentUser?.photoURL ? (
                <img src={dbPhoto || auth.currentUser?.photoURL || ''} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <span className="text-on-surface text-sm font-medium">{userName.split(' ')[0]}</span>
            <ChevronDown className={`w-4 h-4 text-on-surface-variant transition-transform duration-200 ${dropdownOpen ? "rotate-180" : "rotate-0"}`} />
          </div>

          {dropdownOpen && (
            <div className="absolute top-full right-0 mt-3 w-56 bg-surface-container-high border border-outline-variant/20 rounded-2xl shadow-xl overflow-hidden py-2 z-50 animate-in fade-in slide-in-from-top-4 duration-200 origin-top-right">
              <button 
                onClick={() => handleNavigate('profile')}
                className="w-full text-left px-4 py-3 text-sm text-on-surface hover:bg-surface-container hover:text-primary transition-colors flex items-center gap-3"
              >
                <User className="w-[18px] h-[18px]" />
                Meu Perfil
              </button>
              <button 
                onClick={() => handleNavigate('settings')}
                className="w-full text-left px-4 py-3 text-sm text-on-surface hover:bg-surface-container hover:text-primary transition-colors flex items-center gap-3 border-t border-outline-variant/10"
              >
                <Settings className="w-[18px] h-[18px]" />
                Configurações
              </button>
              <button 
                onClick={() => handleNavigate('support')}
                className="w-full text-left px-4 py-3 text-sm text-on-surface hover:bg-surface-container hover:text-primary transition-colors flex items-center gap-3 border-t border-outline-variant/10"
              >
                <HelpCircle className="w-[18px] h-[18px]" />
                Suporte
              </button>
              {isSuperAdmin && (
                <button 
                  onClick={() => handleNavigate('admin')}
                  className="w-full text-left px-4 py-3 text-sm text-primary hover:bg-surface-container transition-colors flex items-center gap-3 border-t border-outline-variant/10"
                >
                  <Shield className="w-[18px] h-[18px]" />
                  Administração
                </button>
              )}
              <button 
                onClick={() => auth.signOut()}
                className="w-full text-left px-4 py-3 text-sm text-error hover:bg-error/10 transition-colors flex items-center gap-3 border-t border-outline-variant/10 font-bold"
              >
                <LogOut className="w-[18px] h-[18px]" />
                Sair da Conta
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Central Modal de Notificações, Balanço Semanal e Fechamento Mensal */}
      <NotificationCenterModal 
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        onNavigate={onNavigate}
      />

      {/* Floating Push Prompt Toast */}
      {showPushToast && (
        <div className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:w-80 bg-surface-container-high border border-primary/30 rounded-2xl p-4 shadow-2xl z-50 animate-in slide-in-from-bottom-8 fade-in flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <BellRing className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-on-surface">Ativar Alertas</h4>
              <p className="text-[11px] text-on-surface-variant leading-snug mt-0.5">Receba alertas em tempo real sobre trades, chat e faturamento. Não perca nada!</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <button 
              onClick={handleDismissPushToast}
              className="flex-1 bg-surface-container hover:bg-outline-variant/10 text-on-surface-variant text-xs font-bold py-2 rounded-xl transition-colors"
            >
              Agora Não
            </button>
            <button 
              onClick={handleEnablePushFromToast}
              className="flex-1 bg-primary text-on-primary text-xs font-bold py-2 rounded-xl hover:opacity-90 transition-opacity"
            >
              Ativar
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
