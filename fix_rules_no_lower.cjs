const fs = require('fs');

let rules = fs.readFileSync('firestore.rules', 'utf8');

rules = rules.replace(/\.lower\(\)/g, "");

fs.writeFileSync('firestore.rules', rules);
