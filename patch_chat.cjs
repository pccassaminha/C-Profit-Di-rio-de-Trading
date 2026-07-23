const fs = require('fs');
let content = fs.readFileSync('src/components/GlobalChatWidget.tsx', 'utf8');

content = content.replace(/const unsub = onSnapshot\(collection\(db, 'usuarios'\), \(snap\) => \{([\s\S]*?)\}\);/, "const unsub = onSnapshot(collection(db, 'usuarios'), (snap) => {$1}, (err) => console.log('Usuarios listener error:', err.code));");

content = content.replace(/const unsub = onSnapshot\(q, \(snap\) => \{([\s\S]*?setPendingInvites[\s\S]*?)\}\);/, "const unsub = onSnapshot(q, (snap) => {$1}, (err) => console.log('Room invites listener error:', err.code));");

content = content.replace(/const unsubBlocks = onSnapshot\(blocksQ, snap => \{([\s\S]*?)\}\);/, "const unsubBlocks = onSnapshot(blocksQ, snap => {$1}, (err) => console.log('Blocks listener error:', err.code));");

content = content.replace(/const unsubChats = onSnapshot\(q, async \(snapshot\) => \{([\s\S]*?setTotalUnread\(unread\);\s*\}\);)/, "const unsubChats = onSnapshot(q, async (snapshot) => {$1}, (err) => console.log('Chats listener error:', err.code));");

content = content.replace(/const unsub = onSnapshot\(q, snap => \{([\s\S]*?scrollIntoView[\s\S]*?)\}\);/, "const unsub = onSnapshot(q, snap => {$1}, (err) => console.log('Messages listener error:', err.code));");

fs.writeFileSync('src/components/GlobalChatWidget.tsx', content);
