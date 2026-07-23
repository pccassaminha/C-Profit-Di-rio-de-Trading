const fs = require('fs');
let content = fs.readFileSync('src/components/Settings.tsx', 'utf8');

const editModal = `
      {/* Edit Account Modal */}
      {editingAccount && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-6 md:p-10 w-full max-w-2xl shadow-2xl relative my-8">
            <button 
              onClick={() => setEditingAccount(null)}
              className="absolute top-6 right-6 text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <X className="" />
            </button>
            
            <h2 className="text-2xl font-bold text-on-surface font-headline mb-2">Editar Conta</h2>
            <p className="text-on-surface-variant text-sm mb-8">Atualize os detalhes da sua conta.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Número da Conta *</label>
                <input 
                  type="text" 
                  value={editingAccount.accountNumber}
                  onChange={(e) => setEditingAccount({...editingAccount, accountNumber: e.target.value})}
                  className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface outline-none focus:border-primary transition-colors" 
                  placeholder="Ex: 506460" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Corretora (Broker)</label>
                <input 
                  type="text" 
                  value={editingAccount.broker}
                  onChange={(e) => setEditingAccount({...editingAccount, broker: e.target.value})}
                  className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface outline-none focus:border-primary transition-colors" 
                  placeholder="Ex: matchtrade" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Saldo Inicial</label>
                <div className="flex gap-2">
                  <select 
                    value={editingAccount.currency}
                    onChange={(e) => setEditingAccount({...editingAccount, currency: e.target.value})}
                    className="w-1/3 bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface outline-none focus:border-primary transition-colors appearance-none"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="AOA">AOA</option>
                    <option value="BRL">BRL</option>
                  </select>
                  <input 
                    type="number" 
                    value={editingAccount.initialBalance}
                    onChange={(e) => setEditingAccount({...editingAccount, initialBalance: e.target.value})}
                    className="w-2/3 bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface outline-none focus:border-primary transition-colors" 
                    placeholder="10000" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Tipo de Conta</label>
                <select 
                  value={editingAccount.accountType}
                  onChange={(e) => setEditingAccount({...editingAccount, accountType: e.target.value})}
                  className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface outline-none focus:border-primary transition-colors appearance-none"
                >
                  <option>5K Challenge</option>
                  <option>10K Challenge</option>
                  <option>25K Challenge</option>
                  <option>50K Challenge</option>
                  <option>100K Challenge</option>
                  <option>200K Challenge</option>
                  <option>Conta Real</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Fase</label>
                <select 
                  value={editingAccount.phase}
                  onChange={(e) => setEditingAccount({...editingAccount, phase: e.target.value})}
                  className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface outline-none focus:border-primary transition-colors appearance-none"
                >
                  <option>Fase 1</option>
                  <option>Fase 2</option>
                  <option>Conta Live</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Mercado</label>
                <select 
                  value={editingAccount.tradeType || 'forex'}
                  onChange={(e) => setEditingAccount({...editingAccount, tradeType: e.target.value})}
                  className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface outline-none focus:border-primary transition-colors appearance-none"
                >
                  <option value="forex">Forex / Índices</option>
                  <option value="ob">Opções Binárias (OB)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Data de Início *</label>
                <div className="relative">
                  <input 
                    type="date" 
                    value={editingAccount.startDate || ''}
                    onChange={(e) => setEditingAccount({...editingAccount, startDate: e.target.value})}
                    className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface outline-none focus:border-primary transition-colors" 
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-10 flex justify-end gap-4">
              <button 
                onClick={() => setEditingAccount(null)}
                className="px-6 py-3 rounded-xl text-on-surface-variant font-bold hover:bg-surface-container transition-colors"
                disabled={isUpdatingAccount}
              >
                Cancelar
              </button>
              <button 
                onClick={handleUpdateAccount}
                disabled={isUpdatingAccount}
                className="px-8 py-3 rounded-xl bg-primary text-on-primary font-bold hover:brightness-110 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {isUpdatingAccount ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
`;

content = content.replace(/    <\/div>\n  \);\n}/, editModal + '\n    </div>\n  );\n}');
fs.writeFileSync('src/components/Settings.tsx', content);
