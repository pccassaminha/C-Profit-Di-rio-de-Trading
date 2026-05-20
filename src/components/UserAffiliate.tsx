import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { 
  Copy, 
  Check, 
  Users, 
  DollarSign, 
  Gift, 
  ArrowRight, 
  TrendingUp, 
  Wallet, 
  Clock, 
  AlertCircle,
  HelpCircle,
  Award
} from 'lucide-react';

interface ReferralRecord {
  id: string;
  referredId: string;
  referredName: string;
  referredEmail: string;
  referredPlan?: string;
  paymentAmount?: number;
  rewardType: 'free_month' | 'commission_30';
  rewardValue: number | string;
  status: 'pending_approval' | 'approved' | 'rejected';
  createdAt: string;
  approvedAt?: string;
}

interface UserProfile {
  nome: string;
  email: string;
  referredBy?: string;
  affiliateBalance?: number;
  freeMonthsEarned?: number;
}

export default function UserAffiliate() {
  const currentUser = auth.currentUser;
  const [copied, setCopied] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [globalSettings, setGlobalSettings] = useState<any>(null);
  
  // Withdraw request form
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [payoutForm, setPayoutForm] = useState({
    iban: '',
    fullName: '',
    amount: ''
  });
  const [payoutSuccess, setPayoutSuccess] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);

  const referralLink = `${window.location.origin}?ref=${currentUser?.uid || ''}`;

  // Load user profile
  useEffect(() => {
    if (!currentUser) return;
    const unsubProfile = onSnapshot(doc(db, 'usuarios', currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      }
    });

    // Load user's referrals
    const qReferrals = query(
      collection(db, 'referrals'),
      where('referrerId', '==', currentUser.uid)
    );
    const unsubReferrals = onSnapshot(qReferrals, (snapshot) => {
      setReferrals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReferralRecord)));
    });

    // Load user's payouts
    const qPayouts = query(
      collection(db, 'affiliate_payouts'),
      where('userId', '==', currentUser.uid)
    );
    const unsubPayouts = onSnapshot(qPayouts, (snapshot) => {
      setPayouts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Load global settings
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        setGlobalSettings(docSnap.data());
      }
    });

    return () => {
      unsubProfile();
      unsubReferrals();
      unsubPayouts();
      unsubSettings();
    };
  }, [currentUser]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setPayoutError(null);
    setPayoutSuccess(false);

    const amountNum = Number(payoutForm.amount);
    const currentBalance = profile?.affiliateBalance || 0;

    if (!payoutForm.iban || !payoutForm.fullName || !payoutForm.amount) {
      setPayoutError('Por favor, preencha todos os campos.');
      return;
    }

    if (isNaN(amountNum) || amountNum <= 0) {
      setPayoutError('Por favor, insira um valor de saque válido.');
      return;
    }

    if (amountNum > currentBalance) {
      setPayoutError(`Saldo insuficiente. O seu saldo disponível é de ${currentBalance.toLocaleString()} Kz.`);
      return;
    }

    if (amountNum < 5000) {
      setPayoutError('O valor mínimo para solicitação de levantamento é de 5.000 Kz.');
      return;
    }

    setRequestingPayout(true);
    try {
      // Create affiliate payout record
      await addDoc(collection(db, 'affiliate_payouts'), {
        userId: currentUser.uid,
        userName: profile?.nome || currentUser.displayName || 'Afiliado',
        userEmail: currentUser.email,
        iban: payoutForm.iban.trim(),
        fullName: payoutForm.fullName.trim(),
        amount: amountNum,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Optimistically deduct balance to prevent double withdraw
      await updateDoc(doc(db, 'usuarios', currentUser.uid), {
        affiliateBalance: currentBalance - amountNum
      });

      setPayoutSuccess(true);
      setPayoutForm({ iban: '', fullName: '', amount: '' });
    } catch (err: any) {
      setPayoutError(err.message || 'Erro ao processar solicitação de levantamento.');
    } finally {
      setRequestingPayout(false);
    }
  };

  const activeMode = globalSettings?.affiliateMode || 'commission_30';

  // Statistics
  const totalInvitedCount = referrals.length;
  const approvedInvites = referrals.filter(r => r.status === 'approved');
  const approvedInvitedCount = approvedInvites.length;
  
  // Progress when free month is selected (every 2 invites gets 1 month)
  // Total months earned: Math.floor(approvedInvitedCount / 2). Progress of next month: approvedInvitedCount % 2
  const freeMonthProgress = approvedInvitedCount % 2;
  const totalFreeMonthsEarned = Math.floor(approvedInvitedCount / 2);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-on-surface font-headline italic uppercase tracking-tighter">
            Área de <span className="text-primary italic">Afiliados</span>
          </h2>
          <p className="text-sm text-on-surface-variant max-w-2xl mt-1 font-medium leading-relaxed">
            Convide amigos e outros traders para a plataforma Profit e ganhe prêmios exclusivos ou 30% de comissões em dinheiro diretamente na sua conta bancária.
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column: Link generation and current stats */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Link Box */}
          <div className="bg-gradient-to-br from-surface-container-low to-surface-container border border-outline-variant/30 rounded-[32px] p-6 md:p-8 space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-[-20%] right-[-10%] w-[35%] h-[55%] bg-primary/5 rounded-full blur-[80px]"></div>
            
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 font-black px-3 py-1 rounded-full uppercase tracking-widest">
                  O Seu Link Único
                </span>
                <h3 className="text-xl font-bold mt-3 text-on-surface">Comece a Convidar Traders</h3>
              </div>
              <Award className="text-primary h-8 w-8 shrink-0" />
            </div>

            <p className="text-xs text-on-surface-variant/80 leading-relaxed font-medium">
              Abaixo está o seu link de convite exclusivo. Qualquer pessoa que criar conta na plataforma Profit através dele será associada a si como recomendado directo.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <input 
                type="text" 
                readOnly 
                value={referralLink}
                className="flex-1 bg-surface-container-high border border-outline-variant/30 rounded-2xl px-5 py-4 text-sm font-bold text-on-surface select-all text-ellipsis overflow-hidden font-mono outline-none"
              />
              <button 
                onClick={handleCopyLink}
                className={`flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-primary text-on-primary hover:scale-[1.02] active:scale-95'}`}
              >
                {copied ? (
                  <>
                    <Check size={16} /> Copiado!
                  </>
                ) : (
                  <>
                    <Copy size={16} /> Copiar Link
                  </>
                )}
              </button>
            </div>

            <div className="pt-4 border-t border-outline-variant/10 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-surface-container-high/30 rounded-xl">
                <Check className="text-emerald-500 shrink-0" size={16} />
                <span className="text-[11px] font-semibold text-on-surface-variant">Válido no primeiro plano de assinatura contratado</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-surface-container-high/30 rounded-xl">
                <Check className="text-emerald-500 shrink-0" size={16} />
                <span className="text-[11px] font-semibold text-on-surface-variant">Prêmios liberados de imediato após aprovação do Maestro</span>
              </div>
            </div>
          </div>

          {/* Stat indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-6 shadow-xl flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shrink-0">
                <Users size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest">Total de Ativações</p>
                <p className="text-2xl font-black text-on-surface mt-1">{totalInvitedCount} <span className="text-xs text-on-surface-variant font-medium">cliques/reg.</span></p>
              </div>
            </div>

            <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-6 shadow-xl flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 shrink-0">
                <Award size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest">Recomendações Válidas</p>
                <p className="text-2xl font-black text-on-surface mt-1">{approvedInvitedCount}</p>
              </div>
            </div>

            <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-6 shadow-xl flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-400 shrink-0">
                {activeMode === 'commission_30' ? <Wallet size={22} /> : <Gift size={22} />}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest">
                  {activeMode === 'commission_30' ? 'Saldo de Comissões' : 'Meses Grátis Salvos'}
                </p>
                <p className="text-2xl font-black text-on-surface mt-1">
                  {activeMode === 'commission_30' 
                    ? `${(profile?.affiliateBalance || 0).toLocaleString()} Kz`
                    : `${totalFreeMonthsEarned} Meses`
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Current Strategy Progress card */}
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-6 md:p-8 shadow-xl">
            <h4 className="text-base font-black uppercase tracking-widest text-on-surface-variant mb-4">
              Método de Recompensa Ativo na Plataforma
            </h4>

            {activeMode === 'free_month' ? (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-5 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <Gift className="text-amber-500 shrink-0" size={32} />
                    <div>
                      <p className="font-bold text-on-surface">Meta de Convidado: 2 Usuários = 1 Mês Grátis</p>
                      <p className="text-xs text-on-surface-variant">Basta que 2 utilizadores ativem planos de assinatura usando o seu link.</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-on-surface-variant uppercase tracking-widest">Seu Progresso</p>
                    <p className="text-3xl font-black text-amber-400 font-mono">{freeMonthProgress}/2</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-on-surface-variant font-bold">
                    <span>Próximo Mês Grátis</span>
                    <span>{freeMonthProgress === 1 ? '50%' : freeMonthProgress === 0 && approvedInvitedCount > 0 ? '100% Concluído!' : '0%'}</span>
                  </div>
                  <div className="w-full bg-surface-container-high rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-amber-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${(freeMonthProgress / 2) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-[11px] text-on-surface-variant/70 italic mt-1 pb-2">
                    Já ganhou {totalFreeMonthsEarned} mês(es) inteiramente grátis de assinatura ativa! Estes serão liberados pelo suporte/administrador após validação.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-center gap-4">
                  <DollarSign className="text-emerald-500 shrink-0" size={32} />
                  <div>
                    <h5 className="font-bold text-on-surface">30% de Comissão por Cada Venda</h5>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      Por cada pessoa nova que utilizar o seu link e tiver o primeiro pagamento ativado na plataforma, você receberá instantaneamente 30% do valor do plano faturado!
                    </p>
                  </div>
                </div>
                <p className="text-xs text-on-surface-variant/80 italic leading-relaxed">
                  As comissões aprovadas são acumuladas no seu Saldo Disponível acima. Pode clicar no botão na coluna à direita para solicitar o levantamento para a sua conta nacional angolana a partir do limite estipulado.
                </p>
              </div>
            )}
          </div>

          {/* Referral table list */}
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-5 border-b border-outline-variant/15 flex justify-between items-center bg-surface-container/20">
              <h4 className="text-sm font-black uppercase tracking-widest text-on-surface-variant">Minhas Recomendações</h4>
              <span className="text-xs font-mono font-bold bg-surface-container px-2 py-0.5 rounded text-on-surface-variant">{referrals.length} Registados</span>
            </div>

            {referrals.length === 0 ? (
              <div className="text-center py-10 px-4 text-xs text-on-surface-variant/75 italic">
                Nenhum utilizador registou-se ainda através do seu link exclusivo.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container/40 text-on-surface-variant text-[10px] uppercase tracking-widest border-b border-outline-variant/15">
                  <tr>
                    <th className="p-4 font-black">Utilizador</th>
                    <th className="p-4 font-black">Plano Ativado</th>
                    <th className="p-4 font-black">Recompensa</th>
                    <th className="p-4 font-black">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10 text-xs">
                  {referrals.map((ref) => (
                    <tr key={ref.id} className="hover:bg-surface-container/20 transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-on-surface">{ref.referredName}</p>
                        <p className="text-[10px] text-on-surface-variant font-mono opacity-60 mt-0.5">{ref.referredEmail}</p>
                      </td>
                      <td className="p-4 font-semibold uppercase font-mono">
                        {ref.referredPlan?.replace('_', ' ') || 'Iniciante'}
                      </td>
                      <td className="p-4 font-bold text-primary font-mono">
                        {ref.rewardType === 'commission_30' ? `${Number(ref.rewardValue).toLocaleString()} Kz` : 'Progresso Grátis'}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase ${
                          ref.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                          ref.status === 'rejected' ? 'bg-error/10 text-error border border-error/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {ref.status === 'approved' ? 'Confirmado' : ref.status === 'rejected' ? 'Rejeitado' : 'Por Validar'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right column: Withdrawal area */}
        <div className="space-y-8">
          
          {/* Withdrawal request box */}
          {activeMode === 'commission_30' && (
            <div className="bg-surface-container-low border border-outline-variant/20 rounded-[32px] p-6 shadow-xl space-y-6">
              <div className="flex items-center gap-3">
                <Wallet className="text-primary" size={20} />
                <h4 className="text-lg font-bold text-on-surface">Levantamento de Comissão</h4>
              </div>

              {payoutSuccess ? (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center space-y-2">
                  <span className="material-symbols-outlined text-emerald-500 text-3xl">check_circle</span>
                  <p className="text-xs font-bold text-on-surface">Pedido Enviado com Sucesso!</p>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed">
                    A sua solicitação foi encaminhada para os Maestros. O pagamento será feito por transferência bancária.
                  </p>
                  <button 
                    onClick={() => setPayoutSuccess(false)}
                    className="mt-2 text-xs font-bold text-primary hover:underline"
                  >
                    Solicitar outro levantamento
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRequestPayout} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Nome Completo do Titular</label>
                    <input 
                      type="text" 
                      value={payoutForm.fullName}
                      onChange={(e) => setPayoutForm({ ...payoutForm, fullName: e.target.value })}
                      placeholder="Ex: Manuel Antunes"
                      className="w-full bg-surface-container border border-outline-variant/20 rounded-2xl px-4 py-3 text-sm text-on-surface outline-none focus:border-primary font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1">IBAN de Destino (AO06...)</label>
                    <input 
                      type="text" 
                      value={payoutForm.iban}
                      onChange={(e) => setPayoutForm({ ...payoutForm, iban: e.target.value })}
                      placeholder="AO06 0000 0000 0000 0000 0"
                      className="w-full bg-surface-container border border-outline-variant/20 rounded-2xl px-4 py-3 text-sm text-on-surface outline-none focus:border-primary font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Valor de Saque (Kz)</label>
                    <input 
                      type="number" 
                      value={payoutForm.amount}
                      onChange={(e) => setPayoutForm({ ...payoutForm, amount: e.target.value })}
                      placeholder="Valor mínimo 5.000 Kz"
                      className="w-full bg-surface-container border border-outline-variant/20 rounded-2xl px-4 py-3 text-sm text-on-surface outline-none focus:border-primary font-mono font-bold"
                    />
                  </div>

                  {payoutError && (
                    <div className="flex gap-2 p-3 bg-error/10 border border-error/20 rounded-xl text-error text-[11px] font-semibold items-start leading-tight">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      <span>{payoutError}</span>
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={requestingPayout || !profile?.affiliateBalance || profile.affiliateBalance < 5000}
                    className="w-full bg-primary text-on-primary font-black text-xs uppercase tracking-widest py-4 rounded-2xl transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50"
                  >
                    {requestingPayout ? 'A processar...' : 'Solicitar Levantamento'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Historical payouts list */}
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-6 shadow-xl space-y-4">
            <h4 className="text-xs font-black uppercase text-on-surface-variant tracking-widest pl-1">Histórico de Saques</h4>
            
            {payouts.length === 0 ? (
              <p className="text-center py-6 text-on-surface-variant/70 italic text-[11px]">Nenhuma solicitação de levantamento efetuada até ao momento.</p>
            ) : (
              <div className="space-y-3">
                {payouts.map((p) => (
                  <div key={p.id} className="p-3 bg-surface-container rounded-xl flex items-center justify-between gap-3 text-xs">
                    <div>
                      <p className="font-bold text-on-surface">{Number(p.amount).toLocaleString()} Kz</p>
                      <p className="text-[9px] text-on-surface-variant/70 font-mono mt-0.5">{new Date(p.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                        p.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : 
                        p.status === 'rejected' ? 'bg-error/10 text-error' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {p.status === 'approved' ? 'Pago' : p.status === 'rejected' ? 'Cancelado' : 'Pendente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Guidelines Box */}
          <div className="bg-gradient-to-r from-primary-container/10 to-primary-container/5 border border-primary-container/30 rounded-3xl p-6 space-y-4">
            <h4 className="font-bold text-xs uppercase tracking-widest text-[#a8b2c4] flex items-center gap-2">
              <HelpCircle size={14} className="text-primary" /> Regras Básicas de Afiliado
            </h4>
            <ul className="text-[11px] text-on-surface-variant/95 space-y-2 leading-relaxed font-medium">
              <li>• O link de afiliado é vitalício; pode partilhá-lo em redes sociais, sites ou grupos.</li>
              <li>• Auto-utilização do próprio link de comissão para a sua conta resultará na anulação da comissão.</li>
              <li>• Os levantamentos são creditados em até 48 horas úteis após aprovação dos Maestros.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
