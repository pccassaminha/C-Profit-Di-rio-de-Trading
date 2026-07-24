import fs from 'fs';

let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

const targetVisibleAccounts = `    const visibleAccounts = accounts.filter(a => {
      const accTradeType = a.tradeType || 'forex';
      if (visibleMarkets === 'forex' && accTradeType === 'ob') return false;
      if (visibleMarkets === 'ob' && accTradeType !== 'ob') return false;
      return true;
    });`;

const replacementVisibleAccounts = `    const visibleAccounts = accounts.filter(a => {
      if (a.isHidden) return false;
      const accTradeType = a.tradeType || 'forex';
      if (visibleMarkets === 'forex' && accTradeType === 'ob') return false;
      if (visibleMarkets === 'ob' && accTradeType !== 'ob') return false;
      return true;
    });`;

if (content.includes(targetVisibleAccounts)) {
  content = content.replace(targetVisibleAccounts, replacementVisibleAccounts);
  fs.writeFileSync('src/components/Dashboard.tsx', content);
  console.log("Patched visibleAccounts in Dashboard.tsx");
} else {
  console.error("Could not find targetVisibleAccounts");
}

