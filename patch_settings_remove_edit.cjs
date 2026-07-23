const fs = require('fs');
let content = fs.readFileSync('src/components/Settings.tsx', 'utf8');

const targetLine = `<div key={account.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-surface-container border border-outline-variant/10 rounded-lg group relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingAccount(account);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-surface-container-highest text-on-surface-variant hover:text-primary rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10"
                    title="Editar Conta"
                  >
                    <Edit2 size={14} />
                  </button>`;

const replacement = `<div key={account.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-surface-container border border-outline-variant/10 rounded-lg group relative">`;

content = content.replace(targetLine, replacement);
fs.writeFileSync('src/components/Settings.tsx', content);
