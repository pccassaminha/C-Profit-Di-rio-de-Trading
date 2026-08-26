import React, { useState, useEffect } from 'react';
import { db, auth, registerNewMaestroAuth } from '../firebase';
import { collection, getDocs, doc, getDoc, updateDoc, onSnapshot, query, orderBy, setDoc, addDoc, deleteDoc, where } from 'firebase/firestore';
import { useTrades } from '../hooks/useTrades';
import Modal from './Modal';
import { 
  Users, Settings, CreditCard, Check, X, ShieldAlert, Phone, Landmark, Ticket, 
  AlertTriangle, Search, Calendar, SlidersHorizontal, ArrowUpDown, Megaphone, 
  History, Plus, Trash2, Pencil, FileText, ChevronDown, Banknote, BadgeDollarSign, 
  Handshake, ClipboardList, Gift, Coins, Clock, Wallet, UserPlus, Bell, Smartphone, 
  Radio, CheckCircle2, Sparkles, Send, BellRing, MessageSquare, AlertCircle, Info, 
  RefreshCw, Laptop, Eye, SmartphoneCharging
} from 'lucide-react';
import { triggerNativeNotification, requestPushPermission } from '../services/notificationService';

const getFormattedPhone = (phone: string | undefined): string => {
  if (!phone) return '';
  let clean = phone.replace(/\D/g, '');
  if (clean.length === 9 && clean.startsWith('9')) {
    return '244' + clean;
  }
  return clean;
};

