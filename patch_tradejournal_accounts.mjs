import fs from 'fs';

let content = fs.readFileSync('src/components/TradeJournal.tsx', 'utf8');

const targetDropdown = `{accounts.filter(acc => (tradeType === 'ob' ? acc.tradeType === 'ob' : acc.tradeType !== 'ob') && acc.status !== 'inactive').map(acc => (`

const replacementDropdown = `{accounts.filter(acc => (tradeType === 'ob' ? acc.tradeType === 'ob' : acc.tradeType !== 'ob') && acc.status !== 'inactive' && !acc.isHidden).map(acc => (`

if (content.includes(targetDropdown)) {
  content = content.replace(targetDropdown, replacementDropdown);
  fs.writeFileSync('src/components/TradeJournal.tsx', content);
  console.log("Patched TradeJournal dropdown 1");
}

