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

fs.writeFileSync('firestore.rules', rules);
