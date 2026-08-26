import { db, auth } from '../firebase';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  doc,
  updateDoc,
  setDoc,
  getDoc
} from 'firebase/firestore';

export interface AppNotification {
  id?: string;
  targetUserId?: string; // specific user UID or 'all' or 'admin'
  title: string;
  body: string;
  type: 'admin_registration' | 'admin_payment' | 'affiliate_registered' | 'subscription_expiring' | 'community_post' | 'weekly_summary' | 'monthly_summary' | 'system_alert';
  actionTab?: string;
  data?: any;
  read?: boolean;
  createdAt?: any;
  icon?: string;
}

/**
 * Solicita permissão de Notificações Push ao navegador e registra preferência
 */
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted' && auth.currentUser) {
      // Salva no doc do usuário que as notificações push estão ativas
      try {
        await setDoc(doc(db, 'usuarios', auth.currentUser.uid), {
          pushNotificationsEnabled: true,
          pushNotificationUpdatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        console.warn('Erro ao atualizar permissão push no Firestore:', e);
      }
    }
    return permission;
  } catch (err) {
    console.error('Erro ao pedir permissão de push:', err);
    return 'denied';
  }
}

/**
 * Dispara uma notificação nativa do navegador (Web Push / Local Push)
 */
export function triggerNativeNotification(title: string, body: string, actionTab?: string, icon?: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    const defaultIcon = '/c-profit.png';
    
    // Tenta usar o Service Worker para mostrar a notificação (ideal no Android/Chrome)
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((registration) => {
        const options: any = {
          body,
          icon: icon || defaultIcon,
          badge: defaultIcon,
          data: { tab: actionTab, url: '/' },
          vibrate: [100, 50, 100],
          tag: `c-profit-${Date.now()}`
        };
        registration.showNotification(title, options);
      }).catch(() => {
        new Notification(title, {
          body,
          icon: icon || defaultIcon
        });
      });
    } else {
      try {
        const notif = new Notification(title, {
          body,
          icon: icon || defaultIcon
        });
        notif.onclick = () => {
          window.focus();
          if (actionTab) {
            window.dispatchEvent(new CustomEvent('navigateToTab', { detail: actionTab }));
          }
        };
      } catch (e) {
        console.warn('Fallback notificação direta falhou:', e);
      }
    }
  }
}

/**
 * Cria uma notificação no Firestore e dispara Push Nativo
 */
export async function createNotification(notif: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) {
  try {
    const notifData = {
      ...notif,
      read: false,
      createdAt: serverTimestamp(),
      createdDate: new Date().toISOString()
    };

    await addDoc(collection(db, 'notifications'), notifData);

    // Se o usuário atual for o destinatário ou se for notificação geral / admin relevante
    const currentUid = auth.currentUser?.uid;
    const isSuperAdmin = auth.currentUser?.email === 'exportacoes.extras@gmail.com' || auth.currentUser?.email === 'omilionario.extra@gmail.com';

    if (
      notif.targetUserId === 'all' || 
      notif.targetUserId === currentUid || 
      (notif.targetUserId === 'admin' && isSuperAdmin)
    ) {
      triggerNativeNotification(notif.title, notif.body, notif.actionTab, notif.icon);
    }
  } catch (err) {
    console.warn('Aviso ao registrar notificação no Firestore:', err);
  }
}

/**
 * NOTIFICAÇÃO: Novo Cadastro (Para o Administrador Master)
 */
export async function notifyMasterNewRegistration(userData: {
  name: string;
  email: string;
  planId?: string;
  phoneNumber?: string;
  refCode?: string;
}) {
  const title = '👤 Novo Trader Registado no C Profit!';
  const body = `O trader ${userData.name} (${userData.email}) acabou de criar conta. Plano pretendido: ${userData.planId || 'Iniciante'}.`;

  await createNotification({
    targetUserId: 'admin',
    title,
    body,
    type: 'admin_registration',
    actionTab: 'admin',
    data: userData
  });
}

/**
 * NOTIFICAÇÃO: Nova Solicitação de Pagamento/Assinatura (Para o Administrador Master)
 */
