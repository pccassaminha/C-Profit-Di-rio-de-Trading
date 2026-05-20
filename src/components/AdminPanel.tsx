import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, doc, getDoc, updateDoc, onSnapshot, query, orderBy, setDoc, addDoc, deleteDoc, where } from 'firebase/firestore';
import { useTrades } from '../hooks/useTrades';
import Modal from './Modal';
import { Users, Settings, CreditCard, Check, X, ShieldAlert, Phone, Landmark, Ticket, AlertTriangle } from 'lucide-react';

export default function AdminPanel() {
  const { userPlan, globalSettings: initialSettings } = useTrades();
  const currentUser = auth.currentUser;
  
  // Super Admin check
  const isSuperAdmin = currentUser?.email === 'exportacoes.extras@gmail.com';

  const [activeTab, setActiveTab] = useState<'users' | 'payments' | 'settings' | 'coupons' | 'broadcast' | 'maestros' | 'affiliates'>('users');
  const [editingUser, setEditingUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [adminReferrals, setAdminReferrals] = useState<any[]>([]);
  const [adminPayouts, setAdminPayouts] = useState<any[]>([]);
  const [selectedStatList, setSelectedStatList] = useState<'faturado' | 'descontos' | 'parceiros' | null>(null);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [settings, setSettings] = useState(initialSettings || {
    whatsappNumber: '',
    expressNumber: '',
    iban: '',
    ibanName: '',
    multicaixaEntity: '',
    multicaixaReference: '',
    multicaixaName: '',
    showIban: true,
    showMulticaixa: true,
    showExpress: true,
    multicaixaLogoUrl: ''
  });

  useEffect(() => {
    if (initialSettings) {
      setSettings({
        showExpress: true,
        expressNumber: '',
        ...initialSettings
      });
    }
  }, [initialSettings]);

  useEffect(() => {
    if (activeTab !== 'maestros') {
      setShowDangerZone(false);
    }
  }, [activeTab]);

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

    // Listen to referrals
    const unsubReferrals = onSnapshot(query(collection(db, 'referrals'), orderBy('createdAt', 'desc')), (snapshot) => {
      setAdminReferrals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Listen to affiliate payouts
    const unsubPayouts = onSnapshot(query(collection(db, 'affiliate_payouts'), orderBy('createdAt', 'desc')), (snapshot) => {
      setAdminPayouts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Listen to global settings to keep settings state fully active in real time
    const unsubGlobalSettings = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(prev => ({ 
          ...prev, 
          ...docSnap.data() 
        }));
      }
    });

    setLoading(false);
    return () => {
      unsubUsers();
      unsubPayments();
      unsubCoupons();
      unsubReferrals();
      unsubPayouts();
      unsubGlobalSettings();
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

      // 3. Referral check (affiliate commission)
      const userRef = doc(db, 'usuarios', payment.userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.referredBy) {
          // Check if this user already has any approved referrals or previous approved payments
          const qApprovedRefs = query(
            collection(db, 'referrals'),
            where('referredId', '==', payment.userId),
            where('status', '==', 'approved')
          );
          const approvedRefsSnap = await getDocs(qApprovedRefs);
          
          if (approvedRefsSnap.empty) {
            // Get administrative settings for reward method
            const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
            const activeSettings = settingsSnap.exists() ? settingsSnap.data() : {};
            const activeMode = activeSettings.affiliateMode || 'commission_30';
            
            // Calculate reward
            let rewardVal: any = 0;
            if (activeMode === 'commission_30') {
              rewardVal = Math.round(payment.amount * 0.30);
            } else {
              rewardVal = '1_month_free_progress';
            }

            // Create referral doc with pending_approval status, which the maestro approves
            await addDoc(collection(db, 'referrals'), {
              referrerId: userData.referredBy,
              referredId: payment.userId,
              referredName: userData.nome || 'Novo Trader',
              referredEmail: userData.email,
              referredPlan: payment.planId,
              paymentAmount: payment.amount,
              rewardType: activeMode,
              rewardValue: rewardVal,
              status: 'pending_approval',
              createdAt: new Date().toISOString()
            });
          }
        }
      }
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

  const handleApproveReferral = async (ref: any) => {
    try {
      await updateDoc(doc(db, 'referrals', ref.id), {
        status: 'approved',
        approvedAt: new Date().toISOString()
      });

      if (ref.rewardType === 'commission_30') {
        const referrerRef = doc(db, 'usuarios', ref.referrerId);
        const referrerDoc = await getDoc(referrerRef);
        if (referrerDoc.exists()) {
          const currentBal = referrerDoc.data().affiliateBalance || 0;
          await updateDoc(referrerRef, {
            affiliateBalance: currentBal + Number(ref.rewardValue)
          });
        }
      }
      alert('Recompensa de afiliado aprovada com sucesso!');
    } catch (e) {
      console.error(e);
      alert('Erro ao aprovar recompensa.');
    }
  };

  const handleRejectReferral = async (refId: string) => {
    if (!window.confirm('Tem certeza de que deseja rejeitar esta recompensa de recomendação?')) return;
    try {
      await updateDoc(doc(db, 'referrals', refId), {
        status: 'rejected',
        updatedAt: new Date().toISOString()
      });
      alert('Recomendação rejeitada.');
    } catch (e) {
      console.error(e);
    }
  };

  const handleApprovePayout = async (payout: any) => {
    if (!window.confirm('Marcar este saque solicitado como Pago por transferência?')) return;
    try {
      await updateDoc(doc(db, 'affiliate_payouts', payout.id), {
        status: 'approved',
        updatedAt: new Date().toISOString()
      });
      alert('Levantamento pago à conta bancária de destino!');
    } catch (e) {
      console.error(e);
    }
  };

  const handleRejectPayout = async (payout: any) => {
    if (!window.confirm('Cancelar este pedido de levantamento de comissões? O saldo será integralmente devolvido ao usuário.')) return;
    try {
      await updateDoc(doc(db, 'affiliate_payouts', payout.id), {
        status: 'rejected',
        updatedAt: new Date().toISOString()
      });

      const userRef = doc(db, 'usuarios', payout.userId);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const currentBal = userDoc.data().affiliateBalance || 0;
        await updateDoc(userRef, {
          affiliateBalance: currentBal + Number(payout.amount)
        });
      }
      alert('Levantamento recusado e fundos estornados.');
    } catch (e) {
      console.error(e);
    }
  };

  const handleConcedeFreeMonth = async (userId: string) => {
    try {
      const userRef = doc(db, 'usuarios', userId);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const currentExpiry = userDoc.data().expiry_date;
        const baseDate = currentExpiry ? (currentExpiry.toDate ? currentExpiry.toDate() : new Date(currentExpiry)) : new Date();
        const newExpiry = new Date(baseDate);
        newExpiry.setDate(newExpiry.getDate() + 30);
        
        await updateDoc(userRef, {
          expiry_date: newExpiry.toISOString(),
          plan_type: 'mensal_6',
          updatedAt: new Date().toISOString()
        });
        alert('Sucesso! Concedido 1 mês grátis ao trader.');
      }
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
          <button 
            onClick={() => setActiveTab('affiliates')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'affiliates' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 animate-pulse' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            <Landmark size={18} /> Gestão Financeira & Afiliados
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
                    <p className="text-sm text-on-surface-variant">Método: <span className="text-on-surface font-bold uppercase tracking-wider">{
                      p.paymentMethod === 'express' ? 'Express 📱' : 
                      p.paymentMethod === 'iban' ? 'IBAN 🏛️' : 'MCX Referência 💳'
                    }</span></p>
                    {p.paymentMethod === 'express' && p.expressCode && (
                      <p className="text-xs text-amber-500 font-extrabold mt-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl w-fit">
                        CÓDIGO EXPRESS: {p.expressCode}
                      </p>
                    )}
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-surface-container/50 p-6 rounded-[24px] border border-outline-variant/10">
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

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-on-surface">Ativar Express</p>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-tighter">Exibir Transferência Express</p>
                </div>
                <button 
                  onClick={() => setSettings({ ...settings, showExpress: settings.showExpress !== false ? false : true })}
                  className={`w-12 h-6 rounded-full transition-all relative ${settings.showExpress !== false ? 'bg-primary' : 'bg-surface-container-high border border-outline-variant/30'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${settings.showExpress !== false ? 'right-1 bg-on-primary' : 'left-1 bg-on-surface-variant'}`}></div>
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
              <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest pl-1">Telemóvel MCX Express (Destinatário)</label>
              <input 
                type="text" 
                value={settings.expressNumber || ''}
                onChange={(e) => setSettings({ ...settings, expressNumber: e.target.value })}
                className="w-full bg-surface-container border border-outline-variant/20 rounded-2xl px-5 py-4 text-on-surface focus:outline-none focus:border-primary transition-all font-medium"
                placeholder="Ex: 921167980"
              />
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
      {activeTab === 'maestros' && showDangerZone && isSuperAdmin ? (
        <div className="bg-error/5 border border-error/20 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-error/20">
            <div className="flex items-center gap-4 text-error">
              <AlertTriangle size={32} className="animate-pulse" />
              <div>
                <h3 className="font-bold text-xl font-headline uppercase italic tracking-tighter">
                  ZONA DE PERIGO EXTREMO
                </h3>
                <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">Acesso Super Admin</p>
              </div>
            </div>
            <button 
              onClick={() => setShowDangerZone(false)}
              className="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-xl text-xs font-bold uppercase tracking-widest transition-colors border border-outline-variant/30"
            >
              Voltar para Maestros
            </button>
          </div>
          
          <div className="bg-background/50 border border-error/20 rounded-2xl p-4">
            <p className="text-xs text-error font-bold uppercase tracking-wider mb-1">Aviso Crítico</p>
            <p className="text-sm text-on-surface-variant">
              Como Super Administrador, podes realizar limpezas globais no banco de dados. Estas ações são IRREVERSÍVEIS e afetam a todos os utilizadores da plataforma imediatamente.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-4 pt-2">
            <button 
              onClick={async () => {
                if (!window.confirm('CUIDADO: Desejas apagar TODOS os trades de TODOS os usuários do banco de dados?')) return;
                setLoading(true);
                try {
                   const snap = await getDocs(collection(db, 'trades'));
                   const p = snap.docs.map(d => deleteDoc(d.ref));
                   await Promise.all(p);
                   alert('Limpeza de trades (root) concluída.');
                } catch (e) {
                   console.error(e);
                   alert('Erro na limpeza global.');
                } finally {
                   setLoading(false);
                }
              }}
              className="bg-error text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-error/20"
            >
              Apagar Todos os Trades (Global)
            </button>

            <button 
              onClick={async () => {
                if (!window.confirm('CUIDADO: Desejas apagar TODAS as notificações/comunicados (broadcasts)?')) return;
                setLoading(true);
                try {
                   const snap = await getDocs(collection(db, 'broadcasts'));
                   const p = snap.docs.map(d => deleteDoc(d.ref));
                   await Promise.all(p);
                   alert('Broadcasts limpos.');
                } catch (e) {
                   console.error(e);
                   alert('Erro na limpeza.');
                } finally {
                   setLoading(false);
                }
              }}
              className="bg-surface-container-high text-on-surface px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-surface-container-highest transition-all"
            >
              Limpar Comunicados
            </button>
          </div>
        </div>
      ) : activeTab === 'maestros' ? (
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

          {isSuperAdmin && (
            <div className="p-6 border-t border-outline-variant/20 bg-error/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <p className="font-bold text-xs text-error uppercase tracking-widest flex items-center gap-2">
                  <AlertTriangle size={14} className="text-error" /> Zona de Manutenção
                </p>
                <p className="text-[11px] text-on-surface-variant">Ações de limpeza global de dados do sistema.</p>
              </div>
              <button
                onClick={() => {
                  if (window.confirm('ATENÇÃO: ESTOU A ENTRAR NA ZONA DE PERIGO!')) {
                    setShowDangerZone(true);
                  }
                }}
                className="px-4 py-2 bg-error/10 hover:bg-error/20 text-error rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
              >
                Acessar Zona de Perigo
              </button>
            </div>
          )}
        </div>
      ) : null}

      {activeTab === 'affiliates' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          
          {/* Dashboard Stats Panel */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button 
              onClick={() => setSelectedStatList(selectedStatList === 'faturado' ? null : 'faturado')}
              className={`bg-surface-container-low border text-left rounded-3xl p-6 shadow-xl flex items-center justify-between transition-all hover:scale-[1.01] hover:bg-surface-container-high/30 active:scale-[0.99] cursor-pointer ${selectedStatList === 'faturado' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-outline-variant/20'}`}
            >
              <div>
                <p className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${selectedStatList === 'faturado' ? 'bg-emerald-500 animate-ping' : 'bg-transparent'}`}></span>
                  Total Faturado (Assinaturas)
                </p>
                <p className="text-3xl font-black text-emerald-400 mt-2">
                  {payments.filter(p => p.status === 'approved').reduce((acc, p) => acc + (p.amount || 0), 0).toLocaleString()} Kz
                </p>
                <p className="text-[11px] text-on-surface-variant/70 mt-1">Soma de todos os planos aprovados (Clique para ver)</p>
              </div>
              <span className="material-symbols-outlined text-4xl text-emerald-500/30">payments</span>
            </button>

            <button 
              onClick={() => setSelectedStatList(selectedStatList === 'descontos' ? null : 'descontos')}
              className={`bg-surface-container-low border text-left rounded-3xl p-6 shadow-xl flex items-center justify-between transition-all hover:scale-[1.01] hover:bg-surface-container-high/30 active:scale-[0.99] cursor-pointer ${selectedStatList === 'descontos' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-outline-variant/20'}`}
            >
              <div>
                <p className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${selectedStatList === 'descontos' ? 'bg-amber-500 animate-ping' : 'bg-transparent'}`}></span>
                  Total de Descontos Concedidos
                </p>
                <p className="text-3xl font-black text-amber-400 mt-2">
                  {payments.filter(p => p.status === 'approved' && p.usedCoupon).reduce((acc, p) => {
                    const c = coupons.find(cp => cp.code === p.usedCoupon);
                    if (c) {
                      if (c.discountType === 'fixed') return acc + Number(c.discountValue);
                      const orig = p.amount / (1 - (c.discountValue / 100));
                      return acc + Math.round(orig * (c.discountValue / 100));
                    }
                    return acc + 5000;
                  }, 0).toLocaleString()} Kz
                </p>
                <p className="text-[11px] text-on-surface-variant/70 mt-1">Descontos aplicados via cupões (Clique para ver)</p>
              </div>
              <span className="material-symbols-outlined text-4xl text-amber-500/30">price_check</span>
            </button>

            <button 
              onClick={() => setSelectedStatList(selectedStatList === 'parceiros' ? null : 'parceiros')}
              className={`bg-surface-container-low border text-left rounded-3xl p-6 shadow-xl flex items-center justify-between transition-all hover:scale-[1.01] hover:bg-surface-container-high/30 active:scale-[0.99] cursor-pointer ${selectedStatList === 'parceiros' ? 'border-primary ring-2 ring-primary/20' : 'border-outline-variant/20'}`}
            >
              <div>
                <p className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${selectedStatList === 'parceiros' ? 'bg-primary animate-ping' : 'bg-transparent'}`}></span>
                  Parceiros / Afiliados Ativos
                </p>
                <p className="text-3xl font-black text-primary mt-2">
                  {users.filter(u => u.referredBy || u.affiliateBalance > 0).length}
                </p>
                <p className="text-[11px] text-on-surface-variant/70 mt-1">Traders com comissões/convites (Clique para ver)</p>
              </div>
              <span className="material-symbols-outlined text-4xl text-primary/30">handshake</span>
            </button>
          </div>

          {/* Dynamic Interactive Ledgers */}
          {selectedStatList && (
            <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-6 shadow-xl animate-in slide-in-from-top duration-300">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-outline-variant/15">
                <div>
                  <h4 className="text-sm font-black uppercase tracking-wider text-white">
                    {selectedStatList === 'faturado' && '📄 Extrato de Faturamento (Todos os Planos Ativos)'}
                    {selectedStatList === 'descontos' && '🎟️ Detalhes dos Cupões & Descontos Utilizados'}
                    {selectedStatList === 'parceiros' && '🤝 Carteira de Saldos de Parceiros & Afiliados'}
                  </h4>
                  <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">
                    {selectedStatList === 'faturado' && 'Histórico completo de pagamentos aprovados que creditaram a plataforma.'}
                    {selectedStatList === 'descontos' && 'Lista de transações faturadas onde o cliente ativou um código promocional.'}
                    {selectedStatList === 'parceiros' && 'Listagem de parceiros registados e balances correntes prontos a levantar.'}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedStatList(null)}
                  className="px-3 py-1 bg-surface-container text-xs text-on-surface-variant uppercase font-mono font-black border border-outline-variant/20 rounded-lg hover:text-white transition-colors"
                >
                  Fechar [X]
                </button>
              </div>

              {selectedStatList === 'faturado' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-surface-container text-[10px] font-black text-on-surface-variant uppercase tracking-widest border-b border-outline-variant/10">
                      <tr>
                        <th className="p-4">ID Transação</th>
                        <th className="p-4">Trader / Email</th>
                        <th className="p-4">Plano</th>
                        <th className="p-4">Método</th>
                        <th className="p-4">Data Aprovado</th>
                        <th className="p-4 text-right">Valor creditado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10 text-xs text-white">
                      {payments.filter(p => p.status === 'approved').map(p => {
                        const paidUser = users.find(u => u.id === p.userId);
                        return (
                          <tr key={p.id} className="hover:bg-surface-container/20 transition-colors">
                            <td className="p-4 font-mono font-bold text-on-surface-variant">#{getPaymentDisplayId(p.id)}</td>
                            <td className="p-4">
                              <p className="font-bold text-on-surface">{paidUser?.name || 'Inscrito'}</p>
                              <p className="text-[10px] text-on-surface-variant/60 font-mono italic">{paidUser?.email || p.userId}</p>
                            </td>
                            <td className="p-4 font-bold uppercase font-mono">{p.planId?.replace('_', ' ')}</td>
                            <td className="p-4 font-bold uppercase tracking-wider text-[10px]">
                              {p.paymentMethod === 'express' ? 'Express 📱' : p.paymentMethod === 'iban' ? 'IBAN 🏛️' : 'MCX Ref 💳'}
                            </td>
                            <td className="p-4 text-[10px] text-on-surface-variant">{new Date(p.createdAt || Date.now()).toLocaleDateString()}</td>
                            <td className="p-4 text-right font-black text-emerald-400 font-mono">{p.amount?.toLocaleString()} Kz</td>
                          </tr>
                        );
                      })}
                      {payments.filter(p => p.status === 'approved').length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-xs text-on-surface-variant/70 italic">Nenhum pagamento aprovado até ao momento.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedStatList === 'descontos' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-surface-container text-[10px] font-black text-on-surface-variant uppercase tracking-widest border-b border-outline-variant/10">
                      <tr>
                        <th className="p-4">Trader</th>
                        <th className="p-4">Cupão de Desconto</th>
                        <th className="p-4">Valor Pago</th>
                        <th className="p-4">Desconto Estimado</th>
                        <th className="p-4">Data Uso</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10 text-xs text-white">
                      {payments.filter(p => p.status === 'approved' && p.usedCoupon).map(p => {
                        const paidUser = users.find(u => u.id === p.userId);
                        const c = coupons.find(cp => cp.code === p.usedCoupon);
                        let estimatedSavings = 0;
                        if (c) {
                          if (c.discountType === 'fixed') {
                            estimatedSavings = Number(c.discountValue);
                          } else {
                            const orig = p.amount / (1 - (c.discountValue / 100));
                            estimatedSavings = Math.round(orig * (c.discountValue / 100));
                          }
                        } else {
                          estimatedSavings = 5000; // estimated default fallback
                        }
                        return (
                          <tr key={p.id} className="hover:bg-surface-container/20 transition-colors">
                            <td className="p-4">
                              <p className="font-bold text-on-surface">{paidUser?.name || 'Trader'}</p>
                              <p className="text-[10px] text-on-surface-variant/60 font-mono italic">{paidUser?.email}</p>
                            </td>
                            <td className="p-4 font-mono font-black text-primary">{p.usedCoupon}</td>
                            <td className="p-4 font-bold text-on-surface font-mono">{p.amount?.toLocaleString()} Kz</td>
                            <td className="p-4 font-black text-amber-400 font-mono">-{estimatedSavings.toLocaleString()} Kz</td>
                            <td className="p-4 text-[10px] text-on-surface-variant">{new Date(p.createdAt || Date.now()).toLocaleDateString()}</td>
                          </tr>
                        );
                      })}
                      {payments.filter(p => p.status === 'approved' && p.usedCoupon).length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-xs text-on-surface-variant/70 italic">Nenhum cupão promocional ativo ainda faturado.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedStatList === 'parceiros' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-surface-container text-[10px] font-black text-on-surface-variant uppercase tracking-widest border-b border-outline-variant/10">
                      <tr>
                        <th className="p-4">Afiliado / Identificador</th>
                        <th className="p-4">Email de Contato</th>
                        <th className="p-4">Padrinho ID</th>
                        <th className="p-4">Data Inscrição</th>
                        <th className="p-4 text-right">Saldo de Comissões</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10 text-xs text-white">
                      {users.filter(u => u.status !== 'deleted' && (u.referredBy || u.affiliateBalance > 0)).map(u => {
                        return (
                          <tr key={u.id} className="hover:bg-surface-container/20 transition-colors">
                            <td className="p-4">
                              <p className="font-bold text-on-surface">{u.nome || 'Parceiro'}</p>
                              <p className="text-[10px] bg-surface-container font-mono px-2 py-0.5 rounded text-on-surface-variant font-black w-fit mt-1">ID: {getUserDisplayId(u.id)}</p>
                            </td>
                            <td className="p-4 font-medium italic">{u.email}</td>
                            <td className="p-4 font-mono select-all text-on-surface-variant">{u.referredBy ? `ID Ref: ${u.referredBy.substring(0,6)}...` : '-'}</td>
                            <td className="p-4 text-[10px] text-on-surface-variant">{new Date(u.createdAt || Date.now()).toLocaleDateString()}</td>
                            <td className="p-4 text-right font-black text-emerald-400 font-mono">{(u.affiliateBalance || 0).toLocaleString()} Kz</td>
                          </tr>
                        );
                      })}
                      {users.filter(u => u.status !== 'deleted' && (u.referredBy || u.affiliateBalance > 0)).length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-xs text-on-surface-variant/70 italic">Não existem parceiros comerciais registados actualmente.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Configuration of Active Method */}
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-6 md:p-8 shadow-xl">
            <h3 className="text-lg font-bold text-on-surface mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">rule</span> Ajuste das Diretrizes de Afiliados (Business)
            </h3>
            <p className="text-xs text-on-surface-variant max-w-3xl leading-relaxed mb-6">
              Defina abaixo qual modalidade de recompensa ou comissão será oferecida por padrão a todos os traders que promoverem a plataforma. Pode alternar livremente; o sistema reconfigura a área de afiliados de forma síncrona.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={async () => {
                  await setDoc(doc(db, 'settings', 'global'), { ...settings, affiliateMode: 'free_month' });
                  alert('Modo Alterado: Convidar 2 Traders = 1 Mês Grátis!');
                }}
                className={`p-5 rounded-2xl border text-left flex items-start gap-4 transition-all ${
                  (settings?.affiliateMode || 'commission_30') === 'free_month' 
                    ? 'bg-amber-500/5 border-amber-500 text-on-surface shadow-md' 
                    : 'bg-surface-container-high/40 border-outline-variant/15 text-on-surface hover:bg-surface-container-high'
                }`}
              >
                <span className="material-symbols-outlined text-amber-500 text-3xl">gif_box</span>
                <div>
                  <p className="font-bold text-sm">Opção 1: Convidar 2 = 1 Mês Grátis</p>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                    Ideal para crescimento orgânico sem custos de caixa. A cada 2 recomendações que ativarem um plano, o afiliado ganha 1 mês grátis.
                  </p>
                </div>
              </button>

              <button 
                onClick={async () => {
                  await setDoc(doc(db, 'settings', 'global'), { ...settings, affiliateMode: 'commission_30' });
                  alert('Modo Alterado: 30% de Comissão por Cada Adesão!');
                }}
                className={`p-5 rounded-2xl border text-left flex items-start gap-4 transition-all ${
                  (settings?.affiliateMode || 'commission_30') === 'commission_30' 
                    ? 'bg-emerald-500/5 border-emerald-500 text-on-surface shadow-md' 
                    : 'bg-surface-container-high/40 border-outline-variant/15 text-on-surface hover:bg-surface-container-high'
                }`}
              >
                <span className="material-symbols-outlined text-emerald-500 text-3xl">currency_lira</span>
                <div>
                  <p className="font-bold text-sm font-headline uppercase tracking-tight text-white">Opção 2: 30% de Comissões em Dinheiro</p>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                    Direcionado a influenciadores e parceiros de marketing. 30% do valor da assinatura paga é creditada ao padrinho após validação.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Pending Commissions waiting confirmation by Maestro */}
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-outline-variant/15 flex justify-between items-center bg-surface-container">
              <div>
                <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-500">pending_actions</span> Comissões & Indicações por Confirmar
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">Transações geradas por primeiros pagamentos de usuários convidados</p>
              </div>
              <span className="text-xs font-mono bg-surface-container-high px-3 py-1 rounded-full font-bold text-on-surface-variant">
                {adminReferrals.filter(r => r.status === 'pending_approval').length} Pendentes
              </span>
            </div>

            {adminReferrals.filter(r => r.status === 'pending_approval').length === 0 ? (
              <div className="p-8 text-center text-xs text-on-surface-variant/70 italic">Nenhuma indicação pendente de validação pelos Maestros.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container text-[10px] uppercase font-black text-on-surface-variant tracking-widest border-b border-outline-variant/15">
                  <tr>
                    <th className="p-4">Quem Convidou</th>
                    <th className="p-4">Novo Membro</th>
                    <th className="p-4">Plano Escolhido</th>
                    <th className="p-4">Recompensa</th>
                    <th className="p-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10 text-xs text-on-surface select-none">
                  {adminReferrals.filter(r => r.status === 'pending_approval').map(ref => {
                    const referrerUser = users.find(u => u.id === ref.referrerId);
                    return (
                      <tr key={ref.id} className="hover:bg-surface-container/20 transition-colors">
                        <td className="p-4">
                          <p className="font-bold text-on-surface">{referrerUser?.name || 'Afiliado'}</p>
                          <p className="text-[10px] text-on-surface-variant/60 font-mono italic">{referrerUser?.email}</p>
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-on-surface">{ref.referredName}</p>
                          <p className="text-[10px] text-on-surface-variant/60 font-mono italic">{ref.referredEmail}</p>
                        </td>
                        <td className="p-4">
                          <p className="font-semibold uppercase font-mono">{ref.referredPlan?.replace('_', ' ')}</p>
                          <p className="text-[10px] text-primary font-black mt-0.5">{ref.paymentAmount?.toLocaleString()} Kz</p>
                        </td>
                        <td className="p-4">
                          <span className="bg-primary/10 text-primary border border-primary/20 font-black px-2 py-0.5 rounded uppercase text-[10px]">
                            {ref.rewardType === 'commission_30' ? `${Number(ref.rewardValue).toLocaleString()} Kz (30%)` : 'Fracção Mês Grátis'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => handleRejectReferral(ref.id)}
                              className="px-3 py-1.5 bg-error/10 text-error hover:bg-error/20 transition-all font-black text-[9px] uppercase tracking-wider rounded-lg"
                            >
                              Recusar
                            </button>
                            <button 
                              onClick={() => handleApproveReferral(ref)}
                              className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all font-black text-[9px] uppercase tracking-wider rounded-lg"
                            >
                              Creditar & Aceitar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Affiliate Payout requests waiting payment */}
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-outline-variant/15 flex justify-between items-center bg-surface-container">
              <div>
                <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-500">account_balance_wallet</span> Solicitatções de Saques de Afiliados
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">Pedidos de transferência de fundos provenientes de comissões acumuladas</p>
              </div>
              <span className="text-xs font-mono bg-surface-container-high px-3 py-1 rounded-full font-bold text-on-surface-variant">
                {adminPayouts.filter(p => p.status === 'pending').length} Por Pagar
              </span>
            </div>

            {adminPayouts.length === 0 ? (
              <div className="p-8 text-center text-xs text-on-surface-variant/70 italic">Nenhum pedido de levantamento de comissão.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container text-[10px] uppercase font-black text-on-surface-variant tracking-widest border-b border-outline-variant/15">
                  <tr>
                    <th className="p-4">Afiliado</th>
                    <th className="p-4">Dados de Saque / Titular / IBAN</th>
                    <th className="p-4">Valor Solicitado</th>
                    <th className="p-4">Data / Hora</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Procedimento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10 text-xs text-on-surface">
                  {adminPayouts.map(payout => (
                    <tr key={payout.id} className="hover:bg-surface-container/20 transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-on-surface">{payout.userName}</p>
                        <p className="text-[10px] text-on-surface-variant/60 font-mono italic">{payout.userEmail}</p>
                      </td>
                      <td className="p-4">
                        <p className="font-semibold text-on-surface">{payout.fullName}</p>
                        <p className="text-[10px] text-emerald-400 font-mono mt-0.5 font-bold uppercase select-all bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10 w-fit">{payout.iban}</p>
                      </td>
                      <td className="p-4 font-black text-primary font-mono text-base">
                        {payout.amount?.toLocaleString()} Kz
                      </td>
                      <td className="p-4 text-[10px] text-on-surface-variant">
                        {new Date(payout.createdAt).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase ${
                          payout.status === 'approved' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 
                          payout.status === 'rejected' ? 'bg-error/15 text-error border border-error/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold'
                        }`}>
                          {payout.status === 'approved' ? 'Pago' : payout.status === 'rejected' ? 'Cancelado' : 'Pendente'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {payout.status === 'pending' && (
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => handleRejectPayout(payout)}
                              className="px-3 py-1.5 bg-error/10 text-error hover:bg-error/20 transition-all font-black text-[9px] uppercase tracking-wider rounded-lg"
                            >
                              Rejeitar
                            </button>
                            <button 
                              onClick={() => handleApprovePayout(payout)}
                              className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-all font-black text-[9px] uppercase tracking-wider rounded-lg border border-emerald-500/40"
                            >
                              Pago ✅
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Quick Grant of Free Subscription Promo */}
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-6 md:p-8 shadow-xl">
            <h4 className="font-bold text-sm text-on-surface mb-3 uppercase tracking-wider">Premiação Especial: Conceder Plano / Mês Avulso</h4>
            <p className="text-xs text-on-surface-variant mb-6 leading-relaxed">
              Desejas premiar um convidado de forma manual ou liberar prêmio avulso? Pode selecionar o afiliado abaixo e creditar 30 dias de acesso completo à plataforma (validando o bónus do convite de 2 utilizadores).
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <select id="freeMonthUserSelect" className="flex-1 bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 focus:outline-none focus:border-primary text-sm font-medium">
                <option value="">Selecione o afiliado para receber plano grátis...</option>
                {users.filter(u => u.status !== 'deleted').map(u => (
                  <option key={u.id} value={u.id}>{u.name || u.email} ({u.email})</option>
                ))}
              </select>
              <button 
                onClick={() => {
                  const select = document.getElementById('freeMonthUserSelect') as HTMLSelectElement;
                  if (select.value) {
                    handleConcedeFreeMonth(select.value);
                    select.value = '';
                  } else {
                    alert('Por favor, selecione um usuário primeiro.');
                  }
                }}
                className="px-6 py-3 bg-amber-500 text-on-primary font-bold rounded-xl text-xs uppercase tracking-widest hover:scale-[1.02] transition-transform shadow-lg shadow-amber-500/20"
              >
                Conceder 30 Dias Gratuitos
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
