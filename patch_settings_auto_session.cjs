const fs = require('fs');
const filepath = 'src/components/Settings.tsx';
let content = fs.readFileSync(filepath, 'utf8');

// Add state for enableSmartSessions
content = content.replace(
  /const \[sessionType, setSessionType\] = useState<'simple' \| 'subdivided'>\(/,
  `const [enableSmartSessions, setEnableSmartSessions] = useState(() => localStorage.getItem('app_enableSmartSessions') === 'true');
  const [sessionType, setSessionType] = useState<'simple' | 'subdivided'>(`
);

// We should also save it when the user clicks save, or just instantly save it.
// Let's instantly save it using useEffect.
content = content.replace(
  /useEffect\(\(\) => \{\s*if \(sessions\.length > 0\) \{\s*localStorage\.setItem\('app_sessions', JSON\.stringify\(sessions\)\);\s*\}\s*\}, \[sessions\]\);/g,
  `useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('app_sessions', JSON.stringify(sessions));
    }
  }, [sessions]);
  
  useEffect(() => {
    localStorage.setItem('app_enableSmartSessions', enableSmartSessions.toString());
    // Dispatch event so Dashboard knows
    window.dispatchEvent(new Event('settings_changed'));
  }, [enableSmartSessions]);`
);


// Add the UI
content = content.replace(
  /<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">\s*<div className="flex items-center gap-3">\s*<label className="text-on-surface-variant text-xs font-bold uppercase tracking-wider">Tipo de Sessão \(Forex\)<\/label>/,
  `<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center w-full justify-between">
                        <div className="flex items-center gap-3">
                          <label className="text-on-surface-variant text-xs font-bold uppercase tracking-wider">Tipo de Sessão (Forex)</label>`
);

content = content.replace(
  /<\/select>\s*<span className="material-symbols-outlined absolute right-3 top-1\/2 -translate-y-1\/2 text-on-surface-variant pointer-events-none text-sm">expand_more<\/span>\s*<\/div>\s*<\/div>\s*<\/div>/,
  `</select>
                          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-sm">expand_more</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-on-surface-variant text-xs font-bold uppercase tracking-wider">Auto-Detectar Importados</label>
                        <button 
                          onClick={() => setEnableSmartSessions(!enableSmartSessions)}
                          className={\`text-[10px] uppercase tracking-wider font-bold px-3 py-2 rounded border transition-colors \${
                            enableSmartSessions 
                              ? 'bg-primary/20 text-primary border-primary/30' 
                              : 'bg-surface-container text-on-surface-variant border-outline-variant/30 hover:bg-surface-container-high'
                          }\`}
                          title="Alternar detecção automática de sessões para trades importados"
                        >
                          Auto: {enableSmartSessions ? 'ON' : 'OFF'}
                        </button>
                      </div>
                    </div>
                  </div>`
);

fs.writeFileSync(filepath, content);
console.log('Patched Settings UI');
