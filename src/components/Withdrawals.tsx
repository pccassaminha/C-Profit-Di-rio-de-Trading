import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useCurrency } from '../contexts/CurrencyContext';
import { useTrades } from '../hooks/useTrades';
import { DateRangePicker } from './DateRangePicker';
import { DatePicker } from './DatePicker';
import { DateRange } from 'react-day-picker';

export default function Withdrawals() {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const { allTrades: trades, loading: loadingTrades } = useTrades();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { formatCurrency } = useCurrency();

  const [newWithdrawal, setNewWithdrawal] = useState({
    accountId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    if (!auth.currentUser) return;

    const unsubscribes: (() => void)[] = [];

    // --- ACCOUNTS ---
    // Path 1 (old)
    const qAccOld = query(collection(db, 'accounts'), where('userId', '==', auth.currentUser.uid));
    const unsubAccOld = onSnapshot(qAccOld, (snapshot) => {
      const accountsOld = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      updateAccounts(accountsOld, 'old');
    });
    unsubscribes.push(unsubAccOld);

    // Path 2 (new)
    const qAccNew = query(collection(db, 'usuarios', auth.currentUser.uid, 'accounts'));
    const unsubAccNew = onSnapshot(qAccNew, (snapshot) => {
      const accountsNew = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      updateAccounts(accountsNew, 'new');
    });
    unsubscribes.push(unsubAccNew);

    const accountsByPath: Record<string, any[]> = { old: [], new: [] };
    const updateAccounts = (data: any[], path: 'old' | 'new') => {
      accountsByPath[path] = data;
      const combined = [...accountsByPath.new, ...accountsByPath.old];
      const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
      setAccounts(unique);
      if (unique.length > 0 && !newWithdrawal.accountId) {
        setNewWithdrawal(prev => ({ ...prev, accountId: unique[0].id }));
      }
    };

    // --- WITHDRAWALS ---
    const withdrawalsQuery = query(
      collection(db, 'withdrawals'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('date', 'desc')
    );
    unsubscribes.push(onSnapshot(withdrawalsQuery, (snapshot) => {
      setWithdrawals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }));

    return () => unsubscribes.forEach(unsub => unsub());
  }, [auth.currentUser]);

  const handleSave = async () => {
    if (!auth.currentUser || !newWithdrawal.accountId || !newWithdrawal.amount) return;

    setIsSaving(true);
    try {
      await addDoc(collection(db, 'withdrawals'), {
        userId: auth.currentUser.uid,
        accountId: newWithdrawal.accountId,
        amount: parseFloat(newWithdrawal.amount),
        date: newWithdrawal.date,
        notes: newWithdrawal.notes,
        createdAt: serverTimestamp()
      });
      setIsModalOpen(false);
      setNewWithdrawal({
        accountId: accounts.length > 0 ? accounts[0].id : '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });
    } catch (error) {
      console.error("Error saving withdrawal:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredWithdrawals = useMemo(() => {
    if (!dateRange?.from) return withdrawals;
    
    return withdrawals.filter(w => {
      const wDate = new Date(w.date);
      // Reset time to start of day for accurate comparison
      wDate.setHours(0, 0, 0, 0);
      
      const fromDate = new Date(dateRange.from!);
      fromDate.setHours(0, 0, 0, 0);
      
      if (dateRange.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        return wDate >= fromDate && wDate <= toDate;
      }
      
      return wDate.getTime() === fromDate.getTime();
    });
  }, [withdrawals, dateRange]);

  const activeAccounts = accounts.filter(a => a.status !== 'inactive');
  const activeAccountIds = new Set(activeAccounts.map(a => a.id));
  const activeTrades = trades.filter(t => t.accountId ? activeAccountIds.has(t.accountId) : true);

  const totalWithdrawn = filteredWithdrawals.reduce((sum, w) => sum + (w.amount || 0), 0);
  
  const totalInitialBalance = activeAccounts.reduce((sum, a) => sum + (a.initialBalance || 0), 0);
  const totalPnL = activeTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  // Optional: only subtract withdrawals from active accounts if withdrawals are linked to accounts? Currently withdrawals are global.
  const totalWithdrawnAllTime = withdrawals.reduce((sum, w) => sum + (w.amount || 0), 0);
  const remainingBalance = totalInitialBalance + totalPnL - totalWithdrawnAllTime;

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
        <div>
          <span className="text-xs font-label uppercase tracking-[0.2em] text-primary-fixed-dim">Gestão Financeira</span>
          <h2 className="text-4xl font-bold font-headline mt-2 text-on-surface">Levantamentos</h2>
        </div>
        <div className="flex gap-3 items-center w-full md:w-auto">
          <DateRangePicker 
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-2.5 rounded-lg bg-primary text-on-primary font-bold shadow-xl shadow-primary/10 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Registrar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 md:p-8">
          <h3 className="text-on-surface-variant font-bold text-sm uppercase tracking-wider mb-2">Total Sacado (Período)</h3>
          <p className="text-4xl font-bold text-secondary">{formatCurrency(totalWithdrawn)}</p>
        </div>
        <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 md:p-8">
          <h3 className="text-on-surface-variant font-bold text-sm uppercase tracking-wider mb-2">Capital Geral (Disponível para Levantamento)</h3>
          <p className="text-4xl font-bold text-primary">{formatCurrency(remainingBalance)}</p>
        </div>
      </div>

      <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm md:text-base text-left">
            <thead className="bg-surface-container">
              <tr className="text-on-surface-variant text-xs md:text-sm font-medium">
                <th className="font-normal py-4 px-6">Data</th>
                <th className="font-normal py-4 px-6">Conta</th>
                <th className="font-normal py-4 px-6">Valor</th>
                <th className="font-normal py-4 px-6">Saldo Restante</th>
                <th className="font-normal py-4 px-6">Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {filteredWithdrawals.length > 0 ? (
                filteredWithdrawals.map((w) => {
                  const account = accounts.find(a => a.id === w.accountId);
                  // Calculate remaining balance at the time of withdrawal
                  // This is an approximation since we don't have the exact PnL at that specific date easily accessible without complex querying.
                  // We'll show the current remaining balance of that account for simplicity, or we can calculate it based on trades up to that date.
                  const wDate = new Date(w.date);
                  const accountTradesUpToDate = trades.filter(t => t.accountId === w.accountId && new Date(t.date) <= wDate);
                  const accountWithdrawalsUpToDate = withdrawals.filter(otherW => otherW.accountId === w.accountId && new Date(otherW.date) <= wDate);
                  
                  const pnlUpToDate = accountTradesUpToDate.reduce((sum, t) => sum + (t.pnl || 0), 0);
                  const withdrawalsUpToDate = accountWithdrawalsUpToDate.reduce((sum, otherW) => sum + (otherW.amount || 0), 0);
                  const balanceAfterWithdrawal = (account?.initialBalance || 0) + pnlUpToDate - withdrawalsUpToDate;

                  return (
                    <tr key={w.id} className="hover:bg-surface-container-highest transition-colors">
                      <td className="py-4 px-6 text-on-surface whitespace-nowrap">
                        {new Date(w.date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-4 px-6 text-on-surface whitespace-nowrap">
                        {account ? `Conta ${account.accountNumber}` : 'Conta Desconhecida'}
                      </td>
                      <td className="py-4 px-6 text-secondary font-bold whitespace-nowrap">
                        {formatCurrency(w.amount)}
                      </td>
                      <td className="py-4 px-6 text-primary font-bold whitespace-nowrap">
                        {formatCurrency(balanceAfterWithdrawal)}
                      </td>
                      <td className="py-4 px-6 text-on-surface-variant max-w-xs truncate">
                        {w.notes || '-'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-on-surface-variant">
                    Nenhum levantamento registrado neste período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Registrar Levantamento */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container border border-outline-variant/20 rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-on-surface font-headline">Registrar Levantamento</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2">Conta</label>
                <select 
                  value={newWithdrawal.accountId}
                  onChange={(e) => setNewWithdrawal({...newWithdrawal, accountId: e.target.value})}
                  className="w-full bg-surface-container-highest border border-outline-variant/30 text-on-surface px-4 py-3 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                >
                  <option value="" disabled>Selecione a Conta</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>Conta {acc.accountNumber}</option>
                  ))}
                </select>
              </div>

              {newWithdrawal.accountId && (
                <div className="bg-surface-container-highest p-4 rounded-xl border border-outline-variant/20">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-on-surface-variant uppercase tracking-widest">Saldo Atual da Conta</span>
                    <span className="font-bold text-on-surface">
                      {formatCurrency(
                        (accounts.find(a => a.id === newWithdrawal.accountId)?.initialBalance || 0) +
                        trades.filter(t => t.accountId === newWithdrawal.accountId).reduce((sum, t) => sum + (t.pnl || 0), 0) -
                        withdrawals.filter(w => w.accountId === newWithdrawal.accountId).reduce((sum, w) => sum + (w.amount || 0), 0)
                      )}
                    </span>
                  </div>
                  {newWithdrawal.amount && !isNaN(parseFloat(newWithdrawal.amount)) && (
                    <div className="flex justify-between items-center pt-2 border-t border-outline-variant/20">
                      <span className="text-xs text-secondary uppercase tracking-widest font-bold">Saldo Após Levantamento</span>
                      <span className="font-bold text-secondary">
                        {formatCurrency(
                          (accounts.find(a => a.id === newWithdrawal.accountId)?.initialBalance || 0) +
                          trades.filter(t => t.accountId === newWithdrawal.accountId).reduce((sum, t) => sum + (t.pnl || 0), 0) -
                          withdrawals.filter(w => w.accountId === newWithdrawal.accountId).reduce((sum, w) => sum + (w.amount || 0), 0) -
                          parseFloat(newWithdrawal.amount)
                        )}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2">Valor</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={newWithdrawal.amount}
                  onChange={(e) => setNewWithdrawal({...newWithdrawal, amount: e.target.value})}
                  className="w-full bg-surface-container-highest border border-outline-variant/30 text-on-surface px-4 py-3 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2">Data</label>
                <DatePicker 
                  date={newWithdrawal.date ? new Date(newWithdrawal.date + 'T12:00:00') : undefined}
                  onDateChange={(d) => {
                    if (d) {
                      setNewWithdrawal({...newWithdrawal, date: d.toISOString().split('T')[0]});
                    }
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2">Notas (Opcional)</label>
                <textarea 
                  value={newWithdrawal.notes}
                  onChange={(e) => setNewWithdrawal({...newWithdrawal, notes: e.target.value})}
                  className="w-full bg-surface-container-highest border border-outline-variant/30 text-on-surface px-4 py-3 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all min-h-[100px]"
                  placeholder="Motivo do saque, etc..."
                />
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-4 py-3 rounded-xl border border-outline-variant/30 text-on-surface-variant font-bold hover:bg-surface-container transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving || !newWithdrawal.accountId || !newWithdrawal.amount}
                className="flex-1 px-4 py-3 rounded-xl bg-primary text-on-primary font-bold hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
              >
                {isSaving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
