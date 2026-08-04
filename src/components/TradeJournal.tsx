import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, onSnapshot, query, where, serverTimestamp, doc, deleteDoc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../firebase';
import Papa from 'papaparse';
import { useCurrency } from '../contexts/CurrencyContext';
import { useTrades } from '../hooks/useTrades';
import AdBanner from './AdBanner';
import Modal from './Modal';
import { DatePicker } from './DatePicker';
import { importTradeFile, detectSession } from '../utils/tradeParsers';
import { TradeShareCard } from './TradeShareCard';
import { renderFormattedText } from '../utils/textFormatter';

import { Calendar, Trash2, ChevronRight, BarChart2, Timer, ArrowLeft, Edit2, ExternalLink, Link, ArrowRightLeft, UploadCloud, Activity, TrendingUp, TrendingDown, Plus, Save, CheckCircle, Share2, X } from 'lucide-react';

export default function TradeJournal({ currentView = 'list', onViewChange }: { currentView?: 'list' | 'form' | 'detail', onViewChange?: (view: 'list' | 'form' | 'detail') => void }) {
  const { formatCurrency } = useCurrency();
  const [view, setView] = useState<'list' | 'form' | 'detail'>(currentView);
  const [tradeType, setTradeType] = useState<'forex' | 'ob' | null>(null);
  const [listMode, setListMode] = useState<'list' | 'calendar'>(() => {
    const saved = localStorage.getItem('journalListMode');
    return (saved as 'list' | 'calendar') || 'list';
  });

  useEffect(() => {
    localStorage.setItem('journalListMode', listMode);
  }, [listMode]);
  const [expandedTradeId, setExpandedTradeId] = useState<string | null>(null);

  useEffect(() => {
    if (expandedTradeId && listMode === 'list') {
      const elementId = `day-group-${expandedTradeId.replace(/\//g, '-')}`;
      const timer = setTimeout(() => {
        const element = document.getElementById(elementId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [expandedTradeId, listMode]);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(new Date());
  const [accounts, setAccounts] = useState<any[]>([]);
  
  const [isImporting, setIsImporting] = useState(false);
  const [importedTradesToReview, setImportedTradesToReview] = useState<any[]>([]);
  const [lastImportBatchId, setLastImportBatchId] = useState<string | null>(() => localStorage.getItem('app_last_import_batch_id'));
  
  // Usando o novo hook para gerenciar os trades (sincronização + deduplicação)
  const { allTrades: trades, loading: loadingTrades, isPro, globalSettings } = useTrades(importedTradesToReview);
  
  const [selectedTrade, setSelectedTrade] = useState<any>(null);
  const [editingTradeId, setEditingTradeId] = useState<string | null>(null);
  const [tradeTypeFilter, setTradeTypeFilter] = useState<'all' | 'forex' | 'ob'>('all');
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string>('all');
  const [tradeData, setTradeData] = useState({
    accountId: '',
    symbol: 'EUR/USD',
    session: 'Londres (Intra Mercado)',
    action: 'Buy',
    openPrice: '',
    sl: '',
    tp: '',
    notes: '',
    psychology: '',
    psychologyNotes: '',
    setups: [] as string[],
    isCompliant: true,
    pnl: '',
    rr: '',
    returnAmount: '',
    commission: '',
    size: '1.0',
    type: 'forex', // 'forex' or 'ob'
    studyLink: '',
    date: new Date().toISOString().split('T')[0],
    entryTime: new Date().toTimeString().split(' ')[0].substring(0, 5),
    timeframe: 'M5',
    dayOfWeek: new Date().toLocaleDateString('pt-BR', { weekday: 'long' })
  });
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [sessionType, setSessionType] = useState<'simple' | 'subdivided'>('subdivided');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isTradeTypeModalOpen, setIsTradeTypeModalOpen] = useState(false);

  // Share trade modal state
  const [shareTrade, setShareTrade] = useState<any>(null);
  const [shareCaption, setShareCaption] = useState<string>('');
  const [shareFeed, setShareFeed] = useState<'forex' | 'ob'>('forex');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isPublishingToCommunity, setIsPublishingToCommunity] = useState(false);

  const handleOpenShareTradeModal = (trade: any) => {
    const isOb = trade.type === 'ob';
    const actionText = isOb ? (trade.action === 'Buy' ? 'CALL (Acima)' : 'PUT (Abaixo)') : trade.action;
    const resultText = trade.pnl >= 0 ? `WIN (+${formatCurrency(trade.pnl)})` : `LOSS (${formatCurrency(trade.pnl)})`;
    
    const defaultCaption = `Análise e execução do trade em ${trade.symbol} (${actionText}). Resultado: ${resultText}`;
    
    setShareTrade(trade);
    setShareCaption(defaultCaption);
    setShareFeed(isOb ? 'ob' : 'forex');
    setIsShareModalOpen(true);
  };

  const handleConfirmShareToCommunity = async () => {
    if (!auth.currentUser || !shareTrade) return;
    
    try {
      setIsPublishingToCommunity(true);
      
      let userName = auth.currentUser.displayName || 'Trader';
      let userPhoto = auth.currentUser.photoURL || '';
      
      try {
        const userSnap = await getDoc(doc(db, 'usuarios', auth.currentUser.uid));
        if (userSnap.exists()) {
          const uData = userSnap.data();
          if (uData.nome) userName = uData.nome;
          if (uData.photoURL) userPhoto = uData.photoURL;
        }
      } catch (e) {
        console.warn("Could not fetch user profile for share:", e);
      }
      
      await addDoc(collection(db, 'community_posts'), {
        userId: auth.currentUser.uid,
        userName,
        userPhoto,
        legend: shareCaption,
        imageUrl: shareTrade.studyLink || '',
        type: shareFeed,
        tradeDetails: {
          symbol: shareTrade.symbol || '',
          action: shareTrade.action || '',
          pnl: shareTrade.pnl ?? 0,
          type: shareTrade.type || 'forex',
          session: shareTrade.session || '',
          size: shareTrade.size || '',
          ticket: shareTrade.ticket || '',
          openPrice: shareTrade.openPrice || '',
          sl: shareTrade.sl || '',
          tp: shareTrade.tp || '',
          notes: shareTrade.notes || '',
          studyLink: shareTrade.studyLink || '',
          date: shareTrade.date || '',
          timeframe: shareTrade.timeframe || ''
        },
        likesCount: 0,
        commentsCount: 0,
        createdAt: serverTimestamp()
      });
      
      setIsShareModalOpen(false);
      setShareTrade(null);
      
      setModalConfig({
        isOpen: true,
        title: "Publicado com Sucesso!",
        message: "Seu registro de trade foi partilhado na Comunidade com sucesso! Os outros traders já podem interagir.",
        confirmText: "Entendido",
        onConfirm: () => closeModal()
      });
    } catch (err) {
      console.error("Error sharing trade to community:", err);
      setModalConfig({
        isOpen: true,
        title: "Erro ao Publicar",
        message: "Não foi possível publicar o trade na comunidade. Tente novamente.",
        isError: true,
        confirmText: "OK",
        onConfirm: () => closeModal()
      });
    } finally {
      setIsPublishingToCommunity(false);
    }
  };

  const handleNewTradeClick = () => {
    const defaultTradeType = localStorage.getItem('app_default_trade_type') as 'ask' | 'forex' | 'ob' || 'ask';
    if (defaultTradeType === 'ask') {
      setIsTradeTypeModalOpen(true);
    } else {
      handleOpenTradeForm(defaultTradeType);
    }
  };

  const handleOpenTradeForm = (type: 'forex' | 'ob') => {
    setTradeType(type);
    const firstAcc = accounts.find(a => type === 'ob' ? a.tradeType === 'ob' : a.tradeType !== 'ob');
    setTradeData(prev => ({
      ...prev,
      accountId: firstAcc ? firstAcc.id : '',
      type
    }));
    setIsTradeTypeModalOpen(false);
    handleViewChange('form');
  };

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

  useEffect(() => {
    setView(currentView);
  }, [currentView]);

  useEffect(() => {
    const savedSessionType = localStorage.getItem('app_session_type') as 'simple' | 'subdivided';
    if (savedSessionType) {
      setSessionType(savedSessionType);
    }
  }, []);

  // Auto-detect session on entryTime or type change in manual entry or editing
  useEffect(() => {
    if (view === 'form') {
      const isOB = (tradeType === 'ob');
      const autoSession = detectSession(tradeData.entryTime, isOB);
      setTradeData(prev => {
        if (prev.session === autoSession) return prev;
        return { ...prev, session: autoSession };
      });
    }
  }, [tradeData.entryTime, tradeType, view]);

  const handleViewChange = (newView: 'list' | 'form' | 'detail') => {
    setView(newView);
    if (onViewChange) onViewChange(newView);
  };

  useEffect(() => {
    if (!auth.currentUser) return;

    const unsubscribes: (() => void)[] = [];

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

    const accountsByPath: Record<string, any[]> = { old: [], new: [] };
    const updateAccounts = (data: any[], path: 'old' | 'new') => {
      accountsByPath[path] = data;
      const combined = [...accountsByPath.new, ...accountsByPath.old];
      const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
      
      setAccounts(unique);
      
      // Auto-select first account if none selected
      if (unique.length > 0 && !tradeData.accountId) {
        const firstAccount = unique[0] as any;
        setTradeData(prev => ({ 
          ...prev, 
          accountId: firstAccount.id,
          type: firstAccount.tradeType || 'forex'
        }));
        setTradeType(firstAccount.tradeType || 'forex');
      }
    };

    return () => unsubscribes.forEach(unsub => unsub());
  }, []);

  const handleDeleteTrade = async (tradeId: string) => {
    setModalConfig({
      isOpen: true,
      title: "Confirmar Exclusão",
      message: "Tem certeza que deseja excluir este trade? Esta ação não pode ser desfeita.",
      confirmText: "Excluir",
      isError: true,
      onCancel: closeModal,
      onConfirm: async () => {
        try {
          // Tentar deletar em ambos os caminhos para garantir
          try {
            await deleteDoc(doc(db, 'trades', tradeId));
          } catch (e) {}
          
          if (auth.currentUser) {
            try {
              await deleteDoc(doc(db, 'usuarios', auth.currentUser.uid, 'trades', tradeId));
            } catch (e) {}
          }

          closeModal();
          if (view === 'detail') {
            handleViewChange('list');
          }
        } catch (error) {
          console.error("Error deleting trade: ", error);
          setModalConfig({
            isOpen: true,
            title: "Erro",
            message: "Erro ao excluir o trade.",
            isError: true,
            onConfirm: closeModal
          });
        }
      }
    });
  };

  const handleSaveTrade = async () => {
    if (!auth.currentUser) return;
    
    const isManual = !tradeData.symbol || !tradeData.openPrice || !tradeData.entryTime;
    
    // Validations based on user requests for Manual Entry
    const missingFields = [];
    if (!tradeData.accountId) missingFields.push("Conta");
    if (!tradeData.date) missingFields.push("Data (Calendário)");
    if (!tradeData.entryTime) missingFields.push("Hora de Entrada");
    if (!tradeData.symbol) missingFields.push("Par de Ativos");
    if (!tradeData.session) missingFields.push("Sessão");
    if (!tradeData.action) missingFields.push("Direção (Long/Short)");
    if (!tradeData.size) missingFields.push("Volume (Lotes/Valor)");
    if (!tradeData.pnl) missingFields.push("Lucro/Prejuízo (P&L)");

    if (missingFields.length > 0) {
      setModalConfig({
        isOpen: true,
        title: "Campos Obrigatórios Faltando",
        message: `Para registrar uma trade manualmente, os seguintes campos são obrigatórios: ${missingFields.join(', ')}`,
        isError: true,
        onConfirm: closeModal
      });
      return;
    }

    setIsSaving(true);
    try {
      let finalStudyLink = tradeData.studyLink;

      // Handle File Upload if present
      if (selectedFile) {
        const fileRef = ref(storage, `trades/${auth.currentUser.uid}/${Date.now()}_${selectedFile.name}`);
        await uploadBytes(fileRef, selectedFile);
        finalStudyLink = await getDownloadURL(fileRef);
      }

      // Ensure dayOfWeek is never undefined
      const resolvedDayOfWeek = tradeData.dayOfWeek || new Date(tradeData.date).toLocaleDateString('pt-BR', { weekday: 'long' }) || 'unknown';

      const tradePayload = {
        action: tradeData.action,
        size: Number(tradeData.size) || 0,
        openPrice: Number(tradeData.openPrice) || 0,
        closePrice: Number(tradeData.openPrice) || 0, // mock
        sl: Number(tradeData.sl) || 0,
        tp: Number(tradeData.tp) || 0,
        commission: Number(tradeData.commission) || 0,
        swap: 0,
        pnl: Number(tradeData.pnl),
        rr: Number(tradeData.rr) || 0,
        returnAmount: Number(tradeData.returnAmount) || 0,
        accountId: tradeData.accountId,
        userId: auth.currentUser.uid,
        symbol: tradeData.symbol,
        session: tradeData.session,
        notes: tradeData.notes,
        psychology: tradeData.psychology,
        psychologyNotes: tradeData.psychologyNotes,
        setups: tradeData.setups,
        isCompliant: tradeData.isCompliant,
        type: tradeData.type,
        studyLink: finalStudyLink,
        date: tradeData.date,
        entryTime: tradeData.entryTime,
        timeframe: tradeData.timeframe,
        dayOfWeek: resolvedDayOfWeek
      };

      if (editingTradeId) {
        const { doc, updateDoc } = await import('firebase/firestore');
        // Try both paths for update
        try {
          await updateDoc(doc(db, 'trades', editingTradeId), tradePayload);
        } catch (e) {
          // If not in old path, try new path
          const ticket = selectedTrade?.ticket || `T${Date.now()}`;
          await updateDoc(doc(db, 'usuarios', auth.currentUser.uid, 'trades', editingTradeId), tradePayload);
        }
      } else {
        const ticket = `T${Date.now()}`;
        // Save to the new SaaS path
        await setDoc(doc(db, 'usuarios', auth.currentUser.uid, 'trades', ticket), {
          ...tradePayload,
          ticket,
          openTime: serverTimestamp(),
          closeTime: serverTimestamp(),
        });
      }
      
      setTradeData({
        ...tradeData,
        openPrice: '',
        sl: '',
        tp: '',
        notes: '',
        psychology: '',
        psychologyNotes: '',
        setups: [],
        isCompliant: true,
        pnl: '',
        rr: '',
        returnAmount: '',
        studyLink: '',
        date: new Date().toISOString().split('T')[0],
        entryTime: new Date().toTimeString().split(' ')[0].substring(0, 5)
      });
      setEditingTradeId(null);
      setTradeType(null);
      setSelectedFile(null);
      setPreviewUrl(null);
      handleViewChange('list');

      setModalConfig({
        isOpen: true,
        title: "Sucesso",
        message: editingTradeId ? "Trade atualizado com sucesso!" : "Trade salvo com sucesso!",
        confirmText: "OK",
        onConfirm: closeModal
      });
    } catch (error) {
      console.error("Error saving trade: ", error);
      setModalConfig({
        isOpen: true,
        title: "Erro",
        message: "Erro ao salvar o trade.",
        isError: true,
        onConfirm: closeModal
      });
    } finally {
      setIsSaving(false);
    }
  };

  const parseDateStr = (dateStr: string) => {
    if (!dateStr) return new Date();
    const [datePart, timePart] = dateStr.split(' ');
    if (!datePart) return new Date();
    const [day, month, year] = datePart.split('/');
    if (timePart) {
      return new Date(`${year}-${month}-${day}T${timePart}`);
    }
    return new Date(`${year}-${month}-${day}T00:00:00`);
  };

  const saveImportedTrades = async (tradesToSave: any[], forceOverwrite = false) => {
    if (!auth.currentUser) return;
    if (!tradeData.accountId) {
      setModalConfig({
        isOpen: true,
        title: "Atenção",
        message: "Por favor, selecione uma conta antes de importar.",
        isError: true,
        onConfirm: closeModal
      });
      return;
    }

    const targetAccount = accounts.find(a => a.id === tradeData.accountId);
    const accountLabel = targetAccount ? `Conta ${targetAccount.accountNumber}` : 'a conta selecionada';

    // Show initial confirmation
    if (!forceOverwrite && !lastImportBatchId) { // Simplified check for "is this the first step of this import session?"
       // BUT wait, saveImportedTrades is called AFTER review.
       // The user asked for confirmation BEFORE importing.
    }

    // Check for duplicates - comparison using String to avoid type issues
    const existingTickets = new Set(
      trades
        .filter(t => t.accountId === tradeData.accountId && t.ticket)
        .map(t => String(t.ticket))
    );
    
    const duplicates = tradesToSave.filter(t => existingTickets.has(String(t.ticket)));

    // Se houver duplicados e o usuário ainda não confirmou a substituição
    if (duplicates.length > 0 && !forceOverwrite) {
      setModalConfig({
        isOpen: true,
        title: "Trades Duplicados",
        message: `Foram detectados ${duplicates.length} trades que já existem nesta conta (${accountLabel}). Deseja substituir os registros existentes pelos novos dados do arquivo?`,
        confirmText: "Sim, Substituir",
        onCancel: closeModal,
        onConfirm: () => {
          closeModal();
          saveImportedTrades(tradesToSave, true);
        }
      });
      return;
    }

    // Se não for "forceOverwrite" e todos os trades forem novos, ou se for "forceOverwrite"
    const tradesToProcess = tradesToSave;
    const batchId = `IMPORT_${Date.now()}`;

    setIsSaving(true);
    try {
      const promises = tradesToProcess.map(trade => {
        let dateForDay = trade.date ? trade.date.replace(/\./g, '-').replace(/\//g, '-') : null;
        if (dateForDay && dateForDay.split('-').length === 3) {
          const parts = dateForDay.split('-');
          if (parts[0].length === 2 && parts[2].length === 4) { // DD-MM-YYYY to YYYY-MM-DD
            dateForDay = `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
        }
        
        const resolvedDayOfWeek = trade.dayOfWeek || (dateForDay ? new Date(dateForDay + "T00:00:00").toLocaleDateString('pt-BR', { weekday: 'long' }) : 'unknown');

        // Also normalize trade.date so it's always YYYY-MM-DD in the database
        const normalizedTrade = { ...trade, date: dateForDay || trade.date };
        const uid = auth.currentUser!.uid;
        const ticketId = String(normalizedTrade.ticket);

        // Use setDoc with ticketId to ensure uniqueness (idempotency)
        // If the same file is imported again, it will just update existing entries
        return setDoc(doc(db, 'usuarios', uid, 'trades', ticketId), {
          ...normalizedTrade,
          accountId: tradeData.accountId,
          userId: uid,
          dayOfWeek: resolvedDayOfWeek,
          ticket: ticketId,
          source: 'automatic', // Ensures the hook identifies it correctly
          importId: batchId // Tag for undo/revert
        });
      });
      await Promise.all(promises);

      setLastImportBatchId(batchId);
      localStorage.setItem('app_last_import_batch_id', batchId);

      const msg = forceOverwrite 
        ? `${tradesToProcess.length} trades processados (incluindo substituições) na ${accountLabel}.`
        : `${tradesToProcess.length} trades importados com sucesso na ${accountLabel}!`;

      setModalConfig({
        isOpen: true,
        title: "Sucesso",
        message: msg,
        confirmText: "OK",
        onConfirm: () => {
            closeModal();
            setImportedTradesToReview([]);
        }
      });
    } catch (error) {
      console.error("Error importing trades: ", error);
      setModalConfig({
        isOpen: true,
        title: "Erro",
        message: "Erro ao importar trades.",
        isError: true,
        onConfirm: closeModal
      });
    } finally {
      setIsSaving(false);
      setImportedTradesToReview([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUndoImport = async () => {
    if (!lastImportBatchId || !auth.currentUser) return;
    
    setModalConfig({
      isOpen: true,
      title: "Reverter Importação",
      message: "Tem certeza que deseja apagar todos os trades desta última importação? Esta ação não pode ser desfeita.",
      confirmText: "Sim, Reverter",
      isError: true,
      onCancel: closeModal,
      onConfirm: async () => {
        setIsSaving(true);
        try {
          const uid = auth.currentUser!.uid;
          const toDelete = trades.filter(t => t.importId === lastImportBatchId);
          const promises = toDelete.map(t => deleteDoc(doc(db, 'usuarios', uid, 'trades', t.id)));
          await Promise.all(promises);
          
          setLastImportBatchId(null);
          localStorage.removeItem('app_last_import_batch_id');
          closeModal();
          
          setModalConfig({
            isOpen: true,
            title: "Revertido",
            message: `${toDelete.length} trades foram removidos com sucesso.`,
            confirmText: "OK",
            onConfirm: closeModal
          });
        } catch (e) {
          console.error(e);
        } finally {
          setIsSaving(false);
        }
      }
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    
    try {
      const result = await importTradeFile(file, tradeData.accountId || accounts[0]?.id || '');
      
      if (result.trades && result.trades.length > 0) {
        // Auto-detect account
        let targetAccountId = tradeData.accountId;
        if (result.detectedAccountId) {
          const matchedAcc = accounts.find(a => String(a.accountNumber) === String(result.detectedAccountId));
          if (matchedAcc) {
            targetAccountId = matchedAcc.id;
          }
        }

        const targetAcc = accounts.find(a => a.id === targetAccountId) || accounts[0];
        const accLabel = targetAcc ? `Conta ${targetAcc.accountNumber}` : 'Indefinida';

        setModalConfig({
          isOpen: true,
          title: "Confirmar Importação",
          message: `Deseja importar ${result.trades.length} trades na conta ${accLabel}?`,
          confirmText: "Sim, Importar",
          onCancel: () => {
             closeModal();
             setIsImporting(false);
          },
          onConfirm: () => {
            closeModal();
            setTradeData(prev => ({ ...prev, accountId: targetAcc?.id || '' }));
            setImportedTradesToReview(result.trades);
            saveImportedTrades(result.trades);
          }
        });

      } else {
        setModalConfig({
          isOpen: true,
          title: "Aviso",
          message: "Nenhum trade válido foi encontrado. Verifique se o arquivo possui as informações da operação.",
          isError: true,
          onConfirm: closeModal
        });
      }
    } catch (error: any) {
      console.error('Erro na importação:', error);
      setModalConfig({
        isOpen: true,
        title: "Erro na Importação",
        message: error.message || "Falha ao ler o arquivo.",
        isError: true,
        onConfirm: closeModal
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const [customSetup, setCustomSetup] = useState('');
  
  const [forexSetups, setForexSetups] = useState<string[]>(() => {
    const saved = localStorage.getItem('app_forex_setups');
    return saved ? JSON.parse(saved) : ['OB', 'FVG', 'BOS', 'CHoCH', 'Liq Sweep', 'OTE', 'CISD'];
  });
  
  const [obSetups, setObSetups] = useState<string[]>(() => {
    const saved = localStorage.getItem('app_ob_setups');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('app_forex_setups', JSON.stringify(forexSetups));
  }, [forexSetups]);

  useEffect(() => {
    localStorage.setItem('app_ob_setups', JSON.stringify(obSetups));
  }, [obSetups]);

  const availableSetups = tradeType === 'forex' ? forexSetups : obSetups;

  const toggleSetup = (setup: string) => {
    setTradeData(prev => {
      if (prev.setups.includes(setup)) {
        return { ...prev, setups: prev.setups.filter(s => s !== setup) };
      } else {
        return { ...prev, setups: [...prev.setups, setup] };
      }
    });
  };

  const handleAddCustomSetup = () => {
    if (customSetup.trim() && !availableSetups.includes(customSetup.trim())) {
      if (tradeType === 'forex') {
        setForexSetups(prev => [...prev, customSetup.trim()]);
      } else {
        setObSetups(prev => [...prev, customSetup.trim()]);
      }
      setTradeData(prev => ({...prev, setups: [...prev.setups, customSetup.trim()]}));
      setCustomSetup('');
    }
  };

  const handleDeleteSelectedSetups = () => {
    if (tradeData.setups.length === 0) {
      setModalConfig({
        isOpen: true,
        title: "Nenhum Setup Selecionado",
        message: "Para excluir um ou mais setups, selecione-os primeiro na lista acima tocando neles.",
        isError: true,
        onConfirm: closeModal
      });
      return;
    }
    setModalConfig({
      isOpen: true,
      title: "Excluir Setups",
      message: `Tem certeza que deseja excluir ${tradeData.setups.length} setup(s) da sua lista de opções?`,
      confirmText: "Excluir",
      isError: true,
      onCancel: closeModal,
      onConfirm: () => {
        if (tradeType === 'forex') {
          setForexSetups(prev => prev.filter(s => !tradeData.setups.includes(s)));
        } else {
          setObSetups(prev => prev.filter(s => !tradeData.setups.includes(s)));
        }
        setTradeData(prev => ({...prev, setups: []}));
        closeModal();
      }
    });
  };

  const groupedTrades = trades.reduce((acc, trade) => {
    // Filter by Market
    if (tradeTypeFilter !== 'all' && trade.type !== tradeTypeFilter) return acc;
    // Filter by Account
    if (selectedAccountFilter !== 'all' && trade.accountId !== selectedAccountFilter) return acc;

    let dateStr = 'Data Desconhecida';
    if (trade.date) {
      if (trade.date.includes('-')) {
        const [year, month, day] = trade.date.split('-');
        dateStr = `${day}/${month}/${year}`;
      } else {
        dateStr = trade.date.split('.').join('/'); // Replace . with / if it comes from MT5
      }
    } else if (trade.closeTime?.toDate) {
      const d = trade.closeTime.toDate();
      dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    } else if (trade.closeTime) {
      const d = new Date(trade.closeTime);
      dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    }
    
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(trade);
    return acc;
  }, {} as Record<string, any[]>);

  // Calendar logic
  const currentYear = selectedCalendarDate.getFullYear();
  const currentMonth = selectedCalendarDate.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
  
  const calendarCells = [];
  
  // Dias do mês anterior
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    calendarCells.push(
      <div key={`prev-${i}`} className="min-h-[120px] p-3 border-r border-b border-outline-variant/20 relative bg-surface-container-low">
        <span className="absolute top-3 right-3 text-sm font-semibold text-outline-variant/50">{daysInPrevMonth - i}</span>
      </div>
    );
  }
  
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentYear, currentMonth, day);
    const dateStr = `${day.toString().padStart(2, '0')}/${(currentMonth + 1).toString().padStart(2, '0')}/${currentYear}`;
    const isoDateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const dayTrades = groupedTrades[dateStr] || [];
    const dayPnl = dayTrades.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
    const isWin = dayPnl > 0;
    const isLoss = dayPnl < 0;
    const active = isoDateStr === todayStr;
    
    calendarCells.push(
      <div 
        key={`day-${day}`} 
        onClick={() => {
          if (dayTrades.length > 0) {
            setExpandedTradeId(expandedTradeId === dateStr ? null : dateStr);
            setListMode('list');
          }
        }}
        className={`min-h-[120px] p-3 border-r border-b border-outline-variant/20 relative transition-colors ${active ? 'bg-surface-container border-l-2 border-l-secondary' : 'bg-surface-container-low'} ${dayTrades.length > 0 ? 'cursor-pointer hover:bg-surface-container-highest' : ''}`}
      >
        <span className="absolute top-3 right-3 text-sm md:text-base font-bold text-on-surface-variant">{day}</span>
        {dayTrades.length > 0 && (
          <div className="mt-8 space-y-1.5">
            <div className="flex justify-between text-xs md:text-sm">
              <span className="text-on-surface-variant">Trades:</span>
              <span className="text-on-surface font-extrabold">{dayTrades.length}</span>
            </div>
            <div className="flex justify-between text-xs md:text-sm">
              <span className="text-on-surface-variant">P&L:</span>
              <span className={`font-extrabold ${isWin ? 'text-secondary' : isLoss ? 'text-error' : 'text-on-surface'}`}>
                {isWin ? '+' : ''}{formatCurrency(dayPnl)}
              </span>
            </div>
            <div className={`h-1.5 w-full rounded-full mt-2 ${isWin ? 'bg-secondary' : isLoss ? 'bg-error' : 'bg-outline-variant'}`} />
          </div>
        )}
      </div>
    );
  }

  // Dias do próximo mês para completar a grade
  const totalCells = calendarCells.length;
  const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let i = 1; i <= remainingCells; i++) {
    calendarCells.push(
      <div key={`next-${i}`} className="min-h-[120px] p-3 border-r border-b border-outline-variant/20 relative bg-surface-container-low">
        <span className="absolute top-3 right-3 text-sm font-semibold text-outline-variant/50">{i}</span>
      </div>
    );
  }

  if (view === 'list') {
    return (
      <>
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto w-full space-y-8">
        <AdBanner isPro={isPro} globalSettings={globalSettings} className="mb-4" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
          <div className="flex-1">
            <span className="text-xs font-label uppercase tracking-[0.2em] text-primary-fixed-dim">Diário de Trades</span>
            <div className="flex flex-col md:flex-row md:items-center gap-4 mt-2">
              <h2 className="text-4xl font-bold font-headline text-on-surface">Seus Registros</h2>
              
              <div className="flex flex-wrap gap-2 md:ml-4">
                <select 
                  value={tradeTypeFilter}
                  onChange={(e) => setTradeTypeFilter(e.target.value as any)}
                  className="bg-surface-container border border-outline-variant/20 text-on-surface px-4 py-2 rounded-full text-xs font-bold outline-none cursor-pointer hover:bg-surface-container-highest transition-colors"
                >
                  <option value="all">Todos Mercados</option>
                  <option value="forex">Forex</option>
                  <option value="ob">Opções Binárias</option>
                </select>

                <select 
                  value={selectedAccountFilter}
                  onChange={(e) => setSelectedAccountFilter(e.target.value)}
                  className="bg-surface-container border border-outline-variant/20 text-on-surface px-4 py-2 rounded-full text-xs font-bold outline-none cursor-pointer hover:bg-surface-container-highest transition-colors"
                >
                  <option value="all">Todas Contas</option>
                  {accounts
                    .filter(acc => acc.status !== 'inactive')
                    .filter(acc => tradeTypeFilter === 'all' || acc.tradeType === tradeTypeFilter || (!acc.tradeType && tradeTypeFilter === 'forex'))
                    .map(acc => (
                    <option key={acc.id} value={acc.id}>Conta {acc.accountNumber}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex gap-1 bg-surface-container p-1 rounded-lg mr-2">
              <button 
                onClick={() => setListMode('list')}
                className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${listMode === 'list' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                Lista
              </button>
              <button 
                onClick={() => setListMode('calendar')}
                className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${listMode === 'calendar' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                Calendário
              </button>
            </div>
            <button 
              onClick={handleNewTradeClick}
              className="px-4 md:px-8 py-2.5 rounded-lg bg-primary text-on-primary font-bold shadow-xl shadow-primary/10 hover:scale-[1.02] active:scale-95 transition-all"
            >
              Novo Trade
            </button>
          </div>
        </div>

        {listMode === 'calendar' ? (
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-outline-variant/20">
              <button 
                onClick={() => setSelectedCalendarDate(new Date(currentYear, currentMonth - 1, 1))}
                className="material-symbols-outlined text-on-surface-variant hover:text-on-surface transition-colors text-2xl"
              >
                chevron_left
              </button>
              <span className="text-on-surface font-bold text-lg md:text-xl capitalize">
                {selectedCalendarDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
              </span>
              <button 
                onClick={() => setSelectedCalendarDate(new Date(currentYear, currentMonth + 1, 1))}
                className="material-symbols-outlined text-on-surface-variant hover:text-on-surface transition-colors text-2xl"
              >
                chevron_right
              </button>
            </div>
            <div className="w-full overflow-x-auto">
              <div className="min-w-[700px]">
                <div className="grid grid-cols-7 text-center border-b border-outline-variant/20 bg-surface-container">
                  {['DOMINGO', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO'].map(day => (
                    <div key={day} className="py-4 text-sm md:text-base font-extrabold text-on-surface-variant border-r border-outline-variant/20 last:border-0">{day}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {calendarCells}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.keys(groupedTrades).length === 0 ? (
              <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-8 text-center text-on-surface-variant">
                Nenhum trade registrado ainda.
              </div>
            ) : (
              (Object.entries(groupedTrades) as [string, any[]][]).sort((a, b) => {
                // Sort dates descending
                const [dayA, monthA, yearA] = a[0].split('/');
                const [dayB, monthB, yearB] = b[0].split('/');
                return new Date(`${yearB}-${monthB}-${dayB}`).getTime() - new Date(`${yearA}-${monthA}-${dayA}`).getTime();
              }).map(([date, dayTrades]) => {
                const dayPnl = dayTrades.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
                const isExpanded = expandedTradeId === date;

                return (
                  <div key={date} id={`day-group-${date.replace(/\//g, '-')}`} className={`bg-surface-container-low border ${isExpanded ? 'border-primary/50 shadow-xl shadow-primary/5 scale-[1.01]' : 'border-outline-variant/20'} rounded-2xl overflow-hidden transition-all duration-300`}>
                    <div 
                      className="p-4 md:p-6 cursor-pointer hover:bg-surface-container transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                      onClick={() => setExpandedTradeId(isExpanded ? null : date)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center">
                          <Calendar className="text-primary" />
                        </div>
                        <div>
                          <h3 className="text-lg md:text-xl font-bold text-on-surface font-headline">Diário de trade do dia {date}</h3>
                          <p className="text-sm text-on-surface-variant">{dayTrades.length} {dayTrades.length === 1 ? 'trade' : 'trades'} registrado(s)</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                        <div className="text-right">
                          <p className="text-xs text-on-surface-variant uppercase tracking-widest mb-1">Resultado do Dia</p>
                          <p className={`font-bold text-lg ${dayPnl >= 0 ? 'text-secondary' : 'text-error'}`}>
                            {dayPnl >= 0 ? '+' : ''}{formatCurrency(dayPnl)}
                          </p>
                        </div>
                        <span className={`material-symbols-outlined text-on-surface-variant transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                          expand_more
                        </span>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="p-4 md:p-6 border-t border-outline-variant/20 bg-surface-container-lowest space-y-4">
                        {dayTrades.map((trade, idx) => (
                          <div 
                            key={idx}
                            onClick={() => {
                              setSelectedTrade(trade);
                              handleViewChange('detail');
                            }}
                            className="bg-surface-container hover:bg-surface-container-highest transition-colors cursor-pointer rounded-xl p-4 border border-outline-variant/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-2 h-12 rounded-full ${trade.pnl >= 0 ? 'bg-secondary' : 'bg-error'}`}></div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-bold text-on-surface">{trade.symbol}</span>
                                  <span className={`text-xs px-2 py-0.5 rounded-sm font-bold ${trade.action === 'Buy' ? 'bg-secondary/20 text-secondary' : 'bg-error/20 text-error'}`}>
                                    {trade.type === 'ob' ? (trade.action === 'Buy' ? 'Acima' : 'Abaixo') : trade.action}
                                  </span>
                                </div>
                                <p className="text-xs text-on-surface-variant">Ticket: {trade.ticket} • {trade.type === 'ob' ? 'Valor: ' : 'Lotes: '}{trade.size}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                              <div className="hidden md:block text-right">
                                <p className="text-sm font-bold text-on-surface">{trade.session}</p>
                              </div>
                              {/* R:R hidden as per user request to avoid layout deformation */}
                              {/* 
                              <div className="hidden md:block text-right">
                                <p className="text-xs text-on-surface-variant">R:R</p>
                                <p className="text-sm font-bold text-primary">{trade.rr ? `1:${trade.rr}` : '-'}</p>
                              </div>
                              */}
                              <div className="text-right">
                                <p className={`font-bold ${trade.pnl >= 0 ? 'text-secondary' : 'text-error'}`}>
                                  {trade.pnl >= 0 ? '+' : ''}{formatCurrency(trade.pnl)}
                                </p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenShareTradeModal(trade);
                                }}
                                className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-colors ml-2"
                                title="Partilhar na Comunidade"
                              >
                                <Share2 className="w-5 h-5 text-primary" />
                              </button>
                              <ChevronRight className="text-on-surface-variant text-sm ml-2" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Trade Type Selection Modal */}
      {isTradeTypeModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container border border-outline-variant/20 rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-on-surface mb-2 font-headline">Novo Trade</h3>
              <p className="text-on-surface-variant text-sm mb-8">Selecione o tipo de mercado para este registro.</p>
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleOpenTradeForm('forex')}
                  className="flex flex-col items-center justify-center gap-4 p-6 rounded-xl border-2 border-outline-variant/20 hover:border-primary hover:bg-primary/5 transition-all group"
                >
                  <BarChart2 className="text-4xl text-on-surface-variant group-hover:text-primary transition-colors" />
                  <span className="font-bold text-on-surface">Forex / Índices</span>
                </button>
                <button
                  onClick={() => handleOpenTradeForm('ob')}
                  className="flex flex-col items-center justify-center gap-4 p-6 rounded-xl border-2 border-outline-variant/20 hover:border-primary hover:bg-primary/5 transition-all group"
                >
                  <Timer className="text-4xl text-on-surface-variant group-hover:text-primary transition-colors" />
                  <span className="font-bold text-on-surface">Opções Binárias</span>
                </button>
              </div>

              <button 
                onClick={() => setIsTradeTypeModalOpen(false)}
                className="mt-8 px-6 py-2 rounded-lg text-on-surface-variant font-bold hover:bg-surface-container transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Trade Modal */}
      {isShareModalOpen && shareTrade && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-surface-container border border-outline-variant/20 rounded-2xl p-6 md:p-8 max-w-xl w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-8">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-outline-variant/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
                  <Share2 size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-on-surface font-headline">Partilhar Trade na Comunidade</h3>
                  <p className="text-xs text-on-surface-variant">Publique o seu trade para a comunidade interagir</p>
                </div>
              </div>
              <button 
                onClick={() => setIsShareModalOpen(false)} 
                disabled={isPublishingToCommunity}
                className="p-2 text-on-surface-variant hover:text-on-surface rounded-lg hover:bg-surface-container-high transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5">
              {/* Feed selector */}
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                  Feed de Destino
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setShareFeed('forex')}
                    className={`py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                      shareFeed === 'forex' 
                        ? 'bg-primary/15 border-primary text-primary shadow-sm' 
                        : 'bg-surface-container-low border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    <BarChart2 size={16} />
                    <span>Forex / Índices</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShareFeed('ob')}
                    className={`py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                      shareFeed === 'ob' 
                        ? 'bg-primary/15 border-primary text-primary shadow-sm' 
                        : 'bg-surface-container-low border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    <Timer size={16} />
                    <span>Opções Binárias</span>
                  </button>
                </div>
              </div>

              {/* Caption Input */}
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                  Legenda / Comentário sobre o Trade
                </label>
                <textarea
                  value={shareCaption}
                  onChange={(e) => setShareCaption(e.target.value)}
                  rows={3}
                  placeholder="Escreva algo sobre este trade..."
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-3 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors resize-none"
                />
              </div>

              {/* Facebook-Style Live Preview */}
              <div>
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                  Pré-visualização do Post (Estilo Facebook)
                </p>
                <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-4 shadow-sm space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={auth.currentUser?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(auth.currentUser?.displayName || 'Trader')}&background=random`}
                      alt="Avatar"
                      className="w-9 h-9 rounded-full object-cover border border-outline-variant/30"
                    />
                    <div>
                      <p className="text-sm font-bold text-on-surface leading-tight">
                        {auth.currentUser?.displayName || 'Trader'}
                      </p>
                      <p className="text-[10px] text-on-surface-variant">Agora mesmo • C Profit Community</p>
                    </div>
                  </div>

                  {shareCaption && (
                    <p className="text-xs text-on-surface whitespace-pre-wrap leading-relaxed">
                      {shareCaption}
                    </p>
                  )}

                  <TradeShareCard 
                    tradeDetails={{
                      symbol: shareTrade.symbol,
                      action: shareTrade.action,
                      pnl: shareTrade.pnl,
                      type: shareTrade.type,
                      session: shareTrade.session,
                      size: shareTrade.size,
                      ticket: shareTrade.ticket,
                      openPrice: shareTrade.openPrice,
                      sl: shareTrade.sl,
                      tp: shareTrade.tp,
                      notes: shareTrade.notes,
                      studyLink: shareTrade.studyLink,
                      date: shareTrade.date,
                      timeframe: shareTrade.timeframe
                    }} 
                    imageUrl={shareTrade.studyLink}
                    userName={auth.currentUser?.displayName || 'Trader'}
                    interactive={false}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(false)}
                  disabled={isPublishingToCommunity}
                  className="px-5 py-2.5 rounded-xl text-on-surface-variant font-bold text-xs hover:bg-surface-container-high transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmShareToCommunity}
                  disabled={isPublishingToCommunity}
                  className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-xs hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 min-w-[150px] disabled:opacity-60"
                >
                  {isPublishingToCommunity ? (
                    <>
                      <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                      <span>Publicando...</span>
                    </>
                  ) : (
                    <>
                      <Share2 size={16} />
                      <span>Publicar na Comunidade</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </>
    );
  }

  if (view === 'detail' && selectedTrade) {
    return (
      <div className="p-4 md:p-8 max-w-[1600px] mx-auto w-full space-y-8">
        <div className="flex justify-between items-center mb-6">
          <button 
            onClick={() => {
              handleViewChange('list');
              setSelectedTrade(null);
            }}
            className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-bold"
          >
            <ArrowLeft className="" />
            Voltar para a Lista
          </button>
          <div className="flex gap-3">
            <button 
              onClick={() => handleOpenShareTradeModal(selectedTrade)}
              className="px-4 py-2 bg-primary/10 text-primary rounded-lg font-bold hover:bg-primary/20 transition-colors flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Partilhar na Comunidade
            </button>
            <button 
              onClick={() => handleDeleteTrade(selectedTrade.id)}
              className="px-6 py-2 bg-error/10 text-error rounded-lg font-bold hover:bg-error/20 transition-colors flex items-center gap-2"
            >
              <Trash2 className="" />
              Apagar
            </button>
            <button 
              onClick={() => {
                setEditingTradeId(selectedTrade.id);
                setTradeType(selectedTrade.type || 'forex');
                setTradeData({
                  accountId: selectedTrade.accountId || '',
                  symbol: selectedTrade.symbol || '',
                  session: selectedTrade.session || '',
                  action: selectedTrade.action || 'Buy',
                  openPrice: selectedTrade.openPrice?.toString() || '',
                  sl: selectedTrade.sl?.toString() || '',
                  tp: selectedTrade.tp?.toString() || '',
                  notes: selectedTrade.notes || '',
                  psychology: selectedTrade.psychology || '',
                  psychologyNotes: selectedTrade.psychologyNotes || '',
                  setups: selectedTrade.setups || [],
                  isCompliant: selectedTrade.isCompliant ?? true,
                  pnl: selectedTrade.pnl?.toString() || '',
                  rr: selectedTrade.rr?.toString() || '',
                  returnAmount: selectedTrade.returnAmount?.toString() || '',
                  size: selectedTrade.size?.toString() || '1.0',
                  type: selectedTrade.type || 'forex',
                  studyLink: selectedTrade.studyLink || '',
                  commission: selectedTrade.commission?.toString() || '',
                  date: selectedTrade.date || new Date().toISOString().split('T')[0],
                  entryTime: selectedTrade.entryTime || new Date().toTimeString().split(' ')[0].substring(0, 5),
                  timeframe: selectedTrade.timeframe || 'M5'
                });
                handleViewChange('form');
              }}
              className="px-4 py-1.5 rounded-full font-bold text-sm bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-2"
            >
              <Edit2 className="text-sm" />
              Editar
            </button>
            <span className={`px-4 py-1.5 rounded-full font-bold text-sm ${selectedTrade.pnl >= 0 ? 'bg-secondary/20 text-secondary' : 'bg-error/20 text-error'}`}>
              {selectedTrade.pnl >= 0 ? 'WIN' : 'LOSS'}
            </span>
          </div>
        </div>

        <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 mb-8 pb-8 border-b border-outline-variant/20">
            <div>
              <p className="text-xs font-label uppercase tracking-widest text-slate-500 mb-1">Ticket</p>
              <p className="text-xl font-bold text-on-surface truncate">{selectedTrade.ticket}</p>
            </div>
            <div>
              <p className="text-xs font-label uppercase tracking-widest text-slate-500 mb-1">Ativo</p>
              <p className="text-xl font-bold text-on-surface">{selectedTrade.symbol}</p>
            </div>
            <div>
              <p className="text-xs font-label uppercase tracking-widest text-slate-500 mb-1">Direção</p>
              <p className={`text-xl font-bold ${selectedTrade.action === 'Buy' ? 'text-secondary' : 'text-error'}`}>
                {selectedTrade.type === 'ob' ? (selectedTrade.action === 'Buy' ? 'Acima (Call)' : 'Abaixo (Put)') : selectedTrade.action}
              </p>
            </div>
            {/* R:R hidden as per user request to avoid layout deformation */}
            {/* 
            <div>
              <p className="text-xs font-label uppercase tracking-widest text-slate-500 mb-1">R:R</p>
              <p className="text-xl font-bold text-primary">
                {selectedTrade.rr ? `1:${selectedTrade.rr}` : '-'}
              </p>
            </div>
            */}
            <div>
              <p className="text-xs font-label uppercase tracking-widest text-slate-500 mb-1">P&L</p>
              <p className={`text-xl font-bold ${selectedTrade.pnl >= 0 ? 'text-secondary' : 'text-error'}`}>
                {selectedTrade.pnl >= 0 ? '+' : ''}{formatCurrency(selectedTrade.pnl)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h3 className="text-lg font-bold font-headline uppercase tracking-wider text-on-surface-variant">Detalhes da Execução</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-container p-4 rounded-xl">
                  <p className="text-xs font-label uppercase tracking-widest text-slate-500 mb-1">Data</p>
                  <p className="font-bold text-on-surface">{selectedTrade.date || '-'}</p>
                </div>
                <div className="bg-surface-container p-4 rounded-xl">
                  <p className="text-xs font-label uppercase tracking-widest text-slate-500 mb-1">Hora de Entrada</p>
                  <p className="font-bold text-on-surface">{selectedTrade.entryTime || '-'}</p>
                </div>
                <div className="bg-surface-container p-4 rounded-xl">
                  <p className="text-xs font-label uppercase tracking-widest text-slate-500 mb-1">Sessão</p>
                  <p className="font-bold text-on-surface">{selectedTrade.session}</p>
                </div>
                <div className="bg-surface-container p-4 rounded-xl">
                  <p className="text-xs font-label uppercase tracking-widest text-slate-500 mb-1">
                    {selectedTrade.type === 'ob' ? 'Valor Investido' : 'Lotes / Valor'}
                  </p>
                  <p className="font-bold text-on-surface">{selectedTrade.size}</p>
                </div>
                {selectedTrade.type !== 'ob' && (
                  <>
                    <div className="bg-surface-container p-4 rounded-xl">
                      <p className="text-xs font-label uppercase tracking-widest text-slate-500 mb-1">Preço Entrada</p>
                      <p className="font-bold text-on-surface">{selectedTrade.openPrice || '-'}</p>
                    </div>
                    <div className="bg-surface-container p-4 rounded-xl">
                      <p className="text-xs font-label uppercase tracking-widest text-slate-500 mb-1">Preço Fecho</p>
                      <p className="font-bold text-on-surface">{selectedTrade.closePrice || '-'}</p>
                    </div>
                    <div className="bg-surface-container p-4 rounded-xl">
                      <p className="text-xs font-label uppercase tracking-widest text-slate-500 mb-1">Stop Loss</p>
                      <p className="font-bold text-on-surface">{selectedTrade.sl || '-'}</p>
                    </div>
                    <div className="bg-surface-container p-4 rounded-xl">
                      <p className="text-xs font-label uppercase tracking-widest text-slate-500 mb-1">Take Profit</p>
                      <p className="font-bold text-on-surface">{selectedTrade.tp || '-'}</p>
                    </div>
                  </>
                )}
                {selectedTrade.type === 'ob' && (
                  <div className="bg-surface-container p-4 rounded-xl">
                    <p className="text-xs font-label uppercase tracking-widest text-slate-500 mb-1">Retorno (Payout %)</p>
                    <p className="font-bold text-on-surface">{selectedTrade.tp || '-'}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-bold font-headline uppercase tracking-wider text-on-surface-variant">Análise e Psicologia</h3>
              
              {selectedTrade.setups && selectedTrade.setups.length > 0 && (
                <div>
                  <p className="text-xs font-label uppercase tracking-widest text-slate-500 mb-2">Setups Utilizados</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedTrade.setups.map((s: string) => (
                      <span key={s} className="px-3 py-1 bg-primary text-on-primary rounded font-bold text-xs">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {selectedTrade.psychology && (
                <div>
                  <p className="text-xs font-label uppercase tracking-widest text-slate-500 mb-2">Estado Psicológico</p>
                  <span className="px-4 py-2 bg-surface-container-highest rounded-lg font-bold text-sm inline-flex items-center gap-2">
                    {selectedTrade.psychology === 'Calmo' && '🧘'}
                    {selectedTrade.psychology === 'Entusiasmado' && '⚡'}
                    {selectedTrade.psychology === 'Ansioso' && '😰'}
                    {selectedTrade.psychology === 'Cansado' && '😴'}
                    {selectedTrade.psychology}
                  </span>
                </div>
              )}

              {selectedTrade.notes && (
                <div>
                  <p className="text-xs font-label uppercase tracking-widest text-slate-500 mb-2">Notas / Razão</p>
                  <div className="bg-surface-container p-4 rounded-xl text-sm text-on-surface-variant whitespace-pre-wrap">
                    {renderFormattedText(selectedTrade.notes)}
                  </div>
                </div>
              )}
              
              {selectedTrade.psychologyNotes && (
                <div>
                  <p className="text-xs font-label uppercase tracking-widest text-slate-500 mb-2">Notas Psicológicas</p>
                  <div className="bg-surface-container p-4 rounded-xl text-sm text-on-surface-variant whitespace-pre-wrap">
                    {renderFormattedText(selectedTrade.psychologyNotes)}
                  </div>
                </div>
              )}

              {selectedTrade.studyLink && (
                <div>
                  <p className="text-xs font-label uppercase tracking-widest text-slate-500 mb-2">Estudo / Media</p>
                  {(() => {
                    const link = selectedTrade.studyLink.toLowerCase();
                    const isVideo = link.match(/\.(mp4|webm|ogg|mov)$/) || 
                                    link.includes('youtube.com') || 
                                    link.includes('youtu.be') || 
                                    link.includes('vimeo.com');
                    
                    if (isVideo) {
                      if (link.includes('youtube.com') || link.includes('youtu.be')) {
                        const videoId = link.includes('v=') ? link.split('v=')[1]?.split('&')[0] : link.split('/').pop();
                        return (
                          <div className="aspect-video w-full rounded-xl overflow-hidden border border-outline-variant/20 shadow-lg">
                            <iframe 
                              src={`https://www.youtube.com/embed/${videoId}`}
                              className="w-full h-full"
                              allowFullScreen
                              title="Trade Analysis Video"
                            ></iframe>
                          </div>
                        );
                      }
                      if (link.includes('vimeo.com')) {
                        const videoId = link.split('/').pop();
                        return (
                          <div className="aspect-video w-full rounded-xl overflow-hidden border border-outline-variant/20 shadow-lg">
                            <iframe 
                              src={`https://player.vimeo.com/video/${videoId}`}
                              className="w-full h-full"
                              allowFullScreen
                              title="Trade Analysis Video"
                            ></iframe>
                          </div>
                        );
                      }
                      return (
                        <video 
                          src={selectedTrade.studyLink} 
                          controls 
                          className="w-full h-auto rounded-xl border border-outline-variant/20 shadow-lg"
                        />
                      );
                    }

                    const isImage = link.match(/\.(jpeg|jpg|gif|png|webp)$/) || 
                                    selectedTrade.studyLink.includes('tradingview.com/x/') ||
                                    selectedTrade.studyLink.includes('firebasestorage.googleapis.com');

                    if (isImage) {
                      return (
                        <a 
                          href={selectedTrade.studyLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block rounded-xl overflow-hidden border border-outline-variant/20 hover:border-primary/50 transition-colors group relative"
                        >
                          <img 
                            src={selectedTrade.studyLink} 
                            alt="Estudo do Trade" 
                            className="w-full h-auto object-cover max-h-[500px]"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="bg-primary text-on-primary px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                              <ExternalLink className="" />
                              Ampliar Imagem
                            </span>
                          </div>
                        </a>
                      );
                    }

                    return (
                      <a 
                        href={selectedTrade.studyLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-bold text-sm hover:brightness-110 transition-colors"
                      >
                        <Link className="text-sm" />
                        Acessar Link do Estudo
                      </a>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto w-full">
      <div className="flex justify-between items-end mb-10">
        <div>
          <span className="text-xs font-label uppercase tracking-[0.2em] text-primary-fixed-dim">Entrada no Diário</span>
          <h2 className="text-4xl font-bold font-headline mt-2 text-on-surface">
            {tradeType === 'ob' ? 'Registro de Operações OB' : 'Registro de Operações Forex'}
          </h2>
        </div>
        <div className="flex gap-3 items-center">
          <button 
            type="button"
            onClick={() => handleViewChange('list')}
            className="px-6 py-2.5 rounded-lg border border-outline-variant/30 text-on-surface-variant font-medium hover:bg-surface-container transition-all flex items-center gap-2"
          >
            <ArrowLeft className="text-sm" />
            Voltar
          </button>

          <select 
            value={tradeData.accountId}
            onChange={(e) => {
              const newAccountId = e.target.value;
              const selectedAcc = accounts.find(a => a.id === newAccountId);
              const newTradeType = selectedAcc?.tradeType || 'forex';
              setTradeData({
                ...tradeData, 
                accountId: newAccountId,
                type: newTradeType
              });
              setTradeType(newTradeType);
            }}
            className="bg-surface-container-low border border-outline-variant/20 text-on-surface px-4 py-2.5 rounded-lg text-sm font-bold outline-none cursor-pointer"
          >
            <option value="" disabled>Selecione a Conta</option>
            {accounts.filter(acc => (tradeType === 'ob' ? acc.tradeType === 'ob' : acc.tradeType !== 'ob') && acc.status !== 'inactive' && !acc.isHidden).map(acc => (
              <option key={acc.id} value={acc.id}>
                Conta {acc.accountNumber}
              </option>
            ))}
          </select>
          {localStorage.getItem('app_default_trade_type') === 'ask' && (
            <button 
              type="button"
              onClick={() => {
                const newType = tradeType === 'ob' ? 'forex' : 'ob';
                handleOpenTradeForm(newType);
              }}
              className="px-6 py-2.5 rounded-lg border border-outline-variant/30 text-on-surface-variant font-medium hover:bg-surface-container transition-all flex items-center gap-2"
            >
              <ArrowRightLeft className="text-sm" />
              Mudar para {tradeType === 'ob' ? 'Forex' : 'OB'}
            </button>
          )}
          <button 
            type="button"
            onClick={() => {
              setTradeData({
                accountId: '',
                symbol: '',
                session: '',
                action: 'Buy',
                openPrice: '',
                sl: '',
                tp: '',
                notes: '',
                psychology: '',
                psychologyNotes: '',
                setups: [],
                pnl: '',
                rr: '',
                returnAmount: '',
                commission: '',
                size: '1.0',
                type: tradeType || 'forex',
                studyLink: '',
                date: new Date().toISOString().split('T')[0],
                entryTime: new Date().toTimeString().split(' ')[0].substring(0, 5),
                timeframe: 'M5'
              });
            }}
            className="px-6 py-2.5 rounded-lg border border-outline-variant/30 text-on-surface-variant font-medium hover:bg-surface-container transition-all"
          >
            Descartar Rascunho
          </button>
          
          {tradeType === 'forex' && (
            <>
              <input 
                type="file" 
                accept=".csv, .html, .htm" 
                onChange={handleFileUpload} 
                ref={fileInputRef}
                className="hidden" 
                id="file-upload"
              />
              <label 
                htmlFor="file-upload"
                className={`px-6 py-2.5 rounded-lg border border-primary/50 text-primary font-bold hover:bg-primary/10 transition-all cursor-pointer flex items-center gap-2 ${isSaving ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <UploadCloud className="text-sm" />
                Importar CSV/HTML
              </label>
            </>
          )}
        </div>
      </div>
      <div className="grid grid-cols-12 gap-8">
        {/* Left Column */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          <section className="bg-surface-container-low rounded-xl p-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <Activity className="text-primary" />
                <h3 className="text-lg font-bold font-headline uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
                  Parâmetros Principais
                </h3>
              </div>
              {(() => {
                const selectedAcc = accounts.find(a => a.id === tradeData.accountId);
                if (selectedAcc) {
                  return (
                    <div className="bg-primary px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-primary/20">
                      <span className="w-2 h-2 rounded-full bg-on-primary animate-pulse"></span>
                      <span className="text-on-primary font-bold text-sm">
                        Registrando na Conta: <span>{selectedAcc.accountNumber}</span> | Balanço: <span>{formatCurrency(selectedAcc.initialBalance)}</span>
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
            <div className={`grid grid-cols-1 ${tradeType === 'ob' ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-6`}>
              <div className="space-y-2">
                <label className="text-[10px] font-label uppercase tracking-widest text-slate-500 block">Data</label>
                <DatePicker 
                  date={tradeData.date ? new Date(tradeData.date + 'T12:00:00') : undefined}
                  onDateChange={(d) => {
                    if (d) {
                      setTradeData({...tradeData, date: d.toISOString().split('T')[0]});
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-label uppercase tracking-widest text-slate-500 block">Hora de Entrada</label>
                <input 
                  type="time"
                  value={tradeData.entryTime}
                  onChange={(e) => setTradeData({...tradeData, entryTime: e.target.value})}
                  className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 focus:ring-2 focus:ring-primary/20 text-on-surface"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-label uppercase tracking-widest text-slate-500 block">Par de Ativos</label>
                <input 
                  type="text"
                  list="symbols-list"
                  value={tradeData.symbol}
                  onChange={(e) => setTradeData({...tradeData, symbol: e.target.value})}
                  className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 focus:ring-2 focus:ring-primary/20 text-on-surface"
                  placeholder="Ex: EUR/USD, GER30"
                />
                <datalist id="symbols-list">
                  <option value="EUR/USD" />
                  <option value="GBP/JPY" />
                  <option value="XAU/USD" />
                  <option value="BTC/USDT" />
                  <option value="NAS100" />
                  <option value="GER30" />
                  <option value="US30" />
                </datalist>
              </div>
              {tradeType === 'ob' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-label uppercase tracking-widest text-slate-500 block">Timeframe</label>
                  <select 
                    value={tradeData.timeframe}
                    onChange={(e) => setTradeData({...tradeData, timeframe: e.target.value})}
                    className="w-full bg-[#0f1b30] border border-outline-variant/20 rounded-lg py-3 px-4 focus:ring-2 focus:ring-primary/20 text-[#f0f4ff] cursor-pointer outline-none"
                  >
                    <option className="bg-[#0f1b30] text-[#f0f4ff]" value="M1">M1</option>
                    <option className="bg-[#0f1b30] text-[#f0f4ff]" value="M5">M5</option>
                    <option className="bg-[#0f1b30] text-[#f0f4ff]" value="M15">M15</option>
                    <option className="bg-[#0f1b30] text-[#f0f4ff]" value="M30">M30</option>
                    <option className="bg-[#0f1b30] text-[#f0f4ff]" value="H1">H1</option>
                    <option className="bg-[#0f1b30] text-[#f0f4ff]" value="H4">H4</option>
                    <option className="bg-[#0f1b30] text-[#f0f4ff]" value="D1">D1</option>
                  </select>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-[10px] font-label uppercase tracking-widest text-slate-500 block">
                  {tradeType === 'ob' ? 'Período' : 'Sessão'}
                </label>
                <select 
                  value={tradeData.session}
                  onChange={(e) => setTradeData({...tradeData, session: e.target.value})}
                  className="w-full bg-[#0f1b30] border border-outline-variant/20 rounded-lg py-3 px-4 focus:ring-2 focus:ring-primary/20 text-[#f0f4ff] cursor-pointer outline-none"
                >
                  {tradeType === 'ob' ? (
                    <>
                      <option className="bg-[#0f1b30] text-[#f0f4ff]" value="Dia">Dia</option>
                      <option className="bg-[#0f1b30] text-[#f0f4ff]" value="Noite">Noite</option>
                    </>
                  ) : sessionType === 'simple' ? (
                    <>
                      <option className="bg-[#0f1b30] text-[#f0f4ff]" value="Londres">Londres</option>
                      <option className="bg-[#0f1b30] text-[#f0f4ff]" value="Nova Iorque">Nova Iorque</option>
                      <option className="bg-[#0f1b30] text-[#f0f4ff]" value="Asiática">Asiática</option>
                      <option className="bg-[#0f1b30] text-[#f0f4ff]" value="Importado">Importado</option>
                    </>
                  ) : (
                    <>
                      <optgroup label="Londres" className="bg-[#0f1b30] text-[#00f5a0] font-bold">
                        <option className="bg-[#0f1b30] text-[#f0f4ff]">Londres (Pré-Mercado)</option>
                        <option className="bg-[#0f1b30] text-[#f0f4ff]">Londres (Intra Mercado)</option>
                        <option className="bg-[#0f1b30] text-[#f0f4ff]">Londres (Zona Não Operável)</option>
                        <option className="bg-[#0f1b30] text-[#f0f4ff]">Londres (Fechamento)</option>
                      </optgroup>
                      <optgroup label="Nova Iorque" className="bg-[#0f1b30] text-[#00f5a0] font-bold">
                        <option className="bg-[#0f1b30] text-[#f0f4ff]">Nova Iorque (Pré-Mercado)</option>
                        <option className="bg-[#0f1b30] text-[#f0f4ff]">Nova Iorque (Intra Mercado)</option>
                        <option className="bg-[#0f1b30] text-[#f0f4ff]">Nova Iorque (Zona Não Operável)</option>
                        <option className="bg-[#0f1b30] text-[#f0f4ff]">Nova Iorque (Fechamento)</option>
                      </optgroup>
                      <optgroup label="Asiática" className="bg-[#0f1b30] text-[#00f5a0] font-bold">
                        <option className="bg-[#0f1b30] text-[#f0f4ff]">Asiática (Pré-Mercado)</option>
                        <option className="bg-[#0f1b30] text-[#f0f4ff]">Asiática (Intra Mercado)</option>
                        <option className="bg-[#0f1b30] text-[#f0f4ff]">Asiática (Zona Não Operável)</option>
                        <option className="bg-[#0f1b30] text-[#f0f4ff]">Asiática (Fechamento)</option>
                      </optgroup>
                      <option className="bg-[#0f1b30] text-[#f0f4ff]">Importado</option>
                    </>
                  )}
                </select>
              </div>
            </div>
            
            <div className="mt-8 space-y-2">
              <label className="text-[10px] font-label uppercase tracking-widest text-slate-500 block">Direção</label>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  type="button"
                  onClick={() => setTradeData({...tradeData, action: 'Buy'})}
                  className={`${tradeData.action === 'Buy' ? 'bg-secondary text-on-secondary shadow-lg shadow-secondary/20' : 'bg-surface-container-highest text-slate-400 hover:bg-surface-container hover:text-slate-300'} py-4 rounded-xl font-bold text-sm uppercase transition-all flex items-center justify-center gap-2`}
                >
                  <TrendingUp className="text-lg" />
                  {tradeType === 'ob' ? 'Acima (Call)' : 'Long (Compra)'}
                </button>
                <button 
                  type="button"
                  onClick={() => setTradeData({...tradeData, action: 'Sell'})}
                  className={`${tradeData.action === 'Sell' ? 'bg-error text-on-error shadow-lg shadow-error/20' : 'bg-surface-container-highest text-slate-400 hover:bg-surface-container hover:text-slate-300'} py-4 rounded-xl font-bold text-sm uppercase transition-all flex items-center justify-center gap-2`}
                >
                  <TrendingDown className="text-lg" />
                  {tradeType === 'ob' ? 'Abaixo (Put)' : 'Short (Venda)'}
                </button>
              </div>
            </div>
            <div className={`grid grid-cols-1 ${tradeType === 'forex' ? 'md:grid-cols-3' : 'md:grid-cols-4'} gap-6 mt-8`}>
              {tradeType === 'forex' ? (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-label uppercase tracking-widest text-slate-500 block">Preço de Entrada</label>
                    <input 
                      type="number"
                      value={tradeData.openPrice}
                      onChange={(e) => setTradeData({...tradeData, openPrice: e.target.value})}
                      className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 focus:ring-2 focus:ring-primary/20 text-on-surface" 
                      placeholder="1.08450" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-label uppercase tracking-widest text-slate-500 block">Stop Loss</label>
                    <input 
                      type="number"
                      value={tradeData.sl}
                      onChange={(e) => setTradeData({...tradeData, sl: e.target.value})}
                      className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 focus:ring-2 focus:ring-primary/20 text-on-surface" 
                      placeholder="1.08210" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-label uppercase tracking-widest text-slate-500 block">Take Profit</label>
                    <input 
                      type="number"
                      value={tradeData.tp}
                      onChange={(e) => setTradeData({...tradeData, tp: e.target.value})}
                      className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 focus:ring-2 focus:ring-primary/20 text-on-surface" 
                      placeholder="1.08950" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-label uppercase tracking-widest text-slate-500 block">Volume (Lotes / Valor)</label>
                    <input 
                      type="number"
                      value={tradeData.size}
                      onChange={(e) => setTradeData({...tradeData, size: e.target.value})}
                      className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 focus:ring-2 focus:ring-primary/20 text-on-surface" 
                      placeholder="1.0" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-label uppercase tracking-widest text-slate-500 block">Lucro/Prejuízo (P&L)</label>
                    <input 
                      type="number"
                      value={tradeData.pnl}
                      onChange={(e) => setTradeData({...tradeData, pnl: e.target.value})}
                      className={`w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 focus:ring-2 focus:ring-primary/20 font-bold ${Number(tradeData.pnl) > 0 ? 'text-secondary' : Number(tradeData.pnl) < 0 ? 'text-error' : 'text-on-surface'}`} 
                      placeholder="0.00" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-label uppercase tracking-widest text-slate-500 block">Risco/Retorno (R:R)</label>
                    <div className="flex items-center bg-surface-container-highest rounded-lg px-4 focus-within:ring-2 focus-within:ring-primary/20">
                      <span className="text-primary font-bold">1:</span>
                      <input 
                        type="number"
                        step="0.1"
                        value={tradeData.rr}
                        onChange={(e) => setTradeData({...tradeData, rr: e.target.value})}
                        className="w-full bg-transparent border-none py-3 px-2 text-primary font-bold focus:ring-0" 
                        placeholder="2.5" 
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-label uppercase tracking-widest text-slate-500 block">Lucro/Prejuízo (P&L)</label>
                    <input 
                      type="number"
                      value={tradeData.pnl}
                      onChange={(e) => setTradeData({...tradeData, pnl: e.target.value})}
                      className={`w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 focus:ring-2 focus:ring-primary/20 font-bold ${Number(tradeData.pnl) > 0 ? 'text-secondary' : Number(tradeData.pnl) < 0 ? 'text-error' : 'text-on-surface'}`} 
                      placeholder="0.00" 
                    />
                  </div>
                </>
              )}
            </div>
          </section>
          <section className="bg-surface-container-low rounded-xl p-8 shadow-sm">
            <h3 className="text-sm font-bold font-headline uppercase tracking-widest text-slate-500 mb-6">Setups Técnicos</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {availableSetups.map(setup => (
                <button 
                  key={setup}
                  type="button"
                  onClick={() => toggleSetup(setup)}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-colors border ${
                    tradeData.setups.includes(setup) 
                      ? 'bg-primary-container text-on-primary-container border-primary/20' 
                      : 'bg-surface-container-highest text-on-surface-variant border-transparent hover:bg-primary/10'
                  }`}
                >
                  {setup}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customSetup}
                onChange={(e) => setCustomSetup(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomSetup();
                  }
                }}
                placeholder="Adicionar setup manual..."
                className="flex-1 bg-surface-container-highest border-none rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary/20 text-white font-bold"
              />
              <button
                type="button"
                onClick={handleAddCustomSetup}
                className="bg-primary/10 text-primary hover:bg-primary/20 px-3 py-2 rounded-lg transition-colors flex items-center justify-center"
              >
                <Plus className="text-sm" />
              </button>
              <button
                type="button"
                onClick={handleDeleteSelectedSetups}
                className="bg-error/10 text-error hover:bg-error/20 px-3 py-2 rounded-lg transition-colors flex items-center justify-center"
                title="Excluir o(s) setup(s) selecionado(s)"
              >
                <Trash2 className="text-sm" />
              </button>
            </div>
          </section>
        </div>
        {/* Right Column */}
        <div className="col-span-12 lg:col-span-4 space-y-8">
          <section className="bg-surface-container-low rounded-xl p-6 shadow-sm border border-tertiary-container/10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold font-headline uppercase tracking-widest text-slate-500">Conformidade com o Plano</h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={tradeData.isCompliant}
                  onChange={(e) => setTradeData({...tradeData, isCompliant: e.target.checked})}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-error peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
              </label>
            </div>
            <div className="space-y-4">
              {!tradeData.isCompliant && (
                <p className="text-[11px] text-error font-medium">Aviso: Registo de desvio ativado. Por favor, explique por que quebrou as regras de trading.</p>
              )}
              <textarea 
                value={tradeData.notes}
                onChange={(e) => setTradeData({...tradeData, notes: e.target.value})}
                className="w-full bg-surface-container-highest border-none rounded-lg p-3 text-sm min-h-[100px] focus:ring-1 focus:ring-tertiary-container/50 text-white font-bold placeholder:text-slate-500" 
                placeholder="ex: Entrada antecipada por FOMO, faltou confirmação..."
              ></textarea>
            </div>
            <div className="mt-6 space-y-2">
              <label className="text-[10px] font-label uppercase tracking-widest text-slate-500 block">Link do Estudo (TradingView, etc)</label>
              <input 
                type="url"
                value={tradeData.studyLink || ''}
                onChange={(e) => setTradeData({...tradeData, studyLink: e.target.value})}
                className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 focus:ring-2 focus:ring-primary/20 text-white font-bold text-sm" 
                placeholder="https://www.tradingview.com/x/..." 
              />
            </div>
          </section>
          <section className="bg-surface-container-low rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-bold font-headline uppercase tracking-widest text-slate-500 mb-6">Estado Psicológico</h3>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <button 
                type="button"
                onClick={() => setTradeData({...tradeData, psychology: 'Calmo'})}
                className={`p-3 rounded-lg flex flex-col items-center gap-2 transition-all border ${tradeData.psychology === 'Calmo' ? 'bg-secondary/10 border-secondary/20 grayscale-0' : 'bg-surface-container-highest border-transparent grayscale hover:grayscale-0 hover:bg-secondary/10 hover:border-secondary/20'}`}
              >
                <span className="text-xl">🧘</span>
                <span className="text-[10px] font-label uppercase">Calmo</span>
              </button>
              <button 
                type="button"
                onClick={() => setTradeData({...tradeData, psychology: 'Entusiasmado'})}
                className={`p-3 rounded-lg flex flex-col items-center gap-2 transition-all border ${tradeData.psychology === 'Entusiasmado' ? 'bg-primary/10 border-primary/20 grayscale-0' : 'bg-surface-container-highest border-transparent grayscale hover:grayscale-0 hover:bg-primary/10 hover:border-primary/20'}`}
              >
                <span className="text-xl">⚡</span>
                <span className="text-[10px] font-label uppercase">Entusiasmado</span>
              </button>
              <button 
                type="button"
                onClick={() => setTradeData({...tradeData, psychology: 'Ansioso'})}
                className={`p-3 rounded-lg flex flex-col items-center gap-2 transition-all border ${tradeData.psychology === 'Ansioso' ? 'bg-tertiary-container/10 border-tertiary-container/20 grayscale-0' : 'bg-surface-container-highest border-transparent grayscale hover:grayscale-0 hover:bg-tertiary-container/10 hover:border-tertiary-container/20'}`}
              >
                <span className="text-xl">😰</span>
                <span className="text-[10px] font-label uppercase">Ansioso</span>
              </button>
              <button 
                type="button"
                onClick={() => setTradeData({...tradeData, psychology: 'Cansado'})}
                className={`p-3 rounded-lg flex flex-col items-center gap-2 transition-all border ${tradeData.psychology === 'Cansado' ? 'bg-surface-bright border-transparent grayscale-0' : 'bg-surface-container-highest border-transparent grayscale hover:grayscale-0 hover:bg-surface-bright'}`}
              >
                <span className="text-xl">😴</span>
                <span className="text-[10px] font-label uppercase">Cansado</span>
              </button>
            </div>
            <textarea 
              value={tradeData.psychologyNotes}
              onChange={(e) => setTradeData({...tradeData, psychologyNotes: e.target.value})}
              className="w-full bg-surface-container-highest border-none rounded-lg p-3 text-sm min-h-[150px] focus:ring-1 focus:ring-primary/50 text-on-surface-variant placeholder:text-slate-600" 
              placeholder="Notas detalhadas sobre como se sentiu antes e durante a execução..."
            ></textarea>
          </section>
        </div>
      </div>
      <section className="mt-8 bg-gradient-to-r from-surface-container-low to-surface-container rounded-xl p-8 border border-outline-variant/10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex-1">
            <h3 className="text-sm font-bold font-headline uppercase tracking-widest text-slate-500 mb-4">Resultado Final</h3>
            <p className="text-on-surface-variant text-sm">Revise as informações acima e clique em salvar para registrar o trade.</p>
          </div>
          <div className="w-full md:w-auto">
            <button 
              type="button"
              onClick={handleSaveTrade}
              disabled={isSaving}
              className="w-full md:w-auto px-12 py-4 bg-surface-container-highest rounded-lg font-bold text-on-surface border border-outline-variant/20 hover:border-primary/50 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <Save className="" />
              {isSaving ? 'Salvando...' : 'Guardar para Revisão'}
            </button>
          </div>
        </div>
      </section>

      {/* Import Modal */}
      {(isImporting || importedTradesToReview.length > 0) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container border border-outline-variant/20 rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="text-center">
              {isImporting ? (
                <>
                  <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                  <h3 className="text-xl font-bold text-on-surface mb-2">Lendo Arquivo...</h3>
                  <p className="text-on-surface-variant text-sm">Por favor, aguarde enquanto processamos os dados.</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="text-3xl text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-on-surface mb-2">Arquivo Processado</h3>
                  <p className="text-on-surface-variant text-sm mb-8">
                    Foram encontrados <strong className="text-primary">{importedTradesToReview.length}</strong> trades no arquivo. Deseja importá-los para a sua conta?
                  </p>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => {
                        setImportedTradesToReview([]);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="flex-1 px-4 py-2.5 rounded-lg border border-outline-variant/30 text-on-surface-variant font-bold hover:bg-surface-container transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={() => saveImportedTrades(importedTradesToReview)}
                      className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-on-primary font-bold hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      Salvar Importação
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <Modal {...modalConfig} />
    </div>
  );
}
