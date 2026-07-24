import fs from 'fs';

let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

const targetDropdown = `              {accounts.filter(acc => {
                if (acc.status === 'inactive') return false;`;

const replacementDropdown = `              {accounts.filter(acc => {
                if (acc.status === 'inactive') return false;
                if (acc.isHidden) return false;`;

if (content.includes(targetDropdown)) {
  content = content.replace(targetDropdown, replacementDropdown);
  fs.writeFileSync('src/components/Dashboard.tsx', content);
  console.log("Patched dropdown in Dashboard.tsx");
} else {
  console.error("Could not find targetDropdown");
}

