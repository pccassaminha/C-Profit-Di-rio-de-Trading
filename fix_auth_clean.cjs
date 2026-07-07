const fs = require('fs');

const filepath = 'src/components/Auth.tsx';
let content = fs.readFileSync(filepath, 'utf8');

content = content.replace(/setError\(getFriendlyErrorMessage\(err\)\);\s*if \(err\?\.code === 'auth\/popup-closed-by-user'\) \{\s*setError\(null\);\s*\} else \{\s*console\.warn\("Auth info:", err\.code \|\| err\);\s*\}/g, 
`      if (err?.code === 'auth/popup-closed-by-user') {
        setError(null);
      } else {
        setError(getFriendlyErrorMessage(err));
        console.warn("Auth info:", err.code || err);
      }`);

fs.writeFileSync(filepath, content);
console.log('Fixed Auth.tsx cleaner');
