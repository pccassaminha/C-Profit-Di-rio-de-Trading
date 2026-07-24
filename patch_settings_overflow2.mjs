import fs from 'fs';

let content = fs.readFileSync('src/components/Settings.tsx', 'utf8');

const target = `{/* Gerenciamento de Contas */}
        <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl overflow-hidden mt-4">`;

const replacement = `{/* Gerenciamento de Contas */}
        <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl mt-4">`;

content = content.replace(target, replacement);

fs.writeFileSync('src/components/Settings.tsx', content);
console.log("Patched accounts overflow");

