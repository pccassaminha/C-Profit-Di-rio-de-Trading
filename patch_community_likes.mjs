import fs from 'fs';

let content = fs.readFileSync('src/components/Community.tsx', 'utf8');

const targetCheck = `  // Effect to check likes per post
  useEffect(() => {
    if (!auth.currentUser || posts.length === 0) return;

    posts.forEach(async (post) => {
      const likeDoc = await getDoc(doc(db, 'community_posts', post.id, 'likes', auth.currentUser!.uid));
      if (likeDoc.exists()) {
        setPosts(current => current.map(p => p.id === post.id ? { ...p, userLiked: true } : p));
      }
    });
  }, [posts.length]);`;

const replacementCheck = `  const checkedLikesRef = useRef<Set<string>>(new Set());

  // Effect to check likes per post
  useEffect(() => {
    if (!auth.currentUser) return;

    const allPosts = [...posts, ...selectedUserPosts];
    allPosts.forEach(async (post) => {
      if (checkedLikesRef.current.has(post.id)) return;
      checkedLikesRef.current.add(post.id);

      try {
        const likeDoc = await getDoc(doc(db, 'community_posts', post.id, 'likes', auth.currentUser!.uid));
        if (likeDoc.exists()) {
          setPosts(current => current.map(p => p.id === post.id ? { ...p, userLiked: true } : p));
          setSelectedUserPosts(current => current.map(p => p.id === post.id ? { ...p, userLiked: true } : p));
        }
      } catch (err) {
        console.error(err);
      }
    });
  }, [posts, selectedUserPosts]);`;

content = content.replace(targetCheck, replacementCheck);

fs.writeFileSync('src/components/Community.tsx', content);
console.log("Patched likes check");
