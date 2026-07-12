const fs = require('fs');

const iconMap = {
  'account_balance_wallet': 'Wallet',
  'receipt_long': 'FileText',
  'flag': 'Flag',
  'delete_forever': 'Trash2',
  'close': 'X',
  'expand_more': 'ChevronDown',
  'add': 'Plus',
  'campaign': 'Megaphone',
  'edit': 'Edit2',
  'block': 'Ban',
  'send': 'Send',
  'chat': 'MessageSquare',
  'forum': 'MessageCircle',
  'globe': 'Globe',
  'arrow_forward': 'ArrowRight',
  'group_add': 'UserPlus',
  'explore': 'Compass',
  'done': 'Check',
  'calendar_today': 'Calendar',
  'delete': 'Trash2',
  'arrow_forward_ios': 'ChevronRight',
  'candlestick_chart': 'BarChart2',
  'timer': 'Timer',
  'arrow_back': 'ArrowLeft',
  'open_in_new': 'ExternalLink',
  'link': 'Link',
  'swap_horiz': 'ArrowRightLeft',
  'upload_file': 'UploadCloud',
  'analytics': 'Activity',
  'trending_up': 'TrendingUp',
  'trending_down': 'TrendingDown',
  'save_as': 'Save',
  'check_circle': 'CheckCircle',
  'done_all': 'CheckCheck',
  'calendar_month': 'Calendar',
  'lock': 'Lock',
  'celebration': 'PartyPopper',
  'local_activity': 'Ticket',
  'savings': 'PiggyBank',
  'warning': 'AlertTriangle',
  'handshake': 'Handshake',
  'logout': 'LogOut',
  'content_copy': 'Copy',
};

const files = [
  'src/components/Settings.tsx',
  'src/components/Withdrawals.tsx',
  'src/components/Community.tsx',
  'src/components/TradeJournal.tsx',
  'src/components/GlobalChatWidget.tsx',
  'src/components/DateRangePicker.tsx',
  'src/components/Plans.tsx',
  'src/App.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  const usedIcons = new Set();
  
  // Replace <span className="material-symbols-outlined ...">icon_name</span>
  const regex = /<span([^>]*class(?:Name)?=["'][^"']*material-symbols-outlined[^"']*["'][^>]*)>([\s\S]*?)<\/span>/g;
  
  content = content.replace(regex, (match, attrs, innerText) => {
    const iconName = innerText.trim();
    if (iconMap[iconName]) {
      usedIcons.add(iconMap[iconName]);
      // Remove material-symbols-outlined from class
      let newAttrs = attrs.replace(/material-symbols-outlined/g, '');
      newAttrs = newAttrs.replace(/className=["']\s+/g, 'className="');
      newAttrs = newAttrs.replace(/\s+["']/g, '"');
      return `<${iconMap[iconName]}${newAttrs} />`;
    }
    console.log(`Warning: Icon not mapped: ${iconName} in ${file}`);
    return match; // fallback
  });
  
  if (usedIcons.size > 0) {
    // Add import statement at the top (after other imports)
    const iconsList = Array.from(usedIcons).join(', ');
    const importStmt = `\nimport { ${iconsList} } from 'lucide-react';\n`;
    
    // Find last import
    const importMatches = [...content.matchAll(/import .*? from ['"].*?['"];?\n/g)];
    if (importMatches.length > 0) {
      const lastMatch = importMatches[importMatches.length - 1];
      const insertPos = lastMatch.index + lastMatch[0].length;
      content = content.slice(0, insertPos) + importStmt + content.slice(insertPos);
    } else {
      content = importStmt + content;
    }
    
    fs.writeFileSync(file, content);
    console.log(`Updated ${file} with imports: ${iconsList}`);
  }
}
