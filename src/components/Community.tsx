import React, { useState, useEffect, useRef } from 'react';
import { db, auth, storage } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, doc, updateDoc, increment, deleteDoc, getDoc, getDocs, setDoc, limit, runTransaction } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useTrades } from '../hooks/useTrades';
import Modal from './Modal';
import { TradeShareCard, TradeDetails } from './TradeShareCard';

import { MessageSquare, ThumbsUp as ThumbsUpIcon, Share2, Plus, Image as ImageIcon, X, Send, Filter, Globe, Hash, ShieldCheck, MoreVertical, Trash2, Smartphone, MessageCircle, UserPlus, UserMinus, Eye, EyeOff, Lock, ShieldAlert, Camera, MapPin, Briefcase, GraduationCap, Heart, Calendar, Check, Users, Award, Edit3, Heart as HeartIcon, Mail, User, Home, ArrowLeft, Megaphone, Edit2, Ban, ArrowRight, Compass, Bookmark } from 'lucide-react';

interface Post {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  legend: string;
  imageUrl?: string;
  imageUrls?: string[];
  type: 'forex' | 'ob';
  likesCount: number;
  commentsCount: number;
  createdAt: any;
  userLiked?: boolean;
  isPlanningShare?: boolean;
  originalPlanningId?: string;
  tradeDetails?: TradeDetails;
}

