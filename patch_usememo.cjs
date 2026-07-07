const fs = require('fs');
const filepath = 'src/components/Dashboard.tsx';
let content = fs.readFileSync(filepath, 'utf8');

content = content.replace(
  /}, \[selectedAccount, calendarDate, accounts, trades, analysisDateRange, tradeTypeFilter, objectives, withdrawals\]\);/g,
  `}, [selectedAccount, calendarDate, accounts, trades, analysisDateRange, tradeTypeFilter, objectives, withdrawals, enableSmartSessions]);`
);

fs.writeFileSync(filepath, content);
console.log('Patched useMemo dependencies');
