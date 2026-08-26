import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bell, 
  X, 
  Check, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Award, 
  AlertCircle, 
  Send, 
  Sparkles, 
  DollarSign, 
  Users, 
  CreditCard, 
  Globe, 
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers
} from 'lucide-react';
import { auth, db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  doc, 
  updateDoc,
  getDocs
} from 'firebase/firestore';
import { 
  requestPushPermission, 
  triggerNativeNotification, 
  calculateWeeklySummary, 
  calculateMonthlySummary,
  AppNotification
} from '../services/notificationService';
import { useTrades } from '../hooks/useTrades';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (tab: string) => void;
}

export default function NotificationCenterModal({ isOpen, onClose, onNavigate }: NotificationCenterModalProps) {
  const [activeTab, setActiveTab] = useState<'notifications' | 'weekly' | 'monthly' | 'settings'>('notifications');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');
  const [isTestingPush, setIsTestingPush] = useState(false);

  const currentUser = auth.currentUser;
  const isSuperAdmin = currentUser?.email === 'exportacoes.extras@gmail.com' || currentUser?.email === 'omilionario.extra@gmail.com';
  const { allTrades, userPlan, stats } = useTrades();

  // Load push permission status
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionState(Notification.permission);
    }
  }, [isOpen]);

  // Subscribe to persistent notifications in Firestore
  useEffect(() => {
    if (!currentUser || !isOpen) return;

    const q = query(
      collection(db, 'notifications'),
      where('targetUserId', 'in', ['all', currentUser.uid, ...(isSuperAdmin ? ['admin'] : [])]),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as AppNotification[];
      setNotifications(list);
    }, (err) => {
      console.warn('Snapshot notificações aviso:', err);
    });

    return () => unsub();
  }, [currentUser, isOpen, isSuperAdmin]);

  // Calculations for Weekly Review
  const weeklyData = useMemo(() => {
    return calculateWeeklySummary(allTrades);
  }, [allTrades]);

  // Calculations for Monthly Billing Review
  const monthlyData = useMemo(() => {
    return calculateMonthlySummary(allTrades);
  }, [allTrades]);

  const handleRequestPush = async () => {
    const res = await requestPushPermission();
    setPermissionState(res);
    if (res === 'granted') {
      triggerNativeNotification(
        '🔔 Notificações C Profit Ativadas!',
        'Você receberá relatórios semanais, avisos de faturamento, novos afiliados e comunicados.',
        'dashboard'
      );
    }
  };

  const handleTestPush = () => {
    setIsTestingPush(true);
    triggerNativeNotification(
      '🚀 Teste de Notificação Push - C Profit',
      'As notificações no seu dispositivo estão configuradas e a funcionar perfeitamente!',
      'dashboard'
    );
    setTimeout(() => setIsTestingPush(false), 2000);
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    if (notif.id) {
      try {
        await updateDoc(doc(db, 'notifications', notif.id), { read: true });
      } catch (e) {
        console.warn(e);
      }
    }
    if (notif.actionTab && onNavigate) {
      onClose();
      onNavigate(notif.actionTab);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0a0e17] border border-outline-variant/20 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200 text-white">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00f5a0]/15 text-[#00f5a0] flex items-center justify-center border border-[#00f5a0]/30 shadow-sm">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white font-headline leading-tight flex items-center gap-2">
                Central de Notificações & Balanços
              </h3>
              <p className="text-xs text-on-surface-variant">
                Alertas inteligentes, fechamentos semanais e relatórios de faturamento.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-on-surface-variant hover:text-white hover:bg-surface-container transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-outline-variant/10 bg-surface-container-low/50 px-4 pt-2 gap-1 overflow-x-auto custom-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2.5 text-xs font-black rounded-t-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'notifications' ? 'bg-[#0a0e17] text-[#00f5a0] border-t-2 border-[#00f5a0]' : 'text-on-surface-variant hover:text-white'}`}
          >
            <Bell className="w-3.5 h-3.5" />
            Notificações ({notifications.length})
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('weekly')}
            className={`px-4 py-2.5 text-xs font-black rounded-t-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'weekly' ? 'bg-[#0a0e17] text-[#00f5a0] border-t-2 border-[#00f5a0]' : 'text-on-surface-variant hover:text-white'}`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Balanço Semanal
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('monthly')}
            className={`px-4 py-2.5 text-xs font-black rounded-t-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'monthly' ? 'bg-[#0a0e17] text-[#00f5a0] border-t-2 border-[#00f5a0]' : 'text-on-surface-variant hover:text-white'}`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Fechamento Mensal
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2.5 text-xs font-black rounded-t-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'settings' ? 'bg-[#0a0e17] text-[#00f5a0] border-t-2 border-[#00f5a0]' : 'text-on-surface-variant hover:text-white'}`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Configurar Push
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6 space-y-4">
          
          {/* TAB 1: NOTIFICAÇÕES GERAIS */}
          {activeTab === 'notifications' && (
            <div className="space-y-3">
              {permissionState !== 'granted' && (
                <div className="bg-[#00f5a0]/10 border border-[#00f5a0]/30 rounded-2xl p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-[#00f5a0] shrink-0" />
                    <div>
                      <p className="text-xs font-black text-white">Ative as Notificações no seu Navegador</p>
                      <p className="text-[11px] text-on-surface-variant">Receba avisos de trades, comunidade e pagamentos mesmo com o app fechado.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRequestPush}
                    className="bg-[#00f5a0] hover:bg-[#00f5a0]/80 text-[#022c16] px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider shrink-0"
                  >
                    Ativar Push
                  </button>
                </div>
              )}

              {notifications.length === 0 ? (
                <div className="text-center py-12 text-on-surface-variant space-y-2">
                  <Bell className="w-8 h-8 mx-auto opacity-30 text-[#00f5a0]" />
                  <p className="text-xs font-bold">Nenhuma notificação por enquanto.</p>
                  <p className="text-[11px] opacity-70">Quando houver novos cadastros, análises ou balanços, eles serão listados aqui.</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id || Math.random()}
                    onClick={() => handleNotificationClick(n)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer hover:border-[#00f5a0]/50 ${n.read ? 'bg-surface-container/30 border-outline-variant/10' : 'bg-[#00f5a0]/5 border-[#00f5a0]/25 shadow-sm'}`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div className="flex items-center gap-2">
                        {n.type === 'admin_registration' && <Users className="w-4 h-4 text-primary" />}
                        {n.type === 'admin_payment' && <CreditCard className="w-4 h-4 text-[#00f5a0]" />}
                        {n.type === 'affiliate_registered' && <Award className="w-4 h-4 text-amber-400" />}
                        {n.type === 'subscription_expiring' && <AlertCircle className="w-4 h-4 text-rose-400" />}
                        {n.type === 'community_post' && <Globe className="w-4 h-4 text-blue-400" />}
                        {(!n.type || n.type === 'system_alert') && <Bell className="w-4 h-4 text-[#00f5a0]" />}
                        <span className="text-xs font-black text-white">{n.title}</span>
                      </div>
                      <span className="text-[10px] text-on-surface-variant opacity-60">
                        {n.createdAt ? new Date(n.createdAt.toDate ? n.createdAt.toDate() : n.createdAt).toLocaleDateString() : 'Hoje'}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      {n.body}
                    </p>
                    {n.actionTab && (
                      <span className="inline-block mt-2 text-[10px] font-black uppercase text-[#00f5a0] tracking-wider">
                        Toque para abrir →
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: BALANÇO SEMANAL & PSICOLOGIA */}
          {activeTab === 'weekly' && (
            <div className="space-y-5">
              <div className="p-4 bg-surface-container/40 border border-outline-variant/10 rounded-2xl">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#00f5a0] mb-1">
                  Resumo dos Últimos 7 Dias
                </h4>
                <p className="text-xs text-on-surface-variant">
                  Balanço das suas operações, pares mais expressivos e controle psicológico.
                </p>
              </div>

              {weeklyData && weeklyData.hasTrades ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-surface-container/50 border border-outline-variant/10 rounded-2xl p-3.5 text-center">
                      <span className="text-[10px] uppercase font-bold text-on-surface-variant block mb-1">Resultado</span>
                      <span className={`text-base font-black ${weeklyData.isPositive ? 'text-[#00f5a0]' : 'text-rose-400'}`}>
                        {weeklyData.totalPnl >= 0 ? '+' : ''}{weeklyData.totalPnl.toLocaleString('pt-BR')} Kz
                      </span>
                    </div>

                    <div className="bg-surface-container/50 border border-outline-variant/10 rounded-2xl p-3.5 text-center">
                      <span className="text-[10px] uppercase font-bold text-on-surface-variant block mb-1">Win Rate</span>
                      <span className="text-base font-black text-white">{weeklyData.winRate}</span>
                    </div>

                    <div className="bg-surface-container/50 border border-outline-variant/10 rounded-2xl p-3.5 text-center">
                      <span className="text-[10px] uppercase font-bold text-on-surface-variant block mb-1">Total Trades</span>
                      <span className="text-base font-black text-white">{weeklyData.totalTrades}</span>
                    </div>

                    <div className="bg-surface-container/50 border border-outline-variant/10 rounded-2xl p-3.5 text-center">
                      <span className="text-[10px] uppercase font-bold text-on-surface-variant block mb-1">Melhor Sessão</span>
                      <span className="text-base font-black text-amber-400">{weeklyData.bestSession}</span>
                    </div>
                  </div>

                  {/* Melhores e Piores Pares */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-black tracking-wider text-emerald-400 block">Maior Ganho (Gain)</span>
                        <p className="text-sm font-black text-white">{weeklyData.bestPair}</p>
                      </div>
                    </div>

                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                        <TrendingDown className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-black tracking-wider text-rose-400 block">Maior Perda (Loss)</span>
                        <p className="text-sm font-black text-white">{weeklyData.worstPair}</p>
                      </div>
                    </div>
                  </div>

                  {/* Mensagem Psicológica e Motivacional */}
                  {!weeklyData.isPositive && weeklyData.psychologicalAdvice && (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2">
                      <div className="flex items-center gap-2 text-amber-400">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-xs font-black uppercase tracking-wider">Gestão Emocional & Motivação</span>
                      </div>
                      <p className="text-xs text-white/90 leading-relaxed font-medium">
                        "{weeklyData.psychologicalAdvice}"
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-10 text-on-surface-variant text-xs">
                  Sem operações registadas nos últimos 7 dias para gerar o balanço semanal.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FECHAMENTO MENSAL DE FATURAMENTO */}
          {activeTab === 'monthly' && (
            <div className="space-y-5">
              <div className="p-4 bg-surface-container/40 border border-outline-variant/10 rounded-2xl">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#00f5a0] mb-1">
                  Fechamento Consolidado do Mês ({monthlyData?.monthName || 'Atual'})
                </h4>
                <p className="text-xs text-on-surface-variant">
                  Resumo de faturamento de todas as contas (Forex e Opções Binárias) e taxa de crescimento.
                </p>
              </div>

              {monthlyData ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-surface-container/50 border border-outline-variant/10 rounded-2xl p-3.5 text-center">
                      <span className="text-[10px] uppercase font-bold text-on-surface-variant block mb-1">Lucro Líquido</span>
                      <span className={`text-base font-black ${monthlyData.currentTotalPnl >= 0 ? 'text-[#00f5a0]' : 'text-rose-400'}`}>
                        {monthlyData.currentTotalPnl >= 0 ? '+' : ''}{monthlyData.currentTotalPnl.toLocaleString('pt-BR')} Kz
                      </span>
                    </div>

                    <div className="bg-surface-container/50 border border-outline-variant/10 rounded-2xl p-3.5 text-center">
                      <span className="text-[10px] uppercase font-bold text-on-surface-variant block mb-1">Total Perdas</span>
                      <span className="text-base font-black text-rose-400">
                        -{monthlyData.totalLoss.toLocaleString('pt-BR')} Kz
                      </span>
                    </div>

                    <div className="bg-surface-container/50 border border-outline-variant/10 rounded-2xl p-3.5 text-center">
                      <span className="text-[10px] uppercase font-bold text-on-surface-variant block mb-1">Win Rate</span>
                      <span className="text-base font-black text-white">{monthlyData.winRate}</span>
                    </div>

                    <div className="bg-surface-container/50 border border-outline-variant/10 rounded-2xl p-3.5 text-center">
                      <span className="text-[10px] uppercase font-bold text-on-surface-variant block mb-1">Crescimento</span>
                      <span className={`text-base font-black ${monthlyData.hasSurpassed ? 'text-[#00f5a0]' : 'text-amber-400'}`}>
                        {monthlyData.growthPercentage >= 0 ? '+' : ''}{monthlyData.growthPercentage}%
                      </span>
                    </div>
                  </div>

                  {/* Detalhamento por Conta Individual */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-black uppercase tracking-wider text-on-surface flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-[#00f5a0]" />
                      Desempenho por Conta Individual
                    </h5>

                    {monthlyData.accounts.length === 0 ? (
                      <p className="text-xs text-on-surface-variant italic">Nenhum trade agrupado neste mês.</p>
                    ) : (
                      <div className="space-y-2">
                        {monthlyData.accounts.map((acc, idx) => (
                          <div key={idx} className="p-3.5 rounded-2xl bg-surface-container/40 border border-outline-variant/10 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-black text-white">{acc.name}</p>
                              <span className="text-[10px] text-on-surface-variant uppercase font-bold">{acc.type} • {acc.total} operações</span>
                            </div>
                            <div className="text-right">
                              <span className={`text-xs font-black block ${acc.pnl >= 0 ? 'text-[#00f5a0]' : 'text-rose-400'}`}>
                                {acc.pnl >= 0 ? '+' : ''}{acc.pnl.toLocaleString('pt-BR')} Kz
                              </span>
                              <span className="text-[10px] text-on-surface-variant font-bold">
                                Win: {((acc.wins / (acc.total || 1)) * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-10 text-on-surface-variant text-xs">
                  Sem dados para gerar fechamento mensal.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CONFIGURAR PUSH & INSTRUÇÕES */}
          {activeTab === 'settings' && (
            <div className="space-y-5">
              <div className="p-5 bg-surface-container/50 border border-outline-variant/10 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-white">Status do Web Push</h4>
                    <p className="text-xs text-on-surface-variant">Notificações no navegador / celular</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${permissionState === 'granted' ? 'bg-[#00f5a0]/20 text-[#00f5a0]' : 'bg-amber-500/20 text-amber-400'}`}>
                    {permissionState === 'granted' ? 'Ativo' : permissionState === 'denied' ? 'Bloqueado' : 'Pendente'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleRequestPush}
                    className="flex-1 bg-[#00f5a0] hover:bg-[#00f5a0]/90 text-[#022c16] py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all"
                  >
                    {permissionState === 'granted' ? 'Revalidar Permissão' : 'Ativar Notificações Push'}
                  </button>

                  <button
                    type="button"
                    onClick={handleTestPush}
                    disabled={isTestingPush}
                    className="bg-surface-container-high hover:bg-surface-container text-white py-2.5 px-4 rounded-xl font-bold text-xs transition-all border border-outline-variant/20"
                  >
                    {isTestingPush ? 'Enviando...' : 'Testar Notificação'}
                  </button>
                </div>
              </div>

              {/* Lista Explicativa de Notificações Ativas */}
              <div className="space-y-3">
                <h5 className="text-xs font-black uppercase tracking-wider text-on-surface">
                  Notificações Push Incluídas no C Profit:
                </h5>
                <ul className="space-y-2 text-xs text-on-surface-variant">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#00f5a0] shrink-0 mt-0.5" />
                    <span><strong>Relatório Semanal de Finais de Semana:</strong> Maior gain, maior loss, sessões mais lucrativas e conselhos de disciplina.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#00f5a0] shrink-0 mt-0.5" />
                    <span><strong>Fechamento Mensal de Faturamento:</strong> Se superou o mês passado, lucro líquido, perdas, total de trades e win rate.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#00f5a0] shrink-0 mt-0.5" />
                    <span><strong>Alertas de Renovação Premium:</strong> Lembretes com 15 dias, 5 dias, 2 dias e no dia de vencimento para evitar interrupções.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#00f5a0] shrink-0 mt-0.5" />
                    <span><strong>Nova Análise na Comunidade:</strong> Alerta em tempo real de novas postagens de traders.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#00f5a0] shrink-0 mt-0.5" />
                    <span><strong>Novos Afiliados:</strong> Notificação quando alguém se inscreve com o seu código de indicação.</span>
                  </li>
                  {isSuperAdmin && (
                    <li className="flex items-start gap-2 text-primary">
                      <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span><strong>Painel Master Admin:</strong> Notificação imediata de novo cadastro e novos pedidos de validação de assinatura com atalho direto.</span>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-outline-variant/10 bg-surface-container-low flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-white text-xs font-black uppercase tracking-wider transition-all"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
}
