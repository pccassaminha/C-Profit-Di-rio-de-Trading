import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, setDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Send, Users, UserPlus, Settings, Info, Lock, Key, Edit2, Trash2, X, ShieldCheck, MessageSquare } from 'lucide-react';

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
          className="fixed bottom-24 right-6 z-[60] bg-surface border border-outline-variant/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row w-[calc(100vw-3rem)] max-w-3xl h-[600px] max-h-[80vh] transition-all"
        >
          {/* Sidebar - Chat List */}
          <div className={`${activeChat ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 border-r border-outline-variant/20 bg-surface-container-lowest flex-col`}>
            <div className="p-4 border-b border-outline-variant/10 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-black font-headline uppercase tracking-widest text-on-surface">Chat</h2>
              <button onClick={() => setIsGroupModalOpen(true)} className="p-2 hover:bg-surface-container rounded-full text-primary transition-colors bg-primary/10" title="Criar Sala">
                <Users size={18} />
              </button>
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
                  
                  <button onClick={handleOpenSettings} className="p-2 hover:bg-surface-container rounded-full text-on-surface-variant transition-colors" title="Definições/Participantes">
                    <Settings size={18} />
                  </button>
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
              <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant opacity-60 p-6 text-center">
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
                  <div className="mb-6">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest pl-1 mb-1 block">Adicionar Participante (Email)</label>
                    <div className="flex gap-2">
                      <input 
                        type="email"
                        value={newParticipantEmail}
                        onChange={e => setNewParticipantEmail(e.target.value)}
                        placeholder="email@trader.com"
                        className="flex-1 bg-surface-container border-none rounded-xl px-4 py-2 text-sm text-on-surface focus:ring-2 focus:ring-primary"
                      />
                      <button onClick={handleAddParticipant} disabled={!newParticipantEmail.trim()} className="bg-primary text-on-primary px-3 rounded-xl hover:bg-primary/90 disabled:opacity-50">
                        Adicionar
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {activeChat.type === 'direct' && (
              <div className="mb-6">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest pl-1 mb-1 block">Adicionar Participante (Torna-se Sala)</label>
                <div className="flex gap-2">
                  <input 
                    type="email"
                    value={newParticipantEmail}
                    onChange={e => setNewParticipantEmail(e.target.value)}
                    placeholder="email@trader.com"
                    className="flex-1 bg-surface-container border-none rounded-xl px-4 py-2 text-sm text-on-surface focus:ring-2 focus:ring-primary"
                  />
                  <button onClick={handleAddParticipant} disabled={!newParticipantEmail.trim()} className="bg-primary text-on-primary px-3 rounded-xl hover:bg-primary/90 disabled:opacity-50 text-sm font-bold">
                    Adicionar
                  </button>
                </div>
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
