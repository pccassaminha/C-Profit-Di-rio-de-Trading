import fs from 'fs';

let content = fs.readFileSync('src/components/Community.tsx', 'utf8');

// Replace handleLike
const handleLikeOld = `  const handleLike = async (post: Post) => {
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
  };`;

const handleLikeNew = `  const handleLike = async (post: Post) => {
    if (!auth.currentUser) return;
    const likeRef = doc(db, 'community_posts', post.id, 'likes', auth.currentUser.uid);
    const postRef = doc(db, 'community_posts', post.id);

    try {
      if (post.userLiked) {
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, userLiked: false, likesCount: Math.max(0, (p.likesCount || 0) - 1) } : p));
        await deleteDoc(likeRef);
        await updateDoc(postRef, { likesCount: increment(-1) });
      } else {
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, userLiked: true, likesCount: (p.likesCount || 0) + 1 } : p));
        await setDoc(likeRef, { createdAt: serverTimestamp() });
        await updateDoc(postRef, { likesCount: increment(1) });
      }
    } catch (err) {
      console.error(err);
    }
  };`;

content = content.replace(handleLikeOld, handleLikeNew);


// Replace handleLikeProfilePost
const handleLikeProfilePostOld = `  const handleLikeProfilePost = async (post: Post) => {
    if (!auth.currentUser) return;
    const likeRef = doc(db, 'community_posts', post.id, 'likes', auth.currentUser.uid);
    const postRef = doc(db, 'community_posts', post.id);

    try {
      const isCurrentlyLiked = post.userLiked;
      if (isCurrentlyLiked) {
        await deleteDoc(likeRef);
        await updateDoc(postRef, { likesCount: increment(-1) });
        setSelectedUserPosts(prev => prev.map(p => p.id === post.id ? { ...p, userLiked: false, likesCount: p.likesCount - 1 } : p));
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, userLiked: false, likesCount: p.likesCount - 1 } : p));
      } else {
        await setDoc(likeRef, { createdAt: serverTimestamp() });
        await updateDoc(postRef, { likesCount: increment(1) });
        setSelectedUserPosts(prev => prev.map(p => p.id === post.id ? { ...p, userLiked: true, likesCount: p.likesCount + 1 } : p));
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, userLiked: true, likesCount: p.likesCount + 1 } : p));
      }
    } catch (err) {
      console.error(err);
    }
  };`;

const handleLikeProfilePostNew = `  const handleLikeProfilePost = async (post: Post) => {
    if (!auth.currentUser) return;
    const likeRef = doc(db, 'community_posts', post.id, 'likes', auth.currentUser.uid);
    const postRef = doc(db, 'community_posts', post.id);

    try {
      const isCurrentlyLiked = post.userLiked;
      if (isCurrentlyLiked) {
        setSelectedUserPosts(prev => prev.map(p => p.id === post.id ? { ...p, userLiked: false, likesCount: Math.max(0, (p.likesCount || 0) - 1) } : p));
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, userLiked: false, likesCount: Math.max(0, (p.likesCount || 0) - 1) } : p));
        await deleteDoc(likeRef);
        await updateDoc(postRef, { likesCount: increment(-1) });
      } else {
        setSelectedUserPosts(prev => prev.map(p => p.id === post.id ? { ...p, userLiked: true, likesCount: (p.likesCount || 0) + 1 } : p));
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, userLiked: true, likesCount: (p.likesCount || 0) + 1 } : p));
        await setDoc(likeRef, { createdAt: serverTimestamp() });
        await updateDoc(postRef, { likesCount: increment(1) });
      }
    } catch (err) {
      console.error(err);
    }
  };`;

content = content.replace(handleLikeProfilePostOld, handleLikeProfilePostNew);

fs.writeFileSync('src/components/Community.tsx', content);
console.log("Replaced handleLike and handleLikeProfilePost.");

