import React, { useState, useRef, useEffect } from 'react';
import { useCurrency } from '../contexts/CurrencyContext';
import { auth, db } from '../firebase';
import { useTrades } from '../hooks/useTrades';
import { collection, query, onSnapshot, orderBy, where, doc, updateDoc, arrayUnion } from 'firebase/firestore';

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
  const isSuperAdmin = currentUser?.email === 'exportacoes.extras@gmail.com' || userPlan?.role === 'admin';

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
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [chatUnreads, setChatUnreads] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);

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
    const bQ = query(collection(db, 'broadcasts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(bQ, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBroadcasts(docs);
    }, (error) => {
      console.error('Error fetching broadcasts:', error);
    });

    return () => unsubscribe();
  }, []);

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
    <header className="flex justify-between items-center px-4 md:px-6 w-full h-16 md:h-20 sticky top-0 z-40 bg-background border-b border-outline-variant/20">
      <div className="flex items-center gap-3">
        <button 
          onClick={toggleSidebar}
          className="w-10 h-10 rounded-full border border-outline-variant/20 hidden md:flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors"
        >
          <span className="material-symbols-outlined text-sm">menu</span>
        </button>
        <div className="flex md:hidden items-center gap-2 select-none">
          <img src="https://i.postimg.cc/v8qJ6KTk/C-profit.png" alt="C Logo" className="h-[24px] w-auto drop-shadow-md rounded" />
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
                      <span className="material-symbols-outlined text-primary text-[18px]">chat</span>
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
                        <span className="material-symbols-outlined text-secondary text-[16px]">group_add</span>
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
                      <span className="material-symbols-outlined text-primary text-[18px]">forum</span>
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
              {dbPhoto || auth.currentUser?.photoURL ? (
                <img src={dbPhoto || auth.currentUser?.photoURL || ''} alt="Profile" className="w-full h-full object-cover" />
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
              {isSuperAdmin && (
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
