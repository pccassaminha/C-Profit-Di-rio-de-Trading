import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, doc, updateDoc, onSnapshot, query, orderBy, setDoc } from 'firebase/firestore';
import { useTrades } from '../hooks/useTrades';
import Modal from './Modal';
import { Users, Settings, CreditCard, Check, X, ShieldAlert, Phone, Landmark } from 'lucide-react';

export default function AdminPanel() {
  const { userPlan, globalSettings: initialSettings } = useTrades();
  const currentUser = auth.currentUser;
  
  // Super Admin check
  const isSuperAdmin = currentUser?.email === 'exportacoes.extras@gmail.com';

  const [activeTab, setActiveTab] = useState<'users' | 'payments' | 'settings'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [settings, setSettings] = useState(initialSettings || {
    whatsappNumber: '',
    iban: '',
    multicaixaEntity: '',
    multicaixaReference: '',
    showIban: true,
    showMulticaixa: true,
    multicaixaLogoUrl: ''
  });

  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
    }
  }, [initialSettings]);

  const [loading, setLoading] = useState(true);

  const isAdmin = userPlan?.role === 'admin';

  useEffect(() => {
    if (!isSuperAdmin) return;

    // Listen to users
    const unsubUsers = onSnapshot(collection(db, 'usuarios'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Listen to payments
    const qPayments = query(collection(db, 'payments'), orderBy('createdAt', 'desc'));
    const unsubPayments = onSnapshot(qPayments, (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    setLoading(false);
    return () => {
      unsubUsers();
      unsubPayments();
    };
  }, [isSuperAdmin]);

  const handleUpdateUser = async (userId: string, data: any) => {
    try {
      await updateDoc(doc(db, 'usuarios', userId), {
        ...data,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleApprovePayment = async (payment: any) => {
    try {
      // 1. Update payment status
      await updateDoc(doc(db, 'payments', payment.id), {
        status: 'approved',
        updatedAt: new Date().toISOString()
      });

      // 2. Update user plan and expiry
      const daysToAdd = payment.planId === 'anual_16' ? 365 : (payment.planId === 'semestral_6' ? 180 : 30);
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + daysToAdd);

      await updateDoc(doc(db, 'usuarios', payment.userId), {
        plan_type: payment.planId,
        expiry_date: expiryDate,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    if (!window.confirm('Tem certeza que deseja rejeitar este pagamento?')) return;
    await updateDoc(doc(db, 'payments', paymentId), {
      status: 'rejected',
      updatedAt: new Date().toISOString()
    });
  };

  const handleRevertPayment = async (paymentId: string) => {
    if (!window.confirm('Tem certeza que deseja desconfirmar este pagamento? O plano do usuário não será alterado automaticamente e deverá ser ajustado manualmente se necessário.')) return;
    await updateDoc(doc(db, 'payments', paymentId), {
      status: 'pending',
      updatedAt: new Date().toISOString()
    });
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('ALERTA: Tem certeza que deseja apagar permanentemente este usuário da plataforma?')) return;
    try {
      await updateDoc(doc(db, 'usuarios', userId), {
        status: 'deleted',
        deletedAt: new Date().toISOString()
      });
      // We do not actually delete to preserve logs, just set a deleted flag or hide them
      // Alternatively, we could delete. But for safety, soft delete is better.
      alert('Usuário marcado como apagado no sistema.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!window.confirm('Tem certeza que deseja apagar este histórico de pagamento?')) return;
    try {
      await updateDoc(doc(db, 'payments', paymentId), {
        status: 'deleted',
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSettings = async () => {
    await setDoc(doc(db, 'settings', 'global'), settings);
    alert('Configurações salvas!');
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ShieldAlert size={64} className="text-error mb-4" />
        <h2 className="text-2xl font-bold text-on-surface">Acesso Negado</h2>
        <p className="text-on-surface-variant">Você não tem permissão para acessar esta área reservada.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-3xl font-black text-on-surface font-headline italic uppercase tracking-tighter">
          Gestão <span className="text-primary italic">Business</span>
        </h2>
        
        <div className="flex p-1 bg-surface-container rounded-xl">
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'users' ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            <Users size={18} /> Usuários
          </button>
          <button 
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'payments' ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            <CreditCard size={18} /> Pagamentos
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'settings' ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            <Settings size={18} /> Configs
          </button>
        </div>
      </div>

      {activeTab === 'users' && (
        <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container text-on-surface-variant text-xs uppercase tracking-widest border-b border-outline-variant/20">
              <tr>
                <th className="p-6 font-black">Usuário</th>
                <th className="p-6 font-black">Plano</th>
                <th className="p-6 font-black">Expiração</th>
                <th className="p-6 font-black">Status</th>
                <th className="p-6 font-black">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {users.filter(u => u.status !== 'deleted').map(u => (
                <tr key={u.id} className="hover:bg-surface-container/30 transition-colors">
                  <td className="p-6">
                    <p className="font-bold text-on-surface">{u.name || 'Sem Nome'}</p>
                    <p className="text-xs text-on-surface-variant italic">{u.email}</p>
                  </td>
                  <td className="p-6">
                    <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-black uppercase">
                      {u.plan_type || 'Iniciante'}
                    </span>
                  </td>
                  <td className="p-6">
                    <p className="text-sm text-on-surface">
                      {u.expiry_date ? (u.expiry_date.toDate ? u.expiry_date.toDate() : new Date(u.expiry_date)).toLocaleDateString() : '-'}
                    </p>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2">
                       <div className={`w-2 h-2 rounded-full ${u.expiry_date && (u.expiry_date.toDate ? u.expiry_date.toDate() : new Date(u.expiry_date)) > new Date() ? 'bg-emerald-500' : 'bg-error'}`}></div>
                       <span className="text-xs font-medium">{u.expiry_date && (u.expiry_date.toDate ? u.expiry_date.toDate() : new Date(u.expiry_date)) > new Date() ? 'Ativo' : 'Inativo'}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => handleUpdateUser(u.id, { role: u.role === 'admin' ? 'user' : 'admin' })}
                        className="text-primary hover:underline text-xs font-black text-left"
                      >
                        {u.role === 'admin' ? 'Remover Admin' : 'Tornar Admin'}
                      </button>
                      <button 
                        onClick={() => handleUpdateUser(u.id, { expiry_date: new Date(Date.now() - 86400000).toISOString() })}
                        className="text-error hover:underline text-[10px] font-black uppercase text-left"
                      >
                        Desativar Acesso
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(u.id)}
                        className="text-error hover:underline text-[10px] font-black uppercase text-left opacity-30 hover:opacity-100"
                        title="Apagar Usuário Totalmente"
                      >
                        Apagar Registro
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="space-y-4">
          {payments.filter(p => p.status !== 'deleted').length > 0 ? payments.filter(p => p.status !== 'deleted').map(p => (
            <div key={p.id} className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                    p.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 
                    p.status === 'rejected' ? 'bg-error/20 text-error' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {p.status || 'Pendente'}
                  </span>
                  <span className="text-xs text-on-surface-variant font-medium">#{p.id.slice(0,8)}</span>
                </div>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-lg font-bold text-on-surface">Upgrade solicitado por {users.find(u => u.id === p.userId)?.name || p.userId}</h4>
                    <p className="text-sm text-on-surface-variant">Plano: <span className="text-on-surface font-bold uppercase tracking-widest">{p.planId?.replace('_', ' ')}</span></p>
                    <p className="text-sm font-black text-primary mt-1">{p.amount?.toLocaleString()} Kz</p>
                    <p className="text-[10px] text-on-surface-variant mt-2 font-mono opacity-50">ID Usuário: {p.userId}</p>
                  </div>
                  <p className="text-[10px] text-on-surface-variant mt-1 text-right">{new Date(p.createdAt).toLocaleString()}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {p.proofUrl && (
                  <button 
                    onClick={() => window.open(p.proofUrl, '_blank')}
                    className="flex items-center gap-2 bg-surface-container hover:bg-surface-container-high px-4 py-2 rounded-xl text-xs font-bold transition-all border border-outline-variant/20"
                  >
                    Ver Comprovativo
                  </button>
                )}
                {p.status === 'pending' && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleRejectPayment(p.id)}
                      className="p-2 rounded-xl bg-error/10 text-error hover:bg-error/20 transition-all"
                    >
                      <X size={20} />
                    </button>
                    <button 
                      onClick={() => handleApprovePayment(p)}
                      className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                    >
                      <Check size={20} />
                    </button>
                  </div>
                )}
                {p.status !== 'pending' && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleRevertPayment(p.id)}
                      className="p-2 rounded-xl bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-all opacity-50 hover:opacity-100"
                      title="Desconfirmar"
                    >
                      <X size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeletePayment(p.id)}
                      className="p-2 rounded-xl bg-error/10 text-error hover:bg-error/20 transition-all opacity-50 hover:opacity-100"
                      title="Apagar Histórico"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )) : (
            <div className="text-center p-12 bg-surface-container-low rounded-3xl border border-dashed border-outline-variant/30">
              <p className="text-on-surface-variant">Nenhum pagamento pendente no momento.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-8 max-w-2xl mx-auto shadow-xl">
          <h3 className="text-xl font-bold text-on-surface mb-8 font-headline flex items-center gap-3">
            <Landmark className="text-primary" />
            Dados para Recebimento
          </h3>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6 bg-surface-container/50 p-6 rounded-[24px] border border-outline-variant/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-on-surface">Ativar IBAN</p>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-tighter">Exibir transferência bancária</p>
                </div>
                <button 
                  onClick={() => setSettings({ ...settings, showIban: !settings.showIban })}
                  className={`w-12 h-6 rounded-full transition-all relative ${settings.showIban ? 'bg-primary' : 'bg-surface-container-high border border-outline-variant/30'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${settings.showIban ? 'right-1 bg-on-primary' : 'left-1 bg-on-surface-variant'}`}></div>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-on-surface">Ativar Multicaixa</p>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-tighter">Exibir Entidade/Referência</p>
                </div>
                <button 
                  onClick={() => setSettings({ ...settings, showMulticaixa: !settings.showMulticaixa })}
                  className={`w-12 h-6 rounded-full transition-all relative ${settings.showMulticaixa ? 'bg-primary' : 'bg-surface-container-high border border-outline-variant/30'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${settings.showMulticaixa ? 'right-1 bg-on-primary' : 'left-1 bg-on-surface-variant'}`}></div>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest pl-1">WhatsApp de Suporte</label>
              <input 
                type="text" 
                value={settings.whatsappNumber}
                onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                className="w-full bg-surface-container border border-outline-variant/20 rounded-2xl px-5 py-4 text-on-surface focus:outline-none focus:border-primary transition-all font-medium"
                placeholder="Ex: 244921319200"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest pl-1">Logo Multicaixa Express (URL)</label>
              <div className="flex gap-4 items-center">
                <input 
                  type="text" 
                  value={settings.multicaixaLogoUrl}
                  onChange={(e) => setSettings({ ...settings, multicaixaLogoUrl: e.target.value })}
                  className="flex-1 bg-surface-container border border-outline-variant/20 rounded-2xl px-5 py-4 text-on-surface focus:outline-none focus:border-primary transition-all font-medium"
                  placeholder="https://..."
                />
                {settings.multicaixaLogoUrl && (
                  <img src={settings.multicaixaLogoUrl} alt="Logo Preview" className="h-12 w-12 object-contain bg-white rounded-xl p-1" />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest pl-1">IBAN de Depósito</label>
              <input 
                type="text" 
                value={settings.iban}
                onChange={(e) => setSettings({ ...settings, iban: e.target.value })}
                className="w-full bg-surface-container border border-outline-variant/20 rounded-2xl px-5 py-4 text-on-surface focus:outline-none focus:border-primary transition-all font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest pl-1">Entidade MCX</label>
                <input 
                  type="text" 
                  value={settings.multicaixaEntity}
                  onChange={(e) => setSettings({ ...settings, multicaixaEntity: e.target.value })}
                  className="w-full bg-surface-container border border-outline-variant/20 rounded-2xl px-5 py-4 text-on-surface focus:outline-none focus:border-primary transition-all font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest pl-1">Referência MCX</label>
                <input 
                  type="text" 
                  value={settings.multicaixaReference}
                  onChange={(e) => setSettings({ ...settings, multicaixaReference: e.target.value })}
                  className="w-full bg-surface-container border border-outline-variant/20 rounded-2xl px-5 py-4 text-on-surface focus:outline-none focus:border-primary transition-all font-medium"
                />
              </div>
            </div>

            <button 
              onClick={handleSaveSettings}
              className="w-full bg-primary text-on-primary py-4 rounded-2xl font-black mt-8 hover:scale-[1.02] transition-all shadow-xl shadow-primary/30 uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <Check size={20} />
              Salvar Alterações
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
