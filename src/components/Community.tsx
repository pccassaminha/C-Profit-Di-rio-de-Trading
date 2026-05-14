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

  useEffect(() => {
    const savedDefaultFeed = localStorage.getItem('app_default_community_feed') as 'forex' | 'ob';
    if (savedDefaultFeed) setActiveFeed(savedDefaultFeed);

    const savedShowFilter = localStorage.getItem('app_show_community_filter');
    if (savedShowFilter) setShowFilter(savedShowFilter === 'true');
  }, []);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPost, setNewPost] = useState({ legend: '', imageUrl: '', type: 'forex' as 'forex' | 'ob' });
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeComments, setActiveComments] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');

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

    return () => unsubscribe();
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
      let finalImageUrl = newPost.imageUrl;

      if (selectedFile) {
        const fileRef = ref(storage, `community/${auth.currentUser.uid}/${Date.now()}_${selectedFile.name}`);
        await uploadBytes(fileRef, selectedFile);
        finalImageUrl = await getDownloadURL(fileRef);
      }

      if (editingPostId) {
        await updateDoc(doc(db, 'community_posts', editingPostId), {
          legend: newPost.legend,
          imageUrl: finalImageUrl,
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
          type: newPost.type,
          likesCount: 0,
          commentsCount: 0,
          createdAt: serverTimestamp()
        });
      }
      setIsCreateModalOpen(false);
      setEditingPostId(null);
      setNewPost({ legend: '', imageUrl: '', type: activeFeed });
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditModal = (post: Post) => {
    setNewPost({
      legend: post.legend,
      imageUrl: post.imageUrl || '',
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

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Deseja excluir esta análise?')) return;
    try {
      await deleteDoc(doc(db, 'community_posts', postId));
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
                <div className="flex items-center gap-1">
                  {post.userId === auth.currentUser?.uid && (
                    <button 
                      onClick={() => handleOpenEditModal(post)}
                      className="p-2 rounded-xl hover:bg-primary/10 text-on-surface-variant hover:text-primary transition-all"
                    >
                      <Plus className="rotate-45" size={18} />
                    </button>
                  )}
                  <button 
                    onClick={() => handleDeletePost(post.id)}
                    className="p-2 rounded-xl hover:bg-error/10 text-on-surface-variant hover:text-error transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>

            {/* Post Content */}
            <div className="px-6 pb-4">
              <p className="text-on-surface text-base leading-relaxed whitespace-pre-wrap">{post.legend}</p>
            </div>

            {post.imageUrl && (
              <div className="px-2 pb-2">
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

                  return (
                    <img 
                      src={post.imageUrl} 
                      alt="Análise" 
                      className="w-full h-auto max-h-[600px] object-contain rounded-[32px] border border-outline-variant/5 bg-black/20" 
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
                      <div className="w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0 font-bold text-xs">
                        {c.userName[0]}
                      </div>
                      <div className="flex-1 bg-surface-container p-4 rounded-3xl rounded-tl-none">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-[10px] font-black text-primary uppercase">{c.userName}</p>
                          <p className="text-[9px] text-on-surface-variant opacity-40 uppercase">
                            {c.createdAt ? new Date(c.createdAt.toDate ? c.createdAt.toDate() : c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </p>
                        </div>
                        <p className="text-sm text-on-surface leading-tight">{c.text}</p>
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
                setNewPost({ legend: '', imageUrl: '', type: activeFeed });
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

                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newPost.imageUrl}
                    onChange={(e) => {
                      setNewPost({ ...newPost, imageUrl: e.target.value });
                      if (e.target.value) {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                      }
                    }}
                    placeholder="Link do TradingView, YouTube ou Imagem..."
                    className="flex-1 bg-surface-container-low border border-outline-variant/20 rounded-2xl px-6 py-4 text-on-surface focus:outline-none focus:border-primary transition-all text-sm"
                  />
                  
                  <input 
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSelectedFile(file);
                        setPreviewUrl(URL.createObjectURL(file));
                        setNewPost({ ...newPost, imageUrl: '' });
                      }
                    }}
                  />
                  
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                    className={`w-14 rounded-2xl border border-outline-variant/20 flex items-center justify-center transition-all ${previewUrl ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'}`}
                  >
                    <Plus size={24} />
                  </button>
                </div>
                
                {/* Media Preview */}
                {(newPost.imageUrl || previewUrl) && (
                  <div className="relative rounded-3xl overflow-hidden border border-outline-variant/20 bg-black/20 animate-in zoom-in duration-300">
                    {previewUrl ? (
                      <img src={previewUrl} alt="Preview" className="w-full h-auto max-h-[300px] object-contain" />
                    ) : (
                      (() => {
                        const link = newPost.imageUrl.toLowerCase();
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
                
                <p className="text-[9px] text-on-surface-variant italic px-2">Dica: Você pode colar um link do TradingView/YouTube ou carregar uma imagem do seu dispositivo.</p>
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
    </div>
  );
}
