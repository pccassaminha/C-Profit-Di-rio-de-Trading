import fs from 'fs';

let content = fs.readFileSync('src/components/Community.tsx', 'utf8');

const targetActiveFeed = `    const unsubscribe = onSnapshot(q, (snapshot) => {
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
      setPosts(postsData);
    });`;

const replacementActiveFeed = `    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(currentPosts => {
        const postsData = snapshot.docs.map(doc => {
          const existingPost = currentPosts.find(p => p.id === doc.id);
          return {
            id: doc.id,
            ...doc.data(),
            userLiked: existingPost ? existingPost.userLiked : false
          } as Post;
        });
        postsData.sort((a, b) => {
          const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
          const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
          return timeB - timeA;
        });
        return postsData;
      });
    });`;

content = content.replace(targetActiveFeed, replacementActiveFeed);

const targetProfilePosts = `    const unsub = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Post));
      postsData.sort((a, b) => {
        const timeA = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime()) : 0;
        const timeB = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime()) : 0;
        return timeB - timeA;
      });
      setSelectedUserPosts(postsData);
      setIsLoadingSelectedProfile(false);
    }, (err) => {`;

const replacementProfilePosts = `    const unsub = onSnapshot(q, (snapshot) => {
      setSelectedUserPosts(currentPosts => {
        const postsData = snapshot.docs.map(doc => {
          const existingPost = currentPosts.find(p => p.id === doc.id);
          return {
            id: doc.id,
            ...doc.data(),
            userLiked: existingPost ? existingPost.userLiked : false
          } as Post;
        });
        postsData.sort((a, b) => {
          const timeA = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime()) : 0;
          const timeB = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime()) : 0;
          return timeB - timeA;
        });
        return postsData;
      });
      setIsLoadingSelectedProfile(false);
    }, (err) => {`;

content = content.replace(targetProfilePosts, replacementProfilePosts);

// Also need to fix Math.max(0, p.likesCount - 1) in handleLike and handleLikeProfilePost
const handleLikeTarget = `      if (post.userLiked) {
        await deleteDoc(likeRef);
        await updateDoc(postRef, { likesCount: increment(-1) });
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, userLiked: false, likesCount: p.likesCount - 1 } : p));
      }`;
const handleLikeReplacement = `      if (post.userLiked) {
        await deleteDoc(likeRef);
        await updateDoc(postRef, { likesCount: increment(-1) });
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, userLiked: false, likesCount: Math.max(0, (p.likesCount || 0) - 1) } : p));
      }`;
content = content.replace(handleLikeTarget, handleLikeReplacement);

const handleLikeTarget2 = `      if (isCurrentlyLiked) {
        await deleteDoc(likeRef);
        await updateDoc(postRef, { likesCount: increment(-1) });
        setSelectedUserPosts(prev => prev.map(p => p.id === post.id ? { ...p, userLiked: false, likesCount: p.likesCount - 1 } : p));
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, userLiked: false, likesCount: p.likesCount - 1 } : p));
      }`;
const handleLikeReplacement2 = `      if (isCurrentlyLiked) {
        await deleteDoc(likeRef);
        await updateDoc(postRef, { likesCount: increment(-1) });
        setSelectedUserPosts(prev => prev.map(p => p.id === post.id ? { ...p, userLiked: false, likesCount: Math.max(0, (p.likesCount || 0) - 1) } : p));
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, userLiked: false, likesCount: Math.max(0, (p.likesCount || 0) - 1) } : p));
      }`;
content = content.replace(handleLikeTarget2, handleLikeReplacement2);

fs.writeFileSync('src/components/Community.tsx', content);
console.log("Patched community posts snapshot handlers and decrement");
