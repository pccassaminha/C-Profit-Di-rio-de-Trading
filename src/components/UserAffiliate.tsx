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
  refCode?: string;
}

export default function UserAffiliate() {
  const currentUser = auth.currentUser;
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [msgCopied, setMsgCopied] = useState(false);
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

  const myRefCode = profile?.refCode || currentUser?.uid.substring(0, 6).toUpperCase() || '';
  const referralLink = `${window.location.origin}?ref=${myRefCode}`;

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

  const handleCopyCode = () => {
    navigator.clipboard.writeText(myRefCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const promoMessage = `📈 Conheça o C Profit — o terminal definitivo para traders profissionais! \n\nFaça o diário de todos os seus trades automáticos e manuais de Forex e Opções Binárias, controle limites, drawdown, winrate e analise métricas em tempo real!\n\n🎁 Clique no link para fazer o seu cadastro e ganhe 15 DIAS GRÁTIS de teste completo:\n\nLink: ${referralLink}\nOu use o código de indicação: ${myRefCode} na hora de se registrar!`;

  const handleCopyMsg = () => {
    navigator.clipboard.writeText(promoMessage);
    setMsgCopied(true);
    setTimeout(() => setMsgCopied(false), 2000);
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
  
  // Progress when free month is selected (every 5 invites gets 1 month gratis)
  const freeMonthProgress = totalInvitedCount % 5;
  const totalFreeMonthsEarned = Math.floor(totalInvitedCount / 5);

  // Dynamic Tier Calculation for user
  const getTier = (count: number) => {
    if (count >= 50) {
      return {
        level: 6,
        name: 'Nível 6 (Maestro Elite)',
        commission: 30,
        payoutType: 'Dinheiro Real (Payout IBAN Directo)',
        color: 'text-[#00f5a0]',
        bgColor: 'border-[#00f5a0]/40 bg-[#00f5a0]/5',
        badge: '👑 N6',
        gradient: 'from-[#00f5a0]/20 to-[#00f5a0]/5',
        nextTarget: null,
        description: 'Parabéns! Payout bancário real de 30% em dinheiro líquido para a primeira assinatura paga por qualquer usuário indicado por si!'
      };
    } else if (count >= 40) {
      return {
        level: 5,
        name: 'Nível 5 (Platina)',
        commission: 0,
        payoutType: 'Mês Grátis (Bónus 4 Meses)',
        color: 'text-purple-400',
        bgColor: 'border-purple-500/20 bg-purple-500/5',
        badge: '✦ N5',
        gradient: 'from-purple-500/10 to-transparent',
        nextTarget: { targetCount: 50, name: 'Nível 6 (Maestro Elite)', needed: 50 - count },
        description: 'Excelente! Alcançou o Nível 5 e garantiu 4 Meses Gratuitos de assinatura ativa na plataforma!'
      };
    } else if (count >= 30) {
      return {
        level: 4,
        name: 'Nível 4 (Diamante)',
        commission: 0,
        payoutType: 'Mês Grátis (Bónus 3 Meses)',
        color: 'text-cyan-400',
        bgColor: 'border-cyan-500/20 bg-cyan-500/5',
        badge: '♦ N4',
        gradient: 'from-cyan-500/10 to-transparent',
        nextTarget: { targetCount: 40, name: 'Nível 5 (Platina)', needed: 40 - count },
        description: 'Excelente! Alcançou o Nível 4 e garantiu 3 Meses Gratuitos de assinatura ativa na plataforma!'
      };
    } else if (count >= 20) {
      return {
        level: 3,
        name: 'Nível 3 (Ouro)',
        commission: 0,
        payoutType: 'Mês Grátis (Bónus 2 Meses)',
        color: 'text-yellow-400',
        bgColor: 'border-yellow-500/20 bg-yellow-500/5',
        badge: '★ N3',
        gradient: 'from-yellow-500/10 to-transparent',
        nextTarget: { targetCount: 30, name: 'Nível 4 (Diamante)', needed: 30 - count },
        description: 'Óptimo trabalho! Garantiu de bónus 2 Meses Completamente Gratuitos de assinatura!'
      };
    } else if (count >= 10) {
      return {
        level: 2,
        name: 'Nível 2 (Prata)',
        commission: 0,
        payoutType: 'Mês Grátis (Bónus 1 Mês)',
        color: 'text-slate-300',
        bgColor: 'border-slate-500/20 bg-slate-500/5',
        badge: '✦ N2',
        gradient: 'from-slate-500/10 to-transparent',
        nextTarget: { targetCount: 20, name: 'Nível 3 (Ouro)', needed: 20 - count },
        description: 'Parabéns! Alcançou o Nível 2 e garantiu 1 Mês Inteiro Gratuito de assinatura na plataforma!'
      };
    } else {
      return {
        level: 1,
        name: 'Nível 1 (Bronze)',
        commission: 0,
        payoutType: 'Mês Grátis Progressivo',
        color: 'text-orange-400',
        bgColor: 'border-orange-500/20 bg-orange-500/5',
        badge: '● N1',
        gradient: 'from-orange-500/10 to-transparent',
        nextTarget: { targetCount: 10, name: 'Nível 2 (Prata)', needed: 10 - count },
        description: 'A cada 10 convites, ganha 1 mês grátis! Alcance 50 convites para ganhar 30% da receita da primeira mensalidade dos convidados.'
      };
    }
  };

  const currentTier = getTier(approvedInvitedCount);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-container-low border border-outline-variant/10 p-6 rounded-[24px] shadow-sm">
        <div>
          <h2 className="text-3xl font-black text-on-surface font-headline italic uppercase tracking-tighter">
            Área de <span className="text-primary italic">Afiliados</span>
          </h2>
          <p className="text-sm text-on-surface-variant max-w-2xl mt-1 font-medium leading-relaxed">
            Convide amigos e outros traders para a plataforma Profit e ganhe prêmios exclusivos ou 30% de comissões em dinheiro diretamente na sua conta bancária.
          </p>
        </div>
        <div className={`px-5 py-3 rounded-2xl border ${currentTier.bgColor} flex items-center gap-3 shadow-md`}>
          <span className="text-2xl font-black">{currentTier.badge}</span>
          <div>
            <p className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest">Nível de Afiliados Actual</p>
            <p className={`text-sm font-bold ${currentTier.color}`}>{currentTier.name}</p>
          </div>
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
                  Parceria & Convites
                </span>
                <h3 className="text-xl font-bold mt-3 text-on-surface">Comece a Convidar Traders</h3>
              </div>
              <Award className="text-primary h-8 w-8 shrink-0" />
            </div>

            <p className="text-xs text-on-surface-variant/80 leading-relaxed font-medium">
              Abaixo estão suas credenciais exclusivas de convite. Os novos traders podem usar tanto o seu link direto quanto digitar o seu Código de Indicação manualmente durante o cadastro para receber o teste grátis de 15 dias. <strong className="text-primary">Lembre-se: os seus convites são 100% infinitos e ilimitados, mesmo para utilizadores em teste grátis (Trial)!</strong>
            </p>

            <div className="space-y-4">
              {/* Link Input Row */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-on-surface-variant tracking-wider block ml-1">O Seu Link Direto de Convite</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input 
                    type="text" 
                    readOnly 
                    value={referralLink}
                    className="flex-1 bg-surface-container-high border border-outline-variant/30 rounded-2xl px-5 py-4 text-sm font-bold text-on-surface select-all text-ellipsis overflow-hidden font-mono outline-none"
                  />
                  <button 
                    onClick={handleCopyLink}
                    className={`flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shrink-0 ${copied ? 'bg-emerald-500 text-white animate-pulse' : 'bg-primary text-on-primary hover:scale-[1.02] active:scale-95'}`}
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
              </div>

              {/* Code Input Row */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-on-surface-variant tracking-wider block ml-1">O Seu Código de Indicação</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input 
                    type="text" 
                    readOnly 
                    value={myRefCode}
                    className="flex-1 bg-surface-container-high border border-outline-variant/30 rounded-2xl px-5 py-4 text-sm font-black text-[#00f5a0] tracking-wider select-all font-mono outline-none"
                  />
                  <button 
                    onClick={handleCopyCode}
                    className={`flex items-center justify-center gap-2 px-3 sm:px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shrink-0 ${codeCopied ? 'bg-emerald-500 text-white' : 'bg-surface-container-high border border-outline hover:border-primary text-on-surface hover:scale-[1.02]'}`}
                  >
                    {codeCopied ? (
                      <>
                        <Check size={16} /> Copiado!
                      </>
                    ) : (
                      <>
                        <Copy size={16} /> Copiar Código
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Promo Pitch Copy */}
              <div className="space-y-2 pt-2 border-t border-outline-variant/10">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-[#00f5a0] tracking-widest">
                    Anúncio Pronto de 15 Dias de Teste (WhatsApp / Telegram)
                  </span>
                  <button 
                    onClick={handleCopyMsg}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${msgCopied ? 'bg-emerald-500 text-white' : 'bg-primary/20 text-primary hover:bg-primary/30'}`}
                  >
                    {msgCopied ? (
                      <>
                        <Check size={12} /> Copiado
                      </>
                    ) : (
                      <>
                        <Copy size={12} /> Copiar Mensagem
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-surface-container-high/40 rounded-2xl p-4 border border-outline-variant/10 text-xs font-medium text-on-surface-variant leading-relaxed select-all whitespace-pre-wrap max-h-[180px] overflow-y-auto font-sans">
                  {promoMessage}
                </div>
              </div>
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

          {/* Plano de Carreira & Níveis do Afiliado */}
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h4 className="text-base font-black uppercase tracking-widest text-[#00f5a0]">
                  Seu Plano de Carreira de Afiliado
                </h4>
                <p className="text-xs text-on-surface-variant font-medium mt-1">
                  Recomende mais traders para subir de nível e aumentar sua comissão e recompensas!
                </p>
              </div>
              <div className="bg-surface-container border border-outline-variant/20 px-4 py-2 rounded-xl text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Taxa de Comissão Actual</p>
                <p className="text-xl font-mono font-black text-[#00f5a0]">{currentTier.commission}%</p>
              </div>
            </div>

            {/* Visual Level indicator cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-2">
              {[
                { lvl: 1, name: 'Bronze', count: '1-9', reward: 'Mês Progresso', bg: 'from-orange-600/20 to-transparent text-orange-400', minCount: 1 },
                { lvl: 2, name: 'Prata', count: '10-24', reward: '1 Mês Grátis', bg: 'from-slate-400/20 to-transparent text-slate-300', minCount: 10 },
                { lvl: 3, name: 'Ouro', count: '25-39', reward: '2 Meses Grátis', bg: 'from-yellow-500/20 to-transparent text-yellow-400', minCount: 25 },
                { lvl: 4, name: 'Diamante', count: '40-49', reward: '3 Meses Grátis', bg: 'from-cyan-500/20 to-transparent text-cyan-400', minCount: 40 },
                { lvl: 5, name: 'Maestro Elite', count: '50+', reward: '30% Dinheiro', bg: 'from-[#00f5a0]/20 to-transparent text-[#00f5a0]', minCount: 50, isMoney: true }
              ].map((tierItem) => {
                const isCurrent = currentTier.level === tierItem.lvl;
                const isPassed = approvedInvitedCount >= tierItem.minCount;
                
                return (
                  <div 
                    key={tierItem.lvl} 
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isCurrent 
                        ? `border-[#00f5a0] bg-[#00f5a0]/5 shadow-lg shadow-[#00f5a0]/5 scale-105 relative z-10` 
                        : isPassed 
                        ? 'border-outline/40 bg-surface-container/30 opacity-75' 
                        : 'border-outline-variant/15 bg-surface-container/10 opacity-40'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black font-mono tracking-widest opacity-80">N{tierItem.lvl}</span>
                      {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-[#00f5a0] animate-pulse"></span>}
                    </div>
                    <p className="text-xs font-bold text-white leading-tight truncate">{tierItem.name}</p>
                    <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">{tierItem.count} convites</p>
                    <div className="mt-3 pt-2 border-t border-outline-variant/15 flex justify-between items-center text-[11px] font-bold">
                      <span className="text-on-surface-variant font-normal">Recompensa:</span>
                      <span className={isCurrent ? 'text-[#00f5a0] font-black' : 'text-white'}>{tierItem.reward}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Target description banner */}
            <div className="p-4 bg-[#00f5a0]/5 border border-[#00f5a0]/15 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="space-y-1">
                <p className="text-xs font-bold text-white flex items-center gap-2">
                  <span className="text-lg">🏆</span> {currentTier.description}
                </p>
                {currentTier.nextTarget && (
                  <p className="text-[11px] text-[#00f5a0] font-mono font-medium">
                    Faltam apenas {currentTier.nextTarget.needed} indicações válidas para atingir o {currentTier.nextTarget.name}!
                  </p>
                )}
              </div>
              {currentTier.nextTarget && (
                <div className="text-xs text-on-surface-variant font-mono font-bold bg-surface-container px-3 py-1.5 rounded-xl border border-outline-variant/10 whitespace-nowrap">
                  Progresso: {approvedInvitedCount} / {currentTier.nextTarget.targetCount}
                </div>
              )}
            </div>

            {/* Special payout rules banner */}
            <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-center gap-4">
              <DollarSign className="text-emerald-500 shrink-0" size={28} />
              <div>
                <h5 className="font-bold text-xs text-white uppercase tracking-wider">Regra de Levantamento em Dinheiro Real</h5>
                <p className="text-[11px] text-on-surface-variant leading-relaxed mt-0.5">
                  Os afiliados do <strong className="text-[#00f5a0]">Nível 6 (50+ convites ativos)</strong> possuem payout direto. Suas recompensas de <strong className="text-white">30% sobre a primeira assinatura paga por cada usuário indicado</strong> serão pagas 100% em dinheiro líquido no seu IBAN cadastrado!
                </p>
              </div>
            </div>
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
