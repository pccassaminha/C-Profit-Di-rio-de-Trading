const fs = require('fs');
let rules = fs.readFileSync('firestore.rules.backup', 'utf8');

rules = rules.replace(
/function isStaticSuperAdmin\(\) \{[\s\S]*?function isAdmin\(\)/,
`function isStaticSuperAdmin() {
      return isAuthenticated() && (
        (request.auth.token != null && 
         request.auth.token.keys().hasAll(['email']) && 
         (request.auth.token.email.lower() == 'exportacoes.extras@gmail.com' || request.auth.token.email.lower() == 'omilionario.extra@gmail.com')) ||
        (exists(/databases/$(database)/documents/usuarios/$(request.auth.uid)) && 
         (get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.get('email', '') == 'exportacoes.extras@gmail.com' || 
          get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.get('email', '') == 'omilionario.extra@gmail.com')) ||
        (exists(/databases/$(database)/documents/users/$(request.auth.uid)) && 
         (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.get('email', '') == 'exportacoes.extras@gmail.com' || 
          get(/databases/$(database)/documents/users/$(request.auth.uid)).data.get('email', '') == 'omilionario.extra@gmail.com'))
      );
    }

    function isAdmin(`
);

rules = rules.replace(
/function isAdmin\(\) \{[\s\S]*?function isPartner\(userId\)/,
`function isAdmin() {
      return isStaticSuperAdmin() || (
        isAuthenticated() && (
          (exists(/databases/$(database)/documents/usuarios/$(request.auth.uid)) && 
           get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.get('role', '') == 'admin') ||
          (exists(/databases/$(database)/documents/users/$(request.auth.uid)) && 
           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.get('role', '') == 'admin')
        )
      );
    }

    function isPartner(userId)`
);

rules = rules.replace(
/function isPartner\(userId\) \{[\s\S]*?function canReadData\(\)/,
`function isPartner(userId) {
      return isAuthenticated() && 
        request.auth.token != null && 
        request.auth.token.keys().hasAll(['email']) && (
          (exists(/databases/$(database)/documents/usuarios/$(userId)) && 
           get(/databases/$(database)/documents/usuarios/$(userId)).data.get('partnerEmail', '') == request.auth.token.email) ||
          (exists(/databases/$(database)/documents/users/$(userId)) && 
           get(/databases/$(database)/documents/users/$(userId)).data.get('partnerEmail', '') == request.auth.token.email)
        );
    }

    function canReadData()`
);

fs.writeFileSync('firestore.rules', rules);
