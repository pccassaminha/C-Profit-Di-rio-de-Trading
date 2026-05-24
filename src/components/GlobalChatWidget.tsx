import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, setDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { Send, Users, UserPlus, Settings, Info, Lock, Key, Edit2, Trash2, X, ShieldCheck, MessageSquare, Maximize2, Minimize2 } from 'lucide-react';

interface Chat {
  id: string;
  type: 'direct' | 'group';
  participants: string[];
  lastMessage?: string;
  updatedAt?: any;
  // Group specific
  name?: string;
  description?: string;
  admins?: string[];
  photoURL?: string;
  // Metadata for rendering
  otherUserId?: string;
  otherUserName?: string;
}

export default function GlobalChatWidget({ isSidebarOpen }: { isSidebarOpen: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  
  // Settings 
  const [isChatSettingsOpen, setIsChatSettingsOpen] = useState(false);
  const [newParticipantEmail, setNewParticipantEmail] = useState('');
  const [groupSettingsName, setGroupSettingsName] = useState('');
  const [groupSettingsDesc, setGroupSettingsDesc] = useState('');

  // User search/invite logic inside group chats
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [invitedUserIds, setInvitedUserIds] = useState<string[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);

  // Unread state
  const [totalUnread, setTotalUnread] = useState(0);

  // Realtime contacts/blocks
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('openGlobalChat', handleOpen);
    return () => window.removeEventListener('openGlobalChat', handleOpen);
  }, []);

  // Listen for all user profiles from 'usuarios' collection
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'usuarios'), (snap) => {
      setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  // Listen for pending room invites for current user
  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'room_invites'),
      where('receiverId', '==', auth.currentUser.uid),
      where('status', '==', 'pending')
    );
    const unsub = onSnapshot(q, (snap) => {
      setPendingInvites(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    // Load blocked users
    const blocksQ = query(collection(db, 'users', uid, 'blocks'));
    const unsubBlocks = onSnapshot(blocksQ, snap => {
      setBlockedUsers(snap.docs.map(d => d.id));
    });

    // Load chats where user is participant
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubChats = onSnapshot(q, async (snapshot) => {
      let unread = 0;
      const chatsData: Chat[] = [];
      const blocks = await Promise.all(snapshot.docs.map(async d => {
        const data = d.data();
        let displayData: Partial<Chat> = {};
        
        if (data.type === 'direct') {
          const otherUid = data.participants.find((p: string) => p !== uid);
          if (otherUid) {
            const userDoc = await getDoc(doc(db, 'users', otherUid));
            displayData.otherUserId = otherUid;
            displayData.otherUserName = userDoc.exists() ? userDoc.data()?.name || 'Usuário' : 'Usuário';
          }
        }
        
        const c = { id: d.id, ...data, ...displayData } as Chat;
        chatsData.push(c);
        if (data.unreadCount && data.unreadCount[uid]) {
           unread += data.unreadCount[uid];
        }
      }));
      setChats(chatsData);
      setTotalUnread(unread);
    });

    return () => {
      unsubBlocks();
      unsubChats();
    };
  }, []);

  useEffect(() => {
    if (!activeChat) return;
    const q = query(
      collection(db, 'chats', activeChat.id, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    if (auth.currentUser) {
      updateDoc(doc(db, 'chats', activeChat.id), {
         [`unreadCount.${auth.currentUser.uid}`]: 0
      }).catch(console.error);
    }

    return () => unsub();
  }, [activeChat]);

  const handleAcceptInvite = async (invite: any) => {
    try {
      await updateDoc(doc(db, 'room_invites', invite.id), { status: 'accepted' });
      await updateDoc(doc(db, 'chats', invite.roomId), {
        participants: arrayUnion(auth.currentUser?.uid)
      });
      alert('Entraste na sala de bate-papo com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao aceitar convite.');
    }
  };

  const handleDeclineInvite = async (invite: any) => {
    try {
      await updateDoc(doc(db, 'room_invites', invite.id), { status: 'declined' });
      alert('Convite recusado.');
    } catch (err) {
      console.error(err);
      alert('Erro ao recusar convite.');
    }
  };

  const handleInviteUserToRoom = async (targetUser: any) => {
    if (!activeChat || !auth.currentUser) return;
    try {
      await addDoc(collection(db, 'room_invites'), {
        roomId: activeChat.id,
        roomName: activeChat.name || 'Nova Sala',
        senderId: auth.currentUser.uid,
        senderName: auth.currentUser.displayName || 'Trader',
        receiverId: targetUser.id,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setInvitedUserIds(prev => [...prev, targetUser.id]);
      alert(`Convite enviado para ${targetUser.nome || 'Trader'}!`);
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar convite.');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat || !auth.currentUser) return;

    // Check if direct chat user is blocked
    if (activeChat.type === 'direct' && activeChat.otherUserId && blockedUsers.includes(activeChat.otherUserId)) {
      alert('Você bloqueou este usuário.');
      return;
    }

    try {
      await addDoc(collection(db, 'chats', activeChat.id, 'messages'), {
        text: newMessage,
        senderId: auth.currentUser.uid,
        senderName: auth.currentUser.displayName || 'Usuário',
        senderPhoto: auth.currentUser.photoURL || '',
        createdAt: serverTimestamp()
      });

      const unreadUpdates: any = {};
      activeChat.participants.forEach(p => {
        if (p !== auth.currentUser?.uid) {
           unreadUpdates[`unreadCount.${p}`] = increment(1);
        }
      });

      await updateDoc(doc(db, 'chats', activeChat.id), {
        lastMessage: newMessage,
        lastSenderName: auth.currentUser.displayName || 'Usuário',
        updatedAt: serverTimestamp(),
        ...unreadUpdates
      });
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message', err);
    }
  };

  const createGroup = async () => {
    if (!groupName.trim() || !auth.currentUser) return;
    try {
      await addDoc(collection(db, 'chats'), {
        type: 'group',
        name: groupName,
        description: groupDescription,
        admins: [auth.currentUser.uid],
        participants: [auth.currentUser.uid],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setIsGroupModalOpen(false);
      setGroupName('');
      setGroupDescription('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateGroupInfo = async () => {
    if (!activeChat || !auth.currentUser || !activeChat.admins?.includes(auth.currentUser.uid)) return;
    try {
      await updateDoc(doc(db, 'chats', activeChat.id), {
        name: groupSettingsName,
        description: groupSettingsDesc
      });
      alert('Info da sala atualizada.');
      setIsChatSettingsOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddParticipant = async () => {
    if (!newParticipantEmail.trim() || !activeChat || !auth.currentUser) return;
    try {
      const snapshot = await import('firebase/firestore').then(firestore => firestore.getDocs(query(collection(db, 'users'), where('email', '==', newParticipantEmail.trim()))));
      if (snapshot.empty) {
        alert('Usuário não encontrado com este email.');
        return;
      }
      const newUserId = snapshot.docs[0].id;
      if (activeChat.participants.includes(newUserId)) {
        alert('Este usuário já está na sala.');
        return;
      }

      const updates: any = {
        participants: arrayUnion(newUserId)
      };

      if (activeChat.type === 'direct') {
        updates.type = 'group';
        updates.name = 'Novo Grupo';
        updates.admins = [auth.currentUser.uid];
      }

      await updateDoc(doc(db, 'chats', activeChat.id), updates);
      setNewParticipantEmail('');
      alert('Usuário adicionado!');
    } catch (err) {
      console.error(err);
      alert('Erro ao procurar usuário');
    }
  };

  const handlePromoteAdmin = async (userId: string) => {
    if (!activeChat || !auth.currentUser || !activeChat.admins?.includes(auth.currentUser.uid)) return;
    try {
      await updateDoc(doc(db, 'chats', activeChat.id), {
        admins: arrayUnion(userId)
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveParticipant = async (userId: string) => {
    if (!activeChat || !auth.currentUser || !activeChat.admins?.includes(auth.currentUser.uid)) return;
    if (!window.confirm('Tem certeza?')) return;
    try {
      const data: any = { participants: arrayRemove(userId) };
      if (activeChat.admins?.includes(userId)) {
        data.admins = arrayRemove(userId);
      }
      await updateDoc(doc(db, 'chats', activeChat.id), data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenSettings = () => {
    if (!activeChat) return;
    setGroupSettingsName(activeChat.name || '');
    setGroupSettingsDesc(activeChat.description || '');
    setIsChatSettingsOpen(true);
  };

  const renderMessageText = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline font-bold break-all hover:opacity-80 transition-opacity">{part}</a>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <>
      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[60] w-14 h-14 bg-primary text-on-primary rounded-full flex items-center justify-center shadow-2xl hover:scale-105 transition-transform"
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
        {!isOpen && totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 bg-error text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full animate-pulse border-2 border-surface">
            {totalUnread}
          </span>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div 
          className={`fixed z-[60] bg-surface border border-outline-variant/20 shadow-2xl overflow-hidden flex flex-col md:flex-row transition-all ${
            isFullScreen 
              ? 'inset-0 w-full h-full rounded-none' 
              : 'bottom-24 right-6 w-[calc(100vw-3rem)] max-w-3xl h-[600px] max-h-[80vh] rounded-3xl'
          }`}
        >
          {/* Sidebar - Chat List */}
          <div className={`${activeChat ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 border-r border-outline-variant/20 bg-surface-container-lowest flex-col`}>
            <div className="p-4 border-b border-outline-variant/10 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-black font-headline uppercase tracking-widest text-on-surface">Conversas</h2>
            </div>

            {/* Prominent Wide Action CTA for Room Creation, closing the active chat as requested */}
            <div className="p-3 bg-surface-container-low shrink-0 border-b border-outline-variant/10 space-y-2">
              <button 
                onClick={() => {
                  setActiveChat(null); // Closes active chat
                  setIsGroupModalOpen(true); // Opens build a room modal
                }} 
                className="w-full py-2.5 px-4 bg-primary text-on-primary hover:bg-primary/90 hover:scale-[1.02] active:scale-95 transition-all text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 rounded-2xl shadow-lg shadow-primary/15"
                title="Criar Sala"
              >
                <Users size={16} />
                <span>+ Criar Nova Sala</span>
              </button>

              {/* Real-time pending room invites notifications */}
              {pendingInvites.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Convites de Sala ({pendingInvites.length})</p>
                  {pendingInvites.map(invite => (
                    <div 
                      key={invite.id} 
                      className="p-3 bg-primary/10 border border-primary/20 rounded-2xl animate-in fade-in zoom-in duration-200"
                    >
                      <p className="text-[11px] text-on-surface leading-tight">
                        O trader <strong className="text-primary">{invite.senderName}</strong> convidou-te para fazer parte de sua sala <strong className="text-primary">"{invite.roomName}"</strong>.
                      </p>
                      <div className="flex gap-1.5 mt-2 justify-end">
                        <button 
                          onClick={() => handleAcceptInvite(invite)}
                          className="px-2.5 py-1 bg-primary text-on-primary text-[9px] font-bold rounded-lg uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all"
                        >
                          Aceitar
                        </button>
                        <button 
                          onClick={() => handleDeclineInvite(invite)}
                          className="px-2.5 py-1 bg-error/15 text-error text-[9px] font-extrabold rounded-lg uppercase tracking-wider hover:bg-error/25 active:scale-95 transition-all"
                        >
                          Recusar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {chats.map(chat => {
                 const unread = chat.unreadCount?.[auth.currentUser?.uid || ''];
                 return (
                  <div 
                    key={chat.id} 
                    onClick={() => setActiveChat(chat)}
                    className={`p-4 border-b border-outline-variant/5 cursor-pointer transition-colors relative ${activeChat?.id === chat.id ? 'bg-primary/10 border-l-4 border-l-primary' : 'hover:bg-surface-container'}`}
                  >
                    <h3 className="font-bold text-sm text-on-surface flex items-center gap-2 pr-6 truncate">
                      {chat.type === 'group' ? <Users size={14} className="text-primary shrink-0"/> : null}
                      {chat.type === 'group' ? chat.name : chat.otherUserName}
                    </h3>
                    <p className="text-xs text-on-surface-variant truncate mt-1">
                      {chat.lastMessage || 'Nenhuma mensagem ainda'}
                    </p>
                    {!!unread && unread > 0 && activeChat?.id !== chat.id && (
                       <span className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 bg-error text-white text-[8px] font-black rounded-full flex items-center justify-center">
                         {unread > 9 ? '9+' : unread}
                       </span>
                    )}
                  </div>
                 );
              })}
              {chats.length === 0 && (
                <p className="p-4 text-xs text-on-surface-variant/50 text-center mt-10">Sem mensagens.</p>
              )}
            </div>
          </div>

          {/* Main Chat Area */}
          <div className={`${!activeChat ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-surface relative min-w-0`}>
            {activeChat ? (
              <>
                <div className="p-4 border-b border-outline-variant/10 bg-surface-container-lowest flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setActiveChat(null)} className="p-1 -ml-1 hover:bg-surface-container rounded-lg md:hidden">
                       <span className="material-symbols-outlined text-on-surface-variant">arrow_back</span>
                    </button>
                    <div>
                      <h2 className="text-sm font-bold text-on-surface flex items-center gap-2 truncate">
                        {activeChat.type === 'group' ? activeChat.name : activeChat.otherUserName}
                      </h2>
                      {activeChat.type === 'group' && (
                        <p className="text-[10px] text-on-surface-variant truncate max-w-[200px]">{activeChat.description}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button onClick={() => setIsFullScreen(!isFullScreen)} className="p-2 hover:bg-surface-container rounded-full text-on-surface-variant transition-colors" title="Alternar Tamanho">
                      {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                    <button onClick={handleOpenSettings} className="p-2 hover:bg-surface-container rounded-full text-on-surface-variant transition-colors" title="Definições/Participantes">
                      <Settings size={18} />
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-surface-container-low/30">
                  {messages.map((msg, idx) => {
                    const isMine = msg.senderId === auth.currentUser?.uid;
                    const showName = !isMine && activeChat.type === 'group' && (idx === 0 || messages[idx - 1].senderId !== msg.senderId);
                    
                    return (
                      <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-2xl p-3 ${isMine ? 'bg-primary text-on-primary rounded-tr-none' : 'bg-surface-container-high text-on-surface rounded-tl-none'}`}>
                          {showName && (
                            <p className="text-[10px] font-black text-primary mb-1 uppercase tracking-wider">{msg.senderName}</p>
                          )}
                          <p className="text-sm break-words whitespace-pre-wrap leading-relaxed">
                            {renderMessageText(msg.text)}
                          </p>
                          <p className={`text-[9px] mt-1.5 text-right font-medium ${isMine ? 'text-on-primary/70' : 'text-on-surface-variant/70'}`}>
                            {msg.createdAt ? new Date(msg.createdAt.toDate ? msg.createdAt.toDate() : msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="p-4 bg-surface-container-lowest border-t border-outline-variant/10 flex gap-2 shrink-0">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Mensagem..."
                    className="flex-1 bg-surface-container border border-outline-variant/10 rounded-full px-5 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                  />
                  <button type="submit" disabled={!newMessage.trim()} className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center disabled:opacity-50 hover:bg-primary/90 transition-all hover:scale-105 shrink-0">
                    <Send size={16} className="ml-0.5" />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant opacity-60 p-6 text-center relative">
                <div className="absolute top-4 right-4 md:flex hidden z-10">
                  <button onClick={() => setIsFullScreen(!isFullScreen)} className="p-2 hover:bg-surface-container rounded-full text-on-surface-variant hover:text-on-surface transition-colors" title="Alternar Tamanho">
                    {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                  </button>
                </div>
                <MessageSquare size={48} className="mb-4 opacity-50" />
                <p className="font-bold">Selecione uma conversa</p>
                <p className="text-xs mt-1">Ou crie uma nova sala para interagir com outros traders.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface rounded-3xl p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold mb-4">Nova Sala de Bate-Papo</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest pl-1 mb-1 block">Nome da Sala</label>
                <input 
                  type="text" 
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  className="w-full bg-surface-container border-none rounded-xl px-4 py-2.5 text-sm text-on-surface focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest pl-1 mb-1 block">Descrição</label>
                <textarea 
                  value={groupDescription}
                  onChange={e => setGroupDescription(e.target.value)}
                  className="w-full bg-surface-container border-none rounded-xl px-4 py-2.5 text-sm text-on-surface focus:ring-2 focus:ring-primary resize-none h-20"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button onClick={() => setIsGroupModalOpen(false)} className="px-4 py-2 rounded-xl text-on-surface-variant hover:bg-surface-container font-bold text-sm">Cancelar</button>
              <button onClick={createGroup} disabled={!groupName.trim()} className="px-4 py-2 rounded-xl bg-primary text-on-primary font-bold text-sm disabled:opacity-50">Criar</button>
            </div>
          </div>
        </div>
      )}

      {isChatSettingsOpen && activeChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface rounded-3xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold font-headline uppercase tracking-widest text-on-surface">Configurações da Sala</h3>
              <button onClick={() => setIsChatSettingsOpen(false)} className="text-on-surface-variant hover:text-on-surface"><X size={20}/></button>
            </div>

            {activeChat.type === 'group' && (
              <>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest pl-1 mb-1 block">Nome</label>
                    <input 
                      type="text" 
                      value={groupSettingsName}
                      onChange={e => setGroupSettingsName(e.target.value)}
                      disabled={!activeChat.admins?.includes(auth.currentUser?.uid || '')}
                      className="w-full bg-surface-container border-none rounded-xl px-4 py-2.5 text-sm text-on-surface focus:ring-2 focus:ring-primary disabled:opacity-70"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest pl-1 mb-1 block">Descrição</label>
                    <textarea 
                      value={groupSettingsDesc}
                      onChange={e => setGroupSettingsDesc(e.target.value)}
                      disabled={!activeChat.admins?.includes(auth.currentUser?.uid || '')}
                      className="w-full bg-surface-container border-none rounded-xl px-4 py-2.5 text-sm text-on-surface focus:ring-2 focus:ring-primary resize-none h-20 disabled:opacity-70"
                    />
                  </div>
                  {activeChat.admins?.includes(auth.currentUser?.uid || '') && (
                    <button onClick={handleUpdateGroupInfo} className="w-full py-2.5 bg-primary/20 text-primary font-bold rounded-xl text-sm">Guardar Alterações</button>
                  )}
                </div>

                {activeChat.admins?.includes(auth.currentUser?.uid || '') && (
                  <div className="mb-6 p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10 space-y-3">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest block pl-1">
                      Convidar Traders por Nome / Usuário
                    </label>
                    <div className="relative">
                      <input 
                        type="text"
                        value={userSearchQuery}
                        onChange={e => setUserSearchQuery(e.target.value)}
                        placeholder="Pesquisar trader por nome..."
                        className="w-full bg-surface-container border border-outline-variant/10 rounded-xl px-4 py-2 text-sm text-on-surface focus:outline-none focus:border-primary"
                      />
                    </div>

                    {userSearchQuery.trim() !== '' && (
                      <div className="max-h-48 overflow-y-auto bg-surface border border-outline-variant/10 rounded-xl divide-y divide-outline-variant/10 custom-scrollbar">
                        {allUsers.filter(u => {
                          const queryText = userSearchQuery.toLowerCase();
                          const mainName = (u.nome || u.displayName || u.username || '').toLowerCase();
                          return mainName.includes(queryText) && u.id !== auth.currentUser?.uid;
                        }).map(u => {
                          const isParticipant = activeChat.participants.includes(u.id);
                          const isAlreadyInvited = invitedUserIds.includes(u.id);

                          return (
                            <div key={u.id} className="flex items-center justify-between p-2.5">
                              <div className="flex items-center gap-2">
                                <img 
                                  src={u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.nome || 'U')}&background=random`} 
                                  className="w-8 h-8 rounded-full object-cover" 
                                  referrerPolicy="no-referrer"
                                />
                                <span className="text-xs font-bold text-on-surface">{u.nome || u.username || 'Trader'}</span>
                              </div>

                              <button
                                onClick={() => handleInviteUserToRoom(u)}
                                disabled={isParticipant || isAlreadyInvited}
                                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all ${
                                  isParticipant 
                                    ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                                    : isAlreadyInvited 
                                      ? 'bg-primary/20 text-primary cursor-not-allowed'
                                      : 'bg-primary text-on-primary hover:scale-105 active:scale-95'
                                }`}
                              >
                                {isParticipant ? 'Membro' : isAlreadyInvited ? 'Convidado' : 'Convidar'}
                              </button>
                            </div>
                          );
                        })}
                        {allUsers.filter(u => {
                          const queryText = userSearchQuery.toLowerCase();
                          const mainName = (u.nome || u.displayName || u.username || '').toLowerCase();
                          return mainName.includes(queryText) && u.id !== auth.currentUser?.uid;
                        }).length === 0 && (
                          <p className="p-3 text-xs text-on-surface-variant text-center">Nenhum trader encontrado.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {activeChat.type === 'direct' && (
              <div className="mb-6 p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10 space-y-3">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest block pl-1">
                  Convidar Traders à Conversa (Torna-se Sala)
                </label>
                <div className="relative">
                  <input 
                    type="text"
                    value={userSearchQuery}
                    onChange={e => setUserSearchQuery(e.target.value)}
                    placeholder="Pesquisar trader por nome..."
                    className="w-full bg-surface-container border border-outline-variant/10 rounded-xl px-4 py-2 text-sm text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                {userSearchQuery.trim() !== '' && (
                  <div className="max-h-48 overflow-y-auto bg-surface border border-outline-variant/10 rounded-xl divide-y divide-outline-variant/10 custom-scrollbar">
                    {allUsers.filter(u => {
                      const queryText = userSearchQuery.toLowerCase();
                      const mainName = (u.nome || u.displayName || u.username || '').toLowerCase();
                      return mainName.includes(queryText) && u.id !== auth.currentUser?.uid;
                    }).map(u => {
                      const isParticipant = activeChat.participants.includes(u.id);
                      const isAlreadyInvited = invitedUserIds.includes(u.id);

                      return (
                        <div key={u.id} className="flex items-center justify-between p-2.5">
                          <div className="flex items-center gap-2">
                            <img 
                              src={u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.nome || 'U')}&background=random`} 
                              className="w-8 h-8 rounded-full object-cover" 
                              referrerPolicy="no-referrer"
                            />
                            <span className="text-xs font-bold text-on-surface">{u.nome || u.username || 'Trader'}</span>
                          </div>

                          <button
                            onClick={async () => {
                              try {
                                const currentUid = auth.currentUser?.uid;
                                if (!currentUid) return;
                                
                                await updateDoc(doc(db, 'chats', activeChat.id), {
                                  type: 'group',
                                  name: 'Nova Sala de Conversa',
                                  description: 'Grupo convertido de conversa direta',
                                  admins: [currentUid],
                                  updatedAt: serverTimestamp()
                                });
                                
                                await handleInviteUserToRoom(u);
                              } catch (err) {
                                console.error(err);
                                alert('Erro ao converter conversa');
                              }
                            }}
                            disabled={isParticipant || isAlreadyInvited}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all ${
                              isParticipant 
                                ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                                : isAlreadyInvited 
                                  ? 'bg-primary/20 text-primary cursor-not-allowed'
                                  : 'bg-primary text-on-primary hover:scale-105 active:scale-95'
                            }`}
                          >
                            {isParticipant ? 'Membro' : isAlreadyInvited ? 'Convidado' : 'Convidar'}
                          </button>
                        </div>
                      );
                    })}
                    {allUsers.filter(u => {
                      const queryText = userSearchQuery.toLowerCase();
                      const mainName = (u.nome || u.displayName || u.username || '').toLowerCase();
                      return mainName.includes(queryText) && u.id !== auth.currentUser?.uid;
                    }).length === 0 && (
                      <p className="p-3 text-xs text-on-surface-variant text-center">Nenhum trader encontrado.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div>
              <h4 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-3">Participantes ({activeChat.participants.length})</h4>
              <div className="space-y-2">
                {activeChat.participants.map(pId => {
                  const isAdmin = activeChat.admins?.includes(pId);
                  const isMe = pId === auth.currentUser?.uid;
                  const amIAdmin = activeChat.admins?.includes(auth.currentUser?.uid || '');

                  return (
                    <div key={pId} className="flex justify-between items-center bg-surface-container p-3 rounded-xl border border-outline-variant/10">
                      <div>
                        <span className="text-sm font-bold text-on-surface">{isMe ? 'Você' : `ID: ${pId.substring(0, 8)}...`}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          {isAdmin && <span className="text-[10px] text-primary font-black uppercase tracking-widest bg-primary/10 px-1.5 py-0.5 rounded">Admin</span>}
                        </div>
                      </div>
                      
                      {!isMe && amIAdmin && activeChat.type === 'group' && (
                        <div className="flex gap-2">
                          {!isAdmin && (
                            <button onClick={() => handlePromoteAdmin(pId)} className="p-1.5 text-secondary hover:bg-secondary/10 rounded-lg transition-colors" title="Promover a Admin">
                              <ShieldCheck size={16} />
                            </button>
                          )}
                          <button onClick={() => handleRemoveParticipant(pId)} className="p-1.5 text-error hover:bg-error/10 rounded-lg transition-colors" title="Remover">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
