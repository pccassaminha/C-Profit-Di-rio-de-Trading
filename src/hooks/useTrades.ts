import { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, query, where, orderBy, doc, getDoc } from 'firebase/firestore';

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

  // 1. Buscar plano e configurações em tempo real
  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }
    
    const uid = auth.currentUser.uid;
    const defaultPlan = { 
      plan_type: 'Iniciante', 
      account_limit: 2,
      role: auth.currentUser?.email === 'exportacoes.extras@gmail.com' ? 'admin' : 'user'
    };
    
    const defaultSettings = {
      whatsappNumber: '244921319200',
      iban: 'AO06 0000 0000 0000 0000 0',
      multicaixaEntity: '12345',
      multicaixaReference: '000 000 000',
      showIban: true,
      showMulticaixa: true,
      multicaixaLogoUrl: 'https://i.ibb.co/vz6W1fN/mcx-logo.png'
    };

    // Subscrição em tempo real aos dados do utilizador ('usuarios')
    const unsubUser = onSnapshot(doc(db, 'usuarios', uid), (userDoc) => {
      if (userDoc.exists()) {
        const data = userDoc.data();
        let limit = data.account_limit || 2;
        if (data.plan_type === 'mensal_6' || data.plan_type === 'mensal_2') limit = 12; // 6 OB + 6 Forex
        if (data.plan_type === 'trimestral_6') limit = 12; // 6 OB + 6 Forex
        if (data.plan_type === 'semestral_8' || data.plan_type === 'semestral_6') limit = 16; // 8 OB + 8 Forex
        if (data.plan_type === 'anual_16') limit = 32; // 16 OB + 16 Forex
        if (data.plan_type === 'ilimitado' || data.plan_type === 'Unlimited Elite' || data.role === 'admin') limit = 999; 

        setUserPlan({
          plan_type: data.plan_type || 'Iniciante',
          account_limit: limit,
          expiry_date: data.expiry_date || null,
          role: data.role || (auth.currentUser?.email === 'exportacoes.extras@gmail.com' ? 'admin' : 'user')
        });
      } else {
        // Fallback para caminho antigo 'users'
        const unsubOldUser = onSnapshot(doc(db, 'users', uid), (oldUserDoc) => {
          if (oldUserDoc.exists()) {
            const data = oldUserDoc.data();
            let limit = data.account_limit || 2;
            if (data.plan_type === 'mensal_6' || data.plan_type === 'mensal_2') limit = 12;
            if (data.plan_type === 'trimestral_6') limit = 12;
            if (data.plan_type === 'semestral_8' || data.plan_type === 'semestral_6') limit = 16;
            if (data.plan_type === 'anual_16') limit = 32;
            if (data.plan_type === 'ilimitado' || data.plan_type === 'Unlimited Elite' || data.role === 'admin') limit = 999; 

            setUserPlan({
              plan_type: data.plan_type || 'Iniciante',
              account_limit: limit,
              expiry_date: data.expiry_date || null,
              role: data.role || (uid === 'exportacoes.extras@gmail.com' ? 'admin' : 'user')
            });
          } else {
            setUserPlan(defaultPlan);
          }
        });
        return unsubOldUser;
      }
    });

    // Subscrição em tempo real às configurações globais
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (settingsDoc) => {
      if (settingsDoc.exists()) {
        setGlobalSettings(settingsDoc.data());
      } else {
        setGlobalSettings(defaultSettings);
      }
    });

    return () => {
      unsubUser();
      unsubSettings();
    };
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

    // Escuta em dois caminhos para garantir compatibilidade (SaaS path vs Old path)
    const unsubscribes: (() => void)[] = [];

    // Novo caminho: usuarios/{uid}/trades
    const qNew = query(collection(db, "usuarios", auth.currentUser.uid, "trades"));
    const unsubNew = onSnapshot(qNew, (snapshot) => {
      const tradesNew = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        source: 'automatic'
      }));
      updateFirebaseTrades(tradesNew, 'new');
    }, (error) => {
      console.warn("onSnapshot qNew connection offline/unavailable:", error);
      setLoading(false);
    });
    unsubscribes.push(unsubNew);

    // Caminho antigo: trades/ (filtrado por userId)
    const qOld = query(collection(db, "trades"), where("userId", "==", auth.currentUser.uid));
    const unsubOld = onSnapshot(qOld, (snapshot) => {
      const tradesOld = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        source: 'automatic'
      }));
      updateFirebaseTrades(tradesOld, 'old');
    }, (error) => {
      console.warn("onSnapshot qOld connection offline/unavailable:", error);
      setLoading(false);
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
  }, []);

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
