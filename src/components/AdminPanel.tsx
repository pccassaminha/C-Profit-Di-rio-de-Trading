import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, doc, updateDoc, onSnapshot, query, orderBy, setDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { useTrades } from '../hooks/useTrades';
import Modal from './Modal';
import { Users, Settings, CreditCard, Check, X, ShieldAlert, Phone, Landmark, Ticket } from 'lucide-react';

export default function AdminPanel() {
  const { userPlan, globalSettings: initialSettings } = useTrades();
  const currentUser = auth.currentUser;
  
  // Super Admin check
  const isSuperAdmin = currentUser?.email === 'exportacoes.extras@gmail.com';

  const [activeTab, setActiveTab] = useState<'users' | 'payments' | 'settings' | 'coupons' | 'broadcast' | 'maestros'>('users');
  const [editingUser, setEditingUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [settings, setSettings] = useState(initialSettings || {
    whatsappNumber: '',
    iban: '',
    ibanName: '',
    multicaixaEntity: '',
    multicaixaReference: '',
    multicaixaName: '',
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

  const getInitials = (name?: string) => {
    if (!name) return 'US';
    const parts = name.trim().split(' ');
    const first = parts[0]?.[0] || 'U';
    const second = parts.length > 1 ? parts[1]?.[0] : (parts[0]?.[1] || 'S');
    return (first + second).toUpperCase();
  };

  const getUserDisplayId = (uid: string) => {
    const sortedUsers = [...users].sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    const index = sortedUsers.findIndex(u => u.id === uid);
    const numericStr = String(1000 + (index >= 0 ? index : users.length));
    const user = users.find(u => u.id === uid);
    return `${getInitials(user?.name)}${numericStr}`;
  };

  const getPaymentDisplayId = (paymentId: string) => {
    const sortedPayments = [...payments].sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    const index = sortedPayments.findIndex(p => p.id === paymentId);
    const numericStr = String(1000 + (index >= 0 ? index : payments.length));
    return `PG${numericStr}`;
  };

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

    // Listen to coupons
    const qCoupons = query(collection(db, 'coupons'));
    const unsubCoupons = onSnapshot(qCoupons, (snapshot) => {
      setCoupons(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    setLoading(false);
    return () => {
      unsubUsers();
      unsubPayments();
      unsubCoupons();
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

  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim()) return alert('Digite uma mensagem.');
    try {
      await addDoc(collection(db, 'broadcasts'), {
        message: broadcastMessage,
        createdAt: new Date().toISOString(),
        author: currentUser?.displayName || 'Admin'
      });
      setBroadcastMessage('');
      alert('Comunicado enviado à comunidade com sucesso!');
    } catch (e) {
      console.error(e);
      alert('Erro ao enviar comunicado.');
    }
  };

  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discountType: 'percentage', // 'percentage' | 'fixed'
    discountValue: '',
    targetPlan: 'all', // 'all', 'mensal_6', 'trimestral_6', 'semestral_8', 'anual_16'
    partnerRef: ''
  });

  const handleCreateCoupon = async () => {
    if (!newCoupon.code || !newCoupon.discountValue) return alert('Preencha os campos obrigatórios do cupão.');
    try {
      await addDoc(collection(db, 'coupons'), {
        code: newCoupon.code.trim().toUpperCase(),
        discountType: newCoupon.discountType,
        discountValue: Number(newCoupon.discountValue),
        targetPlan: newCoupon.targetPlan,
        partnerRef: newCoupon.partnerRef,
        active: true,
        createdAt: new Date().toISOString()
      });
      setNewCoupon({
        code: '',
        discountType: 'percentage',
        discountValue: '',
        targetPlan: 'all',
        partnerRef: ''
      });
      alert('Cupão criado com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Erro ao criar cupão.');
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!window.confirm('Apagar este cupão permanentemente?')) return;
    try {
      await deleteDoc(doc(db, 'coupons', id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleCoupon = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'coupons', id), { active: !currentStatus });
    } catch (e) {
      console.error(e);
    }
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
          <button 
            onClick={() => setActiveTab('broadcast')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'broadcast' ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            <Phone size={18} /> Avisos
          </button>
          <button 
            onClick={() => setActiveTab('coupons')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'coupons' ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            <Ticket size={18} /> Cupons
          </button>
          <button 
            onClick={() => setActiveTab('maestros')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'maestros' ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            <ShieldAlert size={18} /> Maestros
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
                    <p className="font-bold text-on-surface flex items-center gap-2">
                       {u.name || 'Sem Nome'}
                       <span className="text-xs bg-surface-container font-mono px-2 py-0.5 rounded text-on-surface-variant font-black">
                         {getUserDisplayId(u.id)}
                       </span>
                    </p>
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
                        onClick={() => setEditingUser(u)}
                        className="text-primary hover:underline text-[12px] font-black uppercase text-left tracking-widest"
                      >
                        Editar Plano & Expiração
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
                  <span className="text-xs text-on-surface-variant font-medium">#{getPaymentDisplayId(p.id)}</span>
                </div>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-lg font-bold text-on-surface">Upgrade solicitado por {users.find(u => u.id === p.userId)?.name || p.userId}</h4>
                    <p className="text-sm text-on-surface-variant">Plano: <span className="text-on-surface font-bold uppercase tracking-widest">{p.planId?.replace('_', ' ')}</span></p>
                    <p className="text-sm font-black text-primary mt-1">{p.amount?.toLocaleString()} Kz</p>
                    <p className="text-[10px] text-on-surface-variant mt-2 font-mono opacity-50">ID Usuário: {getUserDisplayId(p.userId)}</p>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest pl-1">IBAN de Depósito</label>
                <input 
                  type="text" 
                  value={settings.iban}
                  onChange={(e) => setSettings({ ...settings, iban: e.target.value })}
                  className="w-full bg-surface-container border border-outline-variant/20 rounded-2xl px-5 py-4 text-on-surface focus:outline-none focus:border-primary transition-all font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest pl-1">Titular da Conta (IBAN)</label>
                <input 
                  type="text" 
                  value={settings.ibanName || ''}
                  onChange={(e) => setSettings({ ...settings, ibanName: e.target.value })}
                  className="w-full bg-surface-container border border-outline-variant/20 rounded-2xl px-5 py-4 text-on-surface focus:outline-none focus:border-primary transition-all font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest pl-1">Entidade MCX (Código)</label>
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
            
            <div className="space-y-2">
              <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest pl-1">Nome do Beneficiário (Cobrador MCX)</label>
              <input 
                type="text" 
                value={settings.multicaixaName || ''}
                onChange={(e) => setSettings({ ...settings, multicaixaName: e.target.value })}
                className="w-full bg-surface-container border border-outline-variant/20 rounded-2xl px-5 py-4 text-on-surface focus:outline-none focus:border-primary transition-all font-medium"
                placeholder="Nome da Empresa / Negócio"
              />
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

      {activeTab === 'broadcast' && (
        <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-8 max-w-2xl mx-auto shadow-xl">
          <h3 className="text-xl font-bold text-on-surface mb-6 font-headline flex items-center gap-3">
            <Phone className="text-primary" />
            Comunicados à Comunidade
          </h3>
          <p className="text-sm text-on-surface-variant mb-6">Envie atualizações ou comunicados para todos os membros da comunidade.</p>
          
          <div className="space-y-4">
            <textarea
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              placeholder="Escreva a atualização ou comunicado..."
              className="w-full bg-surface-container border border-outline-variant/20 rounded-2xl px-6 py-4 text-on-surface focus:outline-none focus:border-primary transition-all min-h-[150px] resize-none"
            />
            <button
              onClick={handleSendBroadcast}
              className="w-full bg-primary text-on-primary py-4 rounded-2xl font-black hover:scale-[1.02] transition-all shadow-xl shadow-primary/30 uppercase tracking-widest"
            >
              Publicar Comunicado
            </button>
          </div>
        </div>
      )}

      {activeTab === 'coupons' && (
        <div className="space-y-8">
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-8 shadow-xl">
            <h3 className="text-xl font-bold text-on-surface mb-6 font-headline flex items-center gap-3">
              <Ticket className="text-primary" />
              Novo Cupão de Desconto / Parceria
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <input type="text" value={newCoupon.code} onChange={e => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})} placeholder="Código (Ex: VIP20)" className="bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-on-surface outline-none focus:border-primary uppercase font-mono" />
              
              <select value={newCoupon.discountType} onChange={e => setNewCoupon({...newCoupon, discountType: e.target.value})} className="bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-on-surface outline-none focus:border-primary">
                <option value="percentage">Percentagem %</option>
                <option value="fixed">Valor Fixo (Kz)</option>
              </select>
              
              <input type="number" value={newCoupon.discountValue} onChange={e => setNewCoupon({...newCoupon, discountValue: e.target.value})} placeholder={newCoupon.discountType === 'percentage' ? "Ex: 20" : "Ex: 5000"} className="bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-on-surface outline-none focus:border-primary" />
              
              <select value={newCoupon.targetPlan} onChange={e => setNewCoupon({...newCoupon, targetPlan: e.target.value})} className="bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-on-surface outline-none focus:border-primary">
                <option value="all">Todos os Planos</option>
                <option value="mensal_6">Mensal</option>
                <option value="trimestral_6">Trimestral</option>
                <option value="semestral_8">Semestral</option>
                <option value="anual_16">Anual</option>
              </select>
              
              <input type="text" value={newCoupon.partnerRef} onChange={e => setNewCoupon({...newCoupon, partnerRef: e.target.value})} placeholder="Referência (Parceiro)" className="bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-on-surface outline-none focus:border-primary" />
            </div>
            
            <button onClick={handleCreateCoupon} className="mt-6 bg-primary text-background px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] transition-all">
              Criar Cupão
            </button>
          </div>

          <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container text-on-surface-variant text-xs uppercase tracking-widest border-b border-outline-variant/20">
                <tr>
                  <th className="p-6 font-black">Código</th>
                  <th className="p-6 font-black">Desconto</th>
                  <th className="p-6 font-black">Plano Alvo</th>
                  <th className="p-6 font-black">Referência</th>
                  <th className="p-6 font-black">Status</th>
                  <th className="p-6 font-black">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {coupons.map(c => (
                  <tr key={c.id} className="hover:bg-surface-container/30 transition-colors">
                    <td className="p-6 font-mono font-bold text-primary">{c.code}</td>
                    <td className="p-6 text-on-surface font-black">
                      {c.discountType === 'percentage' ? `${c.discountValue}%` : `Kz ${c.discountValue}`}
                    </td>
                    <td className="p-6 text-sm text-on-surface-variant">{c.targetPlan === 'all' ? 'Todos' : c.targetPlan}</td>
                    <td className="p-6 text-sm text-on-surface-variant">{c.partnerRef || '-'}</td>
                    <td className="p-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${c.active ? 'bg-emerald-500/20 text-emerald-500' : 'bg-error/20 text-error'}`}>
                        {c.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="p-6 flex items-center gap-3">
                      <button onClick={() => handleToggleCoupon(c.id, c.active)} className="text-sm font-bold hover:underline">
                        {c.active ? 'Desativar' : 'Ativar'}
                      </button>
                      <button onClick={() => handleDeleteCoupon(c.id)} className="text-sm text-error font-bold hover:underline">Apagar</button>
                    </td>
                  </tr>
                ))}
                {coupons.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-on-surface-variant">Nenhum cupão criado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-8 shadow-xl">
            <h3 className="text-xl font-bold text-on-surface mb-6 font-headline">Relatório de Indicações</h3>
            <div className="overflow-hidden border border-outline-variant/10 rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container text-on-surface-variant text-[10px] uppercase tracking-widest">
                  <tr>
                    <th className="p-4 font-black">Usuário</th>
                    <th className="p-4 font-black">Cupão Utilizado</th>
                    <th className="p-4 font-black">Parceiro</th>
                    <th className="p-4 font-black">Data Registo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {users.filter(u => u.usedCoupon).map(u => (
                    <tr key={u.id} className="hover:bg-surface-container/30 transition-colors">
                      <td className="p-4 font-bold text-sm text-on-surface">{u.name || u.email}</td>
                      <td className="p-4 text-xs font-mono text-primary font-black">{u.usedCoupon}</td>
                      <td className="p-4 text-xs text-on-surface-variant">{u.partnerRef || '-'}</td>
                      <td className="p-4 text-xs text-on-surface-variant">{new Date(u.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {users.filter(u => u.usedCoupon).length === 0 && (
                    <tr><td colSpan={4} className="p-6 text-center text-xs text-on-surface-variant">Nenhum registro encontrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'maestros' && (
        <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl overflow-hidden shadow-xl">
          <div className="p-6 border-b border-outline-variant/20">
             <h3 className="text-xl font-bold text-on-surface font-headline">Administradores e Maestros</h3>
             <p className="text-sm text-on-surface-variant mt-2">Os usuários listados abaixo têm controle total sobre as configurações da plataforma e listagem de usuários.</p>
          </div>
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container text-on-surface-variant text-xs uppercase tracking-widest border-b border-outline-variant/20">
              <tr>
                <th className="p-6 font-black">Usuário</th>
                <th className="p-6 font-black">Email</th>
                <th className="p-6 font-black w-24 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10 text-sm">
              {users.filter(u => u.role === 'admin').map((u) => (
                <tr key={u.id} className="hover:bg-surface-container/30 transition-colors">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      {u.photoURL ? (
                        <img src={u.photoURL} alt="avatar" className="w-10 h-10 rounded-xl object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold font-headline uppercase">
                          {u.email.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-on-surface text-base">{u.name}</p>
                        <p className="text-xs text-primary font-bold uppercase tracking-widest mt-1">Maestro</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6 text-on-surface-variant text-xs">{u.email}</td>
                  <td className="p-6 text-right">
                    <button 
                      onClick={() => handleUpdateUser(u.id, { role: 'user' })}
                      className="px-4 py-2 bg-error/10 text-error rounded-xl text-[10px] font-black hover:bg-error/20 transition-all uppercase tracking-widest"
                      disabled={u.email === 'exportacoes.extras@gmail.com'}
                    >
                      Remover Maestro
                    </button>
                  </td>
                </tr>
              ))}
              {users.filter(u => u.role === 'admin').length === 0 && (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-on-surface-variant">Nenhum administrador encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
          
          <div className="p-6 border-t border-outline-variant/20 bg-surface-container">
            <h4 className="font-bold text-sm mb-4">Adicionar Novo Maestro</h4>
            <div className="flex gap-4">
              <select id="newAdminSelect" className="flex-1 bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-2 focus:outline-none focus:border-primary text-sm">
                 <option value="">Selecione um usuário...</option>
                 {users.filter(u => u.role !== 'admin' && u.status !== 'deleted').map(u => (
                   <option key={u.id} value={u.id}>{u.name || u.email}</option>
                 ))}
              </select>
              <button 
                onClick={() => {
                  const select = document.getElementById('newAdminSelect') as HTMLSelectElement;
                  if (select.value) {
                    handleUpdateUser(select.value, { role: 'admin' });
                    select.value = '';
                  }
                }}
                className="px-6 py-2 bg-primary text-on-primary font-bold rounded-xl hover:scale-[1.02] transition-transform shadow-lg shadow-primary/20"
              >
                Promover a Maestro
              </button>
            </div>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
           <div className="bg-surface-container border border-outline-variant/20 rounded-3xl p-8 max-w-lg w-full shadow-2xl">
              <h3 className="text-xl font-bold mb-6">Editar Plano de <span className="text-primary">{editingUser.name || editingUser.email}</span></h3>
              
              <div className="space-y-4">
                 <div>
                   <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Plano Definido</label>
                   <select 
                     id="editPlan" 
                     className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 focus:outline-none focus:border-primary text-sm"
                     defaultValue={editingUser.plan_type || 'Iniciante'}
                   >
                     <option value="Iniciante">Iniciante (Sem Acesso)</option>
                     <option value="mensal_6">Mensal (6 Contas)</option>
                     <option value="trimestral_6">Trimestral (6 Contas)</option>
                     <option value="semestral_8">Semestral (8 Contas)</option>
                     <option value="anual_16">Anual (16 Contas)</option>
                     <option value="ilimitado">Maestro (Ilimitado & Sem Expiração)</option>
                   </select>
                 </div>
                 
                 <div>
                   <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Data de Expiração (Ano-Mês-Dia)</label>
                   <input 
                     id="editExpiry" 
                     type="date"
                     defaultValue={
                       editingUser.plan_type === 'ilimitado' ? '' : 
                       editingUser.expiry_date ? (editingUser.expiry_date.toDate ? editingUser.expiry_date.toDate().toISOString().split('T')[0] : new Date(editingUser.expiry_date).toISOString().split('T')[0]) : ''
                     }
                     className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 focus:outline-none focus:border-primary text-sm"
                   />
                 </div>
              </div>

              <div className="flex gap-4 mt-8">
                 <button 
                   onClick={() => setEditingUser(null)}
                   className="flex-1 py-3 bg-surface-container-low hover:bg-surface-container-high transition-colors rounded-xl font-bold uppercase tracking-widest text-xs"
                 >
                   Cancelar
                 </button>
                 <button 
                   onClick={() => {
                      const plan = (document.getElementById('editPlan') as HTMLSelectElement).value;
                      const dateVal = (document.getElementById('editExpiry') as HTMLInputElement).value;
                      
                      const updateData: any = { plan_type: plan };
                      if (plan === 'ilimitado') {
                         updateData.expiry_date = null;
                      } else if (dateVal) {
                         const time = new Date(dateVal);
                         time.setHours(23, 59, 59);
                         updateData.expiry_date = time.toISOString();
                      }
                      
                      handleUpdateUser(editingUser.id, updateData);
                      setEditingUser(null);
                   }}
                   className="flex-1 py-3 bg-primary text-on-primary hover:bg-primary-fixed-dim transition-colors rounded-xl font-bold uppercase tracking-widest text-xs"
                 >
                   Salvar Alterações
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
