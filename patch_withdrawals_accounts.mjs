import fs from 'fs';

let content = fs.readFileSync('src/components/Withdrawals.tsx', 'utf8');

const targetDropdown = `const activeAccounts = accounts.filter(a => a.status !== 'inactive');`;
const replacementDropdown = `const activeAccounts = accounts.filter(a => a.status !== 'inactive' && !a.isHidden);`;

if (content.includes(targetDropdown)) {
  content = content.replace(targetDropdown, replacementDropdown);
  fs.writeFileSync('src/components/Withdrawals.tsx', content);
  console.log("Patched Withdrawals.tsx");
}

