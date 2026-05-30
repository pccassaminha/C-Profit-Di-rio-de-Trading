import React, { useState, useEffect } from 'react';
import { useTrades } from '../hooks/useTrades';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy, getDocs, getDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import { CreditCard, Check, ShieldCheck, Zap, Star, LayoutGrid, Smartphone, MessageSquare, History, Upload, Landmark, X, FileText } from 'lucide-react';
import Modal from './Modal';

export default function Plans({ forcedExpired, hideHeader, onAuthRequired }: { forcedExpired?: boolean, hideHeader?: boolean, onAuthRequired?: () => void }) {
  const { userPlan, globalSettings } = useTrades();
  const [payments, setPayments] = useState<any[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState<any>(null);
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payerName, setPayerName] = useState(auth.currentUser?.displayName || '');
  const [payerPhone, setPayerPhone] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'iban' | 'multicaixa' | 'express' | 'kwik'>('iban');
  const [expressCode, setExpressCode] = useState('');
  const [activeCouponsList, setActiveCouponsList] = useState<any[]>([]);
  const [typedCoupon, setTypedCoupon] = useState('');
  const [validationMsg, setValidationMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [hadTrial30, setHadTrial30] = useState(false);

  const hasUsedTrial = !!(
    userPlan?.hadTrial30 || 
    userPlan?.plan_type === 'trial_30' || 
    userPlan?.plan_type === 'trial_15' || 
    payments.some(p => p.planId === 'trial_30' && (p.status === 'approved' || p.status === 'pending'))
  );

  // Load active master coupons
  useEffect(() => {
    const qActiveCoupons = query(collection(db, 'coupons'), where('active', '==', true));
    const unsubCoupons = onSnapshot(qActiveCoupons, (snapshot) => {
      setActiveCouponsList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubCoupons();
  }, []);

  const handleApplyCouponCode = async (codeStr: string) => {
    setValidationMsg(null);
    const cleanCode = codeStr.trim().toUpperCase();
    if (!cleanCode) return;

    try {
      // Prioritize database query for both standard or DESCONTODE50% coupons
      const q = query(collection(db, 'coupons'), where('code', '==', cleanCode));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const couponDoc = snap.docs[0].data();
        if (!couponDoc.active) {
          setValidationMsg({ text: 'Cupom inválido ou inativo.', type: 'error' });
          return;
        }
        
        const cp = { id: snap.docs[0].id, ...couponDoc };
        setAppliedCoupon(cp);
        setValidationMsg({ text: `Cupom "${cleanCode}" de ${couponDoc.discountValue}${couponDoc.discountType === 'percentage' ? '%' : ' Kz'} aplicado com sucesso!`, type: 'success' });
        return;
      }
      
      // Fallback for CPROFIT50%OFF if not yet in database (e.g., initial seed)
      if (cleanCode === 'CPROFIT50%OFF') {
        setAppliedCoupon({
          id: 'descontode50_static',
          code: 'CPROFIT50%OFF',
          active: true,
          discountType: 'percentage',
          discountValue: 50,
          targetPlan: 'all'
        });
        setValidationMsg({ text: 'Cupom "CPROFIT50%OFF" de 50% de DESCONTO aplicado com sucesso!', type: 'success' });
        return;
      }

      setValidationMsg({ text: 'Cupom inválido ou inativo.', type: 'error' });
    } catch (err) {
      console.error(err);
      setValidationMsg({ text: 'Erro ao validar cupom.', type: 'error' });
    }
  };

  // Set default payment method when settings load
  useEffect(() => {
    if (globalSettings) {
      if (globalSettings.showIban !== false) {
        setPaymentMethod('iban');
      } else if (globalSettings.showExpress !== false) {
         setPaymentMethod('express');
      } else if (globalSettings.showMulticaixa !== false) {
         setPaymentMethod('multicaixa');
      } else {
         setPaymentMethod('kwik');
      }
    }
  }, [globalSettings]);

  // Função para gerar um ID numérico curto baseado no timestamp
  const generateNumericId = () => {
    return Math.floor(Math.random() * 9000000) + 1000000;
  };

  useEffect(() => {
    if (!auth.currentUser) return;

    // Load User Profile / Billing Info
    const loadProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'usuarios', auth.currentUser!.uid));
        if (userDoc.exists()) {
           const userData = userDoc.data();
           if (userData.usedCoupon) {
              const qCoupons = query(collection(db, 'coupons'), where('code', '==', userData.usedCoupon), where('active', '==', true));
              const couponSnap = await getDocs(qCoupons);
              if (!couponSnap.empty) {
                 setAppliedCoupon({ id: couponSnap.docs[0].id, ...couponSnap.docs[0].data() });
              }
           }
        }

        const profileSnapshot = await getDocs(query(collection(db, 'user_profiles'), where('userId', '==', auth.currentUser?.uid)));
        if (!profileSnapshot.empty) {
          const data = profileSnapshot.docs[0].data();
          if (data.billingName) setPayerName(data.billingName);
          if (data.billingPhone) setPayerPhone(data.billingPhone);
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      }
    };
    loadProfile();

    const q = query(
      collection(db, 'payments'), 
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const plans = [
    {
      id: 'trial_30',
      name: 'Plano Teste 30 Dias',
      oldPrice: '5.000',
      discount: '90% OFF',
      savingsText: 'Apenas Kz 500 por 30 dias',
      price: '500',
      period: 'por 30 dias',
      days: 30,
      limits: '2 Contas Forex + 2 Contas OB',
      totalLimit: 4,
      features: ['Acesso ao Panorama Económico', 'Importação MT5, HTML e CSV', 'Diário de Trades Ilimitado', 'Relatórios de Performance', 'Acesso à Comunidade', 'Válido para novos registros'],
      current: userPlan?.plan_type === 'trial_30' || userPlan?.plan_type === 'trial_15'
    },
    {
      id: 'mensal_6',
      name: 'Plano Mensal',
      oldPrice: '7.500',
      discount: '-33% OFF',
      savingsText: 'Poupa Kz 2.500 / mês',
      price: '5.000',
      period: 'por mês',
      days: 30,
      limits: '6 Contas Forex + 6 Contas OB',
      totalLimit: 12,
      features: ['Acesso ao Panorama Económico', 'Importação MT5, HTML e CSV', 'Diário de Trades Ilimitado', 'Relatórios de Performance', 'Acesso à Comunidade'],
      current: userPlan?.plan_type === 'mensal_6' || userPlan?.plan_type === 'mensal_2'
    },
    {
      id: 'trimestral_6',
      name: 'Plano Trimestral',
      oldPrice: '22.500',
      discount: '-33% OFF',
      savingsText: 'Poupa Kz 7.500 no trimestre',
      price: '15.000',
      period: 'a cada 3 meses',
      days: 90,
      limits: '6 Contas Forex + 6 Contas OB',
      totalLimit: 12,
      features: ['Acesso ao Panorama Económico', 'Análise Psicológica Essencial', 'Suporte Prioritário via WhatsApp', 'Acesso à Comunidade VIP'],
      current: userPlan?.plan_type === 'trimestral_6'
    },
    {
      id: 'semestral_8',
      name: 'Plano Semestral',
      oldPrice: '45.000',
      discount: '-44% OFF',
      savingsText: 'Poupa Kz 20.000 no semestre',
      price: '25.000',
      period: 'a cada 6 meses',
      days: 180,
      savings: '17% OFF',
      limits: '8 Contas Forex + 8 Contas OB',
      totalLimit: 16,
      features: ['Acesso ao Panorama Económico', 'Análise Psicológica Avançada', 'Exportação de Dados (PDF)', 'Acesso à Comunidade'],
      featured: true,
      current: userPlan?.plan_type === 'semestral_8' || userPlan?.plan_type === 'semestral_6'
    },
    {
      id: 'anual_16',
      name: 'Plano Anual',
      oldPrice: '90.000',
      discount: '-50% OFF',
      savingsText: 'Poupa Kz 45.000 no ano',
      price: '45.000',
      period: 'por ano',
      days: 365,
      savings: '25% OFF',
      limits: '16 Contas Forex + 16 Contas OB',
      totalLimit: 32,
      features: ['Acesso ao Panorama Económico', 'Mentorias Coletivas', 'Acesso Antecipado a Beta', 'Personalização de Interface', 'Suporte Prioritário via WhatsApp', 'Acesso à Comunidade VIP'],
      current: userPlan?.plan_type === 'anual_16'
    }
  ];

  // Aplicar Desconto do Cupão
  const getDiscountedPrice = (plan: any) => {
     const priceNum = Number(plan.price.replace(/\./g, ''));
     if (priceNum < 5000) {
        return plan.price; // O cupão afetará apenas os planos a partir de 5.000 Kz para cima
     }
     let discountPercentage = 0;
     let discountFixed = 0;

     if (appliedCoupon) {
        if (appliedCoupon.targetPlan === 'all' || appliedCoupon.targetPlan === plan.id) {
           if (appliedCoupon.discountType === 'percentage') {
              discountPercentage = appliedCoupon.discountValue;
           } else if (appliedCoupon.discountType === 'fixed') {
              discountFixed = appliedCoupon.discountValue;
           }
        }
     } else if (userPlan?.plan_type === 'trial_15' || userPlan?.plan_type === 'trial_30') {
        // Auto 50% OFF trial conversion discount
        discountPercentage = 50;
     }

     const originalPriceNum = Number(plan.price.replace(/\./g, ''));
     let finalPriceNum = originalPriceNum;

     if (discountPercentage > 0) {
        finalPriceNum = originalPriceNum - (originalPriceNum * (discountPercentage / 100));
     } else if (discountFixed > 0) {
        finalPriceNum = originalPriceNum - discountFixed;
     }

     if (finalPriceNum < 0) finalPriceNum = 0;
     
     // Formatar novamente com pontos
     return finalPriceNum.toLocaleString('pt-PT').replace(/,/g, '.');
  };

  const getFinalDiscountLabel = (plan: any, finalPriceStr: string) => {
      const finalPriceNum = Number(finalPriceStr.replace(/\./g, ''));
      if (plan.oldPrice) {
          const oldPriceNum = Number(plan.oldPrice.replace(/\./g, ''));
          if (oldPriceNum > finalPriceNum) {
              const perc = Math.round(((oldPriceNum - finalPriceNum) / oldPriceNum) * 100);
              let suffix = appliedCoupon ? ' SUPERCUPOM' : ' OFF';
              return `-${perc}%${suffix}`;
          }
      }
      return plan.discount;
  };

  const finalPlans = plans.map(p => {
     const finalPrice = getDiscountedPrice(p);
     return {
         ...p, 
         originalPriceStr: p.price,
         price: finalPrice,
         discount: getFinalDiscountLabel(p, finalPrice)
     };
  });

  const handleSupport = () => {
    const phone = globalSettings?.whatsappNumber || '244921319200';
    window.open(`https://wa.me/${phone}`, '_blank');
  };

  const handleRequestPayment = async () => {
    if (!showPaymentModal || !payerName) {
      alert('Por favor, preencha o seu nome completo.');
      return;
    }
    
    if (showPaymentModal.id === 'trial_30' && hasUsedTrial) {
      alert('O plano de teste de 500 Kz só pode ser usufruído uma única vez por usuário. Por favor, escolha outra opção de plano a partir de 5.000 Kz.');
      return;
    }
    if (paymentMethod === 'express' && !expressCode.trim()) {
      alert('Por favor, insira o Código da Transação do Express.');
      return;
    }

    // Smart duplicate prevention: check if there's already a pending payment request
    const pendingPayment = payments.find(p => p.status === 'pending');
    if (pendingPayment) {
      alert(`Você já tem uma solicitação de upgrade pendente de análise pelos Maestros (Código: ${pendingPayment.expressCode || pendingPayment.transactionCode}). Não é necessário duplicar o envio!`);
      return;
    }

    setIsSubmitting(true);
    try {
      const numericId = generateNumericId();
      await addDoc(collection(db, 'payments'), {
        userId: auth.currentUser?.uid,
        userName: payerName,
        userEmail: auth.currentUser?.email || '',
        userPhone: payerPhone,
        planId: showPaymentModal.id,
        amount: Number(showPaymentModal.price.replace(/\./g, '')),
        status: 'pending',
        transactionCode: numericId,
        proofUrl: 'WhatsApp Support',
        usedCoupon: appliedCoupon ? appliedCoupon.code : null,
        paymentMethod: paymentMethod,
        expressCode: paymentMethod === 'express' ? expressCode.trim() : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setPaymentSubmitted(true);
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar solicitação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setShowPaymentModal(null);
    setPaymentSubmitted(false);
  };

  const handleActivateFreeTrial = async () => {
    if (!auth.currentUser) return;
    setIsSubmitting(true);
    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
      
      const userRef = doc(db, 'usuarios', auth.currentUser.uid);
      await setDoc(userRef, {
        plan_type: 'trial_30',
        expiry_date: expiryDate.toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      alert('Plano Trial Grátis (30 Dias) ativado com sucesso! Aproveite.');
    } catch (err) {
      console.error(err);
      alert('Erro ao ativar Plano Grátis.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`p-8 max-w-[1440px] mx-auto min-h-screen animate-in fade-in duration-500 space-y-12 ${hideHeader ? 'min-h-fit py-0' : ''}`}>
      {forcedExpired && (
        <div className="bg-error/10 border border-error/50 p-6 rounded-3xl flex items-center gap-6 animate-in slide-in-from-top duration-500">
          <div className="w-14 h-14 bg-error/20 rounded-2xl flex items-center justify-center text-error shadow-lg shadow-error/10">
            <span className="material-symbols-outlined text-3xl">lock</span>
          </div>
          <div>
            <h2 className="text-error font-black text-xl uppercase tracking-tighter">
              {userPlan?.plan_type === 'trial_15'
                ? 'Período de Teste Grátis de 30 Dias Expirado'
                : userPlan?.plan_type === 'Iniciante' 
                  ? 'Acesso Restrito: Plano Inativo' 
                  : 'Acesso Bloqueado: Assinatura Expirada'
              }
            </h2>
            <p className="text-on-surface-variant text-sm font-medium opacity-80">
              {userPlan?.plan_type === 'trial_15'
                ? 'O seu período de experimentação de 30 dias grátis chegou ao fim. Faça a subscrição para reativar todo o terminal profissional.'

                : userPlan?.plan_type === 'Iniciante' 
                  ? 'Sua conta ainda não possui uma assinatura ativa. Escolha um plano abaixo para começar.' 
                  : 'Seu período de assinatura terminou. Renove agora para continuar gerenciando seus trades.'
              }
            </p>
          </div>
        </div>
      )}

      {userPlan?.plan_type === 'trial_15' && (
        <div className="bg-gradient-to-r from-[#00f5a0]/10 to-primary/10 border-2 border-[#00f5a0]/30 p-6 rounded-[24px] flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl animate-in slide-in-from-bottom duration-500">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#00f5a0]/20 rounded-2xl flex items-center justify-center text-[#00f5a0] shadow-[0_0_20px_rgba(0,245,160,0.15)] shrink-0 animate-pulse">
              <span className="material-symbols-outlined text-3xl">celebration</span>
            </div>
            <div>
              <h3 className="text-[#00f5a0] font-black text-lg uppercase tracking-wider">
                🎁 Desconto de Conversão Especial – 50% OFF Ativado!
              </h3>
              <p className="text-on-surface-variant text-xs font-semibold leading-relaxed">
                Como agradecimento especial por testar a plataforma Profit, você recebeu um <strong className="text-white">Desconto Exclusivo de 50%</strong> em qualquer assinatura ativa! O desconto já foi aplicado e está visível nos planos abaixo de forma automática.
              </p>
            </div>
          </div>
          <span className="bg-[#00f5a0] text-black text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-wider whitespace-nowrap">
            Poupança Garantida
          </span>
        </div>
      )}

      {!hideHeader && (
        <div className="flex flex-col items-center">
          <h1 className="text-4xl font-black text-on-surface mb-4 font-headline text-center uppercase tracking-tighter">
            Níveis de <span className="text-primary italic">Assinatura</span>
          </h1>
          <p className="text-on-surface-variant text-center max-w-2xl">Aumente sua capacidade analítica e tenha um terminal profissional de alta performance.</p>
        </div>
      )}

      {/* Coupon Banner & Input */}
      <div className="bg-surface-container border border-primary/20 rounded-[24px] p-6 shadow-xl max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden backdrop-blur-sm">
        <div className="absolute top-0 left-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl animate-bounce">local_activity</span>
            <h3 className="text-lg font-black text-on-surface uppercase tracking-tight">Tem um Cupom de Desconto?</h3>
          </div>
          
          <div className="space-y-1">
            <p className="text-xs text-on-surface-variant font-medium">
              {(userPlan?.plan_type === 'trial_15' || userPlan?.plan_type === 'trial_30')
                ? 'Como está no período de Trial, se tiver, use um cupão para converter o seu teste numa assinatura com desconto:'
                : 'Insira o seu código promocional ou de afiliado à direita para obter descontos exclusivos:'
              }
            </p>
          </div>
        </div>

        {/* Input Form */}
        <div className="w-full md:w-auto shrink-0 flex flex-col items-stretch md:items-end gap-1.5">
          <div className="flex gap-2">
            <input
              type="text"
              value={typedCoupon}
              onChange={(e) => setTypedCoupon(e.target.value.toUpperCase())}
              placeholder="CÓDIGO"
              className="bg-surface-container border border-outline-variant/30 rounded-xl px-4 py-3 text-xs font-bold text-on-surface uppercase outline-none focus:border-primary max-w-[150px] placeholder:text-on-surface-variant/30"
            />
            <button
              onClick={() => handleApplyCouponCode(typedCoupon)}
              className="bg-primary text-on-primary text-xs font-black uppercase tracking-widest px-4 py-3 rounded-xl hover:bg-primary-fixed-dim transition-all"
            >
              Aplicar
            </button>
          </div>
          {validationMsg && (
            <span className={`text-[10px] font-bold ${validationMsg.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
              {validationMsg.text}
            </span>
          )}
        </div>
      </div>

      <div className="plans-ticker-container select-none">
        <div className="plans-ticker-track">
          {[...finalPlans, ...finalPlans].map((plan, idx) => {
            const hasUsedTrial = !!(
              userPlan?.hadTrial30 || 
              userPlan?.plan_type === 'trial_30' || 
              userPlan?.plan_type === 'trial_15' || 
              payments.some(p => p.planId === 'trial_30' && (p.status === 'approved' || p.status === 'pending'))
            );
            const isTrialBlocked = plan.id === 'trial_30' && hasUsedTrial;

            return (
              <div 
                key={`${plan.id}-${idx}`}
                className={`relative p-[24px_16px] rounded-[24px] border transition-all flex flex-col hover:-translate-y-[6px] hover:z-20 hover:shadow-[0_20px_40px_-5px_rgba(0,0,0,0.5)] w-[280px] shrink-0 ${
                  plan.featured 
                    ? 'bg-surface-container-high border-primary/40 shadow-[0_0_30px_rgba(0,245,160,0.06)] z-10' 
                    : 'bg-surface-container border-outline hover:border-outline-variant shadow-lg z-0'
                }`}
              >
                {/* Visual blocking overlay for used trial */}
                {isTrialBlocked && (
                  <div className="absolute inset-0 bg-[#080e1a]/85 rounded-[24px] z-[60] flex flex-col items-center justify-center p-6 text-center select-none backdrop-blur-[2px] transition-all">
                    <span className="material-symbols-outlined text-rose-500 text-3xl mb-3 animate-pulse">lock</span>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider mb-2">Teste Já Utilizado</h4>
                    <p className="text-[10px] text-on-surface-variant font-medium leading-relaxed max-w-[200px]">
                      O plano de 30 dias por 500 Kz é de uso único. Selecione uma opção a partir de 5.000 Kz.
                    </p>
                  </div>
                )}

                {plan.featured && (
                  <div className="absolute -top-[12px] left-1/2 -translate-x-1/2 bg-primary text-background text-[9px] font-black py-[4px] px-[16px] rounded-[100px] uppercase tracking-[0.15em] border border-primary/20 shadow-lg shadow-primary/20 z-20">
                    Best Choice
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-[9px] font-bold tracking-[0.15em] uppercase text-on-surface-variant/70 mb-[12px]">{plan.name}</h3>
                  <div className="flex items-center gap-[6px] text-[11px] text-on-surface-variant/60 line-through mb-[2px]">
                    {plan.oldPrice}
                    {plan.discount && (
                      <span className="inline-block bg-[#ff4b6e]/15 border border-[#ff4b6e]/30 text-[#ff4b6e] text-[8px] font-black tracking-[0.08em] uppercase px-[5px] py-[1px] rounded-[4px] no-underline">
                        {plan.discount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1 mb-[4px] overflow-visible">
                    <span className="text-[20px] xl:text-[24px] font-black font-headline tracking-tighter leading-none text-primary flex items-baseline drop-shadow-[0_4px_12px_rgba(0,245,160,0.15)]">
                      {plan.price}
                      <span className="text-[10px] font-black tracking-widest ml-1 opacity-50 text-on-surface uppercase align-baseline">Kz</span>
                    </span>
                    {(appliedCoupon && (appliedCoupon.targetPlan === 'all' || appliedCoupon?.targetPlan === plan.id)) ? (
                       <span className="text-[9px] text-on-surface-variant font-bold ml-1 line-through opacity-25 whitespace-nowrap">{plan.originalPriceStr}</span>
                    ) : null}
                  </div>
                  <div className="text-[11px] font-medium text-on-surface-variant/60 mb-[18px] uppercase tracking-widest">
                    {plan.period}
                  </div>
                  <div className="inline-flex items-center gap-[4px] bg-[#00f5a0]/10 border border-[#00f5a0]/20 text-[#00f5a0] text-[10px] font-bold px-[8px] py-[3px] rounded-[5px] mb-[12px]">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    {plan.savingsText}
                  </div>
                  <div className="flex items-center gap-[6px] text-[12px] text-on-surface-variant bg-[#00f5a0]/10 border border-[#00f5a0]/15 rounded-[8px] px-[12px] py-[8px] mb-[20px]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#00f5a0] shrink-0"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                    <span className="text-on-surface-variant leading-tight">{plan.limits}</span>
                  </div>
                </div>

                <hr className="border-t border-outline/30 my-[20px]" />

                <ul className="flex flex-col gap-[10px] mb-[30px] flex-1 list-none">
                  {plan.features.map((feature, idx) => {
                     const isPrioritySupport = feature === 'Suporte Prioritário via WhatsApp';
                     const isPanorama = feature === 'Acesso ao Panorama Económico';
                     return (
                    <li key={idx} className="flex items-center gap-[8px] text-[13px] text-on-surface-variant leading-snug">
                      <div className={`w-[16px] h-[16px] rounded-full flex items-center justify-center shrink-0 border ${
                        isPrioritySupport || isPanorama ? 'bg-[#00f5a0]/25 border-[#00f5a0]/50' : 'bg-[#00f5a0]/10 border-[#00f5a0]/30'
                      }`}>
                        <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke={isPrioritySupport || isPanorama ? "var(--color-primary)" : "currentColor"} strokeWidth={isPrioritySupport || isPanorama ? "2.5" : "2"} className={isPrioritySupport || isPanorama ? "" : "text-[#00f5a0]"}>
                          <polyline points="2 6 5 9 10 3"/>
                        </svg>
                      </div>
                      {isPrioritySupport ? (
                        <span className="text-[#00f5a0] font-semibold">{feature}</span>
                      ) : isPanorama ? (
                        <span className="text-[#00f5a0] font-black uppercase text-[11px] tracking-wider">🌍 {feature}</span>
                      ) : (
                        feature
                      )}
                    </li>
                  )})}
                </ul>

                <button 
                  onClick={() => {
                    if (plan.id === 'trial_30' && hasUsedTrial) {
                      alert('O plano de teste de 500 Kz só pode ser usufruído uma única vez por usuário. Por favor, selecione um plano a partir de 5.000 Kz.');
                      return;
                    }
                    if (!auth.currentUser && onAuthRequired) {
                      onAuthRequired();
                    } else if (!plan.current) {
                      setShowPaymentModal(plan);
                    }
                  }}
                  disabled={plan.current || (plan.id === 'trial_30' && hasUsedTrial)}
                  className={`w-full py-[12px] rounded-[8px] font-headline text-[12px] font-bold tracking-[0.08em] uppercase transition-all flex items-center justify-center border ${
                    plan.current
                      ? 'bg-[#00f5a0]/10 text-[#00f5a0] border-[#00f5a0]/20 cursor-default'
                      : (plan.id === 'trial_30' && hasUsedTrial)
                        ? 'bg-neutral-800/10 text-neutral-600 border-neutral-800 cursor-not-allowed'
                        : plan.featured
                          ? 'bg-primary text-background border-transparent hover:bg-primary-fixed-dim shadow-[0_8px_20px_rgba(0,245,160,0.25)]'
                          : 'bg-transparent text-on-surface border-outline-variant hover:bg-white/5'
                  }`}
                >
                  {plan.current ? 'Plano Ativo' : (plan.id === 'trial_30' && hasUsedTrial) ? 'Plano Bloqueado' : 'Adquirir Plano'}
                </button>
              </div>
            );
          })}
        </div>
      </div>



      {/* Link para Faturamentos */}
      <div className="bg-surface-container-low border border-outline-variant/10 rounded-[32px] p-8 md:p-10 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center">
            <History size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-on-surface uppercase tracking-tighter">Histórico de Pagamentos</h3>
            <p className="text-sm text-on-surface-variant tracking-wide">Visualize e baixe suas faturas e recibos anteriores.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-on-surface-variant text-sm font-bold opacity-60">
          <FileText size={20} />
          Acesse no menu lateral
        </div>
      </div>

      {/* Modal de Pagamento */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/95 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-surface-container border border-outline-variant/30 rounded-[40px] max-w-lg w-full p-8 md:p-10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] relative max-h-[92vh] overflow-y-auto custom-scrollbar">
            <button 
              onClick={handleCloseModal}
              className="absolute top-8 right-8 text-on-surface-variant hover:text-on-surface transition-colors z-10"
            >
              <X size={28} />
            </button>

            {!paymentSubmitted ? (
              <>
                <div className="text-center mb-10">
                  <div className="w-20 h-20 bg-primary text-on-primary rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/20">
                    <CreditCard size={40} />
                  </div>
                  <h3 className="text-3xl font-black text-on-surface mb-2 font-headline uppercase italic tracking-tighter">Dados de <span className="text-primary italic">Pagamento</span></h3>
                  <p className="text-on-surface-variant text-sm px-4">Utilize as informações oficiais abaixo para efetuar a transferência.</p>
                </div>

                <div className="space-y-6 mb-10">
                  <div className="bg-surface-container-high rounded-[32px] p-8 border border-outline-variant/20 space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Nome Completo do Pagador</label>
                        <input 
                          type="text" 
                          value={payerName}
                          onChange={(e) => setPayerName(e.target.value)}
                          placeholder="Ex: João Manuel dos Santos"
                          className="w-full bg-surface-container border border-outline-variant/10 rounded-2xl px-6 py-4 text-sm font-bold text-on-surface outline-none focus:border-primary transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Telemóvel (WhatsApp)</label>
                        <input 
                          type="text" 
                          value={payerPhone}
                          onChange={(e) => setPayerPhone(e.target.value)}
                          placeholder="+244 9..."
                          className="w-full bg-surface-container border border-outline-variant/10 rounded-2xl px-6 py-4 text-sm font-bold text-on-surface outline-none focus:border-primary transition-all font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center pb-6 border-b border-outline-variant/20">
                      <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.3em]">Total a Liquidar:</span>
                      <span className="text-3xl font-black text-primary font-mono tracking-tighter">{showPaymentModal.price} Kz</span>
                    </div>

                    {/* Seleção do Método de Pagamento */}
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Selecione o Método</label>
                      <div className="flex flex-row gap-2 bg-surface-container-low rounded-2xl p-1 border border-outline-variant/10 w-full">
                        {globalSettings?.showIban !== false && (
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('iban')}
                            className={`flex-1 flex flex-col sm:flex-row items-center justify-center py-2.5 px-2 rounded-xl text-center gap-1.5 transition-all font-bold ${paymentMethod === 'iban' ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50'}`}
                          >
                            <Landmark size={14} />
                            <span className="text-[9px] font-black uppercase tracking-tight">IBAN</span>
                          </button>
                        )}
                        {globalSettings?.showExpress !== false && (
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('express')}
                            className={`flex-1 flex flex-col sm:flex-row items-center justify-center py-2.5 px-2 rounded-xl text-center gap-1.5 transition-all font-bold ${paymentMethod === 'express' ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50'}`}
                          >
                            <img 
                              src={globalSettings?.multicaixaLogoUrl || "https://i.ibb.co/vz6W1fN/mcx-logo.png"} 
                              alt="Express" 
                              className={`h-[12px] object-contain shrink-0 ${paymentMethod === 'express' ? 'invert brightness-0 bg-transparent' : 'bg-white p-0.5 rounded-sm'}`} 
                            />
                            <span className="text-[9px] font-black uppercase tracking-tight">Express</span>
                          </button>
                        )}
                        {globalSettings?.showMulticaixa !== false && (
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('multicaixa')}
                            className={`flex-1 flex flex-col sm:flex-row items-center justify-center py-2.5 px-2 rounded-xl text-center gap-1.5 transition-all font-bold ${paymentMethod === 'multicaixa' ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50'}`}
                          >
                            <Smartphone size={14} />
                            <span className="text-[9px] font-black uppercase tracking-tight">Referência</span>
                          </button>
                        )}
                        {globalSettings?.showKwik !== false && (
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('kwik')}
                            className={`flex-1 flex flex-col sm:flex-row items-center justify-center py-2.5 px-2 rounded-xl text-center gap-1.5 transition-all font-bold ${paymentMethod === 'kwik' ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50'}`}
                          >
                            <span className="text-sm">💸</span>
                            <span className="text-[9px] font-black uppercase tracking-tight">KWIK</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-6">
                      {paymentMethod === 'kwik' && globalSettings?.showKwik !== false && (
                        <div className="space-y-2 group cursor-pointer" onClick={() => {
                          if (globalSettings?.kwikKey) {
                            navigator.clipboard.writeText(globalSettings.kwikKey);
                            alert('Chave KWIK copiada para a área de transferência!');
                          }
                        }}>
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
                              <span className="text-xs">💸</span>
                              Transferência por KWIK
                            </label>
                            <span className="text-[8px] font-black text-primary uppercase bg-primary/10 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">Clicar para Copiar</span>
                          </div>
                          <div className="p-5 bg-surface-container/50 rounded-2xl border border-outline-variant/10 group-hover:border-primary/50 transition-all flex flex-col text-center items-center justify-center">
                            {globalSettings?.kwikName && (
                              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                                Titular: <span className="text-on-surface">{globalSettings.kwikName}</span>
                              </span>
                            )}
                            <span className="text-base font-black text-primary font-mono tracking-tight break-all">{globalSettings?.kwikKey || 'Chave não configurada'}</span>
                            <span className="text-[10px] text-on-surface-variant/80 font-medium font-sans mt-1.5 flex items-center justify-center gap-1.5 border-t border-outline-variant/10 pt-1.5 w-full">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/60"></span>
                              Kwik: <span className="text-on-surface font-semibold">Chave de Transferência Instantânea</span>
                            </span>
                          </div>
                        </div>
                      )}

                      {paymentMethod === 'iban' && globalSettings?.showIban && (
                        <div className="space-y-2 group cursor-pointer" onClick={() => {
                          navigator.clipboard.writeText(globalSettings.iban);
                          alert('IBAN copiado para a área de transferência!');
                        }}>
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
                              <Landmark size={12} className="text-primary" />
                              Transferência Bancária (IBAN)
                            </label>
                            <span className="text-[8px] font-black text-primary uppercase bg-primary/10 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">Clicar para Copiar</span>
                          </div>
                          <div className="p-5 bg-surface-container/50 rounded-2xl border border-outline-variant/10 group-hover:border-primary/50 transition-all flex flex-col text-center items-center justify-center">
                            {globalSettings?.ibanName && (
                              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                                Titular: <span className="text-on-surface">{globalSettings.ibanName}</span>
                              </span>
                            )}
                            <span className="text-xl md:text-2xl font-black text-on-surface font-mono tracking-tight break-all">{globalSettings?.iban || 'A carregar...'}</span>
                            {globalSettings?.ibanBank && (
                              <span className="text-[10px] text-on-surface-variant/80 font-medium font-sans mt-1.5 flex items-center justify-center gap-1.5 border-t border-outline-variant/10 pt-1.5 w-full">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/60"></span>
                                Banco: <span className="text-on-surface font-semibold">{globalSettings.ibanBank}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {paymentMethod === 'multicaixa' && globalSettings?.showMulticaixa && (
                        <div className="space-y-4 pt-4 border-t border-outline-variant/10">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
                              <Smartphone size={12} className="text-secondary" />
                              Pagamento por Referência (MCX)
                            </label>
                            {globalSettings?.multicaixaLogoUrl && (
                               <img src={globalSettings?.multicaixaLogoUrl} alt="Multicaixa Logo" className="h-8 object-contain bg-white rounded-md p-1 opacity-80" />
                            )}
                          </div>
                          {globalSettings?.multicaixaName && (
                            <div className="px-5 py-3 bg-secondary/10 border border-secondary/20 rounded-xl mb-4">
                               <span className="text-[10px] font-black text-secondary uppercase tracking-widest block mb-1">Beneficiário</span>
                               <span className="font-bold text-on-surface">{globalSettings.multicaixaName}</span>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-5 bg-surface-container/50 rounded-2xl border border-outline-variant/10 flex flex-col gap-1">
                              <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest opacity-60">Entidade</span>
                              <span className="text-2xl font-black text-on-surface font-mono">{globalSettings?.multicaixaEntity}</span>
                            </div>
                            <div className="p-5 bg-surface-container/50 rounded-2xl border border-outline-variant/10 flex flex-col gap-1">
                              <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest opacity-60">Referência</span>
                              <span className="text-xl md:text-2xl font-black text-on-surface font-mono">{globalSettings?.multicaixaReference}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {paymentMethod === 'express' && (
                        <div className="space-y-4 pt-4 border-t border-outline-variant/10">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
                              <img src={globalSettings?.multicaixaLogoUrl || "https://i.ibb.co/vz6W1fN/mcx-logo.png"} alt="Express Logo" className="h-[14px] object-contain bg-white rounded p-0.5 shrink-0" />
                              Transferência por Express
                            </label>
                          </div>
                          
                          {(globalSettings?.expressNumber || globalSettings?.whatsappNumber) && (
                            <div className="px-5 py-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-center flex flex-col items-center justify-center">
                               <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block mb-1">Telemóvel Destino</span>
                               <span className="font-bold text-on-surface font-mono tracking-wider">{(globalSettings.expressNumber || globalSettings.whatsappNumber).replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')}</span>
                            </div>
                          )}

                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Inserir Código da Transação Express</label>
                            <input 
                              type="text" 
                              value={expressCode}
                              onChange={(e) => setExpressCode(e.target.value)}
                              placeholder="Ex: 08343843"
                              className="w-full bg-surface-container border border-amber-500/30 rounded-2xl px-6 py-4 text-sm font-bold text-on-surface outline-none focus:border-amber-500 transition-all font-mono text-center"
                            />
                          </div>
                        </div>
                      )}

                      {!globalSettings?.showIban && !globalSettings?.showMulticaixa && globalSettings?.showExpress === false && (
                        <div className="text-center py-6 text-on-surface-variant italic text-sm">
                          Informações indisponíveis. Contacte o administrador via WhatsApp.
                        </div>
                      )}
                    </div>
                  </div>

                  {payments.some(p => p.status === 'pending') ? (
                    <div className="flex flex-col gap-2 p-5 bg-error/10 border border-error/20 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-error text-xl">warning</span>
                        <p className="text-xs font-black text-error uppercase tracking-wider">
                          Solicitação Pendente Detectada
                        </p>
                      </div>
                      <p className="text-[11px] text-on-surface-variant leading-relaxed">
                        Você já enviou um pedido de upgrade que está sob análise dos Maestros. Para evitar duplicidades, o envio de uma nova solicitação está suspenso.
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                      <ShieldCheck size={20} className="text-amber-500 shrink-0" />
                      <p className="text-[10px] text-amber-500/90 font-medium leading-relaxed italic">
                        Após realizar o pagamento, clique no botão abaixo para confirmar. Você deverá enviar o comprovante via WhatsApp em seguida.
                      </p>
                    </div>
                  )}
                </div>

                <button 
                  onClick={handleRequestPayment}
                  disabled={isSubmitting || payments.some(p => p.status === 'pending')}
                  className="w-full bg-primary text-on-primary py-6 rounded-[24px] font-black hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-primary/30 uppercase tracking-[0.2em] disabled:opacity-40 disabled:hover:scale-100 disabled:active:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-sm"
                >
                  {isSubmitting ? 'A processar...' : payments.some(p => p.status === 'pending') ? '⚠️ Aguardando Validação' : 'Confirmar Pagamento'}
                </button>
              </>
            ) : (
              <div className="text-center py-10 animate-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                  <Check size={48} className="animate-in slide-in-from-bottom-4" />
                </div>
                <h3 className="text-3xl font-black text-on-surface mb-4 font-headline uppercase italic tracking-tighter">Quase <span className="text-emerald-500 italic">Lá!</span></h3>
                <p className="text-on-surface-variant text-sm mb-10 px-6 leading-relaxed">
                  Recebemos a sua notificação. Agora, clique no botão abaixo para nos enviar o seu <span className="font-black text-on-surface group">comprovativo via WhatsApp</span> para ativação imediata do seu plano.
                </p>
                
                <button 
                  onClick={handleSupport}
                  className="w-full bg-[#25D366] text-[#022c16] py-6 rounded-[24px] font-black hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-emerald-500/20 uppercase tracking-[0.2em] flex items-center justify-center gap-3 text-sm"
                >
                  <MessageSquare size={20} />
                  Enviar Comprovante (WP)
                </button>
                
                <button 
                  onClick={handleCloseModal}
                  className="mt-6 text-on-surface-variant text-[10px] font-black uppercase tracking-widest hover:text-on-surface transition-colors"
                >
                  Voltar para os Planos
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
