const fs = require('fs');

const filepath = 'src/components/Dashboard.tsx';
let content = fs.readFileSync(filepath, 'utf8');

// 1. Add state variable
content = content.replace(
  /const \[tradeTypeFilter, setTradeTypeFilter\] = useState/,
  `const [enableSmartSessions, setEnableSmartSessions] = useState(() => localStorage.getItem('dashboard_enableSmartSessions') === 'true');
  useEffect(() => {
    localStorage.setItem('dashboard_enableSmartSessions', enableSmartSessions.toString());
  }, [enableSmartSessions]);
  const [tradeTypeFilter, setTradeTypeFilter] = useState`
);

// 2. Modify sessionsMap tracking
content = content.replace(
  /if \(trade\.session\) {\s*if \(\!sessionsMap\[trade\.session\]\) sessionsMap\[trade\.session\] = \{ pnl: 0, wins: 0, total: 0 \};\s*sessionsMap\[trade\.session\]\.total \+= 1;\s*sessionsMap\[trade\.session\]\.pnl \+= trade\.pnl;\s*if \(trade\.pnl > 0\) sessionsMap\[trade\.session\]\.wins \+= 1;\s*}/g,
  `if (trade.session) {
        const isImported = trade.source && (trade.source.includes('HTML') || trade.source.includes('CSV'));
        if (enableSmartSessions || !isImported) {
          if (!sessionsMap[trade.session]) sessionsMap[trade.session] = { pnl: 0, wins: 0, total: 0 };
          sessionsMap[trade.session].total += 1;
          sessionsMap[trade.session].pnl += trade.pnl;
          if (trade.pnl > 0) sessionsMap[trade.session].wins += 1;
        }
      }`
);

// 3. Modify analysisSessionsMap tracking
content = content.replace(
  /if \(trade\.session\) {\s*if \(\!analysisSessionsMap\[trade\.session\]\) analysisSessionsMap\[trade\.session\] = \{ pnl: 0, wins: 0, total: 0 \};\s*analysisSessionsMap\[trade\.session\]\.total \+= 1;\s*analysisSessionsMap\[trade\.session\]\.pnl \+= trade\.pnl;\s*if \(trade\.pnl > 0\) analysisSessionsMap\[trade\.session\]\.wins \+= 1;\s*}/g,
  `if (trade.session) {
          const isImported = trade.source && (trade.source.includes('HTML') || trade.source.includes('CSV'));
          if (enableSmartSessions || !isImported) {
            if (!analysisSessionsMap[trade.session]) analysisSessionsMap[trade.session] = { pnl: 0, wins: 0, total: 0 };
            analysisSessionsMap[trade.session].total += 1;
            analysisSessionsMap[trade.session].pnl += trade.pnl;
            if (trade.pnl > 0) analysisSessionsMap[trade.session].wins += 1;
          }
        }`
);

// 4. Modify UI in Quadrant 3
content = content.replace(
  /<h4 className="text-on-surface font-bold text-base md:text-lg mb-4 font-headline flex items-center gap-2">\s*<span className="material-symbols-outlined text-warning text-xl">schedule<\/span>\s*Sessões \(Top 3\)\s*<\/h4>/,
  `<div className="flex items-center justify-between mb-4">
                  <h4 className="text-on-surface font-bold text-base md:text-lg font-headline flex items-center gap-2">
                    <span className="material-symbols-outlined text-warning text-xl">schedule</span>
                    Sessões (Top 3)
                  </h4>
                  <button 
                    onClick={() => setEnableSmartSessions(!enableSmartSessions)}
                    className={\`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded border transition-colors \${
                      enableSmartSessions 
                        ? 'bg-primary/20 text-primary border-primary/30' 
                        : 'bg-surface-container text-on-surface-variant border-outline-variant/30 hover:bg-surface-container-high'
                    }\`}
                    title="Alternar sessões automáticas para trades importados"
                  >
                    Auto: {enableSmartSessions ? 'ON' : 'OFF'}
                  </button>
                </div>`
);

fs.writeFileSync(filepath, content);
console.log('Patched sessions in Dashboard');
