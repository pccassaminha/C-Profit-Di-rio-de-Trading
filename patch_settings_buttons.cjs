const fs = require('fs');
let content = fs.readFileSync('src/components/Settings.tsx', 'utf8');

const targetBlock = `<div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleAccountStatus(account.id, account.status || 'active')}
                      className={\`px-4 py-2 rounded-lg text-sm font-bold transition-colors \${
                        (account.status || 'active') === 'active' 
                          ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' 
                          : 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20'
                      }\`}
                    >
                      {(account.status || 'active') === 'active' ? 'Ativa' : 'Desativada'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleResetAccountTrades(account.id);
                      }}
                      className="p-2 rounded-lg bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 transition-colors flex items-center justify-center relative group/btn-clean"
                    >
                      <Eraser className="w-[18px] h-[18px] shrink-0" />
                      <div className="absolute bottom-full right-1/2 translate-x-1/2 mb-2 w-max max-w-xs p-2 bg-surface-container-highest text-on-surface text-xs rounded shadow-xl opacity-0 hover:opacity-100 focus:opacity-100 group-hover/btn-clean:opacity-100 transition-opacity pointer-events-none z-10 border border-outline-variant/20">
                        Zerar Trades desta conta
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-surface-container-highest"></div>
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAccount(account.id);
                      }}
                      className="p-2 rounded-lg bg-error/10 text-error hover:bg-error/20 transition-colors flex items-center justify-center relative group/btn-delete"
                    >
                      <Trash2 className="text-sm" />
                      <div className="absolute bottom-full right-1/2 translate-x-1/2 mb-2 w-max max-w-xs p-2 bg-surface-container-highest text-on-surface text-xs rounded shadow-xl opacity-0 hover:opacity-100 focus:opacity-100 group-hover/btn-delete:opacity-100 transition-opacity pointer-events-none z-10 border border-outline-variant/20">
                        Excluir Conta
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-surface-container-highest"></div>
                      </div>
                    </button>
                  </div>`;

const newBlock = `<div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingAccount(account);
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-bold bg-surface-container-highest text-on-surface-variant hover:text-primary transition-colors flex items-center gap-2"
                      title="Editar Conta"
                    >
                      <Edit2 size={14} />
                      <span className="hidden sm:inline">Editar</span>
                    </button>
                    <button
                      onClick={() => toggleAccountStatus(account.id, account.status || 'active')}
                      className={\`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 \${
                        (account.status || 'active') === 'active' 
                          ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' 
                          : 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20'
                      }\`}
                    >
                      {(account.status || 'active') === 'active' ? 'Ativa' : 'Desativada'}
                    </button>
                    
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(openDropdownId === account.id ? null : account.id);
                        }}
                        className="p-2 rounded-lg bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-colors flex items-center justify-center"
                      >
                        <MoreVertical className="w-[18px] h-[18px] shrink-0" />
                      </button>
                      
                      <AnimatePresence>
                        {openDropdownId === account.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setOpenDropdownId(null)}></div>
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: 10 }}
                              className="absolute right-0 bottom-full mb-2 w-48 bg-surface-container-highest border border-outline-variant/20 rounded-xl shadow-xl overflow-hidden z-50 flex flex-col"
                            >
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
                              </button>
                              <div className="h-px w-full bg-outline-variant/10"></div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdownId(null);
                                  handleDeleteAccount(account.id);
                                }}
                                className="w-full px-4 py-3 text-left text-error hover:bg-error/10 transition-colors flex items-center gap-3 text-sm font-bold"
                              >
                                <Trash2 size={16} />
                                Excluir Conta
                              </button>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>`;

content = content.replace(targetBlock, newBlock);
fs.writeFileSync('src/components/Settings.tsx', content);
