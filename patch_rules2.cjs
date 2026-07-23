const fs = require('fs');
let rules = fs.readFileSync('firestore.rules', 'utf8');

rules = rules.replace(
/request\.auth\.token != null &&\s*request\.auth\.token\.email != null/g,
"request.auth.token != null && request.auth.token.get('email', '') != ''"
);

rules = rules.replace(
/request\.auth\.token\.email\.lower\(\)/g,
"request.auth.token.get('email', '').lower()"
);

rules = rules.replace(
/request\.auth\.token\.email/g,
"request.auth.token.get('email', '')"
);

fs.writeFileSync('firestore.rules', rules);
