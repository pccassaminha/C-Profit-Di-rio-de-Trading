import fs from 'fs';

let content = fs.readFileSync('src/components/Settings.tsx', 'utf8');

const targetLabel = `<p className="text-on-surface font-bold text-sm">{account.accountNumber} - {account.broker}</p>`;
const replacementLabel = `<div className="flex items-center gap-2">
                      <p className="text-on-surface font-bold text-sm">{account.accountNumber} - {account.broker}</p>
                      {account.isHidden && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-neutral-500/20 text-neutral-400 border border-neutral-500/30">
                          Oculta
                        </span>
                      )}
                    </div>`;

if (content.includes(targetLabel)) {
  content = content.replace(targetLabel, replacementLabel);
  fs.writeFileSync('src/components/Settings.tsx', content);
  console.log("Patched Settings.tsx badge");
}

