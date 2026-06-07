import React, { useState, useEffect } from 'react';
import { useCurrency } from '../contexts/CurrencyContext';
import Modal from './Modal';
import { db, auth, registerPartnerAuth } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, getDocs, getDoc, addDoc } from 'firebase/firestore';
import { Layers, Copy, Monitor, Lock, Check, Download, CreditCard, ShieldCheck, Zap, Landmark, Smartphone, Mail, User, ChevronDown, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const COUNTRIES = [
  { code: 'AO', label: 'AO +244', dialCode: '+244', flag: '🇦🇴' },
  { code: 'PT', label: 'PT +351', dialCode: '+351', flag: '🇵🇹' },
  { code: 'BR', label: 'BR +55', dialCode: '+55', flag: '🇧🇷' },
  { code: 'MZ', label: 'MZ +258', dialCode: '+258', flag: '🇲🇿' },
  { code: 'CV', label: 'CV +238', dialCode: '+238', flag: '🇨🇻' },
  { code: 'GW', label: 'GW +245', dialCode: '+245', flag: '🇬🇼' },
  { code: 'ST', label: 'ST +239', dialCode: '+239', flag: '🇸🇹' },
  { code: 'GQ', label: 'GQ +240', dialCode: '+240', flag: '🇬🇶' }
];

const parsePhoneNumberInput = (phoneVal: string) => {
  const dialCodes = ['+244', '+351', '+55', '+258', '+238', '+245', '+239', '+240'];
  let cleaned = (phoneVal || '').trim();
  
  for (const dial of dialCodes) {
    if (cleaned.startsWith(dial)) {
      return { dialCode: dial, localNumber: cleaned.substring(dial.length).trim() };
    }
    const noPlus = dial.replace('+', '');
    if (cleaned.startsWith(noPlus)) {
      return { dialCode: dial, localNumber: cleaned.substring(noPlus.length).trim() };
    }
  }
  
  if (cleaned.length === 9 && cleaned.startsWith('9')) {
    return { dialCode: '+244', localNumber: cleaned };
  }
  
  return { dialCode: '+244', localNumber: cleaned };
};

export interface Objective {
  id: string;
  type: 'account' | 'market';
  targetId: string;
  profitTarget: string;
  maxLoss: string;
  dailyLoss: string;
  maxLossPeriod?: 'Semana' | 'Mês' | 'Geral';
  hidden?: boolean;
}

export default function Settings() {
  const { currency, setCurrency } = useCurrency();
  const [isLoaded, setIsLoaded] = useState(false);
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [sessionType, setSessionType] = useState<'simple' | 'subdivided'>('subdivided');
  const [defaultTradeType, setDefaultTradeType] = useState<'ask' | 'forex' | 'ob'>('ask');
  const [defaultCommunityFeed, setDefaultCommunityFeed] = useState<'forex' | 'ob'>('forex');
  const [showCommunityFilter, setShowCommunityFilter] = useState(true);
  const [visibleMarkets, setVisibleMarkets] = useState<'all' | 'forex' | 'ob'>('all');
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
    maxLossPeriod: 'Mês',
    hidden: false
  });
  const [accounts, setAccounts] = useState<any[]>([]);
  const [sessions, setSessions] = useState([
    { 
      id: 'asian', 
      name: 'Sessão Asiática', 
      start: '20:00', 
      end: '04:00',
      subdivisions: {
        pre: { start: '20:00', end: '21:00', label: 'Pré-Mercado' },
        intra: { start: '21:00', end: '02:00', label: 'Intra Mercado' },
        noop: { start: '02:00', end: '03:00', label: 'Zona Não Operável' },
        close: { start: '03:00', end: '04:00', label: 'Fechamento' },
      }
    },
    { 
      id: 'london', 
      name: 'Sessão de Londres', 
      start: '03:00', 
      end: '11:00',
      subdivisions: {
        pre: { start: '03:00', end: '04:00', label: 'Pré-Mercado' },
        intra: { start: '04:00', end: '09:00', label: 'Intra Mercado' },
        noop: { start: '09:00', end: '10:00', label: 'Zona Não Operável' },
        close: { start: '10:00', end: '11:00', label: 'Fechamento' },
      }
    },
    { 
      id: 'newyork', 
      name: 'Sessão de Nova York', 
      start: '08:00', 
      end: '17:00',
      subdivisions: {
        pre: { start: '08:00', end: '09:30', label: 'Pré-Mercado' },
        intra: { start: '09:30', end: '14:30', label: 'Intra Mercado' },
        noop: { start: '14:30', end: '16:00', label: 'Zona Não Operável' },
        close: { start: '16:00', end: '17:00', label: 'Fechamento' },
      }
    },
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
  const [billingDialCode, setBillingDialCode] = useState('+244');
  const [billingPhoneLocal, setBillingPhoneLocal] = useState('');

  useEffect(() => {
    if (billingPhone) {
      const parsed = parsePhoneNumberInput(billingPhone);
      setBillingDialCode(parsed.dialCode);
      setBillingPhoneLocal(parsed.localNumber);
    }
  }, [billingPhone]);

  const handleBillingPhoneLocalChange = (val: string) => {
    const clean = val.replace(/\D/g, '');
    setBillingPhoneLocal(clean);
    setBillingPhone(billingDialCode + clean);
  };

  const handleBillingDialChange = (val: string) => {
    setBillingDialCode(val);
    setBillingPhone(val + billingPhoneLocal);
  };
  const [registrationId, setRegistrationId] = useState('');
  const [partnerEmail, setPartnerEmail] = useState('');
  const [partnerPassword, setPartnerPassword] = useState('');
  const [partnerSaved, setPartnerSaved] = useState(false);
  const [isSavingPartner, setIsSavingPartner] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    billing: false,
    regional: true,
    community: true,
    objectives: true,
    sessions: true,
    platforms: true,
    accounts: true,
    partner: true,
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

    const savedVisibleMarkets = localStorage.getItem('app_visible_markets') as 'all' | 'forex' | 'ob';
    if (savedVisibleMarkets) setVisibleMarkets(savedVisibleMarkets);

    const savedObjectives = localStorage.getItem('app_objectives');
    if (savedObjectives) setObjectives(JSON.parse(savedObjectives));

    const savedSessions = localStorage.getItem('app_sessions');
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        const migrated = parsed.map((s: any) => {
          if (!s.subdivisions) {
            let subs = {
              pre: { start: '20:00', end: '21:00', label: 'Pré-Mercado' },
              intra: { start: '21:00', end: '02:00', label: 'Intra Mercado' },
              noop: { start: '02:00', end: '03:00', label: 'Zona Não Operável' },
              close: { start: '03:00', end: '04:00', label: 'Fechamento' },
            };
            if (s.id === 'london') {
              subs = {
                pre: { start: '03:00', end: '04:00', label: 'Pré-Mercado' },
                intra: { start: '04:00', end: '09:00', label: 'Intra Mercado' },
                noop: { start: '09:00', end: '10:00', label: 'Zona Não Operável' },
                close: { start: '10:00', end: '11:00', label: 'Fechamento' },
              };
            } else if (s.id === 'newyork') {
              subs = {
                pre: { start: '08:00', end: '09:30', label: 'Pré-Mercado' },
                intra: { start: '09:30', end: '14:30', label: 'Intra Mercado' },
                noop: { start: '14:30', end: '16:00', label: 'Zona Não Operável' },
                close: { start: '16:00', end: '17:00', label: 'Fechamento' },
              };
            }
            return { ...s, subdivisions: subs };
          }
          return s;
        });
        setSessions(migrated);
      } catch (_) {
        setSessions(JSON.parse(savedSessions));
      }
    }

    if (!auth.currentUser) {
      setIsLoaded(true);
      return;
    }

    // Load User Profile / Billing Info and Settings from Firestore
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

        // Load Maestro/User doc and user settings from Firestore
        if (auth.currentUser) {
          const uDoc = await getDoc(doc(db, 'usuarios', auth.currentUser.uid));
          if (uDoc.exists()) {
            const uData = uDoc.data();
            setPartnerEmail(uData.partnerEmail || '');
            setPartnerPassword(uData.partnerPassword || '');
            if (uData.partnerEmail) {
              setPartnerSaved(true);
            }
            if (uData.settings) {
              const s = uData.settings;
              if (s.dateFormat) {
                setDateFormat(s.dateFormat);
                localStorage.setItem('app_date_format', s.dateFormat);
              }
              if (s.sessionType) {
                setSessionType(s.sessionType);
                localStorage.setItem('app_session_type', s.sessionType);
              }
              if (s.defaultTradeType) {
                setDefaultTradeType(s.defaultTradeType);
                localStorage.setItem('app_default_trade_type', s.defaultTradeType);
              }
              if (s.defaultCommunityFeed) {
                setDefaultCommunityFeed(s.defaultCommunityFeed);
                localStorage.setItem('app_default_community_feed', s.defaultCommunityFeed);
              }
              if (s.showCommunityFilter !== undefined) {
                setShowCommunityFilter(s.showCommunityFilter);
                localStorage.setItem('app_show_community_filter', s.showCommunityFilter.toString());
              }
              if (s.visibleMarkets) {
                setVisibleMarkets(s.visibleMarkets);
                localStorage.setItem('app_visible_markets', s.visibleMarkets);
              }
              if (s.sessions) {
                setSessions(s.sessions);
                localStorage.setItem('app_sessions', JSON.stringify(s.sessions));
              }
            }
          }
        }
      } catch (error) {
        console.error("Error loading profile or settings:", error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadProfile();

    const unsubscribes: (() => void)[] = [];
    let isMigratingObjectives = false;

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

    // Objectives with smart one-time migration and real-time syncing
    const qDbObjectives = query(collection(db, 'objectives'), where('userId', '==', auth.currentUser.uid));
    const unsubObjectives = onSnapshot(qDbObjectives, (snapshot) => {
      const dbObjectives = snapshot.docs.map(doc => ({
        id: doc.id,
        type: doc.data().type,
        targetId: doc.data().targetId,
        profitTarget: doc.data().profitTarget,
        maxLoss: doc.data().maxLoss,
        dailyLoss: doc.data().dailyLoss,
        maxLossPeriod: doc.data().maxLossPeriod || 'Mês',
        hidden: !!doc.data().hidden
      }));
      
      const alreadySynced = localStorage.getItem('app_objectives_synced') === 'true';
      
      if (dbObjectives.length > 0) {
        setObjectives(dbObjectives);
        localStorage.setItem('app_objectives', JSON.stringify(dbObjectives));
        localStorage.setItem('app_objectives_synced', 'true');
      } else {
        const savedObjectives = localStorage.getItem('app_objectives');
        if (savedObjectives) {
          const parsed = JSON.parse(savedObjectives);
          if (parsed.length > 0) {
            // Keep local objectives in state so they do not disappear
            setObjectives(parsed);
            
            // If the server lacks documents but we have local objectives, self-heal by syncing up to Firestore
            if (!isMigratingObjectives) {
              isMigratingObjectives = true;
              const promises = parsed.map((obj: any) => {
                return addDoc(collection(db, 'objectives'), {
                  userId: auth.currentUser?.uid,
                  type: obj.type,
                  targetId: obj.targetId,
                  profitTarget: obj.profitTarget,
                  maxLoss: obj.maxLoss,
                  dailyLoss: obj.dailyLoss,
                  maxLossPeriod: obj.maxLossPeriod || 'Mês',
                  hidden: !!obj.hidden
                });
              });
              Promise.all(promises).then(() => {
                localStorage.setItem('app_objectives_synced', 'true');
                isMigratingObjectives = false;
              }).catch(err => {
                console.error("Migration/Self-heal error in Settings:", err);
                isMigratingObjectives = false;
              });
            }
          } else {
            setObjectives([]);
          }
        } else {
          setObjectives([]);
        }
      }
    });
    unsubscribes.push(unsubObjectives);

    const accountsByPath: Record<string, any[]> = { old: [], new: [] };
    const updateAccounts = (data: any[], path: 'old' | 'new') => {
      accountsByPath[path] = data;
      const combined = [...accountsByPath.new, ...accountsByPath.old];
      const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
      setAccounts(unique);
    };

    return () => unsubscribes.forEach(unsub => unsub());
  }, []);

  // Self-heal and auto-restore objective for 10k account if missing
  useEffect(() => {
    if (!auth.currentUser || accounts.length === 0 || objectives.length === 0) return;
    
    // Find any account where initialBalance is 10000 (10k)
    const account10k = accounts.find(acc => Number(acc.initialBalance) === 10000);
    if (account10k) {
      // Check if there is an objective for this account
      const hasObj = objectives.some(obj => obj.type === 'account' && obj.targetId === account10k.id);
      if (!hasObj) {
        console.log("Restoring missing objective for 10k account:", account10k.id);
        const restoredObj: Objective = {
          id: Date.now().toString(),
          type: 'account',
          targetId: account10k.id,
          profitTarget: '1000',
          maxLoss: '1000',
          dailyLoss: '500',
          maxLossPeriod: 'Mês',
          hidden: false
        };
        // Save to Firestore and local state to prevent disappearance
        addDoc(collection(db, 'objectives'), {
          userId: auth.currentUser?.uid,
          type: restoredObj.type,
          targetId: restoredObj.targetId,
          profitTarget: restoredObj.profitTarget,
          maxLoss: restoredObj.maxLoss,
          dailyLoss: restoredObj.dailyLoss,
          maxLossPeriod: restoredObj.maxLossPeriod || 'Mês',
          hidden: false
        })
          .then((docRef) => {
            const localRestored = { ...restoredObj, id: docRef.id };
            setObjectives(prev => {
              if (prev.some(o => o.targetId === account10k.id)) return prev;
              const next = [...prev, localRestored];
              localStorage.setItem('app_objectives', JSON.stringify(next));
              return next;
            });
          })
          .catch(err => console.error("Error auto-restoring 10k objective in Settings:", err));
      }
    }
  }, [accounts, objectives]);

  // Auto-save settings when changes occur (only after initial profile and settings load is complete)
  useEffect(() => {
    if (!isLoaded || !auth.currentUser) return;

    // Immediately save to localStorage for snappy local reactivity
    localStorage.setItem('app_date_format', dateFormat);
    localStorage.setItem('app_session_type', sessionType);
    localStorage.setItem('app_default_trade_type', defaultTradeType);
    localStorage.setItem('app_default_community_feed', defaultCommunityFeed);
    localStorage.setItem('app_show_community_filter', showCommunityFilter.toString());
    localStorage.setItem('app_visible_markets', visibleMarkets);
    localStorage.setItem('app_sessions', JSON.stringify(sessions));

    // Debounce backing up to Firestore (1 second delay is perfect for typing time inputs)
    const delayDebounceFn = setTimeout(async () => {
      try {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        
        await updateDoc(doc(db, 'usuarios', uid), {
          settings: {
            dateFormat,
            sessionType,
            defaultTradeType,
            defaultCommunityFeed,
            showCommunityFilter,
            visibleMarkets,
            sessions
          }
        });
        console.log("Configurações salvas automaticamente no Firestore!");
      } catch (err) {
        console.error("Erro ao auto-salvar configurações no Firestore:", err);
      }
    }, 1000);

    return () => clearTimeout(delayDebounceFn);
  }, [dateFormat, sessionType, defaultTradeType, defaultCommunityFeed, showCommunityFilter, visibleMarkets, sessions, isLoaded]);


  const handleSessionChange = (id: string, field: 'start' | 'end', value: string) => {
    setSessions(sessions.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleSubdivisionChange = (sessionId: string, subKey: string, field: 'start' | 'end', value: string) => {
    setSessions(sessions.map(s => {
      if (s.id !== sessionId) return s;
      const sub = s.subdivisions || {
        pre: { start: '20:00', end: '21:00', label: 'Pré-Mercado' },
        intra: { start: '21:00', end: '02:00', label: 'Intra Mercado' },
        noop: { start: '02:00', end: '03:00', label: 'Zona Não Operável' },
        close: { start: '03:00', end: '04:00', label: 'Fechamento' },
      };
      return {
        ...s,
        subdivisions: {
          ...sub,
          [subKey]: {
            ...sub[subKey],
            [field]: value
          }
        }
      };
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    localStorage.setItem('app_date_format', dateFormat);
    localStorage.setItem('app_session_type', sessionType);
    localStorage.setItem('app_default_trade_type', defaultTradeType);
    localStorage.setItem('app_default_community_feed', defaultCommunityFeed);
    localStorage.setItem('app_show_community_filter', showCommunityFilter.toString());
    localStorage.setItem('app_visible_markets', visibleMarkets);
    localStorage.setItem('app_objectives', JSON.stringify(objectives));
    localStorage.setItem('app_sessions', JSON.stringify(sessions));

    // Save objectives to Firestore to guarantee zero-drift and cloud sync across custom domains
    if (auth.currentUser && objectives.length > 0) {
      try {
        const qObj = query(collection(db, 'objectives'), where('userId', '==', auth.currentUser.uid));
        const snapObj = await getDocs(qObj);
        
        // Delete current ones to avoid duplication
        const deletePromises = snapObj.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);
        
        // Save fresh copies with standard attributes
        const addPromises = objectives.map(obj => 
          addDoc(collection(db, 'objectives'), {
            userId: auth.currentUser?.uid,
            type: obj.type,
            targetId: obj.targetId,
            profitTarget: obj.profitTarget,
            maxLoss: obj.maxLoss,
            dailyLoss: obj.dailyLoss,
            maxLossPeriod: obj.maxLossPeriod || 'Mês',
            hidden: !!obj.hidden
          })
        );
        await Promise.all(addPromises);
      } catch (err) {
        console.error("Error saving objectives batch to Firestore during settings save:", err);
      }
    }

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

        // Save Partner settings in usuarios doc
        await updateDoc(doc(db, 'usuarios', auth.currentUser.uid), {
          partnerEmail: partnerEmail.trim(),
          partnerPassword: partnerPassword.trim()
        });

        if (partnerEmail.trim() && partnerPassword.trim()) {
          await registerPartnerAuth(partnerEmail.trim(), partnerPassword.trim());
        }
      } catch (error) {
        console.error("Error saving profile or partner settings:", error);
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

  const [selectedDateToDelete, setSelectedDateToDelete] = useState(new Date().toISOString().split('T')[0]);

  const handleUndoLastImport = () => {
    const lastBatchId = localStorage.getItem('app_last_import_batch_id');
    if (!lastBatchId) {
      setModalConfig({
        isOpen: true,
        title: "Nenhuma Importação encontrada",
        message: "Não foram encontradas informações sobre a última importação neste navegador.",
        confirmText: "OK",
        onConfirm: closeModal
      });
      return;
    }

    setModalConfig({
      isOpen: true,
      title: "Reverter Última Importação",
      message: "Deseja apagar permanentemente todos os trades inseridos na última importação?",
      confirmText: "Sim, Reverter",
      isError: true,
      onCancel: closeModal,
      onConfirm: async () => {
        if (!auth.currentUser) return;
        setIsSaving(true);
        try {
          const uid = auth.currentUser.uid;
          const tradesRef = collection(db, 'usuarios', uid, 'trades');
          const q = query(tradesRef, where('importId', '==', lastBatchId));
          const snap = await getDocs(q);
          
          if (snap.empty) {
            setModalConfig({
              isOpen: true,
              title: "Aviso",
              message: "Nenhum trade encontrado para este ID de importação. Pode ser que já tenham sido apagados.",
              confirmText: "OK",
              onConfirm: closeModal
            });
            return;
          }

          const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
          await Promise.all(deletePromises);
          
          localStorage.removeItem('app_last_import_batch_id');
          
          setModalConfig({
            isOpen: true,
            title: "Sucesso",
            message: `${snap.size} trades foram removidos.`,
            confirmText: "OK",
            onConfirm: () => {
               closeModal();
               window.location.reload();
            }
          });
        } catch (error) {
          console.error(error);
          alert('Erro ao reverter importação.');
        } finally {
          setIsSaving(false);
        }
      }
    });
  };

  const handleDeleteByDate = () => {
    setModalConfig({
      isOpen: true,
      title: "Limpar por Data",
      message: `Tem certeza que deseja apagar TODOS os trades realizados no dia ${selectedDateToDelete.split('-').reverse().join('/')}?`,
      confirmText: "Sim, Apagar Dia",
      isError: true,
      onCancel: closeModal,
      onConfirm: async () => {
        if (!auth.currentUser) return;
        setIsSaving(true);
        try {
          const uid = auth.currentUser.uid;
          const tradesRef = collection(db, 'usuarios', uid, 'trades');
          const q = query(tradesRef, where('date', '==', selectedDateToDelete));
          const snap = await getDocs(q);
          
          if (snap.empty) {
            setModalConfig({
              isOpen: true,
              title: "Nenhum Trade",
              message: "Não foram encontrados trades para a data selecionada.",
              confirmText: "OK",
              onConfirm: closeModal
            });
            return;
          }

          const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
          await Promise.all(deletePromises);
          
          setModalConfig({
            isOpen: true,
            title: "Limpeza Concluída",
            message: `${snap.size} trades foram apagados do dia selecionado.`,
            confirmText: "OK",
            onConfirm: () => {
               closeModal();
               window.location.reload();
            }
          });
        } catch (error) {
          console.error(error);
          alert('Erro ao limpar trades.');
        } finally {
          setIsSaving(false);
        }
      }
    });
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
        setIsSaving(true);
        try {
          const uid = auth.currentUser.uid;
          
          // 1. Delete all trades (both paths)
          const tradesPromises: Promise<any>[] = [];
          
          // Root path
          const qRootTrades = query(collection(db, 'trades'), where('userId', '==', uid));
          const snapshotRootTrades = await getDocs(qRootTrades);
          snapshotRootTrades.forEach(d => tradesPromises.push(deleteDoc(doc(db, 'trades', d.id))));
          
          // Subcollection path
          const qSubTrades = collection(db, 'usuarios', uid, 'trades');
          const snapshotSubTrades = await getDocs(qSubTrades);
          snapshotSubTrades.forEach(d => tradesPromises.push(deleteDoc(doc(db, 'usuarios', uid, 'trades', d.id))));
          
          await Promise.all(tradesPromises);

          // 2. Delete all withdrawals
          const withdrawalsPromises: Promise<any>[] = [];
          const qWith = query(collection(db, 'withdrawals'), where('userId', '==', uid));
          const snapWith = await getDocs(qWith);
          snapWith.forEach(d => withdrawalsPromises.push(deleteDoc(doc(db, 'withdrawals', d.id))));
          await Promise.all(withdrawalsPromises);

          // 3. Delete all psychology notes
          const psyPromises: Promise<any>[] = [];
          const qPsy = query(collection(db, 'psychology_notes'), where('userId', '==', uid));
          const snapPsy = await getDocs(qPsy);
          snapPsy.forEach(d => psyPromises.push(deleteDoc(doc(db, 'psychology_notes', d.id))));
          await Promise.all(psyPromises);

          // 4. Delete all planning entries
          const planPromises: Promise<any>[] = [];
          const qPlan = query(collection(db, 'planning'), where('userId', '==', uid));
          const snapPlan = await getDocs(qPlan);
          snapPlan.forEach(d => planPromises.push(deleteDoc(doc(db, 'planning', d.id))));
          await Promise.all(planPromises);

          // 4.5. Delete all objectives from Firestore
          const objectivesPromises: Promise<any>[] = [];
          const qObj = query(collection(db, 'objectives'), where('userId', '==', uid));
          const snapObj = await getDocs(qObj);
          snapObj.forEach(d => objectivesPromises.push(deleteDoc(doc(db, 'objectives', d.id))));
          await Promise.all(objectivesPromises);

          // 5. Delete all accounts (both paths)
          const accountsPromises: Promise<any>[] = [];
          
          // Root path
          const qRootAcc = query(collection(db, 'accounts'), where('userId', '==', uid));
          const snapshotRootAcc = await getDocs(qRootAcc);
          snapshotRootAcc.forEach(d => accountsPromises.push(deleteDoc(doc(db, 'accounts', d.id))));
          
          // Subcollection path
          const qSubAcc = collection(db, 'usuarios', uid, 'accounts');
          const snapshotSubAcc = await getDocs(qSubAcc);
          snapshotSubAcc.forEach(d => accountsPromises.push(deleteDoc(doc(db, 'usuarios', uid, 'accounts', d.id))));
          
          await Promise.all(accountsPromises);

          // Clear local storage
          localStorage.removeItem('app_date_format');
          localStorage.removeItem('app_session_type');
          localStorage.removeItem('app_default_trade_type');
          localStorage.removeItem('app_force_show_ob_filter');
          localStorage.removeItem('app_objectives');
          localStorage.removeItem('app_objectives_synced');
          localStorage.removeItem('app_sessions');
          localStorage.removeItem('app_currency');

          // Reset local state
          setDateFormat('DD/MM/YYYY');
          setSessionType('subdivided');
          setDefaultTradeType('ask');
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
            message: "Erro ao reiniciar o sistema. Verifique sua conexão.",
            isError: true,
            onConfirm: closeModal
          });
        } finally {
          setIsSaving(false);
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
        setIsSaving(true);
        try {
          const uid = auth.currentUser.uid;
          const deletePromises: Promise<any>[] = [];
          
          // Root path
          const qRoot = query(collection(db, 'trades'), where('userId', '==', uid));
          const snapshotRoot = await getDocs(qRoot);
          snapshotRoot.forEach(d => deletePromises.push(deleteDoc(doc(db, 'trades', d.id))));
          
          // Subcollection path
          const qSub = collection(db, 'usuarios', uid, 'trades');
          const snapshotSub = await getDocs(qSub);
          snapshotSub.forEach(d => deletePromises.push(deleteDoc(doc(db, 'usuarios', uid, 'trades', d.id))));
          
          await Promise.all(deletePromises);
          
          setModalConfig({
            isOpen: true,
            title: "Sistema Limpo",
            message: "Todos os seus trades foram eliminados definitivamente do banco de dados (Cloud Firestore).",
            confirmText: "Entendido",
            onConfirm: () => {
              closeModal();
              window.location.reload();
            }
          });
        } catch (error) {
          console.error("Error deleting trades:", error);
          setModalConfig({
            isOpen: true,
            title: "Erro",
            message: "Erro ao zerar trades. Verifique sua conexão.",
            isError: true,
            onConfirm: closeModal
          });
        } finally {
          setIsSaving(false);
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
        setIsSaving(true);
        try {
          const uid = auth.currentUser.uid;
          const deletePromises: Promise<any>[] = [];
          
          // Root path
          const qRoot = query(collection(db, 'accounts'), where('userId', '==', uid));
          const snapshotRoot = await getDocs(qRoot);
          snapshotRoot.forEach(d => deletePromises.push(deleteDoc(doc(db, 'accounts', d.id))));
          
          // Subcollection path
          const qSub = collection(db, 'usuarios', uid, 'accounts');
          const snapshotSub = await getDocs(qSub);
          snapshotSub.forEach(d => deletePromises.push(deleteDoc(doc(db, 'usuarios', uid, 'accounts', d.id))));
          
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
            message: "Erro ao zerar contas. Verifique sua conexão.",
            isError: true,
            onConfirm: closeModal
          });
        } finally {
          setIsSaving(false);
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
        setIsSaving(true);
        try {
          const uid = auth.currentUser.uid;
          const deletePromises: Promise<any>[] = [];
          
          // Root path
          const qRoot = query(collection(db, 'trades'), where('userId', '==', uid), where('accountId', '==', accountId));
          const snapshotRoot = await getDocs(qRoot);
          snapshotRoot.forEach(d => deletePromises.push(deleteDoc(doc(db, 'trades', d.id))));
          
          // Subcollection path
          const qSub = query(collection(db, 'usuarios', uid, 'trades'), where('accountId', '==', accountId));
          const snapshotSub = await getDocs(qSub);
          snapshotSub.forEach(d => deletePromises.push(deleteDoc(doc(db, 'usuarios', uid, 'trades', d.id))));
          
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
            message: "Erro ao zerar trades da conta. Verifique sua conexão.",
            isError: true,
            onConfirm: closeModal
          });
        } finally {
          setIsSaving(false);
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
          const uid = auth.currentUser?.uid;
          if (!uid) return;
          
          // Try both paths for deletion
          try {
            await deleteDoc(doc(db, 'accounts', accountId));
          } catch (e) {
            console.warn("Could not delete from root accounts, trying subcollection...");
          }
          
          try {
            await deleteDoc(doc(db, 'usuarios', uid, 'accounts', accountId));
          } catch (e) {
            console.warn("Could not delete from subcollection accounts.");
          }

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
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-on-surface font-bold text-2xl font-headline mb-2">Configurações</h2>
          <span className="text-xs bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20 px-2.5 py-1 rounded-full flex items-center gap-1.5 select-none mb-2 font-semibold">
            <span className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse"></span>
            Salvamento Automático Ativo (Auto-save)
          </span>
        </div>
        <p className="text-on-surface-variant text-sm">Personalize suas preferências regionais e horários de operação. As suas alterações são salvas automaticamente em tempo real.</p>
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
                      <div className="flex gap-2">
                        <div className="relative shrink-0 text-white">
                          <select 
                            value={billingDialCode}
                            onChange={(e) => handleBillingDialChange(e.target.value)}
                            className="bg-surface-container border border-outline-variant/20 rounded-lg px-3 py-3 text-sm font-black text-on-surface outline-none focus:border-primary transition-colors appearance-none pr-8 cursor-pointer h-full"
                          >
                            {COUNTRIES.map(c => (
                              <option key={c.code} value={c.dialCode}>{c.flag} {c.label}</option>
                            ))}
                          </select>
                          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[8px]">▼</div>
                        </div>

                        <input 
                          type="text"
                          value={billingPhoneLocal}
                          onChange={(e) => handleBillingPhoneLocalChange(e.target.value)}
                          placeholder="Ex: 923 000 000"
                          className="flex-1 bg-surface-container border border-outline-variant/20 text-on-surface px-4 py-3 rounded-lg text-sm outline-none focus:border-primary transition-colors font-mono"
                        />
                      </div>
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
                        <label className="text-on-surface-variant text-xs font-bold uppercase tracking-wider mb-2">Visibilidade de Mercados</label>
                        <div className="relative">
                          <select 
                            value={visibleMarkets}
                            onChange={(e) => setVisibleMarkets(e.target.value as 'all' | 'forex' | 'ob')}
                            className="w-full bg-surface-container border border-outline-variant/20 text-on-surface px-4 py-3 rounded-lg text-sm outline-none appearance-none cursor-pointer focus:border-primary transition-colors"
                          >
                            <option value="all">Mostrar Tudo (Forex + OB)</option>
                            <option value="forex">Apenas Forex / Índices</option>
                            <option value="ob">Apenas Opções Binárias</option>
                          </select>
                          <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">expand_more</span>
                        </div>
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
                            <div key={obj.id} className={`bg-surface-container border border-outline-variant/20 rounded-xl p-4 relative group transition-all ${obj.hidden ? 'opacity-60 border-dashed saturate-50' : ''}`}>
                              <div className="absolute top-4 right-4 flex gap-2">
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                  <button 
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      const updatedHidden = !obj.hidden;
                                      const newObjectives = objectives.map(o => o.id === obj.id ? { ...o, hidden: updatedHidden } : o);
                                      setObjectives(newObjectives);
                                      localStorage.setItem('app_objectives', JSON.stringify(newObjectives));
                                      if (auth.currentUser) {
                                        try {
                                          await updateDoc(doc(db, 'objectives', obj.id), { hidden: updatedHidden });
                                        } catch (err) {
                                          console.error("Error updating hidden state:", err);
                                        }
                                      }
                                    }}
                                    className={`transition-colors ${obj.hidden ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}
                                    title={obj.hidden ? "Mostrar no Dashboard" : "Ocultar no Dashboard"}
                                  >
                                    <span className="material-symbols-outlined text-sm">
                                      {obj.hidden ? 'visibility_off' : 'visibility'}
                                    </span>
                                  </button>
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
                                    onClick={async () => {
                                      const newObjectives = objectives.filter(o => o.id !== obj.id);
                                      setObjectives(newObjectives);
                                      localStorage.setItem('app_objectives', JSON.stringify(newObjectives));
                                      if (auth.currentUser) {
                                        try {
                                          await deleteDoc(doc(db, 'objectives', obj.id));
                                        } catch (err) {
                                          console.error("Error deleting objective from db:", err);
                                        }
                                      }
                                    }}
                                    className="text-on-surface-variant hover:text-error transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                  </button>
                                </div>
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
                    
                    <div className="space-y-4">
                      {sessions.map(session => {
                        const subs = session.subdivisions || {
                          pre: { start: '20:00', end: '21:00', label: 'Pré-Mercado' },
                          intra: { start: '21:00', end: '02:00', label: 'Intra Mercado' },
                          noop: { start: '02:00', end: '03:00', label: 'Zona Não Operável' },
                          close: { start: '03:00', end: '04:00', label: 'Fechamento' },
                        };

                        return (
                          <div key={session.id} className="p-4 bg-surface-container border border-outline-variant/10 rounded-xl space-y-4">
                            <div className="flex justify-between items-center pb-2 border-b border-outline-variant/5">
                              <p className="text-on-surface font-black text-sm uppercase tracking-wide text-primary">{session.name}</p>
                              <span className="text-[10px] bg-secondary/15 text-secondary px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                {sessionType === 'simple' ? 'Sessão Simples' : 'Sessão Subdividida'}
                              </span>
                            </div>
                            
                            {sessionType === 'simple' ? (
                              <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3 pt-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-on-surface-variant text-xs font-semibold">Início:</span>
                                  <input 
                                    type="time" 
                                    value={session.start}
                                    onChange={(e) => handleSessionChange(session.id, 'start', e.target.value)}
                                    className="bg-surface-container-highest border border-outline-variant/20 text-on-surface px-3 py-1.5 rounded-lg text-sm outline-none focus:border-primary transition-colors"
                                    style={{ colorScheme: 'dark' }}
                                  />
                                </div>
                                <span className="text-on-surface-variant hidden sm:inline">-</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-on-surface-variant text-xs font-semibold">Fim:</span>
                                  <input 
                                    type="time" 
                                    value={session.end}
                                    onChange={(e) => handleSessionChange(session.id, 'end', e.target.value)}
                                    className="bg-surface-container-highest border border-outline-variant/20 text-on-surface px-3 py-1.5 rounded-lg text-sm outline-none focus:border-primary transition-colors"
                                    style={{ colorScheme: 'dark' }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                {Object.entries(subs).map(([subKey, sub]: [string, any]) => (
                                  <div key={subKey} className="bg-surface-container-highest/60 border border-outline-variant/10 rounded-lg p-3">
                                    <p className="text-on-surface font-semibold text-xs mb-2.5 text-secondary">{sub.label}</p>
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 flex items-center gap-1.5">
                                        <span className="text-on-surface-variant text-[10px] font-medium">Início:</span>
                                        <input 
                                          type="time" 
                                          value={sub.start}
                                          onChange={(e) => handleSubdivisionChange(session.id, subKey, 'start', e.target.value)}
                                          className="w-full bg-surface-container border border-outline-variant/20 text-on-surface px-2 py-1 rounded text-xs outline-none focus:border-primary transition-colors"
                                          style={{ colorScheme: 'dark' }}
                                        />
                                      </div>
                                      <span className="text-on-surface-variant text-xs">-</span>
                                      <div className="flex-1 flex items-center gap-1.5">
                                        <span className="text-on-surface-variant text-[10px] font-medium">Fim:</span>
                                        <input 
                                          type="time" 
                                          value={sub.end}
                                          onChange={(e) => handleSubdivisionChange(session.id, subKey, 'end', e.target.value)}
                                          className="w-full bg-surface-container border border-outline-variant/20 text-on-surface px-2 py-1 rounded text-xs outline-none focus:border-primary transition-colors"
                                          style={{ colorScheme: 'dark' }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
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
                  {/* Gestão Específica */}
                  <div className="bg-surface-container rounded-2xl p-6 border border-outline-variant/10 mt-6 mb-8">
                    <h4 className="text-on-surface font-bold mb-4 flex items-center gap-2">
                      <Zap size={18} className="text-primary" />
                      Gestão de Histórico e Importações
                    </h4>
                    <p className="text-xs text-on-surface-variant mb-6">Limpeza cirúrgica de dados sem afetar o resto da conta.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/5">
                        <p className="text-sm font-bold text-on-surface mb-1">Reverter Última Importação</p>
                        <p className="text-[10px] text-on-surface-variant mb-4 lowercase">Apaga apenas os trades carregados no último arquivo importado.</p>
                        <button 
                          onClick={handleUndoLastImport}
                          className="w-fit bg-error/10 text-error px-4 py-2 rounded-lg text-xs font-bold hover:bg-error/20 transition-all flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-sm">undo</span>
                          Desfazer Importação
                        </button>
                      </div>

                      <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/5">
                        <p className="text-sm font-bold text-on-surface mb-3">Limpar trades de um Dia Específico</p>
                        <div className="flex gap-2">
                          <input 
                            type="date" 
                            value={selectedDateToDelete}
                            onChange={(e) => setSelectedDateToDelete(e.target.value)}
                            className="bg-surface-container-highest border-none text-on-surface px-3 py-2 rounded-lg text-xs outline-none focus:ring-1 focus:ring-primary/30"
                          />
                          <button 
                            onClick={handleDeleteByDate}
                            className="bg-error text-white px-4 py-2 rounded-lg text-xs font-bold hover:brightness-110 transition-all shadow-sm"
                          >
                            Eliminar Dia
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4 pt-0">
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
                onClick={async () => {
                  let newObjectives;
                  const isEditing = !!editingObjective.id;
                  
                  if (isEditing) {
                    if (auth.currentUser) {
                      try {
                        await updateDoc(doc(db, 'objectives', editingObjective.id), {
                          type: editingObjective.type,
                          targetId: editingObjective.targetId,
                          profitTarget: editingObjective.profitTarget,
                          maxLoss: editingObjective.maxLoss,
                          dailyLoss: editingObjective.dailyLoss,
                          maxLossPeriod: editingObjective.maxLossPeriod || 'Mês',
                          hidden: !!editingObjective.hidden
                        });
                      } catch (err) {
                        console.error("Error updating objective:", err);
                      }
                    }
                    newObjectives = objectives.map(o => o.id === editingObjective.id ? { ...editingObjective, hidden: !!editingObjective.hidden } : o);
                  } else {
                    let docId = Date.now().toString();
                    if (auth.currentUser) {
                      try {
                        const newDocRef = await addDoc(collection(db, 'objectives'), {
                          userId: auth.currentUser?.uid,
                          type: editingObjective.type,
                          targetId: editingObjective.targetId,
                          profitTarget: editingObjective.profitTarget,
                          maxLoss: editingObjective.maxLoss,
                          dailyLoss: editingObjective.dailyLoss,
                          maxLossPeriod: editingObjective.maxLossPeriod || 'Mês',
                          hidden: !!editingObjective.hidden
                        });
                        docId = newDocRef.id;
                      } catch (err) {
                        console.error("Error creating objective:", err);
                      }
                    }
                    newObjectives = [...objectives, { ...editingObjective, id: docId, hidden: !!editingObjective.hidden }];
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
