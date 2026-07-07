const fs = require('fs');
const filepath = 'src/components/Dashboard.tsx';
let content = fs.readFileSync(filepath, 'utf8');

// Remove the state and useEffect
content = content.replace(
  /const \[enableSmartSessions, setEnableSmartSessions\] = useState\(\(\) => localStorage\.getItem\('dashboard_enableSmartSessions'\) === 'true'\);\s*useEffect\(\(\) => \{\s*localStorage\.setItem\('dashboard_enableSmartSessions', enableSmartSessions\.toString\(\)\);\s*\}, \[enableSmartSessions\]\);/,
  `const enableSmartSessions = localStorage.getItem('app_enableSmartSessions') === 'true';`
);

// Replace the UI part containing the button
content = content.replace(
  /<div className="flex items-center justify-between mb-4">\s*<h4 className="text-on-surface font-bold text-base md:text-lg font-headline flex items-center gap-2">\s*<span className="material-symbols-outlined text-warning text-xl">schedule<\/span>\s*Sessões \(Top 3\)\s*<\/h4>\s*<button[\s\S]*?<\/button>\s*<\/div>/,
  `<h4 className="text-on-surface font-bold text-base md:text-lg mb-4 font-headline flex items-center gap-2">
                  <span className="material-symbols-outlined text-warning text-xl">schedule</span>
                  Sessões (Top 3)
                </h4>`
);

fs.writeFileSync(filepath, content);
console.log('Patched Dashboard UI');
