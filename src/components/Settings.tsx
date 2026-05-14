import React, { useState, useEffect } from 'react';
import { useCurrency } from '../contexts/CurrencyContext';
import Modal from './Modal';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, getDocs, addDoc } from 'firebase/firestore';
import { Layers, Copy, Monitor, Lock, Check, Download, CreditCard, ShieldCheck, Zap, Landmark, Smartphone, Mail, User, ChevronDown, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface Objective {
  id: string;
  type: 'account' | 'market';
  targetId: string;
  profitTarget: string;
  maxLoss: string;
  dailyLoss: string;
  maxLossPeriod?: 'Semana' | 'Mês' | 'Geral';
}

export default function Settings() {
  const { currency, setCurrency } = useCurrency();
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [sessionType, setSessionType] = useState<'simple' | 'subdivided'>('subdivided');
  const [defaultTradeType, setDefaultTradeType] = useState<'ask' | 'forex' | 'ob'>('ask');
  const [defaultCommunityFeed, setDefaultCommunityFeed] = useState<'forex' | 'ob'>('forex');
  const [showCommunityFilter, setShowCommunityFilter] = useState(true);
  const [forceShowObFilter, setForceShowObFilter] = useState(false);
  const [tokenCopiedId, setTokenCopiedId] = useState<string | null>(null);

  const handleCopyAccountToken = (token: string, id: string) => {
    navigator.clipboard.writeText(token);
    setTokenCopiedId(id);
    setTimeout(() => setTokenCopiedId(null), 2000);
  };
  const [isSaving, setIsSaving] = useState(false);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [isObjectiveModalOpen, setIsObjectiveModalOpen] = useState(false);
  const [editingObjective, setEditingObjective] = useState<Objective>({
    id: '',
    type: 'market',
    targetId: 'forex',
    profitTarget: '',
    maxLoss: '',
    dailyLoss: '',
    maxLossPeriod: 'Mês'
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
    onCancel?: () => void;
    isError?: boolean;
    confirmText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));

  const [billingName, setBillingName] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [billingPhone, setBillingPhone] = useState('');
  const [registrationId, setRegistrationId] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    billing: false,
    regional: true,
    community: true,
    objectives: true,
    sessions: true,
    platforms: true,
    accounts: true,
    dangerZone: true,
  });

  const toggleSection = (id: string) => {
    setCollapsedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Helper to get numeric ID from UID if not exists
  const getNumericId = (uid: string) => {
    return uid.split('').reduce((a, b) => a + b.charCodeAt(0), 0).toString().padStart(6, '0');
  };

  useEffect(() => {
    const savedDateFormat = localStorage.getItem('app_date_format');
    if (savedDateFormat) setDateFormat(savedDateFormat);

    const savedSessionType = localStorage.getItem('app_session_type') as 'simple' | 'subdivided';
    if (savedSessionType) setSessionType(savedSessionType);

    const savedDefaultTradeType = localStorage.getItem('app_default_trade_type') as 'ask' | 'forex' | 'ob';
    if (savedDefaultTradeType) setDefaultTradeType(savedDefaultTradeType);

    const savedDefaultFeed = localStorage.getItem('app_default_community_feed') as 'forex' | 'ob';
    if (savedDefaultFeed) setDefaultCommunityFeed(savedDefaultFeed);

    const savedShowCommFilter = localStorage.getItem('app_show_community_filter');
    if (savedShowCommFilter) setShowCommunityFilter(savedShowCommFilter === 'true');

    const savedForceShowObFilter = localStorage.getItem('app_force_show_ob_filter');
    if (savedForceShowObFilter) setForceShowObFilter(savedForceShowObFilter === 'true');

    const savedObjectives = localStorage.getItem('app_objectives');
    if (savedObjectives) setObjectives(JSON.parse(savedObjectives));

    const savedSessions = localStorage.getItem('app_sessions');
    if (savedSessions) setSessions(JSON.parse(savedSessions));

    if (!auth.currentUser) return;

    // Load User Profile / Billing Info
    const loadProfile = async () => {
      try {
        const profileDoc = await getDocs(query(collection(db, 'user_profiles'), where('userId', '==', auth.currentUser?.uid)));
        if (!profileDoc.empty) {
          const data = profileDoc.docs[0].data();
          setBillingName(data.billingName || auth.currentUser?.displayName || '');
          setBillingEmail(data.billingEmail || auth.currentUser?.email || '');
          setBillingPhone(data.billingPhone || '');
          setRegistrationId(data.registrationId || getNumericId(auth.currentUser?.uid || ''));
        } else {
          setBillingName(auth.currentUser?.displayName || '');
          setBillingEmail(auth.currentUser?.email || '');
          setRegistrationId(getNumericId(auth.currentUser?.uid || ''));
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      }
    };
    loadProfile();

    const unsubscribes: (() => void)[] = [];

    // Path 1: root accounts (old)
    const qOld = query(collection(db, 'accounts'), where('userId', '==', auth.currentUser.uid));
    const unsubOld = onSnapshot(qOld, (snapshot) => {
      const accountsOld = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      updateAccounts(accountsOld, 'old');
    });
    unsubscribes.push(unsubOld);

    // Path 2: usuarios/{uid}/accounts (new SaaS)
    const qNew = query(collection(db, 'usuarios', auth.currentUser.uid, 'accounts'));
    const unsubNew = onSnapshot(qNew, (snapshot) => {
      const accountsNew = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      updateAccounts(accountsNew, 'new');
    });
    unsubscribes.push(unsubNew);

    const accountsByPath: Record<string, any[]> = { old: [], new: [] };
    const updateAccounts = (data: any[], path: 'old' | 'new') => {
      accountsByPath[path] = data;
      const combined = [...accountsByPath.new, ...accountsByPath.old];
      const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
      setAccounts(unique);
    };

    return () => unsubscribes.forEach(unsub => unsub());
  }, []);

  const handleSessionChange = (id: string, field: 'start' | 'end', value: string) => {
    setSessions(sessions.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleSave = async () => {
    setIsSaving(true);
    localStorage.setItem('app_date_format', dateFormat);
    localStorage.setItem('app_session_type', sessionType);
    localStorage.setItem('app_default_trade_type', defaultTradeType);
    localStorage.setItem('app_default_community_feed', defaultCommunityFeed);
    localStorage.setItem('app_show_community_filter', showCommunityFilter.toString());
    localStorage.setItem('app_force_show_ob_filter', forceShowObFilter.toString());
    localStorage.setItem('app_objectives', JSON.stringify(objectives));
    localStorage.setItem('app_sessions', JSON.stringify(sessions));

    // Save Billing Profile
    if (auth.currentUser) {
      try {
        const profileQuery = query(collection(db, 'user_profiles'), where('userId', '==', auth.currentUser.uid));
        const profileSnapshot = await getDocs(profileQuery);
        
        const profileData = {
          userId: auth.currentUser.uid,
          billingName,
          billingEmail,
          billingPhone,
          registrationId: registrationId || getNumericId(auth.currentUser.uid),
          updatedAt: new Date().toISOString()
        };

        if (profileSnapshot.empty) {
          await addDoc(collection(db, 'user_profiles'), profileData);
        } else {
          const profileDocId = profileSnapshot.docs[0].id;
          await updateDoc(doc(db, 'user_profiles', profileDocId), profileData);
        }
      } catch (error) {
        console.error("Error saving profile:", error);
      }
    }

    setModalConfig({
      isOpen: true,
      title: "Sucesso",
      message: "Configurações salvas com sucesso!",
      confirmText: "OK",
      onConfirm: () => {
        closeModal();
        window.location.reload();
      }
    });
    setIsSaving(false);
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

  const handleResetSystem = () => {
    setModalConfig({
      isOpen: true,
      title: "Reiniciar Sistema",
      message: "Tem certeza que deseja apagar todos os históricos? Esta ação excluirá permanentemente todas as suas contas, trades e configurações. O sistema voltará a zero, como se fosse uma conta nova. Esta ação não pode ser desfeita.",
      confirmText: "Reiniciar Tudo",
      isError: true,
      onCancel: closeModal,
      onConfirm: async () => {
        if (!auth.currentUser) return;
        
        try {
          // Delete all trades
          const tradesQuery = query(collection(db, 'trades'), where('userId', '==', auth.currentUser.uid));
          const tradesSnapshot = await getDocs(tradesQuery);
          const deleteTradesPromises = tradesSnapshot.docs.map(tradeDoc => deleteDoc(doc(db, 'trades', tradeDoc.id)));
          await Promise.all(deleteTradesPromises);

          // Delete all accounts
          const accountsQuery = query(collection(db, 'accounts'), where('userId', '==', auth.currentUser.uid));
          const accountsSnapshot = await getDocs(accountsQuery);
          const deleteAccountsPromises = accountsSnapshot.docs.map(accDoc => deleteDoc(doc(db, 'accounts', accDoc.id)));
          await Promise.all(deleteAccountsPromises);

          // Clear local storage
          localStorage.removeItem('app_date_format');
          localStorage.removeItem('app_session_type');
          localStorage.removeItem('app_default_trade_type');
          localStorage.removeItem('app_force_show_ob_filter');
          localStorage.removeItem('app_objectives');
          localStorage.removeItem('app_sessions');
          localStorage.removeItem('app_currency');

          // Reset local state
          setDateFormat('DD/MM/YYYY');
          setSessionType('subdivided');
          setDefaultTradeType('ask');
          setForceShowObFilter(false);
          setObjectives([]);
          setSessions([
            { id: 'asian', name: 'Sessão Asiática', start: '20:00', end: '04:00' },
            { id: 'london', name: 'Sessão de Londres', start: '03:00', end: '11:00' },
            { id: 'newyork', name: 'Sessão de Nova York', start: '08:00', end: '17:00' },
          ]);
          setCurrency('USD');

          setModalConfig({
            isOpen: true,
            title: "Sucesso",
            message: "Sistema reiniciado com sucesso. Todos os dados foram apagados.",
            confirmText: "OK",
            onConfirm: closeModal
          });
        } catch (error) {
          console.error("Error resetting system: ", error);
          setModalConfig({
            isOpen: true,
            title: "Erro",
            message: "Erro ao reiniciar o sistema.",
            isError: true,
            onConfirm: closeModal
          });
        }
      }
    });
  };

  const handleResetTrades = () => {
    setModalConfig({
      isOpen: true,
      title: "Zerar Diário de Trades",
      message: "Tem certeza que deseja apagar todo o seu histórico de trades? Esta ação não pode ser desfeita.",
      confirmText: "Zerar Trades",
      isError: true,
      onCancel: closeModal,
      onConfirm: async () => {
        if (!auth.currentUser) return;
        try {
          const tradesQuery = query(collection(db, 'trades'), where('userId', '==', auth.currentUser.uid));
          const tradesSnapshot = await getDocs(tradesQuery);
          const deletePromises = tradesSnapshot.docs.map(tradeDoc => deleteDoc(doc(db, 'trades', tradeDoc.id)));
          await Promise.all(deletePromises);
          
          setModalConfig({
            isOpen: true,
            title: "Sucesso",
            message: "Diário de trades zerado com sucesso.",
            confirmText: "OK",
            onConfirm: closeModal
          });
        } catch (error) {
          console.error("Error deleting trades:", error);
          setModalConfig({
            isOpen: true,
            title: "Erro",
            message: "Erro ao zerar trades.",
            isError: true,
            onConfirm: closeModal
          });
        }
      }
    });
  };

  const handleResetAccounts = () => {
    setModalConfig({
      isOpen: true,
      title: "Zerar Contas",
      message: "Tem certeza que deseja apagar todas as suas contas? (Os trades associados ficarão sem conta de referência). Esta ação não pode ser desfeita.",
      confirmText: "Zerar Contas",
      isError: true,
      onCancel: closeModal,
      onConfirm: async () => {
        if (!auth.currentUser) return;
        try {
          const accQuery = query(collection(db, 'accounts'), where('userId', '==', auth.currentUser.uid));
          const accSnapshot = await getDocs(accQuery);
          const deletePromises = accSnapshot.docs.map(accDoc => deleteDoc(doc(db, 'accounts', accDoc.id)));
          await Promise.all(deletePromises);
          
          setModalConfig({
            isOpen: true,
            title: "Sucesso",
            message: "Contas zeradas com sucesso.",
            confirmText: "OK",
            onConfirm: closeModal
          });
        } catch (error) {
          console.error("Error deleting accounts:", error);
          setModalConfig({
            isOpen: true,
            title: "Erro",
            message: "Erro ao zerar contas.",
            isError: true,
            onConfirm: closeModal
          });
        }
      }
    });
  };

  const handleResetObjectives = () => {
    setModalConfig({
      isOpen: true,
      title: "Zerar Planos de Trade",
      message: "Tem certeza que deseja apagar todos os seus planos e objetivos? Esta ação não pode ser desfeita.",
      confirmText: "Zerar Planos",
      isError: true,
      onCancel: closeModal,
      onConfirm: () => {
        setObjectives([]);
        localStorage.removeItem('app_objectives');
        setModalConfig({
          isOpen: true,
          title: "Sucesso",
          message: "Planos zerados com sucesso.",
          confirmText: "OK",
          onConfirm: closeModal
        });
      }
    });
  };

  const handleResetAccountTrades = (accountId: string) => {
    setModalConfig({
      isOpen: true,
      title: "Zerar Histórico da Conta",
      message: "Tem certeza que deseja apagar todos os trades desta conta específica? Esta ação não pode ser desfeita.",
      confirmText: "Zerar Trades",
      isError: true,
      onCancel: closeModal,
      onConfirm: async () => {
        if (!auth.currentUser) return;
        try {
          const tradesQuery = query(collection(db, 'trades'), where('userId', '==', auth.currentUser.uid), where('accountId', '==', accountId));
          const tradesSnapshot = await getDocs(tradesQuery);
          const deletePromises = tradesSnapshot.docs.map(tradeDoc => deleteDoc(doc(db, 'trades', tradeDoc.id)));
          await Promise.all(deletePromises);
          
          setModalConfig({
            isOpen: true,
            title: "Sucesso",
            message: "Trades da conta apagados com sucesso.",
            confirmText: "OK",
            onConfirm: closeModal
          });
        } catch (error) {
          console.error("Error deleting account trades:", error);
          setModalConfig({
            isOpen: true,
            title: "Erro",
            message: "Erro ao zerar trades da conta.",
            isError: true,
            onConfirm: closeModal
          });
        }
      }
    });
  };


  const handleDeleteAccount = (accountId: string) => {
    setModalConfig({
      isOpen: true,
      title: "Confirmar Exclusão",
      message: "Tem certeza que deseja excluir esta conta? Esta ação não pode ser desfeita.",
      confirmText: "Excluir",
      onCancel: closeModal,
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

      <div className="space-y-4">
        {/* Perfil de Faturamento */}
        <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl overflow-hidden capitalize">
          <button 
            onClick={() => toggleSection('billing')}
            className="w-full flex justify-between items-center p-6 hover:bg-surface-container-highest transition-colors text-left"
          >
            <h3 className="text-on-surface font-bold text-lg font-headline flex items-center gap-2">
              <User className="text-primary" size={24} />
              Perfil de Faturamento (Dados da Fatura)
            </h3>
            <span className={`material-symbols-outlined transition-transform duration-300 ${collapsedSections.billing ? '' : 'rotate-180'}`}>
              expand_more
            </span>
          </button>
          
          <AnimatePresence>
            {!collapsedSections.billing && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                <div className="px-6 pb-6 pt-0 border-t border-outline-variant/10 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-on-surface-variant text-xs font-bold uppercase tracking-wider">Nome para Fatura</label>
                      <input 
                        type="text"
                        value={billingName}
                        onChange={(e) => setBillingName(e.target.value)}
                        placeholder="Nome Completo"
                        className="w-full bg-surface-container border border-outline-variant/20 text-on-surface px-4 py-3 rounded-lg text-sm outline-none focus:border-primary transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-on-surface-variant text-xs font-bold uppercase tracking-wider">Email de Faturamento</label>
                      <input 
                        type="email"
                        value={billingEmail}
                        onChange={(e) => setBillingEmail(e.target.value)}
                        placeholder="email@exemplo.com"
                        className="w-full bg-surface-container border border-outline-variant/20 text-on-surface px-4 py-3 rounded-lg text-sm outline-none focus:border-primary transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-on-surface-variant text-xs font-bold uppercase tracking-wider">Telemóvel (WhatsApp)</label>
                      <input 
                        type="text"
                        value={billingPhone}
                        onChange={(e) => setBillingPhone(e.target.value)}
                        placeholder="+244 9..."
                        className="w-full bg-surface-container border border-outline-variant/20 text-on-surface px-4 py-3 rounded-lg text-sm outline-none focus:border-primary transition-colors font-mono"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-on-surface-variant mt-4 italic lowercase">
                    * estes dados serão utilizados para gerar os detalhes das suas faturas e recibos de pagamento.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Preferências Regionais */}
        <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl overflow-hidden">
          <button 
            onClick={() => toggleSection('regional')}
            className="w-full flex justify-between items-center p-6 hover:bg-surface-container-highest transition-colors text-left"
          >
            <h3 className="text-on-surface font-bold text-lg font-headline flex items-center gap-2">
              <Landmark className="text-primary" size={24} />
              Preferências Regionais
            </h3>
            <span className={`material-symbols-outlined transition-transform duration-300 ${collapsedSections.regional ? '' : 'rotate-180'}`}>
              expand_more
            </span>
          </button>
          
          <AnimatePresence>
            {!collapsedSections.regional && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                <div className="px-6 pb-6 pt-0 border-t border-outline-variant/10 mt-6">
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Preferências da Comunidade */}
        <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl overflow-hidden">
          <button 
            onClick={() => toggleSection('community')}
            className="w-full flex justify-between items-center p-6 hover:bg-surface-container-highest transition-colors text-left"
          >
            <h3 className="text-on-surface font-bold text-lg font-headline flex items-center gap-2">
              <Mail className="text-primary" size={24} />
              Preferências da Comunidade
            </h3>
            <span className={`material-symbols-outlined transition-transform duration-300 ${collapsedSections.community ? '' : 'rotate-180'}`}>
              expand_more
            </span>
          </button>
          
          <AnimatePresence>
            {!collapsedSections.community && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                <div className="px-6 pb-6 pt-0 border-t border-outline-variant/10 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-on-surface-variant text-xs font-bold uppercase tracking-wider">Feed Padrão</label>
                        <div className="relative">
                          <select 
                            value={defaultCommunityFeed}
                            onChange={(e) => setDefaultCommunityFeed(e.target.value as 'forex' | 'ob')}
                            className="w-full bg-surface-container border border-outline-variant/20 text-on-surface px-4 py-3 rounded-lg text-sm outline-none appearance-none cursor-pointer focus:border-primary transition-colors"
                          >
                            <option value="forex">Forex & Índices</option>
                            <option value="ob">Opções Binárias (OB)</option>
                          </select>
                          <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">expand_more</span>
                        </div>
                      </div>

                      <div className="space-y-2 flex flex-col justify-center">
                        <label className="text-on-surface-variant text-xs font-bold uppercase tracking-wider mb-2">Seletor de Feed</label>
                        <label className="flex items-center cursor-pointer">
                          <div className="relative">
                            <input 
                              type="checkbox" 
                              className="sr-only" 
                              checked={showCommunityFilter}
                              onChange={(e) => setShowCommunityFilter(e.target.checked)}
                            />
                            <div className={`block w-14 h-8 rounded-full transition-colors ${showCommunityFilter ? 'bg-primary' : 'bg-surface-container-highest'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${showCommunityFilter ? 'transform translate-x-6' : ''}`}></div>
                          </div>
                          <div className="ml-3 text-on-surface text-sm">
                            {showCommunityFilter ? 'Mostrar no feed' : 'Ocultar (fixar feed padrão)'}
                          </div>
                        </label>
                      </div>
                    </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Objetivos e Metas */}
        <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl overflow-hidden">
          <button 
            onClick={() => toggleSection('objectives')}
            className="w-full flex justify-between items-center p-6 hover:bg-surface-container-highest transition-colors text-left"
          >
            <h3 className="text-on-surface font-bold text-lg font-headline flex items-center gap-2">
              <Zap className="text-primary" size={24} />
              Objetivos e Limites Mensais
            </h3>
            <span className={`material-symbols-outlined transition-transform duration-300 ${collapsedSections.objectives ? '' : 'rotate-180'}`}>
              expand_more
            </span>
          </button>
          
          <AnimatePresence>
            {!collapsedSections.objectives && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                <div className="px-6 pb-6 pt-0 border-t border-outline-variant/10">
                  <div className="flex justify-end mb-6 mt-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingObjective({
                          id: '',
                          type: 'market',
                          targetId: 'forex',
                          profitTarget: '',
                          maxLoss: '',
                          dailyLoss: '',
                          maxLossPeriod: 'Mês'
                        });
                        setIsObjectiveModalOpen(true);
                      }}
                      className="bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-bold hover:brightness-110 transition-all flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                      Novo Objetivo
                    </button>
                  </div>

                  <div className="mt-0">
                    {objectives.length === 0 ? (
                        <p className="text-on-surface-variant text-sm text-center py-8">Nenhum objetivo definido. Clique em "Novo Objetivo" para começar.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {objectives.map((obj) => (
                            <div key={obj.id} className="bg-surface-container border border-outline-variant/20 rounded-xl p-4 relative group">
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
                                  <span className="text-on-surface font-bold text-secondary font-mono">${obj.profitTarget || '0'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-on-surface-variant">Perda Máxima {obj.maxLossPeriod ? `(${obj.maxLossPeriod})` : '(Mês)'}:</span>
                                  <span className="text-on-surface font-bold text-error font-mono">${obj.maxLoss || '0'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-on-surface-variant">Perda Diária:</span>
                                  <span className="text-on-surface font-bold text-error font-mono">${obj.dailyLoss || '0'}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sessões de Trading */}
        <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl overflow-hidden mt-4">
          <button 
            onClick={() => toggleSection('sessions')}
            className="w-full flex justify-between items-center p-6 hover:bg-surface-container-highest transition-colors text-left"
          >
            <h3 className="text-on-surface font-bold text-lg font-headline flex items-center gap-2">
              <Smartphone className="text-primary" size={24} />
              Horários das Sessões
            </h3>
            <span className={`material-symbols-outlined transition-transform duration-300 ${collapsedSections.sessions ? '' : 'rotate-180'}`}>
              expand_more
            </span>
          </button>
          
          <AnimatePresence>
            {!collapsedSections.sessions && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                <div className="px-6 pb-6 pt-0 border-t border-outline-variant/10 mt-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
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
                    
                    <div className="space-y-2">
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Conectar Plataformas */}
        <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl overflow-hidden mt-4">
          <button 
            onClick={() => toggleSection('platforms')}
            className="w-full flex justify-between items-center p-6 hover:bg-surface-container-highest transition-colors text-left"
          >
            <h3 className="text-on-surface font-bold text-lg font-headline flex items-center gap-2">
              <Layers className="text-primary" size={24} />
              Conectar Plataformas
            </h3>
            <span className={`material-symbols-outlined transition-transform duration-300 ${collapsedSections.platforms ? '' : 'rotate-180'}`}>
              expand_more
            </span>
          </button>
          
          <AnimatePresence>
            {!collapsedSections.platforms && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                <div className="px-6 pb-6 pt-0 border-t border-outline-variant/10 mt-6 md:mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            {/* Card MetaTrader 5 */}
            <div className="bg-surface-container border border-outline-variant/10 p-6 rounded-2xl">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <User className="text-primary" size={24} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-lg text-on-surface">Conta Profissional</span>
                    <span className="text-[10px] text-on-surface-variant uppercase font-black tracking-widest">ID Registro: <span className="text-primary">#{registrationId}</span></span>
                  </div>
                </div>
                <span className="text-[10px] bg-secondary/20 text-secondary px-2 py-1 rounded-full uppercase font-bold tracking-wider">
                  Membro Ativo
                </span>
              </div>
              
              <div className="space-y-4">
                <div className="bg-surface-container-high p-4 rounded-xl border border-outline-variant/10">
                  <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 flex items-center gap-2">
                    <ShieldCheck size={10} />
                    Verificação e Segurança
                  </p>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed">
                    Agora cada conta possui seu próprio <span className="text-primary font-bold">Token de Integração Único</span>. 
                    Isto garante que os seus trades sejam registados na conta correta e com total segurança.
                  </p>
                  <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
                    <p className="text-[9px] text-primary font-black uppercase mb-1">Como configurar:</p>
                    <p className="text-[10px] text-on-surface-variant italic">
                      Vá à seção "Gerenciamento de Contas" abaixo e copie o Token específico da conta que deseja sincronizar.
                    </p>
                  </div>
                </div>
                
                <p className="text-[10px] text-on-surface-variant italic leading-tight group-hover:text-on-surface transition-colors">
                  Utilize este Token no C-Profit Bridge para sincronizar trades automaticamente do MetaTrader 5 para o seu diário.
                </p>
              </div>
                
                <div className="mt-4 flex flex-col sm:flex-row gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-2 h-2 rounded-full bg-secondary"></div>
                    <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">Sincronizado</span>
                  </div>
                  <button 
                    className="flex items-center gap-2 bg-primary/20 text-primary px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary/30 transition-all border border-primary/20"
                    onClick={() => window.open('https://github.com/your-username/c-profit-bridge/releases/latest/download/bridge.exe', '_blank')}
                  >
                    <Download size={14} />
                    Download Bridge (.exe)
                  </button>
                </div>
              </div>

              {/* Card MatchTrader - EM BREVE */}
              <div className="bg-surface-container/50 border border-outline-variant/5 border-dashed p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-4 right-4 rotate-12 bg-amber-500 text-black text-[10px] font-black px-4 py-1 rounded shadow-lg z-10 transition-transform group-hover:scale-110">
                  EM BREVE
                </div>
                
                <div className="flex items-center gap-3 mb-4 opacity-50">
                  <div className="p-2 bg-surface-container-highest rounded-lg">
                    <Lock className="text-on-surface-variant" size={24} />
                  </div>
                  <span className="font-bold text-lg text-on-surface-variant">MatchTrader</span>
                </div>
                
                <p className="text-xs text-on-surface-variant/60">A integração direta com a plataforma MatchTrader está em fase de desenvolvimento e será libertada em breve para todos os utilizadores.</p>
                
                <div className="mt-4 flex items-center gap-2 opacity-30">
                  <div className="w-2 h-2 rounded-full bg-on-surface-variant"></div>
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Desconectado</span>
                </div>
              </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

        {/* Gerenciamento de Contas */}
        <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl overflow-hidden mt-4">
          <button 
            onClick={() => toggleSection('accounts')}
            className="w-full flex justify-between items-center p-6 hover:bg-surface-container-highest transition-colors text-left"
          >
            <h3 className="text-on-surface font-bold text-lg font-headline flex items-center gap-2">
              <Landmark className="text-primary" size={24} />
              Gerenciamento de Contas
            </h3>
            <span className={`material-symbols-outlined transition-transform duration-300 ${collapsedSections.accounts ? '' : 'rotate-180'}`}>
              expand_more
            </span>
          </button>
          
          <AnimatePresence>
            {!collapsedSections.accounts && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                <div className="px-6 pb-6 pt-0 border-t border-outline-variant/10 mt-6 md:mt-0">
                  <div className="space-y-4 mt-4">
            {accounts.length === 0 ? (
              <p className="text-on-surface-variant text-sm">Nenhuma conta registrada.</p>
            ) : (
              accounts.map(account => (
                <div key={account.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-surface-container border border-outline-variant/10 rounded-lg">
                  <div className="flex flex-col gap-1 flex-1">
                    <p className="text-on-surface font-bold text-sm">{account.accountNumber} - {account.broker}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-on-surface-variant text-[10px] uppercase font-bold tracking-tight">{account.accountType} | {account.phase}</p>
                      {account.tradeType !== 'ob' && (
                        account.integrationToken ? (
                          <div className="flex items-center gap-1.5 ml-2 bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                            <span className="text-[9px] font-black text-primary uppercase">Token:</span>
                            <code className="text-[10px] font-mono text-primary font-bold">{account.integrationToken}</code>
                            <button 
                              onClick={() => handleCopyAccountToken(account.integrationToken, account.id)}
                              className="text-primary hover:scale-110 transition-transform"
                            >
                              {tokenCopiedId === account.id ? <Check size={10} /> : <Copy size={10} />}
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={async () => {
                              const newToken = Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
                              try {
                                // Try both paths for update
                                try {
                                  await updateDoc(doc(db, 'accounts', account.id), {
                                    integrationToken: newToken
                                  });
                                } catch (e) {
                                  await updateDoc(doc(db, 'usuarios', auth.currentUser!.uid, 'accounts', account.id), {
                                    integrationToken: newToken
                                  });
                                }
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                            className="ml-2 text-[9px] font-black text-secondary uppercase bg-secondary/10 px-2 py-0.5 rounded-md border border-secondary/20 hover:bg-secondary/20 transition-colors"
                          >
                            Gerar Token
                          </button>
                        )
                      )}
                    </div>
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleResetAccountTrades(account.id);
                      }}
                      className="p-2 rounded-lg bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 transition-colors flex items-center justify-center relative group/btn-clean"
                    >
                      <span className="material-symbols-outlined text-sm">mop</span>
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
                      <span className="material-symbols-outlined text-sm">delete</span>
                      <div className="absolute bottom-full right-1/2 translate-x-1/2 mb-2 w-max max-w-xs p-2 bg-surface-container-highest text-on-surface text-xs rounded shadow-xl opacity-0 hover:opacity-100 focus:opacity-100 group-hover/btn-delete:opacity-100 transition-opacity pointer-events-none z-10 border border-outline-variant/20">
                        Excluir Conta
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-surface-container-highest"></div>
                      </div>
                    </button>
                  </div>
                </div>
              ))
            )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Salvar */}
        <div className="flex justify-end">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-primary text-on-primary font-bold px-8 py-3 rounded-lg hover:brightness-110 transition-all flex items-center gap-2 shadow-lg shadow-primary/10 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">{isSaving ? 'sync' : 'save'}</span>
            {isSaving ? 'A guardar...' : 'Salvar Alterações'}
          </button>
        </div>

        {/* Reiniciar Sistema */}
        <div className="bg-error/5 border border-error/20 rounded-xl overflow-hidden mt-8">
          <button 
            onClick={() => toggleSection('dangerZone')}
            className="w-full flex justify-between items-center p-6 hover:bg-error/10 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-error" size={24} />
              <div>
                <h3 className="text-error font-bold text-lg font-headline mb-0">
                  Zona de Perigo
                </h3>
                <p className="text-error/60 text-xs lowercase">Ações destrutivas que não podem ser desfeitas.</p>
              </div>
            </div>
            <span className={`material-symbols-outlined text-error transition-transform duration-300 ${collapsedSections.dangerZone ? '' : 'rotate-180'}`}>
              expand_more
            </span>
          </button>
          
          <AnimatePresence>
            {!collapsedSections.dangerZone && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                <div className="px-6 pb-6 pt-0 border-t border-error/10 mt-6 md:mt-0">
                  <div className="flex flex-col md:flex-row gap-4 pt-6">
                    <div className="relative group/btn-accounts flex-1">
                      <button 
                        onClick={handleResetAccounts}
                        className="bg-error/10 text-error font-bold px-6 py-3 rounded-lg hover:bg-error/20 transition-all flex border border-error/20 items-center justify-center gap-2 w-full h-full"
                      >
                        <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
                        Zerar Contas
                      </button>
                      <div className="absolute bottom-full right-0 md:left-1/2 md:-translate-x-1/2 mb-2 w-64 p-3 bg-surface-container-highest text-on-surface text-xs rounded-lg shadow-xl opacity-0 hover:opacity-100 focus:opacity-100 group-hover/btn-accounts:opacity-100 transition-opacity pointer-events-none z-10 border border-outline-variant/20">
                        <p className="font-bold mb-1">Atenção!</p>
                        <p>Apaga o histórico das contas criadas. Seus trades e diário continuam lá, mas ficam "órfãos" sem uma conta associada.</p>
                        <div className="absolute -bottom-2 right-6 md:left-1/2 md:-translate-x-1/2 border-8 border-transparent border-t-surface-container-highest"></div>
                      </div>
                    </div>
                    <div className="relative group/btn-trades flex-1">
                      <button 
                        onClick={handleResetTrades}
                        className="bg-error/10 text-error font-bold px-6 py-3 rounded-lg hover:bg-error/20 transition-all flex border border-error/20 items-center justify-center gap-2 w-full h-full"
                      >
                        <span className="material-symbols-outlined text-sm">receipt_long</span>
                        Zerar Diário
                      </button>
                      <div className="absolute bottom-full right-0 md:left-1/2 md:-translate-x-1/2 mb-2 w-64 p-3 bg-surface-container-highest text-on-surface text-xs rounded-lg shadow-xl opacity-0 hover:opacity-100 focus:opacity-100 group-hover/btn-trades:opacity-100 transition-opacity pointer-events-none z-10 border border-outline-variant/20">
                        <p className="font-bold mb-1">Atenção!</p>
                        <p>Apaga permanentemente todo o histórico de operações do seu Diário de Trades. Suas contas e planos permanecerão intactos.</p>
                        <div className="absolute -bottom-2 right-6 md:left-1/2 md:-translate-x-1/2 border-8 border-transparent border-t-surface-container-highest"></div>
                      </div>
                    </div>
                    <div className="relative group/btn-plans flex-1">
                      <button 
                        onClick={handleResetObjectives}
                        className="bg-error/10 text-error font-bold px-6 py-3 rounded-lg hover:bg-error/20 transition-all flex border border-error/20 items-center justify-center gap-2 w-full h-full"
                      >
                        <span className="material-symbols-outlined text-sm">flag</span>
                        Zerar Planos
                      </button>
                      <div className="absolute bottom-full right-0 md:left-1/2 md:-translate-x-1/2 mb-2 w-64 p-3 bg-surface-container-highest text-on-surface text-xs rounded-lg shadow-xl opacity-0 hover:opacity-100 focus:opacity-100 group-hover/btn-plans:opacity-100 transition-opacity pointer-events-none z-10 border border-outline-variant/20">
                        <p className="font-bold mb-1">Atenção!</p>
                        <p>Exclui todas as regras, objetivos financeiros e planos de trading registrados no sistema.</p>
                        <div className="absolute -bottom-2 right-6 md:left-1/2 md:-translate-x-1/2 border-8 border-transparent border-t-surface-container-highest"></div>
                      </div>
                    </div>
                    <div className="relative group/btn-system flex-1">
                      <button 
                        onClick={handleResetSystem}
                        className="bg-error text-on-error font-bold px-6 py-3 rounded-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg shadow-error/20 w-full h-full"
                      >
                        <span className="material-symbols-outlined text-sm">delete_forever</span>
                        Reiniciar Sistema
                      </button>
                      <div className="absolute bottom-full right-0 md:left-1/2 md:-translate-x-1/2 mb-2 w-64 p-3 bg-surface-container-highest text-on-surface text-xs rounded-lg shadow-xl opacity-0 hover:opacity-100 focus:opacity-100 group-hover/btn-system:opacity-100 transition-opacity pointer-events-none z-10 border border-outline-variant/20">
                        <p className="font-bold mb-1">Atenção!</p>
                        <p>Esta função é drástica. Apagará todos os históricos de registro de contas, trades e todas as informações ligadas ao diário. O sistema voltará a zero.</p>
                        <div className="absolute -bottom-2 right-6 md:left-1/2 md:-translate-x-1/2 border-8 border-transparent border-t-surface-container-highest"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">$</span>
                    <input 
                      type="number" 
                      value={editingObjective.maxLoss}
                      onChange={(e) => setEditingObjective({...editingObjective, maxLoss: e.target.value})}
                      className="w-full bg-surface-container border border-outline-variant/20 rounded-xl pl-8 pr-4 py-3 text-on-surface outline-none focus:border-primary transition-colors" 
                      placeholder="400" 
                    />
                  </div>
                  <div className="relative w-1/3">
                    <select 
                      value={editingObjective.maxLossPeriod || 'Mês'}
                      onChange={(e) => setEditingObjective({...editingObjective, maxLossPeriod: e.target.value as 'Semana' | 'Mês' | 'Geral'})}
                      className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface outline-none focus:border-primary transition-colors appearance-none"
                    >
                      <option value="Mês">Por Mês</option>
                      <option value="Semana">Por Semana</option>
                      <option value="Geral">Geral</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">expand_more</span>
                  </div>
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
