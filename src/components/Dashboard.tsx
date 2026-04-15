import React, { useState, useMemo, useEffect } from 'react';
import { DateRangePicker } from './DateRangePicker';
import { DateRange } from 'react-day-picker';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { collection, addDoc, onSnapshot, query, where, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useCurrency } from '../contexts/CurrencyContext';
import Modal from './Modal';

// --- COMPONENTES AUXILIARES ---
function CalendarCell({ date, muted, trades, pnl, isWin, isLoss, active }: any) {
  const { formatCurrency } = useCurrency();
  return (
    <div className={`min-h-[120px] p-3 border-r border-b border-outline-variant/20 relative ${active ? 'bg-surface-container border-l-2 border-l-secondary' : ''}`}>
      <span className={`absolute top-3 right-3 text-xs font-medium ${muted ? 'text-outline-variant/50' : 'text-on-surface-variant'}`}>{date}</span>
      {trades > 0 && (
        <div className="mt-8 space-y-1.5">
          <div className="flex justify-between text-[10px]">
            <span className="text-on-surface-variant">Trades:</span>
            <span className="text-on-surface font-bold">{trades}</span>
          </div>
          <div className={`flex justify-between text-[10px] px-1.5 py-1 rounded ${isWin ? 'bg-secondary/10 text-secondary' : isLoss ? 'bg-error/10 text-error' : 'bg-outline-variant/20 text-on-surface-variant'}`}>
            <span>P&L:</span>
            <span className="font-bold">{pnl > 0 ? '+' : ''}{formatCurrency(pnl)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label, formatCurrency }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface-container-high border border-outline-variant/20 p-4 rounded-xl shadow-xl">
        <p className="text-on-surface-variant text-xs mb-3 font-medium">{label}</p>
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
  const [tradeTypeFilter, setTradeTypeFilter] = useState<'all' | 'forex' | 'ob'>(() => {
    return (localStorage.getItem('dashboard_tradeTypeFilter') as any) || 'all';
  });
  const [calendarDate, setCalendarDate] = useState(new Date(2026, 3, 1)); // Abril 2026 como padrão
  const [activeDashboardTab, setActiveDashboardTab] = useState('objectives'); // 'objectives', 'history', 'analysis', 'info'
  const [analysisDateRange, setAnalysisDateRange] = useState<DateRange | undefined>();
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [showMasterPassword, setShowMasterPassword] = useState(false);
  const [showInvestorPassword, setShowInvestorPassword] = useState(false);
  const [objectives, setObjectives] = useState<any[]>([]);
  const [forceShowObFilter, setForceShowObFilter] = useState(false);

  // Load settings
  useEffect(() => {
    const savedObjectives = localStorage.getItem('app_objectives');
    if (savedObjectives) {
      setObjectives(JSON.parse(savedObjectives));
    }
    const savedForceShowObFilter = localStorage.getItem('app_force_show_ob_filter');
    if (savedForceShowObFilter) {
      setForceShowObFilter(savedForceShowObFilter === 'true');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('dashboard_selectedAccount', selectedAccount);
  }, [selectedAccount]);

  useEffect(() => {
    localStorage.setItem('dashboard_tradeTypeFilter', tradeTypeFilter);
  }, [tradeTypeFilter]);

  // Firebase Data State
  const [accounts, setAccounts] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);

  // Add Account Form State
  const [newAccount, setNewAccount] = useState({
    accountNumber: '',
    broker: '',
    initialBalance: '',
    accountType: '10K Challenge',
    phase: 'Fase 1',
    masterPassword: '',
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

  const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));

  useEffect(() => {
    if (!auth.currentUser) return;

    const accountsQuery = query(collection(db, 'accounts'), where('userId', '==', auth.currentUser.uid));
    const unsubscribeAccounts = onSnapshot(accountsQuery, (snapshot) => {
      const accountsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAccounts(accountsData);
    }, (error) => {
      console.error("Error fetching accounts: ", error);
    });

    const tradesQuery = query(collection(db, 'trades'), where('userId', '==', auth.currentUser.uid));
    const unsubscribeTrades = onSnapshot(tradesQuery, (snapshot) => {
      const tradesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTrades(tradesData);
    }, (error) => {
      console.error("Error fetching trades: ", error);
    });

    return () => {
      unsubscribeAccounts();
      unsubscribeTrades();
    };
  }, []);

  const hasObAccount = accounts.some(a => a.tradeType === 'ob');
  const showObFilter = hasObAccount || forceShowObFilter;

  useEffect(() => {
    if (!showObFilter && tradeTypeFilter === 'ob') {
      setTradeTypeFilter('all');
    }
  }, [showObFilter, tradeTypeFilter]);

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
      await addDoc(collection(db, 'accounts'), {
        accountNumber: newAccount.accountNumber,
        broker: newAccount.broker,
        initialBalance: Number(newAccount.initialBalance),
        accountType: newAccount.accountType,
        phase: newAccount.phase,
        masterPassword: newAccount.masterPassword,
        startDate: newAccount.startDate,
        currency: newAccount.currency,
        tradeType: newAccount.tradeType,
        status: 'active',
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp()
      });
      setIsAddAccountModalOpen(false);
      setNewAccount({
        accountNumber: '',
        broker: '',
        initialBalance: '',
        accountType: '10K Challenge',
        phase: 'Fase 1',
        masterPassword: '',
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
    const accountsToProcess = selectedAccount === 'all' ? accounts : accounts.filter(a => a.id === selectedAccount);
    const baseTradesToProcess = selectedAccount === 'all' ? trades : trades.filter(t => t.accountId === selectedAccount);

    let tradesToProcess = baseTradesToProcess;
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
    
    // Calculate total size from accounts
    accountsToProcess.forEach(acc => {
      const accTradeType = acc.tradeType || 'forex'; // Default to forex if missing
      if (tradeTypeFilter === 'all' || accTradeType === tradeTypeFilter) {
        totalSize += Number(acc.initialBalance || 0);
      }
    });

    // Calculate total profit target from objectives
    if (selectedAccount === 'all') {
      let hasMarketObj = false;
      if (tradeTypeFilter === 'all') {
        // Sum all market objectives
        objectives.forEach(obj => {
          if (obj.type === 'market') {
            if (obj.profitTarget) {
              totalProfitTarget += Number(obj.profitTarget);
              hasProfitTarget = true;
              hasMarketObj = true;
            }
            if (obj.maxLoss) {
              totalMaxLoss += Number(obj.maxLoss);
              hasMaxLoss = true;
              hasMarketObj = true;
            }
            if (obj.dailyLoss) {
              totalDailyLoss += Number(obj.dailyLoss);
              hasDailyLoss = true;
              hasMarketObj = true;
            }
          }
        });
      } else {
        // Sum objectives for the selected market type
        objectives.forEach(obj => {
          if (obj.type === 'market' && obj.targetId === tradeTypeFilter) {
            if (obj.profitTarget) {
              totalProfitTarget += Number(obj.profitTarget);
              hasProfitTarget = true;
              hasMarketObj = true;
            }
            if (obj.maxLoss) {
              totalMaxLoss += Number(obj.maxLoss);
              hasMaxLoss = true;
              hasMarketObj = true;
            }
            if (obj.dailyLoss) {
              totalDailyLoss += Number(obj.dailyLoss);
              hasDailyLoss = true;
              hasMarketObj = true;
            }
          }
        });
      }

      // Fallback: If no market objectives are set, sum the account objectives for the relevant accounts
      if (!hasMarketObj) {
        accountsToProcess.forEach(acc => {
          const accTradeType = acc.tradeType || 'forex';
          if (tradeTypeFilter === 'all' || accTradeType === tradeTypeFilter) {
            const accObj = objectives.find(obj => obj.type === 'account' && obj.targetId === acc.id);
            if (accObj) {
              if (accObj.profitTarget) {
                totalProfitTarget += Number(accObj.profitTarget);
                hasProfitTarget = true;
              }
              if (accObj.maxLoss) {
                totalMaxLoss += Number(accObj.maxLoss);
                hasMaxLoss = true;
              }
              if (accObj.dailyLoss) {
                totalDailyLoss += Number(accObj.dailyLoss);
                hasDailyLoss = true;
              }
            }
          }
        });
      }
    } else {
      // Find objective for the specific account
      const accountObjective = objectives.find(obj => obj.type === 'account' && obj.targetId === selectedAccount);
      if (accountObjective) {
        if (accountObjective.profitTarget) {
          totalProfitTarget = Number(accountObjective.profitTarget);
          hasProfitTarget = true;
        }
        if (accountObjective.maxLoss) {
          totalMaxLoss = Number(accountObjective.maxLoss);
          hasMaxLoss = true;
        }
        if (accountObjective.dailyLoss) {
          totalDailyLoss = Number(accountObjective.dailyLoss);
          hasDailyLoss = true;
        }
      }
    }

    let totalTrades = 0;
    let totalWins = 0;
    let totalPnl = 0;
    let totalRr = 0;
    let tradesWithRr = 0;
    
    // Para o comparativo mensal
    let prevMonthPnl = 0;
    let currentMonthPnl = 0;
    let currentMonthLosses = 0;
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

      const dateStr = tradeDate.toISOString().split('T')[0];

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
      totalPnl += trade.pnl;
      if (trade.rr) {
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
      const dateStr = tradeDate.toISOString().split('T')[0];
      
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
      const dateStr = tradeDate.toISOString().split('T')[0];

      if (tMonth === currentMonth && tYear === currentYear) {
        currentMonthPnl += trade.pnl;
        if (trade.pnl < 0) {
          currentMonthLosses += Math.abs(trade.pnl);
        }
        currentMonthTrades += 1;
        currentMonthTradingDays.add(dateStr);
      } else if (tMonth === prevMonth && tYear === prevYear) {
        prevMonthPnl += trade.pnl;
        prevMonthTrades += 1;
      }
    });

    const totalBalance = totalSize + totalPnl;
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
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 3);

    const analysisBestPairs = Object.entries(analysisPairsMap)
      .map(([name, stats]) => ({ name, ...stats, winRate: (stats.wins / stats.total) * 100 }))
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 3);

    const analysisPredominantPsychology = Object.entries(analysisPsychologyMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const analysisBestTimeframes = Object.entries(analysisTimeframeMap)
      .map(([name, stats]) => ({ name, ...stats, winRate: (stats.wins / stats.total) * 100 }))
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 3);

    const bestDaysOfWeek = Object.entries(daysOfWeekMap)
      .map(([name, stats]) => ({ name, ...stats, winRate: (stats.wins / stats.total) * 100 }))
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 3);

    const analysisBestDaysOfWeek = Object.entries(analysisDaysOfWeekMap)
      .map(([name, stats]) => ({ name, ...stats, winRate: (stats.wins / stats.total) * 100 }))
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 3);

    const todayStr = new Date().toISOString().split('T')[0];
    const todayPnl = historyMap[todayStr]?.pnl || 0;

    return {
      totalSize, 
      totalProfitTarget,
      totalMaxLoss,
      totalDailyLoss,
      hasProfitTarget,
      hasMaxLoss,
      hasDailyLoss,
      totalBalance, 
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
      analysisPredominantPsychology,
      analysisBestTimeframes,
      analysisBestDaysOfWeek,
      analysisTotalTrades
    };
  }, [selectedAccount, calendarDate, accounts, trades, analysisDateRange, tradeTypeFilter]);

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
    const todayStr = new Date().toISOString().split('T')[0];
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

  // Ensure active tab is valid when switching accounts
  useEffect(() => {
    if (selectedAccount === 'all' && activeDashboardTab === 'info') {
      setActiveDashboardTab('objectives');
    }
  }, [selectedAccount, activeDashboardTab]);

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto w-full space-y-8">
      {/* Top Nav / Tabs */}
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
          {selectedAccount !== 'all' && (
            <button 
              onClick={() => setActiveDashboardTab('info')}
              className={`${activeDashboardTab === 'info' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'} px-4 py-2.5 md:px-6 md:py-3 rounded-xl md:rounded-full text-sm md:text-base font-bold transition-colors flex-1 lg:flex-none text-center`}
            >
              Info da Conta
            </button>
          )}
        </div>
        <div className="flex gap-4 items-center w-full lg:w-auto justify-between lg:justify-end">
          <span className="bg-secondary text-on-secondary px-6 py-2.5 md:px-8 md:py-3 rounded-full text-sm md:text-base font-bold">Ativa</span>
          {activeDashboardTab !== 'info' && (showObFilter || activeDashboardTab === 'objectives') && (
            <div className="relative flex-1 lg:flex-none">
              <select 
                value={tradeTypeFilter}
                onChange={(e) => setTradeTypeFilter(e.target.value as any)}
                className="w-full bg-surface-container-low border border-outline-variant/20 text-on-surface pl-6 pr-12 py-2.5 md:py-3 rounded-full text-sm md:text-base font-bold outline-none appearance-none cursor-pointer"
              >
                {activeDashboardTab === 'objectives' && <option value="all">Todos os Mercados</option>}
                <option value="forex">Forex & Índices</option>
                {showObFilter && <option value="ob">Opções Binárias</option>}
              </select>
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface text-lg pointer-events-none">expand_more</span>
            </div>
          )}
          <div className="relative flex-1 lg:flex-none">
            <select 
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/20 text-on-surface pl-6 pr-12 py-2.5 md:py-3 rounded-full text-sm md:text-base font-bold outline-none appearance-none cursor-pointer"
            >
              <option value="all">Todas as Contas (Soma)</option>
              {accounts.filter(acc => tradeTypeFilter === 'all' || acc.tradeType === tradeTypeFilter || (!acc.tradeType && tradeTypeFilter === 'forex')).map(acc => (
                <option key={acc.id} value={acc.id}>
                  Conta {acc.accountNumber} - {acc.accountType} {(acc.status === 'inactive') ? '(Desativada)' : ''}
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
      {activeDashboardTab === 'objectives' && (
        <>
          {/* Statistics */}
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 md:p-8">
        <h3 className="text-on-surface font-bold mb-6 md:mb-8 text-base md:text-xl font-headline">Estatísticas Globais</h3>
        <div className={`grid gap-6 md:gap-8 text-center lg:divide-x divide-outline-variant/20 ${tradeTypeFilter === 'all' ? 'grid-cols-2' : (tradeTypeFilter === 'ob' ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-5')}`}>
          <div className="pb-6 lg:pb-0 border-b lg:border-b-0 border-outline-variant/20">
            <p className="text-on-surface-variant text-sm md:text-base mb-2 md:mb-4">Lucro/Prejuízo do Dia</p>
            <p className={`font-bold text-2xl md:text-4xl font-headline ${data.todayPnl >= 0 ? 'text-secondary' : 'text-error'}`}>
              {data.todayPnl >= 0 ? '+' : ''}{formatCurrency(data.todayPnl)}
            </p>
          </div>
          {tradeTypeFilter !== 'all' && (
            <>
              <div className="pb-6 lg:pb-0 border-b lg:border-b-0 border-outline-variant/20">
                <p className="text-on-surface-variant text-sm md:text-base mb-2 md:mb-4">Nº de trades</p>
                <p className="text-on-surface font-bold text-2xl md:text-4xl font-headline">{data.totalTrades}</p>
              </div>
              <div className="pb-6 lg:pb-0 border-b lg:border-b-0 border-outline-variant/20">
                <p className="text-on-surface-variant text-sm md:text-base mb-2 md:mb-4">Taxa de Acerto</p>
                <p className="text-on-surface font-bold text-2xl md:text-4xl font-headline">{data.winRate}%</p>
              </div>
              {tradeTypeFilter !== 'ob' && (
                <div className="pb-6 lg:pb-0 border-b lg:border-b-0 border-outline-variant/20">
                  <p className="text-on-surface-variant text-sm md:text-base mb-2 md:mb-4">Risco/Retorno Médio</p>
                  <p className="text-on-surface font-bold text-2xl md:text-4xl font-headline">1:{data.averageRr}</p>
                </div>
              )}
            </>
          )}
          <div>
            <p className="text-on-surface-variant text-sm md:text-base mb-2 md:mb-4">Capital Geral</p>
            <p className="text-on-surface font-bold text-2xl md:text-4xl font-headline">{formatCurrency(data.totalSize)}</p>
            {data.hasProfitTarget && (
              <p className="text-on-surface-variant text-xs md:text-sm mt-2">
                Meta: {formatCurrency(data.totalProfitTarget)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Monthly Comparison */}
      {tradeTypeFilter !== 'all' ? (
        <div className="space-y-8 md:space-y-12">
        {(data.hasProfitTarget || data.hasMaxLoss || data.hasDailyLoss) && (
          <>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 md:mb-6">
              <h3 className="text-on-surface font-bold text-xl md:text-2xl font-headline">Visão geral dos objetivos</h3>
            </div>
            <div className="flex flex-col gap-6 md:gap-8">
              {/* Lucro (Full Width) */}
              <div className="bg-surface-container-low border border-secondary/30 rounded-2xl p-6 md:p-8">
                <h4 className="text-on-surface font-bold text-base md:text-lg mb-6 md:mb-8 font-headline">Lucro</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-10">
                  <div>
                    <p className="text-on-surface-variant text-xs md:text-sm mb-1 md:mb-2">Meta De Lucro</p>
                    <p className="text-on-surface font-bold text-base md:text-xl">{data.hasProfitTarget ? formatCurrency(data.totalProfitTarget) : 'Não definida'}</p>
                  </div>
                  <div>
                    <p className="text-on-surface-variant text-xs md:text-sm mb-1 md:mb-2">Lucro Remanescente</p>
                    <p className="text-on-surface font-bold text-base md:text-xl">
                      {data.hasProfitTarget ? formatCurrency(Math.max(0, data.totalProfitTarget - Math.max(0, data.currentMonthPnl))) : '-'}
                    </p>
                  </div>
                  <div className="hidden md:block">
                    <p className="text-on-surface-variant text-xs md:text-sm mb-1 md:mb-2">Lucro Atual</p>
                    <p className="text-secondary font-bold text-base md:text-xl">
                      {formatCurrency(Math.max(0, data.currentMonthPnl))}
                    </p>
                  </div>
                </div>
                {data.hasProfitTarget && (
                  <>
                    <div className="relative w-full h-2 md:h-3 bg-surface-container-highest rounded-full mt-8 md:mt-12">
                      <div className="absolute left-0 top-0 h-full bg-secondary rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (Math.max(0, data.currentMonthPnl) / data.totalProfitTarget) * 100)}%` }}></div>
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
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-10">
                    <div>
                      <p className="text-on-surface-variant text-xs md:text-sm mb-1 md:mb-2">Limite Máximo De Perda</p>
                      <p className="text-on-surface font-bold text-base md:text-xl">{data.hasMaxLoss ? formatCurrency(data.totalMaxLoss) : 'Não definida'}</p>
                    </div>
                    <div>
                      <p className="text-on-surface-variant text-xs md:text-sm mb-1 md:mb-2">Perda Máxima Restante</p>
                      <p className="text-on-surface font-bold text-base md:text-xl">
                        {data.hasMaxLoss ? formatCurrency(Math.max(0, data.totalMaxLoss - data.currentMonthLosses)) : '-'}
                      </p>
                    </div>
                    <div className="hidden md:block">
                      <p className="text-on-surface-variant text-xs md:text-sm mb-1 md:mb-2">Perda Atual</p>
                      <p className="text-error font-bold text-base md:text-xl">
                        {formatCurrency(data.currentMonthLosses)}
                      </p>
                    </div>
                  </div>
                  {data.hasMaxLoss && (
                    <>
                      <div className="relative w-full h-2 md:h-3 bg-surface-container-highest rounded-full mt-8 md:mt-12">
                        <div className="absolute left-0 top-0 h-full bg-error rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (data.currentMonthLosses / data.totalMaxLoss) * 100)}%` }}></div>
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
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-10">
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
                    <div className="hidden md:block">
                      <p className="text-on-surface-variant text-xs md:text-sm mb-1 md:mb-2">Perda Atual</p>
                      <p className="text-error font-bold text-base md:text-xl">
                        {formatCurrency(data.todayPnl < 0 ? Math.abs(data.todayPnl) : 0)}
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
          </>
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
      ) : (
        <div className="space-y-8 md:space-y-12">
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
                    <p className={`font-bold text-4xl ${data.currentMonthPnl >= 0 ? 'text-secondary' : 'text-error'}`}>
                      {formatCurrency(data.currentMonthPnl)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-on-surface-variant text-sm mb-1">Meta a alcançar</p>
                    <p className="text-on-surface font-bold text-2xl">{data.hasProfitTarget ? formatCurrency(data.totalProfitTarget) : 'Não definida'}</p>
                  </div>
                </div>
                
                {data.hasProfitTarget && (
                  <>
                    <div className="relative w-full h-3 bg-surface-container-highest rounded-full mt-4">
                      <div 
                        className="absolute left-0 top-0 h-full bg-secondary rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, Math.max(0, (data.currentMonthPnl / data.totalProfitTarget) * 100))}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-on-surface-variant mt-2">
                      <span>{((Math.max(0, data.currentMonthPnl) / data.totalProfitTarget) * 100).toFixed(1)}% alcançado</span>
                      <span>Falta {formatCurrency(Math.max(0, data.totalProfitTarget - data.currentMonthPnl))}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
            <LineChart data={data.chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#44474e" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#c4c6d0' }} dy={15} padding={{ left: 30, right: 30 }} />
              <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#c4c6d0' }} tickFormatter={(val) => formatCurrency(val)} />
              <Tooltip content={<CustomTooltip formatCurrency={formatCurrency} />} cursor={{ stroke: '#44474e', strokeWidth: 1, strokeDasharray: '3 3' }} />
              <Legend verticalAlign="top" height={48} iconType="circle" wrapperStyle={{ fontSize: '14px', color: '#e2e2e9' }} />
              <Line type="monotone" dataKey="balance" name="Saldo (Balance)" stroke="#c3f5ff" strokeWidth={4} dot={{ r: 5, fill: '#c3f5ff', strokeWidth: 0 }} activeDot={{ r: 8, strokeWidth: 0 }} />
              <Line type="monotone" dataKey="loss" name="Perdas (Drawdown)" stroke="#ffb4ab" strokeWidth={4} dot={{ r: 5, fill: '#ffb4ab', strokeWidth: 0 }} activeDot={{ r: 8, strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-outline-variant/20">
          <button onClick={handlePrevMonth} className="material-symbols-outlined text-on-surface-variant hover:text-on-surface transition-colors text-2xl">chevron_left</button>
          <span className="text-on-surface font-bold text-lg md:text-xl font-headline capitalize">{monthName}</span>
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
                      {data.analysisBestSetups.map((setup, idx) => (
                        <div key={idx} className="flex justify-between items-center p-4 bg-surface-container rounded-xl">
                          <div>
                            <p className="font-bold text-on-surface flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: ['#c3f5ff', '#ffb4ab', '#b4f2c0', '#f2b4e5'][idx % 4] }}></span>
                              {setup.name}
                            </p>
                            <p className="text-xs text-on-surface-variant">Win Rate: {setup.winRate.toFixed(1)}% ({setup.wins}/{setup.total})</p>
                          </div>
                          <p className={`font-bold ${setup.pnl >= 0 ? 'text-secondary' : 'text-error'}`}>
                            {setup.pnl >= 0 ? '+' : ''}{formatCurrency(setup.pnl)}
                          </p>
                        </div>
                      ))}
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
                      {data.analysisBestPairs.map((pair, idx) => (
                        <div key={idx} className="flex justify-between items-center p-4 bg-surface-container rounded-xl">
                          <div>
                            <p className="font-bold text-on-surface flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: ['#b4f2c0', '#c3f5ff', '#ffb4ab', '#f2b4e5'][idx % 4] }}></span>
                              {pair.name}
                            </p>
                            <p className="text-xs text-on-surface-variant">Win Rate: {pair.winRate.toFixed(1)}% ({pair.wins}/{pair.total})</p>
                          </div>
                          <p className={`font-bold ${pair.pnl >= 0 ? 'text-secondary' : 'text-error'}`}>
                            {pair.pnl >= 0 ? '+' : ''}{formatCurrency(pair.pnl)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-on-surface-variant text-sm">Nenhum par registrado no período.</p>
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
                      {data.analysisPredominantPsychology.map(([state, count], idx) => (
                        <div key={idx} className="flex justify-between items-center p-4 bg-surface-container rounded-xl">
                          <div className="flex items-center gap-3">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: ['#f2b4e5', '#c3f5ff', '#b4f2c0', '#ffb4ab'][idx % 4] }}></span>
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
                      ))}
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
                      {data.analysisBestDaysOfWeek.map((day, idx) => (
                        <div key={idx} className="flex justify-between items-center p-4 bg-surface-container rounded-xl">
                          <div>
                            <p className="font-bold text-on-surface flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: ['#c3f5ff', '#ffb4ab', '#b4f2c0', '#f2b4e5'][idx % 4] }}></span>
                              {day.name}
                            </p>
                            <p className="text-xs text-on-surface-variant">{day.wins} {day.wins === 1 ? 'ganho' : 'ganhos'} em {day.total} {day.total === 1 ? 'trade' : 'trades'}</p>
                          </div>
                          <p className={`font-bold ${day.pnl >= 0 ? 'text-secondary' : 'text-error'}`}>
                            {day.pnl >= 0 ? '+' : ''}{formatCurrency(day.pnl)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-on-surface-variant text-sm">Nenhum dia registrado no período.</p>
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
                        {data.analysisBestTimeframes.map((tf, idx) => (
                          <div key={idx} className="flex justify-between items-center p-4 bg-surface-container rounded-xl">
                            <div>
                              <p className="font-bold text-on-surface flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: ['#ffb4ab', '#b4f2c0', '#c3f5ff', '#f2b4e5'][idx % 4] }}></span>
                                {tf.name}
                              </p>
                              <p className="text-xs text-on-surface-variant">Win Rate: {tf.winRate.toFixed(1)}% ({tf.wins}/{tf.total})</p>
                            </div>
                            <p className={`font-bold ${tf.pnl >= 0 ? 'text-secondary' : 'text-error'}`}>
                              {tf.pnl >= 0 ? '+' : ''}{formatCurrency(tf.pnl)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-on-surface-variant text-sm">Nenhum timeframe registrado no período.</p>
                  )}
                </div>
              </div>
            )}

            {/* Trade Volumes */}
            <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 md:p-8">
              <h4 className="text-on-surface font-bold text-base md:text-lg mb-6 md:mb-8 font-headline flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">bar_chart</span>
                Volumes de Trade
              </h4>
              <div className="flex flex-col items-center justify-center h-full min-h-[200px]">
                <p className="text-on-surface font-bold text-4xl mb-2">{data.analysisTotalTrades}</p>
                <p className="text-on-surface-variant text-sm">Trades Realizados</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeDashboardTab === 'history' && (
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h3 className="text-on-surface font-bold text-xl md:text-2xl font-headline">Histórico de Trades</h3>
            <DateRangePicker
              dateRange={analysisDateRange}
              onDateRangeChange={setAnalysisDateRange}
            />
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
                    {tradeTypeFilter !== 'ob' && <th className="font-normal pb-4">R:R</th>}
                    {tradeTypeFilter !== 'ob' && <th className="font-normal pb-4">Swap</th>}
                    <th className="font-normal pb-4">Symbol</th>
                    <th className="font-normal pb-4">Price</th>
                    <th className="font-normal pb-4">Volume</th>
                    <th className="font-normal pb-4">Date</th>
                    <th className="font-normal pb-4">Entry</th>
                    {tradeTypeFilter === 'ob' && <th className="font-normal pb-4">Timeframe</th>}
                    <th className="font-normal pb-4">Login</th>
                  </tr>
                </thead>
                <tbody>
                  {data.filteredHistoryTrades.map((trade: any, i: number) => (
                  <tr key={i} className="bg-surface-container hover:bg-surface-container-highest transition-colors">
                    <td className="py-5 px-4 rounded-l-2xl text-on-surface-variant whitespace-nowrap">{trade.ticket}</td>
                    <td className={`py-5 px-4 whitespace-nowrap ${trade.action === 'Buy' ? 'text-secondary' : 'text-error'}`}>{trade.action}</td>
                    <td className={`py-5 px-4 whitespace-nowrap ${trade.pnl >= 0 ? 'text-secondary' : 'text-error'}`}>
                      {trade.pnl >= 0 ? '+' : ''}{formatCurrency(trade.pnl)}
                    </td>
                    {tradeTypeFilter !== 'ob' && <td className="py-5 px-4 text-on-surface-variant whitespace-nowrap">{trade.commission?.toFixed(1) || '0.0'}</td>}
                    {tradeTypeFilter !== 'ob' && <td className="py-5 px-4 text-on-surface-variant whitespace-nowrap text-primary font-bold">{trade.rr ? `1:${trade.rr}` : '-'}</td>}
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
                      {(() => {
                        const acc = accounts.find(a => a.id === trade.accountId);
                        return acc ? `${acc.accountNumber} - ${acc.accountType}` : trade.accountId;
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="flex justify-center items-center gap-6 mt-8">
              <button className="text-on-surface-variant hover:text-on-surface"><span className="material-symbols-outlined text-xl">chevron_left</span></button>
              <div className="flex gap-3">
                <button className="w-10 h-10 rounded-full bg-surface-container-highest text-on-surface font-bold text-sm flex items-center justify-center">01</button>
                <button className="w-10 h-10 rounded-full text-on-surface-variant hover:bg-surface-container font-bold text-sm flex items-center justify-center">02</button>
              </div>
              <button className="text-on-surface-variant hover:text-on-surface"><span className="material-symbols-outlined text-xl">chevron_right</span></button>
            </div>
          </div>
        </div>
        </div>
      )}

      {activeDashboardTab === 'info' && (
        <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 md:p-10">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-12">
            <div className="w-20 h-20 rounded-full bg-surface-container-highest flex items-center justify-center overflow-hidden shrink-0">
              {auth.currentUser?.photoURL ? (
                <img src={auth.currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-5xl text-on-surface-variant">person</span>
              )}
            </div>
            <div>
              <h2 className="text-on-surface font-bold text-2xl md:text-3xl font-headline">{auth.currentUser?.displayName || 'Usuário'}</h2>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-on-surface-variant text-base">{selectedAccount === 'all' ? 'Todas as Contas' : accounts.find(a => a.id === selectedAccount)?.accountNumber}</span>
                <button className="text-on-surface-variant hover:text-on-surface transition-colors">
                  <span className="material-symbols-outlined text-base">content_copy</span>
                </button>
              </div>
              <p className="text-on-surface-variant text-sm mt-1 uppercase tracking-wider">
                {selectedAccount === 'all' 
                  ? '-' 
                  : `${accounts.find(a => a.id === selectedAccount)?.accountType} - ${accounts.find(a => a.id === selectedAccount)?.phase || 'Fase 1'}`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-20 gap-y-10">
            {/* Left Column */}
            <div className="space-y-8">
              <div className="flex justify-between items-center border-b border-outline-variant/10 pb-4">
                <span className="text-on-surface-variant text-base">Challenge</span>
                <span className="text-on-surface font-bold text-base md:text-lg">{selectedAccount === 'all' ? '-' : accounts.find(a => a.id === selectedAccount)?.accountType}</span>
              </div>
              <div className="flex justify-between items-center border-b border-outline-variant/10 pb-4">
                <span className="text-on-surface-variant text-base">Fase</span>
                <span className="text-on-surface font-bold text-base md:text-lg">{selectedAccount === 'all' ? '-' : accounts.find(a => a.id === selectedAccount)?.phase || 'Fase 1'}</span>
              </div>
              <div className="flex justify-between items-center border-b border-outline-variant/10 pb-4">
                <span className="text-on-surface-variant text-base">Broker</span>
                <span className="text-on-surface font-bold text-base md:text-lg">{selectedAccount === 'all' ? '-' : accounts.find(a => a.id === selectedAccount)?.broker}</span>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-8">
              <div className="flex justify-between items-center border-b border-outline-variant/10 pb-4">
                <span className="text-on-surface-variant text-base">Investor password</span>
                <div className="flex items-center gap-4">
                  <span className={`text-on-surface font-bold text-base md:text-lg ${!showInvestorPassword ? 'tracking-widest' : ''}`}>
                    {selectedAccount === 'all' ? '-' : (showInvestorPassword ? (accounts.find(a => a.id === selectedAccount)?.investorPassword || 'N/A') : '********')}
                  </span>
                  <button 
                    onClick={() => setShowInvestorPassword(!showInvestorPassword)}
                    className="text-on-surface-variant hover:text-on-surface transition-colors"
                    disabled={selectedAccount === 'all'}
                  >
                    <span className="material-symbols-outlined text-lg">{showInvestorPassword ? 'visibility' : 'visibility_off'}</span>
                  </button>
                  <button 
                    onClick={() => {
                      const pwd = accounts.find(a => a.id === selectedAccount)?.investorPassword;
                      if (pwd) navigator.clipboard.writeText(pwd);
                    }}
                    className="text-on-surface-variant hover:text-on-surface transition-colors"
                    disabled={selectedAccount === 'all'}
                  >
                    <span className="material-symbols-outlined text-lg">content_copy</span>
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center border-b border-outline-variant/10 pb-4">
                <span className="text-on-surface-variant text-base">Master password</span>
                <div className="flex items-center gap-4">
                  <span className={`text-on-surface font-bold text-base md:text-lg ${!showMasterPassword ? 'tracking-widest' : ''}`}>
                    {selectedAccount === 'all' ? '-' : (showMasterPassword ? (accounts.find(a => a.id === selectedAccount)?.masterPassword || 'N/A') : '********')}
                  </span>
                  <button 
                    onClick={() => setShowMasterPassword(!showMasterPassword)}
                    className="text-on-surface-variant hover:text-on-surface transition-colors"
                    disabled={selectedAccount === 'all'}
                  >
                    <span className="material-symbols-outlined text-lg">{showMasterPassword ? 'visibility' : 'visibility_off'}</span>
                  </button>
                  <button 
                    onClick={() => {
                      const pwd = accounts.find(a => a.id === selectedAccount)?.masterPassword;
                      if (pwd) navigator.clipboard.writeText(pwd);
                    }}
                    className="text-on-surface-variant hover:text-on-surface transition-colors"
                    disabled={selectedAccount === 'all'}
                  >
                    <span className="material-symbols-outlined text-lg">content_copy</span>
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center border-b border-outline-variant/10 pb-4">
                <span className="text-on-surface-variant text-base">Starting balance</span>
                <span className="text-on-surface font-bold text-base md:text-lg">{selectedAccount === 'all' ? formatCurrency(data.totalSize) : formatCurrency(accounts.find(a => a.id === selectedAccount)?.initialBalance || 0)}</span>
              </div>
              <div className="flex justify-between items-center border-b border-outline-variant/10 pb-4">
                <span className="text-on-surface-variant text-base">Profit Target</span>
                <span className="text-on-surface font-bold text-base md:text-lg">{data.hasProfitTarget ? formatCurrency(data.totalProfitTarget) : '-'}</span>
              </div>
              <div className="flex justify-between items-center border-b border-outline-variant/10 pb-4">
                <span className="text-on-surface-variant text-base">Account start date</span>
                <span className="text-on-surface font-bold text-base md:text-lg">
                  {selectedAccount === 'all' ? '-' : (accounts.find(a => a.id === selectedAccount)?.createdAt?.toDate ? accounts.find(a => a.id === selectedAccount)?.createdAt.toDate().toLocaleDateString('pt-BR') : '-')}
                </span>
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
                  onChange={(e) => {
                    const type = e.target.value;
                    setNewAccount({
                      ...newAccount, 
                      accountType: type,
                      tradeType: type === 'Conta Real' ? newAccount.tradeType : 'forex'
                    });
                  }}
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
                  className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface outline-none focus:border-primary transition-colors appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={newAccount.accountType !== 'Conta Real'}
                >
                  <option value="forex">Forex / Índices</option>
                  <option value="ob">Opções Binárias (OB)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Senha Master</label>
                <div className="relative">
                  <input 
                    type={showMasterPassword ? "text" : "password"} 
                    value={newAccount.masterPassword}
                    onChange={(e) => setNewAccount({...newAccount, masterPassword: e.target.value})}
                    className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 pr-12 text-on-surface outline-none focus:border-primary transition-colors" 
                    placeholder="********" 
                  />
                  <button type="button" onClick={() => setShowMasterPassword(!showMasterPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors">
                    <span className="material-symbols-outlined">{showMasterPassword ? 'visibility' : 'visibility_off'}</span>
                  </button>
                </div>
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
