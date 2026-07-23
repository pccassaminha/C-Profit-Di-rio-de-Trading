const fs = require('fs');
let rules = fs.readFileSync('firestore.rules', 'utf8');

rules = rules.replace(
/function canReadData\(\) \{[\s\S]*?\}/,
`function canReadData() {
      return isAuthenticated() && (
        resource.data.get('userId', '') == request.auth.uid || 
        isAdmin() || 
        (request.auth.token != null && 
         request.auth.token.get('email', '') != '' && (
          (exists(/databases/$(database)/documents/usuarios/$(resource.data.get('userId', '')))) && 
           get(/databases/$(database)/documents/usuarios/$(resource.data.get('userId', ''))).data.get('partnerEmail', '') == request.auth.token.get('email', '') ||
          (exists(/databases/$(database)/documents/users/$(resource.data.get('userId', '')))) && 
           get(/databases/$(database)/documents/users/$(resource.data.get('userId', ''))).data.get('partnerEmail', '') == request.auth.token.get('email', '')
        ))
      );
    }`
);

fs.writeFileSync('firestore.rules', rules);
