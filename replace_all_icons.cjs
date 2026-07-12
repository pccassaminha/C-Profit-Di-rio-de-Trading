const fs = require('fs');
const glob = require('glob');

const iconMap = {
  'trending_up': 'TrendingUp',
  'balance': 'Scale',
  'chevron_left': 'ChevronLeft',
  'chevron_right': 'ChevronRight',
  'person': 'User',
  'content_copy': 'Copy',
  'pie_chart': 'PieChart',
  'bar_chart': 'BarChart2',
  'close_fullscreen': 'Shrink',
  'open_in_full': 'Expand',
  'close': 'X',
  'keyboard_arrow_down': 'ChevronDown',
  'groups': 'Users',
  'payments': 'Banknote',
  'price_check': 'BadgeDollarSign',
  'handshake': 'Handshake',
  'rule': 'ClipboardList',
  'gif_box': 'Gift',
  'currency_lira': 'Coins',
  'pending_actions': 'Clock',
  'account_balance_wallet': 'Wallet',
  'group_add': 'UserPlus',
  'calendar_month': 'Calendar',
  'dashboard': 'LayoutDashboard',
  'lan': 'Network',
  'check_circle': 'CheckCircle',
  'expand_more': 'ChevronDown',
  'expand_less': 'ChevronUp',
  'reply': 'Reply'
};

const files = [
  'src/components/Dashboard.tsx',
  'src/components/AdminPanel.tsx',
  'src/components/DatePicker.tsx',
  'src/components/UserAffiliate.tsx',
  'src/components/Settings.tsx',
  'src/components/TradeJournal.tsx',
  'src/components/GlobalChatWidget.tsx',
  'src/components/DateRangePicker.tsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  let usedIcons = new Set();
  
  const regex = /<span([^>]*class(?:Name)?=["'][^"']*material-symbols-outlined[^"']*["'][^>]*)>([\s\S]*?)<\/span>/g;
  
  content = content.replace(regex, (match, attrs, innerText) => {
    let iconName = innerText.trim();
    // Handle ternary
    let ternaryMatch = iconName.match(/\{([^?]+)\s*\?\s*['"]([^'"]+)['"]\s*:\s*['"]([^'"]+)['"]\}/);
    if (ternaryMatch) {
        const cond = ternaryMatch[1].trim();
        const trueIcon = ternaryMatch[2].trim();
        const falseIcon = ternaryMatch[3].trim();
        
        let tIcon = iconMap[trueIcon] || trueIcon;
        let fIcon = iconMap[falseIcon] || falseIcon;
        
        usedIcons.add(tIcon);
        usedIcons.add(fIcon);
        
        let newAttrs = attrs.replace(/material-symbols-outlined/g, '');
        newAttrs = newAttrs.replace(/className=["']\s+/g, 'className="');
        newAttrs = newAttrs.replace(/\s+["']/g, '"');
        return `{${cond} ? <${tIcon}${newAttrs} /> : <${fIcon}${newAttrs} />}`;
    }
    
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
    const iconsList = Array.from(usedIcons).join(', ');
    const importStmt = `\nimport { ${iconsList} } from 'lucide-react';\n`;
    
    // Check if lucide-react is already imported
    if (content.includes("'lucide-react'")) {
        content = content.replace(/import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"];/, (m, existing) => {
            const existingSet = new Set(existing.split(',').map(s => s.trim()).filter(Boolean));
            for (const icon of usedIcons) existingSet.add(icon);
            return `import { ${Array.from(existingSet).join(', ')} } from 'lucide-react';`;
        });
    } else {
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
    console.log(`Updated ${file}`);
  }
}
