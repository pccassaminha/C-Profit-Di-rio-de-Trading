const fs = require('fs');

const iconMap = {
  'mail': 'Mail',
  'link': 'Link',
  'save': 'Save',
  'send': 'Send',
  'psychology': 'Brain',
  'edit': 'Edit2',
  'delete': 'Trash2',
  'psychology_alt': 'BrainCircuit',
  'chevron_left': 'ChevronLeft',
  'chevron_right': 'ChevronRight',
  'expand_more': 'ChevronDown'
};

const files = [
  'src/components/Profile.tsx',
  'src/components/Psychology.tsx',
  'src/components/Dashboard.tsx',
  'src/components/Settings.tsx',
  'src/components/TradeJournal.tsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  let usedIcons = new Set();
  
  const regex = /<span([^>]*class(?:Name)?=["'][^"']*material-symbols-outlined[^"']*["'][^>]*)>([\s\S]*?)<\/span>|<button([^>]*class(?:Name)?=["'][^"']*material-symbols-outlined[^"']*["'][^>]*)>([\s\S]*?)<\/button>/g;
  
  content = content.replace(regex, (match, spanAttrs, spanText, btnAttrs, btnText) => {
    const isButton = !!btnAttrs;
    const attrs = isButton ? btnAttrs : spanAttrs;
    const innerText = isButton ? btnText : spanText;
    
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
        if (isButton) {
            return `<button${newAttrs}>{${cond} ? <${tIcon} /> : <${fIcon} />}</button>`;
        }
        return `{${cond} ? <${tIcon}${newAttrs} /> : <${fIcon}${newAttrs} />}`;
    }
    
    if (iconMap[iconName]) {
      usedIcons.add(iconMap[iconName]);
      let newAttrs = attrs.replace(/material-symbols-outlined/g, '');
      newAttrs = newAttrs.replace(/className=["']\s+/g, 'className="');
      newAttrs = newAttrs.replace(/\s+["']/g, '"');
      if (isButton) {
          return `<button${newAttrs}><${iconMap[iconName]} /></button>`;
      }
      return `<${iconMap[iconName]}${newAttrs} />`;
    }
    
    // Check if it's `{collapsedSections... ? '' : 'rotate-180'}` case
    if (attrs.includes('collapsedSections') || attrs.includes('isExpanded')) {
       usedIcons.add('ChevronDown');
       let newAttrs = attrs.replace(/material-symbols-outlined/g, '');
       newAttrs = newAttrs.replace(/className=["']\s+/g, 'className="');
       newAttrs = newAttrs.replace(/\s+["']/g, '"');
       return `<ChevronDown${newAttrs} />`;
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
    } else {
        const importStmt = `\nimport { ${Array.from(usedIcons).join(', ')} } from 'lucide-react';\n`;
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
