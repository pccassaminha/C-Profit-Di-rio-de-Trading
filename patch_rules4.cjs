const fs = require('fs');
let rules = fs.readFileSync('firestore.rules', 'utf8');

// safely replace resource.data.userId
rules = rules.replace(/resource\.data\.userId/g, "resource.data.get('userId', '')");
// safely replace resource.data.senderId
rules = rules.replace(/resource\.data\.senderId/g, "resource.data.get('senderId', '')");
// safely replace resource.data.receiverId
rules = rules.replace(/resource\.data\.receiverId/g, "resource.data.get('receiverId', '')");
// safely replace resource.data.referrerId
rules = rules.replace(/resource\.data\.referrerId/g, "resource.data.get('referrerId', '')");
// safely replace resource.data.participants
rules = rules.replace(/resource\.data\.participants/g, "resource.data.get('participants', [])");
// safely replace resource.data.admins
rules = rules.replace(/resource\.data\.admins/g, "resource.data.get('admins', [])");
// replace get(...).data.participants
rules = rules.replace(/get\(\/databases\/\$\(database\)\/documents\/chats\/\$\(chatId\)\)\.data\.participants/g, "get(/databases/$(database)/documents/chats/$(chatId)).data.get('participants', [])");
// replace get(...).data.admins
rules = rules.replace(/get\(\/databases\/\$\(database\)\/documents\/chats\/\$\(chatId\)\)\.data\.admins/g, "get(/databases/$(database)/documents/chats/$(chatId)).data.get('admins', [])");

fs.writeFileSync('firestore.rules', rules);
