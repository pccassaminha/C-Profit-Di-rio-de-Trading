const fs = require('fs');

const iconMap = {
  'lock': 'Lock',
  'warning': 'AlertTriangle',
  'rocket_launch': 'Rocket',
  'add': 'Plus',
  'analytics': 'Activity',
  'insights': 'LineChart',
  'schedule': 'Clock',
  'monitoring': 'Activity',
  'currency_exchange': 'RefreshCw',
  'psychology': 'Brain',
  'history': 'History',
  'open_in_new': 'ExternalLink',
  'trending_down': 'TrendingDown',
  'chat_bubble': 'MessageCircle',
  'account_balance_wallet': 'Wallet',
  'receipt_long': 'FileText',
  'flag': 'Flag',
  'delete_forever': 'Trash2'
};

const files = [
  'src/components/Dashboard.tsx',
  'src/components/Settings.tsx',
  'src/components/GlobalChatWidget.tsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  let usedIcons = new Set();
  
  const regex = /<span([^>]*class(?:Name)?=["'][^"']*material-symbols-outlined[^"']*["'][^>]*)>([\s\S]*?)<\/span>/g;
  
  content = content.replace(regex, (match, attrs, innerText) => {
    let iconName = innerText.trim();
    if (iconMap[iconName]) {
      usedIcons.add(iconMap[iconName]);
      let newAttrs = attrs.replace(/material-symbols-outlined/g, '');
      newAttrs = newAttrs.replace(/className=["']\s+/g, 'className="');
      newAttrs = newAttrs.replace(/\s+["']/g, '"');
      return `<${iconMap[iconName]}${newAttrs} />`;
    }
    console.log(`Warning: Icon not mapped: ${iconName} in ${file}`);
    return match;
  });

  if (usedIcons.size > 0) {
    if (content.includes("'lucide-react'")) {
        content = content.replace(/import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"];/, (m, existing) => {
            const existingSet = new Set(existing.split(',').map(s => s.trim()).filter(Boolean));
            for (const icon of usedIcons) existingSet.add(icon);
            return `import { ${Array.from(existingSet).join(', ')} } from 'lucide-react';`;
        });
    }
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
}
