const fs = require('fs');

function cleanImports(file) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Find all lucide-react imports
    const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"];/g;
    let match;
    let allIcons = new Set();
    
    while ((match = importRegex.exec(content)) !== null) {
        const icons = match[1].split(',').map(i => i.trim()).filter(Boolean);
        for (const i of icons) {
            // exclude invalid ones like 'visibility_off' or 'trending_down' (lowercase)
            if (i.match(/^[a-z_]+$/)) continue; 
            allIcons.add(i);
        }
    }
    
    // Remove all lucide-react imports
    content = content.replace(importRegex, '');
    
    // Add single correct import
    if (allIcons.size > 0) {
        const importStmt = `\nimport { ${Array.from(allIcons).join(', ')} } from 'lucide-react';\n`;
        const importMatches = [...content.matchAll(/import .*? from ['"].*?['"];?\n/g)];
        if (importMatches.length > 0) {
          const lastMatch = importMatches[importMatches.length - 1];
          const insertPos = lastMatch.index + lastMatch[0].length;
          content = content.slice(0, insertPos) + importStmt + content.slice(insertPos);
        } else {
          content = importStmt + content;
        }
    }
    
    fs.writeFileSync(file, content);
    console.log(`Cleaned imports in ${file}`);
}

const files = [
  'src/components/Community.tsx',
  'src/components/Dashboard.tsx',
  'src/components/GlobalChatWidget.tsx',
  'src/components/Settings.tsx'
];

for (const f of files) cleanImports(f);
