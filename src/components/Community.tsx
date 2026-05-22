import React, { useState, useEffect, useRef } from 'react';
import { db, auth, storage } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, doc, updateDoc, increment, deleteDoc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useTrades } from '../hooks/useTrades';
import { MessageSquare, ThumbsUp as ThumbsUpIcon, Share2, Plus, Image as ImageIcon, X, Send, Filter, Globe, Hash, ShieldCheck, MoreVertical, Trash2, Smartphone } from 'lucide-react';

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
}

export default function Community() {
  const { userPlan } = useTrades();
  const [activeFeed, setActiveFeed] = useState<'forex' | 'ob'>('forex');
  const [showFilter, setShowFilter] = useState(true);
  const [viewingPost, setViewingPost] = useState<Post | null>(null);

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
      where('type', '==', activeFeed),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        userLiked: false // We'll check this per user if needed
      } as Post));
      setPosts(postsData);
    });

    const bQ = query(collection(db, 'broadcasts'), orderBy('createdAt', 'desc'));
    const unsubB = onSnapshot(bQ, (snapshot) => {
      setBroadcasts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribe();
      unsubB();
    };
  }, [activeFeed]);

  // Effect to check likes per post
  useEffect(() => {
    if (!auth.currentUser || posts.length === 0) return;

    posts.forEach(async (post) => {
      const likeDoc = await getDoc(doc(db, 'community_posts', post.id, 'likes', auth.currentUser!.uid));
      if (likeDoc.exists()) {
        setPosts(current => current.map(p => p.id === post.id ? { ...p, userLiked: true } : p));
      }
    });
  }, [posts.length]);

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
          userName: auth.currentUser.displayName || 'Membro C Profit',
          userPhoto: auth.currentUser.photoURL || '',
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

  const handleLike = async (post: Post) => {
    if (!auth.currentUser) return;
    const likeRef = doc(db, 'community_posts', post.id, 'likes', auth.currentUser.uid);
    const postRef = doc(db, 'community_posts', post.id);

    try {
      if (post.userLiked) {
        await deleteDoc(likeRef);
        await updateDoc(postRef, { likesCount: increment(-1) });
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, userLiked: false, likesCount: p.likesCount - 1 } : p));
      } else {
        await setDoc(likeRef, { createdAt: serverTimestamp() });
        await updateDoc(postRef, { likesCount: increment(1) });
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, userLiked: true, likesCount: p.likesCount + 1 } : p));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadComments = (postId: string) => {
    setActiveComments(postId);
    const q = query(collection(db, 'community_posts', postId, 'comments'), orderBy('createdAt', 'asc'));
    onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  };

  const handleAddComment = async (postId: string) => {
    if (!newComment || !auth.currentUser) return;
    try {
      await addDoc(collection(db, 'community_posts', postId, 'comments'), {
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'Membro C Profit',
        userPhoto: auth.currentUser.photoURL || '',
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

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-4xl md:text-5xl font-black text-on-surface font-headline uppercase italic tracking-tighter">
          Traders da <span className="text-primary italic">Nguimbi</span>
        </h2>
        <p className="text-on-surface-variant text-sm md:text-base font-medium opacity-70">A sua rede social de trading elite.</p>
      </div>

      {/* Composer Box (Facebook Style) */}
      <div className="bg-surface-container-low border border-outline-variant/10 rounded-[32px] p-4 md:p-6 shadow-xl shadow-black/5">
        <div className="flex items-center gap-4 mb-4">
          <img 
            src={auth.currentUser?.photoURL || `https://ui-avatars.com/api/?name=${auth.currentUser?.displayName || 'Traders'}&background=random`} 
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
            No que está a pensar, {auth.currentUser?.displayName?.split(' ')[0] || 'Trader'}?
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

      {/* Feed Selector */}
      {showFilter && (
        <div className="flex p-1.5 bg-surface-container-low border border-outline-variant/10 rounded-2xl md:rounded-full w-full max-w-md mx-auto">
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

      {/* Broadcasts (Avisos da Administração) */}
      {broadcasts.length > 0 && (
        <div className="space-y-4">
          {broadcasts.slice(0, 3).map(b => (
            <div key={b.id} className="bg-primary/10 border border-primary/30 rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-primary" />
              <div className="flex items-center gap-3 mb-2">
                <span className="material-symbols-outlined text-primary">campaign</span>
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
        {posts.map(post => (
          <div key={post.id} className="bg-surface-container-low border border-outline-variant/10 rounded-[40px] overflow-hidden shadow-2xl group animate-in slide-in-from-bottom duration-500">
            {/* Post Header */}
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img src={post.userPhoto || `https://ui-avatars.com/api/?name=${post.userName}&background=random`} alt={post.userName} className="w-12 h-12 rounded-2xl object-cover border border-outline-variant/10" referrerPolicy="no-referrer" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary text-on-primary rounded-lg flex items-center justify-center border-2 border-surface-container-low">
                    <ShieldCheck size={12} />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-black text-on-surface uppercase tracking-tight">{post.userName}</p>
                  <p className="text-[10px] text-on-surface-variant font-medium opacity-60 italic">
                    {post.createdAt ? new Date(post.createdAt.toDate ? post.createdAt.toDate() : post.createdAt).toLocaleString() : 'Recentemente'}
                  </p>
                </div>
              </div>
              
              {(isAdmin || post.userId === auth.currentUser?.uid) && (
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
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                          Editar
                        </button>
                       )}
                       <button 
                        onClick={() => handleDeletePost(post.id)}
                        className="w-full text-left px-4 py-3 text-sm text-error hover:bg-error/10 transition-colors flex items-center gap-3 border-t border-outline-variant/10"
                       >
                         <Trash2 size={18} />
                         Eliminar
                       </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Post Content */}
            <div className="px-6 pb-4 cursor-pointer" onClick={() => setViewingPost(post)}>
              <p className="text-on-surface text-base leading-relaxed whitespace-pre-wrap line-clamp-4">{renderTextWithMentions(post.legend)}</p>
              {post.legend.length > 200 && (
                 <span className="text-secondary text-sm font-bold mt-2 inline-block">Ver mais</span>
              )}
            </div>

            {post.imageUrl && (
              <div className="px-2 pb-2 cursor-pointer" onClick={() => setViewingPost(post)}>
                {(() => {
                  const link = post.imageUrl.toLowerCase();
                  const isVideo = link.match(/\.(mp4|webm|ogg|mov)$/) || 
                                  link.includes('youtube.com') || 
                                  link.includes('youtu.be') || 
                                  link.includes('vimeo.com');
                  
                  if (isVideo) {
                    if (link.includes('youtube.com') || link.includes('youtu.be')) {
                      const videoId = link.includes('v=') ? link.split('v=')[1]?.split('&')[0] : link.split('/').pop();
                      return (
                        <div className="aspect-video w-full rounded-[32px] overflow-hidden border border-outline-variant/20 shadow-lg mb-2">
                          <iframe 
                            src={`https://www.youtube.com/embed/${videoId}`}
                            className="w-full h-full"
                            allowFullScreen
                            title="Community Analysis Video"
                          ></iframe>
                        </div>
                      );
                    }
                    if (link.includes('vimeo.com')) {
                      const videoId = link.split('/').pop();
                      return (
                        <div className="aspect-video w-full rounded-[32px] overflow-hidden border border-outline-variant/20 shadow-lg mb-2">
                          <iframe 
                            src={`https://player.vimeo.com/video/${videoId}`}
                            className="w-full h-full"
                            allowFullScreen
                            title="Community Analysis Video"
                          ></iframe>
                        </div>
                      );
                    }
                    return (
                      <video 
                        src={post.imageUrl} 
                        controls 
                        className="w-full h-auto rounded-[32px] border border-outline-variant/20 shadow-lg bg-black/20 mb-2"
                      />
                    );
                  }

                  // TradingView link handle
                  let displayUrl = post.imageUrl;
                  if (displayUrl.includes('tradingview.com/x/') && !displayUrl.endsWith('.png')) {
                    displayUrl += '.png';
                  }

                  return (
                    <img 
                      src={displayUrl} 
                      alt="Análise" 
                      className="w-full h-auto max-h-[300px] object-cover rounded-[32px] border border-outline-variant/5 bg-black/20" 
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                  );
                })()}
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

              <button 
                onClick={() => handleShare(post)}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl hover:bg-surface-container text-on-surface-variant transition-all font-black text-xs uppercase tracking-widest ml-auto"
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
                          className="w-8 h-8 rounded-xl object-cover border border-outline-variant/10 shrink-0" 
                          referrerPolicy="no-referrer" 
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0 font-bold text-xs">
                          {c.userName ? c.userName[0] : 'U'}
                        </div>
                      )}
                      <div className="flex-1 bg-surface-container p-4 rounded-3xl rounded-tl-none">
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex gap-1 items-center">
                            <p className="text-[10px] font-black text-primary uppercase">{c.userName}</p>
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
                className="w-12 h-12 rounded-full object-cover border border-outline-variant/10"
                referrerPolicy="no-referrer"
              />
              <div>
                <h3 className="font-bold text-on-surface">{viewingPost.userName}</h3>
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
                {viewingPost.imageUrl && (() => {
                  const link = viewingPost.imageUrl.toLowerCase();
                  const isVideo = link.match(/\.(mp4|webm|ogg|mov)$/) || link.includes('youtube.com') || link.includes('youtu.be') || link.includes('vimeo.com');
                  
                  if (isVideo) {
                    if (link.includes('youtube.com') || link.includes('youtu.be')) {
                      const videoId = link.includes('v=') ? link.split('v=')[1]?.split('&')[0] : link.split('/').pop();
                      return (
                        <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-lg">
                          <iframe src={`https://www.youtube.com/embed/${videoId}`} className="w-full h-full" allowFullScreen></iframe>
                        </div>
                      );
                    }
                    return <video src={viewingPost.imageUrl} controls className="w-full h-auto rounded-3xl shadow-lg bg-black/20" />;
                  }

                  let displayUrl = viewingPost.imageUrl;
                  if (displayUrl.includes('tradingview.com/x/') && !displayUrl.endsWith('.png')) {
                    displayUrl += '.png';
                  }

                  return <img src={displayUrl} alt="Análise" className="w-full h-auto rounded-3xl shadow-lg border border-outline-variant/10 cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(viewingPost.imageUrl, '_blank')} referrerPolicy="no-referrer" />;
                })()}
                
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
    </div>
  );
}
