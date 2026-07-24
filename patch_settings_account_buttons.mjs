import fs from 'fs';

let content = fs.readFileSync('src/components/Settings.tsx', 'utf8');

const targetToRemove = `                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingAccount(account);
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-bold bg-surface-container-highest text-on-surface-variant hover:text-primary transition-colors flex items-center gap-2"
                      title="Editar Conta"
                    >
                      <Edit2 size={14} />
                      <span className="hidden sm:inline">Editar</span>
                    </button>`;

content = content.replace(targetToRemove, "");

const oldDropdownOptions = `                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdownId(null);
                                  handleResetAccountTrades(account.id);
                                }}
                                className="w-full px-4 py-3 text-left text-orange-500 hover:bg-orange-500/10 transition-colors flex items-center gap-3 text-sm font-bold"
                              >
                                <Eraser size={16} />
                                Zerar Trades
                              </button>`;

const newDropdownOptions = `                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdownId(null);
                                  setEditingAccount(account);
                                }}
                                className="w-full px-4 py-3 text-left text-on-surface hover:bg-surface-container-highest transition-colors flex items-center gap-3 text-sm font-bold"
                              >
                                <Edit2 size={16} />
                                Editar Conta
                              </button>
                              <div className="h-px w-full bg-outline-variant/10"></div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdownId(null);
                                  toggleAccountHidden(account.id, !!account.isHidden);
                                }}
                                className="w-full px-4 py-3 text-left text-on-surface hover:bg-surface-container-highest transition-colors flex items-center gap-3 text-sm font-bold"
                              >
                                {account.isHidden ? <Eye size={16} /> : <EyeOff size={16} />}
                                {account.isHidden ? 'Reativar Conta' : 'Ocultar Conta'}
                              </button>
                              <div className="h-px w-full bg-outline-variant/10"></div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdownId(null);
                                  handleResetAccountTrades(account.id);
                                }}
                                className="w-full px-4 py-3 text-left text-orange-500 hover:bg-orange-500/10 transition-colors flex items-center gap-3 text-sm font-bold"
                              >
                                <Eraser size={16} />
                                Zerar Trades
                              </button>`;

content = content.replace(oldDropdownOptions, newDropdownOptions);

fs.writeFileSync('src/components/Settings.tsx', content);