export async function notifyMasterPaymentRequest(paymentData: {
  userName: string;
  userEmail: string;
  planName: string;
  amount: number | string;
  paymentMethod: string;
  transactionCode?: string;
  expressCode?: string;
}) {
  const title = '💰 Nova Solicitação de Assinatura!';
  const methodLabel = paymentData.paymentMethod.toUpperCase();
  const body = `${paymentData.userName} solicitou upgrade para o plano ${paymentData.planName} via ${methodLabel}. Clique para validar e aprovar o comprovativo.`;

  await createNotification({
    targetUserId: 'admin',
    title,
    body,
    type: 'admin_payment',
    actionTab: 'payments',
    data: paymentData
  });
}

/**
 * NOTIFICAÇÃO: Inscrição via Código de Afiliado (Para o Trader que indicou)
 */
export async function notifyAffiliateRegistration(referrerUid: string, newTraderName: string) {
  if (!referrerUid) return;

  const title = '🎉 Novo Afiliado Registado!';
  const body = `Parabéns! O trader ${newTraderName} acabou de criar conta utilizando o seu link/código de afiliado.`;

  await createNotification({
    targetUserId: referrerUid,
    title,
    body,
    type: 'affiliate_registered',
    actionTab: 'affiliates_user',
    data: { newTraderName }
  });
}

/**
 * NOTIFICAÇÃO: Nova Publicação na Comunidade (Para todos os traders)
 */
export async function notifyCommunityNewPost(authorName: string, postLegend: string) {
  const truncatedLegend = postLegend.length > 90 ? postLegend.substring(0, 90) + '...' : postLegend;
  const title = `📢 Nova Análise de ${authorName}`;
  const body = `"${truncatedLegend}" - Toque para ver no feed da Comunidade C Profit.`;

  await createNotification({
    targetUserId: 'all',
    title,
    body,
    type: 'community_post',
    actionTab: 'community',
    data: { authorName, legend: postLegend }
  });
}

/**
 * NOTIFICAÇÃO: Alertas de Renovação de Assinatura Premium (15 dias, 5 dias, 2 dias e hoje)
 */
export function checkAndNotifySubscriptionExpiry(userPlan: any, uid: string) {
  if (!userPlan || !userPlan.expiry_date || userPlan.plan_type === 'Iniciante') return;

  try {
    const expiry = userPlan.expiry_date.toDate ? userPlan.expiry_date.toDate() : new Date(userPlan.expiry_date);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const notifiedKey = `notif_exp_${uid}_${expiry.toISOString().split('T')[0]}_${diffDays}d`;
    if (localStorage.getItem(notifiedKey)) return;

    let title = '';
    let body = '';

    if (diffDays === 15) {
      title = '📅 Lembrete de Assinatura (Faltam 15 Dias)';
      body = 'A sua assinatura C Profit Premium renova em 15 dias. Garanta a continuidade do seu diário profissional sem interrupções.';
    } else if (diffDays === 5) {
      title = '⏳ Aviso de Renovação (Faltam 5 Dias)';
      body = 'Faltam apenas 5 dias para o término do seu plano Premium. Efetue o pagamento antecipado para manter as suas até 16 contas ativas.';
    } else if (diffDays === 2) {
      title = '⚠️ Alerta Urgente: Faltam 2 Dias para o Vencimento';
      body = 'Atenção: A sua assinatura expira em 48 horas. Evite o bloqueio de recursos profissionais e a migração para a versão gratuita com anúncios.';
    } else if (diffDays <= 0 && diffDays >= -1) {
      title = '🚨 Sua Assinatura C Profit Vence Hoje!';
      body = 'O seu plano expira hoje. Realize a renovação agora para continuar a registar as suas operações com alta performance e sem anúncios.';
    }

    if (title && body) {
      localStorage.setItem(notifiedKey, 'true');
      triggerNativeNotification(title, body, 'plans');
      createNotification({
        targetUserId: uid,
        title,
        body,
        type: 'subscription_expiring',
        actionTab: 'plans',
        data: { daysRemaining: diffDays, expiryDate: expiry.toISOString() }
      });
    }
  } catch (err) {
    console.warn('Erro ao verificar expiração de assinatura:', err);
  }
}

