import React, { useState, useEffect } from 'react';
import { useCurrency } from '../contexts/CurrencyContext';
import Modal from './Modal';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';

export interface Objective {
  id: string;
  type: 'account' | 'market';
  targetId: string;
  profitTarget: string;
  maxLoss: string;
  dailyLoss: string;
}

export default function Settings() {
  const { currency, setCurrency } = useCurrency();
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [sessionType, setSessionType] = useState<'simple' | 'subdivided'>('subdivided');
  const [defaultTradeType, setDefaultTradeType] = useState<'ask' | 'forex' | 'ob'>('ask');
  const [forceShowObFilter, setForceShowObFilter] = useState(false);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [isObjectiveModalOpen, setIsObjectiveModalOpen] = useState(false);
  const [editingObjective, setEditingObjective] = useState<Objective>({
    id: '',
    type: 'market',
    targetId: 'forex',
    profitTarget: '',
    maxLoss: '',
    dailyLoss: ''
  });
  const [accounts, setAccounts] = useState<any[]>([]);
  const [sessions, setSessions] = useState([
    { id: 'asian', name: 'Sessão Asiática', start: '20:00', end: '04:00' },
    { id: 'london', name: 'Sessão de Londres', start: '03:00', end: '11:00' },
    { id: 'newyork', name: 'Sessão de Nova York', start: '08:00', end: '17:00' },
  ]);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isError?: boolean;
    confirmText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));

  useEffect(() => {
    const savedDateFormat = localStorage.getItem('app_date_format');
    if (savedDateFormat) setDateFormat(savedDateFormat);

    const savedSessionType = localStorage.getItem('app_session_type') as 'simple' | 'subdivided';
    if (savedSessionType) setSessionType(savedSessionType);

    const savedDefaultTradeType = localStorage.getItem('app_default_trade_type') as 'ask' | 'forex' | 'ob';
    if (savedDefaultTradeType) setDefaultTradeType(savedDefaultTradeType);

    const savedForceShowObFilter = localStorage.getItem('app_force_show_ob_filter');
    if (savedForceShowObFilter) setForceShowObFilter(savedForceShowObFilter === 'true');

    const savedObjectives = localStorage.getItem('app_objectives');
    if (savedObjectives) setObjectives(JSON.parse(savedObjectives));

    const savedSessions = localStorage.getItem('app_sessions');
    if (savedSessions) setSessions(JSON.parse(savedSessions));

    if (!auth.currentUser) return;

    const accountsQuery = query(collection(db, 'accounts'), where('userId', '==', auth.currentUser.uid));
    const unsubscribeAccounts = onSnapshot(accountsQuery, (snapshot) => {
      const accountsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAccounts(accountsData);
    }, (error) => {
      console.error("Error fetching accounts: ", error);
    });

    return () => {
      unsubscribeAccounts();
    };
  }, []);

  const handleSessionChange = (id: string, field: 'start' | 'end', value: string) => {
    setSessions(sessions.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleSave = () => {
    localStorage.setItem('app_date_format', dateFormat);
    localStorage.setItem('app_session_type', sessionType);
    localStorage.setItem('app_default_trade_type', defaultTradeType);
    localStorage.setItem('app_force_show_ob_filter', forceShowObFilter.toString());
    localStorage.setItem('app_objectives', JSON.stringify(objectives));
    localStorage.setItem('app_sessions', JSON.stringify(sessions));
    setModalConfig({
      isOpen: true,
      title: "Sucesso",
      message: "Configurações salvas com sucesso!",
      confirmText: "OK",
      onConfirm: closeModal
    });
  };

  const toggleAccountStatus = async (accountId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'inactive' ? 'active' : 'inactive';
      await updateDoc(doc(db, 'accounts', accountId), {
        status: newStatus
      });
    } catch (error) {
      console.error("Error updating account status: ", error);
      setModalConfig({
        isOpen: true,
        title: "Erro",
        message: "Erro ao atualizar o status da conta.",
        isError: true,
        onConfirm: closeModal
      });
    }
  };

  const handleDeleteAccount = (accountId: string) => {
    setModalConfig({
      isOpen: true,
      title: "Confirmar Exclusão",
      message: "Tem certeza que deseja excluir esta conta? Esta ação não pode ser desfeita.",
      confirmText: "Excluir",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'accounts', accountId));
          setModalConfig({
            isOpen: true,
            title: "Sucesso",
            message: "Conta excluída com sucesso!",
            confirmText: "OK",
            onConfirm: closeModal
          });
        } catch (error) {
          console.error("Error deleting account: ", error);
          setModalConfig({
            isOpen: true,
            title: "Erro",
            message: "Erro ao excluir a conta.",
            isError: true,
            onConfirm: closeModal
          });
        }
      }
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto w-full space-y-8">
      <div>
        <h2 className="text-on-surface font-bold text-2xl font-headline mb-2">Configurações</h2>
        <p className="text-on-surface-variant text-sm">Personalize suas preferências regionais e horários de operação.</p>
      </div>

      <div className="space-y-6">
        {/* Preferências Regionais */}
        <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-6">
          <h3 className="text-on-surface font-bold text-lg font-headline mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">public</span>
            Preferências Regionais
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-on-surface-variant text-xs font-bold uppercase tracking-wider">Moeda Padrão</label>
              <div className="relative">
                <select 
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant/20 text-on-surface px-4 py-3 rounded-lg text-sm outline-none appearance-none cursor-pointer focus:border-primary transition-colors"
                >
                  <option value="USD">Dólar Americano (USD)</option>
                  <option value="EUR">Euro (EUR)</option>
                  <option value="BRL">Real Brasileiro (BRL)</option>
                  <option value="GBP">Libra Esterlina (GBP)</option>
                  <option value="AOA">Kwanza Angolano (Kz)</option>
                </select>
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">expand_more</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-on-surface-variant text-xs font-bold uppercase tracking-wider">Formato de Data</label>
              <div className="relative">
                <select 
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant/20 text-on-surface px-4 py-3 rounded-lg text-sm outline-none appearance-none cursor-pointer focus:border-primary transition-colors"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY (Ex: 31/12/2026)</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY (Ex: 12/31/2026)</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (Ex: 2026-12-31)</option>
                </select>
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">expand_more</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-on-surface-variant text-xs font-bold uppercase tracking-wider">Novo Trade (Padrão)</label>
              <div className="relative">
                <select 
                  value={defaultTradeType}
                  onChange={(e) => setDefaultTradeType(e.target.value as 'ask' | 'forex' | 'ob')}
                  className="w-full bg-surface-container border border-outline-variant/20 text-on-surface px-4 py-3 rounded-lg text-sm outline-none appearance-none cursor-pointer focus:border-primary transition-colors"
                >
                  <option value="ask">Perguntar Sempre</option>
                  <option value="forex">Forex / Índices</option>
                  <option value="ob">Opções Binárias (OB)</option>
                </select>
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">expand_more</span>
              </div>
            </div>
            
            <div className="space-y-2 flex flex-col justify-center">
              <label className="text-on-surface-variant text-xs font-bold uppercase tracking-wider mb-2">Filtro de Opções Binárias</label>
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={forceShowObFilter}
                    onChange={(e) => setForceShowObFilter(e.target.checked)}
                  />
                  <div className={`block w-14 h-8 rounded-full transition-colors ${forceShowObFilter ? 'bg-primary' : 'bg-surface-container-highest'}`}></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${forceShowObFilter ? 'transform translate-x-6' : ''}`}></div>
                </div>
                <div className="ml-3 text-on-surface text-sm">
                  {forceShowObFilter ? 'Sempre visível' : 'Oculto (se não houver contas OB)'}
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Objetivos e Metas */}
        <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-on-surface font-bold text-lg font-headline flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">flag</span>
              Objetivos e Limites Mensais
            </h3>
            <button
              onClick={() => {
                setEditingObjective({
                  id: '',
                  type: 'market',
                  targetId: 'forex',
                  profitTarget: '',
                  maxLoss: '',
                  dailyLoss: ''
                });
                setIsObjectiveModalOpen(true);
              }}
              className="bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-bold hover:brightness-110 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Novo Objetivo
            </button>
          </div>

          {objectives.length === 0 ? (
            <p className="text-on-surface-variant text-sm text-center py-8">Nenhum objetivo definido. Clique em "Novo Objetivo" para começar.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {objectives.map((obj, index) => (
                <div key={index} className="bg-surface-container border border-outline-variant/20 rounded-xl p-4 relative group">
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button 
                      onClick={() => {
                        setEditingObjective(obj);
                        setIsObjectiveModalOpen(true);
                      }}
                      className="text-on-surface-variant hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                    <button 
                      onClick={() => {
                        const newObjectives = objectives.filter(o => o.id !== obj.id);
                        setObjectives(newObjectives);
                        localStorage.setItem('app_objectives', JSON.stringify(newObjectives));
                      }}
                      className="text-on-surface-variant hover:text-error transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                  
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded-md inline-flex items-center gap-1">
                      {obj.type === 'market' ? 'Mercado' : (() => {
                        const acc = accounts.find(a => a.id === obj.targetId);
                        return acc ? `Conta ${acc.accountType}` : 'Conta';
                      })()}
                    </span>
                    <h4 className="text-on-surface font-bold mt-2">
                      {obj.type === 'market' 
                        ? (obj.targetId === 'forex' ? 'Forex / Índices' : 'Opções Binárias')
                        : (() => {
                            const acc = accounts.find(a => a.id === obj.targetId);
                            return acc ? `${acc.accountNumber}` : 'Conta Desconhecida';
                          })()}
                    </h4>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Meta de Lucro:</span>
                      <span className="text-on-surface font-bold">${obj.profitTarget || '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Perda Máxima:</span>
                      <span className="text-on-surface font-bold text-error">${obj.maxLoss || '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Perda Diária:</span>
                      <span className="text-on-surface font-bold text-error">${obj.dailyLoss || '0'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sessões de Trading */}
        <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h3 className="text-on-surface font-bold text-lg font-headline flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">schedule</span>
              Horários das Sessões
            </h3>
            <div className="flex items-center gap-3">
              <label className="text-on-surface-variant text-xs font-bold uppercase tracking-wider">Tipo de Sessão (Forex)</label>
              <div className="relative">
                <select 
                  value={sessionType}
                  onChange={(e) => setSessionType(e.target.value as 'simple' | 'subdivided')}
                  className="bg-surface-container border border-outline-variant/20 text-on-surface px-4 py-2 rounded-lg text-sm outline-none appearance-none cursor-pointer focus:border-primary transition-colors pr-10"
                >
                  <option value="simple">Sessão Simples</option>
                  <option value="subdivided">Sessão Subdividida</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-sm">expand_more</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            {sessions.map(session => (
              <div key={session.id} className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-surface-container border border-outline-variant/10 rounded-lg">
                <div className="flex-1">
                  <p className="text-on-surface font-bold text-sm">{session.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-on-surface-variant text-xs">Início:</span>
                    <input 
                      type="time" 
                      value={session.start}
                      onChange={(e) => handleSessionChange(session.id, 'start', e.target.value)}
                      className="bg-surface-container-highest border border-outline-variant/20 text-on-surface px-3 py-1.5 rounded text-sm outline-none focus:border-primary transition-colors"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <span className="text-on-surface-variant">-</span>
                  <div className="flex items-center gap-2">
                    <span className="text-on-surface-variant text-xs">Fim:</span>
                    <input 
                      type="time" 
                      value={session.end}
                      onChange={(e) => handleSessionChange(session.id, 'end', e.target.value)}
                      className="bg-surface-container-highest border border-outline-variant/20 text-on-surface px-3 py-1.5 rounded text-sm outline-none focus:border-primary transition-colors"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gerenciamento de Contas */}
        <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-6">
          <h3 className="text-on-surface font-bold text-lg font-headline mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">account_balance_wallet</span>
            Gerenciamento de Contas
          </h3>
          
          <div className="space-y-4">
            {accounts.length === 0 ? (
              <p className="text-on-surface-variant text-sm">Nenhuma conta registrada.</p>
            ) : (
              accounts.map(account => (
                <div key={account.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-surface-container border border-outline-variant/10 rounded-lg">
                  <div>
                    <p className="text-on-surface font-bold text-sm">{account.accountNumber} - {account.broker}</p>
                    <p className="text-on-surface-variant text-xs">{account.accountType} | {account.phase}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleAccountStatus(account.id, account.status || 'active')}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                        (account.status || 'active') === 'active' 
                          ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' 
                          : 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20'
                      }`}
                    >
                      {(account.status || 'active') === 'active' ? 'Ativa' : 'Desativada'}
                    </button>
                    <button
                      onClick={() => handleDeleteAccount(account.id)}
                      className="p-2 rounded-lg bg-error/10 text-error hover:bg-error/20 transition-colors flex items-center justify-center"
                      title="Excluir Conta"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Salvar */}
        <div className="flex justify-end">
          <button 
            onClick={handleSave}
            className="bg-primary text-on-primary font-bold px-8 py-3 rounded-lg hover:brightness-110 transition-all flex items-center gap-2 shadow-lg shadow-primary/10"
          >
            <span className="material-symbols-outlined text-sm">save</span>
            Salvar Alterações
          </button>
        </div>
      </div>

      <Modal {...modalConfig} />

      {/* Objective Modal */}
      {isObjectiveModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-6 md:p-10 w-full max-w-lg shadow-2xl relative">
            <button 
              onClick={() => setIsObjectiveModalOpen(false)}
              className="absolute top-6 right-6 text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            
            <h2 className="text-2xl font-bold text-on-surface font-headline mb-6">
              {editingObjective.id ? 'Editar Objetivo' : 'Novo Objetivo'}
            </h2>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Tipo de Objetivo</label>
                <select 
                  value={editingObjective.type}
                  onChange={(e) => {
                    const type = e.target.value as 'market' | 'account';
                    setEditingObjective({
                      ...editingObjective,
                      type,
                      targetId: type === 'market' ? 'forex' : (accounts[0]?.id || '')
                    });
                  }}
                  className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface outline-none focus:border-primary transition-colors appearance-none"
                >
                  <option value="market">Por Mercado</option>
                  <option value="account">Por Conta</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  {editingObjective.type === 'market' ? 'Mercado' : 'Conta'}
                </label>
                <select 
                  value={editingObjective.targetId}
                  onChange={(e) => setEditingObjective({...editingObjective, targetId: e.target.value})}
                  className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface outline-none focus:border-primary transition-colors appearance-none"
                >
                  {editingObjective.type === 'market' ? (
                    <>
                      <option value="forex">Forex / Índices</option>
                      <option value="ob">Opções Binárias</option>
                    </>
                  ) : (
                    accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>Conta {acc.accountNumber}</option>
                    ))
                  )}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Meta de Lucro</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">$</span>
                  <input 
                    type="number" 
                    value={editingObjective.profitTarget}
                    onChange={(e) => setEditingObjective({...editingObjective, profitTarget: e.target.value})}
                    className="w-full bg-surface-container border border-outline-variant/20 rounded-xl pl-8 pr-4 py-3 text-on-surface outline-none focus:border-primary transition-colors" 
                    placeholder="1000" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Perda Máxima</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">$</span>
                  <input 
                    type="number" 
                    value={editingObjective.maxLoss}
                    onChange={(e) => setEditingObjective({...editingObjective, maxLoss: e.target.value})}
                    className="w-full bg-surface-container border border-outline-variant/20 rounded-xl pl-8 pr-4 py-3 text-on-surface outline-none focus:border-primary transition-colors" 
                    placeholder="400" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Perda Diária</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">$</span>
                  <input 
                    type="number" 
                    value={editingObjective.dailyLoss}
                    onChange={(e) => setEditingObjective({...editingObjective, dailyLoss: e.target.value})}
                    className="w-full bg-surface-container border border-outline-variant/20 rounded-xl pl-8 pr-4 py-3 text-on-surface outline-none focus:border-primary transition-colors" 
                    placeholder="200" 
                  />
                </div>
              </div>

              <button 
                onClick={() => {
                  let newObjectives;
                  if (editingObjective.id) {
                    newObjectives = objectives.map(o => o.id === editingObjective.id ? editingObjective : o);
                  } else {
                    newObjectives = [...objectives, { ...editingObjective, id: Date.now().toString() }];
                  }
                  setObjectives(newObjectives);
                  localStorage.setItem('app_objectives', JSON.stringify(newObjectives));
                  setIsObjectiveModalOpen(false);
                }}
                className="w-full bg-primary text-on-primary font-bold py-4 rounded-xl hover:brightness-110 transition-all shadow-lg shadow-primary/20"
              >
                Salvar Objetivo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