export default function AdminPanel() {
  const { userPlan, globalSettings: initialSettings } = useTrades();
  const currentUser = auth.currentUser;
  
  // Super Admin check
  const isSuperAdmin = currentUser?.email === 'exportacoes.extras@gmail.com' || currentUser?.email === 'omilionario.extra@gmail.com' || userPlan?.role === 'admin';

  const [activeTab, setActiveTab ] = useState<'users' | 'payments' | 'settings' | 'coupons' | 'broadcast' | 'maestros' | 'affiliates' | 'alerts'>('users');
  const [affiliateTab, setAffiliateTab] = useState<'overview' | 'config' | 'commissions' | 'payouts' | 'trials'>('overview');
  const [affilSearch, setAffilSearch] = useState('');
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const [showBillingModal, setShowBillingModal] = useState<boolean>(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState<boolean>(false);
  const [broadcastTab, setBroadcastTab] = useState<'create' | 'history'>('create');
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [adminReferrals, setAdminReferrals] = useState<any[]>([]);
  const [adminPayouts, setAdminPayouts] = useState<any[]>([]);
  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [selectedStatList, setSelectedStatList] = useState<'faturado' | 'descontos' | 'parceiros' | null>(null);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [newMaestroName, setNewMaestroName] = useState('');
  const [newMaestroEmail, setNewMaestroEmail] = useState('');
  const [newMaestroPassword, setNewMaestroPassword] = useState('');
  const [newMaestroSubmitting, setNewMaestroSubmitting] = useState(false);

  // Alerts & Notifications Management State
  const [alertViewMode, setAlertViewMode] = useState<'overview' | 'send' | 'history' | 'triggers'>('overview');
  const [manualTarget, setManualTarget] = useState<'all' | 'free' | 'premium' | 'specific'>('all');
  const [manualTargetUserId, setManualTargetUserId] = useState('');
  const [manualTargetSearch, setManualTargetSearch] = useState('');
  const [manualAlertTitle, setManualAlertTitle] = useState('');
  const [manualAlertBody, setManualAlertBody] = useState('');
  const [manualAlertType, setManualAlertType] = useState<'broadcast' | 'system_alert' | 'update' | 'tip' | 'urgent'>('broadcast');
  const [manualAlertActionTab, setManualAlertActionTab] = useState<'dashboard' | 'plans' | 'community' | 'trades' | 'affiliates_user'>('dashboard');
  const [manualAlertSending, setManualAlertSending] = useState(false);
  const [alertHistoryFilter, setAlertHistoryFilter] = useState<'all' | 'broadcast' | 'system_alert' | 'user_registration' | 'payment_pending' | 'community_post' | 'subscription_expiring'>('all');
  const [alertSearchQuery, setAlertSearchQuery] = useState('');

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

  // Community settings states inside Maestro panel
  const [showCommunityModal, setShowCommunityModal] = useState<boolean>(false);
  const [localPlatform, setLocalPlatform] = useState('');
  const [localLink, setLocalLink] = useState('');
  const [isSavingCommunity, setIsSavingCommunity] = useState(false);

  // Coupon search and filter states
  const [couponSearchQuery, setCouponSearchQuery] = useState('');
  const [selectedCouponFilter, setSelectedCouponFilter] = useState('');
  const [showReferralsReport, setShowReferralsReport] = useState(false);

  const [settings, setSettings] = useState(() => {
    const defaults = {
      whatsappNumber: '',
      expressNumber: '',
      iban: '',
      ibanName: '',
      ibanBank: '',
      multicaixaEntity: '',
      multicaixaReference: '',
      multicaixaName: '',
      showIban: true,
      showMulticaixa: true,
      showExpress: true,
      showKwik: true,
      kwikKey: '',
      kwikName: '',
      multicaixaLogoUrl: '',
      usdtQrCodeUrl: '',
      usdtAddress: '',
      usdtLegend: '',
      usdtExchangeRateMode: 'manual',
      usdtManualRate: 1000,
      usdtNetworkFee: 1
    };
    return initialSettings ? { ...defaults, ...initialSettings } : defaults;
  });

  useEffect(() => {
    if (initialSettings) {
      setSettings(prev => ({
        showIban: true,
        showMulticaixa: true,
        showExpress: true,
        showKwik: true,
        ...prev,
        ...initialSettings
      }));
    }
  }, [initialSettings]);

  useEffect(() => {
    if (activeTab !== 'maestros') {
      setShowDangerZone(false);
    }
  }, [activeTab]);

  const [activePaymentTab, setActivePaymentTab] = useState<'iban' | 'usdt' | 'express' | 'kwik' | 'ads'>('iban');

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
    return `MC-${numericStr}`;
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

  const isFictitiousPayment = (p: any) => {
    const displayId = getPaymentDisplayId(p.id);
    const correspondingUser = users.find(u => u.id === p.userId);
    const customerName = (p.userName || correspondingUser?.name || correspondingUser?.nome || '').toLowerCase();
    const customerEmail = (correspondingUser?.email || p.userEmail || '').toLowerCase();
    const isEdmundo = customerName.includes('edmundo') || customerEmail.includes('edmundo');
    return isEdmundo && displayId !== 'PG1005';
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
    }, (err) => console.warn('AdminPanel usuarios snapshot error:', err));

    // Listen to payments
    const qPayments = query(collection(db, 'payments'), orderBy('createdAt', 'desc'));
    const unsubPayments = onSnapshot(qPayments, (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.warn('AdminPanel payments snapshot error:', err));

    // Listen to coupons
    const qCoupons = query(collection(db, 'coupons'));
    const unsubCoupons = onSnapshot(qCoupons, (snapshot) => {
      const fetchedCoupons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCoupons(fetchedCoupons);
    }, (err) => console.warn('AdminPanel coupons snapshot error:', err));

    // Auto-create default coupon once on mount/admin load if not exists
    const checkAndCreateDefaultCoupon = async () => {
      try {
        const q = query(collection(db, 'coupons'), where('code', '==', 'CPROFIT83%OFF'));
        const snap = await getDocs(q);
        if (snap.empty) {
          await addDoc(collection(db, 'coupons'), {
            code: 'CPROFIT83%OFF',
            discountType: 'percentage',
            discountValue: 83,
            targetPlan: 'all',
            partnerRef: 'Plataforma',
            active: true,
            createdAt: new Date().toISOString()
          });
          console.log('Cupão CPROFIT83%OFF criado com sucesso!');
        } else {
          const couponDoc = snap.docs[0];
          if (couponDoc.data().discountValue !== 83) {
            await updateDoc(doc(db, 'coupons', couponDoc.id), {
              discountValue: 83
            });
            console.log('Cupão CPROFIT83%OFF atualizado para 83% de desconto!');
          }
        }
      } catch (err) {
        console.error('Erro ao auto-criar cupão CPROFIT83%OFF:', err);
      }
    };
    checkAndCreateDefaultCoupon();

    // Listen to referrals
    const unsubReferrals = onSnapshot(query(collection(db, 'referrals'), orderBy('createdAt', 'desc')), (snapshot) => {
      setAdminReferrals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.warn('AdminPanel referrals snapshot error:', err));

    // Listen to affiliate payouts
    const unsubPayouts = onSnapshot(query(collection(db, 'affiliate_payouts'), orderBy('createdAt', 'desc')), (snapshot) => {
      setAdminPayouts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.warn('AdminPanel payouts snapshot error:', err));

    // Listen to broadcasts
    const unsubBroadcasts = onSnapshot(query(collection(db, 'broadcasts'), orderBy('createdAt', 'desc')), (snapshot) => {
      setBroadcasts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.warn('AdminPanel broadcasts snapshot error:', err));

    // Listen to notifications
    const unsubNotifications = onSnapshot(query(collection(db, 'notifications'), orderBy('createdAt', 'desc')), (snapshot) => {
      setNotificationsList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.warn('AdminPanel notifications snapshot error:', err));

    // Listen to global settings to keep settings state fully active in real time
    const unsubGlobalSettings = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(prev => ({ 
          ...prev, 
          ...docSnap.data() 
        }));
      }
    }, (err) => console.warn('AdminPanel global settings snapshot error:', err));

    setLoading(false);
    return () => {
      unsubUsers();
      unsubPayments();
      unsubCoupons();
      unsubReferrals();
      unsubPayouts();
      unsubBroadcasts();
      unsubNotifications();
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

      if (payment.planId === 'trial_30') {
        userUpdateFields.hadTrial30 = true;
      }

      if (payment.usedCoupon) {
        userUpdateFields.usedCoupon = payment.usedCoupon;
      }

      let targetUserRef = doc(db, 'usuarios', payment.userId);
      let userSnap = await getDoc(targetUserRef);
      
      if (!userSnap.exists()) {
        const oldUserRef = doc(db, 'users', payment.userId);
        const oldUserSnap = await getDoc(oldUserRef);
        if (oldUserSnap.exists()) {
          targetUserRef = oldUserRef;
          userSnap = oldUserSnap;
        }
      }

      await setDoc(targetUserRef, userUpdateFields, { merge: true });

      // 3. Referral check (affiliate commission)
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
    try {
      await setDoc(doc(db, 'settings', 'global'), settings);
      alert('Configurações salvas!');
      setShowBillingModal(false);
    } catch (err: any) {
      console.error('Erro ao salvar as configurações:', err);
      alert('Erro ao salvar configurações: ' + (err.message || err));
    }
  };

  const handleSaveCommunityConfig = async () => {
    if (!localPlatform.trim()) {
      alert('Por favor introduza o nome da plataforma (ex: Telegram, WhatsApp, Discord).');
      return;
    }
    if (!localLink.trim()) {
      alert('Por favor introduza o link da comunidade.');
      return;
    }
    setIsSavingCommunity(true);
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        communityPlatform: localPlatform.trim(),
        communityLink: localLink.trim()
      }, { merge: true });
      
      setSettings(prev => ({
        ...prev,
        communityPlatform: localPlatform.trim(),
        communityLink: localLink.trim()
      }));
      
      alert('Configuração da comunidade atualizada com sucesso!');
      setShowCommunityModal(false);
    } catch (err) {
      console.error('Erro ao guardar configurações de comunidade:', err);
      alert('Erro de rede ou permissões ao guardar as configurações.');
    } finally {
      setIsSavingCommunity(false);
    }
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

  const handleSendManualAlert = async () => {
    if (!manualAlertTitle.trim()) return alert('Por favor, digite um título para a notificação.');
    if (!manualAlertBody.trim()) return alert('Por favor, digite a mensagem da notificação.');
    if (manualTarget === 'specific' && !manualTargetUserId) return alert('Por favor, selecione o trader destinatário na lista.');

    setManualAlertSending(true);
    try {
      let targetUserIds: string[] = [];
      let targetLabel = 'Todos os Usuários (Global)';

      if (manualTarget === 'all') {
        targetUserIds = ['all'];
      } else if (manualTarget === 'free') {
        targetUserIds = users.filter(u => !u.plan_type || u.plan_type === 'gratuito' || u.plan_type === 'free').map(u => u.id);
        targetLabel = 'Usuários Plano Free / Iniciante';
      } else if (manualTarget === 'premium') {
        targetUserIds = users.filter(u => u.plan_type && u.plan_type !== 'gratuito' && u.plan_type !== 'free').map(u => u.id);
        targetLabel = 'Usuários Planos Premium';
      } else if (manualTarget === 'specific') {
        targetUserIds = [manualTargetUserId];
        const found = users.find(u => u.id === manualTargetUserId);
        targetLabel = found ? `Trader: ${found.nome || found.email}` : 'Trader Específico';
      }

      // Write to notifications collection
      for (const targetId of targetUserIds) {
        await addDoc(collection(db, 'notifications'), {
          userId: targetId,
          type: manualAlertType,
          title: manualAlertTitle.trim(),
          body: manualAlertBody.trim(),
          actionTab: manualAlertActionTab,
          targetLabel: targetLabel,
          author: currentUser?.displayName || currentUser?.email || 'Admin Master',
          read: false,
          createdAt: new Date().toISOString()
        });
      }

      // If global or broadcast, also add to broadcasts collection
      if (manualTarget === 'all' || manualAlertType === 'broadcast') {
        await addDoc(collection(db, 'broadcasts'), {
          message: `${manualAlertTitle.trim()}: ${manualAlertBody.trim()}`,
          createdAt: new Date().toISOString(),
          author: currentUser?.displayName || 'Admin Master'
        });
      }

      // Trigger instant push notification locally
      triggerNativeNotification(
        manualAlertTitle.trim(),
        manualAlertBody.trim(),
        manualAlertActionTab,
        'https://i.postimg.cc/v8qJ6KTk/C-profit.png'
      );

      setManualAlertTitle('');
      setManualAlertBody('');
      setManualTargetUserId('');
      setManualTargetSearch('');
      alert(`✅ Notificação disparada com sucesso para ${targetLabel}!`);
      setAlertViewMode('history');
    } catch (e: any) {
      console.error('Erro ao disparar notificação:', e);
      alert('Erro ao enviar notificação: ' + (e.message || e));
    } finally {
      setManualAlertSending(false);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    if (!window.confirm('Deseja apagar este registo de notificação?')) return;
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (e) {
      console.error(e);
      alert('Erro ao apagar notificação.');
    }
  };

  const handleTestPush = async () => {
    const perm = await requestPushPermission();
    if (perm === 'granted') {
      triggerNativeNotification(
        '🔔 Notificação Push C Profit Ativa!',
        'O sistema de notificações Push e PWA está 100% operacional no seu dispositivo.',
        'dashboard',
        'https://i.postimg.cc/v8qJ6KTk/C-profit.png'
      );
      alert('Notificação Push de teste disparada!');
    } else {
      alert('A permissão de notificações não está ativa no seu navegador. Ative as notificações nas permissões do site.');
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

  const handleUpdateCoupon = async (id: string, updatedData: any) => {
    if (!updatedData.code || !updatedData.discountValue) return alert('Preencha os campos obrigatórios do cupão.');
    try {
      await updateDoc(doc(db, 'coupons', id), {
        code: updatedData.code.trim().toUpperCase(),
        discountType: updatedData.discountType,
        discountValue: Number(updatedData.discountValue),
        targetPlan: updatedData.targetPlan,
        partnerRef: updatedData.partnerRef
      });
      setEditingCoupon(null);
      alert('Cupão atualizado com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Erro ao atualizar cupão.');
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

  const totalUsersCount = users.length;
  const activeUsersCount = users.filter((u: any) => {
    if (!u.expiry_date) return false;
    const expiry = u.expiry_date.toDate ? u.expiry_date.toDate() : new Date(u.expiry_date);
    return expiry > new Date();
  }).length;
  const inactiveUsersCount = totalUsersCount - activeUsersCount;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-3xl font-black text-on-surface font-headline italic uppercase tracking-tighter">
          Gestão <span className="text-primary italic">Business</span>
        </h2>
        
        <div className="flex p-1 bg-surface-container rounded-xl flex-wrap gap-1">
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
            onClick={() => setActiveTab('alerts')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'alerts' ? 'bg-[#00f5a0] text-black shadow-lg shadow-[#00f5a0]/20 font-black' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            <Megaphone size={18} /> Alertas e Comunicação
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
        <div className="space-y-6">
          {/* Dashboard Geral de Usuários */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-200">
            <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#00f5a0]/5 rounded-bl-full pointer-events-none transition-all duration-300 group-hover:scale-110"></div>
              <p className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest flex items-center gap-1.5 font-mono">
                <Users size={14} className="text-[#00f5a0]" />
                TOTAL REGISTADOS
              </p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-on-surface">{totalUsersCount}</span>
                <span className="text-xs text-[#00f5a0] font-bold uppercase font-mono tracking-wider">Traders</span>
              </div>
              <p className="text-[11px] text-on-surface-variant mt-2 font-medium">Contagem total de contas de trading criadas na plataforma.</p>
            </div>

            <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full pointer-events-none transition-all duration-300 group-hover:scale-110"></div>
              <p className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest flex items-center gap-1.5 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                PLANOS ATIVOS
              </p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-emerald-400">{activeUsersCount}</span>
                <span className="text-xs text-emerald-400 font-bold uppercase font-mono tracking-wider font-extrabold">Ativos</span>
              </div>
              <p className="text-[11px] text-on-surface-variant mt-2 font-medium">Contas com subscrição ativa ou período experimental (Trial) válido.</p>
            </div>

            <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-full pointer-events-none transition-all duration-300 group-hover:scale-110"></div>
              <p className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest flex items-center gap-1.5 font-mono">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                PLANOS INATIVOS / EXPIRADOS
              </p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-amber-500">{inactiveUsersCount}</span>
                <span className="text-xs text-amber-500 font-bold uppercase font-mono tracking-wider font-extrabold">Inativos</span>
              </div>
              <p className="text-[11px] text-on-surface-variant mt-2 font-medium">Traders sem acesso ativo no momento (Iniciantes, Trial Expirado ou Plano Vencido), descontando os que tiverem ativos na plataforma.</p>
            </div>
          </div>

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
                  <option value="trial_30">Plano Teste 30 Dias (500 Kz)</option>
                  <option value="mensal_6">Mensal (6 Contas)</option>
                  <option value="trimestral_6">Trimestral (6 Contas)</option>
                  <option value="semestral_8">Semestral (8 Contas)</option>
                  <option value="anual_16">Anual (16 Contas)</option>
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant/60">
                   <ChevronDown className="text-sm" />
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
                   <ChevronDown className="text-sm" />
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
                   <ChevronDown className="text-sm" />
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
                            (u.plan_type === 'trial_15' || u.plan_type === 'trial_30')
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
                   <ChevronDown className="text-sm" />
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
                  <option value="kwik">KWIK</option>
                  <option value="mcx">USDT 🪙</option>
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant/60">
                   <ChevronDown className="text-sm" />
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
                   <ChevronDown className="text-sm" />
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
                   <ChevronDown className="text-sm" />
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

          {filteredPayments.length > 0 ? filteredPayments.map(p => {
            const correspondingUser = users.find(u => u.id === p.userId);
            const customerPhone = p.userPhone || correspondingUser?.phoneNumber || correspondingUser?.phone || '';
            const customerName = p.userName || correspondingUser?.name || correspondingUser?.nome || 'Trader';

            return (
              <div key={p.id} className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-xl animate-in fade-in duration-200">
                {/* Left side details: 3 beautiful structured columns to distribute the info perfectly and avoid squeezing */}
                <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  
                  {/* Col 1: Status & General Identifier */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                        p.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 
                        p.status === 'rejected' ? 'bg-error/20 text-error' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {p.status || 'Pendente'}
                      </span>
                      <span className="text-xs text-on-surface-variant font-mono font-bold">#{getPaymentDisplayId(p.id)}</span>
                    </div>
                    <div>
                      <p className="text-lg font-black text-primary">{p.amount?.toLocaleString()} Kz</p>
                      <p className="text-[10px] text-on-surface-variant/70 font-mono mt-0.5">{new Date(p.createdAt).toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Col 2: User Detail */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block opacity-60">Solicitado Por</span>
                    <h4 className="text-sm font-black text-white hover:text-[#00f5a0] transition-colors leading-snug">
                      {customerName}
                    </h4>
                    <p className="text-[11px] text-[#00f5a0] font-mono break-all">{correspondingUser?.email || 'Sem e-mail'}</p>
                    <p className="text-[10px] text-on-surface-variant font-mono opacity-50">ID: {getUserDisplayId(p.userId)}</p>
                    {customerPhone && (
                      <p className="text-xs text-slate-400 font-mono flex items-center gap-1 mt-1 bg-surface-container-high px-2.5 py-1 rounded-lg w-fit border border-outline-variant/10">
                        <span className="text-emerald-400 font-bold">📲</span> {customerPhone}
                      </p>
                    )}
                  </div>

                  {/* Col 3: Plan & Payment Method Detail */}
                  <div className="space-y-1 border-t md:border-t-0 md:border-l border-outline-variant/10 md:pl-6 pt-3 md:pt-0">
                    <div className="flex flex-col gap-1">
                      <p className="text-xs text-on-surface-variant font-medium">
                        Plano: <span className="text-on-surface font-black uppercase tracking-widest text-[#00f5a0]">{p.planId?.replace('_', ' ')}</span>
                      </p>
                      <p className="text-xs text-on-surface-variant font-medium">
                        Método: <span className="text-on-surface font-extrabold">{
                          p.paymentMethod === 'express' ? 'Express 📱' : 
                          p.paymentMethod === 'iban' ? 'IBAN 🏛️' : 
                          p.paymentMethod === 'kwik' ? 'KWIK 💸' : 'USDT 🪙'
                        }</span>
                      </p>
                      {p.paymentMethod === 'express' && p.expressCode && (
                        <div className="mt-1 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-xl w-fit">
                          <span className="text-[9px] text-amber-500 font-black tracking-wider uppercase font-mono block">CÓD V-REDE</span>
                          <span className="text-xs text-on-surface font-mono font-bold">{p.expressCode}</span>
                        </div>
                      )}
                      {p.paymentMethod === 'iban' && p.expressCode && (
                        <div className="mt-1 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-xl w-fit">
                          <span className="text-[9px] text-blue-400 font-black tracking-wider uppercase font-mono block">CÓDIGO IBAN</span>
                          <span className="text-xs text-on-surface font-mono font-bold">{p.expressCode}</span>
                        </div>
                      )}
                      {p.paymentMethod === 'kwik' && p.expressCode && (
                        <div className="mt-1 bg-[#00f5a0]/10 border border-[#00f5a0]/20 px-2.5 py-1 rounded-xl w-fit">
                          <span className="text-[9px] text-[#00f5a0] font-black tracking-wider uppercase font-mono block">CÓDIGO KWIK</span>
                          <span className="text-xs text-on-surface font-mono font-bold">{p.expressCode}</span>
                        </div>
                      )}
                      {p.paymentMethod === 'multicaixa' && p.usdtAmount && (
                        <div className="mt-1 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-xl w-fit">
                          <span className="text-[9px] text-emerald-400 font-black tracking-wider uppercase font-mono block">QUANTIA USDT</span>
                          <span className="text-xs text-on-surface font-mono font-bold">{p.usdtAmount} USDT</span>
                          {p.usdtRate && (
                            <span className="text-[9px] text-on-surface-variant block font-mono mt-0.5">Câmbio: 1$ = {p.usdtRate} Kz</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* Actions Column (Right Side - clean spacing) */}
                <div className="flex flex-wrap items-center gap-3 shrink-0 border-t lg:border-t-0 pt-4 lg:pt-0 border-outline-variant/10 justify-end w-full lg:w-auto">
                  {/* Highly Custom WhatsApp/Call shortcut with preformatted beautiful risko text */}
                  {customerPhone && (
                    <button
                      onClick={() => {
                        const formattedPhone = getFormattedPhone(customerPhone);
                        const message = `Olá Trader ${customerName}! 🚀 \n\nAqui é o suporte do C-Profit. Passando para avisar que a sua assinatura já está activa! Por favor, aceda à plataforma para verificar o seu acesso. \n\nDesejamos-lhe excelentes trades e um ótimo controlo financeiro! Lembre-se sempre deste conselho de gestão: \n\n"O bom trader não é aquele que foca apenas nos ganhos, mas sim aquele que controla rigorosamente os seus riscos." 📊🧠\n\n💻 Para ter a melhor experiência possível de análise e trading no C-Profit, recomendamos que utilize a plataforma através do Computador / Desktop.\n\n🔗 Aceda diretamente aqui: https://cprofit.app/\n\nBons trades e faça uma excelente gestão de risco! Se precisar de qualquer suporte, estamos por aqui. 📈✨`;
                        window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank');
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20 hover:scale-[1.03] active:scale-[0.97] transition-all text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-emerald-500/5 duration-150"
                      title="Enviar Mensagem de Ativação via WhatsApp"
                    >
                      <Phone size={13} className="text-[#25D366]" /> Contatar WhatsApp
                    </button>
                  )}

                  {p.status === 'pending' && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleRejectPayment(p.id)}
                        className="p-2.5 rounded-xl bg-error/10 text-error hover:bg-error/20 hover:scale-105 transition-all text-sm"
                        title="Negar"
                      >
                        <X size={18} />
                      </button>
                      <button 
                        onClick={() => handleApprovePayment(p)}
                        className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:scale-105 transition-all text-sm"
                        title="Aprovar"
                      >
                        <Check size={18} />
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
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          }) : (
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
              {/* WhatsApp de Suporte - Sempre Visível */}
              <div className="space-y-2 bg-surface-container-low/30 p-4 rounded-2xl border border-outline-variant/10">
                <label className="text-[10px] font-black text-[#00f5a0] uppercase tracking-widest pl-1 font-mono flex items-center gap-2">
                  <span>💬</span> WhatsApp de Suporte Geral
                </label>
                <input 
                  type="text" 
                  value={settings.whatsappNumber || ''}
                  onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-5 py-3 text-on-surface focus:outline-none focus:border-[#00f5a0] transition-all font-medium text-sm text-white"
                  placeholder="Ex: 244921319200"
                />
              </div>

              {/* Navegação por Abas (Métodos de Pagamento) */}
              <div className="flex border-b border-outline-variant/10 mb-4 gap-1 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setActivePaymentTab('iban')}
                  className={`pb-3 px-4 text-xs font-black uppercase tracking-widest transition-all relative flex items-center gap-1.5 whitespace-nowrap ${
                    activePaymentTab === 'iban'
                      ? 'text-[#00f5a0]'
                      : 'text-on-surface-variant hover:text-white'
                  }`}
                >
                  <span>🏛️</span>
                  <span>IBAN</span>
                  {activePaymentTab === 'iban' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00f5a0] rounded-full" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActivePaymentTab('usdt')}
                  className={`pb-3 px-4 text-xs font-black uppercase tracking-widest transition-all relative flex items-center gap-1.5 whitespace-nowrap ${
                    activePaymentTab === 'usdt'
                      ? 'text-[#00f5a0]'
                      : 'text-on-surface-variant hover:text-white'
                  }`}
                >
                  <span>🪙</span>
                  <span>USDT</span>
                  {activePaymentTab === 'usdt' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00f5a0] rounded-full" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActivePaymentTab('express')}
                  className={`pb-3 px-4 text-xs font-black uppercase tracking-widest transition-all relative flex items-center gap-1.5 whitespace-nowrap ${
                    activePaymentTab === 'express'
                      ? 'text-[#00f5a0]'
                      : 'text-on-surface-variant hover:text-white'
                  }`}
                >
                  <span>📱</span>
                  <span>Express</span>
                  {activePaymentTab === 'express' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00f5a0] rounded-full" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActivePaymentTab('kwik')}
                  className={`pb-3 px-4 text-xs font-black uppercase tracking-widest transition-all relative flex items-center gap-1.5 whitespace-nowrap ${
                    activePaymentTab === 'kwik'
                      ? 'text-[#00f5a0]'
                      : 'text-on-surface-variant hover:text-white'
                  }`}
                >
                  <span>💸</span>
                  <span>KWIK</span>
                  {activePaymentTab === 'kwik' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00f5a0] rounded-full" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActivePaymentTab('ads')}
                  className={`pb-3 px-4 text-xs font-black uppercase tracking-widest transition-all relative flex items-center gap-1.5 whitespace-nowrap ${
                    activePaymentTab === 'ads'
                      ? 'text-[#00f5a0]'
                      : 'text-on-surface-variant hover:text-white'
                  }`}
                >
                  <span>📢</span>
                  <span>Anúncios (Adsterra)</span>
                  {activePaymentTab === 'ads' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00f5a0] rounded-full" />
                  )}
                </button>
              </div>

              {/* Painéis das Abas */}
              <div className="min-h-[220px]">
                {activePaymentTab === 'iban' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl border border-outline-variant/15">
                      <div>
                        <p className="font-bold text-on-surface text-xs">Ativar IBAN Bancário</p>
                        <p className="text-[10px] text-on-surface-variant">Habilitar transferências por IBAN como opção de upgrade</p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setSettings({ ...settings, showIban: !settings.showIban })}
                        className={`w-10 h-5 rounded-full transition-all relative shrink-0 ${settings.showIban ? 'bg-[#00f5a0]' : 'bg-surface-container-high border border-outline-variant/30'}`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${settings.showIban ? 'right-0.5 bg-background' : 'left-0.5 bg-on-surface-variant'}`}></div>
                      </button>
                    </div>

                    {settings.showIban && (
                      <div className="space-y-4 bg-surface-container-low/40 p-4 rounded-2xl border border-outline-variant/10">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-[#00f5a0] uppercase tracking-widest pl-1 font-mono">IBAN de Depósito</label>
                          <input 
                            type="text" 
                            value={settings.iban || ''}
                            onChange={(e) => setSettings({ ...settings, iban: e.target.value })}
                            className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-5 py-3 text-on-surface focus:outline-none focus:border-[#00f5a0] transition-all font-medium text-sm text-white font-mono"
                            placeholder="AO06.0000.0000..."
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-[#00f5a0] uppercase tracking-widest pl-1 font-mono">Titular da Conta (IBAN)</label>
                            <input 
                              type="text" 
                              value={settings.ibanName || ''}
                              onChange={(e) => setSettings({ ...settings, ibanName: e.target.value })}
                              className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-5 py-3 text-on-surface focus:outline-none focus:border-[#00f5a0] transition-all font-medium text-sm text-white"
                              placeholder="Nome do Titular"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-[#00f5a0] uppercase tracking-widest pl-1 font-mono">Nome do Banco (IBAN)</label>
                            <input 
                              type="text" 
                              value={settings.ibanBank || ''}
                              onChange={(e) => setSettings({ ...settings, ibanBank: e.target.value })}
                              className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-5 py-3 text-on-surface focus:outline-none focus:border-[#00f5a0] transition-all font-medium text-sm text-white font-mono"
                              placeholder="Ex: BFA - Banco Fomento Angola"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activePaymentTab === 'usdt' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl border border-outline-variant/15">
                      <div>
                        <p className="font-bold text-on-surface text-xs">Ativar USDT</p>
                        <p className="text-[10px] text-on-surface-variant">Habilitar pagamentos em USDT como opção de upgrade</p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setSettings({ ...settings, showMulticaixa: !settings.showMulticaixa })}
                        className={`w-10 h-5 rounded-full transition-all relative shrink-0 ${settings.showMulticaixa ? 'bg-[#00f5a0]' : 'bg-surface-container-high border border-outline-variant/30'}`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${settings.showMulticaixa ? 'right-0.5 bg-background' : 'left-0.5 bg-on-surface-variant'}`}></div>
                      </button>
                    </div>

                    {settings.showMulticaixa && (
                      <div className="space-y-4 bg-surface-container-low/40 p-4 rounded-2xl border border-outline-variant/10">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-[#00f5a0] uppercase tracking-widest pl-1 font-mono">Link do QR Code da Carteira USDT (Imagem)</label>
                          <div className="flex gap-4 items-center">
                            <input 
                              type="text" 
                              value={settings.usdtQrCodeUrl || ''}
                              onChange={(e) => setSettings({ ...settings, usdtQrCodeUrl: e.target.value })}
                              className="flex-1 bg-surface-container-low border border-outline-variant/20 rounded-2xl px-5 py-3 text-on-surface focus:outline-none focus:border-[#00f5a0] transition-all font-medium text-sm text-white"
                              placeholder="Cole o link da imagem do QR Code aqui (ex: https://...)"
                            />
                            {settings.usdtQrCodeUrl && (
                              <img src={settings.usdtQrCodeUrl} alt="QR Preview" className="h-12 w-12 object-contain bg-white rounded-xl p-1 shrink-0 animate-in fade-in" referrerPolicy="no-referrer" />
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-[#00f5a0] uppercase tracking-widest pl-1 font-mono">Endereço USDT</label>
                            <input 
                              type="text" 
                              value={settings.usdtAddress || ''}
                              onChange={(e) => setSettings({ ...settings, usdtAddress: e.target.value })}
                              className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-5 py-3 text-on-surface focus:outline-none focus:border-[#00f5a0] transition-all font-medium text-sm text-white font-mono"
                              placeholder="Ex: T9yD14Nj9y7xXvGy..."
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-[#00f5a0] uppercase tracking-widest pl-1 font-mono">Legenda / Rede (Ex: Rede TRC20)</label>
                            <input 
                              type="text" 
                              value={settings.usdtLegend || ''}
                              onChange={(e) => setSettings({ ...settings, usdtLegend: e.target.value })}
                              className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-5 py-3 text-on-surface focus:outline-none focus:border-[#00f5a0] transition-all font-medium text-sm text-white"
                              placeholder="Ex: Utilizar apenas a rede TRC20 para não haver engano"
                            />
                          </div>
                        </div>

                        {/* Definições de Câmbio USDT */}
                        <div className="border-t border-outline-variant/10 pt-4 mt-2 space-y-4">
                          <p className="text-xs font-black uppercase text-[#00f5a0] tracking-wider pl-1 font-mono flex items-center gap-1.5">
                            <span>📊</span> Definições de Câmbio USDT (Kwanza ⇆ USDT)
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1 h-5 flex items-center">Modo de Câmbio</label>
                              <select
                                value={settings.usdtExchangeRateMode || 'manual'}
                                onChange={(e) => setSettings({ ...settings, usdtExchangeRateMode: e.target.value })}
                                className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-4 py-3 text-on-surface outline-none focus:border-[#00f5a0] text-sm font-bold text-white cursor-pointer"
                              >
                                <option value="manual">Taxa Fixa (Manual)</option>
                                <option value="auto">Taxa Dinâmica (API em tempo real)</option>
                              </select>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1 h-5 flex items-center truncate">
                                {settings.usdtExchangeRateMode === 'auto' ? 'Taxa Base (API USD/AOA)' : 'Taxa de Câmbio Fixa (USD/Kz)'}
                              </label>
                              <input
                                type="number"
                                disabled={settings.usdtExchangeRateMode === 'auto'}
                                value={settings.usdtManualRate !== undefined ? settings.usdtManualRate : 1000}
                                onChange={(e) => setSettings({ ...settings, usdtManualRate: Number(e.target.value) })}
                                className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-5 py-3 text-on-surface focus:outline-none focus:border-[#00f5a0] transition-all font-medium text-sm text-white disabled:opacity-50"
                                placeholder="Ex: 1000"
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1 h-5 flex items-center">Taxa de Rede / Gás (USDT)</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={settings.usdtNetworkFee !== undefined ? settings.usdtNetworkFee : 1}
                                onChange={(e) => setSettings({ ...settings, usdtNetworkFee: Number(e.target.value) })}
                                className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-5 py-3 text-on-surface focus:outline-none focus:border-[#00f5a0] transition-all font-medium text-sm text-white"
                                placeholder="Ex: 1.00"
                              />
                            </div>
                          </div>
                          {settings.usdtExchangeRateMode === 'auto' && (
                            <p className="text-[10px] text-amber-400 font-medium pl-1 leading-relaxed">
                              💡 A taxa de câmbio em tempo real será obtida automaticamente via API. A taxa de rede configurada (ex: 1 USDT) será adicionada ao valor total convertido para cobrir os custos de gás blockchain (ex: TRC20).
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activePaymentTab === 'express' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl border border-outline-variant/15">
                      <div>
                        <p className="font-bold text-on-surface text-xs">Ativar Express</p>
                        <p className="text-[10px] text-on-surface-variant">Habilitar recebimentos por Multicaixa Express</p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setSettings({ ...settings, showExpress: settings.showExpress !== false ? false : true })}
                        className={`w-10 h-5 rounded-full transition-all relative shrink-0 ${settings.showExpress !== false ? 'bg-[#00f5a0]' : 'bg-surface-container-high border border-outline-variant/30'}`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${settings.showExpress !== false ? 'right-0.5 bg-background' : 'left-0.5 bg-on-surface-variant'}`}></div>
                      </button>
                    </div>

                    {settings.showExpress !== false && (
                      <div className="space-y-4 bg-surface-container-low/40 p-4 rounded-2xl border border-outline-variant/10">
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

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-[#00f5a0] uppercase tracking-widest pl-1 font-mono">Logo Multicaixa Express (URL)</label>
                          <div className="flex gap-4 items-center">
                            <input 
                              type="text" 
                              value={settings.multicaixaLogoUrl || ''}
                              onChange={(e) => setSettings({ ...settings, multicaixaLogoUrl: e.target.value })}
                              className="flex-1 bg-surface-container-low border border-outline-variant/20 rounded-2xl px-5 py-3 text-on-surface focus:outline-none focus:border-[#00f5a0] transition-all font-medium text-sm text-white"
                              placeholder="https://..."
                            />
                            {settings.multicaixaLogoUrl && (
                              <img src={settings.multicaixaLogoUrl} alt="Logo Preview" className="h-10 w-10 object-contain bg-white rounded-xl p-1 shrink-0 animate-in fade-in" />
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activePaymentTab === 'kwik' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl border border-outline-variant/15">
                      <div>
                        <p className="font-bold text-on-surface text-xs">Ativar KWIK</p>
                        <p className="text-[10px] text-on-surface-variant">Habilitar recebimentos por KWIK instantâneo</p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setSettings({ ...settings, showKwik: settings.showKwik !== false ? false : true })}
                        className={`w-10 h-5 rounded-full transition-all relative shrink-0 ${settings.showKwik !== false ? 'bg-[#00f5a0]' : 'bg-surface-container-high border border-outline-variant/30'}`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${settings.showKwik !== false ? 'right-0.5 bg-background' : 'left-0.5 bg-on-surface-variant'}`}></div>
                      </button>
                    </div>

                    {settings.showKwik !== false && (
                      <div className="space-y-4 bg-surface-container-low/40 p-4 rounded-2xl border border-outline-variant/10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-[#00f5a0] uppercase tracking-widest pl-1 font-mono">Chave KWIK</label>
                            <input 
                              type="text" 
                              value={settings.kwikName || ''}
                              onChange={(e) => setSettings({ ...settings, kwikName: e.target.value })}
                              className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-5 py-3 text-on-surface focus:outline-none focus:border-[#00f5a0] transition-all font-medium text-sm text-white font-mono"
                              placeholder="Ex: Nº de Telemóvel ou Chave KWIK"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-[#00f5a0] uppercase tracking-widest pl-1 font-mono">Titular da Conta (KWIK)</label>
                            <input 
                              type="text" 
                              value={settings.kwikKey || ''}
                              onChange={(e) => setSettings({ ...settings, kwikKey: e.target.value })}
                              className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-5 py-3 text-on-surface focus:outline-none focus:border-[#00f5a0] transition-all font-medium text-sm text-white"
                              placeholder="Ex: Nome Completo do Titular"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activePaymentTab === 'ads' && (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl border border-outline-variant/15">
                      <div>
                        <p className="font-bold text-on-surface text-xs">Exibir Anúncios no Plano Gratuito</p>
                        <p className="text-[10px] text-on-surface-variant">Monetize utilizadores no plano Iniciante (Free) com Adsterra ou AdSense</p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setSettings({ ...settings, enableAdsForFree: settings.enableAdsForFree !== false ? false : true })}
                        className={`w-10 h-5 rounded-full transition-all relative shrink-0 ${settings.enableAdsForFree !== false ? 'bg-[#00f5a0]' : 'bg-surface-container-high border border-outline-variant/30'}`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${settings.enableAdsForFree !== false ? 'right-0.5 bg-background' : 'left-0.5 bg-on-surface-variant'}`}></div>
                      </button>
                    </div>

                    <div className="space-y-4 bg-surface-container-low/40 p-4 rounded-2xl border border-outline-variant/10">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-[#00f5a0] uppercase tracking-widest pl-1 font-mono">Provedor de Anúncios Ativo</label>
                        <select
                          value={settings.adProvider || 'adsterra'}
                          onChange={(e) => setSettings({ ...settings, adProvider: e.target.value })}
                          className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-5 py-3 text-on-surface focus:outline-none focus:border-[#00f5a0] transition-all font-medium text-sm text-white"
                        >
                          <option value="adsterra">⚡ Adsterra Network (Recomendado)</option>
                          <option value="adsense">Google AdSense</option>
                        </select>
                      </div>

                      {/* Configuração Adsterra */}
                      {(settings.adProvider || 'adsterra') === 'adsterra' && (
                        <div className="space-y-4 pt-2 border-t border-outline-variant/10">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest pl-1 font-mono flex items-center gap-1.5">
                              <span>🔑</span> Chave do Anúncio Adsterra (Ad Key)
                            </label>
                            <input 
                              type="text" 
                              value={settings.adsterraKey || ''}
                              onChange={(e) => setSettings({ ...settings, adsterraKey: e.target.value, adsterraScriptCode: e.target.value ? '' : settings.adsterraScriptCode })}
                              className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-5 py-3 text-on-surface focus:outline-none focus:border-[#00f5a0] transition-all font-mono text-sm text-white"
                              placeholder="Ex: a1b2c3d4e5f67890 (Chave do seu Banner no Adsterra)"
                            />
                            <p className="text-[10px] text-on-surface-variant pl-1">
                              Cole a <strong>Key</strong> do seu bloco de anúncio Adsterra (Banner 728x90, 468x60 ou Native Banner).
                            </p>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-[#00f5a0] uppercase tracking-widest pl-1 font-mono flex items-center gap-1.5">
                              <span>📜</span> Código do Script Completo Adsterra (Opção Alternativa)
                            </label>
                            <textarea 
                              rows={3}
                              value={settings.adsterraScriptCode || ''}
                              onChange={(e) => setSettings({ ...settings, adsterraScriptCode: e.target.value })}
                              className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-5 py-3 text-on-surface focus:outline-none focus:border-[#00f5a0] transition-all font-mono text-xs text-white"
                              placeholder='Ex: <script type="text/javascript">atOptions = {...};</script><script src="//www.highperformanceformat.com/..."></script>'
                            />
                            <p className="text-[10px] text-on-surface-variant pl-1">
                              Se preferir, cole o código HTML/JS completo copiado do painel do Adsterra.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-cyan-400 uppercase tracking-widest pl-1 font-mono flex items-center gap-1.5">
                              <span>🔗</span> URL do Iframe Direto (Opcional)
                            </label>
                            <input 
                              type="text" 
                              value={settings.adsterraIframeUrl || ''}
                              onChange={(e) => setSettings({ ...settings, adsterraIframeUrl: e.target.value })}
                              className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-5 py-3 text-on-surface focus:outline-none focus:border-[#00f5a0] transition-all font-mono text-sm text-white"
                              placeholder="Ex: https://www.topcreativeformat.com/..."
                            />
                          </div>

                          {/* Instructions tutorial card */}
                          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-xs space-y-2">
                            <p className="font-bold text-amber-300 flex items-center gap-2">
                              <span>🚀</span> Como configurar o Adsterra em 3 passos simples:
                            </p>
                            <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-on-surface-variant leading-relaxed">
                              <li>Aceda ao site <strong className="text-white">adsterra.com</strong> e crie uma conta gratuita de Publisher.</li>
                              <li>Adicione o seu site ou app e crie um bloco de anúncio (recomendado: <strong className="text-white">Banner 728x90</strong> ou <strong className="text-white">Native Banner</strong>).</li>
                              <li>Copie a <strong className="text-white">Key</strong> ou o <strong className="text-white">Script Code</strong> gerado, cole num dos campos acima e clique em <strong className="text-[#00f5a0]">Salvar Alterações</strong>!</li>
                            </ol>
                          </div>
                        </div>
                      )}

                      {/* Configuração Google AdSense */}
                      {settings.adProvider === 'adsense' && (
                        <div className="space-y-4 pt-2 border-t border-outline-variant/10">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-[#00f5a0] uppercase tracking-widest pl-1 font-mono">AdSense Client ID</label>
                              <input 
                                type="text" 
                                value={settings.adsenseClientId || ''}
                                onChange={(e) => setSettings({ ...settings, adsenseClientId: e.target.value })}
                                className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-5 py-3 text-on-surface focus:outline-none focus:border-[#00f5a0] transition-all font-mono text-sm text-white"
                                placeholder="ca-pub-XXXXXXXXXXXXXXXX"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-[#00f5a0] uppercase tracking-widest pl-1 font-mono">AdSense Slot ID</label>
                              <input 
                                type="text" 
                                value={settings.adsenseSlotId || ''}
                                onChange={(e) => setSettings({ ...settings, adsenseSlotId: e.target.value })}
                                className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-5 py-3 text-on-surface focus:outline-none focus:border-[#00f5a0] transition-all font-mono text-sm text-white"
                                placeholder="1234567890"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
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

      {showCommunityModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/85 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-surface-container border border-outline-variant/30 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative my-8 animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowCommunityModal(false)}
              className="absolute top-6 right-6 p-2 text-on-surface-variant hover:text-white hover:bg-surface-container-high rounded-full transition-all"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-bold text-[#00f5a0] mb-2 font-headline flex items-center gap-3">
              <Users className="text-[24px]" />
              Configurar Comunidade Oficial
            </h3>
            <p className="text-xs text-on-surface-variant mb-6">Insira os detalhes do grupo ou canal oficial da sua plataforma para os utilizadores se juntarem.</p>

            <div className="space-y-5">
              {/* Escolha rápida de Plataforma */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1">
                  Plataformas Frequentes
                </label>
                <div className="flex gap-2">
                  {['Telegram', 'WhatsApp', 'Discord'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setLocalPlatform(p)}
                      className={`flex-1 py-2.5 rounded-xl font-bold text-xs uppercase border transition-all duration-300 ${
                        localPlatform.toLowerCase() === p.toLowerCase()
                          ? 'bg-[#00f5a0] text-background border-[#00f5a0] shadow-md shadow-[#00f5a0]/15 font-black'
                          : 'bg-surface-container border-outline-variant/20 text-on-surface-variant hover:text-white hover:border-outline-variant/50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nome Customizado */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1">
                  Nome da Plataforma
                </label>
                <input
                  type="text"
                  value={localPlatform}
                  onChange={(e) => setLocalPlatform(e.target.value)}
                  placeholder="Ex: Telegram, Canal VIP, Grupo Privado"
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-[#00f5a0] transition-colors font-medium text-sm text-white"
                />
              </div>

              {/* Link da Comunidade */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1">
                  Link da Comunidade
                </label>
                <input
                  type="text"
                  value={localLink}
                  onChange={(e) => setLocalLink(e.target.value)}
                  placeholder="Ex: https://t.me/seu_canal ou link de convite"
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-[#00f5a0] transition-colors font-medium text-sm text-white"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCommunityModal(false)}
                  className="flex-1 py-3 px-6 bg-surface-container border border-outline-variant/20 text-on-surface hover:text-white transition-all rounded-xl font-bold uppercase tracking-widest text-xs"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveCommunityConfig}
                  disabled={isSavingCommunity}
                  className="flex-1 py-3 px-6 bg-[#00f5a0] text-background hover:bg-[#00f5a0]/90 font-black uppercase tracking-wider transition-all rounded-xl text-xs shadow-lg shadow-[#00f5a0]/15 disabled:opacity-50"
                >
                  {isSavingCommunity ? 'Guardando...' : 'Guardar Link'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'coupons' && (
        <div className="space-y-8 animate-in fade-in duration-200">

            {/* Menu de Sub-secção */}
            <div className="flex border-b border-outline-variant/10 pb-4 justify-between items-center">
              <div className="flex gap-4">
                <button
                  onClick={() => setShowReferralsReport(false)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border ${
                    !showReferralsReport 
                      ? 'bg-primary text-background border-primary shadow-lg shadow-primary/20' 
                      : 'bg-surface-container-low text-on-surface-variant hover:text-white border-outline-variant/20'
                  }`}
                >
                  <Ticket size={16} />
                  Gestão de Cupões
                </button>
                
                <button
                  onClick={() => setShowReferralsReport(true)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border ${
                    showReferralsReport 
                      ? 'bg-primary text-background border-primary shadow-lg shadow-primary/20' 
                      : 'bg-surface-container-low text-on-surface-variant hover:text-white border-outline-variant/20'
                  }`}
                >
                  <History size={16} />
                  Histórico de Cadastros ({users.filter(u => u.usedCoupon).length})
                </button>
              </div>
            </div>

            {!showReferralsReport ? (
              <>
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
                                  setShowReferralsReport(true);
                                }}
                                className="bg-primary/10 hover:bg-[#00f5a0]/15 hover:text-[#00f5a0] text-[#00f5a0] px-3.5 py-1.5 rounded-xl text-sm font-black tracking-widest uppercase border border-[#00f5a0]/20 hover:border-[#00f5a0]/40 transition-all cursor-pointer"
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
                                  setShowReferralsReport(true);
                                }}
                                className="bg-surface-container text-white text-xs px-3 py-1.5 rounded-lg border border-outline-variant/20 font-black hover:bg-surface-container-high transition-colors cursor-pointer"
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
                              <button 
                                onClick={() => setEditingCoupon({ ...c })}
                                className="p-2 bg-surface-container hover:bg-[#00f5a0]/10 text-[#00f5a0] rounded-lg border border-[#00f5a0]/20 hover:border-[#00f5a0]/30 transition-all cursor-pointer flex items-center justify-center shrink-0"
                                title="Editar Cupão"
                              >
                                <Pencil size={14} />
                              </button>
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
              </>
            ) : (
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

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowReferralsReport(false)}
                      className="bg-surface-container hover:bg-surface-container-high text-white transition-all px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 border border-outline-variant/20"
                    >
                      Voltar Gestão
                    </button>
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
                      {coupons.map((cp: any) => (
                        <option key={cp.id} value={cp.code}>{cp.code} ({cp.active ? 'Ativo' : 'Inativo'})</option>
                      ))}
                    </select>
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant/60">
                       <ChevronDown className="text-sm" />
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
                                className="text-xs font-mono text-primary font-black bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-lg border border-primary/20 transition-all uppercase cursor-pointer"
                              >
                                {u.usedCoupon}
                              </button>
                            </td>
                            <td className="p-4 text-xs text-on-surface-variant font-medium">{u.partnerRef || '-'}</td>
                            <td className="p-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                (u.plan_type === 'trial_15' || u.plan_type === 'trial_30')
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
            )}
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
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                   <button
                      onClick={() => {
                        setActiveTab('alerts');
                      }}
                      className="w-full sm:w-auto bg-[#00f5a0] hover:bg-[#00f5a0]/90 text-background px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#00f5a0]/15 hover:scale-[1.02] active:scale-[0.98] transition-all"
                   >
                      <Megaphone size={14} /> Alertas e Comunicações
                   </button>
                   <button
                      onClick={() => {
                        setLocalPlatform(settings.communityPlatform || 'Telegram');
                        setLocalLink(settings.communityLink || '');
                        setShowCommunityModal(true);
                      }}
                      className="w-full sm:w-auto bg-surface-container hover:bg-surface-container-high text-white px-4 py-3 sm:py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 border border-outline-variant/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                   >
                      <Users className="text-[14px]" /> Configurar Comunidade
                   </button>
                </div>
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
              <h4 className="font-bold text-sm mb-2 text-[#00f5a0] uppercase tracking-wide">Cadastrar Novo Maestro</h4>
              <p className="text-xs text-on-surface-variant mb-4">Insira os dados de login para criar uma nova conta de Maestro com acesso total e irrestrito ao painel administrativo.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5">Nome Completo</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Carlos Silva"
                    value={newMaestroName}
                    onChange={(e) => setNewMaestroName(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-2.5 focus:outline-none focus:border-primary text-sm font-semibold text-on-surface"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5">E-mail de Acesso</label>
                  <input 
                    type="email" 
                    placeholder="maestro@cprofit.com"
                    value={newMaestroEmail}
                    onChange={(e) => setNewMaestroEmail(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-2.5 focus:outline-none focus:border-primary text-sm font-semibold text-on-surface"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5">Senha de Acesso</label>
                  <input 
                    type="password" 
                    placeholder="Mínimo 6 caracteres"
                    value={newMaestroPassword}
                    onChange={(e) => setNewMaestroPassword(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-2.5 focus:outline-none focus:border-primary text-sm font-semibold text-on-surface"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button 
                  onClick={async () => {
                    if (!newMaestroEmail || !newMaestroPassword) {
                      alert('Por favor, insira o email e a senha do novo Maestro.');
                      return;
                    }
                    if (newMaestroPassword.length < 6) {
                      alert('A senha necessita de ter pelo menos 6 caracteres.');
                      return;
                    }
                    setNewMaestroSubmitting(true);
                    try {
                      // Call safe creation helper
                      const uid = await registerNewMaestroAuth(newMaestroEmail, newMaestroPassword);
                      if (uid) {
                        // Document user profile fields
                        await setDoc(doc(db, 'usuarios', uid), {
                          nome: newMaestroName || newMaestroEmail.split('@')[0],
                          email: newMaestroEmail,
                          role: 'admin',
                          plan_type: 'ilimitado',
                          account_limit: 999,
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString()
                        });
                        alert(`Sucesso! Maestro '${newMaestroEmail}' criado com privilégios de Super Admin.`);
                        setNewMaestroName('');
                        setNewMaestroEmail('');
                        setNewMaestroPassword('');
                      } else {
                        alert('Problema ao registrar as credenciais.');
                      }
                    } catch (err: any) {
                      console.error(err);
                      if (err.code === 'auth/email-already-in-use') {
                        alert('Este e-mail já está sendo utilizado por outro usuário no sistema.');
                      } else {
                        alert(`Erro: ${err.message}`);
                      }
                    } finally {
                      setNewMaestroSubmitting(false);
                    }
                  }}
                  disabled={newMaestroSubmitting}
                  className="px-6 py-3 bg-primary text-on-primary font-black text-xs uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {newMaestroSubmitting ? 'A Cadastrar...' : 'Cadastrar Novo Maestro'}
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
          {/* Affiliate Sub-Tabs */}
          <div className="flex flex-wrap gap-2 p-2 bg-surface-container rounded-2xl border border-outline-variant/20 sticky top-[72px] z-20 backdrop-blur-md">
            <button onClick={() => setAffiliateTab('overview')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${affiliateTab === 'overview' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-white hover:bg-surface-container-high'}`}>Visão Geral & Caixa</button>
            <button onClick={() => setAffiliateTab('config')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${affiliateTab === 'config' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-white hover:bg-surface-container-high'}`}>Configurações de Parceiros</button>
            <button onClick={() => { setAffiliateTab('commissions'); setAffilSearch(''); }} className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${affiliateTab === 'commissions' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-on-surface-variant hover:text-white hover:bg-surface-container-high'}`}>Comissões Pendentes <span className="bg-white/20 px-1.5 rounded-sm">{adminReferrals.filter(r => r.status === 'pending_approval').length}</span></button>
            <button onClick={() => { setAffiliateTab('payouts'); setAffilSearch(''); }} className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${affiliateTab === 'payouts' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-on-surface-variant hover:text-white hover:bg-surface-container-high'}`}>Pedidos de Saque <span className="bg-white/20 px-1.5 rounded-sm">{adminPayouts.filter(p => p.status === 'pending').length}</span></button>
            <button onClick={() => { setAffiliateTab('trials'); setAffilSearch(''); }} className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${affiliateTab === 'trials' ? 'bg-cyan-500 text-white' : 'text-on-surface-variant hover:text-white hover:bg-surface-container-high'}`}>Geração de Leads Trial <span className="bg-white/20 px-1.5 rounded-sm">{adminReferrals.filter(r => r.status === 'approved' && r.rewardType === 'free_month' && r.paymentAmount === 0).length}</span></button>
          </div>
          
          {affiliateTab === 'overview' && (
            <>
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
                  {payments.filter(p => p.status === 'approved' && !isFictitiousPayment(p)).reduce((acc, p) => acc + (p.amount || 0), 0).toLocaleString()} Kz
                </p>
                <p className="text-[11px] text-on-surface-variant/70 mt-1">Soma de todos os planos aprovados (Clique para ver)</p>
              </div>
              <Banknote className="text-4xl text-emerald-500/30" />
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
                  {payments.filter(p => p.status === 'approved' && p.usedCoupon && !isFictitiousPayment(p)).reduce((acc, p) => {
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
              <BadgeDollarSign className="text-4xl text-amber-500/30" />
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
              <Handshake className="text-4xl text-primary/30" />
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
                      {payments.filter(p => p.status === 'approved' && !isFictitiousPayment(p)).map(p => {
                        const paidUser = users.find(u => u.id === p.userId);
                        return (
                          <tr key={p.id} className="hover:bg-surface-container/20 transition-colors">
                            <td className="p-4 font-mono font-bold text-on-surface-variant">#{getPaymentDisplayId(p.id)}</td>
                            <td className="p-4">
                              <p className="font-bold text-on-surface">{p.userName || paidUser?.name || paidUser?.nome || 'Inscrito'}</p>
                              <p className="text-[10px] text-on-surface-variant/60 font-mono italic">{paidUser?.email || p.userEmail || `User ID: ${getUserDisplayId(p.userId)}`}</p>
                            </td>
                            <td className="p-4 font-bold uppercase font-mono">{p.planId?.replace('_', ' ')}</td>
                            <td className="p-4 font-bold uppercase tracking-wider text-[10px]">
                              {p.paymentMethod === 'express' ? 'Express 📱' : p.paymentMethod === 'iban' ? 'IBAN 🏛️' : p.paymentMethod === 'kwik' ? 'KWIK 💸' : 'USDT 🪙'}
                            </td>
                            <td className="p-4 text-[10px] text-on-surface-variant">{new Date(p.createdAt || Date.now()).toLocaleDateString()}</td>
                            <td className="p-4 text-right font-black text-emerald-400 font-mono">{p.amount?.toLocaleString()} Kz</td>
                          </tr>
                        );
                      })}
                      {payments.filter(p => p.status === 'approved' && !isFictitiousPayment(p)).length === 0 && (
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
                      {payments.filter(p => p.status === 'approved' && p.usedCoupon && !isFictitiousPayment(p)).map(p => {
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
                              <p className="font-bold text-on-surface">{p.userName || paidUser?.name || paidUser?.nome || 'Trader'}</p>
                              <p className="text-[10px] text-on-surface-variant/60 font-mono italic">{paidUser?.email || p.userEmail || `User ID: ${getUserDisplayId(p.userId)}`}</p>
                            </td>
                            <td className="p-4 font-mono font-black text-primary">{p.usedCoupon}</td>
                            <td className="p-4 font-bold text-on-surface font-mono">{p.amount?.toLocaleString()} Kz</td>
                            <td className="p-4 font-black text-amber-400 font-mono">-{estimatedSavings.toLocaleString()} Kz</td>
                            <td className="p-4 text-[10px] text-on-surface-variant">{new Date(p.createdAt || Date.now()).toLocaleDateString()}</td>
                          </tr>
                        );
                      })}
                      {payments.filter(p => p.status === 'approved' && p.usedCoupon && !isFictitiousPayment(p)).length === 0 && (
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
          </>
          )}

          {/* Configuration of Active Method */}
          {affiliateTab === 'config' && (
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-6 md:p-8 shadow-xl">
            <h3 className="text-lg font-bold text-on-surface mb-3 flex items-center gap-2">
              <ClipboardList className="text-primary" /> Ajuste das Diretrizes de Afiliados (Business)
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
                <Gift className="text-amber-500 text-3xl" />
                <div>
                  <p className="font-bold text-sm">Opção 1: Convidar 5 = 1 Mês Grátis (Modo Parceria)</p>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                    Ideal para crescimento orgânico acelerado. A cada 5 recomendações registadas, o afiliado ganha 1 mês grátis (as recomendações recebem 30 dias de teste grátis).
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
                <Coins className="text-emerald-500 text-3xl" />
                <div>
                  <p className="font-bold text-sm font-headline uppercase tracking-tight text-white">Opção 2: 30% de Comissões em Dinheiro</p>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                    Direcionado a influenciadores e parceiros de marketing. 30% do valor da assinatura paga é creditada ao padrinho após validação.
                  </p>
                </div>
              </button>
            </div>
          </div>
          )}

          {/* Pending Commissions waiting confirmation by Maestro */}
          {affiliateTab === 'commissions' && (
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-outline-variant/15 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-container">
              <div>
                <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider flex items-center gap-2">
                  <Clock className="text-amber-500" /> Comissões & Indicações por Confirmar
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">Transações geradas por primeiros pagamentos de usuários convidados</p>
              </div>
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <input 
                  type="text" 
                  placeholder="Pesquisar..." 
                  value={affilSearch}
                  onChange={(e) => setAffilSearch(e.target.value)}
                  className="w-full sm:w-auto bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-2 text-xs text-on-surface outline-none focus:border-amber-500 placeholder:text-on-surface-variant/40"
                />
                <span className="text-xs font-mono bg-surface-container-high px-3 py-1 rounded-full font-bold text-on-surface-variant whitespace-nowrap">
                  {adminReferrals.filter(r => r.status === 'pending_approval' && (!affilSearch || r.referredName?.toLowerCase().includes(affilSearch.toLowerCase()) || r.referredEmail?.toLowerCase().includes(affilSearch.toLowerCase()))).length} Pendentes
                </span>
              </div>
            </div>

            {adminReferrals.filter(r => r.status === 'pending_approval' && (!affilSearch || r.referredName?.toLowerCase().includes(affilSearch.toLowerCase()) || r.referredEmail?.toLowerCase().includes(affilSearch.toLowerCase()))).length === 0 ? (
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
                  {adminReferrals.filter(r => r.status === 'pending_approval' && (!affilSearch || r.referredName?.toLowerCase().includes(affilSearch.toLowerCase()) || r.referredEmail?.toLowerCase().includes(affilSearch.toLowerCase()))).map(ref => {
                    const referrerUser = users.find(u => u.id === ref.referrerId || u.refCode === ref.referrerId || (u.id && u.id.substring(0,6).toUpperCase() === ref.referrerId));
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
          )}

          {/* Affiliate Payout requests waiting payment */}
          {affiliateTab === 'payouts' && (
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-outline-variant/15 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-container">
              <div>
                <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider flex items-center gap-2">
                  <Wallet className="text-emerald-500" /> Solicitatções de Saques de Afiliados
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">Pedidos de transferência de fundos provenientes de comissões acumuladas</p>
              </div>
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <input 
                  type="text" 
                  placeholder="Pesquisar..." 
                  value={affilSearch}
                  onChange={(e) => setAffilSearch(e.target.value)}
                  className="w-full sm:w-auto bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-2 text-xs text-on-surface outline-none focus:border-emerald-500 placeholder:text-on-surface-variant/40"
                />
                <span className="text-xs font-mono bg-surface-container-high px-3 py-1 rounded-full font-bold text-on-surface-variant whitespace-nowrap">
                  {adminPayouts.filter(p => p.status === 'pending' && (!affilSearch || p.userName?.toLowerCase().includes(affilSearch.toLowerCase()) || p.userEmail?.toLowerCase().includes(affilSearch.toLowerCase()) || p.fullName?.toLowerCase().includes(affilSearch.toLowerCase()))).length} Por Pagar
                </span>
              </div>
            </div>

            {adminPayouts.filter(p => !affilSearch || p.userName?.toLowerCase().includes(affilSearch.toLowerCase()) || p.userEmail?.toLowerCase().includes(affilSearch.toLowerCase()) || p.fullName?.toLowerCase().includes(affilSearch.toLowerCase())).length === 0 ? (
              <div className="p-8 text-center text-xs text-on-surface-variant/70 italic">Nenhum pedido de levantamento encontrado.</div>
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
                  {adminPayouts.filter(p => !affilSearch || p.userName?.toLowerCase().includes(affilSearch.toLowerCase()) || p.userEmail?.toLowerCase().includes(affilSearch.toLowerCase()) || p.fullName?.toLowerCase().includes(affilSearch.toLowerCase())).map(payout => (
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
          )}

          {/* Trials / Organic Referrals Table */}
          {affiliateTab === 'trials' && (
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl overflow-hidden shadow-xl">
             <div className="p-6 border-b border-outline-variant/15 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-container">
               <div>
                  <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider flex items-center gap-2">
                    <UserPlus className="text-cyan-400" /> Registo de Testes Grátis (Geração de Leads)
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">Membros convidados que efetuaram sucesso no registo. Estes aguardam converter para a sua subscrição.</p>
               </div>
               <div className="flex items-center gap-4 w-full sm:w-auto">
                 <input 
                   type="text" 
                   placeholder="Pesquisar..." 
                   value={affilSearch}
                   onChange={(e) => setAffilSearch(e.target.value)}
                   className="w-full sm:w-auto bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-2 text-xs text-on-surface outline-none focus:border-cyan-500 placeholder:text-on-surface-variant/40"
                 />
                 <span className="text-xs font-mono bg-surface-container-high px-3 py-1 rounded-full font-bold text-on-surface-variant whitespace-nowrap">
                    {adminReferrals.filter(r => r.status === 'approved' && r.rewardType === 'free_month' && r.paymentAmount === 0 && (!affilSearch || r.referredName?.toLowerCase().includes(affilSearch.toLowerCase()) || r.referredEmail?.toLowerCase().includes(affilSearch.toLowerCase()))).length} Leads
                 </span>
               </div>
             </div>
             
             {adminReferrals.filter(r => r.status === 'approved' && r.rewardType === 'free_month' && r.paymentAmount === 0 && (!affilSearch || r.referredName?.toLowerCase().includes(affilSearch.toLowerCase()) || r.referredEmail?.toLowerCase().includes(affilSearch.toLowerCase()))).length === 0 ? (
               <div className="p-8 text-center text-xs text-on-surface-variant/70 italic">Nenhum convidado em período Trial no momento.</div>
             ) : (
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[var(--surface-container)] text-[10px] uppercase font-black text-on-surface-variant tracking-widest border-b border-outline-variant/15 sticky top-0 z-10 backdrop-blur-md">
                      <tr>
                        <th className="p-4">Quem Convidou (Padrinho)</th>
                        <th className="p-4">Lead Registrado</th>
                        <th className="p-4">Registo e Plano</th>
                        <th className="p-4">Recompensa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10 text-xs text-on-surface">
                       {adminReferrals.filter(r => r.status === 'approved' && r.rewardType === 'free_month' && r.paymentAmount === 0 && (!affilSearch || r.referredName?.toLowerCase().includes(affilSearch.toLowerCase()) || r.referredEmail?.toLowerCase().includes(affilSearch.toLowerCase())))
                          .map(ref => {
                            const referrerUser = users.find(u => u.id === ref.referrerId || u.refCode === ref.referrerId || (u.id && u.id.substring(0,6).toUpperCase() === ref.referrerId));
                            return (
                               <tr key={ref.id} className="hover:bg-surface-container/20 transition-colors">
                                 <td className="p-4">
                                   <p className="font-bold text-on-surface">{referrerUser?.name || 'Afiliado'}</p>
                                   <p className="text-[10px] text-on-surface-variant/60 font-mono italic">{referrerUser?.email}</p>
                                 </td>
                                 <td className="p-4">
                                   <p className="font-bold text-cyan-400">{ref.referredName}</p>
                                   <p className="text-[10px] text-on-surface-variant/60 font-mono italic">{ref.referredEmail}</p>
                                 </td>
                                 <td className="p-4">
                                   <span className="font-semibold text-xs font-mono uppercase bg-surface-container-high px-2 py-0.5 rounded border border-outline-variant/15 block w-fit mb-1">{ref.referredPlan?.replace('_', ' ')}</span>
                                   <span className="text-[10px] text-on-surface-variant">{new Date(ref.createdAt).toLocaleDateString()}</span>
                                 </td>
                                 <td className="p-4">
                                    <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-black px-2 py-0.5 rounded uppercase text-[10px]">
                                      Progresso Trial
                                    </span>
                                 </td>
                               </tr>
                            );
                       })}
                    </tbody>
                  </table>
                </div>
             )}
          </div>
          )}

          {/* Quick Grant of Free Subscription Promo */}
          {affiliateTab === 'config' && (
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
          )}

        </div>
      )}

      {/* ABA DE ALERTAS E COMUNICAÇÃO (CENTRAL DE NOTIFICAÇÕES & PWA) */}
      {activeTab === 'alerts' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          
          {/* Sub-Nav dos Alertas */}
          <div className="flex flex-wrap gap-2 p-2 bg-surface-container rounded-2xl border border-outline-variant/20 sticky top-[72px] z-20 backdrop-blur-md">
            <button 
              onClick={() => setAlertViewMode('overview')} 
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${alertViewMode === 'overview' ? 'bg-[#00f5a0] text-black shadow-lg shadow-[#00f5a0]/20 font-black' : 'text-on-surface-variant hover:text-white hover:bg-surface-container-high'}`}
            >
              <Smartphone size={16} /> Painel & Instalações PWA
            </button>
            <button 
              onClick={() => setAlertViewMode('send')} 
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${alertViewMode === 'send' ? 'bg-[#00f5a0] text-black shadow-lg shadow-[#00f5a0]/20 font-black' : 'text-on-surface-variant hover:text-white hover:bg-surface-container-high'}`}
            >
              <Send size={16} /> Disparar Alerta / Notificação
            </button>
            <button 
              onClick={() => setAlertViewMode('history')} 
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${alertViewMode === 'history' ? 'bg-[#00f5a0] text-black shadow-lg shadow-[#00f5a0]/20 font-black' : 'text-on-surface-variant hover:text-white hover:bg-surface-container-high'}`}
            >
              <History size={16} /> Histórico & Logs <span className="bg-surface-container-highest/80 px-2 py-0.5 rounded-full text-[10px] font-bold">{notificationsList.length + broadcasts.length}</span>
            </button>
            <button 
              onClick={() => setAlertViewMode('triggers')} 
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${alertViewMode === 'triggers' ? 'bg-[#00f5a0] text-black shadow-lg shadow-[#00f5a0]/20 font-black' : 'text-on-surface-variant hover:text-white hover:bg-surface-container-high'}`}
            >
              <BellRing size={16} /> Gatilhos Automáticos Ativos
            </button>
          </div>

          {/* MODO 1: DASHBOARD & MÉTRICAS DE INSTALAÇÕES */}
          {alertViewMode === 'overview' && (
            <div className="space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#00f5a0]/5 rounded-full blur-2xl group-hover:bg-[#00f5a0]/10 transition-colors"></div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-black uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-[#00f5a0]" /> App PWA Instalado
                    </span>
                    <span className="bg-[#00f5a0]/15 text-[#00f5a0] text-[10px] font-black px-2 py-0.5 rounded-full">
                      Mobile Only
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black font-headline text-white">
                      {users.filter(u => u.pwaInstalled).length}
                    </span>
                    <span className="text-xs text-on-surface-variant font-bold">
                      de {users.length} traders ({users.length > 0 ? Math.round((users.filter(u => u.pwaInstalled).length / users.length) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="mt-4 pt-3 border-t border-outline-variant/10 flex items-center justify-between text-[11px] text-on-surface-variant font-semibold">
                    <span>Android: {users.filter(u => u.pwaInstalled && u.pwaPlatform !== 'iOS').length}</span>
                    <span>iPhone/iOS: {users.filter(u => u.pwaInstalled && u.pwaPlatform === 'iOS').length}</span>
                  </div>
                </div>

                <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-colors"></div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-black uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                      <BellRing className="w-4 h-4 text-cyan-400" /> Push Ativo
                    </span>
                    <span className="bg-cyan-500/15 text-cyan-400 text-[10px] font-black px-2 py-0.5 rounded-full">
                      Tempo Real
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black font-headline text-white">
                      {users.filter(u => u.pushNotificationsEnabled).length || Math.max(1, users.filter(u => u.pwaInstalled).length)}
                    </span>
                    <span className="text-xs text-on-surface-variant font-bold">
                      dispositivos
                    </span>
                  </div>
                  <div className="mt-4 pt-3 border-t border-outline-variant/10 text-[11px] text-on-surface-variant font-semibold">
                    Recepção nativa no ecrã de bloqueio
                  </div>
                </div>

                <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors"></div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-black uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                      <Megaphone className="w-4 h-4 text-amber-400" /> Comunicados Globais
                    </span>
                    <span className="bg-amber-500/15 text-amber-400 text-[10px] font-black px-2 py-0.5 rounded-full">
                      Ativos
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black font-headline text-white">
                      {broadcasts.length}
                    </span>
                    <span className="text-xs text-on-surface-variant font-bold">
                      avisos no feed
                    </span>
                  </div>
                  <div className="mt-4 pt-3 border-t border-outline-variant/10 text-[11px] text-on-surface-variant font-semibold">
                    Exibidos no topo da plataforma
                  </div>
                </div>

                <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors"></div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-black uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                      <History className="w-4 h-4 text-purple-400" /> Total Notificações
                    </span>
                    <span className="bg-purple-500/15 text-purple-400 text-[10px] font-black px-2 py-0.5 rounded-full">
                      Registadas
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black font-headline text-white">
                      {notificationsList.length}
                    </span>
                    <span className="text-xs text-on-surface-variant font-bold">
                      disparos totais
                    </span>
                  </div>
                  <div className="mt-4 pt-3 border-t border-outline-variant/10 text-[11px] text-on-surface-variant font-semibold">
                    Logs automáticos e manuais
                  </div>
                </div>
              </div>

              {/* Informative Banner & Architecture Rules */}
              <div className="bg-[#0a0f1d] border border-[#00f5a0]/30 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="space-y-2 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00f5a0]/15 text-[#00f5a0] text-xs font-black uppercase tracking-wider">
                      <CheckCircle2 size={14} /> Sistema Inteligente PWA & Notificações Ativo
                    </div>
                    <h3 className="text-xl md:text-2xl font-black text-white font-headline">
                      Regras de Instalação e Privacidade do Utilizador
                    </h3>
                    <p className="text-xs md:text-sm text-on-surface-variant leading-relaxed">
                      O banner de instalação foi concebido estritamente para <strong>dispositivos móveis (Android e iPhone)</strong>. Computadores e laptops nunca visualizam popups de instalação intrusivos. Após a instalação no telemóvel ou em modo tela cheia (standalone), o sistema <strong>auto-deteta a instalação</strong> e suprime permanentemente o popup sem necessidade de intervenção do trader.
                    </p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
                    <button
                      onClick={() => setAlertViewMode('send')}
                      className="bg-[#00f5a0] hover:bg-[#00f5a0]/90 text-black px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#00f5a0]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      <Send size={15} /> Disparar Comunicado
                    </button>
                    <button
                      onClick={handleTestPush}
                      className="bg-surface-container hover:bg-surface-container-high text-white border border-outline-variant/20 px-5 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      <Bell size={15} /> Testar Push Agora
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Actions & Recent Broadcasts Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-base text-white flex items-center gap-2">
                      <Megaphone className="text-[#00f5a0]" size={18} /> Comunicados Globais no Feed ({broadcasts.length})
                    </h4>
                    <button
                      onClick={() => setAlertViewMode('send')}
                      className="text-xs text-[#00f5a0] font-black uppercase hover:underline"
                    >
                      + Novo
                    </button>
                  </div>

                  {broadcasts.length === 0 ? (
                    <div className="text-center py-10 text-on-surface-variant text-xs">
                      Nenhum comunicado global ativo no momento.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                      {broadcasts.map(b => (
                        <div key={b.id} className="bg-surface-container/60 border border-outline-variant/10 rounded-2xl p-4 flex items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 text-[10px] text-on-surface-variant">
                              <span className="font-bold text-white">{b.author || 'Admin Master'}</span>
                              <span>•</span>
                              <span>{new Date(b.createdAt).toLocaleString('pt-AO', { dateStyle: 'short', timeStyle: 'short' })}</span>
                            </div>
                            <p className="text-xs text-on-surface leading-relaxed break-words font-medium">{b.message}</p>
                          </div>
                          <button
                            onClick={() => handleDeleteBroadcast(b.id)}
                            className="text-error/70 hover:text-error p-1.5 rounded-lg hover:bg-error/10 transition-colors shrink-0"
                            title="Apagar comunicado"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-base text-white flex items-center gap-2">
                      <BellRing className="text-cyan-400" size={18} /> Últimas Notificações de Sistema ({notificationsList.slice(0, 5).length})
                    </h4>
                    <button
                      onClick={() => setAlertViewMode('history')}
                      className="text-xs text-cyan-400 font-black uppercase hover:underline"
                    >
                      Ver Todas
                    </button>
                  </div>

                  {notificationsList.length === 0 ? (
                    <div className="text-center py-10 text-on-surface-variant text-xs">
                      Nenhuma notificação registada no sistema.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                      {notificationsList.slice(0, 5).map(n => (
                        <div key={n.id} className="bg-surface-container/60 border border-outline-variant/10 rounded-2xl p-3.5 flex items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-white">{n.title}</span>
                              <span className="text-[9px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded">
                                {n.targetLabel || 'Global'}
                              </span>
                            </div>
                            <p className="text-xs text-on-surface-variant line-clamp-1">{n.body}</p>
                            <span className="text-[10px] text-on-surface-variant/60 block">
                              {new Date(n.createdAt).toLocaleString('pt-AO', { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteNotification(n.id)}
                            className="text-white/40 hover:text-error p-1.5 rounded-lg hover:bg-surface-container transition-colors shrink-0"
                            title="Apagar notificação"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* MODO 2: DISPARAR NOVO ALERTA / NOTIFICAÇÃO */}
          {alertViewMode === 'send' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Formulário Principal */}
              <div className="lg:col-span-7 bg-surface-container-low border border-outline-variant/20 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
                <div>
                  <h3 className="text-xl font-black text-white font-headline flex items-center gap-2">
                    <Send className="text-[#00f5a0]" size={20} /> Disparar Notificação & Comunicado Manual
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Envie comunicações em massa, avisos urgentes ou notificações direcionadas para utilizadores específicos com redirecionamento de tela.
                  </p>
                </div>

                {/* 1. Seleção do Público Alvo */}
                <div className="space-y-3">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-on-surface-variant">
                    1. Selecione o Público-Alvo
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setManualTarget('all')}
                      className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${manualTarget === 'all' ? 'bg-[#00f5a0]/15 border-[#00f5a0] text-[#00f5a0] font-black shadow-md' : 'bg-surface-container border-outline-variant/10 text-on-surface-variant hover:text-white'}`}
                    >
                      <Users size={18} />
                      <span className="text-xs">Todos ({users.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualTarget('free')}
                      className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${manualTarget === 'free' ? 'bg-[#00f5a0]/15 border-[#00f5a0] text-[#00f5a0] font-black shadow-md' : 'bg-surface-container border-outline-variant/10 text-on-surface-variant hover:text-white'}`}
                    >
                      <Coins size={18} />
                      <span className="text-xs">Plano Free</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualTarget('premium')}
                      className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${manualTarget === 'premium' ? 'bg-[#00f5a0]/15 border-[#00f5a0] text-[#00f5a0] font-black shadow-md' : 'bg-surface-container border-outline-variant/10 text-on-surface-variant hover:text-white'}`}
                    >
                      <BadgeDollarSign size={18} />
                      <span className="text-xs">Assinantes</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualTarget('specific')}
                      className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${manualTarget === 'specific' ? 'bg-[#00f5a0]/15 border-[#00f5a0] text-[#00f5a0] font-black shadow-md' : 'bg-surface-container border-outline-variant/10 text-on-surface-variant hover:text-white'}`}
                    >
                      <UserPlus size={18} />
                      <span className="text-xs">Trader Único</span>
                    </button>
                  </div>

                  {/* Seletor de Trader Específico */}
                  {manualTarget === 'specific' && (
                    <div className="mt-3 p-4 bg-surface-container/60 border border-outline-variant/15 rounded-2xl space-y-3 animate-in fade-in duration-200">
                      <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
                        <input
                          type="text"
                          value={manualTargetSearch}
                          onChange={e => setManualTargetSearch(e.target.value)}
                          placeholder="Buscar trader por nome ou email..."
                          className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border border-outline-variant/20 rounded-xl text-xs text-white focus:outline-none focus:border-[#00f5a0]"
                        />
                      </div>

                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                        {users
                          .filter(u => u.status !== 'deleted')
                          .filter(u => 
                            (u.nome || '').toLowerCase().includes(manualTargetSearch.toLowerCase()) ||
                            (u.name || '').toLowerCase().includes(manualTargetSearch.toLowerCase()) ||
                            (u.email || '').toLowerCase().includes(manualTargetSearch.toLowerCase())
                          )
                          .slice(0, 15)
                          .map(u => (
                            <div
                              key={u.id}
                              onClick={() => setManualTargetUserId(u.id)}
                              className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-all ${manualTargetUserId === u.id ? 'bg-[#00f5a0] text-black font-bold' : 'bg-surface-container hover:bg-surface-container-high text-on-surface'}`}
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-bold truncate">{u.nome || u.name || 'Sem nome'}</p>
                                <p className={`text-[10px] truncate ${manualTargetUserId === u.id ? 'text-black/80' : 'text-on-surface-variant'}`}>{u.email}</p>
                              </div>
                              <span className={`text-[9px] px-2 py-0.5 rounded-md font-black uppercase ${manualTargetUserId === u.id ? 'bg-black/20 text-black' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                                {u.plan_type || 'Iniciante'}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Categoria & Tipo do Alerta */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-on-surface-variant">
                    2. Tipo / Categoria do Alerta
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'broadcast', label: '📢 Comunicado Oficial' },
                      { id: 'urgent', label: '🚨 Alerta Urgente' },
                      { id: 'update', label: '🚀 Nova Atualização' },
                      { id: 'tip', label: '💡 Dica de Gestão / Mindset' },
                      { id: 'system_alert', label: '🎁 Promoção / Cupão' },
                    ].map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setManualAlertType(t.id as any)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${manualAlertType === t.id ? 'bg-white text-black font-black shadow-md' : 'bg-surface-container text-on-surface-variant hover:text-white'}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Título e Mensagem */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-on-surface-variant mb-1.5">
                      3. Título da Notificação
                    </label>
                    <input
                      type="text"
                      value={manualAlertTitle}
                      onChange={e => setManualAlertTitle(e.target.value)}
                      placeholder="Ex: 🚀 Atualização no Diário de Trades C Profit"
                      maxLength={80}
                      className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00f5a0]"
                    />
                    <div className="flex justify-end text-[10px] text-on-surface-variant/60 mt-1">
                      {manualAlertTitle.length}/80 caracteres
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-on-surface-variant mb-1.5">
                      4. Mensagem Completa
                    </label>
                    <textarea
                      rows={4}
                      value={manualAlertBody}
                      onChange={e => setManualAlertBody(e.target.value)}
                      placeholder="Escreva a mensagem clara e objetiva para os traders..."
                      maxLength={350}
                      className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00f5a0] resize-none"
                    />
                    <div className="flex justify-end text-[10px] text-on-surface-variant/60 mt-1">
                      {manualAlertBody.length}/350 caracteres
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-on-surface-variant mb-1.5">
                      5. Redirecionamento ao Clicar na Notificação (Aba Alvo)
                    </label>
                    <select
                      value={manualAlertActionTab}
                      onChange={e => setManualAlertActionTab(e.target.value as any)}
                      className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00f5a0]"
                    >
                      <option value="dashboard">🏠 Dashboard Principal</option>
                      <option value="plans">💎 Planos & Subscrição</option>
                      <option value="community">👥 Comunidade de Traders</option>
                      <option value="trades">📊 Diário de Trades</option>
                      <option value="affiliates_user">🤝 Área de Afiliados</option>
                    </select>
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    disabled={manualAlertSending}
                    onClick={handleSendManualAlert}
                    className="flex-1 bg-[#00f5a0] hover:bg-[#00f5a0]/90 text-black py-3.5 rounded-2xl font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#00f5a0]/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {manualAlertSending ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Disparando Notificações...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Disparar Notificação Push & Comunicado
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleTestPush}
                    className="bg-surface-container hover:bg-surface-container-high text-white px-5 py-3.5 rounded-2xl font-bold uppercase text-xs tracking-wider border border-outline-variant/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Bell className="w-4 h-4" /> Testar no Meu Dispositivo
                  </button>
                </div>
              </div>

              {/* Simulador Interativo em Tempo Real */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                      <Eye size={16} className="text-[#00f5a0]" /> Simulação Push no Telemóvel
                    </span>
                    <span className="text-[10px] bg-[#00f5a0]/15 text-[#00f5a0] font-black px-2 py-0.5 rounded-full">
                      Tempo Real
                    </span>
                  </div>

                  {/* Smartphone Lockscreen Mockup */}
                  <div className="w-full bg-[#0d1425] border-2 border-outline-variant/30 rounded-[32px] p-5 shadow-2xl space-y-4 relative overflow-hidden">
                    {/* Top Status Bar */}
                    <div className="flex justify-between items-center text-[10px] text-white/50 px-2 font-mono">
                      <span>09:41</span>
                      <div className="flex items-center gap-1.5">
                        <span>5G</span>
                        <div className="w-4 h-2 border border-white/50 rounded-sm p-0.5">
                          <div className="w-full h-full bg-white"></div>
                        </div>
                      </div>
                    </div>

                    {/* Lock Screen Push Notification Widget */}
                    <div className="bg-[#1a233a]/90 backdrop-blur-md border border-[#00f5a0]/40 rounded-2xl p-4 shadow-xl space-y-2 animate-in zoom-in-95 duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img 
                            src="https://i.postimg.cc/v8qJ6KTk/C-profit.png" 
                            alt="C Profit" 
                            className="w-5 h-5 rounded-md object-cover" 
                          />
                          <span className="text-[11px] font-black text-white uppercase tracking-wider">C Profit App</span>
                        </div>
                        <span className="text-[9px] text-white/40 font-mono">Agora</span>
                      </div>

                      <div>
                        <h5 className="text-xs font-black text-[#00f5a0] leading-tight">
                          {manualAlertTitle || 'Título da Notificação'}
                        </h5>
                        <p className="text-[11px] text-white/80 mt-1 leading-snug break-words">
                          {manualAlertBody || 'Escreva o texto do seu alerta para pré-visualizar aqui como ele será renderizado no telemóvel dos traders.'}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[9px] text-white/40">
                        <span>Toque para abrir a aplicação</span>
                        <span className="text-[#00f5a0] font-bold">Ação: {manualAlertActionTab}</span>
                      </div>
                    </div>

                    <div className="pt-4 text-center">
                      <span className="text-[10px] text-white/30 font-medium">
                        Disparado via Firebase & Push Service Worker
                      </span>
                    </div>
                  </div>
                </div>

                {/* Audience Target Summary */}
                <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-5 space-y-2 text-xs">
                  <span className="font-black text-white uppercase tracking-wider block text-[10px] text-on-surface-variant">
                    Resumo do Disparo
                  </span>
                  <div className="space-y-1 text-on-surface-variant">
                    <p>• <strong>Destino:</strong> {manualTarget === 'all' ? 'Todos os Utilizadores da Plataforma' : manualTarget === 'free' ? 'Utilizadores no Plano Free' : manualTarget === 'premium' ? 'Utilizadores com Assinatura Ativa' : 'Trader Específico'}</p>
                    <p>• <strong>Tipo:</strong> {manualAlertType}</p>
                    <p>• <strong>Canais:</strong> Push Notification Nativo + Feed de Comunicados + Central de Notificações</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODO 3: HISTÓRICO & LOGS DE NOTIFICAÇÕES */}
          {alertViewMode === 'history' && (
            <div className="space-y-6">
              {/* Filtros e Busca */}
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-surface-container-low border border-outline-variant/20 rounded-3xl p-4 md:p-6 shadow-xl">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
                  <input
                    type="text"
                    value={alertSearchQuery}
                    onChange={e => setAlertSearchQuery(e.target.value)}
                    placeholder="Filtrar histórico por título, conteúdo ou destinatário..."
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-container border border-outline-variant/20 rounded-xl text-xs text-white focus:outline-none focus:border-[#00f5a0]"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'all', label: 'Todas' },
                    { id: 'broadcast', label: 'Comunicados' },
                    { id: 'system_alert', label: 'Sistema' },
                    { id: 'user_registration', label: 'Registos' },
                    { id: 'payment_pending', label: 'Pagamentos' },
                    { id: 'community_post', label: 'Comunidade' },
                    { id: 'subscription_expiring', label: 'Vencimentos' },
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setAlertHistoryFilter(f.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${alertHistoryFilter === f.id ? 'bg-primary text-on-primary font-black' : 'bg-surface-container text-on-surface-variant hover:text-white'}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lista do Histórico */}
              <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl overflow-hidden shadow-xl">
                <div className="p-6 border-b border-outline-variant/20 flex items-center justify-between">
                  <h4 className="font-bold text-base text-white flex items-center gap-2">
                    <History size={18} className="text-[#00f5a0]" /> Registos de Notificações e Alertas
                  </h4>
                  <span className="text-xs text-on-surface-variant font-medium">
                    Total: {notificationsList.length} registos
                  </span>
                </div>

                {notificationsList.length === 0 ? (
                  <div className="p-12 text-center text-on-surface-variant text-sm">
                    Nenhum registo de notificação encontrado.
                  </div>
                ) : (
                  <div className="divide-y divide-outline-variant/10 max-h-[600px] overflow-y-auto">
                    {notificationsList
                      .filter(n => {
                        if (alertHistoryFilter !== 'all' && n.type !== alertHistoryFilter) return false;
                        if (alertSearchQuery) {
                          const q = alertSearchQuery.toLowerCase();
                          const t = (n.title || '').toLowerCase();
                          const b = (n.body || '').toLowerCase();
                          const l = (n.targetLabel || '').toLowerCase();
                          return t.includes(q) || b.includes(q) || l.includes(q);
                        }
                        return true;
                      })
                      .map(item => (
                        <div key={item.id} className="p-5 hover:bg-surface-container/40 transition-colors flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-surface-container border border-outline-variant/20 flex items-center justify-center shrink-0 mt-0.5">
                              {item.type === 'user_registration' ? (
                                <UserPlus className="w-4 h-4 text-emerald-400" />
                              ) : item.type === 'payment_pending' ? (
                                <CreditCard className="w-4 h-4 text-amber-400" />
                              ) : item.type === 'community_post' ? (
                                <MessageSquare className="w-4 h-4 text-cyan-400" />
                              ) : item.type === 'subscription_expiring' ? (
                                <Clock className="w-4 h-4 text-rose-400" />
                              ) : (
                                <Megaphone className="w-4 h-4 text-[#00f5a0]" />
                              )}
                            </div>

                            <div className="space-y-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h5 className="text-xs font-black text-white">{item.title}</h5>
                                <span className="text-[9px] bg-[#00f5a0]/10 text-[#00f5a0] font-bold px-2 py-0.5 rounded-full uppercase">
                                  {item.targetLabel || item.userId || 'Global'}
                                </span>
                                <span className="text-[10px] text-on-surface-variant font-mono">
                                  {new Date(item.createdAt).toLocaleString('pt-AO', { dateStyle: 'short', timeStyle: 'short' })}
                                </span>
                              </div>
                              <p className="text-xs text-on-surface leading-relaxed break-words font-medium">{item.body}</p>
                              {item.actionTab && (
                                <span className="text-[10px] text-on-surface-variant/80 font-bold inline-block">
                                  Redireciona para: #{item.actionTab}
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => handleDeleteNotification(item.id)}
                            className="text-on-surface-variant hover:text-error p-2 rounded-xl hover:bg-surface-container transition-colors shrink-0"
                            title="Apagar registo"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MODO 4: GATILHOS AUTOMÁTICOS DO SISTEMA */}
          {alertViewMode === 'triggers' && (
            <div className="space-y-6">
              <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-6 md:p-8 shadow-xl space-y-4">
                <div>
                  <h3 className="text-xl font-black text-white font-headline flex items-center gap-2">
                    <BellRing className="text-[#00f5a0]" size={22} /> Monitoramento dos Gatilhos Automáticos Ativos
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Todos os gatilhos abaixo estão pré-configurados e em execução contínua no ecossistema C Profit.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                  {[
                    {
                      title: '👤 Novo Registo de Trader',
                      desc: 'Notifica imediatamente o Admin Master (exportacoes.extras@gmail.com) quando um novo trader cria conta.',
                      status: 'Ativo & Operacional',
                      color: 'emerald'
                    },
                    {
                      title: '💰 Nova Solicitação de Pagamento',
                      desc: 'Avisa o Admin Master com comprovativo pendente para validação e ativação rápida de planos.',
                      status: 'Ativo & Operacional',
                      color: 'amber'
                    },
                    {
                      title: '🤝 Indicação & Comissão de Afiliado',
                      desc: 'Notifica o afiliado sempre que o seu link/código de parceiro é utilizado com sucesso.',
                      status: 'Ativo & Operacional',
                      color: 'cyan'
                    },
                    {
                      title: '📢 Nova Postagem na Comunidade',
                      desc: 'Alerta todos os traders quando uma nova análise técnica ou ideia for publicada no feed comunitário.',
                      status: 'Ativo & Operacional',
                      color: 'purple'
                    },
                    {
                      title: '⏳ Lembretes de Vencimento de Plano',
                      desc: 'Avisos inteligentes enviados aos assinantes com 15 dias, 5 dias, 2 dias e no dia de expiração.',
                      status: 'Ativo & Operacional',
                      color: 'rose'
                    },
                    {
                      title: '📊 Fechamento e Balanço Semanal',
                      desc: 'Resumo de desempenho de trading e dicas de gestão de risco e psicologia disparados nos fins de semana.',
                      status: 'Ativo & Operacional',
                      color: 'blue'
                    }
                  ].map((trig, idx) => (
                    <div key={idx} className="bg-surface-container border border-outline-variant/15 rounded-2xl p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-white">{trig.title}</span>
                        <span className="w-2 h-2 rounded-full bg-[#00f5a0] animate-ping"></span>
                      </div>
                      <p className="text-xs text-on-surface-variant leading-relaxed">{trig.desc}</p>
                      <div className="pt-2 border-t border-outline-variant/10 flex items-center justify-between text-[10px]">
                        <span className="text-[#00f5a0] font-black">{trig.status}</span>
                        <span className="text-on-surface-variant font-mono">Service Worker V1</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={handleTestPush}
                    className="bg-[#00f5a0] hover:bg-[#00f5a0]/90 text-black px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-[#00f5a0]/20"
                  >
                    <Bell size={14} /> Testar Disparo de Push
                  </button>
                </div>
              </div>
            </div>
          )}

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
                     <option value="Iniciante">Iniciante (Plano Gratuito • Para Sempre)</option>
                     <option value="trimestral_6">Trimestral (6 Contas FX + 6 OB)</option>
                     <option value="semestral_8">Semestral (8 Contas FX + 8 OB)</option>
                     <option value="anual_16">Anual (16 Contas FX + 16 OB)</option>
                     <option value="mensal_6">Mensal (Legado)</option>
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

      {editingCoupon && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
           <div className="bg-surface-container border border-outline-variant/30 rounded-3xl p-8 max-w-lg w-full shadow-2xl relative animate-in zoom-in-95 duration-200">
              <button
                onClick={() => setEditingCoupon(null)}
                className="absolute top-6 right-6 p-2 text-on-surface-variant hover:text-white hover:bg-surface-container-high rounded-full transition-all cursor-pointer"
              >
                <X size={20} />
              </button>

              <h3 className="text-xl font-bold mb-2 font-headline flex items-center gap-3 text-[#00f5a0]">
                 <Pencil size={22} className="text-[#00f5a0]" />
                 Editar Cupão
              </h3>
              <p className="text-xs text-on-surface-variant mb-6 font-medium">Altere os detalhes ou corrija o nome deste cupão de desconto / parceria cadastrado.</p>
              
              <div className="space-y-4 font-sans">
                 <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2 font-mono">Código do Cupão</label>
                    <input 
                      type="text" 
                      value={editingCoupon.code}
                      onChange={e => setEditingCoupon({ ...editingCoupon, code: e.target.value.toUpperCase() })}
                      className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 focus:outline-none focus:border-primary text-sm font-mono font-bold uppercase text-white"
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Tipo de Desconto</label>
                       <select 
                         value={editingCoupon.discountType}
                         onChange={e => setEditingCoupon({ ...editingCoupon, discountType: e.target.value })}
                         className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 focus:outline-none focus:border-primary text-sm text-white cursor-pointer"
                       >
                         <option value="percentage">Percentagem %</option>
                         <option value="fixed">Valor Fixo (Kz)</option>
                       </select>
                    </div>

                    <div>
                       <label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Valor</label>
                       <input 
                         type="number" 
                         value={editingCoupon.discountValue}
                         onChange={e => setEditingCoupon({ ...editingCoupon, discountValue: e.target.value })}
                         className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 focus:outline-none focus:border-primary text-sm text-white"
                         placeholder={editingCoupon.discountType === 'percentage' ? "Ex: 20" : "Ex: 5000"}
                       />
                    </div>
                 </div>

                 <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Plano Alvo</label>
                    <select 
                      value={editingCoupon.targetPlan}
                      onChange={e => setEditingCoupon({ ...editingCoupon, targetPlan: e.target.value })}
                      className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 focus:outline-none focus:border-primary text-sm text-white cursor-pointer"
                    >
                      <option value="all">Todos os Planos</option>
                      <option value="mensal_6">Mensal</option>
                      <option value="trimestral_6">Trimestral</option>
                      <option value="semestral_8">Semestral</option>
                      <option value="anual_16">Anual</option>
                    </select>
                 </div>

                 <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Referência (Parceiro)</label>
                    <input 
                      type="text" 
                      value={editingCoupon.partnerRef || ''}
                      onChange={e => setEditingCoupon({ ...editingCoupon, partnerRef: e.target.value })}
                      className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 focus:outline-none focus:border-primary text-sm text-white"
                      placeholder="Identificação do parceiro"
                    />
                 </div>
              </div>

              <div className="flex gap-4 mt-8">
                 <button 
                   onClick={() => setEditingCoupon(null)}
                   className="flex-grow py-3 bg-surface-container border border-outline-variant/20 text-on-surface hover:text-white transition-all rounded-xl font-bold uppercase tracking-widest text-xs cursor-pointer text-center text-white"
                 >
                   Cancelar
                 </button>
                 <button 
                   onClick={() => handleUpdateCoupon(editingCoupon.id, editingCoupon)}
                   className="flex-grow py-3 bg-[#00f5a0] text-background hover:bg-[#00f5a0]/90 transition-colors rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-[#00f5a0]/15 cursor-pointer"
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