/**
 * CÁLCULO & NOTIFICAÇÃO: Fechamento e Balanço Semanal (Finais de Semana)
 * - Par com maior ganho (Gain) e maior perda (Loss)
 * - Sessão mais positiva (Nova York, Londres, Ásia)
 * - Mensagem psicológica/motivação caso a semana tenha sido negativa
 */
export function calculateWeeklySummary(trades: any[]) {
  if (!trades || trades.length === 0) return null;

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const weeklyTrades = trades.filter(t => {
    const tradeDate = t.openTime?.toDate ? t.openTime.toDate() : new Date(t.date || t.createdAt || 0);
    return tradeDate >= oneWeekAgo && tradeDate <= now;
  });

  if (weeklyTrades.length === 0) {
    return {
      hasTrades: false,
      message: 'Nenhuma operação registada nos últimos 7 dias.'
    };
  }

  // Agrupar por Par/Ativo
  const pairPnlMap: Record<string, number> = {};
  // Agrupar por Sessão
  const sessionPnlMap: Record<string, number> = {
    'Nova York': 0,
    'Londres': 0,
    'Ásia': 0,
    'Outras': 0
  };

  let totalWeeklyPnl = 0;
  let wins = 0;
  let losses = 0;

  weeklyTrades.forEach(t => {
    const pnl = Number(t.pnl) || 0;
    const pair = (t.pair || t.asset || t.symbol || 'Outro').toUpperCase();
    totalWeeklyPnl += pnl;

    if (pnl > 0) wins++;
    else if (pnl < 0) losses++;

    pairPnlMap[pair] = (pairPnlMap[pair] || 0) + pnl;

    // Detectar sessão
    const s = (t.session || '').toLowerCase();
    if (s.includes('nova york') || s.includes('new york') || s.includes('ny')) {
      sessionPnlMap['Nova York'] += pnl;
    } else if (s.includes('londres') || s.includes('london')) {
      sessionPnlMap['Londres'] += pnl;
    } else if (s.includes('ásia') || s.includes('asia') || s.includes('tokyo')) {
      sessionPnlMap['Ásia'] += pnl;
    } else {
      sessionPnlMap['Outras'] += pnl;
    }
  });

  // Encontrar melhor e pior par
  let bestPair = '';
  let bestPairPnl = -Infinity;
  let worstPair = '';
  let worstPairPnl = Infinity;

  Object.entries(pairPnlMap).forEach(([pair, pnl]) => {
    if (pnl > bestPairPnl) {
      bestPairPnl = pnl;
      bestPair = pair;
    }
    if (pnl < worstPairPnl) {
      worstPairPnl = pnl;
      worstPair = pair;
    }
  });

  // Encontrar melhor sessão
  let bestSession = 'Nova York';
  let bestSessionPnl = -Infinity;
  Object.entries(sessionPnlMap).forEach(([session, pnl]) => {
    if (pnl > bestSessionPnl) {
      bestSessionPnl = pnl;
      bestSession = session;
    }
  });

  const isPositive = totalWeeklyPnl >= 0;
  const winRate = ((wins / (weeklyTrades.length || 1)) * 100).toFixed(1);

  // Mensagem motivacional personalizada se semana negativa
  let psychologicalAdvice = '';
  if (!isPositive) {
    const advices = [
      "Lembre-se: 'No trading, as perdas são apenas o custo operacional do negócio.' Mantenha a disciplina no seu risco por operação!",
      "Uma semana negativa não define a sua consistência. Revise o seu diário de trades, identifique o que fugiu do plano e volte focado na gestão.",
      "Proteja o seu capital mental neste fim de semana. Descanse, respire e prepare-se tecnicamente para a próxima semana.",
      "Foque no processo e na execução precisa, não no resultado imediato. O gerenciamento de risco rigoroso é o que constrói traders de elite."
    ];
    psychologicalAdvice = advices[Math.floor(Math.random() * advices.length)];
  }

  return {
    hasTrades: true,
    totalTrades: weeklyTrades.length,
    totalPnl: totalWeeklyPnl,
    isPositive,
    winRate: `${winRate}%`,
    wins,
    losses,
    bestPair: bestPairPnl > 0 ? `${bestPair} (+${bestPairPnl.toLocaleString('pt-BR')} Kz)` : 'Nenhum com lucro',
    worstPair: worstPairPnl < 0 ? `${worstPair} (${worstPairPnl.toLocaleString('pt-BR')} Kz)` : 'Nenhum com perda',
    bestSession,
    bestSessionPnl,
    psychologicalAdvice
  };
}

