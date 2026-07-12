const fs = require('fs');
let content = fs.readFileSync('firestore.rules', 'utf8');

// Insert collection group rules before the last closing brace
const collectionGroups = `
    // Collection Group rules for Profile.tsx updates
    match /{path=**}/comments/{commentId} {
      allow read: if isAuthenticated();
      allow update: if isAuthenticated() && resource.data.userId == request.auth.uid;
    }
    match /{path=**}/messages/{messageId} {
      allow read: if isAuthenticated();
      allow update: if isAuthenticated() && resource.data.senderId == request.auth.uid;
    }
`;

content = content.replace(/  }\s*}$/, collectionGroups + '  }\n}');
fs.writeFileSync('firestore.rules', content);
