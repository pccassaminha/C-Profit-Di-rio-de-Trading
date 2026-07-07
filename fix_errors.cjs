const fs = require('fs');

const filepath = 'src/components/Auth.tsx';
let content = fs.readFileSync(filepath, 'utf8');

// Inside getFriendlyErrorMessage, let's just make sure it handles popup-closed-by-user (though we won't show it as an error if possible)
// But wait, we can just replace console.error(err) with console.log or conditionally call console.error.

content = content.replace(/console\.error\(err\);/g, `
      if (err?.code === 'auth/popup-closed-by-user') {
        setError(null);
      } else {
        console.warn("Auth info:", err.code || err);
      }
`);

fs.writeFileSync(filepath, content);
console.log('Fixed Auth.tsx errors logging');
