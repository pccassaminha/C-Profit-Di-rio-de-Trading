import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, doc, getDoc, updateDoc, onSnapshot, query, orderBy, setDoc, addDoc, deleteDoc, where } from 'firebase/firestore';
import { useTrades } from '../hooks/useTrades';
import Modal from './Modal';
import { Users, Settings, CreditCard, Check, X, ShieldAlert, Phone, Landmark, Ticket, AlertTriangle, Search, Calendar, SlidersHorizontal, ArrowUpDown, Megaphone, History, Plus, Trash2 } from 'lucide-react';

export default function AdminPanel() {
  const { userPlan, globalSettings: initialSettings } = useTrades();
  const currentUser = auth.currentUser;
  
  // Super Admin check
  const isSuperAdmin = currentUser?.email === 'exportacoes.extras@gmail.com';

  const [activeTab, setActiveTab ] = useState<'users' | 'payments' | 'settings' | 'coupons' | 'broadcast' | 'maestros' | 'affiliates'>('users');
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showBillingModal, setShowBillingModal] = useState<boolean>(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState<boolean>(false);
  const [broadcastTab, setBroadcastTab] = useState<'create' | 'history'>('create');
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [adminReferrals, setAdminReferrals] = useState<any[]>([]);
  const [adminPayouts, setAdminPayouts] = useState<any[]>([]);
  const [selectedStatList, setSelectedStatList] = useState<'faturado' | 'descontos' | 'parceiros' | null>(null);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [showDangerZone, setShowDangerZone] = useState(false);

  // Filter & Search states for users tab
  const [userSearch, setUserSearch] = useState('');
  const [userPlanFilter, setUserPlanFilter] = useState('');
  const [userDatePreset, setUserDatePreset] = useState('all'); // 'all', 'today', 'last7', 'last30', 'custom'
  const [userStartDate, setUserStartDate] = useState('');
  const [userEndDate, setUserEndDate] = useState('');
  const [userSortOrder, setUserSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Filter & Search states for payments tab
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [paymentDatePreset, setPaymentDatePreset] = useState('all'); // 'all', 'today', 'last7', 'last30', 'custom'
  const [paymentStartDate, setPaymentStartDate] = useState('');
  const [paymentEndDate, setPaymentEndDate] = useState('');
  const [paymentSortOrder, setPaymentSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Coupon search and filter states
  const [couponSearchQuery, setCouponSearchQuery] = useState('');
  const [selectedCouponFilter, setSelectedCouponFilter] = useState('');

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

  const filteredUsers = users
    .filter(u => u.status !== 'deleted')
    .filter(u => {
      // 1. Search term check
      const searchLower = userSearch.toLowerCase().trim();
      if (searchLower) {
        const uIdDisplay = getUserDisplayId(u.id).toLowerCase();
        const uIdRaw = u.id.toLowerCase();
        const uName = (u.name || u.nome || 'Sem Nome').toLowerCase();
        const uEmail = (u.email || '').toLowerCase();
        const uPhone = (u.phoneNumber || u.phone || '').toLowerCase();
        
        const matchesSearch = 
          uName.includes(searchLower) || 
          uEmail.includes(searchLower) || 
          uIdDisplay.includes(searchLower) || 
          uIdRaw.includes(searchLower) ||
          uPhone.includes(searchLower);
          
        if (!matchesSearch) return false;
      }
      
      // 2. Plan filter check
      if (userPlanFilter) {
        const plan = u.plan_type || 'Iniciante';
        if (plan !== userPlanFilter) return false;
      }
      
      // 3. Date check
      if (userDatePreset !== 'all') {
        if (!u.createdAt) return false;
        const regDate = new Date(u.createdAt);
        const today = new Date();
        
        if (userDatePreset === 'today') {
          const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          if (regDate < startOfToday) return false;
        } else if (userDatePreset === 'last7') {
          const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (regDate < sevenDaysAgo) return false;
        } else if (userDatePreset === 'last30') {
          const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (regDate < thirtyDaysAgo) return false;
        } else if (userDatePreset === 'custom') {
          if (userStartDate) {
            const startLimit = new Date(userStartDate);
            startLimit.setHours(0, 0, 0, 0);
            if (regDate < startLimit) return false;
          }
          if (userEndDate) {
            const endLimit = new Date(userEndDate);
            endLimit.setHours(23, 59, 59, 999);
            if (regDate > endLimit) return false;
          }
        }
      }
      
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return userSortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

  const getPaymentDisplayId = (paymentId: string) => {
    const sortedPayments = [...payments].sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    const index = sortedPayments.findIndex(p => p.id === paymentId);
    const numericStr = String(1000 + (index >= 0 ? index : payments.length));
    return `PG${numericStr}`;
  };

  const filteredPayments = payments
    .filter(p => p.status !== 'deleted')
    .filter(p => {
      // 1. Search term check
      const searchLower = paymentSearch.toLowerCase().trim();
      if (searchLower) {
        const associatedUser = users.find(u => u.id === p.userId);
        const uName = (associatedUser?.name || associatedUser?.nome || p.userId || '').toLowerCase();
        const uEmail = (associatedUser?.email || '').toLowerCase();
        const pIdDisplay = getPaymentDisplayId(p.id).toLowerCase();
        const pIdRaw = p.id.toLowerCase();
        const uIdDisplay = getUserDisplayId(p.userId).toLowerCase();
        const pMethod = (p.paymentMethod || '').toLowerCase();
        const pPlan = (p.planId || '').toLowerCase();
        const pExpr = (p.expressCode || '').toLowerCase();

        const matchesSearch =
          uName.includes(searchLower) ||
          uEmail.includes(searchLower) ||
          pIdDisplay.includes(searchLower) ||
          pIdRaw.includes(searchLower) ||
          uIdDisplay.includes(searchLower) ||
          pMethod.includes(searchLower) ||
          pPlan.includes(searchLower) ||
          pExpr.includes(searchLower);

        if (!matchesSearch) return false;
      }

      // 2. Status filter
      if (paymentStatusFilter) {
        const status = p.status || 'pending';
        if (status !== paymentStatusFilter) return false;
      }

      // 3. Method filter
      if (paymentMethodFilter) {
        if (p.paymentMethod !== paymentMethodFilter) return false;
      }

      // 4. Date filter
      if (paymentDatePreset !== 'all') {
        if (!p.createdAt) return false;
        const pDate = new Date(p.createdAt);
        const today = new Date();

        if (paymentDatePreset === 'today') {
          const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          if (pDate < startOfToday) return false;
        } else if (paymentDatePreset === 'last7') {
          const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (pDate < sevenDaysAgo) return false;
        } else if (paymentDatePreset === 'last30') {
          const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (pDate < thirtyDaysAgo) return false;
        } else if (paymentDatePreset === 'custom') {
          if (paymentStartDate) {
            const startLimit = new Date(paymentStartDate);
            startLimit.setHours(0, 0, 0, 0);
            if (pDate < startLimit) return false;
          }
          if (paymentEndDate) {
            const endLimit = new Date(paymentEndDate);
            endLimit.setHours(23, 59, 59, 999);
            if (pDate > endLimit) return false;
          }
        }
      }

      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return paymentSortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

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
      const fetchedCoupons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCoupons(fetchedCoupons);
      
      const hasDesconto50 = fetchedCoupons.some((c: any) => c.code === 'DESCONTODE50%');
      if (!hasDesconto50) {
        addDoc(collection(db, 'coupons'), {
          code: 'DESCONTODE50%',
          discountType: 'percentage',
          discountValue: 50,
          targetPlan: 'all',
          partnerRef: 'Plataforma',
          active: true,
          createdAt: new Date().toISOString()
        }).catch(err => console.error('Erro ao auto-criar cupão DESCONTODE50%:', err));
      }
    });

    // Listen to referrals
    const unsubReferrals = onSnapshot(query(collection(db, 'referrals'), orderBy('createdAt', 'desc')), (snapshot) => {
      setAdminReferrals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Listen to affiliate payouts
    const unsubPayouts = onSnapshot(query(collection(db, 'affiliate_payouts'), orderBy('createdAt', 'desc')), (snapshot) => {
      setAdminPayouts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Listen to broadcasts
    const unsubBroadcasts = onSnapshot(query(collection(db, 'broadcasts'), orderBy('createdAt', 'desc')), (snapshot) => {
      setBroadcasts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
      unsubBroadcasts();
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
      const daysToAdd = payment.planId === 'anual_16' ? 365 : (payment.planId === 'semestral_8' || payment.planId === 'semestral_6' ? 180 : (payment.planId === 'trimestral_6' ? 90 : 30));
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + daysToAdd);

      const userUpdateFields: any = {
        plan_type: payment.planId,
        expiry_date: expiryDate.toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (payment.usedCoupon) {
        userUpdateFields.usedCoupon = payment.usedCoupon;
      }

      await updateDoc(doc(db, 'usuarios', payment.userId), userUpdateFields);

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
            
            // Let's count how many approved referrals this referrer has already accomplished
            const qReferrerApproved = query(
              collection(db, 'referrals'),
              where('referrerId', '==', userData.referredBy),
              where('status', '==', 'approved')
            );
            const referrerApprovedSnap = await getDocs(qReferrerApproved);
            const refCount = referrerApprovedSnap.size;

            const isLevel5 = refCount >= 50; // Level 5 is unlocked at 50+ approved referrals

            // Calculate reward: Level 1-4 is strictly free month progression, Level 5 is cash commission
            let rewardType = 'free_month';
            let rewardVal: any = 0;

            if (isLevel5) {
              rewardType = 'commission_30';
              rewardVal = Math.round(payment.amount * 0.30); // 30% of subscription value in cash
            } else {
              rewardType = 'free_month';
              rewardVal = '1_month_free_progress'; // Progress towards free months
            }

            // Create referral doc with pending_approval status, which the maestro approves
            await addDoc(collection(db, 'referrals'), {
              referrerId: userData.referredBy,
              referredId: payment.userId,
              referredName: userData.nome || 'Novo Trader',
              referredEmail: userData.email,
              referredPlan: payment.planId,
              paymentAmount: payment.amount,
              rewardType: rewardType,
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
    setShowBillingModal(false);
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

  const handleDeleteBroadcast = async (id: string) => {
    if (!window.confirm('Tem a certeza que deseja apagar este comunicado?')) return;
    try {
      await deleteDoc(doc(db, 'broadcasts', id));
      alert('Comunicado apagado com sucesso!');
    } catch (e) {
      console.error(e);
      alert('Erro ao apagar comunicado.');
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
        <div className="space-y-4">
          {/* Polished Controls Bar with Search & Filters */}
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="font-extrabold text-[#00f5a0] flex items-center gap-2 text-base md:text-lg">
                  <Users size={20} /> Painel de Clientes & Usuários
                </h3>
                <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                  Mostrando <span className="text-white font-black">{filteredUsers.length}</span> de <span className="text-white font-black">{users.filter(u => u.status !== 'deleted').length}</span> usuários cadastrados.
                </p>
              </div>

              {/* Reset Filters button if any filter is active */}
              {(userSearch || userPlanFilter || userDatePreset !== 'all' || userStartDate || userEndDate) && (
                <button
                  onClick={() => {
                    setUserSearch('');
                    setUserPlanFilter('');
                    setUserDatePreset('all');
                    setUserStartDate('');
                    setUserEndDate('');
                    setUserSortOrder('newest');
                  }}
                  className="bg-primary/10 hover:bg-[#00f5a0]/15 hover:text-[#00f5a0] text-primary transition-all px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 border border-primary/20 hover:border-[#00f5a0]/30"
                >
                  <X size={14} /> Limpar Filtros
                </button>
              )}
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search input with magnfiying glass icon */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={16} />
                <input
                  type="text"
                  placeholder="Nome, e-mail ou Código ID..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant/20 rounded-xl pl-10 pr-4 py-3.5 text-sm text-on-surface outline-none focus:border-primary transition-all placeholder:text-on-surface-variant/40 font-medium"
                />
              </div>

              {/* Plan Filter dropdown */}
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/40 pointer-events-none">
                  <SlidersHorizontal size={16} />
                </div>
                <select
                  value={userPlanFilter}
                  onChange={(e) => setUserPlanFilter(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant/20 rounded-xl pl-10 pr-10 py-3.5 text-sm text-on-surface outline-none focus:border-primary appearance-none cursor-pointer font-bold"
                >
                  <option value="">Filtro: Todos Planos</option>
                  <option value="Iniciante">Iniciante / Gratuito</option>
                  <option value="trial_15">Trial 15 dias (Grátis)</option>
                  <option value="mensal_6">Mensal (6 Contas)</option>
                  <option value="trimestral_6">Trimestral (6 Contas)</option>
                  <option value="semestral_8">Semestral (8 Contas)</option>
                  <option value="anual_16">Anual (16 Contas)</option>
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant/60">
                   <span className="material-symbols-outlined text-sm">keyboard_arrow_down</span>
                </div>
              </div>

              {/* Date Preset Selection */}
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/40 pointer-events-none">
                  <Calendar size={16} />
                </div>
                <select
                  value={userDatePreset}
                  onChange={(e) => setUserDatePreset(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant/20 rounded-xl pl-10 pr-10 py-3.5 text-sm text-on-surface outline-none focus:border-primary appearance-none cursor-pointer font-bold"
                >
                  <option value="all">Data de Inscrição: Qualquer</option>
                  <option value="today">Sinalizado: Hoje</option>
                  <option value="last7">Inscrito: Últimos 7 dias</option>
                  <option value="last30">Inscrito: Últimos 30 dias</option>
                  <option value="custom">Filtrar por Período...</option>
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant/60">
                   <span className="material-symbols-outlined text-sm">keyboard_arrow_down</span>
                </div>
              </div>

              {/* Ordering order Selection */}
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/40 pointer-events-none">
                  <ArrowUpDown size={16} />
                </div>
                <select
                  value={userSortOrder}
                  onChange={(e) => setUserSortOrder(e.target.value as 'newest' | 'oldest')}
                  className="w-full bg-surface-container border border-outline-variant/20 rounded-xl pl-10 pr-10 py-3.5 text-sm text-on-surface outline-none focus:border-primary appearance-none cursor-pointer font-bold"
                >
                  <option value="newest">Inscrição: Mais Recente</option>
                  <option value="oldest">Inscrição: Mais Antigo</option>
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant/60">
                   <span className="material-symbols-outlined text-sm">keyboard_arrow_down</span>
                </div>
              </div>
            </div>

            {/* Custom Date Ranges inputs */}
            {userDatePreset === 'custom' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-outline-variant/10 animate-in slide-in-from-top-2 duration-200">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#00f5a0] ml-1 flex items-center gap-1">
                     <Calendar size={12} /> Data de Início
                  </span>
                  <input
                    type="date"
                    value={userStartDate}
                    onChange={(e) => setUserStartDate(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-on-surface outline-none focus:border-primary cursor-pointer text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#00f5a0] ml-1 flex items-center gap-1">
                     <Calendar size={12} /> Data Limite
                  </span>
                  <input
                    type="date"
                    value={userEndDate}
                    onChange={(e) => setUserEndDate(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-on-surface outline-none focus:border-primary cursor-pointer text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Table Container */}
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead className="bg-surface-container text-on-surface-variant text-xs uppercase tracking-widest border-b border-outline-variant/20">
                  <tr>
                    <th className="p-6 font-black">Usuário</th>
                    <th className="p-6 font-black">Plano</th>
                    <th className="p-6 font-black">Inscrição</th>
                    <th className="p-6 font-black">Expiração / Status</th>
                    <th className="p-6 font-black text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-16 text-center text-on-surface-variant/40 font-bold text-sm">
                        Nenhum usuário correspondente aos filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-surface-container/30 transition-colors">
                        <td className="p-6">
                          <p className="font-bold text-on-surface flex items-center gap-2">
                             {u.name || u.nome || 'Sem Nome'}
                             <span className="text-xs bg-surface-container font-mono px-2 py-0.5 rounded text-on-surface-variant font-black shrink-0">
                               {getUserDisplayId(u.id)}
                             </span>
                          </p>
                          <p className="text-xs text-on-surface-variant italic font-medium">{u.email}</p>
                        </td>
                        <td className="p-6">
                          <span className={`${
                            u.plan_type === 'trial_15'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : u.plan_type === 'Iniciante' || !u.plan_type
                              ? 'bg-neutral-500/10 text-neutral-400 border border-neutral-500/25'
                              : 'bg-primary/10 text-[#00f5a0] border border-[#00f5a0]/20'
                          } px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider`}>
                            {u.plan_type || 'Iniciante'}
                          </span>
                        </td>
                        <td className="p-6">
                          <p className="text-xs font-mono font-medium text-on-surface-variant">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}
                          </p>
                        </td>
                        <td className="p-6">
                          <p className="text-xs font-bold text-on-surface mb-1">
                            {u.expiry_date ? (u.expiry_date.toDate ? u.expiry_date.toDate() : new Date(u.expiry_date)).toLocaleDateString() : '-'}
                          </p>
                          <div className="flex items-center gap-2">
                             <div className={`w-2 h-2 rounded-full ${u.expiry_date && (u.expiry_date.toDate ? u.expiry_date.toDate() : new Date(u.expiry_date)) > new Date() ? 'bg-emerald-500' : 'bg-error'}`}></div>
                             <span className="text-[10px] font-black uppercase tracking-wider">{u.expiry_date && (u.expiry_date.toDate ? u.expiry_date.toDate() : new Date(u.expiry_date)) > new Date() ? 'Ativo' : 'Inativo'}</span>
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="flex flex-col sm:items-end gap-1.5">
                            <button 
                              onClick={() => setEditingUser(u)}
                              className="text-[#00f5a0] hover:text-[#00f5a0]/80 hover:underline text-[10px] font-black uppercase tracking-wider text-right shrink-0"
                            >
                              Editar Plano & Expiração
                            </button>
                            <button 
                              onClick={() => handleUpdateUser(u.id, { expiry_date: new Date(Date.now() - 86400000).toISOString() })}
                              className="text-error hover:text-error/80 hover:underline text-[10px] font-black uppercase tracking-wider text-right shrink-0"
                            >
                              Desativar Acesso
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(u.id)}
                              className="text-error/55 hover:text-error hover:underline text-[10px] font-bold uppercase tracking-wider text-right opacity-80 hover:opacity-100 shrink-0"
                              title="Apagar Usuário Totalmente"
                            >
                              Apagar Registro
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="space-y-4">
          {/* Polished Controls Bar with Search & Filters for Payments */}
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="font-extrabold text-[#00f5a0] flex items-center gap-2 text-base md:text-lg">
                  <CreditCard size={20} /> Controle e Filtro de Pagamentos
                </h3>
                <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                  Mostrando <span className="text-white font-black">{filteredPayments.length}</span> de <span className="text-white font-black">{payments.filter(p => p.status !== 'deleted').length}</span> solicitações de upgrade.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <button
                  onClick={() => setShowBillingModal(true)}
                  className="w-full md:w-auto bg-[#00f5a0] hover:bg-[#00f5a0]/90 text-background px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#00f5a0]/15 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Settings size={14} /> Configurar Dados de Cobrança
                </button>


                {/* Reset Filters button if any filter is active */}
                {(paymentSearch || paymentStatusFilter || paymentMethodFilter || paymentDatePreset !== 'all' || paymentStartDate || paymentEndDate) && (
                  <button
                    onClick={() => {
                      setPaymentSearch('');
                      setPaymentStatusFilter('');
                      setPaymentMethodFilter('');
                      setPaymentDatePreset('all');
                      setPaymentStartDate('');
                      setPaymentEndDate('');
                      setPaymentSortOrder('newest');
                    }}
                    className="w-full md:w-auto bg-primary/10 hover:bg-[#00f5a0]/15 hover:text-[#00f5a0] text-primary transition-all px-3.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 border border-primary/20 hover:border-[#00f5a0]/30"
                  >
                    <X size={14} /> Limpar Filtros
                  </button>
                )}
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search input with magnifying glass icon */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={16} />
                <input
                  type="text"
                  placeholder="Nome, e-mail, ID, Cód Express..."
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant/20 rounded-xl pl-10 pr-4 py-3.5 text-sm text-on-surface outline-none focus:border-primary transition-all placeholder:text-on-surface-variant/40 font-medium"
                />
              </div>

              {/* Status Filter dropdown */}
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/40 pointer-events-none">
                  <SlidersHorizontal size={16} />
                </div>
                <select
                  value={paymentStatusFilter}
                  onChange={(e) => setPaymentStatusFilter(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant/20 rounded-xl pl-10 pr-10 py-3.5 text-sm text-on-surface outline-none focus:border-primary appearance-none cursor-pointer font-bold"
                >
                  <option value="">Filtro: Todos Status</option>
                  <option value="pending">Pendente</option>
                  <option value="approved">Aprovado</option>
                  <option value="rejected">Rejeitado</option>
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant/60">
                   <span className="material-symbols-outlined text-sm">keyboard_arrow_down</span>
                </div>
              </div>

              {/* Method Filter dropdown */}
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/40 pointer-events-none">
                  <SlidersHorizontal size={16} />
                </div>
                <select
                  value={paymentMethodFilter}
                  onChange={(e) => setPaymentMethodFilter(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant/20 rounded-xl pl-10 pr-10 py-3.5 text-sm text-on-surface outline-none focus:border-primary appearance-none cursor-pointer font-bold"
                >
                  <option value="">Filtro: Todo Método</option>
                  <option value="express">Express</option>
                  <option value="iban">IBAN</option>
                  <option value="mcx">MCX / Referência</option>
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant/60">
                   <span className="material-symbols-outlined text-sm">keyboard_arrow_down</span>
                </div>
              </div>

              {/* Date Preset Selection */}
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/40 pointer-events-none">
                  <Calendar size={16} />
                </div>
                <select
                  value={paymentDatePreset}
                  onChange={(e) => setPaymentDatePreset(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant/20 rounded-xl pl-10 pr-10 py-3.5 text-sm text-on-surface outline-none focus:border-primary appearance-none cursor-pointer font-bold"
                >
                  <option value="all">Data: Qualquer Período</option>
                  <option value="today">Sinalizado: Hoje</option>
                  <option value="last7">Feito nos Últimos 7 dias</option>
                  <option value="last30">Feito nos Últimos 30 dias</option>
                  <option value="custom">Filtrar por Período...</option>
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant/60">
                   <span className="material-symbols-outlined text-sm">keyboard_arrow_down</span>
                </div>
              </div>
            </div>

            {/* Ordering and Dates */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-t border-outline-variant/10 pt-4">
              <div className="relative w-full sm:w-72">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/40 pointer-events-none">
                  <ArrowUpDown size={16} />
                </div>
                <select
                  value={paymentSortOrder}
                  onChange={(e) => setPaymentSortOrder(e.target.value as 'newest' | 'oldest')}
                  className="w-full bg-surface-container border border-outline-variant/20 rounded-xl pl-10 pr-10 py-3 text-xs text-on-surface outline-none focus:border-primary appearance-none cursor-pointer font-extrabold uppercase tracking-wider"
                >
                  <option value="newest">Mais Recentes Primeiro</option>
                  <option value="oldest">Mais Antigos Primeiro</option>
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant/60">
                   <span className="material-symbols-outlined text-sm">keyboard_arrow_down</span>
                </div>
              </div>

              {paymentDatePreset === 'custom' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 w-full animate-in slide-in-from-top-2 duration-200">
                  <div className="relative">
                    <input
                      type="date"
                      value={paymentStartDate}
                      onChange={(e) => setPaymentStartDate(e.target.value)}
                      className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-2.5 text-xs text-on-surface outline-none focus:border-primary cursor-pointer text-white font-bold"
                    />
                  </div>
                  <div className="relative">
                    <input
                      type="date"
                      value={paymentEndDate}
                      onChange={(e) => setPaymentEndDate(e.target.value)}
                      className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-2.5 text-xs text-on-surface outline-none focus:border-primary cursor-pointer text-white font-bold"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {filteredPayments.length > 0 ? filteredPayments.map(p => (
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
              <p className="text-on-surface-variant">Nenhum pagamento correspondente aos filtros aplicados.</p>
            </div>
          )}
        </div>
      )}

      {showBillingModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/85 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-surface-container border border-outline-variant/30 rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowBillingModal(false)}
              className="absolute top-6 right-6 p-2 text-on-surface-variant hover:text-white hover:bg-surface-container-high rounded-full transition-all"
              id="close-billing-modal-btn"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-bold text-[#00f5a0] mb-2 font-headline flex items-center gap-3">
              <Settings className="text-[#00f5a0]" />
              Dados para Recebimento (Cobrança)
            </h3>
            <p className="text-xs text-on-surface-variant mb-6"> Configure as opções de cobrança exibidas aos traders no momento do upgrade de plano.</p>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-surface-container-low p-4 rounded-2xl border border-outline-variant/15">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-on-surface text-xs">Ativar IBAN</p>
                    <p className="text-[9px] text-on-surface-variant uppercase tracking-tighter">Transferência bancária</p>
                  </div>
                  <button 
                    onClick={() => setSettings({ ...settings, showIban: !settings.showIban })}
                    className={`w-10 h-5 rounded-full transition-all relative shrink-0 ${settings.showIban ? 'bg-[#00f5a0]' : 'bg-surface-container-high border border-outline-variant/30'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${settings.showIban ? 'right-0.5 bg-background' : 'left-0.5 bg-on-surface-variant'}`}></div>
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-on-surface text-xs">Ativar Multicaixa</p>
                    <p className="text-[9px] text-on-surface-variant uppercase tracking-tighter">Entidade / Referência</p>
                  </div>
                  <button 
                    onClick={() => setSettings({ ...settings, showMulticaixa: !settings.showMulticaixa })}
                    className={`w-10 h-5 rounded-full transition-all relative shrink-0 ${settings.showMulticaixa ? 'bg-[#00f5a0]' : 'bg-surface-container-high border border-outline-variant/30'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${settings.showMulticaixa ? 'right-0.5 bg-background' : 'left-0.5 bg-on-surface-variant'}`}></div>
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-on-surface text-xs">Ativar Express</p>
                    <p className="text-[9px] text-on-surface-variant uppercase tracking-tighter">MCX Express</p>
                  </div>
                  <button 
                    onClick={() => setSettings({ ...settings, showExpress: settings.showExpress !== false ? false : true })}
                    className={`w-10 h-5 rounded-full transition-all relative shrink-0 ${settings.showExpress !== false ? 'bg-[#00f5a0]' : 'bg-surface-container-high border border-outline-variant/30'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${settings.showExpress !== false ? 'right-0.5 bg-background' : 'left-0.5 bg-on-surface-variant'}`}></div>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#00f5a0] uppercase tracking-widest pl-1 font-mono">WhatsApp de Suporte</label>
                <input 
                  type="text" 
                  value={settings.whatsappNumber}
                  onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-5 py-3 text-on-surface focus:outline-none focus:border-[#00f5a0] transition-all font-medium text-sm text-white"
                  placeholder="Ex: 244921319200"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#00f5a0] uppercase tracking-widest pl-1 font-mono">Logo Multicaixa Express (URL)</label>
                <div className="flex gap-4 items-center">
                  <input 
                    type="text" 
                    value={settings.multicaixaLogoUrl}
                    onChange={(e) => setSettings({ ...settings, multicaixaLogoUrl: e.target.value })}
                    className="flex-1 bg-surface-container-low border border-outline-variant/20 rounded-2xl px-5 py-3 text-on-surface focus:outline-none focus:border-[#00f5a0] transition-all font-medium text-sm text-white"
                    placeholder="https://..."
                  />
                  {settings.multicaixaLogoUrl && (
                    <img src={settings.multicaixaLogoUrl} alt="Logo Preview" className="h-10 w-10 object-contain bg-white rounded-xl p-1 shrink-0 animate-in fade-in" />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#00f5a0] uppercase tracking-widest pl-1 font-mono">Telemóvel MCX Express (Destinatário)</label>
                <input 
                  type="text" 
                  value={settings.expressNumber || ''}
                  onChange={(e) => setSettings({ ...settings, expressNumber: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-5 py-3 text-on-surface focus:outline-none focus:border-[#00f5a0] transition-all font-medium text-sm text-white"
                  placeholder="Ex: 921167980"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#00f5a0] uppercase tracking-widest pl-1 font-mono">IBAN de Depósito</label>
                  <input 
                    type="text" 
                    value={settings.iban}
                    onChange={(e) => setSettings({ ...settings, iban: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-5 py-3 text-on-surface focus:outline-none focus:border-[#00f5a0] transition-all font-medium text-sm text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#00f5a0] uppercase tracking-widest pl-1 font-mono">Titular da Conta (IBAN)</label>
                  <input 
                    type="text" 
                    value={settings.ibanName || ''}
                    onChange={(e) => setSettings({ ...settings, ibanName: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-5 py-3 text-on-surface focus:outline-none focus:border-[#00f5a0] transition-all font-medium text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#00f5a0] uppercase tracking-widest pl-1 font-mono">Entidade MCX (Código)</label>
                  <input 
                    type="text" 
                    value={settings.multicaixaEntity}
                    onChange={(e) => setSettings({ ...settings, multicaixaEntity: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-5 py-3 text-on-surface focus:outline-none focus:border-[#00f5a0] transition-all font-medium text-sm text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#00f5a0] uppercase tracking-widest pl-1 font-mono">Referência MCX</label>
                  <input 
                    type="text" 
                    value={settings.multicaixaReference}
                    onChange={(e) => setSettings({ ...settings, multicaixaReference: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-5 py-3 text-on-surface focus:outline-none focus:border-[#00f5a0] transition-all font-medium text-sm text-white"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#00f5a0] uppercase tracking-widest pl-1 font-mono">Nome do Beneficiário (Cobrador MCX)</label>
                <input 
                  type="text" 
                  value={settings.multicaixaName || ''}
                  onChange={(e) => setSettings({ ...settings, multicaixaName: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-5 py-3 text-on-surface focus:outline-none focus:border-[#00f5a0] transition-all font-medium text-sm text-white"
                  placeholder="Nome da Empresa / Negócio"
                />
              </div>

              <div className="flex gap-4 pt-6 border-t border-outline-variant/10">
                <button 
                  onClick={() => setShowBillingModal(false)}
                  className="flex-grow py-3 px-6 bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/20 text-on-surface hover:text-white transition-all rounded-xl font-bold uppercase tracking-widest text-xs"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveSettings}
                  className="flex-grow bg-[#00f5a0] hover:bg-[#00f5a0]/90 text-background py-3 px-6 rounded-xl font-black hover:scale-[1.01] transition-all shadow-xl shadow-[#00f5a0]/15 uppercase tracking-widest flex items-center justify-center gap-2 text-xs"
                >
                  <Check size={16} />
                  Salvar Alterações
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBroadcastModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/85 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-surface-container border border-outline-variant/30 rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowBroadcastModal(false)}
              className="absolute top-6 right-6 p-2 text-on-surface-variant hover:text-white hover:bg-surface-container-high rounded-full transition-all"
              id="close-broadcast-modal-btn"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-bold text-[#00f5a0] mb-2 font-headline flex items-center gap-3">
              <Megaphone className="text-[#00f5a0]" />
              Comunicados &amp; Avisos à Comunidade
            </h3>
            <p className="text-xs text-on-surface-variant mb-6">Podes publicar comunicados urgentes ou atualizações que todos os membros verão instantaneamente ao carregar a plataforma.</p>

            {/* Inner Tabs for Writing Mode & History Mode */}
            <div className="flex gap-2 p-1.5 bg-surface-container-low rounded-xl border border-outline-variant/15 mb-6">
              <button
                onClick={() => setBroadcastTab('create')}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                  broadcastTab === 'create'
                    ? 'bg-[#00f5a0] text-background font-black shadow-md shadow-[#00f5a0]/10'
                    : 'text-on-surface-variant hover:text-white hover:bg-surface-container-high'
                }`}
              >
                <Plus size={14} /> Novo Comunicado
              </button>
              <button
                onClick={() => setBroadcastTab('history')}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                  broadcastTab === 'history'
                    ? 'bg-[#00f5a0] text-background font-black shadow-md shadow-[#00f5a0]/10'
                    : 'text-on-surface-variant hover:text-white hover:bg-surface-container-high'
                }`}
              >
                <History size={14} /> Histórico de Envios ({broadcasts.length})
              </button>
            </div>

            {/* Tab 1: Create Broadcast */}
            {broadcastTab === 'create' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#00f5a0] uppercase tracking-widest pl-1 font-mono">Texto do Comunicado</label>
                  <textarea
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder="Escreva a nova atualização, aviso ou comunicado importante..."
                    className="w-full bg-surface-container border border-outline-variant/20 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-[#00f5a0] transition-all min-h-[160px] resize-none text-sm placeholder:text-on-surface-variant/40"
                  />
                </div>

                <div className="flex gap-4 pt-4 border-t border-outline-variant/10">
                  <button 
                    onClick={() => setShowBroadcastModal(false)}
                    className="flex-grow py-3 px-6 bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/20 text-on-surface hover:text-white transition-all rounded-xl font-bold uppercase tracking-widest text-xs"
                  >
                    Fechar
                  </button>
                  <button 
                    onClick={async () => {
                      if (!broadcastMessage.trim()) return alert('Por favor, escreva uma mensagem antes de publicar.');
                      await handleSendBroadcast();
                      setBroadcastTab('history');
                    }}
                    className="flex-grow bg-[#00f5a0] hover:bg-[#00f5a0]/90 text-background py-3 px-6 rounded-xl font-black hover:scale-[1.01] transition-all shadow-xl shadow-[#00f5a0]/15 uppercase tracking-widest flex items-center justify-center gap-2 text-xs"
                  >
                    <Check size={16} />
                    Publicar Agora
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: History List */}
            {broadcastTab === 'history' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                  {broadcasts.length === 0 ? (
                    <div className="text-center py-12 bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/20">
                      <p className="text-xs text-on-surface-variant italic">Nenhum comunicado enviado até ao momento.</p>
                    </div>
                  ) : (
                    broadcasts.map((b) => (
                      <div key={b.id} className="bg-surface-container-low border border-outline-variant/15 rounded-2xl p-4 space-y-3 hover:border-[#00f5a0]/20 transition-all">
                        <div className="flex justify-between items-start gap-3">
                          <div>
                            <p className="text-xs font-bold text-[#00f5a0]">{b.author || 'Admin'}</p>
                            <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">
                              {b.createdAt ? new Date(b.createdAt).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteBroadcast(b.id)}
                            className="p-1.5 text-error/60 hover:text-error hover:bg-error/10 rounded-lg transition-all"
                            title="Eliminar este comunicado"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <p className="text-xs text-white leading-relaxed bg-surface-container p-3 rounded-xl select-text border border-outline-variant/5">
                          {b.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex gap-4 pt-4 border-t border-outline-variant/10">
                  <button 
                    onClick={() => setShowBroadcastModal(false)}
                    className="w-full py-3 px-6 bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/20 text-on-surface hover:text-white transition-all rounded-xl font-bold uppercase tracking-widest text-xs"
                  >
                    Voltar
                  </button>
                </div>
              </div>
            )}
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
                  <th className="p-6 font-black text-center">Registos / Usos</th>
                  <th className="p-6 font-black">Status</th>
                  <th className="p-6 font-black">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {coupons.map(c => {
                  const usagesCount = users.filter(u => u.usedCoupon === c.code).length;
                  return (
                    <tr key={c.id} className="hover:bg-surface-container/30 transition-colors">
                      <td className="p-6 font-mono font-bold">
                        <button
                          onClick={() => {
                            setSelectedCouponFilter(c.code);
                            const element = document.getElementById('coupon-referrals-section');
                            if (element) {
                              element.scrollIntoView({ behavior: 'smooth' });
                            }
                          }}
                          className="bg-primary/10 hover:bg-[#00f5a0]/15 hover:text-[#00f5a0] text-[#00f5a0] px-3.5 py-1.5 rounded-xl text-sm font-black tracking-widest uppercase border border-[#00f5a0]/20 hover:border-[#00f5a0]/40 transition-all"
                        >
                          {c.code}
                        </button>
                      </td>
                      <td className="p-6 text-on-surface font-black">
                        {c.discountType === 'percentage' ? `${c.discountValue}%` : `Kz ${c.discountValue}`}
                      </td>
                      <td className="p-6 text-sm text-on-surface-variant">{c.targetPlan === 'all' ? 'Todos' : c.targetPlan}</td>
                      <td className="p-6 text-sm text-on-surface-variant">{c.partnerRef || '-'}</td>
                      <td className="p-6 text-center">
                        <button
                          onClick={() => {
                            setSelectedCouponFilter(c.code);
                            const element = document.getElementById('coupon-referrals-section');
                            if (element) {
                              element.scrollIntoView({ behavior: 'smooth' });
                            }
                          }}
                          className="bg-surface-container text-white text-xs px-3 py-1.5 rounded-lg border border-outline-variant/20 font-black hover:bg-surface-container-high transition-colors"
                        >
                          {usagesCount} {usagesCount === 1 ? 'membro' : 'membros'}
                        </button>
                      </td>
                      <td className="p-6">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${c.active ? 'bg-emerald-500/20 text-emerald-500' : 'bg-error/20 text-error'}`}>
                          {c.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="p-6 flex items-center gap-3">
                        <button onClick={() => handleToggleCoupon(c.id, c.active)} className="text-xs shrink-0 font-extrabold bg-[#00f5a0]/10 hover:bg-[#00f5a0]/20 text-[#00f5a0] px-3 py-1.5 rounded-lg border border-[#00f5a0]/20 hover:underline">
                          {c.active ? 'Desativar' : 'Ativar'}
                        </button>
                        <button onClick={() => handleDeleteCoupon(c.id)} className="text-xs shrink-0 font-extrabold bg-error/10 hover:bg-error/20 text-error px-3 py-1.5 rounded-lg border border-error/20 hover:underline">Apagar</button>
                      </td>
                    </tr>
                  );
                })}
                {coupons.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-on-surface-variant">Nenhum cupão criado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div id="coupon-referrals-section" className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-8 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-xl font-bold text-on-surface font-headline flex items-center gap-2">
                  <Ticket size={22} className="text-[#00f5a0]" /> Relatório de Indicações (Histórico de Cadastro)
                </h3>
                <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                  Mostrando <span className="text-white font-black">{
                    users.filter(u => u.usedCoupon)
                         .filter(u => !selectedCouponFilter || u.usedCoupon === selectedCouponFilter)
                         .filter(u => {
                           if (!couponSearchQuery) return true;
                           const term = couponSearchQuery.toLowerCase();
                           return (u.name || '').toLowerCase().includes(term) ||
                                  (u.email || '').toLowerCase().includes(term) ||
                                  (u.usedCoupon || '').toLowerCase().includes(term) ||
                                  (u.partnerRef || '').toLowerCase().includes(term);
                         }).length
                  }</span> de <span className="text-white font-black">{users.filter(u => u.usedCoupon).length}</span> indicações registadas no total.
                </p>
              </div>

              {(couponSearchQuery || selectedCouponFilter) && (
                <button
                  onClick={() => {
                    setCouponSearchQuery('');
                    setSelectedCouponFilter('');
                  }}
                  className="bg-primary/10 hover:bg-[#00f5a0]/15 hover:text-[#00f5a0] text-[#00f5a0] transition-all px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 border border-primary/20 hover:border-[#00f5a0]/30"
                >
                  <X size={14} /> Limpar Filtro
                </button>
              )}
            </div>

            {/* Controls Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Search Box */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={16} />
                <input
                  type="text"
                  placeholder="Pesquisar por nome, e-mail ou cupão..."
                  value={couponSearchQuery}
                  onChange={(e) => setCouponSearchQuery(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant/20 rounded-xl pl-10 pr-4 py-3.5 text-sm text-on-surface outline-none focus:border-primary transition-all placeholder:text-on-surface-variant/40 font-medium"
                />
              </div>

              {/* Coupon Dropdown Filter */}
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/40 pointer-events-none">
                  <SlidersHorizontal size={16} />
                </div>
                <select
                  value={selectedCouponFilter}
                  onChange={(e) => setSelectedCouponFilter(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant/20 rounded-xl pl-10 pr-10 py-3.5 text-sm text-on-surface outline-none focus:border-primary appearance-none cursor-pointer font-bold"
                >
                  <option value="">Filtrar: Todos os Cupões</option>
                  {coupons.map(cp => (
                    <option key={cp.id} value={cp.code}>{cp.code} ({cp.active ? 'Ativo' : 'Inativo'})</option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant/60">
                   <span className="material-symbols-outlined text-sm">keyboard_arrow_down</span>
                </div>
              </div>
            </div>

            <div className="overflow-hidden border border-outline-variant/10 rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container text-on-surface-variant text-[10px] uppercase tracking-widest">
                  <tr>
                    <th className="p-4 font-black">Usuário</th>
                    <th className="p-4 font-black">Cupão Utilizado</th>
                    <th className="p-4 font-black">Parceiro / Referência</th>
                    <th className="p-4 font-black">Status da Conta</th>
                    <th className="p-4 font-black">Data Registo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {users
                    .filter(u => u.usedCoupon)
                    .filter(u => !selectedCouponFilter || u.usedCoupon === selectedCouponFilter)
                    .filter(u => {
                      if (!couponSearchQuery) return true;
                      const term = couponSearchQuery.toLowerCase();
                      return (u.name || '').toLowerCase().includes(term) ||
                             (u.email || '').toLowerCase().includes(term) ||
                             (u.usedCoupon || '').toLowerCase().includes(term) ||
                             (u.partnerRef || '').toLowerCase().includes(term);
                    })
                    .map(u => (
                      <tr key={u.id} className="hover:bg-surface-container/30 transition-colors">
                        <td className="p-4">
                          <p className="font-bold text-sm text-on-surface">{u.name || 'Trader Sem Nome'}</p>
                          <p className="text-[11px] text-on-surface-variant font-mono">{u.email}</p>
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => setSelectedCouponFilter(u.usedCoupon)}
                            className="text-xs font-mono text-primary font-black bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-lg border border-primary/20 transition-all uppercase"
                          >
                            {u.usedCoupon}
                          </button>
                        </td>
                        <td className="p-4 text-xs text-on-surface-variant font-medium">{u.partnerRef || '-'}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                            u.plan_type === 'trial_15' 
                              ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                              : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                          }`}>
                            {u.plan_type?.replace('_', ' ') || 'Trial'}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-on-surface-variant">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}</td>
                      </tr>
                    ))}
                  {users
                    .filter(u => u.usedCoupon)
                    .filter(u => !selectedCouponFilter || u.usedCoupon === selectedCouponFilter)
                    .filter(u => {
                      if (!couponSearchQuery) return true;
                      const term = couponSearchQuery.toLowerCase();
                      return (u.name || '').toLowerCase().includes(term) ||
                             (u.email || '').toLowerCase().includes(term) ||
                             (u.usedCoupon || '').toLowerCase().includes(term) ||
                             (u.partnerRef || '').toLowerCase().includes(term);
                    }).length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-xs text-on-surface-variant italic">
                        Nenhum registro encontrado com estes filtros.
                      </td>
                    </tr>
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
        <div className="space-y-6">
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-outline-variant/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
               <div>
                  <h3 className="text-xl font-bold text-on-surface font-headline">Administradores e Maestros</h3>
                  <p className="text-sm text-on-surface-variant mt-2">Os usuários listados abaixo têm controle total sobre as configurações da plataforma e listagem de usuários.</p>
               </div>
               <button
                  onClick={() => {
                    setBroadcastTab('create');
                    setShowBroadcastModal(true);
                  }}
                  className="w-full sm:w-auto bg-[#00f5a0] hover:bg-[#00f5a0]/90 text-background px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#00f5a0]/15 hover:scale-[1.02] active:scale-[0.98] transition-all"
               >
                  <Megaphone size={14} /> Avisos / Comunicados
               </button>
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
                  alert('Modo Alterado: Convidar 5 Traders = 1 Mês Grátis!');
                }}
                className={`p-5 rounded-2xl border text-left flex items-start gap-4 transition-all ${
                  (settings?.affiliateMode || 'commission_30') === 'free_month' 
                    ? 'bg-amber-500/5 border-amber-500 text-on-surface shadow-md' 
                    : 'bg-surface-container-high/40 border-outline-variant/15 text-on-surface hover:bg-surface-container-high'
                }`}
              >
                <span className="material-symbols-outlined text-amber-500 text-3xl">gif_box</span>
                <div>
                  <p className="font-bold text-sm">Opção 1: Convidar 5 = 1 Mês Grátis (Modo Parceria)</p>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                    Ideal para crescimento orgânico acelerado. A cada 5 recomendações registadas, o afiliado ganha 1 mês grátis (as recomendações recebem 15 dias de teste grátis).
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
              Desejas premiar um convidado de forma manual ou liberar prêmio avulso? Pode selecionar o afiliado abaixo e creditar 30 dias de acesso completo à plataforma (validando o bónus do convite de 5 utilizadores).
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
