import React, { useState, useMemo, useEffect } from 'react';
import { DateRangePicker } from './DateRangePicker';
import { DateRange } from 'react-day-picker';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { collection, addDoc, onSnapshot, query, where, serverTimestamp, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useCurrency } from '../contexts/CurrencyContext';
import { useTrades } from '../hooks/useTrades';
import Modal from './Modal';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Download, MoreVertical, AlertTriangle, Users, MessageSquare, Check, ChevronRight } from 'lucide-react';

// --- COMPONENTES AUXILIARES ---
function CalendarCell({ date, muted, trades, pnl, isWin, isLoss, active }: any) {
  const { formatCurrency } = useCurrency();
  return (
    <div className={`min-h-[120px] p-3 border-r border-b border-outline-variant/20 relative ${active ? 'bg-surface-container border-l-2 border-l-secondary' : ''}`}>
      <span className={`absolute top-3 right-3 text-sm font-bold ${muted ? 'text-outline-variant/50' : 'text-on-surface-variant'}`}>{date}</span>
      {trades > 0 && (
        <div className="mt-8 space-y-1.5">
          <div className="flex justify-between text-xs space-x-1">
            <span className="text-on-surface-variant font-medium">Trades:</span>
            <span className="text-on-surface font-black">{trades}</span>
          </div>
          <div className={`flex justify-between text-xs font-medium px-2 py-1.5 rounded ${isWin ? 'bg-secondary/10 text-secondary' : isLoss ? 'bg-error/10 text-error' : 'bg-outline-variant/20 text-on-surface-variant'}`}>
            <span>P&L:</span>
            <span className="font-black">{pnl > 0 ? '+' : ''}{formatCurrency(pnl)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label, formatCurrency }: any) => {
  if (active && payload && payload.length) {
    let formattedLabel = label;
    if (label && typeof label === 'string') {
      const parts = label.split('-');
      if (parts.length === 3) {
        formattedLabel = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    return (
      <div className="bg-surface-container-high border border-outline-variant/20 p-4 rounded-xl shadow-xl">
        <p className="text-on-surface-variant text-xs mb-3 font-medium">{formattedLabel}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-6 mb-2 last:mb-0">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></div>
              <span className="text-on-surface-variant text-sm">{entry.name}</span>
            </div>
            <span className="text-on-surface text-sm font-bold">
              {formatCurrency(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { formatCurrency } = useCurrency();
  const [selectedAccount, setSelectedAccount] = useState(() => {
    return localStorage.getItem('dashboard_selectedAccount') || 'all';
  });
  const [selectedAccountLogin, setSelectedAccountLogin] = useState(() => {
    return localStorage.getItem('dashboard_selectedAccountLogin') || 'all';
  });
  const [tradeTypeFilter, setTradeTypeFilter] = useState<'all' | 'forex' | 'ob'>(() => {
    return (localStorage.getItem('dashboard_tradeTypeFilter') as any) || 'all';
  });
  const [calendarDate, setCalendarDate] = useState(new Date()); // Mes corrente como padrão
  const [activeDashboardTab, setActiveDashboardTab] = useState('objectives'); // 'objectives', 'history', 'analysis', 'info'
  const [analysisDateRange, setAnalysisDateRange] = useState<DateRange | undefined>();
  const [activeAnalysisModal, setActiveAnalysisModal] = useState<string | null>(null);
  const [isAnalysisModalExpanded, setIsAnalysisModalExpanded] = useState(false);
  const [analysisModalChartType, setAnalysisModalChartType] = useState<'pie' | 'bar'>('pie');
  
  const openAnalysisModal = (id: string) => {
    setActiveAnalysisModal(id);
    setIsAnalysisModalExpanded(false);
    setAnalysisModalChartType('pie');
  };
  
  const closeAnalysisModal = () => {
    setActiveAnalysisModal(null);
    setIsAnalysisModalExpanded(false);
  };
  const toggleAnalysisModalExpanded = () => setIsAnalysisModalExpanded(prev => !prev);
  const [historyResultFilter, setHistoryResultFilter] = useState<'all' | 'win' | 'loss'>('all');
  const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [objectives, setObjectives] = useState<any[]>([]);
  const [visibleMarkets, setVisibleMarkets] = useState<'all' | 'forex' | 'ob'>('all');
  const [defaultTradeType, setDefaultTradeType] = useState<'ask' | 'forex' | 'ob'>('ask');

  useEffect(() => {
    setHistoryCurrentPage(1);
  }, [tradeTypeFilter, selectedAccountLogin, analysisDateRange, historyResultFilter]);

  // Load settings
  useEffect(() => {
    const savedObjectives = localStorage.getItem('app_objectives');
    if (savedObjectives) {
      setObjectives(JSON.parse(savedObjectives));
    }
    const savedVisibleMarkets = localStorage.getItem('app_visible_markets') as 'all' | 'forex' | 'ob';
    if (savedVisibleMarkets) {
      setVisibleMarkets(savedVisibleMarkets);
      if (savedVisibleMarkets === 'forex' && (tradeTypeFilter as any) === 'ob') {
         setTradeTypeFilter('forex');
      } else if (savedVisibleMarkets === 'ob' && (tradeTypeFilter as any) === 'forex') {
         setTradeTypeFilter('ob');
      }
    }
    const savedDefaultTradeType = localStorage.getItem('app_default_trade_type') as 'ask' | 'forex' | 'ob';
    if (savedDefaultTradeType) {
      setDefaultTradeType(savedDefaultTradeType);
      if (savedDefaultTradeType === 'forex' || savedDefaultTradeType === 'ob') {
        setTradeTypeFilter(savedDefaultTradeType);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('dashboard_selectedAccount', selectedAccount);
  }, [selectedAccount]);

  useEffect(() => {
    localStorage.setItem('dashboard_selectedAccountLogin', selectedAccountLogin);
  }, [selectedAccountLogin]);

  useEffect(() => {
    localStorage.setItem('dashboard_tradeTypeFilter', tradeTypeFilter);
  }, [tradeTypeFilter]);

  // Firebase Data State
  const [accounts, setAccounts] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const { 
    allTrades: trades, 
    loading: loadingTrades, 
    uniqueAccounts, 
    limitReached, 
    userPlan,
    isExpired 
  } = useTrades();

  // Add Account Form State
  const [newAccount, setNewAccount] = useState({
    accountNumber: '',
    broker: '',
    initialBalance: '',
    accountType: '10K Challenge',
    phase: 'Fase 1',
    startDate: '',
    currency: 'USD',
    tradeType: 'forex'
  });
  const [isSaving, setIsSaving] = useState(false);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isError?: boolean;
    confirmText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const [isExporting, setIsExporting] = useState(false);
  const [dbPhoto, setDbPhoto] = useState<string | null>(null);
  const [dbName, setDbName] = useState<string>('');

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    const unsub = onSnapshot(doc(db, 'usuarios', currentUser.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.photoURL) setDbPhoto(data.photoURL);
        if (data.nome) setDbName(data.nome);
      } else {
        onSnapshot(doc(db, 'users', currentUser.uid), (altSnap) => {
          if (altSnap.exists()) {
            const altData = altSnap.data();
            if (altData.photoURL) setDbPhoto(altData.photoURL);
            if (altData.nome) setDbName(altData.nome);
          }
        });
      }
    });
    
    return () => unsub();
  }, []);

  const [dashboardChats, setDashboardChats] = useState<any[]>([]);
  const [dashboardInvites, setDashboardInvites] = useState<any[]>([]);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const qChats = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', currentUser.uid)
    );

    const unsubChats = onSnapshot(qChats, (snap) => {
      const list = snap.docs.map(d => {
        const data = d.data();
        let name = data.name || 'Sala de Chat';
        if (data.type === 'direct') {
          const otherId = data.participants?.find((p: string) => p !== currentUser.uid);
          name = data.otherUserName || data.name || 'Conversa Privada';
        }
        return {
          id: d.id,
          name,
          ...data
        };
      });
      setDashboardChats(list);
    }, (err) => {
      console.error("Dashboard chats sub failed:", err);
    });

    const qInvites = query(
      collection(db, 'room_invites'),
      where('receiverId', '==', currentUser.uid),
      where('status', '==', 'pending')
    );

    const unsubInvites = onSnapshot(qInvites, (snap) => {
      setDashboardInvites(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error("Dashboard invites sub failed:", err);
    });

    return () => {
      unsubChats();
      unsubInvites();
    };
  }, []);

  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const dashboardRef = React.useRef<HTMLDivElement>(null);
  const exportDropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setExportMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [exportDropdownRef]);

  const handleExportPDF = async () => {
    if (!dashboardRef.current) return;
    setIsExporting(true);
    try {
      const scaleStr = window.innerWidth < 768 ? '2' : '1.5';
      const canvas = await html2canvas(dashboardRef.current, {
        scale: parseFloat(scaleStr),
        useCORS: true,
        logging: false,
        backgroundColor: '#1E1E2D', // background color for the dark theme
        windowWidth: dashboardRef.current.scrollWidth,
        windowHeight: dashboardRef.current.scrollHeight
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Setup for multiple pages if content exceeds A4 height
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`CProfit_Performance_${selectedAccount === 'all' ? 'Geral' : selectedAccount}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erro ao gerar PDF da performance.');
    } finally {
      setIsExporting(false);
    }
  };

  const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));

  useEffect(() => {
    if (!auth.currentUser) return;

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

    // Withdrawals
    const qWithdrawals = query(collection(db, 'withdrawals'), where('userId', '==', auth.currentUser.uid));
    const unsubWithdrawals = onSnapshot(qWithdrawals, (snapshot) => {
      setWithdrawals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    unsubscribes.push(unsubWithdrawals);

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
        maxLossPeriod: doc.data().maxLossPeriod || 'Mês'
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
                  maxLossPeriod: obj.maxLossPeriod || 'Mês'
                });
              });
              Promise.all(promises).then(() => {
                localStorage.setItem('app_objectives_synced', 'true');
                isMigratingObjectives = false;
              }).catch(err => {
                console.error("Migration/Self-heal error in Dashboard:", err);
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
      // Deduplicate by accountNumber if needed, or just combine
      const combined = [...accountsByPath.new, ...accountsByPath.old];
      // Simple deduplication by ID
      const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
      setAccounts(unique);
    };

    return () => unsubscribes.forEach(unsub => unsub());
  }, []);

  const hasObAccount = accounts.some(a => a.tradeType === 'ob');
  const hasForexAccount = accounts.some(a => a.tradeType !== 'ob');
  const showObFilter = visibleMarkets === 'all' || visibleMarkets === 'ob';
  const showForexFilter = visibleMarkets === 'all' || visibleMarkets === 'forex';

  // Ensure tradeTypeFilter matches visibleMarkets
  useEffect(() => {
    if (!showObFilter && tradeTypeFilter === 'ob') {
      setTradeTypeFilter(showForexFilter ? 'forex' : 'all');
    }
    if (!showForexFilter && tradeTypeFilter === 'forex') {
      setTradeTypeFilter(showObFilter ? 'ob' : 'all');
    }
  }, [showObFilter, showForexFilter, tradeTypeFilter]);

  useEffect(() => {
    if ((activeDashboardTab === 'history' || activeDashboardTab === 'analysis') && tradeTypeFilter === 'all') {
      setTradeTypeFilter('forex');
    }
  }, [activeDashboardTab, tradeTypeFilter]);

  useEffect(() => {
    if (selectedAccount !== 'all') {
      const account = accounts.find(a => a.id === selectedAccount);
      if (account) {
        const accTradeType = account.tradeType || 'forex';
        if (tradeTypeFilter !== 'all' && accTradeType !== tradeTypeFilter) {
          setSelectedAccount('all');
        }
      }
    }
  }, [tradeTypeFilter, accounts, selectedAccount]);

  const handleSaveAccount = async () => {
    if (!auth.currentUser) return;
    if (!newAccount.accountNumber || !newAccount.broker || !newAccount.initialBalance || !newAccount.startDate) {
      setModalConfig({
        isOpen: true,
        title: "Atenção",
        message: "Por favor, preencha os campos obrigatórios (Número, Corretora, Saldo Inicial e Data de Início).",
        isError: true,
        onConfirm: closeModal
      });
      return;
    }

    setIsSaving(true);
    try {
      const uid = auth.currentUser.uid;
      const integrationToken = Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
      
      // Save to subcollection (SaaS path)
      await addDoc(collection(db, 'usuarios', uid, 'accounts'), {
        accountNumber: newAccount.accountNumber,
        broker: newAccount.broker,
        initialBalance: Number(newAccount.initialBalance),
        accountType: newAccount.accountType,
        phase: newAccount.phase,
        startDate: newAccount.startDate,
        currency: newAccount.currency,
        tradeType: newAccount.tradeType,
        status: 'active',
        integrationToken,
        userId: uid,
        createdAt: serverTimestamp()
      });
      
      setIsAddAccountModalOpen(false);
      setNewAccount({
        accountNumber: '',
        broker: '',
        initialBalance: '',
        accountType: '10K Challenge',
        phase: 'Fase 1',
        startDate: '',
        currency: 'USD',
        tradeType: 'forex'
      });
      setModalConfig({
        isOpen: true,
        title: "Sucesso",
        message: "Conta salva com sucesso!",
        confirmText: "OK",
        onConfirm: closeModal
      });
    } catch (error) {
      console.error("Error adding account: ", error);
      setModalConfig({
        isOpen: true,
        title: "Erro",
        message: "Erro ao salvar a conta.",
        isError: true,
        onConfirm: closeModal
      });
    } finally {
      setIsSaving(false);
    }
  };

  // --- LÓGICA DE AGREGAÇÃO ---
  const data = useMemo(() => {
    // Filter according to visibleMarkets
    const visibleAccounts = accounts.filter(a => {
      const accTradeType = a.tradeType || 'forex';
      if (visibleMarkets === 'forex' && accTradeType === 'ob') return false;
      if (visibleMarkets === 'ob' && accTradeType !== 'ob') return false;
      return true;
    });

    const activeAccounts = visibleAccounts.filter(a => a.status !== 'inactive');
    
    let accountsToProcess = selectedAccount === 'all' 
      ? activeAccounts 
      : visibleAccounts.filter(a => a.id === selectedAccount);

    // If an inactive account was selected (from old state), fallback to all
    const currentAccObj = visibleAccounts.find(a => a.id === selectedAccount);
    if (selectedAccount !== 'all' && currentAccObj?.status === 'inactive') {
      accountsToProcess = activeAccounts;
    }

    const baseTradesToProcess = selectedAccount === 'all' 
      ? trades.filter(t => activeAccounts.some(a => a.id === t.accountId) || !t.accountId)
      : trades.filter(t => t.accountId === selectedAccount);
      
    // Remove trades belonging to hidden markets
    const finalTradesToProcess = baseTradesToProcess.filter(t => {
      // Find the account for this trade to check its type
      const tradeAcc = visibleAccounts.find(a => a.id === t.accountId);
      const tt = tradeAcc?.tradeType || 'forex';
      if (visibleMarkets === 'forex' && tt === 'ob') return false;
      if (visibleMarkets === 'ob' && tt !== 'ob') return false;
      return true;
    });

    let tradesToProcess = finalTradesToProcess.map(t => ({
      ...t,
      pnl: Number(t.pnl) || 0,
      type: t.type || 'forex'
    }));

    if (selectedAccountLogin !== 'all') {
      tradesToProcess = tradesToProcess.filter(t => String(t.account_login) === selectedAccountLogin || String(t.accountId) === selectedAccountLogin);
    }

    if (tradeTypeFilter !== 'all') {
      tradesToProcess = tradesToProcess.filter(t => t.type === tradeTypeFilter);
    }

    let totalSize = 0;
    let totalProfitTarget = 0;
    let totalMaxLoss = 0;
    let totalDailyLoss = 0;
    let hasProfitTarget = false;
    let hasMaxLoss = false;
    let hasDailyLoss = false;
    let maxLossPeriod = 'Mês';
    
    // Calculate total size from accounts
    accountsToProcess.forEach(acc => {
      const accTradeType = acc.tradeType || 'forex'; // Default to forex if missing
      if (tradeTypeFilter === 'all' || accTradeType === tradeTypeFilter) {
        totalSize += Number(acc.initialBalance) || 0;
      }
    });

    // Calculate targets
    if (selectedAccount === 'all') {
      // Check if we have market-level objectives for each market type we are interested in
      const relevantMarketTypes = tradeTypeFilter === 'all' ? ['forex', 'ob'] : [tradeTypeFilter];
      
      relevantMarketTypes.forEach(mType => {
        const marketObj = objectives.find(obj => obj.type === 'market' && obj.targetId === mType);
        
        // Only use the Market-level objective if it has actual defined progress metric targets (not blank/empty)
        if (marketObj && (Number(marketObj.profitTarget) > 0 || Number(marketObj.maxLoss) > 0 || Number(marketObj.dailyLoss) > 0)) {
          // Use Market-level objective for this type
          if (marketObj.profitTarget) totalProfitTarget += Number(marketObj.profitTarget) || 0;
          if (marketObj.maxLoss) totalMaxLoss += Number(marketObj.maxLoss) || 0;
          if (marketObj.dailyLoss) totalDailyLoss += Number(marketObj.dailyLoss) || 0;
          if (marketObj.maxLossPeriod) maxLossPeriod = marketObj.maxLossPeriod;
        } else {
          // Fallback: Sum account-level objectives for this market type
          accountsToProcess.forEach(acc => {
            const accTradeType = acc.tradeType || 'forex';
            if (accTradeType === mType) {
              const accObj = objectives.find(obj => obj.type === 'account' && obj.targetId === acc.id);
              if (accObj) {
                if (accObj.profitTarget) totalProfitTarget += Number(accObj.profitTarget) || 0;
                if (accObj.maxLoss) totalMaxLoss += Number(accObj.maxLoss) || 0;
                if (accObj.dailyLoss) totalDailyLoss += Number(accObj.dailyLoss) || 0;
                if (accObj.maxLossPeriod) maxLossPeriod = accObj.maxLossPeriod;
              }
            }
          });
        }
      });
    } else {
      // Specific account selected
      const accountObjective = objectives.find(obj => obj.type === 'account' && obj.targetId === selectedAccount);
      if (accountObjective) {
        totalProfitTarget = Number(accountObjective.profitTarget) || 0;
        totalMaxLoss = Number(accountObjective.maxLoss) || 0;
        if (accountObjective.maxLossPeriod) maxLossPeriod = accountObjective.maxLossPeriod;
        totalDailyLoss = Number(accountObjective.dailyLoss) || 0;
      }
    }

    hasProfitTarget = totalProfitTarget > 0;
    hasMaxLoss = totalMaxLoss > 0;
    hasDailyLoss = totalDailyLoss > 0;

    let totalTrades = 0;
    let totalWins = 0;
    let totalPnl = 0;
    let totalLossSum = 0; // NEW
    let totalRr = 0;
    let tradesWithRr = 0;
    
    // Para o comparativo mensal
    let prevMonthPnl = 0;
    let currentMonthPnl = 0;
    let prevMonthTrades = 0;
    let currentMonthTrades = 0;
    let currentMonthTradingDays = new Set<string>();

    const currentMonth = calendarDate.getMonth();
    const currentYear = calendarDate.getFullYear();
    
    // Mês anterior
    const prevDate = new Date(currentYear, currentMonth - 1, 1);
    const prevMonth = prevDate.getMonth();
    const prevYear = prevDate.getFullYear();

    const historyMap: Record<string, { pnl: number, trades: number, wins: number }> = {};
    const setupsMap: Record<string, { pnl: number, wins: number, total: number }> = {};
    const psychologyMap: Record<string, number> = {};
    const pairsMap: Record<string, { pnl: number, wins: number, total: number }> = {};
    const timeframeMap: Record<string, { pnl: number, wins: number, total: number }> = {};

    // Analysis maps
    const analysisSetupsMap: Record<string, { pnl: number, wins: number, total: number }> = {};
    const analysisPsychologyMap: Record<string, number> = {};
    const analysisPairsMap: Record<string, { pnl: number, wins: number, total: number }> = {};
    const analysisTimeframeMap: Record<string, { pnl: number, wins: number, total: number }> = {};
    const analysisSessionsMap: Record<string, { pnl: number, wins: number, total: number }> = {};
    const daysOfWeekMap: Record<string, { pnl: number, wins: number, total: number }> = {};
    const analysisDaysOfWeekMap: Record<string, { pnl: number, wins: number, total: number }> = {};
    let analysisTotalTrades = 0;
    const filteredHistoryTrades: any[] = [];

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfThisWeek = new Date(today);
    startOfThisWeek.setDate(today.getDate() - today.getDay());
    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);
    const endOfLastWeek = new Date(startOfThisWeek);
    endOfLastWeek.setDate(endOfLastWeek.getDate() - 1);

    // 0. Process Base Trades (Always General)
    tradesToProcess.forEach(trade => {
      let tradeDate;
      if (trade.date) {
        const parts = trade.date.split(/[-/.]/);
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            tradeDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          } else {
            tradeDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
          }
        } else {
          tradeDate = new Date(trade.date);
        }
      } else if (trade.closeTime?.toDate) {
        tradeDate = trade.closeTime.toDate();
      } else if (trade.closeTime) {
        tradeDate = new Date(trade.closeTime);
      } else {
        return;
      }

      const dateStr = `${tradeDate.getFullYear()}-${(tradeDate.getMonth() + 1).toString().padStart(2, '0')}-${tradeDate.getDate().toString().padStart(2, '0')}`;

      if (!historyMap[dateStr]) {
        historyMap[dateStr] = { pnl: 0, trades: 0, wins: 0 };
      }
      historyMap[dateStr].pnl += trade.pnl;
      historyMap[dateStr].trades += 1;
      if (trade.pnl > 0) historyMap[dateStr].wins += 1;
    });

    // 1. Process Global Trades (tradesToProcess)
    tradesToProcess.forEach(trade => {
      totalTrades += 1;
      if (trade.pnl > 0) totalWins += 1;
      if (trade.pnl < 0) totalLossSum += Math.abs(trade.pnl); // NEW
      totalPnl += trade.pnl;
      if (trade.rr && !isNaN(Number(trade.rr))) {
        totalRr += Number(trade.rr);
        tradesWithRr += 1;
      }

      let tradeDate;
      if (trade.date) {
        const parts = trade.date.split(/[-/.]/);
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            tradeDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          } else {
            tradeDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
          }
        } else {
          tradeDate = new Date(trade.date);
        }
      } else if (trade.closeTime?.toDate) {
        tradeDate = trade.closeTime.toDate();
      } else if (trade.closeTime) {
        tradeDate = new Date(trade.closeTime);
      } else {
        return;
      }

      const tMonth = tradeDate.getMonth();
      const tYear = tradeDate.getFullYear();
      const dateStr = `${tradeDate.getFullYear()}-${(tradeDate.getMonth() + 1).toString().padStart(2, '0')}-${tradeDate.getDate().toString().padStart(2, '0')}`;
      
      const dayOfWeek = tradeDate.getDay();
      const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
      const dayName = dayNames[dayOfWeek];

      if (!daysOfWeekMap[dayName]) daysOfWeekMap[dayName] = { pnl: 0, wins: 0, total: 0 };
      daysOfWeekMap[dayName].total += 1;
      daysOfWeekMap[dayName].pnl += trade.pnl;
      if (trade.pnl > 0) daysOfWeekMap[dayName].wins += 1;

      // Analysis Filter Logic (Aba Análises)
      let includeInAnalysis = true;
      if (analysisDateRange?.from) {
        // Normalize tradeDate to start of day for comparison
        const tDate = new Date(tradeDate.getFullYear(), tradeDate.getMonth(), tradeDate.getDate());
        const fromDate = new Date(analysisDateRange.from.getFullYear(), analysisDateRange.from.getMonth(), analysisDateRange.from.getDate());
        if (tDate < fromDate) {
          includeInAnalysis = false;
        }
        if (includeInAnalysis && analysisDateRange.to) {
          const toDate = new Date(analysisDateRange.to.getFullYear(), analysisDateRange.to.getMonth(), analysisDateRange.to.getDate());
          if (tDate > toDate) {
            includeInAnalysis = false;
          }
        }
      }

      if (includeInAnalysis) {
        analysisTotalTrades += 1;
        filteredHistoryTrades.push(trade);
        
        if (!analysisDaysOfWeekMap[dayName]) analysisDaysOfWeekMap[dayName] = { pnl: 0, wins: 0, total: 0 };
        analysisDaysOfWeekMap[dayName].total += 1;
        analysisDaysOfWeekMap[dayName].pnl += trade.pnl;
        if (trade.pnl > 0) analysisDaysOfWeekMap[dayName].wins += 1;
        
        if (trade.symbol) {
          if (!analysisPairsMap[trade.symbol]) analysisPairsMap[trade.symbol] = { pnl: 0, wins: 0, total: 0 };
          analysisPairsMap[trade.symbol].total += 1;
          analysisPairsMap[trade.symbol].pnl += trade.pnl;
          if (trade.pnl > 0) analysisPairsMap[trade.symbol].wins += 1;
        }

        if (trade.timeframe) {
          if (!analysisTimeframeMap[trade.timeframe]) analysisTimeframeMap[trade.timeframe] = { pnl: 0, wins: 0, total: 0 };
          analysisTimeframeMap[trade.timeframe].total += 1;
          analysisTimeframeMap[trade.timeframe].pnl += trade.pnl;
          if (trade.pnl > 0) analysisTimeframeMap[trade.timeframe].wins += 1;
        }

        if (trade.session) {
          if (!analysisSessionsMap[trade.session]) analysisSessionsMap[trade.session] = { pnl: 0, wins: 0, total: 0 };
          analysisSessionsMap[trade.session].total += 1;
          analysisSessionsMap[trade.session].pnl += trade.pnl;
          if (trade.pnl > 0) analysisSessionsMap[trade.session].wins += 1;
        }

        if (trade.setups && Array.isArray(trade.setups)) {
          trade.setups.forEach((setup: string) => {
            if (!analysisSetupsMap[setup]) analysisSetupsMap[setup] = { pnl: 0, wins: 0, total: 0 };
            analysisSetupsMap[setup].total += 1;
            analysisSetupsMap[setup].pnl += trade.pnl;
            if (trade.pnl > 0) analysisSetupsMap[setup].wins += 1;
          });
        }

        if (trade.psychology) {
          analysisPsychologyMap[trade.psychology] = (analysisPsychologyMap[trade.psychology] || 0) + 1;
        }
      }
    });

    // 2. Process Performance Trades (tradesToProcess)
    tradesToProcess.forEach(trade => {
      if (trade.symbol) {
        if (!pairsMap[trade.symbol]) pairsMap[trade.symbol] = { pnl: 0, wins: 0, total: 0 };
        pairsMap[trade.symbol].total += 1;
        pairsMap[trade.symbol].pnl += trade.pnl;
        if (trade.pnl > 0) pairsMap[trade.symbol].wins += 1;
      }

      if (trade.setups && Array.isArray(trade.setups)) {
        trade.setups.forEach((setup: string) => {
          if (!setupsMap[setup]) setupsMap[setup] = { pnl: 0, wins: 0, total: 0 };
          setupsMap[setup].total += 1;
          setupsMap[setup].pnl += trade.pnl;
          if (trade.pnl > 0) setupsMap[setup].wins += 1;
        });
      }

      if (trade.psychology) {
        psychologyMap[trade.psychology] = (psychologyMap[trade.psychology] || 0) + 1;
      }

      if (trade.timeframe) {
        if (!timeframeMap[trade.timeframe]) timeframeMap[trade.timeframe] = { pnl: 0, wins: 0, total: 0 };
        timeframeMap[trade.timeframe].total += 1;
        timeframeMap[trade.timeframe].pnl += trade.pnl;
        if (trade.pnl > 0) timeframeMap[trade.timeframe].wins += 1;
      }
    });

    // 3. Process Bottom Trades (tradesToProcess)
    tradesToProcess.forEach(trade => {
      let tradeDate;
      if (trade.date) {
        const parts = trade.date.split(/[-/.]/);
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            tradeDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          } else {
            tradeDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
          }
        } else {
          tradeDate = new Date(trade.date);
        }
      } else if (trade.closeTime?.toDate) {
        tradeDate = trade.closeTime.toDate();
      } else if (trade.closeTime) {
        tradeDate = new Date(trade.closeTime);
      } else {
        return;
      }

      const tMonth = tradeDate.getMonth();
      const tYear = tradeDate.getFullYear();
      const dateStr = `${tradeDate.getFullYear()}-${(tradeDate.getMonth() + 1).toString().padStart(2, '0')}-${tradeDate.getDate().toString().padStart(2, '0')}`;

      if (tMonth === currentMonth && tYear === currentYear) {
        currentMonthPnl += trade.pnl;
        currentMonthTrades += 1;
        currentMonthTradingDays.add(dateStr);
      } else if (tMonth === prevMonth && tYear === prevYear) {
        prevMonthPnl += trade.pnl;
        prevMonthTrades += 1;
      }
    });

    const currentMonthLosses = currentMonthPnl < 0 ? Math.abs(currentMonthPnl) : 0;

    let totalWithdrawnFromActive = 0;
    withdrawals.forEach(w => {
      // Assuming withdrawals apply to all active capital globally
      // (or you could filter by date if needed, but totalBalance is usually all-time)
      totalWithdrawnFromActive += (w.amount || 0);
    });

    const totalBalance = totalSize + totalPnl - totalWithdrawnFromActive;
    const winRate = totalTrades > 0 ? ((totalWins / totalTrades) * 100).toFixed(1) : '0.0';
    const averageRr = tradesWithRr > 0 ? (totalRr / tradesWithRr).toFixed(2) : '0.00';

    // Gerar dados para o gráfico (Saldo cumulativo)
    let runningBalance = totalSize;
    const sortedDates = Object.keys(historyMap).sort();
    const chartData = sortedDates.map(date => {
      runningBalance += historyMap[date].pnl;
      return {
        date,
        balance: runningBalance,
        loss: runningBalance < totalSize ? totalSize - runningBalance : 0
      };
    });

    // Se não houver dados, adicionar um ponto inicial
    if (chartData.length === 0) {
      chartData.push({ date: new Date().toISOString().split('T')[0], balance: totalSize, loss: 0 });
    }

    const bestSetups = Object.entries(setupsMap)
      .map(([name, stats]) => ({ name, ...stats, winRate: (stats.wins / stats.total) * 100 }))
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 3);

    const bestPairs = Object.entries(pairsMap)
      .map(([name, stats]) => ({ name, ...stats, winRate: (stats.wins / stats.total) * 100 }))
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 3);

    const predominantPsychology = Object.entries(psychologyMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const bestTimeframes = Object.entries(timeframeMap)
      .map(([name, stats]) => ({ name, ...stats, winRate: (stats.wins / stats.total) * 100 }))
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 3);

    const analysisBestSetups = Object.entries(analysisSetupsMap)
      .map(([name, stats]) => ({ name, ...stats, winRate: (stats.wins / stats.total) * 100 }))
      .sort((a, b) => b.pnl - a.pnl);

    const analysisBestPairs = Object.entries(analysisPairsMap)
      .map(([name, stats]) => ({ name, ...stats, winRate: (stats.wins / stats.total) * 100 }))
      .sort((a, b) => b.pnl - a.pnl);

    const analysisBestSessions = Object.entries(analysisSessionsMap)
      .map(([name, stats]) => ({ name, ...stats, winRate: (stats.wins / stats.total) * 100 }))
      .sort((a, b) => b.pnl - a.pnl);

    const analysisPredominantPsychology = Object.entries(analysisPsychologyMap)
      .sort((a, b) => b[1] - a[1]);

    const analysisBestTimeframes = Object.entries(analysisTimeframeMap)
      .map(([name, stats]) => ({ name, ...stats, winRate: (stats.wins / stats.total) * 100 }))
      .sort((a, b) => b.pnl - a.pnl);

    const bestDaysOfWeek = Object.entries(daysOfWeekMap)
      .map(([name, stats]) => ({ name, ...stats, winRate: (stats.wins / stats.total) * 100 }))
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 3);

    const analysisBestDaysOfWeek = Object.entries(analysisDaysOfWeekMap)
      .map(([name, stats]) => ({ name, ...stats, winRate: (stats.wins / stats.total) * 100 }))
      .sort((a, b) => b.pnl - a.pnl);

    const todayDate = new Date();
    const todayStr = `${todayDate.getFullYear()}-${(todayDate.getMonth() + 1).toString().padStart(2, '0')}-${todayDate.getDate().toString().padStart(2, '0')}`;
    const todayPnl = historyMap[todayStr]?.pnl || 0;

    return {
      totalSize, 
      totalProfitTarget,
      totalMaxLoss,
      totalDailyLoss,
      hasProfitTarget,
      hasMaxLoss,
      hasDailyLoss,
      maxLossPeriod,
      totalBalance, 
      totalPnl,
      totalLossSum, // NEW
      todayPnl,
      totalTrades, 
      winRate, 
      averageRr,
      prevMonthPnl, 
      currentMonthPnl,
      currentMonthLosses,
      prevMonthTrades,
      currentMonthTrades,
      currentMonthTradingDays: currentMonthTradingDays.size,
      chartData, 
      historyMap,
      tradesToProcess,
      filteredHistoryTrades,
      accountsToProcess,
      bestSetups,
      bestPairs,
      predominantPsychology,
      bestTimeframes,
      bestDaysOfWeek,
      analysisBestSetups,
      analysisBestPairs,
      analysisBestSessions,
      analysisPredominantPsychology,
      analysisBestTimeframes,
      analysisBestDaysOfWeek,
      analysisTotalTrades,
      pairsMap, // NEW
      setupsMap // NEW
    };
  }, [selectedAccount, calendarDate, accounts, trades, analysisDateRange, tradeTypeFilter, objectives, withdrawals]);

  // --- LÓGICA DO CALENDÁRIO ---
  const calendarCells = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDayOfWeek = new Date(year, month, 1).getDay();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const cells = [];

    // Dias do mês anterior
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      cells.push({ date: daysInPrevMonth - i, muted: true });
    }

    // Dias do mês atual
    const todayDate = new Date();
    const todayStr = `${todayDate.getFullYear()}-${(todayDate.getMonth() + 1).toString().padStart(2, '0')}-${todayDate.getDate().toString().padStart(2, '0')}`;
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
      const dayData = data.historyMap[dateStr];
      cells.push({
        date: i,
        muted: false,
        trades: dayData?.trades || 0,
        pnl: dayData?.pnl || 0,
        isWin: (dayData?.pnl || 0) > 0,
        isLoss: (dayData?.pnl || 0) < 0,
        active: dateStr === todayStr
      });
    }

    // Dias do próximo mês para completar a grade (múltiplo de 7)
    const totalCells = cells.length;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remainingCells; i++) {
      cells.push({ date: i, muted: true });
    }

    return cells;
  }, [calendarDate, data.historyMap]);

  const handlePrevMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  };

  const monthName = calendarDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  const currentMonthName = calendarDate.toLocaleString('pt-BR', { month: 'long' });
  const prevDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1);
  const prevMonthName = prevDate.toLocaleString('pt-BR', { month: 'long' });
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const [sortPairBy, setSortPairBy] = useState<'pnl' | 'trades' | 'winRate'>('pnl');
  const [sortSetupBy, setSortSetupBy] = useState<'pnl' | 'trades' | 'winRate'>('pnl');
  const [analysisMetric, setAnalysisMetric] = useState<'losses' | 'gains' | 'net'>('net');

  const sortedPairs = useMemo(() => {
    return Object.entries(data.pairsMap || {})
      .map(([name, stats]: any) => ({ name, ...stats, winRate: (stats.wins / stats.total) * 100 }))
      .sort((a, b) => {
        if (sortPairBy === 'pnl') return a.pnl - b.pnl; // Sort by worst PnL by default 
        if (sortPairBy === 'trades') return b.total - a.total;
        return b.winRate - a.winRate;
      });
  }, [data.pairsMap, sortPairBy]);

  const worstPairs = useMemo(() => {
    return Object.entries(data.pairsMap || {})
      .map(([name, stats]: any) => ({ name, ...stats }))
      .filter(p => p.pnl < 0)
      .sort((a, b) => a.pnl - b.pnl) // Biggest losses first
      .slice(0, 5);
  }, [data.pairsMap]);

  const handleMulticaixa = () => {
    window.dispatchEvent(new CustomEvent('navigateToTab', { detail: 'plans' }));
  };

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto w-full space-y-8 relative">
      {isExpired && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 backdrop-blur-md bg-background/80">
          <div className="bg-surface-container border border-error/30 p-10 rounded-[32px] max-w-xl w-full text-center shadow-2xl shadow-error/20 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-error/10 text-error rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-5xl">lock</span>
            </div>
            <h2 className="text-3xl font-black text-on-surface mb-4 font-headline">Plano Expirado</h2>
            <p className="text-on-surface-variant mb-8 leading-relaxed">
              Sua assinatura <span className="text-on-surface font-bold">{(userPlan?.plan_type || 'Mensal').toUpperCase()}</span> expirou. 
              Para continuar analisando seus trades e visualizando os gráficos de performance, realize a atualização do seu plano.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={handleMulticaixa}
                className="flex-1 bg-primary text-on-primary py-4 rounded-2xl font-black hover:scale-105 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3"
              >
                <span className="material-symbols-outlined">payments</span>
                Renovar Subscription
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Nav / Tabs */}
      {limitReached && (
        <div className="bg-error/10 border border-error/50 p-6 rounded-[24px] mb-6 flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-top duration-500">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-error/20 rounded-full flex items-center justify-center text-error">
              <span className="material-symbols-outlined">warning</span>
            </div>
            <div>
              <p className="text-error font-black text-lg">Limite de Contas Atingido!</p>
              <p className="text-on-surface-variant text-sm max-w-lg">
                O seu plano {userPlan?.plan_type} permite apenas {userPlan?.account_limit} contas MT5. 
                Faça upgrade agora para desbloquear o monitoramento de mais contas simultâneas.
              </p>
            </div>
          </div>
          <button 
            onClick={handleMulticaixa}
            className="w-full md:w-auto bg-error-container text-on-error-container px-8 py-3 rounded-xl font-bold hover:brightness-110 transition-all flex items-center justify-center gap-2"
          >
            <span>Fazer Upgrade</span>
            <span className="material-symbols-outlined text-sm">rocket_launch</span>
          </button>
        </div>
      )}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex flex-wrap gap-2 bg-surface-container-low border border-outline-variant/20 p-1.5 rounded-2xl md:rounded-full w-full lg:w-auto" style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'flex-start',
          alignItems: 'center',
          gap: '8px'
        }}>
          <button 
            onClick={() => setActiveDashboardTab('objectives')}
            className={`${activeDashboardTab === 'objectives' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'} px-4 py-2.5 md:px-6 md:py-3 rounded-xl md:rounded-full text-sm md:text-base font-bold transition-colors flex-1 lg:flex-none text-center`}
          >
            Performance Geral
          </button>
          <button 
            onClick={() => setActiveDashboardTab('history')}
            className={`${activeDashboardTab === 'history' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'} px-4 py-2.5 md:px-6 md:py-3 rounded-xl md:rounded-full text-sm md:text-base font-bold transition-colors flex-1 lg:flex-none text-center`}
          >
            Histórico de Trades
          </button>
          <button 
            onClick={() => setActiveDashboardTab('analysis')}
            className={`${activeDashboardTab === 'analysis' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'} px-4 py-2.5 md:px-6 md:py-3 rounded-xl md:rounded-full text-sm md:text-base font-bold transition-colors flex-1 lg:flex-none text-center`}
          >
            Análises
          </button>
          <button 
            onClick={() => setActiveDashboardTab('info')}
            className={`${activeDashboardTab === 'info' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'} px-4 py-2.5 md:px-6 md:py-3 rounded-xl md:rounded-full text-sm md:text-base font-bold transition-colors flex-1 lg:flex-none text-center`}
          >
            {selectedAccount === 'all' ? 'Contas' : 'Info da Conta'}
          </button>
        </div>
        <div className="flex flex-wrap gap-4 items-center w-full lg:w-auto justify-between lg:justify-end">
          <div className="relative flex-1 lg:flex-none min-w-[180px]">
            <select 
              value={tradeTypeFilter}
              onChange={(e) => setTradeTypeFilter(e.target.value as any)}
              className="w-full bg-surface-container-low border border-outline-variant/20 text-on-surface pl-6 pr-12 py-2.5 md:py-3 rounded-full text-sm md:text-base font-bold outline-none appearance-none cursor-pointer"
            >
              {showForexFilter && showObFilter && <option value="all">Soma (Todas)</option>}
              {showForexFilter && <option value="forex">Forex & Índices</option>}
              {showObFilter && <option value="ob">Opções Binárias</option>}
            </select>
            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface text-lg pointer-events-none">expand_more</span>
          </div>
          <div className="relative flex-1 lg:flex-none min-w-[200px]">
            <select 
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/20 text-on-surface pl-6 pr-12 py-2.5 md:py-3 rounded-full text-sm md:text-base font-bold outline-none appearance-none cursor-pointer"
            >
              <option value="all">Todas as Contas (Soma)</option>
              {accounts.filter(acc => {
                if (acc.status === 'inactive') return false;
                const tt = acc.tradeType || 'forex';
                if (visibleMarkets === 'forex' && tt === 'ob') return false;
                if (visibleMarkets === 'ob' && tt !== 'ob') return false;
                if (tradeTypeFilter !== 'all' && tt !== tradeTypeFilter) return false;
                return true;
              }).map(acc => (
                <option key={acc.id} value={acc.id}>
                  Conta {acc.accountNumber} - {acc.accountType}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface text-lg pointer-events-none">expand_more</span>
          </div>
          <button 
            onClick={() => setIsAddAccountModalOpen(true)}
            className="w-10 h-10 md:w-12 md:h-12 bg-primary text-on-primary rounded-full flex items-center justify-center hover:brightness-110 transition-all shrink-0 shadow-lg shadow-primary/20"
            title="Adicionar Nova Conta"
          >
            <span className="material-symbols-outlined">add</span>
          </button>


        </div>
      </div>

      {/* Conditional Content */}
      <div ref={dashboardRef} className="space-y-8 bg-background pt-4 pb-8 max-w-full overflow-hidden">
        {activeDashboardTab === 'objectives' && (
          <>
            {/* Statistics */}
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 md:p-8">
        <h3 className="text-on-surface font-bold mb-6 md:mb-8 text-base md:text-xl font-headline">Estatísticas Globais</h3>
        <div className={`grid gap-6 md:gap-8 text-center lg:divide-x divide-outline-variant/20 ${tradeTypeFilter === 'all' ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
          <div className="pb-6 lg:pb-0 border-b lg:border-b-0 border-outline-variant/20">
            <p className="text-on-surface-variant text-sm md:text-base mb-2 md:mb-4">Lucro/Prejuízo do Dia</p>
            <p className={`font-bold text-2xl md:text-4xl ${data.todayPnl >= 0 ? 'text-secondary' : 'text-error'}`}>
              {data.todayPnl >= 0 ? '+' : ''}{formatCurrency(data.todayPnl)}
            </p>
          </div>
          {tradeTypeFilter !== 'all' && (
            <>
              <div className="pb-6 lg:pb-0 border-b lg:border-b-0 border-outline-variant/20">
                <p className="text-on-surface-variant text-sm md:text-base mb-2 md:mb-4">Nº de trades</p>
                <p className="text-on-surface font-bold text-2xl md:text-4xl">{data.totalTrades}</p>
              </div>
              <div className="pb-6 lg:pb-0 border-b lg:border-b-0 border-outline-variant/20">
                 <p className="text-on-surface-variant text-sm md:text-base mb-2 md:mb-4">Taxa de Acerto</p>
                 <p className="text-on-surface font-bold text-2xl md:text-4xl">{data.winRate}%</p>
              </div>
            </>
          )}
          <div>
            <p className="text-on-surface-variant text-sm md:text-base mb-2 md:mb-4">Capital Geral</p>
            <p className="text-on-surface font-bold text-2xl md:text-4xl">{formatCurrency(data.totalBalance)}</p>
            {data.hasProfitTarget && (
              <p className="text-on-surface-variant text-xs md:text-sm mt-2">
                Meta: {formatCurrency(data.totalProfitTarget)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Monthly Comparison */}
      <div className="space-y-8 md:space-y-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 md:mb-6">
          <h3 className="text-on-surface font-bold text-xl md:text-2xl font-headline">Visão geral dos objetivos</h3>
        </div>

        {(data.hasProfitTarget || data.hasMaxLoss || data.hasDailyLoss) ? (
          <div className="flex flex-col gap-6 md:gap-8">
            {/* Lucro (Full Width) */}
            <div className="bg-surface-container-low border border-secondary/30 rounded-2xl p-6 md:p-8">
              <h4 className="text-on-surface font-bold text-base md:text-lg mb-6 md:mb-8 font-headline">Lucro</h4>
              <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6 mb-8 md:mb-10">
                <div>
                  <p className="text-on-surface-variant text-xs md:text-sm mb-1 md:mb-2">Lucro Atual</p>
                  <p className={`${data.totalPnl >= 0 ? 'text-secondary' : 'text-error'} font-bold text-base md:text-xl`}>
                    {data.totalPnl >= 0 ? '+' : ''}{formatCurrency(data.totalPnl)}
                  </p>
                </div>
                <div>
                  <p className="text-on-surface-variant text-xs md:text-sm mb-1 md:mb-2">Meta De Lucro</p>
                  <p className="text-on-surface font-bold text-base md:text-xl">{data.hasProfitTarget ? formatCurrency(data.totalProfitTarget) : 'Não definida'}</p>
                </div>
                <div>
                  <p className="text-on-surface-variant text-xs md:text-sm mb-1 md:mb-2">Lucro Remanescente</p>
                  <p className="text-on-surface font-bold text-base md:text-xl">
                    {data.hasProfitTarget ? formatCurrency(Math.max(0, data.totalProfitTarget - data.totalPnl)) : '-'}
                  </p>
                </div>
              </div>
              {data.hasProfitTarget && (
                <>
                  <div className="relative w-full h-2 md:h-3 bg-surface-container-highest rounded-full mt-8 md:mt-12">
                    <div className="absolute left-0 top-0 h-full bg-secondary rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, (data.totalPnl / data.totalProfitTarget) * 100))}%` }}></div>
                  </div>
                  <div className="flex justify-between text-xs md:text-sm text-on-surface-variant mt-3 md:mt-4">
                    <span>$0.00</span>
                    <span>{formatCurrency(data.totalProfitTarget)}</span>
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              {/* Perda Máxima */}
              <div className="bg-surface-container-low border border-error/30 rounded-2xl p-6 md:p-8">
                <h4 className="text-on-surface font-bold text-base md:text-lg mb-6 md:mb-8 font-headline">Perda Máxima</h4>
                <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6 mb-8 md:mb-10">
                  <div>
                    <p className="text-on-surface-variant text-xs md:text-sm mb-1 md:mb-2">Perda Atual</p>
                    <p className="text-error font-bold text-base md:text-xl">
                      {formatCurrency(data.totalPnl < 0 ? Math.abs(data.totalPnl) : 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-on-surface-variant text-xs md:text-sm mb-1 md:mb-2">Limite Máximo De Perda</p>
                    <p className="text-on-surface font-bold text-base md:text-xl">{data.hasMaxLoss ? formatCurrency(data.totalMaxLoss) : 'Não definida'}</p>
                  </div>
                  <div>
                    <p className="text-on-surface-variant text-xs md:text-sm mb-1 md:mb-2">Perda Máxima Restante</p>
                    <p className="text-on-surface font-bold text-base md:text-xl">
                      {data.hasMaxLoss ? formatCurrency(Math.max(0, data.totalMaxLoss - (data.totalPnl < 0 ? Math.abs(data.totalPnl) : 0))) : '-'}
                    </p>
                  </div>
                </div>
                {data.hasMaxLoss && (
                  <>
                    <div className="relative w-full h-2 md:h-3 bg-surface-container-highest rounded-full mt-8 md:mt-12">
                      <div className="absolute left-0 top-0 h-full bg-error rounded-full transition-all duration-500" style={{ width: `${Math.min(100, ((data.totalPnl < 0 ? Math.abs(data.totalPnl) : 0) / data.totalMaxLoss) * 100)}%` }}></div>
                    </div>
                    <div className="flex justify-between text-xs md:text-sm text-on-surface-variant mt-3 md:mt-4">
                      <span>$0.00</span>
                      <span>{formatCurrency(data.totalMaxLoss)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Perda Diária */}
              <div className="bg-surface-container-low border border-error/30 rounded-2xl p-6 md:p-8">
                <h4 className="text-on-surface font-bold text-base md:text-lg mb-6 md:mb-8 font-headline">Perda Diária</h4>
                <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6 mb-8 md:mb-10">
                  <div>
                    <p className="text-on-surface-variant text-xs md:text-sm mb-1 md:mb-2">Perda Atual</p>
                    <p className="text-error font-bold text-base md:text-xl">
                      {formatCurrency(data.todayPnl < 0 ? Math.abs(data.todayPnl) : 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-on-surface-variant text-xs md:text-sm mb-1 md:mb-2">Meta De Perda Diária</p>
                    <p className="text-on-surface font-bold text-base md:text-xl">{data.hasDailyLoss ? formatCurrency(data.totalDailyLoss) : 'Não definida'}</p>
                  </div>
                  <div>
                    <p className="text-on-surface-variant text-xs md:text-sm mb-1 md:mb-2">Perda Diária Restante</p>
                    <p className="text-on-surface font-bold text-base md:text-xl">
                      {data.hasDailyLoss ? formatCurrency(Math.max(0, data.totalDailyLoss - (data.todayPnl < 0 ? Math.abs(data.todayPnl) : 0))) : '-'}
                    </p>
                  </div>
                </div>
                {data.hasDailyLoss && (
                  <>
                    <div className="relative w-full h-2 md:h-3 bg-surface-container-highest rounded-full mt-8 md:mt-12">
                      <div className="absolute left-0 top-0 h-full bg-error rounded-full transition-all duration-500" style={{ width: `${Math.min(100, ((data.todayPnl < 0 ? Math.abs(data.todayPnl) : 0) / data.totalDailyLoss) * 100)}%` }}></div>
                    </div>
                    <div className="flex justify-between text-xs md:text-sm text-on-surface-variant mt-3 md:mt-4">
                      <span>$0.00</span>
                      <span>{formatCurrency(data.totalDailyLoss)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-surface-container-low border border-outline-variant/15 rounded-3xl p-8 text-center space-y-4 max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto text-3xl">
              🎯
            </div>
            <h4 className="text-lg font-black text-on-surface uppercase tracking-tight">Nenhum Objetivo Definido</h4>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Não existem objetivos de trading (como meta de lucro, limite de perda diária ou semanal) definidos para a conta ou mercado atualmente selecionado. 
            </p>
            <p className="text-xs text-on-surface-variant/80">
              Acesse a página de <strong>Configurações</strong> &gt; aba <strong>Objetivos e Limites Mensais</strong> para definir as suas metas e passar a acompanhar o seu progresso neste painel.
            </p>
          </div>
        )}

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 md:mb-6 mt-8 md:mt-12">
            <h3 className="text-on-surface font-bold text-xl md:text-2xl font-headline">Análise de Performance</h3>
          </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 md:gap-8">
          {/* Best Setups */}
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 md:p-8">
            <h4 className="text-on-surface font-bold text-base md:text-lg mb-6 md:mb-8 font-headline flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">monitoring</span>
              Melhores Setups
            </h4>
            <div className="space-y-4">
              {data.bestSetups.length > 0 ? data.bestSetups.map((setup, idx) => (
                <div key={idx} className="flex justify-between items-center p-4 bg-surface-container rounded-xl">
                  <div>
                    <p className="font-bold text-on-surface">{setup.name}</p>
                    <p className="text-xs text-on-surface-variant">Win Rate: {setup.winRate.toFixed(1)}% ({setup.wins}/{setup.total})</p>
                  </div>
                  <p className={`font-bold ${setup.pnl >= 0 ? 'text-secondary' : 'text-error'}`}>
                    {setup.pnl >= 0 ? '+' : ''}{formatCurrency(setup.pnl)}
                  </p>
                </div>
              )) : (
                <p className="text-on-surface-variant text-sm">Nenhum setup registrado ainda.</p>
              )}
            </div>
          </div>

          {/* Best Pairs */}
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 md:p-8">
            <h4 className="text-on-surface font-bold text-base md:text-lg mb-6 md:mb-8 font-headline flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">currency_exchange</span>
              Top 3 Pares
            </h4>
            <div className="space-y-4">
              {data.bestPairs.length > 0 ? data.bestPairs.map((pair, idx) => (
                <div key={idx} className="flex justify-between items-center p-4 bg-surface-container rounded-xl">
                  <div>
                    <p className="font-bold text-on-surface">{pair.name}</p>
                    <p className="text-xs text-on-surface-variant">Win Rate: {pair.winRate.toFixed(1)}% ({pair.wins}/{pair.total})</p>
                  </div>
                  <p className={`font-bold ${pair.pnl >= 0 ? 'text-secondary' : 'text-error'}`}>
                    {pair.pnl >= 0 ? '+' : ''}{formatCurrency(pair.pnl)}
                  </p>
                </div>
              )) : (
                <p className="text-on-surface-variant text-sm">Nenhum par registrado ainda.</p>
              )}
            </div>
          </div>

          {/* Predominant Psychology */}
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 md:p-8">
            <h4 className="text-on-surface font-bold text-base md:text-lg mb-6 md:mb-8 font-headline flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary">psychology</span>
              Estados Psicológicos
            </h4>
            <div className="space-y-4">
              {data.predominantPsychology.length > 0 ? data.predominantPsychology.map(([state, count], idx) => (
                <div key={idx} className="flex justify-between items-center p-4 bg-surface-container rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {state === 'Calmo' && '🧘'}
                      {state === 'Entusiasmado' && '⚡'}
                      {state === 'Ansioso' && '😰'}
                      {state === 'Cansado' && '😴'}
                    </span>
                    <p className="font-bold text-on-surface uppercase text-sm">{state}</p>
                  </div>
                  <p className="font-bold text-on-surface-variant">{count} trades</p>
                </div>
              )) : (
                <p className="text-on-surface-variant text-sm">Nenhum estado psicológico registrado ainda.</p>
              )}
            </div>
          </div>

          {/* Best Days of Week */}
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 md:p-8">
            <h4 className="text-on-surface font-bold text-base md:text-lg mb-6 md:mb-8 font-headline flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">calendar_month</span>
              Melhor Dia da Semana
            </h4>
            <div className="space-y-4">
              {data.bestDaysOfWeek.length > 0 ? data.bestDaysOfWeek.map((day, idx) => (
                <div key={idx} className="flex justify-between items-center p-4 bg-surface-container rounded-xl">
                  <div>
                    <p className="font-bold text-on-surface">{day.name}</p>
                    <p className="text-xs text-on-surface-variant">{day.wins} {day.wins === 1 ? 'ganho' : 'ganhos'} em {day.total} {day.total === 1 ? 'trade' : 'trades'}</p>
                  </div>
                  <p className={`font-bold ${day.pnl >= 0 ? 'text-secondary' : 'text-error'}`}>
                    {day.pnl >= 0 ? '+' : ''}{formatCurrency(day.pnl)}
                  </p>
                </div>
              )) : (
                <p className="text-on-surface-variant text-sm">Nenhum dia registrado ainda.</p>
              )}
            </div>
          </div>

          {/* Best Timeframes */}
          {tradeTypeFilter === 'ob' && (
            <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 md:p-8">
              <h4 className="text-on-surface font-bold text-base md:text-lg mb-6 md:mb-8 font-headline flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">schedule</span>
                Melhores Timeframes
              </h4>
              <div className="space-y-4">
                {data.bestTimeframes.length > 0 ? data.bestTimeframes.map((tf, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-surface-container rounded-xl">
                    <div>
                      <p className="font-bold text-on-surface">{tf.name}</p>
                      <p className="text-xs text-on-surface-variant">Win Rate: {tf.winRate.toFixed(1)}% ({tf.wins}/{tf.total})</p>
                    </div>
                    <p className={`font-bold ${tf.pnl >= 0 ? 'text-secondary' : 'text-error'}`}>
                      {tf.pnl >= 0 ? '+' : ''}{formatCurrency(tf.pnl)}
                    </p>
                  </div>
                )) : (
                  <p className="text-on-surface-variant text-sm">Nenhum timeframe registrado ainda.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-8 md:space-y-12 mt-8 md:mt-12">
        {!data.hasProfitTarget && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 md:p-8">
              <h4 className="text-on-surface font-bold text-base md:text-lg mb-6 md:mb-8 font-headline flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">history</span>
                Lucro mês de {capitalize(prevMonthName)}
              </h4>
                <div className="flex flex-col items-center justify-center h-full min-h-[150px]">
                  <p className="text-on-surface font-bold text-4xl mb-2">{formatCurrency(data.prevMonthPnl)}</p>
                </div>
              </div>
              <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 md:p-8">
                <h4 className="text-on-surface font-bold text-base md:text-lg mb-6 md:mb-8 font-headline flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">account_balance_wallet</span>
                  Lucro mês de {capitalize(currentMonthName)}
                </h4>
                <div className="flex flex-col justify-center h-full min-h-[150px]">
                  <div className="flex justify-between items-end mb-4">
                    <div>
                      <p className="text-on-surface-variant text-sm mb-1">Saldo Atual</p>
                      <p className={`font-bold text-4xl ${data.totalPnl >= 0 ? 'text-secondary' : 'text-error'}`}>
                        {data.totalPnl >= 0 ? '+' : ''}{formatCurrency(data.totalPnl)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        )}
        </div>

      {/* Financial Performance Chart */}
      <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 md:mb-10">
          <h3 className="text-on-surface font-bold text-xl md:text-2xl font-headline">Evolução do Saldo</h3>
          <div className="flex items-center gap-4">
            <div className="flex gap-1 bg-surface-container border border-outline-variant/20 p-1.5 rounded-full">
              <button className="bg-primary text-on-primary px-6 py-2 rounded-full text-sm font-bold">Saldo Total</button>
            </div>
          </div>
        </div>
        <div className="h-[400px] md:h-[500px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.chartData} margin={{ top: 10, right: 30, left: 40, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#44474e" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#c4c6d0' }} 
                dy={15} 
                padding={{ left: 30, right: 30 }} 
                tickFormatter={(val) => {
                  if (!val) return '';
                  const parts = val.split('-');
                  if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
                  return val;
                }}
              />
              <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#c4c6d0' }} tickFormatter={(val) => formatCurrency(val)} width={80} />
              <Tooltip content={<CustomTooltip formatCurrency={formatCurrency} />} cursor={{ stroke: '#44474e', strokeWidth: 1, strokeDasharray: '3 3' }} />
              <Legend verticalAlign="top" height={48} iconType="circle" wrapperStyle={{ fontSize: '14px', color: '#e2e2e9' }} />
              <Line type="monotone" dataKey="balance" name="Saldo (Balance)" stroke="#c3f5ff" strokeWidth={4} dot={{ r: 5, fill: '#c3f5ff', strokeWidth: 0 }} activeDot={{ r: 8, strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-outline-variant/20">
          <button onClick={handlePrevMonth} className="material-symbols-outlined text-on-surface-variant hover:text-on-surface transition-colors text-2xl">chevron_left</button>
          <span className="text-on-surface font-bold text-lg md:text-xl capitalize">{monthName}</span>
          <button onClick={handleNextMonth} className="material-symbols-outlined text-on-surface-variant hover:text-on-surface transition-colors text-2xl">chevron_right</button>
        </div>
        <div className="w-full overflow-x-auto">
          <div className="min-w-[500px]">
            <div className="grid grid-cols-7 text-center border-b border-outline-variant/20">
              {['DOMINGO', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO'].map(day => (
                <div key={day} className="py-4 text-xs md:text-sm font-bold text-on-surface-variant border-r border-outline-variant/20 last:border-0 hidden md:block">{day}</div>
              ))}
              {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map(day => (
                <div key={day} className="py-4 text-xs font-bold text-on-surface-variant border-r border-outline-variant/20 last:border-0 md:hidden">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarCells.map((cell, idx) => (
                <CalendarCell key={idx} {...cell} />
              ))}
            </div>
          </div>
        </div>
      </div>
        </>
      )}

      {activeDashboardTab === 'analysis' && (
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h3 className="text-on-surface font-bold text-xl md:text-2xl font-headline">Análises Detalhadas</h3>
            <DateRangePicker
              dateRange={analysisDateRange}
              onDateRangeChange={setAnalysisDateRange}
            />
          </div>



          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            {/* Best Setups */}
            <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 md:p-8">
              <h4 className="text-on-surface font-bold text-base md:text-lg mb-6 md:mb-8 font-headline flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">monitoring</span>
                Melhores Setups
              </h4>
              <div className="space-y-4">
                {data.analysisBestSetups.length > 0 ? (
                  <div className="flex flex-col xl:flex-row items-center gap-6">
                    <div className="w-full xl:w-1/2 h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.analysisBestSetups}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="wins"
                            nameKey="name"
                          >
                            {data.analysisBestSetups.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={['#c3f5ff', '#ffb4ab', '#b4f2c0', '#f2b4e5'][index % 4]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#1e1e24', border: 'none', borderRadius: '8px', color: '#e2e2e9' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-full xl:w-1/2 space-y-4">
                      {data.analysisBestSetups.slice(0, 3).map((setup, idx) => (
                        <div key={idx} className="flex justify-between items-center p-4 bg-surface-container rounded-xl">
                          <div>
                            <p className="font-bold text-on-surface flex items-center gap-2 text-sm">
                              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ['#c3f5ff', '#ffb4ab', '#b4f2c0', '#f2b4e5'][idx % 4] }}></span>
                              <span className="truncate">{setup.name}</span>
                            </p>
                            <p className="text-xs text-on-surface-variant">Win Rate: {setup.winRate.toFixed(1)}% ({setup.wins}/{setup.total})</p>
                          </div>
                          <p className={`font-bold shrink-0 ${setup.pnl >= 0 ? 'text-secondary' : 'text-error'}`}>
                            {setup.pnl >= 0 ? '+' : ''}{formatCurrency(setup.pnl)}
                          </p>
                        </div>
                      ))}
                      {data.analysisBestSetups.length > 3 && (
                        <button 
                          onClick={() => openAnalysisModal('setups')} 
                          className="w-full py-2 flex items-center justify-center gap-2 text-primary font-bold text-sm bg-primary/10 rounded-xl hover:bg-primary/20 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            open_in_new
                          </span>
                          Ver Todos
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-on-surface-variant text-sm">Nenhum setup registrado no período.</p>
                )}
              </div>
            </div>

            {/* Best Pairs */}
            <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 md:p-8">
              <h4 className="text-on-surface font-bold text-base md:text-lg mb-6 md:mb-8 font-headline flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">currency_exchange</span>
                Pares Performados
              </h4>
              <div className="space-y-4">
                {data.analysisBestPairs.length > 0 ? (
                  <div className="flex flex-col xl:flex-row items-center gap-6">
                    <div className="w-full xl:w-1/2 h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.analysisBestPairs}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="wins"
                            nameKey="name"
                          >
                            {data.analysisBestPairs.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={['#b4f2c0', '#c3f5ff', '#ffb4ab', '#f2b4e5'][index % 4]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#1e1e24', border: 'none', borderRadius: '8px', color: '#e2e2e9' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-full xl:w-1/2 space-y-4">
                      {data.analysisBestPairs.slice(0, 3).map((pair, idx) => (
                        <div key={idx} className="flex justify-between items-center p-4 bg-surface-container rounded-xl">
                          <div>
                            <p className="font-bold text-on-surface flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ['#b4f2c0', '#c3f5ff', '#ffb4ab', '#f2b4e5'][idx % 4] }}></span>
                              <span className="truncate">{pair.name}</span>
                            </p>
                            <p className="text-xs text-on-surface-variant">Win Rate: {pair.winRate.toFixed(1)}% ({pair.wins}/{pair.total})</p>
                          </div>
                          <p className={`font-bold shrink-0 ${pair.pnl >= 0 ? 'text-secondary' : 'text-error'}`}>
                            {pair.pnl >= 0 ? '+' : ''}{formatCurrency(pair.pnl)}
                          </p>
                        </div>
                      ))}
                      {data.analysisBestPairs.length > 3 && (
                        <button 
                          onClick={() => openAnalysisModal('pairs')} 
                          className="w-full py-2 flex items-center justify-center gap-2 text-secondary font-bold text-sm bg-secondary/10 rounded-xl hover:bg-secondary/20 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            open_in_new
                          </span>
                          Ver Todos
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-on-surface-variant text-sm">Nenhum par registrado no período.</p>
                )}
              </div>
            </div>

            {/* Best Sessions */}
            <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 md:p-8">
              <h4 className="text-on-surface font-bold text-base md:text-lg mb-6 md:mb-8 font-headline flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ffb4ab]">schedule</span>
                Sessões
              </h4>
              <div className="space-y-4">
                {data.analysisBestSessions.length > 0 ? (
                  <div className="flex flex-col xl:flex-row items-center gap-6">
                    <div className="w-full xl:w-1/2 h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.analysisBestSessions}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="wins"
                            nameKey="name"
                          >
                            {data.analysisBestSessions.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={['#ffb4ab', '#b4f2c0', '#c3f5ff', '#f2b4e5', '#fdd38b'][index % 5]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#1e1e24', border: 'none', borderRadius: '8px', color: '#e2e2e9' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-full xl:w-1/2 space-y-4">
                      {data.analysisBestSessions.slice(0, 3).map((session, idx) => (
                        <div key={idx} className="flex justify-between items-center p-4 bg-surface-container rounded-xl">
                          <div>
                            <p className="font-bold text-on-surface flex items-center gap-2 text-sm">
                              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ['#ffb4ab', '#b4f2c0', '#c3f5ff', '#f2b4e5', '#fdd38b'][idx % 5] }}></span>
                              <span className="truncate">{session.name}</span>
                            </p>
                            <p className="text-xs text-on-surface-variant">Win Rate: {session.winRate.toFixed(1)}% ({session.wins}/{session.total})</p>
                          </div>
                          <p className={`font-bold shrink-0 ${session.pnl >= 0 ? 'text-secondary' : 'text-error'}`}>
                            {session.pnl >= 0 ? '+' : ''}{formatCurrency(session.pnl)}
                          </p>
                        </div>
                      ))}
                      {data.analysisBestSessions.length > 3 && (
                        <button 
                          onClick={() => openAnalysisModal('sessions')} 
                          className="w-full py-2 flex items-center justify-center gap-2 text-[#ffb4ab] font-bold text-sm bg-[#ffb4ab]/10 rounded-xl hover:bg-[#ffb4ab]/20 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            open_in_new
                          </span>
                          Ver Todos
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-on-surface-variant text-sm">Nenhuma sessão registrada no período.</p>
                )}
              </div>
            </div>

            {/* Predominant Psychology */}
            <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 md:p-8">
              <h4 className="text-on-surface font-bold text-base md:text-lg mb-6 md:mb-8 font-headline flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary">psychology</span>
                Psicológicos Predominantes
              </h4>
              <div className="space-y-4">
                {data.analysisPredominantPsychology.length > 0 ? (
                  <div className="flex flex-col xl:flex-row items-center gap-6">
                    <div className="w-full xl:w-1/2 h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.analysisPredominantPsychology.map(([name, value]) => ({ name, value }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            nameKey="name"
                          >
                            {data.analysisPredominantPsychology.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={['#f2b4e5', '#c3f5ff', '#b4f2c0', '#ffb4ab'][index % 4]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#1e1e24', border: 'none', borderRadius: '8px', color: '#e2e2e9' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-full xl:w-1/2 space-y-4">
                      {data.analysisPredominantPsychology.slice(0, 3).map(([state, count], idx) => (
                        <div key={idx} className="flex justify-between items-center p-4 bg-surface-container rounded-xl">
                          <div className="flex items-center gap-3">
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ['#f2b4e5', '#c3f5ff', '#b4f2c0', '#ffb4ab'][idx % 4] }}></span>
                            <span className="text-2xl shrink-0">
                              {state === 'Calmo' && '🧘'}
                              {state === 'Entusiasmado' && '⚡'}
                              {state === 'Ansioso' && '😰'}
                              {state === 'Cansado' && '😴'}
                            </span>
                            <p className="font-bold text-on-surface uppercase text-sm truncate">{state}</p>
                          </div>
                          <p className="font-bold text-on-surface-variant shrink-0">{count} trades</p>
                        </div>
                      ))}
                      {data.analysisPredominantPsychology.length > 3 && (
                        <button 
                          onClick={() => openAnalysisModal('psychology')} 
                          className="w-full py-2 flex items-center justify-center gap-2 text-tertiary font-bold text-sm bg-tertiary/10 rounded-xl hover:bg-tertiary/20 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            open_in_new
                          </span>
                          Ver Todos
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-on-surface-variant text-sm">Nenhum estado psicológico registrado no período.</p>
                )}
              </div>
            </div>

            {/* Best Days of Week */}
            <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 md:p-8">
              <h4 className="text-on-surface font-bold text-base md:text-lg mb-6 md:mb-8 font-headline flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">calendar_month</span>
                Melhor Dia da Semana
              </h4>
              <div className="space-y-4">
                {data.analysisBestDaysOfWeek.length > 0 ? (
                  <div className="flex flex-col xl:flex-row items-center gap-6">
                    <div className="w-full xl:w-1/2 h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.analysisBestDaysOfWeek}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="wins"
                            nameKey="name"
                          >
                            {data.analysisBestDaysOfWeek.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={['#c3f5ff', '#ffb4ab', '#b4f2c0', '#f2b4e5'][index % 4]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#1e1e24', border: 'none', borderRadius: '8px', color: '#e2e2e9' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-full xl:w-1/2 space-y-4">
                      {data.analysisBestDaysOfWeek.slice(0, 3).map((day, idx) => (
                        <div key={idx} className="flex justify-between items-center p-4 bg-surface-container rounded-xl">
                          <div>
                            <p className="font-bold text-on-surface flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ['#c3f5ff', '#ffb4ab', '#b4f2c0', '#f2b4e5'][idx % 4] }}></span>
                              <span className="truncate">{day.name}</span>
                            </p>
                            <p className="text-xs text-on-surface-variant">{day.wins} {day.wins === 1 ? 'ganho' : 'ganhos'} em {day.total} {day.total === 1 ? 'trade' : 'trades'}</p>
                          </div>
                          <p className={`font-bold shrink-0 ${day.pnl >= 0 ? 'text-secondary' : 'text-error'}`}>
                            {day.pnl >= 0 ? '+' : ''}{formatCurrency(day.pnl)}
                          </p>
                        </div>
                      ))}
                      {data.analysisBestDaysOfWeek.length > 3 && (
                        <button 
                          onClick={() => openAnalysisModal('days')} 
                          className="w-full py-2 flex items-center justify-center gap-2 text-primary font-bold text-sm bg-primary/10 rounded-xl hover:bg-primary/20 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            open_in_new
                          </span>
                          Ver Todos
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-on-surface-variant text-sm">Nenhum dia registrado no período.</p>
                )}
              </div>
            </div>

            {/* Maiores Perdas por Ativo */}
            <div className="bg-surface-container-low border border-error/20 rounded-2xl p-6 md:p-8">
              <h4 className="text-on-surface font-bold text-base md:text-lg mb-6 md:mb-8 font-headline flex items-center gap-2">
                <span className="material-symbols-outlined text-error">trending_down</span>
                Maiores Perdas por Ativo
              </h4>
              <div className="space-y-4">
                {worstPairs.length > 0 ? worstPairs.map((pair, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-surface-container rounded-xl border-l-4 border-l-error">
                    <div>
                      <p className="font-bold text-on-surface">{pair.name}</p>
                      <p className="text-xs text-on-surface-variant">{pair.total} trades realizados</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-error">-{formatCurrency(Math.abs(pair.pnl))}</p>
                      <p className="text-[10px] text-on-surface-variant">Lucro total negativo</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-on-surface-variant text-sm">Nenhuma perda registrada no período.</p>
                )}
              </div>
            </div>

            {/* Best Timeframes (Only show if OB is selected) */}
            {tradeTypeFilter === 'ob' && (
              <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 md:p-8">
                <h4 className="text-on-surface font-bold text-base md:text-lg mb-6 md:mb-8 font-headline flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">schedule</span>
                  Melhores Timeframes
                </h4>
                <div className="space-y-4">
                  {data.analysisBestTimeframes.length > 0 ? (
                    <div className="flex flex-col xl:flex-row items-center gap-6">
                      <div className="w-full xl:w-1/2 h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={data.analysisBestTimeframes}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="wins"
                              nameKey="name"
                            >
                              {data.analysisBestTimeframes.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={['#ffb4ab', '#b4f2c0', '#c3f5ff', '#f2b4e5'][index % 4]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#1e1e24', border: 'none', borderRadius: '8px', color: '#e2e2e9' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="w-full xl:w-1/2 space-y-4">
                        {data.analysisBestTimeframes.slice(0, 3).map((tf, idx) => (
                          <div key={idx} className="flex justify-between items-center p-4 bg-surface-container rounded-xl">
                            <div>
                              <p className="font-bold text-on-surface flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ['#ffb4ab', '#b4f2c0', '#c3f5ff', '#f2b4e5'][idx % 4] }}></span>
                                <span className="truncate">{tf.name}</span>
                              </p>
                              <p className="text-xs text-on-surface-variant">Win Rate: {tf.winRate.toFixed(1)}% ({tf.wins}/{tf.total})</p>
                            </div>
                            <p className={`font-bold shrink-0 ${tf.pnl >= 0 ? 'text-secondary' : 'text-error'}`}>
                              {tf.pnl >= 0 ? '+' : ''}{formatCurrency(tf.pnl)}
                            </p>
                          </div>
                        ))}
                        {data.analysisBestTimeframes.length > 3 && (
                          <button 
                            onClick={() => openAnalysisModal('timeframes')} 
                            className="w-full py-2 flex items-center justify-center gap-2 text-primary font-bold text-sm bg-primary/10 rounded-xl hover:bg-primary/20 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              open_in_new
                            </span>
                            Ver Todos
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-on-surface-variant text-sm">Nenhum timeframe registrado no período.</p>
                  )}
                </div>
              </div>
            )}

            {/* Volume Financeiro do Período */}
            <div className={`bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 md:p-8 flex flex-col justify-between ${tradeTypeFilter === 'ob' ? '' : 'lg:col-span-2'}`}>
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <h4 className="text-on-surface font-bold text-base md:text-lg font-headline flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">analytics</span>
                    Volume Financeiro do Período & Trades
                  </h4>
                  {/* Metric Switcher */}
                  <div className="flex bg-surface-container rounded-xl p-1 border border-outline-variant/10">
                    <button 
                      onClick={() => setAnalysisMetric('losses')}
                      className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${analysisMetric === 'losses' ? 'bg-error text-white shadow' : 'text-on-surface-variant hover:text-on-surface'}`}
                    >
                      Perdas
                    </button>
                    <button 
                      onClick={() => setAnalysisMetric('gains')}
                      className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${analysisMetric === 'gains' ? 'bg-secondary text-on-secondary shadow' : 'text-on-surface-variant hover:text-on-surface'}`}
                    >
                      Ganhos
                    </button>
                    <button 
                      onClick={() => setAnalysisMetric('net')}
                      className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${analysisMetric === 'net' ? 'bg-outline-variant text-on-surface shadow' : 'text-on-surface-variant hover:text-on-surface'}`}
                    >
                      Líquido
                    </button>
                  </div>
                </div>

                <div className="flex justify-center mb-6">
                  <div className="bg-surface-container border border-outline-variant/20 px-6 py-3 rounded-xl text-center shadow-sm">
                    <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-1">Total de Trades (Período)</p>
                    <p className="text-on-surface font-black text-2xl">{data.analysisTotalTrades}</p>
                  </div>
                </div>

                {/* Big Metric Display */}
                <div className="flex flex-col items-center justify-center text-center py-4">
                  {analysisMetric === 'losses' && (
                    <>
                      <div className="w-16 h-16 bg-error/10 text-error rounded-full flex items-center justify-center mb-3">
                        <span className="material-symbols-outlined text-3xl font-bold">trending_down</span>
                      </div>
                      <span className="text-on-surface-variant text-xs uppercase tracking-widest font-bold mb-1">Volume Total de Perdas</span>
                      <p className="text-error font-black text-4xl mb-2">-{formatCurrency(data.filteredHistoryTrades.filter(t => t.pnl < 0).reduce((acc, t) => acc + Math.abs(t.pnl), 0))}</p>
                      <p className="text-on-surface-variant text-xs max-w-xs mt-1">
                        Soma das operações negativas no período filtrado.
                      </p>
                    </>
                  )}
                  {analysisMetric === 'gains' && (
                    <>
                      <div className="w-16 h-16 bg-secondary/10 text-secondary rounded-full flex items-center justify-center mb-3">
                        <span className="material-symbols-outlined text-3xl font-bold">trending_up</span>
                      </div>
                      <span className="text-on-surface-variant text-xs uppercase tracking-widest font-bold mb-1">Volume Total de Ganhos</span>
                      <p className="text-secondary font-black text-4xl mb-2">+{formatCurrency(data.filteredHistoryTrades.filter(t => t.pnl > 0).reduce((acc, t) => acc + t.pnl, 0))}</p>
                      <p className="text-on-surface-variant text-xs max-w-xs mt-1">
                        Soma das operações positivas no período filtrado.
                      </p>
                    </>
                  )}
                  {analysisMetric === 'net' && (
                    (() => {
                      const netPnl = data.filteredHistoryTrades.reduce((acc, t) => acc + t.pnl, 0);
                      const isProfit = netPnl >= 0;
                      return (
                        <>
                          <div className={`w-16 h-16 ${isProfit ? 'bg-secondary/10 text-secondary' : 'bg-error/10 text-error'} rounded-full flex items-center justify-center mb-3`}>
                            <span className="material-symbols-outlined text-3xl font-bold">balance</span>
                          </div>
                          <span className="text-on-surface-variant text-xs uppercase tracking-widest font-bold mb-1">Resultado Líquido do Período</span>
                          <p className={`${isProfit ? 'text-secondary' : 'text-error'} font-black text-4xl mb-2`}>
                            {isProfit ? '+' : ''}{formatCurrency(netPnl)}
                          </p>
                          <p className="text-on-surface-variant text-xs max-w-xs mt-1">
                            Saldo total líquido das operações no período filtrado.
                          </p>
                        </>
                      );
                    })()
                  )}
                </div>
              </div>

              {/* Side-by-side Mini Overview */}
              <div className="grid grid-cols-3 gap-2 border-t border-outline-variant/10 pt-4 text-center mt-auto">
                <div>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Perdas</p>
                  <p className="text-error font-bold text-xs">-{formatCurrency(data.filteredHistoryTrades.filter(t => t.pnl < 0).reduce((acc, t) => acc + Math.abs(t.pnl), 0))}</p>
                </div>
                <div>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Ganhos</p>
                  <p className="text-secondary font-bold text-xs">+{formatCurrency(data.filteredHistoryTrades.filter(t => t.pnl > 0).reduce((acc, t) => acc + t.pnl, 0))}</p>
                </div>
                <div>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Líquido</p>
                  {(() => {
                    const netVal = data.filteredHistoryTrades.reduce((acc, t) => acc + t.pnl, 0);
                    return (
                      <p className={`${netVal >= 0 ? 'text-secondary' : 'text-error'} font-bold text-xs`}>
                        {netVal >= 0 ? '+' : ''}{formatCurrency(netVal)}
                      </p>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeDashboardTab === 'history' && (
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h3 className="text-on-surface font-bold text-xl md:text-2xl font-headline">Histórico de Trades</h3>
            <div className="flex gap-4 items-center">
              <select 
                value={historyResultFilter}
                onChange={(e) => setHistoryResultFilter(e.target.value as any)}
                className="bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-2 text-sm font-bold text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="all">Todos os Resultados</option>
                <option value="win">Apenas Ganhos (Win)</option>
                <option value="loss">Apenas Perdas (Loss)</option>
              </select>
              <DateRangePicker
                dateRange={analysisDateRange}
                onDateRangeChange={setAnalysisDateRange}
              />
            </div>
          </div>
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 md:p-8">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm md:text-base text-center border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-on-surface-variant text-xs md:text-sm font-medium">
                    <th className="font-normal pb-4">Order</th>
                    <th className="font-normal pb-4">Action</th>
                    <th className="font-normal pb-4">Profit/Loss</th>
                    {tradeTypeFilter !== 'ob' && <th className="font-normal pb-4">Commission</th>}
                    {/* R:R hidden as per user request to avoid layout deformation */}
                    {/* {tradeTypeFilter !== 'ob' && <th className="font-normal pb-4">R:R</th>} */}
                    {tradeTypeFilter !== 'ob' && <th className="font-normal pb-4">Swap</th>}
                    <th className="font-normal pb-4">Symbol</th>
                    <th className="font-normal pb-4">Price</th>
                    <th className="font-normal pb-4">Volume</th>
                    <th className="font-normal pb-4">Date</th>
                    <th className="font-normal pb-4">Entry</th>
                    {tradeTypeFilter === 'ob' && <th className="font-normal pb-4">Timeframe</th>}
                    <th className="font-normal pb-4">Conta</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filteredByResult = data.filteredHistoryTrades.filter(t => {
                      if (historyResultFilter === 'win') return t.pnl > 0;
                      if (historyResultFilter === 'loss') return t.pnl < 0;
                      return true;
                    });
                    const itemsPerPage = 40;
                    const totalItems = filteredByResult.length;
                    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
                    const startIndex = (historyCurrentPage - 1) * itemsPerPage;
                    const paginatedTrades = filteredByResult.slice(startIndex, startIndex + itemsPerPage);

                    // Ensure page bounds (in case data changes)
                    if (historyCurrentPage > totalPages) {
                      setTimeout(() => setHistoryCurrentPage(totalPages), 0);
                    }

                    return paginatedTrades.map((trade: any, i: number) => (
                  <tr key={i} className="bg-surface-container hover:bg-surface-container-highest transition-colors">
                    <td className="py-5 px-4 rounded-l-2xl text-on-surface-variant whitespace-nowrap">{trade.ticket}</td>
                    <td className={`py-5 px-4 whitespace-nowrap ${trade.action === 'Buy' ? 'text-secondary' : 'text-error'}`}>{trade.action}</td>
                    <td className={`py-5 px-4 whitespace-nowrap ${trade.pnl >= 0 ? 'text-secondary' : 'text-error'}`}>
                      {trade.pnl >= 0 ? '+' : ''}{formatCurrency(trade.pnl)}
                    </td>
                    {tradeTypeFilter !== 'ob' && <td className="py-5 px-4 text-on-surface-variant whitespace-nowrap">{trade.commission?.toFixed(1) || '0.0'}</td>}
                    {/* R:R hidden as per user request to avoid layout deformation */}
                    {/* {tradeTypeFilter !== 'ob' && <td className="py-5 px-4 text-on-surface-variant whitespace-nowrap text-primary font-bold">{trade.rr ? `1:${trade.rr}` : '-'}</td>} */}
                    {tradeTypeFilter !== 'ob' && <td className="py-5 px-4 text-on-surface-variant whitespace-nowrap">{trade.swap?.toFixed(1) || '0.0'}</td>}
                    <td className="py-5 px-4 text-on-surface whitespace-nowrap">{trade.symbol}</td>
                    <td className="py-5 px-4 text-on-surface whitespace-nowrap">${trade.openPrice?.toFixed(2)}</td>
                    <td className="py-5 px-4 text-on-surface whitespace-nowrap">{trade.size}</td>
                    <td className="py-5 px-4 text-on-surface-variant whitespace-nowrap">
                      {trade.date ? trade.date : trade.closeTime?.toDate ? trade.closeTime.toDate().toLocaleDateString('pt-BR') : trade.closeTime ? new Date(trade.closeTime).toLocaleDateString('pt-BR') : ''}
                    </td>
                    <td className="py-5 px-4 text-on-surface-variant whitespace-nowrap">{trade.entryTime || 'NA'}</td>
                    {tradeTypeFilter === 'ob' && <td className="py-5 px-4 text-on-surface-variant whitespace-nowrap">{trade.timeframe || 'NA'}</td>}
                    <td className="py-5 px-4 rounded-r-2xl text-on-surface-variant whitespace-nowrap">
                      {trade.account_login || (() => {
                        const acc = accounts.find(a => a.id === trade.accountId);
                        return acc ? `${acc.accountNumber}` : (trade.accountId || 'Manual');
                      })()}
                    </td>
                  </tr>
                ));
               })()}
              </tbody>
            </table>
            
           {(() => {
              const filteredByResult = data.filteredHistoryTrades.filter(t => {
                if (historyResultFilter === 'win') return t.pnl > 0;
                if (historyResultFilter === 'loss') return t.pnl < 0;
                return true;
              });
              const itemsPerPage = 40;
              const totalItems = filteredByResult.length;
              const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

              if (totalPages <= 1) return null;

              const handlePrev = () => {
                if (historyCurrentPage > 1) setHistoryCurrentPage(p => p - 1);
              };
              const handleNext = () => {
                if (historyCurrentPage < totalPages) setHistoryCurrentPage(p => p + 1);
              };

              return (
                <div className="flex justify-center items-center gap-6 mt-8">
                  <button onClick={handlePrev} disabled={historyCurrentPage === 1} className="text-on-surface-variant hover:text-on-surface disabled:opacity-50 disabled:hover:text-on-surface-variant transition-opacity">
                    <span className="material-symbols-outlined text-xl">chevron_left</span>
                  </button>
                  <div className="flex gap-2 sm:gap-3 overflow-x-auto max-w-[60vw] pb-2 custom-scrollbar">
                    {Array.from({ length: totalPages }).map((_, idx) => {
                      const p = idx + 1;
                      if (totalPages > 10) {
                        if (p === 1 || p === totalPages || (p >= historyCurrentPage - 2 && p <= historyCurrentPage + 2)) {
                          return (
                            <button 
                              key={p}
                              onClick={() => setHistoryCurrentPage(p)}
                              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full font-bold text-xs sm:text-sm flex flex-shrink-0 items-center justify-center min-w-[36px] sm:min-w-[40px] transition-colors ${historyCurrentPage === p ? 'bg-surface-container-highest text-on-surface' : 'text-on-surface-variant hover:bg-surface-container'}`}
                            >
                              {p.toString().padStart(2, '0')}
                            </button>
                          );
                        } else if (p === historyCurrentPage - 3 || p === historyCurrentPage + 3) {
                          return <span key={p} className="text-on-surface-variant flex items-center px-1">...</span>;
                        }
                        return null;
                      }
                      
                      return (
                        <button 
                          key={p}
                          onClick={() => setHistoryCurrentPage(p)}
                          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full font-bold text-xs sm:text-sm flex flex-shrink-0 items-center justify-center min-w-[36px] sm:min-w-[40px] transition-colors ${historyCurrentPage === p ? 'bg-surface-container-highest text-on-surface' : 'text-on-surface-variant hover:bg-surface-container'}`}
                        >
                          {p.toString().padStart(2, '0')}
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={handleNext} disabled={historyCurrentPage === totalPages} className="text-on-surface-variant hover:text-on-surface disabled:opacity-50 disabled:hover:text-on-surface-variant transition-opacity">
                    <span className="material-symbols-outlined text-xl">chevron_right</span>
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
        </div>
      )}

      {activeDashboardTab === 'info' && (
        <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 md:p-10">
          {selectedAccount === 'all' ? (
            <div>
              <h3 className="text-on-surface font-bold text-xl md:text-2xl font-headline mb-8">Todas as Contas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {accounts.map(acc => {
                  const accTrades = trades.filter(t => t.accountId === acc.id);
                  const accPnl = accTrades.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
                  const accBalance = Number(acc.initialBalance) + accPnl;
                  return (
                    <div key={acc.id} className="bg-surface-container border border-outline-variant/20 rounded-2xl p-6 hover:border-primary/30 transition-colors">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-col">
                          <h4 className="text-on-surface font-bold text-lg">Conta {acc.accountNumber}</h4>
                          <p className="text-on-surface-variant text-sm">{acc.accountType} - {acc.phase || 'Fase 1'}</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-on-surface-variant text-sm">Capital Inicial</span>
                          <span className="text-on-surface font-bold">{formatCurrency(acc.initialBalance)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-on-surface-variant text-sm">P&L Atual</span>
                          <span className={`font-bold ${accPnl >= 0 ? 'text-secondary' : 'text-error'}`}>
                            {accPnl >= 0 ? '+' : ''}{formatCurrency(accPnl)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-outline-variant/10">
                          <span className="text-on-surface-variant text-sm">Balanço Atual</span>
                          <span className="text-on-surface font-bold text-lg">{formatCurrency(accBalance)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-12">
                <div className="w-20 h-20 rounded-full bg-surface-container-highest flex items-center justify-center overflow-hidden shrink-0">
                  {dbPhoto || auth.currentUser?.photoURL ? (
                    <img src={dbPhoto || auth.currentUser?.photoURL || ''} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-5xl text-on-surface-variant">person</span>
                  )}
                </div>
                <div>
                  <h2 className="text-on-surface font-bold text-2xl md:text-3xl font-headline">{dbName || auth.currentUser?.displayName || 'Usuário'}</h2>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-on-surface-variant text-base">{accounts.find(a => a.id === selectedAccount)?.accountNumber}</span>
                    <button className="text-on-surface-variant hover:text-on-surface transition-colors">
                      <span className="material-symbols-outlined text-base">content_copy</span>
                    </button>
                  </div>
                  <p className="text-on-surface-variant text-sm mt-1 uppercase tracking-wider">
                    {`${accounts.find(a => a.id === selectedAccount)?.accountType} - ${accounts.find(a => a.id === selectedAccount)?.phase || 'Fase 1'}`}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-20 gap-y-10">
                {/* Left Column */}
                <div className="space-y-8">
                  <div className="flex justify-between items-center border-b border-outline-variant/10 pb-4">
                    <span className="text-on-surface-variant text-base">Challenge</span>
                    <span className="text-on-surface font-bold text-base md:text-lg">{accounts.find(a => a.id === selectedAccount)?.accountType}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-outline-variant/10 pb-4">
                    <span className="text-on-surface-variant text-base">Fase</span>
                    <span className="text-on-surface font-bold text-base md:text-lg">{accounts.find(a => a.id === selectedAccount)?.phase || 'Fase 1'}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-outline-variant/10 pb-4">
                    <span className="text-on-surface-variant text-base">Broker</span>
                    <span className="text-on-surface font-bold text-base md:text-lg">{accounts.find(a => a.id === selectedAccount)?.broker}</span>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-8">
                  <div className="flex justify-between items-center border-b border-outline-variant/10 pb-4">
                    <span className="text-on-surface-variant text-base">Starting balance</span>
                    <span className="text-on-surface font-bold text-base md:text-lg">{formatCurrency(accounts.find(a => a.id === selectedAccount)?.initialBalance || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-outline-variant/10 pb-4">
                    <span className="text-on-surface-variant text-base">Profit Target</span>
                    <span className="text-on-surface font-bold text-base md:text-lg">{data.hasProfitTarget ? formatCurrency(data.totalProfitTarget) : '-'}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-outline-variant/10 pb-4">
                    <span className="text-on-surface-variant text-base">Account start date</span>
                    <span className="text-on-surface font-bold text-base md:text-lg">
                      {accounts.find(a => a.id === selectedAccount)?.createdAt?.toDate ? accounts.find(a => a.id === selectedAccount)?.createdAt.toDate().toLocaleDateString('pt-BR') : '-'}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
      </div>

      {activeAnalysisModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`bg-surface-container border border-outline-variant/20 rounded-2xl flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200 transition-all ${isAnalysisModalExpanded ? 'w-[98vw] h-[98vh] max-w-none p-4 md:p-6' : 'max-w-2xl w-full max-h-[85vh] p-6 md:p-8'}`}>
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="text-xl font-bold font-headline text-on-surface flex items-center justify-between w-full">
                <span>
                  {activeAnalysisModal === 'setups' && 'Todos os Setups'}
                  {activeAnalysisModal === 'pairs' && 'Todos os Pares'}
                  {activeAnalysisModal === 'sessions' && 'Todas as Sessões'}
                  {activeAnalysisModal === 'psychology' && 'Todos os Psicológicos'}
                  {activeAnalysisModal === 'days' && 'Todos os Dias da Semana'}
                  {activeAnalysisModal === 'timeframes' && 'Todos os Timeframes'}
                </span>
              </h3>
              <div className="flex items-center gap-2">
                {isAnalysisModalExpanded && (
                  <div className="flex bg-surface-container-high rounded-full p-1 mr-2 border border-outline-variant/10 shrink-0">
                    <button onClick={() => setAnalysisModalChartType('pie')} className={`px-3 py-1.5 text-xs font-bold rounded-full transition-colors flex items-center gap-1 ${analysisModalChartType === 'pie' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'}`}><span className="material-symbols-outlined text-[16px]">pie_chart</span><span className="hidden sm:inline">Pizza</span></button>
                    <button onClick={() => setAnalysisModalChartType('bar')} className={`px-3 py-1.5 text-xs font-bold rounded-full transition-colors flex items-center gap-1 ${analysisModalChartType === 'bar' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'}`}><span className="material-symbols-outlined text-[16px]">bar_chart</span><span className="hidden sm:inline">Barras</span></button>
                  </div>
                )}
                <button onClick={toggleAnalysisModalExpanded} className="text-on-surface-variant hover:text-on-surface transition-colors p-2 bg-surface-container-high rounded-full shrink-0">
                  <span className="material-symbols-outlined text-[20px]">{isAnalysisModalExpanded ? 'close_fullscreen' : 'open_in_full'}</span>
                </button>
                <button onClick={closeAnalysisModal} className="text-on-surface-variant hover:text-on-surface transition-colors p-2 bg-surface-container-high rounded-full shrink-0">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>
            
            <div className={`flex-1 overflow-hidden flex gap-6 ${isAnalysisModalExpanded ? 'flex-col lg:flex-row' : 'flex-col'}`}>
              {isAnalysisModalExpanded && (
                <div className="flex-1 bg-surface-container-high rounded-xl p-4 min-h-[300px] flex items-center justify-center w-full lg:w-2/3 h-full">
                   {(() => {
                      let chartData: any[] = [];
                      let colorMap = ['#c3f5ff', '#ffb4ab', '#b4f2c0', '#f2b4e5', '#fdd38b'];
                      if (activeAnalysisModal === 'setups') chartData = data.analysisBestSetups;
                      else if (activeAnalysisModal === 'pairs') chartData = data.analysisBestPairs;
                      else if (activeAnalysisModal === 'sessions') chartData = data.analysisBestSessions;
                      else if (activeAnalysisModal === 'psychology') {
                         chartData = data.analysisPredominantPsychology.map(([name, value]) => ({ name, wins: value }));
                         colorMap = ['#f2b4e5', '#c3f5ff', '#b4f2c0', '#ffb4ab'];
                      }
                      else if (activeAnalysisModal === 'days') chartData = data.analysisBestDaysOfWeek;
                      else if (activeAnalysisModal === 'timeframes') chartData = data.analysisBestTimeframes;

                      if (!chartData || chartData.length === 0) return <p className="text-on-surface-variant">Sem dados suficientes.</p>;

                      if (analysisModalChartType === 'pie') {
                        return (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius="40%"
                                outerRadius="70%"
                                paddingAngle={5}
                                dataKey="wins"
                                nameKey="name"
                              >
                                {chartData.map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={colorMap[index % colorMap.length]} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={{ backgroundColor: '#1e1e24', border: 'none', borderRadius: '8px', color: '#e2e2e9' }} />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        );
                      } else {
                        return (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#2d2d35" vertical={false} />
                              <XAxis dataKey="name" stroke="#71717a" tick={{ fill: '#71717a' }} />
                              <YAxis stroke="#71717a" tick={{ fill: '#71717a' }} />
                              <Tooltip contentStyle={{ backgroundColor: '#1e1e24', border: 'none', borderRadius: '8px', color: '#e2e2e9' }} cursor={{fill: '#2d2d35'}} />
                              <Bar dataKey="wins" radius={[4, 4, 0, 0]}>
                                {chartData.map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={colorMap[index % colorMap.length]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        );
                      }
                   })()}
                </div>
              )}

              <div className={`overflow-y-auto custom-scrollbar pr-2 flex flex-col space-y-3 ${isAnalysisModalExpanded ? 'w-full lg:w-1/3' : 'w-full flex-1'}`}>
                {activeAnalysisModal === 'setups' && data.analysisBestSetups.map((setup, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-surface-container-high rounded-xl">
                    <div>
                      <p className="font-bold text-on-surface flex items-center gap-2 text-sm">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ['#c3f5ff', '#ffb4ab', '#b4f2c0', '#f2b4e5'][idx % 4] }}></span>
                        <span className="truncate">{setup.name}</span>
                      </p>
                      <p className="text-xs text-on-surface-variant">Win Rate: {setup.winRate.toFixed(1)}% ({setup.wins}/{setup.total})</p>
                    </div>
                    <p className={`font-bold shrink-0 ${setup.pnl >= 0 ? 'text-secondary' : 'text-error'}`}>
                      {setup.pnl >= 0 ? '+' : ''}{formatCurrency(setup.pnl)}
                    </p>
                  </div>
                ))}
                {activeAnalysisModal === 'pairs' && data.analysisBestPairs.map((pair, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-surface-container-high rounded-xl">
                    <div>
                      <p className="font-bold text-on-surface flex items-center gap-2 text-sm">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ['#b4f2c0', '#c3f5ff', '#ffb4ab', '#f2b4e5'][idx % 4] }}></span>
                        <span className="truncate">{pair.name}</span>
                      </p>
                      <p className="text-xs text-on-surface-variant">Win Rate: {pair.winRate.toFixed(1)}% ({pair.wins}/{pair.total})</p>
                    </div>
                    <p className={`font-bold shrink-0 ${pair.pnl >= 0 ? 'text-secondary' : 'text-error'}`}>
                      {pair.pnl >= 0 ? '+' : ''}{formatCurrency(pair.pnl)}
                    </p>
                  </div>
                ))}
                {activeAnalysisModal === 'sessions' && data.analysisBestSessions.map((session, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-surface-container-high rounded-xl">
                    <div>
                      <p className="font-bold text-on-surface flex items-center gap-2 text-sm">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ['#ffb4ab', '#b4f2c0', '#c3f5ff', '#f2b4e5', '#fdd38b'][idx % 5] }}></span>
                        <span className="truncate">{session.name}</span>
                      </p>
                      <p className="text-xs text-on-surface-variant">Win Rate: {session.winRate.toFixed(1)}% ({session.wins}/{session.total})</p>
                    </div>
                    <p className={`font-bold shrink-0 ${session.pnl >= 0 ? 'text-secondary' : 'text-error'}`}>
                      {session.pnl >= 0 ? '+' : ''}{formatCurrency(session.pnl)}
                    </p>
                  </div>
                ))}
                {activeAnalysisModal === 'psychology' && data.analysisPredominantPsychology.map(([state, count], idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-surface-container-high rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ['#f2b4e5', '#c3f5ff', '#b4f2c0', '#ffb4ab'][idx % 4] }}></span>
                      <span className="text-2xl shrink-0">
                        {state === 'Calmo' && '🧘'}
                        {state === 'Entusiasmado' && '⚡'}
                        {state === 'Ansioso' && '😰'}
                        {state === 'Cansado' && '😴'}
                      </span>
                      <p className="font-bold text-on-surface uppercase text-sm truncate">{state}</p>
                    </div>
                    <p className="font-bold text-on-surface-variant shrink-0">{count} trades</p>
                  </div>
                ))}
                {activeAnalysisModal === 'days' && data.analysisBestDaysOfWeek.map((day, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-surface-container-high rounded-xl">
                    <div>
                      <p className="font-bold text-on-surface flex items-center gap-2 text-sm">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ['#c3f5ff', '#ffb4ab', '#b4f2c0', '#f2b4e5'][idx % 4] }}></span>
                        <span className="truncate">{day.name}</span>
                      </p>
                      <p className="text-xs text-on-surface-variant">{day.wins} {day.wins === 1 ? 'ganho' : 'ganhos'} em {day.total} {day.total === 1 ? 'trade' : 'trades'}</p>
                    </div>
                    <p className={`font-bold shrink-0 ${day.pnl >= 0 ? 'text-secondary' : 'text-error'}`}>
                      {day.pnl >= 0 ? '+' : ''}{formatCurrency(day.pnl)}
                    </p>
                  </div>
                ))}
                {activeAnalysisModal === 'timeframes' && data.analysisBestTimeframes.map((tf, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-surface-container-high rounded-xl">
                    <div>
                      <p className="font-bold text-on-surface flex items-center gap-2 text-sm">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ['#ffb4ab', '#b4f2c0', '#c3f5ff', '#f2b4e5'][idx % 4] }}></span>
                        <span className="truncate">{tf.name}</span>
                      </p>
                      <p className="text-xs text-on-surface-variant">Win Rate: {tf.winRate.toFixed(1)}% ({tf.wins}/{tf.total})</p>
                    </div>
                    <p className={`font-bold shrink-0 ${tf.pnl >= 0 ? 'text-secondary' : 'text-error'}`}>
                      {tf.pnl >= 0 ? '+' : ''}{formatCurrency(tf.pnl)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      {isAddAccountModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-6 md:p-10 w-full max-w-2xl shadow-2xl relative">
            <button 
              onClick={() => setIsAddAccountModalOpen(false)}
              className="absolute top-6 right-6 text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            
            <h2 className="text-2xl font-bold text-on-surface font-headline mb-2">Adicionar Nova Conta</h2>
            <p className="text-on-surface-variant text-sm mb-8">Insira os dados da sua nova conta de trading para acompanhamento.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Número da Conta</label>
                <input 
                  type="text" 
                  value={newAccount.accountNumber}
                  onChange={(e) => setNewAccount({...newAccount, accountNumber: e.target.value})}
                  className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface outline-none focus:border-primary transition-colors" 
                  placeholder="Ex: 506460" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Corretora (Broker)</label>
                <input 
                  type="text" 
                  value={newAccount.broker}
                  onChange={(e) => setNewAccount({...newAccount, broker: e.target.value})}
                  className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface outline-none focus:border-primary transition-colors" 
                  placeholder="Ex: matchtrade" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Saldo Inicial</label>
                <div className="flex gap-2">
                  <select 
                    value={newAccount.currency}
                    onChange={(e) => setNewAccount({...newAccount, currency: e.target.value})}
                    className="w-1/3 bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface outline-none focus:border-primary transition-colors appearance-none"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="AOA">AOA</option>
                    <option value="BRL">BRL</option>
                  </select>
                  <input 
                    type="number" 
                    value={newAccount.initialBalance}
                    onChange={(e) => setNewAccount({...newAccount, initialBalance: e.target.value})}
                    className="w-2/3 bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface outline-none focus:border-primary transition-colors" 
                    placeholder="10000" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Tipo de Conta</label>
                <select 
                  value={newAccount.accountType}
                  onChange={(e) => setNewAccount({...newAccount, accountType: e.target.value})}
                  className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface outline-none focus:border-primary transition-colors appearance-none"
                >
                  <option>5K Challenge</option>
                  <option>10K Challenge</option>
                  <option>25K Challenge</option>
                  <option>50K Challenge</option>
                  <option>100K Challenge</option>
                  <option>200K Challenge</option>
                  <option>Conta Real</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Fase</label>
                <select 
                  value={newAccount.phase}
                  onChange={(e) => setNewAccount({...newAccount, phase: e.target.value})}
                  className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface outline-none focus:border-primary transition-colors appearance-none"
                >
                  <option>Fase 1</option>
                  <option>Fase 2</option>
                  <option>Conta Live</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Mercado</label>
                <select 
                  value={newAccount.tradeType}
                  onChange={(e) => setNewAccount({...newAccount, tradeType: e.target.value as 'forex' | 'ob'})}
                  className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface outline-none focus:border-primary transition-colors appearance-none"
                >
                  <option value="forex">Forex / Índices</option>
                  <option value="ob">Opções Binárias (OB)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Data de Início *</label>
                <div className="relative">
                  <input 
                    type="date" 
                    value={newAccount.startDate}
                    onChange={(e) => setNewAccount({...newAccount, startDate: e.target.value})}
                    className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface outline-none focus:border-primary transition-colors" 
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-10 flex justify-end gap-4">
              <button 
                onClick={() => setIsAddAccountModalOpen(false)}
                className="px-6 py-3 rounded-xl text-on-surface-variant font-bold hover:bg-surface-container transition-colors"
                disabled={isSaving}
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveAccount}
                disabled={isSaving}
                className="px-8 py-3 rounded-xl bg-primary text-on-primary font-bold hover:brightness-110 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {isSaving ? 'Salvando...' : 'Salvar Conta'}
              </button>
            </div>
          </div>
        </div>
      )}
      <Modal {...modalConfig} />
    </div>
  );
}
