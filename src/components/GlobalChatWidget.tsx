import React, { useState, useEffect, useRef } from 'react';
import { db, auth, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, setDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { Send, Users, UserPlus, Settings, Info, Lock, Key, Edit2, Trash2, X, ShieldCheck, MessageSquare, Maximize2, Minimize2, MoreHorizontal, Image, ExternalLink } from 'lucide-react';

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
  const [groupPhoto, setGroupPhoto] = useState<File | null>(null);
  const [groupPhotoPreview, setGroupPhotoPreview] = useState<string | null>(null);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  
  // Settings 
  const [isChatSettingsOpen, setIsChatSettingsOpen] = useState(false);
  const [newParticipantEmail, setNewParticipantEmail] = useState('');
  const [groupSettingsName, setGroupSettingsName] = useState('');
  const [groupSettingsDesc, setGroupSettingsDesc] = useState('');
  const [groupSettingsPhoto, setGroupSettingsPhoto] = useState<File | null>(null);
  const [groupSettingsPhotoPreview, setGroupSettingsPhotoPreview] = useState<string | null>(null);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  // Friends list and direct messaging
  const [friendsList, setFriendsList] = useState<string[]>([]);
  const [isFriendSearchOpen, setIsFriendSearchOpen] = useState(false);
  const [friendSearchQuery, setFriendSearchQuery] = useState('');

  // User search/invite logic inside group chats
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [invitedUserIds, setInvitedUserIds] = useState<string[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);

  // Unread state
  const [totalUnread, setTotalUnread] = useState(0);

  // Realtime contacts/blocks
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  
  // Image Link features
  const [isImageMenuOpen, setIsImageMenuOpen] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [attachedImageUrl, setAttachedImageUrl] = useState<string | null>(null);
  const [selectedFullscreenImage, setSelectedFullscreenImage] = useState<string | null>(null);

  const isImageUrlStr = (url: string) => {
    return !!(url.match(/\.(jpeg|jpg|gif|png|webp|svg|bmp)/i) || url.startsWith('data:image/') || url.includes('images.unsplash.com') || url.includes('images.pexels.com'));
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('openGlobalChat', handleOpen);
    return () => window.removeEventListener('openGlobalChat', handleOpen);
  }, []);

  // Listen for all user profiles from 'usuarios' collection
  useEffect(() => {
    if (!auth.currentUser) return;
    const unsub = onSnapshot(collection(db, 'usuarios'), (snap) => {
      setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.warn('[GlobalChatWidget] Failed to listen to usuarios:', err);
    });
    return unsub;
  }, []);

  // Subscribe to real-time friends list from 'users/{uid}/friends'
  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const unsubFriends = onSnapshot(collection(db, 'users', uid, 'friends'), (snap) => {
      setFriendsList(snap.docs.map(d => d.id));
    }, (err) => {
      console.error('Error loading friends list in chat:', err);
    });
    return unsubFriends;
  }, []);

  const handleStartDirectChat = async (otherUserId: string) => {
    if (!auth.currentUser) return;
    try {
      // Find dynamic chat
      const existing = chats.find(c => c.type === 'direct' && c.participants.includes(otherUserId));
      if (existing) {
        setActiveChat(existing);
        setIsFriendSearchOpen(false);
        return;
      }

      // Query database if we don't have it loaded in "chats" state
      const q = query(
        collection(db, 'chats'),
        where('type', '==', 'direct'),
        where('participants', 'array-contains', auth.currentUser.uid)
      );
      const snapshot = await import('firebase/firestore').then(firestore => firestore.getDocs(q));
      const dbChat = snapshot.docs.find(d => d.data().participants.includes(otherUserId));

      if (dbChat) {
        const chatData = { id: dbChat.id, ...dbChat.data() } as Chat;
        setActiveChat(chatData);
      } else {
        // Create new direct chat
        const newChatRef = await addDoc(collection(db, 'chats'), {
          type: 'direct',
          participants: [auth.currentUser.uid, otherUserId],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          unreadCount: {
            [auth.currentUser.uid]: 0,
            [otherUserId]: 0
          }
        });
        // Set it as active
        setActiveChat({
          id: newChatRef.id,
          type: 'direct',
          participants: [auth.currentUser.uid, otherUserId],
          unreadCount: {
            [auth.currentUser.uid]: 0,
            [otherUserId]: 0
          }
        } as Chat);
      }
      setIsFriendSearchOpen(false);
    } catch (err) {
      console.error('Error starting direct chat:', err);
    }
  };

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
    }, (err) => {
      console.warn('[GlobalChatWidget] Failed to listen to room invites:', err);
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
    }, (err) => {
      console.warn('[GlobalChatWidget] Failed to listen to blocks:', err);
    });

    // Load chats where user is participant
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', uid)
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
            const userDoc = await getDoc(doc(db, 'usuarios', otherUid));
            displayData.otherUserId = otherUid;
            displayData.otherUserName = userDoc.exists() ? userDoc.data()?.nome || userDoc.data()?.displayName || userDoc.data()?.username || 'Usuário' : 'Usuário';
            displayData.photoURL = userDoc.exists() ? userDoc.data()?.photoURL || '' : '';
          }
        }
        
        const c = { id: d.id, ...data, ...displayData } as Chat;
        chatsData.push(c);
        if (data.unreadCount && data.unreadCount[uid]) {
           unread += data.unreadCount[uid];
        }
      }));

      // Sort chats in-memory securely by updatedAt desc (fallback to createdAt or 0)
      chatsData.sort((a, b) => {
        const getTs = (chat: Chat) => {
          if (!chat) return 0;
          const up = chat.updatedAt;
          if (up) {
            if (up.toMillis) return up.toMillis();
            if (up.seconds) return up.seconds * 1000;
            return new Date(up).getTime() || 0;
          }
          const cr = (chat as any).createdAt;
          if (cr) {
            if (cr.toMillis) return cr.toMillis();
            if (cr.seconds) return cr.seconds * 1000;
            return new Date(cr).getTime() || 0;
          }
          return 0;
        };
        return getTs(b) - getTs(a);
      });

      setChats(chatsData);
      setTotalUnread(unread);

      const autoId = localStorage.getItem('autoSelectChatId');
      if (autoId) {
        const found = chatsData.find(c => c.id === autoId);
        if (found) {
          setActiveChat(found);
          localStorage.removeItem('autoSelectChatId');
        }
      }
    }, (err) => {
      console.error("Error listening to chats: ", err);
    });

    return () => {
      unsubBlocks();
      unsubChats();
    };
  }, []);

  useEffect(() => {
    const handleSelectChat = (e: Event) => {
      const customVal = (e as CustomEvent).detail;
      if (customVal && chats.length > 0) {
        const found = chats.find(c => c.id === customVal);
        if (found) {
          setActiveChat(found);
          localStorage.removeItem('autoSelectChatId');
        }
      }
    };
    window.addEventListener('selectChatRoom', handleSelectChat);
    return () => window.removeEventListener('selectChatRoom', handleSelectChat);
  }, [chats]);

  useEffect(() => {
    if (!activeChat) return;
    const q = query(
      collection(db, 'chats', activeChat.id, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, (err) => {
      console.warn('[GlobalChatWidget] Failed to listen to messages:', err);
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
    if ((!newMessage.trim() && !attachedImageUrl) || !activeChat || !auth.currentUser) return;

    // Check if direct chat user is blocked
    if (activeChat.type === 'direct' && activeChat.otherUserId && blockedUsers.includes(activeChat.otherUserId)) {
      alert('Você bloqueou este usuário.');
      return;
    }

    try {
      const msgText = newMessage.trim();
      const ourDbUserObj = allUsers.find(u => u.id === auth.currentUser?.uid);
      const ourPhoto = ourDbUserObj?.photoURL || auth.currentUser?.photoURL || '';
      const ourName = ourDbUserObj?.nome || ourDbUserObj?.displayName || auth.currentUser?.displayName || 'Usuário';

      const messageObj: any = {
        text: msgText || (attachedImageUrl ? "📷 Imagem" : ""),
        senderId: auth.currentUser?.uid || '',
        senderName: ourName,
        senderPhoto: ourPhoto,
        createdAt: serverTimestamp()
      };

      if (attachedImageUrl) {
        messageObj.imageUrl = attachedImageUrl;
      }

      await addDoc(collection(db, 'chats', activeChat.id, 'messages'), messageObj);

      const unreadUpdates: any = {};
      activeChat.participants.forEach(p => {
        if (p !== auth.currentUser?.uid) {
           unreadUpdates[`unreadCount.${p}`] = increment(1);
        }
      });

      await updateDoc(doc(db, 'chats', activeChat.id), {
        lastMessage: attachedImageUrl ? "📷 Imagem Enviada" : msgText,
        lastSenderName: ourName,
        updatedAt: serverTimestamp(),
        ...unreadUpdates
      });
      setNewMessage('');
      setAttachedImageUrl(null);
    } catch (err) {
      console.error('Error sending message', err);
    }
  };

  const createGroup = async () => {
    if (!groupName.trim() || !auth.currentUser) return;
    setIsCreatingGroup(true);
    try {
      let photoURL = '';
      if (groupPhoto) {
        const fileRef = ref(storage, `chat_groups/${Date.now()}_${groupPhoto.name}`);
        await uploadBytes(fileRef, groupPhoto);
        photoURL = await getDownloadURL(fileRef);
      }

      await addDoc(collection(db, 'chats'), {
        type: 'group',
        name: groupName,
        description: groupDescription,
        photoURL: photoURL || null,
        admins: [auth.currentUser.uid],
        participants: [auth.currentUser.uid],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setIsGroupModalOpen(false);
      setGroupName('');
      setGroupDescription('');
      setGroupPhoto(null);
      setGroupPhotoPreview(null);
    } catch (err) {
      console.error('Error creating group:', err);
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const handleUpdateGroupInfo = async () => {
    if (!activeChat || !auth.currentUser || !activeChat.admins?.includes(auth.currentUser.uid)) return;
    setIsUpdatingSettings(true);
    try {
      const updates: any = {
        name: groupSettingsName,
        description: groupSettingsDesc,
        updatedAt: serverTimestamp()
      };
      
      if (groupSettingsPhoto) {
        const fileRef = ref(storage, `chat_groups/${Date.now()}_${groupSettingsPhoto.name}`);
        await uploadBytes(fileRef, groupSettingsPhoto);
        updates.photoURL = await getDownloadURL(fileRef);
      }
      
      await updateDoc(doc(db, 'chats', activeChat.id), updates);
      alert('Info da sala atualizada.');
      setIsChatSettingsOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingSettings(false);
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
    setGroupSettingsPhoto(null);
    setGroupSettingsPhotoPreview(activeChat.photoURL || null);
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
        className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-[60] w-12 h-12 md:w-14 md:h-14 bg-primary text-on-primary rounded-full flex items-center justify-center shadow-2xl hover:scale-105 transition-transform"
      >
        {isOpen ? <X className="w-5 h-5 md:w-6 md:h-6" /> : <MessageSquare className="w-5 h-5 md:w-6 md:h-6" />}
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
              : 'bottom-[104px] right-4 md:right-6 w-[calc(100vw-2rem)] md:w-[calc(100vw-3rem)] max-w-3xl h-[400px] md:h-[600px] max-h-[55vh] md:max-h-[80vh] rounded-2xl md:rounded-3xl'
          }`}
        >
          {/* Sidebar - Chat List */}
          <div className={`${activeChat ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 border-r border-outline-variant/20 bg-surface-container-lowest flex-col`}>
            <div className="p-4 border-b border-outline-variant/10 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-black font-headline uppercase tracking-widest text-on-surface">Conversas</h2>
            </div>

            {/* Prominent Wide Action CTA for Room Creation and Direct Messaging */}
            <div className="p-3 bg-surface-container-low shrink-0 border-b border-outline-variant/10 space-y-2">
              <button 
                onClick={() => {
                  setActiveChat(null); // Closes active chat
                  setIsGroupModalOpen(true); // Opens build a room modal
                }} 
                className="w-full py-2 px-3 bg-[#00f5a0]/15 text-[#00f5a0] border border-[#00f5a0]/25 hover:bg-[#00f5a0]/25 hover:scale-[1.01] active:scale-95 transition-all text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 rounded-xl shadow-md"
                title="Criar Sala"
              >
                <Users size={14} />
                <span>+ Criar Nova Sala</span>
              </button>

              <button 
                onClick={() => {
                  setIsFriendSearchOpen(true); // Opens Friend chat modal
                }} 
                className="w-full py-2 px-3 bg-primary text-on-primary hover:bg-primary/95 hover:scale-[1.01] active:scale-95 transition-all text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 rounded-xl shadow-md cursor-pointer"
                title="Conversar com Amigo"
              >
                <MessageSquare size={14} />
                <span>Conversar com Amigo</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {chats.map(chat => {
                 const unread = chat.unreadCount?.[auth.currentUser?.uid || ''];
                 
                 let chatName = chat.name || '';
                 let chatPhoto = chat.photoURL || '';

                 if (chat.type === 'direct') {
                   const otherUid = chat.participants?.find(p => p !== auth.currentUser?.uid);
                   const otherUser = allUsers.find(u => u.id === otherUid || u.uid === otherUid);
                   if (otherUser) {
                     chatName = otherUser.nome || otherUser.displayName || otherUser.username || chat.otherUserName || 'Usuário';
                     chatPhoto = otherUser.photoURL || '';
                   } else {
                     chatName = chat.otherUserName || 'Usuário';
                   }
                 }

                 const defaultAvatar = chat.type === 'group' 
                   ? `https://ui-avatars.com/api/?name=${encodeURIComponent(chatName || 'G')}&background=random`
                   : `https://ui-avatars.com/api/?name=${encodeURIComponent(chatName || 'U')}&background=random`;
                 const resolvedPhoto = chatPhoto || defaultAvatar;

                 return (
                  <div 
                    key={chat.id} 
                    onClick={() => setActiveChat(chat)}
                    className={`p-3 lg:p-4 border-b border-outline-variant/5 cursor-pointer flex items-center gap-3 transition-colors relative ${activeChat?.id === chat.id ? 'bg-primary/10 border-l-4 border-l-primary' : 'hover:bg-surface-container'}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-surface-container shrink-0 overflow-hidden relative border border-outline-variant/10">
                      <img src={resolvedPhoto} alt="Chat" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      {chat.type === 'group' && (
                        <div className="absolute -bottom-1 -right-1 bg-surface rounded-full p-0.5 border border-outline-variant/10">
                           <Users size={10} className="text-primary"/>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pr-6">
                      <h3 className="font-bold text-sm text-on-surface truncate">
                        {chatName}
                      </h3>
                      <p className="text-xs text-on-surface-variant truncate mt-0.5">
                        {chat.lastSenderName && `${chat.lastSenderName.split(' ')[0]}: `}{chat.lastMessage || 'Nenhuma mensagem.'}
                      </p>
                    </div>
                    {!!unread && unread > 0 && activeChat?.id !== chat.id && (
                       <span className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 bg-error text-white text-[8px] font-black rounded-full flex items-center justify-center shadow-sm">
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
                    
                    {/* Chat Header Avatar/Details Dynamic rendering */}
                    {(() => {
                      let headerName = activeChat.name || '';
                      let headerPhoto = activeChat.photoURL || '';

                      if (activeChat.type === 'direct') {
                        const otherUid = activeChat.participants?.find(p => p !== auth.currentUser?.uid);
                        const otherUser = allUsers.find(u => u.id === otherUid || u.uid === otherUid);
                        if (otherUser) {
                          headerName = otherUser.nome || otherUser.displayName || otherUser.username || activeChat.otherUserName || 'Usuário';
                          headerPhoto = otherUser.photoURL || '';
                        } else {
                          headerName = activeChat.otherUserName || 'Usuário';
                        }
                      }

                      const defaultAvatar = activeChat.type === 'group' 
                        ? `https://ui-avatars.com/api/?name=${encodeURIComponent(headerName || 'G')}&background=random`
                        : `https://ui-avatars.com/api/?name=${encodeURIComponent(headerName || 'U')}&background=random`;

                      return (
                        <>
                          <div className="w-10 h-10 rounded-full bg-surface-container overflow-hidden shrink-0 border border-outline-variant/10">
                            <img 
                              src={headerPhoto || defaultAvatar}
                              alt="Chat Preview" 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          
                          <div>
                            <h2 className="text-sm font-bold text-on-surface flex items-center gap-2 truncate text-left">
                              {headerName}
                            </h2>
                            {activeChat.type === 'group' && (
                              <p className="text-[10px] text-on-surface-variant truncate max-w-[200px] text-left">{activeChat.description}</p>
                            )}
                          </div>
                        </>
                      );
                    })()}
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
                    const isGroup = activeChat.type === 'group';
                    const showAvatarAndName = !isMine && (idx === 0 || messages[idx - 1].senderId !== msg.senderId);
                    
                    // Dynamically resolve the sender name and picture from general user accounts (Pedro's picture will load perfectly!)
                    const senderUser = allUsers.find(u => u.id === msg.senderId || u.uid === msg.senderId);
                    const senderName = senderUser ? (senderUser.nome || senderUser.displayName || senderUser.username || msg.senderName) : msg.senderName;
                    const senderPhoto = senderUser?.photoURL || msg.senderPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName || 'U')}&background=random`;
                    
                    return (
                      <div key={msg.id} className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'}`}>
                        {!isMine && showAvatarAndName && (
                          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mr-2 self-end mb-1">
                            <img 
                              src={senderPhoto}
                              alt={senderName}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}
                        {!isMine && !showAvatarAndName && <div className="w-8 mr-2 flex-shrink-0" />}

                        <div className={`max-w-[75%] rounded-2xl p-3 shadow-sm ${isMine ? 'bg-primary text-on-primary rounded-br-sm' : 'bg-surface-container-highest text-on-surface rounded-bl-sm'}`}>
                          {showAvatarAndName && isGroup && (
                            <p className="text-[10px] font-black text-primary mb-1 uppercase tracking-wider">{senderName}</p>
                          )}
                          <p className="text-sm break-words whitespace-pre-wrap leading-relaxed">
                            {renderMessageText(msg.text)}
                          </p>
                          
                          {/* Dedicated Image Attachment */}
                          {msg.imageUrl && (
                            <div className="mt-2 rounded-xl overflow-hidden border border-outline-variant/10 max-w-full cursor-pointer hover:opacity-95 active:scale-[0.98] transition-all bg-black/10 flex items-center justify-center max-h-60" onClick={() => setSelectedFullscreenImage(msg.imageUrl)}>
                              <img src={msg.imageUrl} alt="Anexo" className="max-w-full max-h-56 object-contain rounded-xl" referrerPolicy="no-referrer" />
                            </div>
                          )}

                          {/* Auto-detected inline image URLs */}
                          {(() => {
                            if (msg.imageUrl) return null;
                            if (!msg.text) return null;
                            const urlRegex = /(https?:\/\/[^\s]+)/g;
                            const urls = msg.text.match(urlRegex) || [];
                            const inlineImageUrl = urls.find(u => isImageUrlStr(u));
                            if (inlineImageUrl) {
                              return (
                                <div className="mt-2 rounded-xl overflow-hidden border border-outline-variant/10 max-w-full cursor-pointer hover:opacity-95 active:scale-[0.98] transition-all bg-black/10 flex items-center justify-center max-h-60" onClick={() => setSelectedFullscreenImage(inlineImageUrl)}>
                                  <img src={inlineImageUrl} alt="Preview Anexo" className="max-w-full max-h-56 object-contain rounded-xl" referrerPolicy="no-referrer" />
                                </div>
                              );
                            }
                            return null;
                          })()}

                          <div className={`flex items-center justify-end gap-1 mt-1 ${isMine ? 'text-on-primary/70' : 'text-on-surface-variant'}`}>
                            <span className="text-[9px] font-medium">
                              {msg.createdAt ? new Date(msg.createdAt.toDate ? msg.createdAt.toDate() : msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                            {isMine && <span className="material-symbols-outlined text-[12px]">done_all</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {attachedImageUrl && (
                  <div className="px-4 py-2 bg-surface-container-low border-t border-outline-variant/10 flex items-center justify-between gap-2 shrink-0 animate-in slide-in-from-bottom duration-200">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <img src={attachedImageUrl} alt="Anexo" className="w-10 h-10 object-cover rounded-lg border border-outline-variant/15 shrink-0 bg-black/10" referrerPolicy="no-referrer" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] bg-[#00f5a0]/15 text-[#00f5a0] font-black px-1.5 py-0.5 rounded uppercase tracking-wide block w-fit mb-0.5 text-xs">Imagem Anexada</span>
                        <span className="text-[10px] text-on-surface-variant truncate block">{attachedImageUrl}</span>
                      </div>
                    </div>
                    <button type="button" onClick={() => setAttachedImageUrl(null)} className="p-1 text-on-surface-variant hover:text-error hover:bg-surface-container rounded-full transition-colors cursor-pointer shrink-0">
                      <X size={14} />
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="p-4 bg-surface-container-lowest border-t border-outline-variant/10 flex gap-2 shrink-0 items-center relative">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Mensagem..."
                    className="flex-1 bg-surface-container border border-outline-variant/10 rounded-full px-5 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                  />
                  
                  {/* Three Dots Button for more options (Image Link) */}
                  <div className="relative shrink-0 flex items-center">
                    <button 
                      type="button" 
                      onClick={() => setIsImageMenuOpen(!isImageMenuOpen)} 
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${isImageMenuOpen ? 'bg-primary/20 text-primary' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
                      title="Mais opções (Link de Imagem)"
                    >
                      <MoreHorizontal size={18} />
                    </button>

                    {isImageMenuOpen && (
                      <div className="absolute bottom-12 right-0 bg-surface border border-outline-variant/20 shadow-2xl rounded-2xl p-4 w-72 z-40 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
                        <div className="flex justify-between items-center pb-1 border-b border-outline-variant/10">
                          <span className="text-[10px] font-black uppercase text-on-surface tracking-wider flex items-center gap-1">
                            <Image size={10} className="text-primary" />
                            Link da Imagem
                          </span>
                          <button type="button" onClick={() => setIsImageMenuOpen(false)} className="text-on-surface-variant hover:text-on-surface p-0.5 rounded-full hover:bg-surface-container transition-colors">
                            <X size={12} />
                          </button>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] text-on-surface-variant leading-relaxed">Insira o link direto de uma imagem para pré-visualizar no bate-papo.</p>
                          <div className="flex gap-1.5 focus-within:z-10">
                            <input
                              type="text"
                              placeholder="https://exemplo.com/imagem.png"
                              value={imageUrlInput}
                              onChange={e => setImageUrlInput(e.target.value)}
                              className="flex-1 bg-surface-container text-[11px] rounded-lg px-2.5 py-1.5 focus:outline-none border border-outline-variant/10 focus:border-primary text-on-surface"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (imageUrlInput.trim()) {
                                    setAttachedImageUrl(imageUrlInput.trim());
                                    setImageUrlInput('');
                                    setIsImageMenuOpen(false);
                                  }
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (imageUrlInput.trim()) {
                                  setAttachedImageUrl(imageUrlInput.trim());
                                  setImageUrlInput('');
                                  setIsImageMenuOpen(false);
                                }
                              }}
                              className="px-2.5 py-1.5 bg-primary text-on-primary rounded-lg text-[10px] font-black hover:opacity-90 active:scale-95 transition-all text-center shrink-0 cursor-pointer"
                            >
                              Anexar
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <button type="submit" disabled={!newMessage.trim() && !attachedImageUrl} className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center disabled:opacity-50 hover:bg-primary/90 transition-all hover:scale-105 shrink-0">
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
              <div className="flex flex-col items-center justify-center mb-4">
                <div className="w-24 h-24 rounded-full bg-surface-container overflow-hidden mb-2 relative group cursor-pointer border border-outline-variant/10">
                  {groupPhotoPreview ? (
                    <img src={groupPhotoPreview} alt="Group Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-on-surface-variant">
                      <Users size={32} />
                    </div>
                  )}
                  <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Edit2 size={24} className="text-white" />
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setGroupPhoto(file);
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            if (ev.target) setGroupPhotoPreview(ev.target.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }} 
                    />
                  </label>
                </div>
                <span className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Foto da Sala</span>
              </div>
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
              <button 
                onClick={() => {
                  setIsGroupModalOpen(false);
                  setGroupPhoto(null);
                  setGroupPhotoPreview(null);
                }} 
                className="px-4 py-2 rounded-xl text-on-surface-variant hover:bg-surface-container font-bold text-sm disabled:opacity-50"
                disabled={isCreatingGroup}
              >
                Cancelar
              </button>
              <button 
                onClick={createGroup} 
                disabled={!groupName.trim() || isCreatingGroup} 
                className="px-4 py-2 rounded-xl bg-primary text-on-primary font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isCreatingGroup ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Criando...
                  </>
                ) : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isFriendSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface border border-outline-variant/10 rounded-3xl p-6 w-full max-w-sm max-h-[80vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h3 className="text-base font-black font-headline uppercase tracking-wider text-on-surface">Iniciar Conversa</h3>
              <button 
                onClick={() => {
                  setIsFriendSearchOpen(false);
                  setFriendSearchQuery('');
                }} 
                className="text-on-surface-variant hover:text-on-surface p-1 hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
              >
                <X size={18}/>
              </button>
            </div>

            {/* Friend Search input */}
            <div className="mb-4 shrink-0 relative">
              <input
                type="text"
                placeholder="Procurar amigo na lista..."
                value={friendSearchQuery}
                onChange={e => setFriendSearchQuery(e.target.value)}
                className="w-full bg-surface-container border border-outline-variant/15 rounded-xl px-4 py-2.5 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>

            {/* Friends list */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 min-h-[200px] max-h-[350px]">
              {(() => {
                const filteredFriends = allUsers.filter(u => {
                  const isFriend = friendsList.includes(u.id);
                  const matchesSearch = (u.nome || u.displayName || u.username || '').toLowerCase().includes(friendSearchQuery.toLowerCase());
                  return isFriend && matchesSearch && u.id !== auth.currentUser?.uid;
                });

                if (filteredFriends.length === 0) {
                  return (
                    <div className="p-6 text-center text-on-surface-variant/60 font-medium text-xs">
                      {friendsList.length === 0 
                        ? 'Sua lista de amigos está vazia. Adicione amigos na aba Comunidade para iniciar conversas!'
                        : 'Nenhum amigo encontrado com este nome.'}
                    </div>
                  );
                }

                return filteredFriends.map(friend => {
                  const name = friend.nome || friend.displayName || friend.username || 'Amigo';
                  const avatar = friend.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;

                  return (
                    <div 
                      key={friend.id}
                      onClick={() => handleStartDirectChat(friend.id)}
                      className="flex items-center gap-3 p-2.5 hover:bg-primary/10 rounded-2xl cursor-pointer transition-all border border-transparent hover:border-primary/10 hover:scale-[1.01] group"
                    >
                      <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-outline-variant/10">
                        <img src={avatar} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xs text-on-surface text-left truncate group-hover:text-primary transition-colors">{name}</h4>
                        <p className="text-[10px] text-on-surface-variant text-left truncate">Enviar mensagem directa</p>
                      </div>
                      <span className="material-symbols-outlined text-[18px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        chat_bubble
                      </span>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="mt-4 pt-4 border-t border-outline-variant/10 flex justify-end shrink-0">
              <button 
                onClick={() => {
                  setIsFriendSearchOpen(false);
                  setFriendSearchQuery('');
                }} 
                className="px-4 py-2 rounded-xl text-on-surface-variant hover:bg-surface-container font-black text-xs uppercase tracking-wider cursor-pointer"
              >
                Fechar
              </button>
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
                  <div className="flex flex-col items-center justify-center mb-4">
                    <div className={`w-24 h-24 rounded-full bg-surface-container overflow-hidden mb-2 relative border border-outline-variant/10 ${activeChat.admins?.includes(auth.currentUser?.uid || '') ? 'group cursor-pointer' : ''}`}>
                      {groupSettingsPhotoPreview ? (
                        <img src={groupSettingsPhotoPreview} alt="Group Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full text-on-surface-variant">
                          <Users size={32} />
                        </div>
                      )}
                      
                      {activeChat.admins?.includes(auth.currentUser?.uid || '') && (
                        <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                          <Edit2 size={24} className="text-white" />
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setGroupSettingsPhoto(file);
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                  if (ev.target) setGroupSettingsPhotoPreview(ev.target.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                            }} 
                          />
                        </label>
                      )}
                    </div>
                    <span className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Foto da Sala</span>
                  </div>
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
                    <button 
                      onClick={handleUpdateGroupInfo} 
                      disabled={isUpdatingSettings}
                      className="w-full py-2.5 bg-primary/20 text-primary font-bold rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isUpdatingSettings ? (
                        <>
                          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                          Guardando...
                        </>
                      ) : 'Guardar Alterações'}
                    </button>
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

      {/* Lightbox component for visual previewing */}
      {selectedFullscreenImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedFullscreenImage(null)}
        >
          <button 
            onClick={() => setSelectedFullscreenImage(null)} 
            className="absolute top-4 right-4 text-white hover:text-white/80 p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-all cursor-pointer z-[110]"
            title="Fechar"
          >
            <X size={24} />
          </button>
          
          <div className="max-w-4xl max-h-[85vh] relative flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img 
              src={selectedFullscreenImage} 
              alt="Visualização Principal" 
              className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl border border-white/5 animate-in zoom-in-95 duration-200" 
              referrerPolicy="no-referrer"
            />
            <div className="mt-4 flex gap-4 z-50">
              <a 
                href={selectedFullscreenImage} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="px-4 py-2 bg-[#00f5a0]/15 hover:bg-[#00f5a0]/30 text-[#00f5a0] border border-[#00f5a0]/20 hover:border-[#00f5a0]/40 rounded-xl text-xs font-black tracking-wide uppercase transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <ExternalLink size={14} />
                Abrir em Nova Guia
              </a>
              <button 
                onClick={() => setSelectedFullscreenImage(null)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-750 text-white/90 border border-neutral-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
