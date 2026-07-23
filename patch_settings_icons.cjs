const fs = require('fs');
let content = fs.readFileSync('src/components/Settings.tsx', 'utf8');

if (!content.includes('MoreVertical')) {
  content = content.replace("Undo } from 'lucide-react';", "Undo, MoreVertical } from 'lucide-react';");
}

fs.writeFileSync('src/components/Settings.tsx', content);
