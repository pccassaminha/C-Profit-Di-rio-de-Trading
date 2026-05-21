import { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, query, where, orderBy, doc, getDoc, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreError';

/**
 * Hook para gerenciar os trades do C Profit
 * Une dados do Upload Manual com dados do Firebase
 * Suporta Multi-usuário (SaaS) com limites de plano e sincronização via Token.
 */
export const useTrades = (manualTrades: any[] = []) => {
  const [firebaseTrades, setFirebaseTrades] = useState<any[]>([]);
  const [userPlan, setUserPlan] = useState<{ plan_type: string, account_limit: number, expiry_date?: any, role?: string } | null>(null);
  const [globalSettings, setGlobalSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 1. Buscar plano e configurações
  useEffect(() => {
    if (!auth.currentUser) return;
    
    const fetchData = async () => {
      const uid = auth.currentUser?.uid || '';
      try {
        const isSuperAdminEmail = auth.currentUser?.email?.toLowerCase() === 'exportacoes.extras@gmail.com';

        // Tentar primeiro no novo caminho 'usuarios' (SaaS)
        let userDoc;
        try {
          userDoc = await getDoc(doc(db, 'usuarios', uid));
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `usuarios/${uid}`);
          return;
        }
        
        // Se não encontrar, tenta no antigo 'users'
        if (!userDoc.exists()) {
          try {
            userDoc = await getDoc(doc(db, 'users', uid));
          } catch (error) {
            handleFirestoreError(error, OperationType.GET, `users/${uid}`);
            return;
          }
        }

        if (isSuperAdminEmail) {
          // Auto-ensure the user doc is fully compliant and has 'admin' privileges to prevent any permission error
          const userDocRef = doc(db, 'usuarios', uid);
          const needsPush = !userDoc.exists() || 
                             userDoc.data()?.role !== 'admin' || 
                             userDoc.data()?.plan_type !== 'Unlimited Elite' || 
                             userDoc.data()?.account_limit !== 9999;
          
          if (needsPush) {
            const adminDocData = {
              nome: userDoc.exists() ? (userDoc.data()?.nome || 'Super Admin') : 'Super Admin',
              email: auth.currentUser!.email,
              role: 'admin',
              plan_type: 'Unlimited Elite',
              account_limit: 9999,
              createdAt: userDoc.exists() ? (userDoc.data()?.createdAt || new Date().toISOString()) : new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            try {
              await setDoc(userDocRef, adminDocData, { merge: true });
              // Sync to the alternative path for safety too
              try {
                await setDoc(doc(db, 'users', uid), adminDocData, { merge: true });
              } catch (e) {}
              // Re-fetch document to get latest state
              userDoc = await getDoc(userDocRef);
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, `usuarios/${uid}`);
              return;
            }
          }
        }

        if (userDoc.exists()) {
          const data = userDoc.data();
          let limit = data.account_limit || 2;
          if (data.plan_type === 'mensal_6' || data.plan_type === 'mensal_2') limit = 12; // 6 OB + 6 Forex
          if (data.plan_type === 'trimestral_6') limit = 12; // 6 OB + 6 Forex
          if (data.plan_type === 'semestral_8' || data.plan_type === 'semestral_6') limit = 16; // 8 OB + 8 Forex
          if (data.plan_type === 'anual_16') limit = 32; // 16 OB + 16 Forex
          if (data.plan_type === 'ilimitado' || data.role === 'admin') limit = 999; 

          setUserPlan({
            plan_type: data.plan_type || 'Iniciante',
            account_limit: limit,
            expiry_date: data.expiry_date || null,
            role: data.role || (auth.currentUser?.email === 'exportacoes.extras@gmail.com' ? 'admin' : 'user')
          });
        } else {
          setUserPlan({ 
            plan_type: 'Iniciante', 
            account_limit: 2,
            role: auth.currentUser?.email === 'exportacoes.extras@gmail.com' ? 'admin' : 'user'
          });
        }

        // Fetch Global Settings
        try {
          const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
          if (settingsDoc.exists()) {
            setGlobalSettings(settingsDoc.data());
          } else {
            // Default settings if none exist
            setGlobalSettings({
              whatsappNumber: '244921319200',
              iban: 'AO06 0000 0000 0000 0000 0',
              multicaixaEntity: '12345',
              multicaixaReference: '000 000 000',
              showIban: true,
              showMulticaixa: true,
              multicaixaLogoUrl: 'https://i.ibb.co/vz6W1fN/mcx-logo.png'
            });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, 'settings/global');
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    
    fetchData();
  }, [auth.currentUser]);

  const isSuperAdmin = useMemo(() => {
    const email = auth.currentUser?.email;
    return userPlan?.role === 'admin' || email === 'exportacoes.extras@gmail.com';
  }, [userPlan, auth.currentUser?.email]);

  const finalUserPlan = useMemo(() => {
    if (isSuperAdmin) {
      return {
        ...userPlan,
        plan_type: 'Unlimited Elite',
        account_limit: 9999,
        role: 'admin'
      };
    }
    return userPlan;
  }, [userPlan, isSuperAdmin]);

  // 2. Escuta o Firebase em tempo real (Sincronização Automática)
  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    const uid = auth.currentUser.uid;
    // Escuta em dois caminhos para garantir compatibilidade (SaaS path vs Old path)
    const unsubscribes: (() => void)[] = [];

    // Novo caminho: usuarios/{uid}/trades
    const qNew = query(collection(db, "usuarios", uid, "trades"));
    const unsubNew = onSnapshot(qNew, (snapshot) => {
      const tradesNew = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        source: 'automatic'
      }));
      updateFirebaseTrades(tradesNew, 'new');
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `usuarios/${uid}/trades`);
    });
    unsubscribes.push(unsubNew);

    // Caminho antigo: trades/ (filtrado por userId)
    const qOld = query(collection(db, "trades"), where("userId", "==", uid));
    const unsubOld = onSnapshot(qOld, (snapshot) => {
      const tradesOld = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        source: 'automatic'
      }));
      updateFirebaseTrades(tradesOld, 'old');
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'trades');
    });
    unsubscribes.push(unsubOld);

    const tradesByPath: Record<string, any[]> = { new: [], old: [] };

    const updateFirebaseTrades = (data: any[], path: 'new' | 'old') => {
      tradesByPath[path] = data;
      const combined = [...tradesByPath.new, ...tradesByPath.old];
      setFirebaseTrades(combined);
      setLoading(false);
    };

    return () => unsubscribes.forEach(unsub => unsub());
  }, [auth.currentUser]);

  // 3. Lógica de União, Deduplicação e Limites
  const { allTrades, uniqueAccounts, limitReached, isExpired } = useMemo(() => {
    const tradesMap = new Map();

    // Deduplicação por Ticket - Prioridade para 'automatic' (Firebase)
    // Primeiro trades do Firebase
    firebaseTrades.forEach(trade => {
      const key = trade.ticket || trade.id;
      tradesMap.set(String(key), trade);
    });

    // Depois manuais (só adiciona se não existir ticket)
    manualTrades.forEach(trade => {
      const key = trade.ticket || `manual-${trade.id || Math.random()}`;
      if (!tradesMap.has(String(key))) {
        tradesMap.set(String(key), { ...trade, source: 'manual' });
      }
    });

    const sortedTrades = Array.from(tradesMap.values()).sort((a, b) => {
      const timeA = a.openTime?.toDate ? a.openTime.toDate().getTime() : new Date(a.date || 0).getTime();
      const timeB = b.openTime?.toDate ? b.openTime.toDate().getTime() : new Date(b.date || 0).getTime();
      return timeB - timeA;
    });

    // Detectar logins de conta únicos para limites
    const accountLogins = new Set();
    sortedTrades.forEach(t => {
      if (t.account_login) accountLogins.add(String(t.account_login));
      else if (t.accountId) accountLogins.add(String(t.accountId)); // fallback
    });

    const limitReached = finalUserPlan ? accountLogins.size > finalUserPlan.account_limit : false;
    
    // Verificação de Expiração
    let isExpired = false;
    if (!isSuperAdmin) {
      if (!finalUserPlan || finalUserPlan.plan_type === 'Iniciante') {
        isExpired = true;
      } else if (finalUserPlan.expiry_date) {
        const now = new Date();
        const expiry = finalUserPlan.expiry_date.toDate ? finalUserPlan.expiry_date.toDate() : new Date(finalUserPlan.expiry_date);
        isExpired = now > expiry;
      }
    }

    return { 
      allTrades: sortedTrades, 
      uniqueAccounts: Array.from(accountLogins),
      limitReached,
      isExpired
    };
  }, [manualTrades, firebaseTrades, finalUserPlan, isSuperAdmin]);

  // 4. Cálculos Automáticos
  const stats = useMemo(() => {
    const tradesToCalc = limitReached ? [] : allTrades;
    const totalPnl = tradesToCalc.reduce((acc, t) => acc + (Number(t.pnl) || 0), 0);
    const completedTrades = tradesToCalc.length;
    const wins = tradesToCalc.filter(t => (Number(t.pnl) || 0) > 0).length;
    const winRate = (wins / (completedTrades || 1)) * 100;
    
    return {
      totalPnl,
      totalTrades: completedTrades,
      winRate: winRate.toFixed(1) + "%",
      wins,
      losses: completedTrades - wins
    };
  }, [allTrades, limitReached]);

  return { allTrades, stats, loading, uniqueAccounts, limitReached, userPlan: finalUserPlan, isExpired, globalSettings };
};
