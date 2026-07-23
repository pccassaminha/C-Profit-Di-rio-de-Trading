const fs = require('fs');

let rules = fs.readFileSync('firestore.rules.backup', 'utf8');

// safely check email
rules = rules.replace(
/function isStaticSuperAdmin\(\) \{[\s\S]*?function isAdmin\(\)/,
`function isStaticSuperAdmin() {
      return isAuthenticated() && (
        (request.auth.token != null && 
         request.auth.token.keys().hasAll(['email']) && 
         (request.auth.token.email.lower() == 'exportacoes.extras@gmail.com' || request.auth.token.email.lower() == 'omilionario.extra@gmail.com')) ||
        (exists(/databases/$(database)/documents/usuarios/$(request.auth.uid)) && 
         get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.keys().hasAll(['email']) &&
         (get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.email == 'exportacoes.extras@gmail.com' || 
          get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.email == 'omilionario.extra@gmail.com')) ||
        (exists(/databases/$(database)/documents/users/$(request.auth.uid)) && 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.keys().hasAll(['email']) &&
         (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.email == 'exportacoes.extras@gmail.com' || 
          get(/databases/$(database)/documents/users/$(request.auth.uid)).data.email == 'omilionario.extra@gmail.com'))
      );
    }

    function isAdmin(`
);

// safely check role
rules = rules.replace(
/function isAdmin\(\) \{[\s\S]*?function isPartner\(userId\)/,
`function isAdmin() {
      return isStaticSuperAdmin() || (
        isAuthenticated() && (
          (exists(/databases/$(database)/documents/usuarios/$(request.auth.uid)) && 
           get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.keys().hasAll(['role']) &&
           get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.role == 'admin') ||
          (exists(/databases/$(database)/documents/users/$(request.auth.uid)) && 
           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.keys().hasAll(['role']) &&
           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin')
        )
      );
    }

    function isPartner(userId)`
);

// safely check partnerEmail
rules = rules.replace(
/function isPartner\(userId\) \{[\s\S]*?function canReadData\(\)/,
`function isPartner(userId) {
      return isAuthenticated() && 
        request.auth.token != null && 
        request.auth.token.keys().hasAll(['email']) && (
          (exists(/databases/$(database)/documents/usuarios/$(userId)) && 
           get(/databases/$(database)/documents/usuarios/$(userId)).data.keys().hasAll(['partnerEmail']) &&
           get(/databases/$(database)/documents/usuarios/$(userId)).data.partnerEmail == request.auth.token.email) ||
          (exists(/databases/$(database)/documents/users/$(userId)) && 
           get(/databases/$(database)/documents/users/$(userId)).data.keys().hasAll(['partnerEmail']) &&
           get(/databases/$(database)/documents/users/$(userId)).data.partnerEmail == request.auth.token.email)
        );
    }

    function canReadData()`
);

fs.writeFileSync('firestore.rules', rules);
