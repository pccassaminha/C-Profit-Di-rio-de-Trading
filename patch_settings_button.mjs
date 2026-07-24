import fs from 'fs';

let content = fs.readFileSync('src/components/Settings.tsx', 'utf8');

const targetButton = `onClick={() => toggleSection('accounts')}
            className="w-full flex justify-between items-center p-6 hover:bg-surface-container-highest transition-colors text-left"`;

const replaceButton = `onClick={() => toggleSection('accounts')}
            className={\`w-full flex justify-between items-center p-6 hover:bg-surface-container-highest transition-colors text-left \${collapsedSections.accounts ? 'rounded-xl' : 'rounded-t-xl'}\`}`;

content = content.replace(targetButton, replaceButton);
fs.writeFileSync('src/components/Settings.tsx', content);
console.log("Patched button border radius");

