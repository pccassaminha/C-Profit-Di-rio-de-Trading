const fs = require('fs');
let content = fs.readFileSync('src/components/GlobalChatWidget.tsx', 'utf8');
content = content.replace(/setTotalUnread\(unread\);\s*const autoId = localStorage\.getItem\('autoSelectChatId'\);\s*if \(autoId\) \{\s*const found = chatsData\.find\(c => c\.id === autoId\);\s*if \(found\) \{\s*setActiveChat\(found\);\s*\}\s*\}\s*\}\);/, "setTotalUnread(unread);\n      const autoId = localStorage.getItem('autoSelectChatId');\n      if (autoId) {\n        const found = chatsData.find(c => c.id === autoId);\n        if (found) {\n          setActiveChat(found);\n        }\n      }\n    }, (err) => console.log('Chats listener error:', err.code));");
fs.writeFileSync('src/components/GlobalChatWidget.tsx', content);
