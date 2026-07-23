const fs = require('fs');
let content = fs.readFileSync('src/components/GlobalChatWidget.tsx', 'utf8');

content = content.replace(/console\.error\('Error loading friends list in chat for uid ' \+ uid \+ ':', err\);/g, "if (err.code !== 'permission-denied') console.error('Error loading friends list:', err);");

content = content.replace(/console\.log\('.*? listener error:', err\.code\);/g, "if (err.code !== 'permission-denied') console.error('Listener error:', err);");

fs.writeFileSync('src/components/GlobalChatWidget.tsx', content);