export default function Community() {
  const { userPlan } = useTrades();
  const [activeFeed, setActiveFeed] = useState<'forex' | 'ob'>('forex');
  const [showFilter, setShowFilter] = useState(true);
  const [viewingPost, setViewingPost] = useState<Post | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [globalSettings, setGlobalSettings] = useState<any>(null);
  const [selectedProfileUser, setSelectedProfileUser] = useState<{ id: string, name: string, photo: string } | null>(null);
  const [friendsList, setFriendsList] = useState<string[]>([]);
  const [distancedList, setDistancedList] = useState<string[]>([]);
  const [selectedUserDetailedProfile, setSelectedUserDetailedProfile] = useState<{ 
    isPrivate?: boolean; 
    phoneNumber?: string; 
    email?: string;
    bio?: string;
    liveIn?: string;
    homeTown?: string;
    relationship?: string;
    birthday?: string;
    work?: string;
    school?: string;
    coverURL?: string;
    nome?: string;
  } | null>(null);
  const [selectedUserPosts, setSelectedUserPosts] = useState<Post[]>([]);
  const [isLoadingSelectedProfile, setIsLoadingSelectedProfile] = useState(false);

  // Facebook style state
  const [activeProfileTab, setActiveProfileTab] = useState<'tudo' | 'sobre' | 'amigos' | 'fotos'>('tudo');
  const [profileFollowersCount, setProfileFollowersCount] = useState(0);
  const [profileFollowingCount, setProfileFollowingCount] = useState(0);
  const [profileIsFollowing, setProfileIsFollowing] = useState(false);
  const [isEditingProfileDetails, setIsEditingProfileDetails] = useState(false);
  const [isSavingProfileEdits, setIsSavingProfileEdits] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    isError: false,
    confirmText: "OK",
    onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
  });
  const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));

  const [editFormFields, setEditFormFields] = useState<{
    nome: string;
    phoneNumber: string;
    email: string;
    bio: string;
    liveIn: string;
    homeTown: string;
    relationship: string;
    birthday: string;
    school: string;
    isPrivate: boolean;
    coverURL: string;
    socialLinks: Array<{ platform: string; url: string; mask: string }>;
  }>({
    nome: '',
    phoneNumber: '',
    email: '',
    bio: '',
    liveIn: '',
    homeTown: '',
    relationship: '',
    birthday: '',
    school: '',
    isPrivate: false,
    coverURL: '',
    socialLinks: [{ platform: 'Instagram', url: '', mask: '' }]
  });
  
  const [allCommunityUsers, setAllCommunityUsers] = useState<any[]>([]);
  const [dbPhoto, setDbPhoto] = useState<string | null>(null);
  const [dbName, setDbName] = useState<string>('');

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    const unsub = onSnapshot(doc(db, 'usuarios', currentUser.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.photoURL) setDbPhoto(data.photoURL);
        if (data.nome) setDbName(data.nome);
      } else {
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
  }, []);

  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);

  // Local inline comment state inside profile feed
  const [profilePostCommentInputs, setProfilePostCommentInputs] = useState<{[postId: string]: string}>({});
  const [activeProfilePostComments, setActiveProfilePostComments] = useState<{[postId: string]: any[]}>({});
  
  useEffect(() => {
    if (!auth.currentUser) return;
    const qIncoming = query(
      collection(db, 'friend_requests'),
      where('receiverId', '==', auth.currentUser.uid),
      where('status', '==', 'pending')
    );
    const unsubIncoming = onSnapshot(qIncoming, snap => {
      setIncomingRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qOutgoing = query(
      collection(db, 'friend_requests'),
      where('senderId', '==', auth.currentUser.uid)
    );
    const unsubOutgoing = onSnapshot(qOutgoing, snap => {
      setOutgoingRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubIncoming();
      unsubOutgoing();
    };
  }, []);

  // Auto-sync bidirectional friends when a sent request gets accepted
  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'friend_requests'),
      where('senderId', '==', auth.currentUser.uid),
      where('status', '==', 'accepted')
    );
    const unsub = onSnapshot(q, async (snap) => {
      for (const change of snap.docChanges()) {
        if (change.type === 'added' || change.type === 'modified') {
          const data = change.doc.data();
          const friendId = data.receiverId;
          if (friendId && !friendsList.includes(friendId)) {
            try {
              await setDoc(doc(db, 'users', auth.currentUser.uid, 'friends', friendId), { 
                addedAt: new Date().toISOString() 
              });
            } catch (e) {
              console.error("Error auto-syncing friend:", e);
            }
          }
        }
      }
    });
    return () => unsub();
  }, [friendsList]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const unsub = onSnapshot(query(collection(db, 'users', auth.currentUser.uid, 'blocks')), snap => {
      setBlockedUsers(snap.docs.map(d => d.id));
    }, (err) => console.warn('Blocks snapshot error:', err));
    const unsubFriends = onSnapshot(collection(db, 'users', auth.currentUser.uid, 'friends'), snap => {
      setFriendsList(snap.docs.map(d => d.id));
    }, (err) => console.warn('Friends snapshot error:', err));
    const unsubDistancing = onSnapshot(collection(db, 'users', auth.currentUser.uid, 'distancing'), snap => {
      setDistancedList(snap.docs.map(d => d.id));
    }, (err) => console.warn('Distancing snapshot error:', err));
    return () => {
      unsub();
      unsubFriends();
      unsubDistancing();
    };
  }, []);

  useEffect(() => {
    const unsubAll = onSnapshot(collection(db, 'usuarios'), (snap) => {
      setAllCommunityUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn('Usuarios snapshot error:', err));
    const unsubGlobalSettings = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        setGlobalSettings(snap.data());
      }
    }, (err) => console.warn('Global settings snapshot error:', err));
    return () => {
      unsubAll();
      unsubGlobalSettings();
    };
  }, []);

  useEffect(() => {
    const checkSelectedUser = () => {
      const stored = localStorage.getItem('selected_community_profile_user');
      if (stored) {
        try {
          const u = JSON.parse(stored);
          setSelectedProfileUser(u);
          localStorage.removeItem('selected_community_profile_user');
        } catch (e) {
          console.error(e);
        }
      }
    };
    
    checkSelectedUser();
    
    const handleProfileSelect = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setSelectedProfileUser(customEvent.detail);
      }
    };
    window.addEventListener('openCommunityUserProfile', handleProfileSelect);
    return () => window.removeEventListener('openCommunityUserProfile', handleProfileSelect);
  }, []);

  useEffect(() => {
    if (!selectedProfileUser) {
      setSelectedUserDetailedProfile(null);
      setSelectedUserPosts([]);
      setIsEditingProfileDetails(false);
      setActiveProfileTab('tudo');
      return;
    }
    
    setIsLoadingSelectedProfile(true);
    
    const fetchUserProfile = async () => {
      try {
        let docSnap = await getDoc(doc(db, 'usuarios', selectedProfileUser.id));
        if (!docSnap.exists()) {
          docSnap = await getDoc(doc(db, 'users', selectedProfileUser.id));
        }
        if (docSnap.exists()) {
          const data = docSnap.data() as any;
          setSelectedUserDetailedProfile(data);
          setEditFormFields({
            nome: data.nome || data.username || selectedProfileUser.name || '',
            phoneNumber: data.phoneNumber || '',
            email: data.email || auth.currentUser?.email || '',
            bio: data.bio || '',
            liveIn: data.liveIn || '',
            homeTown: data.homeTown || '',
            relationship: data.relationship || 'Solteiro',
            birthday: data.birthday || '',
            school: data.school || '',
            isPrivate: data.isPrivate || false,
            coverURL: data.coverURL || '',
            socialLinks: data.socialLinks || [{ platform: 'Instagram', url: '', mask: '' }]
          });
        } else {
          setSelectedUserDetailedProfile({});
          setEditFormFields({
            nome: selectedProfileUser.name || '',
            phoneNumber: '',
            email: auth.currentUser?.email || '',
            bio: '',
            liveIn: '',
            homeTown: '',
            relationship: 'Solteiro',
            birthday: '',
            school: '',
            isPrivate: false,
            coverURL: '',
            socialLinks: [{ platform: 'Instagram', url: '', mask: '' }]
          });
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setSelectedUserDetailedProfile({});
      }
    };
    fetchUserProfile();

    const q = query(
      collection(db, 'community_posts'),
      where('userId', '==', selectedProfileUser.id)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Post));
      postsData.sort((a, b) => {
        const timeA = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime()) : 0;
        const timeB = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime()) : 0;
        return timeB - timeA;
      });
      setSelectedUserPosts(currentPosts => {
        return postsData.map(newPost => {
          const old = currentPosts.find(p => p.id === newPost.id);
          if (old && old.userLiked !== undefined) {
            newPost.userLiked = old.userLiked;
          }
          return newPost;
        });
      });
      setIsLoadingSelectedProfile(false);
    }, (err) => {
      console.error('Error loading posts:', err);
      setIsLoadingSelectedProfile(false);
    });

    // Clean inline comments
    setProfilePostCommentInputs({});
    setActiveProfilePostComments({});

    return () => unsub();
  }, [selectedProfileUser]);

  useEffect(() => {
    if (!selectedProfileUser) return;
    
    // Listen to real followers and following collections under the user document
    const unsubFollowers = onSnapshot(collection(db, 'usuarios', selectedProfileUser.id, 'followers'), (snap) => {
      setProfileFollowersCount(snap.size);
      const isMeFollowing = snap.docs.some(d => d.id === auth.currentUser?.uid);
      setProfileIsFollowing(isMeFollowing);
    }, (err) => console.warn('Followers snapshot error:', err));

    const unsubFollowing = onSnapshot(collection(db, 'usuarios', selectedProfileUser.id, 'following'), (snap) => {
      setProfileFollowingCount(snap.size);
    }, (err) => console.warn('Following snapshot error:', err));

    return () => {
      unsubFollowers();
      unsubFollowing();
    };
  }, [selectedProfileUser]);

  useEffect(() => {
    const savedDefaultFeed = localStorage.getItem('app_default_community_feed') as 'forex' | 'ob';
    if (savedDefaultFeed) setActiveFeed(savedDefaultFeed);

    const savedShowFilter = localStorage.getItem('app_show_community_filter');
    if (savedShowFilter) setShowFilter(savedShowFilter === 'true');
  }, []);
  const [posts, setPosts] = useState<Post[]>([]);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPost, setNewPost] = useState({ legend: '', imageUrl: '', imageUrls: [] as string[], type: 'forex' as 'forex' | 'ob' });
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeComments, setActiveComments] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [activeCommentDropdown, setActiveCommentDropdown] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  const isAdmin = userPlan?.role === 'admin';

  useEffect(() => {
    const q = query(
      collection(db, 'community_posts'),
      where('type', '==', activeFeed)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        userLiked: false // We'll check this per user if needed
      } as Post));
      postsData.sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });
      setPosts(currentPosts => {
        return postsData.map(newPost => {
          const old = currentPosts.find(p => p.id === newPost.id);
          if (old && old.userLiked !== undefined) {
            newPost.userLiked = old.userLiked;
          }
          return newPost;
        });
      });
    }, (err) => console.warn('Community posts snapshot error:', err));

    const bQ = query(collection(db, 'broadcasts'), orderBy('createdAt', 'desc'));
    const unsubB = onSnapshot(bQ, (snapshot) => {
      setBroadcasts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.warn('Broadcasts snapshot error:', err));

    return () => {
      unsubscribe();
      unsubB();
    };
  }, [activeFeed]);

  const [userLikedPostIds, setUserLikedPostIds] = useState<Set<string>>(new Set());
  const likingPostsRef = useRef<Set<string>>(new Set());

  // Effect to check likes per post in Firestore
  const checkedLikesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    const allPosts = [...posts, ...selectedUserPosts];
    allPosts.forEach(async (post) => {
      if (checkedLikesRef.current.has(post.id)) return;
      checkedLikesRef.current.add(post.id);

      try {
        const likeDoc = await getDoc(doc(db, 'community_posts', post.id, 'likes', uid));
        if (likeDoc.exists()) {
          setUserLikedPostIds(prev => {
            const next = new Set(prev);
            next.add(post.id);
            return next;
          });
          setPosts(current => current.map(p => p.id === post.id ? { ...p, userLiked: true } : p));
          setSelectedUserPosts(current => current.map(p => p.id === post.id ? { ...p, userLiked: true } : p));
        }
      } catch (err) {
        console.error('Error checking like for post:', post.id, err);
      }
    });
  }, [posts, selectedUserPosts]);

  const handleSavePost = async () => {
    if (!newPost.legend || !auth.currentUser) return;
    setIsSubmitting(true);
    try {
      let finalImageUrls = [...(newPost.imageUrls || [])];
      
      // Upload do arquivo selecionado se houver
      if (selectedFile) {
        const fileRef = ref(storage, `community/${auth.currentUser.uid}/${Date.now()}_${selectedFile.name}`);
        await uploadBytes(fileRef, selectedFile);
        const uploadedUrl = await getDownloadURL(fileRef);
        finalImageUrls.push(uploadedUrl);
      }
      
      // Se tiver algo no input de URL agora, adiciona
      if (newPost.imageUrl.trim() && !finalImageUrls.includes(newPost.imageUrl.trim())) {
        finalImageUrls.push(newPost.imageUrl.trim());
      }
      
      // Formatar links do TradingView para imagem direta se possível
      const formattedUrls = finalImageUrls.map(url => {
         if (url.includes('tradingview.com/x/')) {
            // Se for link do tipo /x/abcd/, muitas vezes /x/abcd.png funciona
            if (!url.endsWith('.png')) return url + '.png';
         }
         return url;
      });

      let finalImageUrl = formattedUrls.length > 0 ? formattedUrls[0] : '';

      if (editingPostId) {
        await updateDoc(doc(db, 'community_posts', editingPostId), {
          legend: newPost.legend,
          imageUrl: finalImageUrl,
          imageUrls: formattedUrls,
          type: newPost.type,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'community_posts'), {
          userId: auth.currentUser.uid,
          userName: dbName || auth.currentUser.displayName || 'Membro C Profit',
          userPhoto: dbPhoto || auth.currentUser.photoURL || '',
          legend: newPost.legend,
          imageUrl: finalImageUrl,
          imageUrls: formattedUrls,
          type: newPost.type,
          likesCount: 0,
          commentsCount: 0,
          createdAt: serverTimestamp()
        });
      }
      setIsCreateModalOpen(false);
      setEditingPostId(null);
      setNewPost({ legend: '', imageUrl: '', imageUrls: [], type: activeFeed });
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (err) {
      console.error("Error saving post:", err);
      alert("Erro ao publicar. Verifique sua conexão ou o link da imagem.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditModal = (post: Post) => {
    setNewPost({
      legend: post.legend,
      imageUrl: post.imageUrl || '',
      imageUrls: post.imageUrls || [],
      type: post.type
    });
    setEditingPostId(post.id);
    setIsCreateModalOpen(true);
  };

  const handleSavePlanning = async (post: Post) => {
    if (!auth.currentUser || !post.isPlanningShare || !post.originalPlanningId) return;
    try {
      // Create a copy of this planning for the user
      await addDoc(collection(db, 'planning'), {
        userId: auth.currentUser.uid,
        content: post.legend, // legend has the content
        createdAt: serverTimestamp(),
        title: `Cópia: Planejamento de ${post.userName}`,
        sentiment: 'neutral',
        confidence: 'med',
        isDailyNote: false
      });
      alert('Planejamento salvo com sucesso!');
    } catch (err) {
      console.error('Error saving planning:', err);
      alert('Erro ao salvar planejamento.');
    }
  };

  const handleLike = async (post: Post) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const postId = post.id;

    // Prevent concurrent/rapid click duplication for the same post
    if (likingPostsRef.current.has(postId)) {
      return;
    }
    likingPostsRef.current.add(postId);

    const likeRef = doc(db, 'community_posts', postId, 'likes', uid);
    const postRef = doc(db, 'community_posts', postId);

    try {
      let isNowLiked = false;
      let newLikesCount = 0;

      await runTransaction(db, async (transaction) => {
        const likeSnap = await transaction.get(likeRef);
        const postSnap = await transaction.get(postRef);

        const currentCount = postSnap.exists() ? (postSnap.data().likesCount || 0) : 0;

        if (likeSnap.exists()) {
          // Already liked by this user -> UNLIKE
          transaction.delete(likeRef);
          newLikesCount = Math.max(0, currentCount - 1);
          transaction.update(postRef, { likesCount: newLikesCount });
          isNowLiked = false;
        } else {
          // Not liked yet by this user -> LIKE
          transaction.set(likeRef, {
            createdAt: serverTimestamp(),
            userId: uid
          });
          newLikesCount = currentCount + 1;
          transaction.update(postRef, { likesCount: newLikesCount });
          isNowLiked = true;
        }
      });

      setUserLikedPostIds(prev => {
        const next = new Set(prev);
        if (isNowLiked) next.add(postId);
        else next.delete(postId);
        return next;
      });

      setPosts(prev => prev.map(p => p.id === postId ? { ...p, userLiked: isNowLiked, likesCount: newLikesCount } : p));
      setSelectedUserPosts(prev => prev.map(p => p.id === postId ? { ...p, userLiked: isNowLiked, likesCount: newLikesCount } : p));
      if (viewingPost && viewingPost.id === postId) {
        setViewingPost(prev => prev ? { ...prev, userLiked: isNowLiked, likesCount: newLikesCount } : null);
      }

    } catch (err) {
      console.error('Error toggling like:', err);
    } finally {
      likingPostsRef.current.delete(postId);
    }
  };

  const loadComments = (postId: string) => {
    setActiveComments(postId);
    const q = query(collection(db, 'community_posts', postId, 'comments'), orderBy('createdAt', 'asc'));
    onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.warn('Load comments snapshot error:', err));
  };

  const handleAddComment = async (postId: string) => {
    if (!newComment || !auth.currentUser) return;
    try {
      await addDoc(collection(db, 'community_posts', postId, 'comments'), {
        userId: auth.currentUser.uid,
        userName: dbName || auth.currentUser.displayName || 'Membro C Profit',
        userPhoto: dbPhoto || auth.currentUser.photoURL || '',
        text: newComment,
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'community_posts', postId), {
        commentsCount: increment(1)
      });
      setNewComment('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!window.confirm('Desculpe, tem certeza de que deseja eliminar este comentário?')) return;
    try {
      await deleteDoc(doc(db, 'community_posts', postId, 'comments', commentId));
      await updateDoc(doc(db, 'community_posts', postId), {
        commentsCount: increment(-1)
      });
      setActiveCommentDropdown(null);
    } catch (err) {
      console.error(err);
      alert('Erro ao eliminar comentário.');
    }
  };

  const handleSaveEditedComment = async (postId: string, commentId: string) => {
    if (!editingCommentText.trim()) return;
    try {
      await updateDoc(doc(db, 'community_posts', postId, 'comments', commentId), {
        text: editingCommentText.trim()
      });
      setEditingCommentId(null);
      setEditingCommentText('');
    } catch (err) {
      console.error(err);
      alert('Erro ao guardar comentário editado.');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Deseja excluir esta análise?')) return;
    try {
      await deleteDoc(doc(db, 'community_posts', postId));
      setActiveDropdown(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBlockUser = async (userId: string) => {
    if (!auth.currentUser || !window.confirm('Tem certeza que deseja bloquear este usuário? Você não verá mais suas publicações ou mensagens.')) return;
    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid, 'blocks', userId), {
        blockedAt: serverTimestamp()
      });
      alert('Usuário bloqueado com sucesso.');
      setActiveDropdown(null);
    } catch (err) {
      console.error('Error blocking user:', err);
    }
  };

  const handleToggleFriend = async () => {
    if (!auth.currentUser || !selectedProfileUser) return;
    
    const isFriend = friendsList.includes(selectedProfileUser.id);
    const friendRef = doc(db, 'users', auth.currentUser.uid, 'friends', selectedProfileUser.id);
    
    try {
      if (isFriend) {
        // Remove friend. We delete our own pointer.
        await deleteDoc(friendRef);
        
        // Also delete any mutual friend requests
        const qReq = query(
          collection(db, 'friend_requests'),
          where('senderId', 'in', [auth.currentUser.uid, selectedProfileUser.id]),
          where('receiverId', 'in', [auth.currentUser.uid, selectedProfileUser.id])
        );
        const reqSnap = await getDocs(qReq);
        for (const d of reqSnap.docs) {
          await deleteDoc(doc(db, 'friend_requests', d.id));
        }

        alert(`${selectedProfileUser.name} foi removido dos seus amigos.`);
      } else {
        // Send / Accept Friend Request
        const incoming = incomingRequests.find(r => r.senderId === selectedProfileUser.id);
        const outgoing = outgoingRequests.find(r => r.receiverId === selectedProfileUser.id);
        
        if (incoming) {
          // If there's an incoming request from them, accept it!
          await handleAcceptFriendRequest(incoming);
        } else if (outgoing) {
          alert('Já enviou um pedido de amizade. Aguardando a aprovação do trader.');
        } else {
          // Send request
          await handleSendFriendRequest();
        }
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao processar amizade.');
    }
  };

  const handleSendFriendRequest = async () => {
    if (!auth.currentUser || !selectedProfileUser) return;
    try {
      const qCheck = query(
        collection(db, 'friend_requests'),
        where('senderId', '==', auth.currentUser.uid),
        where('receiverId', '==', selectedProfileUser.id)
      );
      const checkSnap = await getDocs(qCheck);
      if (!checkSnap.empty) {
        alert('Já enviou um pedido de amizade.');
        return;
      }

      await addDoc(collection(db, 'friend_requests'), {
        senderId: auth.currentUser.uid,
        senderName: dbName || auth.currentUser.displayName || 'Trader',
        senderPhoto: dbPhoto || auth.currentUser.photoURL || '',
        receiverId: selectedProfileUser.id,
        receiverName: selectedProfileUser.name,
        receiverPhoto: selectedProfileUser.photo || '',
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      alert(`Pedido de amizade enviado para ${selectedProfileUser.name}!`);
    } catch (err) {
      console.error('Error sending friend request:', err);
      alert('Erro ao enviar pedido de amizade.');
    }
  };

  const sendFriendRequest = async (targetId: string, targetName: string, targetPhoto: string) => {
    if (!auth.currentUser) return;
    try {
      const qCheck = query(
        collection(db, 'friend_requests'),
        where('senderId', '==', auth.currentUser.uid),
        where('receiverId', '==', targetId)
      );
      const checkSnap = await getDocs(qCheck);
      if (!checkSnap.empty) {
        alert('Já enviou um pedido de amizade.');
        return;
      }

      await addDoc(collection(db, 'friend_requests'), {
        senderId: auth.currentUser.uid,
        senderName: dbName || auth.currentUser.displayName || 'Trader',
        senderPhoto: dbPhoto || auth.currentUser.photoURL || '',
        receiverId: targetId,
        receiverName: targetName,
        receiverPhoto: targetPhoto || '',
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      alert(`Pedido de amizade enviado para ${targetName}!`);
    } catch (err) {
      console.error('Error sending friend request:', err);
      alert('Erro ao enviar pedido de amizade.');
    }
  };

  const handleAcceptFriendRequest = async (req: any) => {
    if (!auth.currentUser) return;
    try {
      // 1. Update request status to accepted
      await updateDoc(doc(db, 'friend_requests', req.id), { status: 'accepted' });
      
      // 2. Add to my friends list
      await setDoc(doc(db, 'users', auth.currentUser.uid, 'friends', req.senderId), {
        addedAt: new Date().toISOString()
      });
      
      alert(`Você aceitou o pedido de amizade de ${req.senderName}!`);
    } catch (err) {
      console.error('Error accepting friend request:', err);
      alert('Erro ao aceitar pedido de amizade.');
    }
  };

  const handleRejectFriendRequest = async (req: any) => {
    try {
      await deleteDoc(doc(db, 'friend_requests', req.id));
    } catch (err) {
      console.error('Error rejecting friend request:', err);
    }
  };

  const getRecommendedTraders = () => {
    if (!auth.currentUser) return [];
    return allCommunityUsers
      .filter(u => u.id !== auth.currentUser?.uid && !friendsList.includes(u.id) && !blockedUsers.includes(u.id))
      .slice(0, 5);
  };

  const handleToggleDistance = async () => {
    if (!auth.currentUser || !selectedProfileUser) return;
    const distanceRef = doc(db, 'users', auth.currentUser.uid, 'distancing', selectedProfileUser.id);
    try {
      if (distancedList.includes(selectedProfileUser.id)) {
        await deleteDoc(distanceRef);
        alert(`Você removeu a distância de ${selectedProfileUser.name}. Agora voltará a ver as publicações dele.`);
      } else {
        await setDoc(distanceRef, { distancedAt: serverTimestamp() });
        alert(`Você marcou distância de ${selectedProfileUser.name}. Não verá mais suas publicações.`);
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao marcar distância.');
    }
  };

  const handleToggleFollow = async () => {
    if (!auth.currentUser || !selectedProfileUser) return;
    try {
      const followerRef = doc(db, 'usuarios', selectedProfileUser.id, 'followers', auth.currentUser.uid);
      const followingRef = doc(db, 'usuarios', auth.currentUser.uid, 'following', selectedProfileUser.id);
      
      if (profileIsFollowing) {
        await deleteDoc(followerRef);
        await deleteDoc(followingRef);
      } else {
        await setDoc(followerRef, { followedAt: new Date() });
        await setDoc(followingRef, { followedAt: new Date() });
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
    }
  };

  const handleSaveProfileEdits = async () => {
    if (!auth.currentUser || !selectedProfileUser) return;
    setIsSavingProfileEdits(true);
    try {
      const userDocRef = doc(db, 'usuarios', auth.currentUser.uid);
      const updatedData = {
        nome: editFormFields.nome,
        phoneNumber: editFormFields.phoneNumber,
        email: editFormFields.email,
        bio: editFormFields.bio,
        liveIn: editFormFields.liveIn,
        homeTown: editFormFields.homeTown,
        relationship: editFormFields.relationship,
        birthday: editFormFields.birthday,
        school: editFormFields.school,
        isPrivate: editFormFields.isPrivate,
        coverURL: editFormFields.coverURL,
        socialLinks: editFormFields.socialLinks || [],
        updatedAt: serverTimestamp()
      };
      await setDoc(userDocRef, updatedData, { merge: true });
      
      setSelectedUserDetailedProfile(prev => prev ? {
        ...prev,
        ...updatedData
      } : updatedData as any);
      
      setIsEditingProfileDetails(false);
      setModalConfig({
        isOpen: true,
        title: "Sucesso",
        message: "Perfil editado com sucesso!",
        confirmText: "OK",
        onConfirm: closeModal
      });
    } catch (err) {
      console.error('Error saving profile edits:', err);
      setModalConfig({
        isOpen: true,
        title: "Erro",
        message: "Erro ao guardar alterações.",
        isError: true,
        confirmText: "OK",
        onConfirm: closeModal
      });
    } finally {
      setIsSavingProfileEdits(false);
    }
  };

  const handleAddSocialLink = () => {
    const current = editFormFields.socialLinks || [];
    if (current.length >= 3) {
      alert("Você pode adicionar no máximo 3 contas de redes sociais.");
      return;
    }
    setEditFormFields({
      ...editFormFields,
      socialLinks: [...current, { platform: 'Instagram', url: '', mask: '' }]
    });
  };

  const handleRemoveSocialLink = (index: number) => {
    const current = editFormFields.socialLinks || [];
    const updated = current.filter((_, idx) => idx !== index);
    setEditFormFields({
      ...editFormFields,
      socialLinks: updated.length === 0 ? [{ platform: 'Instagram', url: '', mask: '' }] : updated
    });
  };

  const handleSocialLinkChange = (index: number, key: 'platform' | 'url' | 'mask', value: string) => {
    const current = [...(editFormFields.socialLinks || [])];
    if (current[index]) {
      current[index] = { ...current[index], [key]: value };
      setEditFormFields({
        ...editFormFields,
        socialLinks: current
      });
    }
  };

  const handleUploadProfilePhoto = async (e: React.ChangeEvent<HTMLInputElement>, isCover: boolean) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;
    try {
      const path = isCover ? `covers/${auth.currentUser.uid}/${Date.now()}_${file.name}` : `profiles/${auth.currentUser.uid}/${Date.now()}_${file.name}`;
      const fileRef = ref(storage, path);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      
      const userDocRef = doc(db, 'usuarios', auth.currentUser.uid);
      if (isCover) {
        await setDoc(userDocRef, { coverURL: url }, { merge: true });
        setEditFormFields(prev => ({ ...prev, coverURL: url }));
        setSelectedUserDetailedProfile(prev => prev ? { ...prev, coverURL: url } : { coverURL: url });
      } else {
        await setDoc(userDocRef, { photoURL: url }, { merge: true });
        setSelectedUserDetailedProfile(prev => prev ? { ...prev, photoURL: url } : { photoURL: url });
        if (selectedProfileUser) {
          setSelectedProfileUser(prev => prev ? { ...prev, photo: url } : null);
        }
      }
      alert(`${isCover ? 'Foto de capa' : 'Foto de perfil'} atualizada com sucesso!`);
    } catch (err) {
      console.error('Error uploading profile asset:', err);
      alert('Erro no envio do ficheiro.');
    }
  };

  const handleLikeProfilePost = async (post: Post) => {
    await handleLike(post);
  };

  const handleUserClick = (userId: string, userName: string, userPhoto: string) => {
    if (!auth.currentUser) return;
    if (userId === auth.currentUser.uid) {
      window.dispatchEvent(new CustomEvent('navigateToTab', { detail: 'profile' }));
      return;
    }
    setSelectedProfileUser({ id: userId, name: userName, photo: userPhoto });
  };

  const handleSendMessageToUser = async (otherUserId: string) => {
    if (!auth.currentUser) return;
    // Check if chat already exists
    try {
      const q = query(
        collection(db, 'chats'),
        where('type', '==', 'direct'),
        where('participants', 'array-contains', auth.currentUser.uid)
      );
      // Let's just create or redirect. But we can't easily fetch and filter locally unless we do a getDocs
      // Quick way for UI: just switch tab.
      // Better: we can set a state in CommunityChat to initiate chat. We can use localStorage or a simple way.
      // For now, let's just create a chat explicitly.
      const snapshot = await import('firebase/firestore').then(firestore => firestore.getDocs(q));
      const existingChat = snapshot.docs.find(d => d.data().participants.includes(otherUserId));

      if (!existingChat) {
        await addDoc(collection(db, 'chats'), {
          type: 'direct',
          participants: [auth.currentUser.uid, otherUserId],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          unreadCount: {
            [auth.currentUser.uid]: 0,
            [otherUserId]: 0
          }
        });
      }
      setActiveDropdown(null);
      // Dispatch event to open global chat
      window.dispatchEvent(new CustomEvent('openGlobalChat'));
    } catch (err) {
      console.error('Error creating chat:', err);
    }
  };


  const handleShare = (post: Post) => {
    const shareText = `Análise de ${post.userName} no C Profit:\n${post.legend}\nConfira no Terminal C Profit!`;
    if (navigator.share) {
      navigator.share({
        title: 'C Profit Community',
        text: shareText,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(shareText);
      alert('Link e legenda copiados para a área de transferência!');
    }
  };

  const renderTextWithMentions = (text: string) => {
    if (!text) return text;
    const mentionRegex = /@([a-zA-Z0-9_\s]+?)(?=\s|$|[,.?!])/g;
    const parts = text.split(/(?=@)/);
    
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        const spaceIndex = part.indexOf(' ');
        let name = part.substring(1);
        let rest = '';
        if (spaceIndex !== -1) {
           name = part.substring(1, spaceIndex);
           rest = part.substring(spaceIndex);
        }
        return (
          <span key={index}>
            <span className="font-extrabold text-primary bg-primary/10 px-1 rounded inline-flex items-center">
              {name}
            </span>
            {rest}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Post Feed Scoring Algorithm (More likes, more comments + Recency factor)
  const getPostScore = (post: Post) => {
    const engagement = (post.likesCount || 0) * 2 + (post.commentsCount || 0) * 5;
    
    const postTime = post.createdAt ? (post.createdAt.toDate ? post.createdAt.toDate().getTime() : new Date(post.createdAt).getTime()) : Date.now();
    const hoursOld = (Date.now() - postTime) / (3600 * 1000);
    
    const baseRecency = 100000 / (hoursOld + 1);
    const engagementBonus = engagement * 250;
    return baseRecency + engagementBonus;
  };

  const sortedAndFilteredPosts = [...posts]
    .filter(p => !blockedUsers.includes(p.userId) && !distancedList.includes(p.userId))
    .sort((a, b) => getPostScore(b) - getPostScore(a));

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-4xl md:text-5xl font-black text-on-surface font-headline uppercase italic tracking-tighter">
          Traders da <span className="text-primary italic">Nguimbi</span>
        </h2>
        <p className="text-on-surface-variant text-sm md:text-base font-medium opacity-70">A sua rede social de trading elite.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-8">

      {/* Main Tabs (Feed vs Chat) */}
      {showFilter && (
        <div className="flex bg-surface-container-low border border-outline-variant/10 rounded-2xl md:rounded-full w-full max-w-md mx-auto p-1">
          <button 
            onClick={() => setActiveFeed('forex')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl md:rounded-full text-sm font-black transition-all ${activeFeed === 'forex' ? 'bg-primary text-on-primary shadow-lg' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            <Globe size={18} />
            Forex & Índices
          </button>
          <button 
            onClick={() => setActiveFeed('ob')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl md:rounded-full text-sm font-black transition-all ${activeFeed === 'ob' ? 'bg-primary text-on-primary shadow-lg' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            <Smartphone size={18} />
            Opções Binárias
          </button>
        </div>
      )}

      {/* Composer Box (Facebook Style) */}
      <div className="bg-surface-container-low border border-outline-variant/10 rounded-[32px] p-4 md:p-6 shadow-xl shadow-black/5">
        <div className="flex items-center gap-4 mb-4">
          <img 
            src={dbPhoto || auth.currentUser?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(dbName || auth.currentUser?.displayName || 'Traders')}&background=random`} 
            alt="Me" 
            className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border border-outline-variant/10"
            referrerPolicy="no-referrer"
          />
          <button 
            onClick={() => {
              setNewPost({ ...newPost, type: activeFeed });
              setIsCreateModalOpen(true);
            }}
            className="flex-1 bg-surface-container hover:bg-surface-container-high text-on-surface-variant/60 text-left px-6 py-3 md:py-4 rounded-full text-sm md:text-base transition-all font-medium border border-outline-variant/5"
          >
            No que está a pensar, {(dbName || auth.currentUser?.displayName || 'Trader').split(' ')[0]}?
          </button>
        </div>
        
        <div className={`grid ${showFilter ? 'grid-cols-2' : 'grid-cols-1'} gap-2 pt-2 border-t border-outline-variant/5`}>
          {(showFilter || activeFeed === 'forex') && (
            <button 
              onClick={() => {
                setNewPost({ ...newPost, type: 'forex' });
                setIsCreateModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl hover:bg-surface-container transition-all text-xs font-black uppercase tracking-widest text-on-surface-variant"
            >
              <Globe size={18} className="text-secondary" />
              Análise FX
            </button>
          )}
          {(showFilter || activeFeed === 'ob') && (
            <button 
              onClick={() => {
                setNewPost({ ...newPost, type: 'ob' });
                setIsCreateModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl hover:bg-surface-container transition-all text-xs font-black uppercase tracking-widest text-on-surface-variant"
            >
              <Smartphone size={18} className="text-primary" />
              Análise OB
            </button>
          )}
        </div>
      </div>

      {/* Broadcasts (Avisos da Administração) */}
      {broadcasts.length > 0 && (
        <div className="space-y-4">
          {broadcasts.slice(0, 3).map(b => (
            <div key={b.id} className="bg-primary/10 border border-primary/30 rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-primary" />
              <div className="flex items-center gap-3 mb-2">
                <Megaphone className="text-primary" />
                <span className="text-[10px] uppercase tracking-widest font-black text-primary">Comunicado Oficial - {b.author || 'Admin'}</span>
                <span className="text-[10px] text-on-surface-variant ml-auto opacity-70">
                  {new Date(b.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-on-surface text-sm font-medium leading-relaxed whitespace-pre-wrap">{b.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Posts Feed */}
      <div className="space-y-8">
        {sortedAndFilteredPosts.map(post => (
          <div key={post.id} className="bg-surface-container-low border border-outline-variant/10 rounded-[40px] overflow-hidden shadow-2xl group animate-in slide-in-from-bottom duration-500">
            {/* Post Header */}
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative cursor-pointer hover:scale-105 transition-transform" onClick={() => handleUserClick(post.userId, post.userName, post.userPhoto || '')}>
                  <img src={post.userPhoto || `https://ui-avatars.com/api/?name=${post.userName}&background=random`} alt={post.userName} className="w-12 h-12 rounded-2xl object-cover border border-outline-variant/10" referrerPolicy="no-referrer" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary text-on-primary rounded-lg flex items-center justify-center border-2 border-surface-container-low">
                    <ShieldCheck size={12} />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-black text-on-surface uppercase tracking-tight cursor-pointer hover:text-primary transition-colors" onClick={() => handleUserClick(post.userId, post.userName, post.userPhoto || '')}>{post.userName}</p>
                  <p className="text-[10px] text-on-surface-variant font-medium opacity-60 italic">
                    {post.createdAt ? new Date(post.createdAt.toDate ? post.createdAt.toDate() : post.createdAt).toLocaleString() : 'Recentemente'}
                  </p>
                </div>
              </div>
              
              <div className="relative">
                <button 
                  onClick={() => setActiveDropdown(activeDropdown === post.id ? null : post.id)}
                  className="p-2 rounded-xl hover:bg-surface-container text-on-surface-variant transition-all"
                >
                  <MoreVertical size={20} />
                </button>
                {activeDropdown === post.id && (
                  <div className="absolute top-10 right-0 w-48 bg-surface-container-high border border-outline-variant/20 rounded-2xl shadow-xl overflow-hidden py-2 z-10 animate-in fade-in slide-in-from-top-2">
                     {post.userId === auth.currentUser?.uid && (
                      <button 
                        onClick={() => {
                          handleOpenEditModal(post);
                          setActiveDropdown(null);
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-on-surface hover:bg-surface-container transition-colors flex items-center gap-3"
                      >
                        <Edit2 className="text-[18px]" />
                        Editar
                      </button>
                     )}
                     
                     {post.userId !== auth.currentUser?.uid && (
                      <>
                        <button 
                          onClick={() => handleSendMessageToUser(post.userId)}
                          className="w-full text-left px-4 py-3 text-sm text-secondary hover:bg-accent/10 transition-colors flex items-center gap-3"
                        >
                          <Send size={18} />
                          Mensagem
                        </button>
                        <button 
                          onClick={() => handleBlockUser(post.userId)}
                          className="w-full text-left px-4 py-3 text-sm text-error hover:bg-error/10 transition-colors flex items-center gap-3 border-t border-outline-variant/10"
                        >
                          <Ban className="text-[18px]" />
                          Bloquear
                        </button>
                      </>
                     )}

                     {(isAdmin || post.userId === auth.currentUser?.uid) && (
                       <button 
                        onClick={() => handleDeletePost(post.id)}
                        className="w-full text-left px-4 py-3 text-sm text-error hover:bg-error/10 transition-colors flex items-center gap-3 border-t border-outline-variant/10"
                       >
                         <Trash2 size={18} />
                         Eliminar
                       </button>
                     )}
                  </div>
                )}
              </div>
            </div>

            {/* Post Content */}
            <div className="px-6 pb-4 cursor-pointer" onClick={() => setViewingPost(post)}>
              <p className="text-on-surface text-base leading-relaxed whitespace-pre-wrap line-clamp-4">{renderTextWithMentions(post.legend)}</p>
              {post.legend.length > 200 && (
                 <span className="text-secondary text-sm font-bold mt-2 inline-block">Ver mais</span>
              )}
            </div>

            {/* Post Media / Link / Trade Card */}
            {(post.tradeDetails || post.imageUrl) && (
              <div className="px-6 pb-4 cursor-pointer" onClick={() => setViewingPost(post)}>
                <TradeShareCard 
                  tradeDetails={post.tradeDetails} 
                  imageUrl={post.imageUrl} 
                  userName={post.userName}
                />
              </div>
            )}

            {/* Post Stats & Actions */}
            <div className="p-4 bg-surface-container/30 flex items-center gap-6">
              <button 
                onClick={() => handleLike(post)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl transition-all font-black text-xs uppercase tracking-widest ${post.userLiked ? 'bg-secondary/10 text-secondary' : 'hover:bg-surface-container text-on-surface-variant'}`}
              >
                <ThumbsUpIcon size={18} fill={post.userLiked ? 'currentColor' : 'none'} />
                {post.likesCount || 0}
              </button>

              <button 
                onClick={() => activeComments === post.id ? setActiveComments(null) : loadComments(post.id)}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl hover:bg-surface-container text-on-surface-variant transition-all font-black text-xs uppercase tracking-widest"
              >
                <MessageSquare size={18} />
                {post.commentsCount || 0}
              </button>

              {post.isPlanningShare && post.userId !== auth.currentUser?.uid && (
                <button
                  onClick={() => handleSavePlanning(post)}
                  className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl hover:bg-primary/10 text-primary transition-all font-black text-xs uppercase tracking-widest ml-auto"
                  title="Salvar Planejamento"
                >
                  <Bookmark size={18} />
                  Salvar
                </button>
              )}

              <button 
                onClick={() => handleShare(post)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl hover:bg-surface-container text-on-surface-variant transition-all font-black text-xs uppercase tracking-widest ${!post.isPlanningShare || post.userId === auth.currentUser?.uid ? 'ml-auto' : ''}`}
              >
                <Share2 size={18} />
                Partilhar
              </button>
            </div>

            {/* Comments Section */}
            {activeComments === post.id && (
              <div className="p-6 border-t border-outline-variant/10 bg-surface-container-low animate-in slide-in-from-top duration-300">
                <div className="space-y-6 max-h-[300px] overflow-y-auto mb-6 pr-2 custom-scrollbar">
                  {comments.map(c => (
                    <div key={c.id} className="flex gap-4">
                      {c.userPhoto ? (
                        <img 
                          src={c.userPhoto} 
                          alt={c.userName} 
                          className="w-8 h-8 rounded-xl object-cover border border-outline-variant/10 shrink-0 cursor-pointer hover:scale-105 transition-transform" 
                          referrerPolicy="no-referrer" 
                          onClick={() => handleUserClick(c.userId, c.userName, c.userPhoto || '')}
                        />
                      ) : (
                        <div 
                          className="w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0 font-bold text-xs cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => handleUserClick(c.userId, c.userName, '')}
                        >
                          {c.userName ? c.userName[0] : 'U'}
                        </div>
                      )}
                      <div className="flex-1 bg-surface-container p-4 rounded-3xl rounded-tl-none">
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex gap-1 items-center">
                            <p className="text-[10px] font-black text-primary uppercase cursor-pointer hover:text-primary transition-colors" onClick={() => handleUserClick(c.userId, c.userName, c.userPhoto || '')}>{c.userName}</p>
                          </div>
                          <div className="flex items-center gap-1.5 relative">
                            <p className="text-[9px] text-on-surface-variant opacity-40 uppercase">
                              {c.createdAt ? new Date(c.createdAt.toDate ? c.createdAt.toDate() : c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </p>
                            {((c.userId === auth.currentUser?.uid) || (post.userId === auth.currentUser?.uid)) && (
                              <div className="relative">
                                <button
                                  onClick={() => setActiveCommentDropdown(activeCommentDropdown === c.id ? null : c.id)}
                                  className="text-on-surface-variant hover:text-on-surface p-0.5 rounded-full hover:bg-surface-container-high transition-colors flex items-center justify-center"
                                  title="Opções de comentário"
                                >
                                  <MoreVertical size={13} className="opacity-60" />
                                </button>
                                {activeCommentDropdown === c.id && (
                                  <div className="absolute right-0 mt-1 w-28 bg-surface-container-highest border border-outline-variant/20 rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                                    {c.userId === auth.currentUser?.uid && (
                                      <button
                                        onClick={() => {
                                          setEditingCommentId(c.id);
                                          setEditingCommentText(c.text);
                                          setActiveCommentDropdown(null);
                                        }}
                                        className="w-full text-left px-3 py-1.5 text-xs text-on-surface hover:bg-surface-container font-semibold flex items-center gap-1.5 transition-colors"
                                      >
                                        Editar
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleDeleteComment(post.id, c.id)}
                                      className="w-full text-left px-3 py-1.5 text-xs text-error hover:bg-error/10 font-semibold flex items-center gap-1.5 transition-colors"
                                    >
                                      Eliminar
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        {editingCommentId === c.id ? (
                          <div className="space-y-2 mt-2">
                            <input 
                              type="text" 
                              value={editingCommentText}
                              onChange={(e) => setEditingCommentText(e.target.value)}
                              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary transition-all"
                              onKeyPress={(e) => e.key === 'Enter' && handleSaveEditedComment(post.id, c.id)}
                              autoFocus
                            />
                            <div className="flex gap-2 justify-end">
                              <button 
                                onClick={() => handleSaveEditedComment(post.id, c.id)}
                                className="px-3 py-1 bg-primary text-on-primary rounded-lg text-[10px] font-black uppercase tracking-wider transition-all hover:scale-105"
                              >
                                Gravar
                              </button>
                              <button 
                                onClick={() => {
                                  setEditingCommentId(null);
                                  setEditingCommentText('');
                                }}
                                className="px-3 py-1 bg-surface-container-high text-on-surface-variant rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border border-outline-variant/10"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-on-surface leading-tight">{renderTextWithMentions(c.text)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="text-center text-xs text-on-surface-variant opacity-50 italic py-4">Nenhum comentário ainda. Seja o primeiro!</p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <input 
                    type="text" 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Escreva um comentário..."
                    className="flex-1 bg-surface-container border border-outline-variant/10 rounded-2xl px-5 py-3 text-sm text-on-surface focus:outline-none focus:border-primary transition-all"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                  />
                  <button 
                    onClick={() => handleAddComment(post.id)}
                    className="w-11 h-11 bg-primary text-on-primary rounded-xl flex items-center justify-center hover:scale-105 transition-all shadow-lg shadow-primary/20"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {posts.length === 0 && (
          <div className="py-20 text-center space-y-6 opacity-40">
            <Globe size={64} className="mx-auto" />
            <p className="text-xl font-bold italic tracking-tight">O feed está calmo por agora...</p>
          </div>
        )}
      </div>
    </div>

      {/* Right Sidebar Column (Col span: 1) */}
      <div className="space-y-6 lg:sticky lg:top-24">
        
        {/* COMUNIDADE OFICIAL BANNER */}
        {(() => {
          const platform = globalSettings?.communityPlatform || 'Telegram';
          const link = globalSettings?.communityLink;
          
          if (!link) return null;
          
          return (
            <div className="bg-gradient-to-br from-[#00f5a0]/10 via-[#00f5a0]/5 to-transparent border border-[#00f5a0]/25 rounded-[32px] p-6 shadow-xl relative overflow-hidden group hover:shadow-2xl hover:scale-[1.01] transition-all duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#00f5a0]/10 blur-2xl rounded-full pointer-events-none group-hover:scale-125 transition-all duration-500" />
              
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#00f5a0]/10 flex items-center justify-center text-[#00f5a0] border border-[#00f5a0]/20 shrink-0 group-hover:scale-110 transition-transform duration-300 font-normal">
                  {platform === 'Telegram' && <Send className="text-[24px]" />}
                  {platform === 'WhatsApp' && <MessageSquare className="text-[24px]" />}
                  {platform === 'Discord' && <MessageCircle className="text-[24px]" />}
                  {platform !== 'Telegram' && platform !== 'WhatsApp' && platform !== 'Discord' && (
                    <Globe className="text-[24px]" />
                  )}
                </div>
                
                <div className="space-y-1 flex-1 text-left">
                  <span className="text-[10px] font-black tracking-widest text-[#00f5a0] bg-[#00f5a0]/10 px-2.5 py-1 rounded-full uppercase">Comunidade Oficial</span>
                  <h4 className="font-extrabold text-sm text-white pt-2 leading-snug">
                    Faça parte da comunidade: <span className="text-[#00f5a0]">{platform}</span>
                  </h4>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed">
                    Conecte-se com outros membros premium, compartilhe análises e receba novidades exclusivas.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-outline-variant/10 flex gap-2">
                <a 
                  href={link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-1 py-3 px-5 bg-[#00f5a0] hover:bg-[#00f5a0]/90 text-background rounded-2xl flex items-center justify-center gap-2 font-black uppercase text-xs tracking-wider shadow-lg shadow-[#00f5a0]/15 hover:scale-[1.01] active:scale-95 transition-all cursor-pointer"
                >
                  <span>Entrar no {platform}</span>
                  <ArrowRight className="text-[16px] font-black" />
                </a>
              </div>
            </div>
          );
        })()}

        {/* FRIEND REQUESTS CARD & WIDGET (PENDING ACTIONS) */}
        <div className="bg-surface-container-low border border-outline-variant/10 rounded-[32px] p-6 shadow-xl space-y-4">
           <div className="flex items-center gap-2 pb-2 border-b border-outline-variant/10">
             <UserPlus className="text-primary" />
             <h3 className="font-extrabold text-xs text-on-surface-variant uppercase tracking-widest pl-1">Solicitações Pendentes</h3>
             {incomingRequests.length > 0 && (
               <span className="bg-primary/20 text-primary text-[10px] px-2 py-0.5 rounded-full font-black">
                 {incomingRequests.length}
               </span>
             )}
           </div>
           {incomingRequests.length === 0 ? (
             <p className="text-xs text-on-surface-variant opacity-60 italic">Nenhum pedido de amizade pendente.</p>
           ) : (
             <div className="space-y-3">
               {incomingRequests.map(req => (
                 <div key={req.id} className="flex items-center justify-between p-3 bg-surface-container border border-outline-variant/5 rounded-2xl gap-3">
                   <div className="flex items-center gap-2 min-w-0">
                     <img 
                       src={req.senderPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(req.senderName)}&background=random`} 
                       alt={req.senderName} 
                       className="w-10 h-10 rounded-xl object-cover shrink-0"
                       referrerPolicy="no-referrer"
                     />
                     <div className="min-w-0">
                       <p className="text-xs font-black text-on-surface truncate cursor-pointer hover:underline" onClick={() => handleUserClick(req.senderId, req.senderName, req.senderPhoto)}>
                         {req.senderName}
                       </p>
                       <span className="text-[9px] text-on-surface-variant block truncate">Quer ser teu amigo</span>
                     </div>
                   </div>
                   <div className="flex items-center gap-1.5 shrink-0">
                     <button 
                       onClick={() => handleAcceptFriendRequest(req)}
                       className="p-1 px-2.5 bg-primary text-on-primary rounded-lg text-[10px] font-black hover:opacity-90 flex items-center justify-center cursor-pointer transition-all"
                     >
                       Aceitar
                     </button>
                     <button 
                       onClick={() => handleRejectFriendRequest(req)}
                       className="p-1.5 bg-error/10 text-error rounded-lg hover:bg-error/20 flex items-center justify-center cursor-pointer transition-all text-xs"
                       title="Recusar"
                     >
                       X
                     </button>
                   </div>
                 </div>
               ))}
             </div>
           )}
        </div>

        {/* TRADERS DA COMUNIDADE QUE TALVEZ CONHECES */}
        <div className="bg-surface-container-low border border-outline-variant/10 rounded-[32px] p-6 shadow-xl space-y-4">
           <div className="flex items-center gap-2 pb-2 border-b border-outline-variant/10">
             <Compass className="text-secondary" />
             <h3 className="font-extrabold text-xs text-on-surface-variant uppercase tracking-widest pl-1">Traders que talvez conheças</h3>
           </div>
           {getRecommendedTraders().length === 0 ? (
             <p className="text-xs text-on-surface-variant opacity-60 italic">Nenhuma recomendação de momento.</p>
           ) : (
             <div className="space-y-3.5">
               {getRecommendedTraders().map((trader) => {
                 const isSent = outgoingRequests.some(r => r.receiverId === trader.id && r.status === 'pending');
                 const isRecv = incomingRequests.some(r => r.senderId === trader.id);
                 
                 return (
                   <div key={trader.id} className="flex items-center justify-between p-2 hover:bg-surface-container/30 rounded-2xl transition-all group gap-2">
                     <div className="flex items-center gap-3 min-w-0">
                       <img 
                         src={trader.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(trader.nome || trader.username || 'T')}&background=random`} 
                         alt={trader.nome || trader.username}
                         className="w-10 h-10 rounded-xl object-cover shrink-0 cursor-pointer"
                         referrerPolicy="no-referrer"
                         onClick={() => handleUserClick(trader.id, trader.nome || trader.username || 'Trader', trader.photoURL || '')}
                       />
                       <div className="min-w-0">
                         <h4 className="text-xs font-bold text-on-surface truncate group-hover:underline cursor-pointer" onClick={() => handleUserClick(trader.id, trader.nome || trader.username || 'Trader', trader.photoURL || '')}>
                           {trader.nome || trader.username}
                         </h4>
                         <span className="text-[10px] text-on-surface-variant block truncate">Investidor C Profit</span>
                       </div>
                     </div>
                     
                     {isSent ? (
                       <span className="text-[10px] font-bold text-on-surface-variant/60 bg-surface-container px-2 py-1 rounded-lg">Enviado</span>
                     ) : isRecv ? (
                       <button 
                         onClick={() => handleAcceptFriendRequest(incomingRequests.find(r => r.senderId === trader.id))}
                         className="p-1 px-2.5 bg-primary text-on-primary rounded-lg text-[10px] font-bold cursor-pointer hover:opacity-90 transition-all"
                       >
                         Aceitar
                       </button>
                     ) : (
                       <button
                         onClick={() => sendFriendRequest(trader.id, trader.nome || trader.username, trader.photoURL)}
                         className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"
                         title="Adicionar Amigo"
                       >
                         <UserPlus size={16} />
                       </button>
                     )}
                   </div>
                 );
               })}
             </div>
           )}
        </div>

      </div>

    </div>

      {/* Create Post Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-surface-container border border-outline-variant/20 rounded-[40px] max-w-xl w-full p-8 shadow-3xl overflow-hidden relative">
            <button 
              onClick={() => {
                setIsCreateModalOpen(false);
                setEditingPostId(null);
                setNewPost({ legend: '', imageUrl: '', imageUrls: [], type: activeFeed });
              }}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-surface-container-high transition-colors"
            >
              <X size={24} className="text-on-surface-variant" />
            </button>

            <h3 className="text-2xl font-black text-on-surface mb-8 italic uppercase tracking-tighter">
              {editingPostId ? 'Editar' : 'Partilhar'} <span className="text-primary italic">Análise</span>
            </h3>

            <div className="space-y-6">
              {showFilter && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-2">Segmento</label>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setNewPost({ ...newPost, type: 'forex' })}
                      className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border ${newPost.type === 'forex' ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container border-outline-variant/10 text-on-surface-variant'}`}
                    >
                      Forex & Índices
                    </button>
                    <button 
                      onClick={() => setNewPost({ ...newPost, type: 'ob' })}
                      className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border ${newPost.type === 'ob' ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container border-outline-variant/10 text-on-surface-variant'}`}
                    >
                      Opções Binárias
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-2">Legenda / Insight</label>
                <textarea 
                  value={newPost.legend}
                  onChange={(e) => setNewPost({ ...newPost, legend: e.target.value })}
                  placeholder="O que você está vendo no gráfico?"
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-6 py-4 text-on-surface focus:outline-none focus:border-primary transition-all min-h-[120px] resize-none"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between pl-2">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
                    <ImageIcon size={12} />
                    Média da Análise
                  </label>
                  <span className="text-[9px] text-on-surface-variant italic opacity-60">Suporta Prints e Vídeos</span>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={newPost.imageUrl}
                      onChange={(e) => {
                        setNewPost({ ...newPost, imageUrl: e.target.value });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newPost.imageUrl) {
                            setNewPost({ ...newPost, imageUrls: [...(newPost.imageUrls || []), newPost.imageUrl], imageUrl: '' });
                          }
                        }
                      }}
                      placeholder="Colar link de imagem/vídeo e pressionar Enter ou '+'..."
                      className="flex-1 bg-surface-container-low border border-outline-variant/20 rounded-2xl px-6 py-4 text-on-surface focus:outline-none focus:border-primary transition-all text-sm"
                    />
                    <button 
                      onClick={() => {
                        if (newPost.imageUrl.trim()) {
                          setNewPost({ ...newPost, imageUrls: [...(newPost.imageUrls || []), newPost.imageUrl.trim()], imageUrl: '' });
                        }
                      }}
                      title="Adicionar Link"
                      type="button"
                      className="w-14 rounded-2xl border border-outline-variant/20 bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high flex items-center justify-center transition-all"
                    >
                      <Plus size={24} />
                    </button>
                  </div>
                  
                  {/* Links Added Preview */}
                  {newPost.imageUrls && newPost.imageUrls.length > 0 && (
                     <div className="flex flex-col gap-2 mt-2">
                        {newPost.imageUrls.map((link, idx) => (
                           <div key={idx} className="flex items-center justify-between bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-2">
                             <span className="text-xs text-on-surface-variant truncate max-w-[80%]">{link}</span>
                             <button className="text-error" onClick={() => {
                               setNewPost(p => ({ ...p, imageUrls: p.imageUrls?.filter((_, i) => i !== idx) }))
                             }}><X size={16} /></button>
                           </div>
                        ))}
                     </div>
                  )}
                </div>
                
                {/* Media Preview */}
                {(newPost.imageUrl || previewUrl) && (
                  <div className="relative rounded-3xl overflow-hidden border border-outline-variant/20 bg-black/20 animate-in zoom-in duration-300 min-h-[100px]">
                    {previewUrl ? (
                      selectedFile?.type.startsWith('video/') ? (
                        <video src={previewUrl} controls className="w-full h-auto max-h-[300px] object-contain" />
                      ) : (
                        <img src={previewUrl} alt="Preview" className="w-full h-auto max-h-[300px] object-contain" />
                      )
                    ) : (
                      (() => {
                        const link = newPost.imageUrl.toLowerCase();
                        const isVideo = link.match(/\.(mp4|webm|ogg|mov)$/) || link.includes('youtube.com') || link.includes('youtu.be') || link.includes('vimeo.com');
                        
                        if (isVideo) {
                           if (link.includes('youtube.com') || link.includes('youtu.be')) {
                             const videoId = link.includes('v=') ? link.split('v=')[1]?.split('&')[0] : link.split('/').pop();
                             return (
                               <div className="aspect-video w-full">
                                 <iframe 
                                   src={`https://www.youtube.com/embed/${videoId}`}
                                   className="w-full h-full"
                                   title="Video Preview"
                                 ></iframe>
                               </div>
                             );
                           }
                           return <video src={newPost.imageUrl} controls className="w-full h-auto max-h-[300px] object-contain" />;
                        }

                        return (
                          <img 
                            src={newPost.imageUrl} 
                            alt="Preview" 
                            className="w-full h-auto max-h-[300px] object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        );
                      })()
                    )}
                    
                    <button 
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                        setNewPost({ ...newPost, imageUrl: '' });
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="absolute top-4 right-4 w-10 h-10 rounded-full bg-error text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
                    >
                      <X size={20} />
                    </button>
                  </div>
                )}
                
                <p className="text-[9px] text-on-surface-variant italic px-2">Dica: Você pode colar um link do TradingView/YouTube/Vimeo ou qualquer link direto de imagem/vídeo.</p>
              </div>

              <button 
                onClick={handleSavePost}
                disabled={isSubmitting || !newPost.legend}
                className="w-full bg-primary text-on-primary py-5 rounded-[24px] font-black hover:scale-[1.02] transition-all shadow-2xl shadow-primary/30 uppercase tracking-[0.2em] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-3 mt-4"
              >
                {isSubmitting ? 'Publicando...' : (editingPostId ? 'Guardar Alterações' : 'Publicar Agora')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Post Modal */}
      {viewingPost && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/95 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-surface border border-outline-variant/20 rounded-[40px] max-w-2xl w-full max-h-[90vh] flex flex-col shadow-3xl overflow-hidden relative">
            <button 
              onClick={() => setViewingPost(null)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-surface-container-high transition-colors z-10"
            >
              <X size={24} className="text-on-surface-variant" />
            </button>

            <div className="p-6 md:p-8 flex items-center gap-4 border-b border-outline-variant/10">
              <img 
                src={viewingPost.userPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(viewingPost.userName)}&background=random`} 
                alt={viewingPost.userName}
                className="w-12 h-12 rounded-full object-cover border border-outline-variant/10 cursor-pointer hover:scale-105 transition-transform"
                referrerPolicy="no-referrer"
                onClick={() => {
                  setViewingPost(null);
                  handleUserClick(viewingPost.userId, viewingPost.userName, viewingPost.userPhoto || '');
                }}
              />
              <div>
                <h3 className="font-bold text-on-surface cursor-pointer hover:text-primary transition-colors" onClick={() => {
                  setViewingPost(null);
                  handleUserClick(viewingPost.userId, viewingPost.userName, viewingPost.userPhoto || '');
                }}>{viewingPost.userName}</h3>
                <p className="text-sm text-on-surface-variant flex items-center gap-2">
                  <span>{new Date(viewingPost.createdAt?.toDate ? viewingPost.createdAt.toDate() : viewingPost.createdAt).toLocaleString()}</span>
                  <span>•</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-widest ${viewingPost.type === 'forex' ? 'bg-primary/20 text-primary' : 'bg-secondary/20 text-secondary'}`}>
                    {viewingPost.type === 'forex' ? 'Forex' : 'OB'}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 scrollbar-hide">
              <p className="text-on-surface text-base md:text-lg leading-relaxed whitespace-pre-wrap">{renderTextWithMentions(viewingPost.legend)}</p>
              
              <div className="flex flex-col gap-4 w-full">
                {(viewingPost.tradeDetails || viewingPost.imageUrl) && (
                  <TradeShareCard 
                    tradeDetails={viewingPost.tradeDetails} 
                    imageUrl={viewingPost.imageUrl} 
                    userName={viewingPost.userName}
                  />
                )}
                
                {viewingPost.imageUrls?.filter(url => url !== viewingPost.imageUrl).map((mediaUrl, idx) => {
                  const link = mediaUrl.toLowerCase();
                  const isVideo = link.match(/\.(mp4|webm|ogg|mov)$/) || link.includes('youtube.com') || link.includes('youtu.be') || link.includes('vimeo.com');
                  
                  if (isVideo) {
                    if (link.includes('youtube.com') || link.includes('youtu.be')) {
                      const videoId = link.includes('v=') ? link.split('v=')[1]?.split('&')[0] : link.split('/').pop();
                      return (
                        <div key={idx} className="aspect-video w-full rounded-2xl overflow-hidden shadow-lg">
                          <iframe src={`https://www.youtube.com/embed/${videoId}`} className="w-full h-full" allowFullScreen></iframe>
                        </div>
                      );
                    }
                    return <video key={idx} src={mediaUrl} controls className="w-full h-auto rounded-3xl shadow-lg bg-black/20" />;
                  }

                  return <img key={idx} src={mediaUrl} alt={`Mídia ${idx + 1}`} className="w-full h-auto rounded-3xl shadow-lg border border-outline-variant/10 cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(mediaUrl, '_blank')} referrerPolicy="no-referrer" />;
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive User Profiles actions modal (Facebook Style layout) */}
      {selectedProfileUser && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-0 md:p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-300 select-text text-left">
          {/* Inner Card Container */}
          <div className="bg-surface border border-outline-variant/20 rounded-none md:rounded-[32px] w-full max-w-4xl h-full md:h-[92vh] flex flex-col shadow-2xl overflow-hidden relative">
            
            {/* Modal Close Button Float */}
            <button 
              onClick={() => setSelectedProfileUser(null)}
              className="absolute top-4 right-4 z-[120] p-2.5 rounded-full bg-black/40 hover:bg-black/60 text-white border border-white/10 hover:scale-105 transition-all cursor-pointer backdrop-blur-md"
              title="Fechar Perfil"
            >
              <X size={20} />
            </button>

            {/* Modal Back Button on the top-left of the modal */}
            <button 
              onClick={() => setSelectedProfileUser(null)}
              className="absolute top-4 left-4 z-[120] px-3.5 py-2 rounded-full bg-neutral-900/80 hover:bg-neutral-900 text-white border border-white/10 hover:scale-105 transition-all cursor-pointer backdrop-blur-md flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider"
              title="Voltar à Comunidade"
            >
              <ArrowLeft size={14} className="text-primary" />
              <span>Voltar à Comunidade</span>
            </button>

            {/* Main Column container */}
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col bg-surface-container-lowest animate-in slide-in-from-bottom duration-300">
              
              {/* UPPER PART: Top banner (Capa), avatar, actions, metrics */}
              <div className="bg-surface shrink-0 relative flex flex-col items-center">
                
                {/* Cover Photo: Capa */}
                <div className="w-full h-44 sm:h-64 relative bg-gradient-to-br from-indigo-950 via-slate-900 to-emerald-950 overflow-hidden border-b border-outline-variant/10">
                  {selectedUserDetailedProfile?.coverURL ? (
                    <img 
                      src={selectedUserDetailedProfile.coverURL} 
                      alt="Foto de capa" 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    // Default elegant abstract stock block
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 relative">
                      <div className="absolute inset-0 bg-neutral-905/40 mix-blend-multiply"></div>
                      <span className="text-[100px] text-primary/10 select-none font-bold uppercase tracking-tighter -translate-y-5 font-headline">C PROFIT</span>
                    </div>
                  )}
                </div>

                {/* User Profile avatar overlapping */}
                <div className="w-full max-w-3xl px-6 relative flex flex-col sm:flex-row items-center sm:items-end gap-5 -mt-16 sm:-mt-20 pb-5">
                  <div className="relative group shrink-0 w-32 h-32 sm:w-40 sm:h-40">
                    <img 
                      src={selectedUserDetailedProfile?.photoURL || selectedProfileUser.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedProfileUser.name)}&background=random`} 
                      alt={selectedProfileUser.name}
                      className="w-full h-full rounded-full object-cover border-4 border-surface shadow-2xl bg-surface"
                      referrerPolicy="no-referrer"
                    />
                    {/* If own profile: camera overlay */}
                    {selectedProfileUser.id === auth.currentUser?.uid && (
                      <label className="absolute inset-0 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                        <Camera size={24} />
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => handleUploadProfilePhoto(e, false)} 
                        />
                      </label>
                    )}
                  </div>

                  {/* Profile info text alignment */}
                  <div className="flex-1 text-center sm:text-left space-y-2 pb-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <h2 className="text-2xl sm:text-3xl font-black text-on-surface uppercase tracking-tight flex items-center justify-center sm:justify-start gap-1">
                        {selectedUserDetailedProfile?.nome || selectedProfileUser.name}
                        <Award size={20} className="text-primary fill-primary" />
                      </h2>
                    </div>
                    
                    {/* Bio display */}
                    <p className="text-xs sm:text-sm text-on-surface-variant font-medium max-w-md italic opacity-90">
                      {selectedUserDetailedProfile?.bio || "Nenhuma biografia disponível."}
                    </p>

                    {/* Followers count and brief details */}
                    <div className="flex items-center justify-center sm:justify-start gap-3 text-xs text-on-surface-variant font-medium">
                      <span className="hover:underline cursor-pointer">
                        <strong>{profileFollowersCount}</strong> seguidores
                      </span>
                      <span className="opacity-40">•</span>
                      <span className="hover:underline cursor-pointer">
                        <strong>{profileFollowingCount}</strong> a seguir
                      </span>
                    </div>
                  </div>

                  {/* Core Relationship Action Controls (Facebook Profile Style) */}
                  <div className="flex flex-wrap justify-center gap-2 shrink-0 pb-1.5 w-full sm:w-auto">
                    {selectedProfileUser.id === auth.currentUser?.uid ? (
                      /* My Profile configuration buttons */
                      <>
                        <button
                          onClick={() => {
                            setIsEditingProfileDetails(!isEditingProfileDetails);
                            setActiveProfileTab('sobre');
                          }}
                          className="py-2 px-4 rounded-xl bg-primary text-on-primary hover:opacity-90 text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                        >
                          <Edit3 size={14} />
                          Editar perfil
                        </button>
                        <button
                          onClick={() => alert("Histórias estão em fase de testes e desenvolvimento!")}
                          className="py-2 px-4 rounded-xl bg-surface-container border border-outline-variant/10 hover:bg-surface-container-high text-on-surface text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                        >
                          <Plus size={14} />
                          Adicionar à história
                        </button>
                      </>
                    ) : (
                      /* Other user viewing actions */
                      <>
                        {/* Follow Button logic */}
                        <button
                          onClick={handleToggleFollow}
                          className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer ${profileIsFollowing ? 'bg-surface-container border border-outline-variant/20 text-on-surface' : 'bg-primary text-on-primary hover:opacity-90'}`}
                        >
                          {profileIsFollowing ? (
                            <>
                              <Check size={14} />
                              A seguir
                            </>
                          ) : (
                            <>
                              <Plus size={14} />
                              Seguir
                            </>
                          )}
                        </button>

                        {/* Amigos toggle button */}
                        {friendsList.includes(selectedProfileUser.id) ? (
                          <button
                            onClick={handleToggleFriend}
                            className="py-2 px-4 rounded-xl bg-error/10 border border-error/20 hover:bg-error/25 text-error text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <UserMinus size={14} />
                            Remover Amigo
                          </button>
                        ) : outgoingRequests.some(r => r.receiverId === selectedProfileUser.id && r.status === 'pending') ? (
                          <button
                            disabled
                            className="py-2 px-4 rounded-xl bg-surface-container text-on-surface-variant/60 text-xs font-bold flex items-center gap-1.5 transition-all cursor-not-allowed"
                          >
                            <Check size={14} className="text-primary animate-pulse" />
                            Aguardando Aceitação
                          </button>
                        ) : incomingRequests.some(r => r.senderId === selectedProfileUser.id && r.status === 'pending') ? (
                          <button
                            onClick={handleToggleFriend}
                            className="py-2 px-4 rounded-xl bg-primary text-on-primary hover:opacity-95 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-primary/20"
                          >
                            <UserPlus size={14} />
                            Aceitar Pedido
                          </button>
                        ) : (
                          <button
                            onClick={handleToggleFriend}
                            className="py-2 px-4 rounded-xl bg-surface-container border border-outline-variant/10 hover:bg-surface-container-high text-on-surface text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <UserPlus size={14} />
                            Adicionar Amigo
                          </button>
                        )}

                        {/* Enviar Mensagem Button */}
                        <button
                          onClick={() => {
                            setSelectedProfileUser(null);
                            handleSendMessageToUser(selectedProfileUser.id);
                          }}
                          className="py-2 px-4 rounded-xl bg-[#00f5a0]/15 hover:bg-[#00f5a0]/25 text-[#00f5a0] text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Send size={14} />
                          Enviar Mensagem
                        </button>

                        {/* Marcar Distância toggler */}
                        <button
                          onClick={handleToggleDistance}
                          className="p-2 rounded-xl bg-surface-container border border-outline-variant/10 hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-all cursor-pointer"
                          title={distancedList.includes(selectedProfileUser.id) ? "Remover de distância" : "Ocultar publicações deste utilizador"}
                        >
                          {distancedList.includes(selectedProfileUser.id) ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Facebook Tabs Bar */}
                <div className="w-full max-w-3xl px-6 flex items-center gap-1 border-t border-outline-variant/10 text-xs font-bold text-on-surface-variant overflow-x-auto">
                  {(['tudo', 'sobre', 'amigos', 'fotos'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => {
                        setActiveProfileTab(tab);
                        if (tab !== 'sobre') setIsEditingProfileDetails(false);
                      }}
                      className={`py-4 px-4 border-b-2 capitalize tracking-wide transition-all ${activeProfileTab === tab ? 'border-primary text-primary' : 'border-transparent hover:text-on-surface'}`}
                    >
                      {tab === 'tudo' ? 'Timeline' : tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* CONTAINER WORKPLACE: Split Columns grid */}
              <div className="flex-1 w-full max-w-3xl mx-auto px-4 py-6">
                {isLoadingSelectedProfile ? (
                  <div className="py-20 flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : selectedUserDetailedProfile?.isPrivate && selectedProfileUser.id !== auth.currentUser?.uid ? (
                  /* Locked Profile Barrier */
                  <div className="py-16 px-6 text-center border border-dashed border-outline-variant/20 rounded-[32px] bg-error/5 flex flex-col items-center justify-center space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-error/10 flex items-center justify-center text-error border border-error/20">
                      <Lock size={22} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-md font-bold text-on-surface block">Este Perfil é Privado</h4>
                      <p className="text-xs text-on-surface-variant max-w-md leading-relaxed">
                        Este membro configurou a sua conta como privada.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Layout according to active tab select */
                  <div className="w-full">
                    
                    {/* TAB 1: ALL (TUDO / TIMELINE) */}
                    {activeProfileTab === 'tudo' && (
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                        
                        {/* Left Column (Details) - 2cols */}
                        <div className="md:col-span-2 space-y-6">
                          {/* Apresentação / Intro card */}
                          <div className="bg-surface border border-outline-variant/10 rounded-2xl p-4 space-y-4 shadow-sm">
                            <h3 className="font-extrabold text-sm text-on-surface uppercase tracking-wide">Apresentação</h3>
                            
                            <div className="space-y-3.5 text-xs text-on-surface-variant font-medium">
                              {selectedUserDetailedProfile?.socialLinks && selectedUserDetailedProfile.socialLinks.filter((l: any) => l.url || l.mask).map((link: any, idx: number) => {
                                let href = link.url || '#';
                                if (href !== '#' && !/^https?:\/\//i.test(href)) {
                                  href = 'https://' + href;
                                }
                                return (
                                  <div key={idx} className="flex items-center gap-2.5">
                                    <Globe size={16} className="text-[#00f5a0]/85 shrink-0" />
                                    <span>
                                      {link.platform}:{' '}
                                      <a
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[#00f5a0] hover:underline font-bold"
                                      >
                                        {link.mask || 'Ver Perfil'}
                                      </a>
                                    </span>
                                  </div>
                                );
                              })}

                              {!selectedUserDetailedProfile?.isLiveInPrivate && selectedUserDetailedProfile?.liveIn ? (
                                <div className="flex items-center gap-2.5">
                                  <MapPin size={16} className="text-on-surface-variant opacity-60" />
                                  <span>Vive em <strong className="text-on-surface">{selectedUserDetailedProfile.liveIn}</strong></span>
                                </div>
                              ): null}

                              {!selectedUserDetailedProfile?.isHomeTownPrivate && selectedUserDetailedProfile?.homeTown ? (
                                <div className="flex items-center gap-2.5">
                                  <Home size={16} className="text-on-surface-variant opacity-60" />
                                  <span>De <strong className="text-on-surface">{selectedUserDetailedProfile.homeTown}</strong></span>
                                </div>
                              ): null}

                              {!selectedUserDetailedProfile?.isBirthdayPrivate && selectedUserDetailedProfile?.birthday ? (
                                <div className="flex items-center gap-2.5">
                                  <Calendar size={16} className="text-on-surface-variant opacity-60" />
                                  <span>Faz anos a <strong className="text-on-surface">{selectedUserDetailedProfile.birthday}</strong></span>
                                </div>
                              ): null}

                              {!selectedUserDetailedProfile?.isPhoneNumberPrivate && selectedUserDetailedProfile?.phoneNumber ? (
                                <div className="flex items-center gap-2.5">
                                  <Smartphone size={16} className="text-on-surface-variant opacity-60" />
                                  <span>Telemóvel: <strong className="text-on-surface">{selectedUserDetailedProfile.phoneNumber}</strong></span>
                                </div>
                              ): null}

                              {!selectedUserDetailedProfile?.isEmailPrivate && selectedUserDetailedProfile?.email ? (
                                <div className="flex items-center gap-2.5">
                                  <Mail size={16} className="text-on-surface-variant opacity-60" />
                                  <span className="truncate">E-mail: <strong className="text-on-surface">{selectedUserDetailedProfile.email}</strong></span>
                                </div>
                              ): null}
                            </div>

                            {/* If own profile, offer toggle button directly */}
                            {selectedProfileUser.id === auth.currentUser?.uid && (
                              <button
                                onClick={() => {
                                  setIsEditingProfileDetails(true);
                                  setActiveProfileTab('sobre');
                                }}
                                className="w-full text-center py-2 bg-surface-container active:scale-95 transition-all rounded-xl border border-outline-variant/10 hover:bg-surface-container-high text-xs font-bold text-on-surface-variant"
                              >
                                Editar detalhes
                              </button>
                            )}
                          </div>

                          {/* Destaque de fotos (Featured collage block) */}
                          <div className="bg-surface border border-outline-variant/10 rounded-2xl p-4 space-y-3 shadow-sm">
                            <div className="flex items-center justify-between">
                              <h3 className="font-extrabold text-sm text-on-surface uppercase tracking-wide">Fotos em Destaque</h3>
                              <button onClick={() => setActiveProfileTab('fotos')} className="text-xs text-primary font-bold hover:underline">Ver todas</button>
                            </div>

                            {selectedUserPosts.filter(p => !!p.imageUrl).length === 0 ? (
                              <div className="py-6 text-center text-[11px] text-on-surface-variant opacity-60 border border-dashed border-outline-variant/10 rounded-xl">
                                Nenhuma fotografia publicada.
                              </div>
                            ) : (
                              <div className="grid grid-cols-3 gap-1.5 rounded-xl overflow-hidden">
                                {selectedUserPosts.filter(p => !!p.imageUrl).slice(0, 9).map((post, index) => (
                                  <div 
                                    key={index}
                                    onClick={() => {
                                      setViewingPost(post);
                                    }}
                                    className="aspect-square bg-surface-container-high relative overflow-hidden group cursor-pointer"
                                  >
                                    <img src={post.imageUrl} alt="Highlights" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" referrerPolicy="no-referrer" />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Amigos card (collaboration gallery block) */}
                          <div className="bg-surface border border-outline-variant/10 rounded-2xl p-4 space-y-3 shadow-sm">
                            <div className="flex items-center justify-between">
                              <h3 className="font-extrabold text-sm text-on-surface uppercase tracking-wide">
                                {selectedProfileUser.id === auth.currentUser?.uid ? 'Meus Amigos' : `Amigos de ${selectedUserDetailedProfile?.nome || selectedProfileUser.name}`}
                              </h3>
                              <button onClick={() => setActiveProfileTab('amigos')} className="text-xs text-primary font-bold hover:underline">Ver todos</button>
                            </div>

                            {(() => {
                              const isOwnProfile = selectedProfileUser.id === auth.currentUser?.uid;
                              
                              if (isOwnProfile) {
                                const myFriends = allCommunityUsers.filter(u => u.id !== selectedProfileUser.id && friendsList.includes(u.id));
                                if (myFriends.length === 0) {
                                  return (
                                    <div className="py-6 text-center text-[11px] text-on-surface-variant opacity-60 border border-dashed border-outline-variant/10 rounded-xl px-2">
                                      Nenhum amigo adicionado ainda. Adicione investidores no separador "Amigos"!
                                    </div>
                                  );
                                }
                                return (
                                  <div className="grid grid-cols-3 gap-x-2 gap-y-3">
                                    {myFriends.slice(0, 6).map((userItem, index) => (
                                      <div 
                                        key={index} 
                                        onClick={() => {
                                          setSelectedProfileUser({
                                            id: userItem.id,
                                            name: userItem.nome || userItem.username || 'Membro C Profit',
                                            photo: userItem.photoURL || ''
                                          });
                                        }}
                                        className="flex flex-col items-center gap-1 cursor-pointer group"
                                      >
                                        <img 
                                          src={userItem.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userItem.nome || userItem.username || 'U')}&background=random`} 
                                          alt={userItem.nome}
                                          className="w-14 h-14 rounded-xl object-cover group-hover:opacity-85 transition-opacity bg-black/10"
                                          referrerPolicy="no-referrer"
                                        />
                                        <span className="text-[10px] text-on-surface font-semibold max-w-full truncate text-center leading-normal">
                                          {(userItem.nome || userItem.username || '').split(' ')[0]}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                );
                              } else {
                                const isFriend = friendsList.includes(selectedProfileUser.id);
                                return (
                                  <div className="py-4 px-3 text-center border border-dashed border-outline-variant/10 rounded-xl bg-surface-container/20 space-y-2">
                                    <p className="text-[11px] text-on-surface-variant/85 leading-relaxed">
                                      Por motivos de privacidade, a lista de amigos de {selectedProfileUser.name} é restrita.
                                    </p>
                                    {isFriend ? (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#00f5a0]/10 text-[#00f5a0] text-[10px] font-bold">
                                        <Check className="text-[12px]" />
                                        Você e {selectedProfileUser.name.split(' ')[0]} são amigos
                                      </span>
                                    ) : (
                                      <button
                                        onClick={async () => {
                                          const incoming = incomingRequests.find(r => r.senderId === selectedProfileUser.id);
                                          const outgoing = outgoingRequests.find(r => r.receiverId === selectedProfileUser.id);
                                          if (incoming) {
                                            await handleAcceptFriendRequest(incoming);
                                          } else if (!outgoing) {
                                            await sendFriendRequest(selectedProfileUser.id, selectedProfileUser.name, selectedProfileUser.photo);
                                          }
                                        }}
                                        className="text-[10px] bg-primary text-on-primary font-bold px-3 py-1 rounded-lg hover:opacity-90 active:scale-95 transition-all text-center mx-auto block"
                                      >
                                        {outgoingRequests.some(r => r.receiverId === selectedProfileUser.id && r.status === 'pending') ? 'Pedido Enviado' : 'Adicionar Amigo'}
                                      </button>
                                    )}
                                  </div>
                                );
                              }
                            })()}
                          </div>
                        </div>

                        {/* Right Column (Timeline feed stacked) - 3cols */}
                        <div className="md:col-span-3 space-y-5">
                          
                          {/* Prompt input placeholder */}
                          {selectedProfileUser.id === auth.currentUser?.uid && (
                            <div className="bg-surface border border-outline-variant/10 rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
                              <div className="flex gap-3 items-center">
                                <img 
                                  src={auth.currentUser?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedProfileUser.name)}&background=random`} 
                                  alt="avatar"
                                  className="w-9 h-9 rounded-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                                <button 
                                  onClick={() => {
                                    setSelectedProfileUser(null);
                                    setIsCreateModalOpen(true);
                                  }}
                                  className="flex-1 bg-surface-container-low text-left px-4 py-2.5 text-xs md:text-sm text-on-surface-variant hover:bg-surface-container-high rounded-full opacity-85 hover:opacity-100 transition-all cursor-pointer border border-outline-variant/5"
                                >
                                  O que está a pensar hoje, {auth.currentUser?.displayName || selectedProfileUser.name}?
                                </button>
                              </div>
                              <div className="border-t border-outline-variant/10 pt-2 flex justify-around text-xs text-on-surface-variant font-bold">
                                <button 
                                  onClick={() => { setSelectedProfileUser(null); setIsCreateModalOpen(true); }}
                                  className="p-1.5 flex items-center gap-1.5 hover:bg-surface-container rounded-lg"
                                >
                                  <ImageIcon size={16} className="text-emerald-500" />
                                  Foto/Vídeo
                                </button>
                                <button 
                                  onClick={() => { setSelectedProfileUser(null); setIsCreateModalOpen(true); }}
                                  className="p-1.5 flex items-center gap-1.5 hover:bg-surface-container rounded-lg"
                                >
                                  <Award size={16} className="text-amber-500" />
                                  Trade Destaque
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Timeline Feed posts list, ONE below the other */}
                          <div className="space-y-4">
                            {selectedUserPosts.length === 0 ? (
                              <div className="bg-surface border border-outline-variant/10 rounded-2xl py-12 text-center text-xs text-on-surface-variant">
                                Nenhuma publicação no feed.
                              </div>
                            ) : (
                              selectedUserPosts.map(post => {
                                const isAdmin = userPlan === 'admin';
                                return (
                                  <ProfilePostCard 
                                    key={post.id} 
                                    post={post}
                                    onLike={handleLikeProfilePost}
                                    onSelectPhoto={setViewingPost}
                                    isAdmin={isAdmin}
                                    onDeletePost={handleDeletePost}
                                  />
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 2: OVER / SOBRE (Editar or ver introdução) */}
                    {activeProfileTab === 'sobre' && (
                      <div className="bg-surface border border-outline-variant/10 rounded-2xl p-6 text-left space-y-6 shadow-sm">
                        <div className="flex items-center justify-between border-b border-outline-variant/10 pb-3">
                          <h3 className="font-extrabold text-md text-on-surface tracking-wide">
                            {isEditingProfileDetails ? 'Editar Informações Públicas' : 'Acerca de'}
                          </h3>
                        </div>

                        {isEditingProfileDetails ? (
                          /* Edit Form fields */
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-xs text-on-surface-variant font-bold uppercase">Nome Completo</label>
                                <input 
                                  type="text" 
                                  className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-primary text-on-surface"
                                  value={editFormFields.nome}
                                  onChange={(e) => setEditFormFields({ ...editFormFields, nome: e.target.value })}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs text-on-surface-variant font-bold uppercase">Telemóvel</label>
                                <input 
                                  type="text" 
                                  className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-primary text-on-surface"
                                  value={editFormFields.phoneNumber}
                                  onChange={(e) => setEditFormFields({ ...editFormFields, phoneNumber: e.target.value })}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs text-on-surface-variant font-bold uppercase">E-mail Comercial</label>
                                <input 
                                  type="email" 
                                  className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-primary text-on-surface"
                                  value={editFormFields.email}
                                  onChange={(e) => setEditFormFields({ ...editFormFields, email: e.target.value })}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs text-on-surface-variant font-bold uppercase">Aniversário</label>
                                <input 
                                  type="text" 
                                  placeholder="Ex: 8 de agosto de 1998"
                                  className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-primary text-on-surface"
                                  value={editFormFields.birthday}
                                  onChange={(e) => setEditFormFields({ ...editFormFields, birthday: e.target.value })}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs text-on-surface-variant font-bold uppercase">Vive em (Cidade)</label>
                                <input 
                                  type="text" 
                                  placeholder="Ex: Luanda, Angola"
                                  className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-primary text-on-surface"
                                  value={editFormFields.liveIn}
                                  onChange={(e) => setEditFormFields({ ...editFormFields, liveIn: e.target.value })}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs text-on-surface-variant font-bold uppercase">De (Cidade Natal)</label>
                                <input 
                                  type="text" 
                                  placeholder="Ex: Huambo"
                                  className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-primary text-on-surface"
                                  value={editFormFields.homeTown}
                                  onChange={(e) => setEditFormFields({ ...editFormFields, homeTown: e.target.value })}
                                />
                              </div>
                              {/* REDES SOCIAIS DYNAMIC AREA */}
                              <div className="col-span-1 sm:col-span-2 bg-surface-container/20 border border-outline-variant/10 rounded-2xl p-4 space-y-4">
                                <div className="flex items-center justify-between border-b border-outline-variant/10 pb-2">
                                  <div>
                                    <h4 className="text-xs font-black uppercase text-[#00f5a0]">Redes Sociais</h4>
                                    <p className="text-[10px] text-on-surface-variant">Configure até 3 links para apresentar aos outros traders</p>
                                  </div>
                                  {(editFormFields.socialLinks || []).length < 3 && (
                                    <button
                                      type="button"
                                      onClick={handleAddSocialLink}
                                      className="py-1 px-3 bg-[#00f5a0]/10 hover:bg-[#00f5a0]/20 text-[#00f5a0] rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                                    >
                                      <span>+ Adicionar</span>
                                    </button>
                                  )}
                                </div>
                                
                                <div className="space-y-4">
                                  {(editFormFields.socialLinks || []).map((link, idx) => (
                                    <div key={idx} className="bg-surface-container/50 p-3 rounded-xl border border-outline-variant/10 space-y-3 relative group">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Rede Social #{idx + 1}</span>
                                        {(editFormFields.socialLinks || []).length > 1 && (
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveSocialLink(idx)}
                                            className="text-red-400 hover:text-red-500 text-[10px] font-bold uppercase transition-colors px-1 cursor-pointer"
                                          >
                                            Remover
                                          </button>
                                        )}
                                      </div>
                                      
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                        {/* Plataforma */}
                                        <div className="space-y-1">
                                          <label className="text-[10px] text-on-surface-variant font-bold uppercase block pl-1">Plataforma</label>
                                          <select
                                            value={link.platform}
                                            onChange={(e) => handleSocialLinkChange(idx, 'platform', e.target.value)}
                                            className="w-full bg-surface-container-high border border-outline-variant/20 rounded-lg px-2.5 py-2 text-xs text-on-surface focus:outline-none focus:border-[#00f5a0]"
                                          >
                                            <option value="Instagram">Instagram</option>
                                            <option value="Facebook">Facebook</option>
                                            <option value="TikTok">TikTok</option>
                                            <option value="Canal YouTube">Canal YouTube</option>
                                            <option value="Outros">Outros</option>
                                          </select>
                                        </div>

                                        {/* Máscara / Nome da Conta */}
                                        <div className="space-y-1">
                                          <label className="text-[10px] text-on-surface-variant font-bold uppercase block pl-1">Nome da Conta / Máscara</label>
                                          <input
                                            type="text"
                                            placeholder="Ex: @meu_instagram"
                                            value={link.mask}
                                            onChange={(e) => handleSocialLinkChange(idx, 'mask', e.target.value)}
                                            className="w-full bg-surface-container-high border border-outline-variant/20 rounded-lg px-2.5 py-2 text-xs text-on-surface focus:outline-none focus:border-[#00f5a0]"
                                          />
                                        </div>

                                        {/* Link URL */}
                                        <div className="space-y-1">
                                          <label className="text-[10px] text-on-surface-variant font-bold uppercase block pl-1">Link de Perfil / URL</label>
                                          <input
                                            type="text"
                                            placeholder="Ex: https://instagram.com/user"
                                            value={link.url}
                                            onChange={(e) => handleSocialLinkChange(idx, 'url', e.target.value)}
                                            className="w-full bg-surface-container-high border border-outline-variant/20 rounded-lg px-2.5 py-2 text-xs text-on-surface focus:outline-none focus:border-[#00f5a0]"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs text-on-surface-variant font-bold uppercase">Formação (Escola)</label>
                                <input 
                                  type="text" 
                                  placeholder="Ex: Universidade"
                                  className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-primary text-on-surface"
                                  value={editFormFields.school}
                                  onChange={(e) => setEditFormFields({ ...editFormFields, school: e.target.value })}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs text-on-surface-variant font-bold uppercase">Relacionamento</label>
                                <select 
                                  className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-primary text-on-surface"
                                  value={editFormFields.relationship}
                                  onChange={(e) => setEditFormFields({ ...editFormFields, relationship: e.target.value })}
                                >
                                  <option value="Solteiro">Solteiro</option>
                                  <option value="Num relacionamento">Num relacionamento</option>
                                  <option value="Noivado">Noivado</option>
                                  <option value="Casado(a)">Casado(a)</option>
                                  <option value="Complicado">Complicado</option>
                                </select>
                              </div>
                            </div>

                            <div className="space-y-1 mt-2">
                              <label className="text-xs text-on-surface-variant font-bold uppercase">Biografia</label>
                              <textarea 
                                className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-primary h-20 resize-none text-on-surface"
                                value={editFormFields.bio}
                                onChange={(e) => setEditFormFields({ ...editFormFields, bio: e.target.value })}
                              />
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-surface-container/30 rounded-xl border border-outline-variant/10">
                              <input 
                                type="checkbox" 
                                id="make-private"
                                checked={editFormFields.isPrivate}
                                onChange={(e) => setEditFormFields({ ...editFormFields, isPrivate: e.target.checked })}
                                className="scale-110 accent-primary"
                              />
                              <label htmlFor="make-private" className="text-xs text-on-surface cursor-pointer font-bold">
                                Bloquear Perfil (Tonar Perfil Privado)
                              </label>
                            </div>

                            <div className="flex gap-2 justify-end pt-4">
                              <button
                                onClick={() => setIsEditingProfileDetails(false)}
                                className="px-4 py-2 bg-surface text-on-surface border border-outline-variant/20 text-xs font-bold rounded-xl hover:bg-surface-container cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={handleSaveProfileEdits}
                                disabled={isSavingProfileEdits}
                                className="px-5 py-2 bg-primary text-on-primary text-xs font-bold rounded-xl hover:opacity-90 disabled:opacity-50 cursor-pointer"
                              >
                                {isSavingProfileEdits ? 'A Guardar...' : 'Salvar Alterações'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Read profile details */
                          <div className="space-y-6 text-xs text-on-surface-variant font-medium">
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-2">
                              <div className="space-y-4">
                                <h4 className="text-xs font-extrabold uppercase tracking-wide text-primary">Informações Básicas</h4>
                                <ul className="space-y-3.5">
                                  <li className="flex items-start gap-3">
                                    <User className="text-on-surface-variant opacity-60 w-4 h-4" />
                                    <div>
                                      <span className="text-on-surface font-semibold block">{selectedUserDetailedProfile?.nome || selectedProfileUser.name}</span>
                                      <span className="text-[10px] text-on-surface-variant">Nome de utilizador</span>
                                    </div>
                                  </li>
                                  {!selectedUserDetailedProfile?.isBirthdayPrivate && selectedUserDetailedProfile?.birthday && (
                                    <li className="flex items-start gap-3">
                                      <Calendar className="text-on-surface-variant opacity-60 w-4 h-4" />
                                      <div>
                                        <span className="text-on-surface font-semibold block">{selectedUserDetailedProfile.birthday}</span>
                                        <span className="text-[10px] text-on-surface-variant">Aniversário</span>
                                      </div>
                                    </li>
                                  )}
                                </ul>
                              </div>

                              <div className="space-y-4">
                                <h4 className="text-xs font-extrabold uppercase tracking-wide text-primary">Lugares</h4>
                                <ul className="space-y-3.5">
                                  {!selectedUserDetailedProfile?.isLiveInPrivate && selectedUserDetailedProfile?.liveIn && (
                                    <li className="flex items-start gap-3">
                                      <MapPin className="text-on-surface-variant opacity-60 w-4 h-4" />
                                      <div>
                                        <span className="text-on-surface font-semibold block">{selectedUserDetailedProfile.liveIn}</span>
                                        <span className="text-[10px] text-on-surface-variant">Cidade actual</span>
                                      </div>
                                    </li>
                                  )}
                                  {!selectedUserDetailedProfile?.isHomeTownPrivate && selectedUserDetailedProfile?.homeTown && (
                                    <li className="flex items-start gap-3">
                                      <Home className="text-on-surface-variant opacity-60 w-4 h-4" />
                                      <div>
                                        <span className="text-on-surface font-semibold block">{selectedUserDetailedProfile.homeTown}</span>
                                        <span className="text-[10px] text-on-surface-variant">Cidade natal</span>
                                      </div>
                                    </li>
                                  )}
                                </ul>
                              </div>
                            </div>

                            <div className="border-t border-outline-variant/10 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <h4 className="text-xs font-extrabold uppercase tracking-wide text-primary">Redes Sociais</h4>
                                <ul className="space-y-3.5">
                                  {selectedUserDetailedProfile?.socialLinks && selectedUserDetailedProfile.socialLinks.filter((l: any) => l.url || l.mask).length > 0 ? (
                                    selectedUserDetailedProfile.socialLinks.map((link: any, idx: number) => {
                                      if (!link.url && !link.mask) return null;
                                      let href = link.url || '#';
                                      if (href !== '#' && !/^https?:\/\//i.test(href)) {
                                        href = 'https://' + href;
                                      }
                                      return (
                                        <li key={idx} className="flex items-start gap-3">
                                          <div className="p-1.5 bg-[#00f5a0]/10 rounded-lg text-[#00f5a0] flex items-center justify-center shrink-0 mt-0.5">
                                            <Globe size={12} />
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <span className="text-[9px] text-[#00f5a0] uppercase tracking-wider font-black block">
                                              {link.platform || 'Link'}
                                            </span>
                                            <a
                                              href={href}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-white hover:text-[#00f5a0] hover:underline font-bold transition-all text-xs break-all block"
                                            >
                                              {link.mask || link.url || 'Aceder'}
                                            </a>
                                          </div>
                                        </li>
                                      );
                                    })
                                  ) : (
                                    <li className="text-[10.5px] italic text-on-surface-variant/50">Nenhuma rede social configurada</li>
                                  )}
                                </ul>
                              </div>

                              <div className="space-y-4">
                                <h4 className="text-xs font-extrabold uppercase tracking-wide text-primary">Contactos</h4>
                                <ul className="space-y-3.5">
                                  {!selectedUserDetailedProfile?.isPhoneNumberPrivate && selectedUserDetailedProfile?.phoneNumber && (
                                    <li className="flex items-start gap-3">
                                      <Smartphone className="text-on-surface-variant opacity-60 w-4 h-4" />
                                      <div>
                                        <span className="text-on-surface font-semibold block">{selectedUserDetailedProfile.phoneNumber}</span>
                                        <span className="text-[10px] text-on-surface-variant">Número de contacto</span>
                                      </div>
                                    </li>
                                  )}
                                  {!selectedUserDetailedProfile?.isEmailPrivate && selectedUserDetailedProfile?.email ? (
                                    <li className="flex items-start gap-3">
                                      <Mail className="text-on-surface-variant opacity-60 w-4 h-4" />
                                      <div>
                                        <span className="text-on-surface font-semibold block truncate">{selectedUserDetailedProfile.email}</span>
                                        <span className="text-[10px] text-on-surface-variant">Endereço de e-mail</span>
                                      </div>
                                    </li>
                                  ) : null}
                                </ul>
                              </div>
                            </div>

                            {/* If own, click can edit */}
                            {selectedProfileUser.id === auth.currentUser?.uid && (
                              <div className="pt-6 text-right">
                                <button
                                  onClick={() => setIsEditingProfileDetails(true)}
                                  className="py-2.5 px-5 bg-surface-container active:scale-95 transition-all rounded-xl border border-outline-variant/10 hover:bg-surface-container-high text-xs font-bold text-on-surface cursor-pointer"
                                >
                                  Editar perfil completo
                                </button>
                              </div>
                            )}

                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 3: FRIENDS / AMIGOS List Grid */}
                    {activeProfileTab === 'amigos' && (
                      <div className="bg-surface border border-outline-variant/10 rounded-2xl p-6 text-left space-y-8 shadow-sm">
                        {(() => {
                          const isOwnProfile = selectedProfileUser.id === auth.currentUser?.uid;

                          if (isOwnProfile) {
                            return (
                              <>
                                {/* Section 1: Amigos */}
                                <div className="space-y-4">
                                  <h3 className="font-extrabold text-md text-on-surface tracking-wide flex items-center gap-2">
                                    <Users size={18} className="text-primary" />
                                    Amigos já adicionados
                                  </h3>
                                  
                                  {allCommunityUsers.filter(u => u.id !== selectedProfileUser.id && friendsList.includes(u.id)).length === 0 ? (
                                    <div className="py-8 border border-dashed border-outline-variant/10 rounded-xl text-center text-xs text-on-surface-variant opacity-70">
                                      Nenhum amigo adicionado ainda. Adicione membros abaixo para os tornar seus amigos!
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      {allCommunityUsers.filter(u => u.id !== selectedProfileUser.id && friendsList.includes(u.id)).map((friendUser) => (
                                        <div 
                                          key={friendUser.id}
                                          className="flex items-center gap-3 p-3 bg-surface-container/30 border border-outline-variant/10 rounded-xl hover:border-primary/20 hover:bg-surface-container/50 transition-all group"
                                        >
                                          <img 
                                            src={friendUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(friendUser.nome || friendUser.username || 'F')}&background=random`} 
                                            alt={friendUser.nome}
                                            className="w-12 h-12 rounded-xl object-cover shrink-0 bg-black/10 cursor-pointer"
                                            referrerPolicy="no-referrer"
                                            onClick={() => {
                                              setSelectedProfileUser({
                                                id: friendUser.id,
                                                name: friendUser.nome || friendUser.username || 'Membro C Profit',
                                                photo: friendUser.photoURL || ''
                                              });
                                            }}
                                          />
                                          <div 
                                            className="flex-1 min-w-0 cursor-pointer"
                                            onClick={() => {
                                              setSelectedProfileUser({
                                                id: friendUser.id,
                                                name: friendUser.nome || friendUser.username || 'Membro C Profit',
                                                photo: friendUser.photoURL || ''
                                              });
                                            }}
                                          >
                                            <h4 className="text-xs font-bold text-on-surface truncate group-hover:underline">{friendUser.nome || friendUser.username}</h4>
                                            <span className="text-[10px] text-[#00f5a0] font-semibold block truncate">Amigo</span>
                                          </div>
                                          <button
                                            onClick={async (e) => {
                                              e.stopPropagation();
                                              if (!auth.currentUser) return;
                                              const friendRef = doc(db, 'users', auth.currentUser.uid, 'friends', friendUser.id);
                                              try {
                                                await deleteDoc(friendRef);
                                                // Also delete any existing mutual requests
                                                const qReq = query(
                                                  collection(db, 'friend_requests'),
                                                  where('senderId', 'in', [auth.currentUser.uid, friendUser.id]),
                                                  where('receiverId', 'in', [auth.currentUser.uid, friendUser.id])
                                                );
                                                const reqSnap = await getDocs(qReq);
                                                for (const d of reqSnap.docs) {
                                                  await deleteDoc(doc(db, 'friend_requests', d.id));
                                                }
                                              } catch (err) { }
                                            }}
                                            className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors cursor-pointer"
                                            title="Remover Amigo"
                                          >
                                            <UserMinus size={16} />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Section 2: Outros Investidores da Comunidade */}
                                <div className="space-y-4 pt-4 border-t border-outline-variant/10">
                                  <h3 className="font-extrabold text-md text-on-surface tracking-wide flex items-center gap-2">
                                    <Globe size={18} className="text-[#00f5a0]" />
                                    Outros Investidores da Comunidade
                                  </h3>
                                  <p className="text-xs text-on-surface-variant max-w-lg mb-2">
                                    Conecte-se com novos traders da comunidade enviando um pedido de amizade.
                                  </p>
                                  
                                  {allCommunityUsers.filter(u => u.id !== selectedProfileUser.id && !friendsList.includes(u.id)).length === 0 ? (
                                    <div className="py-8 border border-dashed border-outline-variant/10 rounded-xl text-center text-xs text-on-surface-variant opacity-70">
                                      Nenhum outro membro disponível de momento.
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      {allCommunityUsers.filter(u => u.id !== selectedProfileUser.id && !friendsList.includes(u.id)).map((friendUser) => (
                                        <div 
                                          key={friendUser.id}
                                          className="flex items-center gap-3 p-3 bg-surface-container/30 border border-outline-variant/10 rounded-xl hover:border-primary/20 hover:bg-surface-container/50 transition-all group"
                                        >
                                          <img 
                                            src={friendUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(friendUser.nome || friendUser.username || 'F')}&background=random`} 
                                            alt={friendUser.nome}
                                            className="w-12 h-12 rounded-xl object-cover shrink-0 bg-black/10 cursor-pointer"
                                            referrerPolicy="no-referrer"
                                            onClick={() => {
                                              setSelectedProfileUser({
                                                id: friendUser.id,
                                                name: friendUser.nome || friendUser.username || 'Membro C Profit',
                                                photo: friendUser.photoURL || ''
                                              });
                                            }}
                                          />
                                          <div 
                                            className="flex-1 min-w-0 cursor-pointer"
                                            onClick={() => {
                                              setSelectedProfileUser({
                                                id: friendUser.id,
                                                name: friendUser.nome || friendUser.username || 'Membro C Profit',
                                                photo: friendUser.photoURL || ''
                                              });
                                            }}
                                          >
                                            <h4 className="text-xs font-bold text-on-surface truncate group-hover:underline">{friendUser.nome || friendUser.username}</h4>
                                            <span className="text-[10px] text-on-surface-variant block truncate">Investidor Registado</span>
                                          </div>
                                          {outgoingRequests.some(r => r.receiverId === friendUser.id && r.status === 'pending') ? (
                                            <span className="text-[10px] font-bold text-on-surface-variant/60 bg-surface-container px-2 py-1 rounded-lg">Enviado</span>
                                          ) : incomingRequests.some(r => r.senderId === friendUser.id && r.status === 'pending') ? (
                                            <button
                                              onClick={async (e) => {
                                                e.stopPropagation();
                                                const req = incomingRequests.find(r => r.senderId === friendUser.id && r.status === 'pending');
                                                if (req) await handleAcceptFriendRequest(req);
                                              }}
                                              className="p-1 px-2.5 bg-primary text-on-primary rounded-lg text-[10px] font-black hover:opacity-90 cursor-pointer transition-colors"
                                            >
                                              Aceitar
                                            </button>
                                          ) : (
                                            <button
                                              onClick={async (e) => {
                                                e.stopPropagation();
                                                await sendFriendRequest(friendUser.id, friendUser.nome || friendUser.username || '', friendUser.photoURL || '');
                                              }}
                                              className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                                              title="Adicionar Amigo"
                                            >
                                              <UserPlus size={16} />
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </>
                            );
                          } else {
                            const isFriend = friendsList.includes(selectedProfileUser.id);
                            return (
                              <div className="space-y-6">
                                <div className="p-6 border border-dashed border-outline-variant/15 rounded-2xl bg-surface-container/20 text-center max-w-xl mx-auto space-y-4">
                                  <Users size={48} className="text-primary mx-auto opacity-70" />
                                  <div className="space-y-1">
                                    <h4 className="font-bold text-on-surface text-sm">Privacidade de Amizades</h4>
                                    <p className="text-xs text-on-surface-variant leading-relaxed">
                                      Por motivos de segurança e integridade das contas do C Profit, a lista completa de amigos de {selectedProfileUser.name} é privada.
                                    </p>
                                  </div>

                                  {isFriend ? (
                                    <div className="pt-2">
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#00f5a0]/10 text-[#00f5a0] text-xs font-bold shadow-sm">
                                        <Check className="text-[14px]" />
                                        Você e {selectedProfileUser.name} são amigos
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="pt-2">
                                      <button
                                        onClick={async () => {
                                          const incoming = incomingRequests.find(r => r.senderId === selectedProfileUser.id);
                                          const outgoing = outgoingRequests.find(r => r.receiverId === selectedProfileUser.id);
                                          if (incoming) {
                                            await handleAcceptFriendRequest(incoming);
                                          } else if (!outgoing) {
                                            await sendFriendRequest(selectedProfileUser.id, selectedProfileUser.name, selectedProfileUser.photo);
                                          }
                                        }}
                                        className="text-xs bg-primary text-on-primary font-bold px-4 py-2 rounded-xl hover:opacity-90 active:scale-95 transition-all inline-flex items-center gap-2"
                                      >
                                        <UserPlus size={14} />
                                        {outgoingRequests.some(r => r.receiverId === selectedProfileUser.id && r.status === 'pending') ? 'Pedido de Amizade Enviado' : 'Adicionar como Amigo'}
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {/* List of other traders they can add */}
                                <div className="space-y-4 pt-6 border-t border-outline-variant/10">
                                  <h3 className="font-extrabold text-sm text-on-surface tracking-wide flex items-center gap-2">
                                    <Globe size={16} className="text-primary" />
                                    Mais Investidores Recomendados
                                  </h3>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {allCommunityUsers.filter(u => u.id !== selectedProfileUser.id && u.id !== auth.currentUser?.uid && !friendsList.includes(u.id)).map((friendUser) => (
                                      <div 
                                        key={friendUser.id}
                                        className="flex items-center gap-3 p-3 bg-surface-container/30 border border-outline-variant/10 rounded-xl hover:border-primary/20 hover:bg-surface-container/50 transition-all group"
                                      >
                                        <img 
                                          src={friendUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(friendUser.nome || friendUser.username || 'F')}&background=random`} 
                                          alt={friendUser.nome}
                                          className="w-12 h-12 rounded-xl object-cover shrink-0 bg-black/10 cursor-pointer"
                                          referrerPolicy="no-referrer"
                                          onClick={() => {
                                            setSelectedProfileUser({
                                              id: friendUser.id,
                                              name: friendUser.nome || friendUser.username || 'Membro C Profit',
                                              photo: friendUser.photoURL || ''
                                            });
                                          }}
                                        />
                                        <div 
                                          className="flex-1 min-w-0 cursor-pointer"
                                          onClick={() => {
                                            setSelectedProfileUser({
                                              id: friendUser.id,
                                              name: friendUser.nome || friendUser.username || 'Membro C Profit',
                                              photo: friendUser.photoURL || ''
                                            });
                                          }}
                                        >
                                          <h4 className="text-xs font-bold text-on-surface truncate group-hover:underline">{friendUser.nome || friendUser.username}</h4>
                                          <span className="text-[10px] text-on-surface-variant block truncate">Investidor Registado</span>
                                        </div>
                                        {outgoingRequests.some(r => r.receiverId === friendUser.id && r.status === 'pending') ? (
                                          <span className="text-[10px] font-bold text-on-surface-variant/60 bg-surface-container px-2 py-1 rounded-lg">Enviado</span>
                                        ) : incomingRequests.some(r => r.senderId === friendUser.id && r.status === 'pending') ? (
                                          <button
                                            onClick={async (e) => {
                                              e.stopPropagation();
                                              const req = incomingRequests.find(r => r.senderId === friendUser.id && r.status === 'pending');
                                              if (req) await handleAcceptFriendRequest(req);
                                            }}
                                            className="p-1 px-2.5 bg-primary text-on-primary rounded-lg text-[10px] font-black hover:opacity-90 cursor-pointer transition-colors"
                                          >
                                            Aceitar
                                          </button>
                                        ) : (
                                          <button
                                            onClick={async (e) => {
                                              e.stopPropagation();
                                              await sendFriendRequest(friendUser.id, friendUser.nome || friendUser.username || '', friendUser.photoURL || '');
                                            }}
                                            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                                            title="Adicionar Amigo"
                                          >
                                            <UserPlus size={16} />
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            );
                          }
                        })()}
                      </div>
                    )}

                    {/* TAB 4: PHOTOS / FOTOS Collage Grid */}
                    {activeProfileTab === 'fotos' && (
                      <div className="bg-surface border border-outline-variant/10 rounded-2xl p-6 text-left space-y-4 shadow-sm">
                        <h3 className="font-extrabold text-md text-on-surface tracking-wide">Fotos Publicadas</h3>

                        {selectedUserPosts.filter(p => !!p.imageUrl).length === 0 ? (
                          <div className="py-12 border border-dashed border-outline-variant/10 rounded-xl text-center text-xs text-on-surface-variant opacity-70">
                            Nenhuma fotografia publicada na comunidade.
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {selectedUserPosts.filter(p => !!p.imageUrl).map((post, idx) => (
                              <div 
                                key={idx}
                                onClick={() => setViewingPost(post)}
                                className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group hover:opacity-90 border border-outline-variant/10"
                              >
                                <img src={post.imageUrl} alt="Past Upload item" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300 pointer-events-none" referrerPolicy="no-referrer" />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3 text-white text-[10px] font-bold">
                                  Ver publicação
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      )}
      <Modal {...modalConfig} />
    </div>
  );
}

interface ProfilePostCardProps {
  key?: any;
  post: Post;
  onLike: (post: Post) => void;
  onSelectPhoto: (post: Post) => void;
  isAdmin: boolean;
  onDeletePost: (postId: string) => void;
}

function ProfilePostCard({ post, onLike, onSelectPhoto, isAdmin, onDeletePost }: ProfilePostCardProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(false);

  useEffect(() => {
    if (!showComments) return;

    const commentsQuery = query(
      collection(db, 'community_posts', post.id, 'comments'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const fetchedComments = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setComments(fetchedComments);
    }, (err) => console.warn('Post comments snapshot error:', err));

    return () => unsubscribe();
  }, [showComments, post.id]);

  const handleAddCommentLocal = async () => {
    if (!newCommentText.trim() || !auth.currentUser) return;
    setIsSubmittingComment(true);
    try {
      const commentsColRef = collection(db, 'community_posts', post.id, 'comments');
      await addDoc(commentsColRef, {
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'Membro C Profit',
        userPhoto: auth.currentUser.photoURL || '',
        text: newCommentText.trim(),
        createdAt: serverTimestamp(),
      });

      const postRef = doc(db, 'community_posts', post.id);
      await updateDoc(postRef, {
        commentsCount: increment(1)
      });

      setNewCommentText('');
    } catch (err) {
      console.error('Error adding local comment:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteCommentLocal = async (commentId: string) => {
    try {
      const commentDocRef = doc(db, 'community_posts', post.id, 'comments', commentId);
      await deleteDoc(commentDocRef);
      const postRef = doc(db, 'community_posts', post.id);
      await updateDoc(postRef, {
        commentsCount: increment(-1)
      });
    } catch (err) {
      console.error('Error deleting local comment:', err);
    }
  };

  return (
    <div className="bg-surface border border-outline-variant/10 rounded-2xl p-4 flex flex-col shadow-sm select-text text-left">
      {/* Header */}
      <div className="flex justify-between items-center mb-3 relative">
        <div className="flex items-center gap-3">
          <img 
            src={post.userPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.userName)}&background=random`} 
            alt={post.userName} 
            className="w-10 h-10 rounded-xl object-cover"
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-on-surface uppercase tracking-tight">{post.userName}</span>
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-lg border border-primary/20 font-bold uppercase">
                {post.type === 'forex' ? 'Forex' : 'Opções Binárias'}
              </span>
            </div>
            <span className="text-[10px] text-on-surface-variant opacity-60">
              {post.createdAt ? new Date(post.createdAt.toDate ? post.createdAt.toDate() : post.createdAt).toLocaleDateString() : 'Recentemente'}
            </span>
          </div>
        </div>

        {/* Options */}
        {(isAdmin || post.userId === auth.currentUser?.uid) && (
          <div className="relative">
            <button 
              onClick={() => setActiveDropdown(!activeDropdown)}
              className="p-1 rounded-full hover:bg-surface-container transition-colors"
            >
              <MoreVertical size={18} />
            </button>
            {activeDropdown && (
              <div className="absolute right-0 top-8 w-28 bg-surface border border-outline-variant/15 rounded-xl shadow-lg py-1 z-10 overflow-hidden">
                <button 
                  onClick={() => {
                    setActiveDropdown(false);
                    onDeletePost(post.id);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-error font-medium hover:bg-error/10 transition-colors flex items-center gap-2"
                >
                  <Trash2 size={14} />
                  Excluir
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="pb-3.5">
        <p className="text-xs sm:text-sm text-on-surface leading-normal whitespace-pre-wrap">{post.legend}</p>
      </div>

      {/* Media elements / Trade Share Card */}
      {(post.tradeDetails || post.imageUrl) && (
        <div className="mb-3 cursor-pointer" onClick={() => onSelectPhoto(post)}>
          <TradeShareCard 
            tradeDetails={post.tradeDetails} 
            imageUrl={post.imageUrl} 
            userName={post.userName}
          />
        </div>
      )}

      {/* Separator / Divider */}
      <div className="border-t border-outline-variant/10 py-2.5 flex justify-between items-center text-xs text-on-surface-variant">
        <button 
          onClick={() => onLike(post)}
          className={`px-3 py-1 bg-surface-container/30 rounded-lg hover:bg-surface-container flex items-center gap-1.5 font-bold transition-all ${post.userLiked ? 'text-primary' : ''}`}
        >
          <ThumbsUpIcon size={14} fill={post.userLiked ? 'currentColor' : 'none'} />
          <span>{post.likesCount || 0}</span>
        </button>

        <button 
          onClick={() => setShowComments(!showComments)}
          className="px-3 py-1 bg-surface-container/30 rounded-lg hover:bg-surface-container flex items-center gap-1.5 font-bold transition-all"
        >
          <MessageSquare size={14} />
          <span>{post.commentsCount || 0} Comentários</span>
        </button>
      </div>

      {/* Local expanded comments block */}
      {showComments && (
        <div className="border-t border-outline-variant/10 pt-3 mt-1 space-y-4">
          <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-3 pr-1">
            {comments.length === 0 ? (
              <p className="text-[11px] text-center text-on-surface-variant opacity-60">Seja o primeiro a comentar esta análise!</p>
            ) : (
              comments.map((comm) => (
                <div key={comm.id} className="flex gap-2 text-xs">
                  <img 
                    src={comm.userPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(comm.userName)}&background=random`} 
                    alt={comm.userName} 
                    className="w-7 h-7 rounded-lg object-cover bg-black/5"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 bg-surface-container-low px-3 py-2 rounded-xl rounded-tl-none relative animate-in fade-in duration-200">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="font-extrabold text-xs text-primary">{comm.userName}</span>
                      {comm.userId === auth.currentUser?.uid && (
                        <button 
                          onClick={() => handleDeleteCommentLocal(comm.id)}
                          className="text-error hover:scale-105 transition-transform"
                          title="Eliminar comentário"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                    <p className="text-on-surface leading-tight text-[11px]">{comm.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Escreva um comentário..." 
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              className="flex-1 bg-surface-container border border-outline-variant/20 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-primary text-on-surface"
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddCommentLocal(); }}
            />
            <button 
              disabled={isSubmittingComment || !newCommentText.trim()}
              onClick={handleAddCommentLocal}
              className="p-1 px-3 bg-primary text-on-primary rounded-xl text-xs font-bold disabled:opacity-40"
            >
              Post
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
