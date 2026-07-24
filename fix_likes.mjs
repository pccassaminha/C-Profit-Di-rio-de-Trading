import fs from 'fs';

let content = fs.readFileSync('src/components/Community.tsx', 'utf8');

// Fix 1: Preserve userLiked in setPosts onSnapshot
const onSnapshotSetPostsRegex = /setPosts\(postsData\);/g;
content = content.replace(onSnapshotSetPostsRegex, `setPosts(currentPosts => {
        return postsData.map(newPost => {
          const old = currentPosts.find(p => p.id === newPost.id);
          if (old && old.userLiked !== undefined) {
            newPost.userLiked = old.userLiked;
          }
          return newPost;
        });
      });`);

// Fix 2: Preserve userLiked in setSelectedUserPosts onSnapshot
const onSnapshotSetSelectedUserPostsRegex = /setSelectedUserPosts\(postsData\);/g;
content = content.replace(onSnapshotSetSelectedUserPostsRegex, `setSelectedUserPosts(currentPosts => {
        return postsData.map(newPost => {
          const old = currentPosts.find(p => p.id === newPost.id);
          if (old && old.userLiked !== undefined) {
            newPost.userLiked = old.userLiked;
          }
          return newPost;
        });
      });`);

fs.writeFileSync('src/components/Community.tsx', content);
console.log("Replaced onSnapshot setter calls.");