/**
 * CÁLCULO & NOTIFICAÇÃO: Fechamento Mensal de Faturamento & Metas
 * - Consolidado em todas as contas (Forex e Opções Binárias) e por conta individual
 * - Faturamento, Perdas, Total de Trades, Win Rate e Capital
 * - Comparativo de crescimento em relação ao mês anterior
 */
export function calculateMonthlySummary(trades: any[]) {
  if (!trades || trades.length === 0) return null;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
  const prevYear = prevMonthDate.getFullYear();
  const prevMonth = prevMonthDate.getMonth();

  const currentMonthTrades = trades.filter(t => {
    const d = t.openTime?.toDate ? t.openTime.toDate() : new Date(t.date || t.createdAt || 0);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });

  const prevMonthTrades = trades.filter(t => {
    const d = t.openTime?.toDate ? t.openTime.toDate() : new Date(t.date || t.createdAt || 0);
    return d.getFullYear() === prevYear && d.getMonth() === prevMonth;
  });

  // Métricas do Mês Atual
  let totalProfit = 0;
  let totalLoss = 0;
  let currentTotalPnl = 0;
  let currentWins = 0;

  const accountBreakdown: Record<string, { name: string, type: string, pnl: number, wins: number, total: number, capital: number }> = {};

  currentMonthTrades.forEach(t => {
    const pnl = Number(t.pnl) || 0;
    currentTotalPnl += pnl;

    if (pnl > 0) {
      totalProfit += pnl;
      currentWins++;
    } else if (pnl < 0) {
      totalLoss += Math.abs(pnl);
    }

    const accKey = String(t.account_login || t.accountId || 'Principal');
    const accType = t.marketType || t.type || 'Forex';
    const accName = t.accountName || `Conta ${accKey}`;

    if (!accountBreakdown[accKey]) {
      accountBreakdown[accKey] = {
        name: accName,
        type: accType,
        pnl: 0,
        wins: 0,
        total: 0,
        capital: Number(t.initialBalance || t.balance || 0)
      };
    }

    accountBreakdown[accKey].pnl += pnl;
    accountBreakdown[accKey].total += 1;
    if (pnl > 0) accountBreakdown[accKey].wins += 1;
  });

  // Métricas do Mês Anterior
  let prevTotalPnl = 0;
  prevMonthTrades.forEach(t => {
    prevTotalPnl += Number(t.pnl) || 0;
  });

  const currentWinRate = currentMonthTrades.length > 0 
    ? ((currentWins / currentMonthTrades.length) * 100).toFixed(1) 
    : '0.0';

  // Comparação de crescimento
  let growthPercentage = 0;
  let hasSurpassed = false;

  if (prevTotalPnl !== 0) {
    growthPercentage = Number((((currentTotalPnl - prevTotalPnl) / Math.abs(prevTotalPnl)) * 100).toFixed(1));
    hasSurpassed = currentTotalPnl > prevTotalPnl;
  } else if (currentTotalPnl > 0) {
    growthPercentage = 100;
    hasSurpassed = true;
  }

  return {
    monthName: now.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' }),
    totalTrades: currentMonthTrades.length,
    currentTotalPnl,
    totalProfit,
    totalLoss,
    winRate: `${currentWinRate}%`,
    prevMonthPnl: prevTotalPnl,
    growthPercentage,
    hasSurpassed,
    accounts: Object.values(accountBreakdown)
  };
}
