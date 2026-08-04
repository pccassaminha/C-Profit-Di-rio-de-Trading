import React, { useState, useEffect } from 'react';
import { useTrades } from '../hooks/useTrades';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy, getDocs, getDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import { CreditCard, Check, ShieldCheck, Zap, Star, LayoutGrid, Smartphone, MessageSquare, History, Upload, Landmark, X, FileText } from 'lucide-react';
import Modal from './Modal';
import CountryDropdown from './CountryDropdown';

import { Lock, PartyPopper, Ticket, PiggyBank, AlertTriangle } from 'lucide-react';

// Helper to parse price string containing dots, commas, spaces, etc. into a Number
const parsePriceToNumber = (val: string | number): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const clean = val.toString().replace(/[^0-9]/g, '');
  return Number(clean) || 0;
};

// Helper to format number to string with thousands dots
const formatPrice = (num: number): string => {
  return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const getFormattedPhone = (phone: string | undefined): string => {
  if (!phone) return '244956394712';
  let clean = phone.replace(/\D/g, '');
  if (clean.length === 9 && clean.startsWith('9')) {
    return '244' + clean;
  }
  return clean || '244956394712';
};

const COUNTRIES = [
  { code: 'AO', label: 'AO +244', dialCode: '+244', flag: '🇦🇴' },
  { code: 'PT', label: 'PT +351', dialCode: '+351', flag: '🇵🇹' },
  { code: 'BR', label: 'BR +55', dialCode: '+55', flag: '🇧🇷' },
  { code: 'MZ', label: 'MZ +258', dialCode: '+258', flag: '🇲🇿' },
  { code: 'CV', label: 'CV +238', dialCode: '+238', flag: '🇨🇻' },
  { code: 'GW', label: 'GW +245', dialCode: '+245', flag: '🇬🇼' },
  { code: 'ST', label: 'ST +239', dialCode: '+239', flag: '🇸🇹' },
  { code: 'GQ', label: 'GQ +240', dialCode: '+240', flag: '🇬🇶' }
];

const parsePhoneNumberInput = (phoneVal: string) => {
  const dialCodes = ['+244', '+351', '+55', '+258', '+238', '+245', '+239', '+240'];
  let cleaned = (phoneVal || '').trim();
  
  for (const dial of dialCodes) {
    if (cleaned.startsWith(dial)) {
      return { dialCode: dial, localNumber: cleaned.substring(dial.length).trim() };
    }
    const noPlus = dial.replace('+', '');
    if (cleaned.startsWith(noPlus)) {
      return { dialCode: dial, localNumber: cleaned.substring(noPlus.length).trim() };
    }
  }
  
  if (cleaned.length === 9 && cleaned.startsWith('9')) {
    return { dialCode: '+244', localNumber: cleaned };
  }
  
  return { dialCode: '+244', localNumber: cleaned };
};

export default function Plans({ forcedExpired, hideHeader, onAuthRequired }: { forcedExpired?: boolean, hideHeader?: boolean, onAuthRequired?: (planId?: string, couponCode?: string) => void }) {
  const { userPlan, globalSettings } = useTrades();
  const [payments, setPayments] = useState<any[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState<any>(null);
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payerName, setPayerName] = useState(auth.currentUser?.displayName || '');
  const [payerPhone, setPayerPhone] = useState('');
  const [payerDialCode, setPayerDialCode] = useState('+244');
  const [payerPhoneLocal, setPayerPhoneLocal] = useState('');

  useEffect(() => {
    if (payerPhone) {
      const parsed = parsePhoneNumberInput(payerPhone);
      setPayerDialCode(parsed.dialCode);
      setPayerPhoneLocal(parsed.localNumber);
    }
  }, [payerPhone]);

  const handlePayerPhoneLocalChange = (val: string) => {
    const clean = val.replace(/\D/g, '');
    setPayerPhoneLocal(clean);
    setPayerPhone(payerDialCode + clean);
  };

  const handlePayerDialChange = (val: string) => {
    setPayerDialCode(val);
    setPayerPhone(val + payerPhoneLocal);
  };
  const [appliedCoupon, setAppliedCoupon] = useState<any>({
    id: 'descontode83_static',
    code: 'CPROFIT83%OFF',
    active: true,
    discountType: 'percentage',
    discountValue: 83,
    targetPlan: 'all'
  });
  const [paymentMethod, setPaymentMethod] = useState<'iban' | 'multicaixa' | 'express' | 'kwik'>('iban');
  const [expressCode, setExpressCode] = useState('');
  const [ibanCode, setIbanCode] = useState('');
  const [kwikCode, setKwikCode] = useState('');
  const [activeCouponsList, setActiveCouponsList] = useState<any[]>([]);
  const [typedCoupon, setTypedCoupon] = useState('CPROFIT83%OFF');
  const [validationMsg, setValidationMsg] = useState<{ text: string, type: 'success' | 'error' } | null>({
    text: 'Cupom "CPROFIT83%OFF" de 83% de DESCONTO aplicado de forma automática!',
    type: 'success'
  });
  const [hadTrial30, setHadTrial30] = useState(false);
  const [showModalCouponInput, setShowModalCouponInput] = useState(false);
  const [modalCouponCode, setModalCouponCode] = useState('');
  const [modalCouponError, setModalCouponError] = useState<string | null>(null);
  const [modalCouponSuccessMsg, setModalCouponSuccessMsg] = useState<string | null>(null);
  const [liveUsdToAoa, setLiveUsdToAoa] = useState<number | null>(null);
  const [loadingLiveRate, setLoadingLiveRate] = useState<boolean>(false);

  useEffect(() => {
    if (showPaymentModal) {
      setShowModalCouponInput(false);
      setModalCouponCode('');
      setModalCouponError(null);
      setModalCouponSuccessMsg(null);
    }
  }, [showPaymentModal]);

  useEffect(() => {
    if (paymentMethod === 'multicaixa' && globalSettings?.usdtExchangeRateMode === 'auto' && !liveUsdToAoa) {
      setLoadingLiveRate(true);
      fetch('https://open.er-api.com/v6/latest/USD')
        .then(res => res.json())
        .then(data => {
          if (data && data.rates && data.rates.AOA) {
            setLiveUsdToAoa(data.rates.AOA);
          }
        })
        .catch(err => {
          console.error("Erro ao buscar taxa de câmbio USD/AOA:", err);
        })
        .finally(() => {
          setLoadingLiveRate(false);
        });
    }
  }, [paymentMethod, globalSettings, liveUsdToAoa]);

  const getUsdtConversion = (priceInKz: number) => {
    const rateMode = globalSettings?.usdtExchangeRateMode || 'manual';
    const baseRate = rateMode === 'auto' && liveUsdToAoa ? liveUsdToAoa : (globalSettings?.usdtManualRate || 1000);
    const networkFee = globalSettings?.usdtNetworkFee !== undefined ? globalSettings.usdtNetworkFee : 1;
    
    // Total USDT = (Kz / baseRate) + networkFee
    const rawUsdt = priceInKz / baseRate;
    const totalUsdt = rawUsdt + networkFee;
    
    return {
      rate: baseRate,
      amount: totalUsdt,
      rawAmount: rawUsdt,
      networkFee: networkFee,
      rateMode: rateMode
    };
  };

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

  const handleApplyCouponCode = async (codeStr: string, isFromModal = false) => {
    if (isFromModal) {
      setModalCouponError(null);
      setModalCouponSuccessMsg(null);
    } else {
      setValidationMsg(null);
    }
    const cleanCode = codeStr.trim().toUpperCase();
    if (!cleanCode) return;

    try {
      // Prioritize database query for both standard or DESCONTODE50% coupons
      const q = query(collection(db, 'coupons'), where('code', '==', cleanCode));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const couponDoc = snap.docs[0].data();
        if (!couponDoc.active) {
          const errorMsg = 'Cupom inválido ou inativo.';
          if (isFromModal) setModalCouponError(errorMsg);
          else setValidationMsg({ text: errorMsg, type: 'error' });
          return;
        }
        
        const is83Coupon = cleanCode === 'CPROFIT83%OFF';
        const finalDiscountValue = is83Coupon ? 83 : couponDoc.discountValue;
        const cp = { 
          id: snap.docs[0].id, 
          ...couponDoc,
          discountValue: finalDiscountValue
        };
        setAppliedCoupon(cp);
        
        const successMsg = `Cupom "${cleanCode}" de ${finalDiscountValue}${couponDoc.discountType === 'percentage' ? '%' : ' Kz'} aplicado com sucesso!`;
        if (isFromModal) setModalCouponSuccessMsg(successMsg);
        else setValidationMsg({ text: successMsg, type: 'success' });
        return;
      }
      
      // Fallback for CPROFIT83%OFF if not yet in database (e.g., initial seed)
      if (cleanCode === 'CPROFIT83%OFF') {
        setAppliedCoupon({
          id: 'descontode83_static',
          code: 'CPROFIT83%OFF',
          active: true,
          discountType: 'percentage',
          discountValue: 83,
          targetPlan: 'all'
        });
        const successMsg = 'Cupom "CPROFIT83%OFF" de 83% de DESCONTO aplicado com sucesso!';
        if (isFromModal) setModalCouponSuccessMsg(successMsg);
        else setValidationMsg({ text: successMsg, type: 'success' });
        return;
      }

      const errorMsg = 'Cupom inválido ou inativo.';
      if (isFromModal) setModalCouponError(errorMsg);
      else setValidationMsg({ text: errorMsg, type: 'error' });
    } catch (err) {
      console.error(err);
      const errorMsg = 'Erro ao validar cupom.';
      if (isFromModal) setModalCouponError(errorMsg);
      else setValidationMsg({ text: errorMsg, type: 'error' });
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
      where('userId', '==', auth.currentUser.uid)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });
      setPayments(list);
    });
    return () => unsub();
  }, []);

  const plans = [
    {
      id: 'iniciante',
      name: 'Testar Grátis o Seu Diário de Trades',
      oldPrice: '0',
      discount: '100% GRÁTIS',
      savingsText: 'Acesso Gratuito ao Diário de Trades',
      price: '0',
      period: 'sempre grátis',
      days: 365,
      limits: '2 Contas de Trading',
      totalLimit: 2,
      features: ['Diário de Trades Gratuito', 'Gestão de 2 Contas de Trading', 'Estatísticas de Desempenho & Win Rate', 'Histórico Completo de Ordens', 'Suporte Técnico Integrado'],
      current: userPlan?.plan_type === 'Iniciante' || !userPlan?.plan_type || userPlan?.plan_type === 'trial_30' || userPlan?.plan_type === 'trial_15'
    },
    {
      id: 'mensal_6',
      name: 'Plano Mensal',
      oldPrice: '13.236',
      discount: '-33% OFF',
      savingsText: 'Poupa Kz 4.412 / mês',
      price: '8.824',
      period: 'por mês',
      days: 30,
      limits: '6 Contas Forex + 6 Contas OB',
      totalLimit: 12,
      features: ['Acesso ao Panorama Global', 'Importação de Trades', 'Diário de Trades Ilimitado', 'Acesso à Comunidade'],
      current: userPlan?.plan_type === 'mensal_6' || userPlan?.plan_type === 'mensal_2'
    },
    {
      id: 'trimestral_6',
      name: 'Plano Trimestral',
      oldPrice: '39.708',
      discount: '-33% OFF',
      savingsText: 'Poupa Kz 13.236 no trimestre',
      price: '26.472',
      period: 'a cada 3 meses',
      days: 90,
      limits: '6 Contas Forex + 6 Contas OB',
      totalLimit: 12,
      features: ['Acesso ao Panorama Global', 'Importação de Trades', 'Diário de Trades Ilimitado', 'Acesso à Comunidade VIP'],
      current: userPlan?.plan_type === 'trimestral_6'
    },
    {
      id: 'semestral_8',
      name: 'Plano Semestral',
      oldPrice: '79.416',
      discount: '-33% OFF',
      savingsText: 'Poupa Kz 26.472 no semestre',
      price: '52.944',
      period: 'a cada 6 meses',
      days: 180,
      limits: '8 Contas Forex + 8 Contas OB',
      totalLimit: 16,
      features: ['Acesso ao Panorama Global', 'Importação de Trades', 'Diário de Trades Ilimitado', 'Resumos Macroeconômicos', 'Acesso à Comunidade VIP', 'Suporte Prioritário via WhatsApp'],
      featured: true,
      current: userPlan?.plan_type === 'semestral_8' || userPlan?.plan_type === 'semestral_6'
    },
    {
      id: 'anual_16',
      name: 'Plano Anual',
      oldPrice: '158.823',
      discount: '-33% OFF',
      savingsText: 'Poupa Kz 52.941 no ano',
      price: '105.882',
      period: 'por ano',
      days: 365,
      limits: '16 Contas Forex + 16 Contas OB',
      totalLimit: 32,
      features: ['Acesso ao Panorama Global', 'Importação de Trades', 'Diário de Trades Ilimitado', 'Resumos Macroeconômicos', 'Acesso à Comunidade VIP', 'Suporte Prioritário via WhatsApp', 'Personalização de Interface', 'Acesso Antecipado a Beta'],
      current: userPlan?.plan_type === 'anual_16'
    }
  ];

  // Aplicar Desconto do Cupão
  const getDiscountedPrice = (plan: any) => {
     const priceNum = parsePriceToNumber(plan.price);
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
        // Auto 83% OFF trial conversion discount
        discountPercentage = 83;
     }

     const originalPriceNum = parsePriceToNumber(plan.price);
     let finalPriceNum = originalPriceNum;

     if (discountPercentage > 0) {
        finalPriceNum = originalPriceNum - (originalPriceNum * (discountPercentage / 100));
     } else if (discountFixed > 0) {
        finalPriceNum = originalPriceNum - discountFixed;
     }

     if (finalPriceNum < 0) finalPriceNum = 0;
     
     // Formatar novamente com pontos
     return formatPrice(finalPriceNum);
  };

  const getFinalDiscountLabel = (plan: any, finalPriceStr: string) => {
      const finalPriceNum = parsePriceToNumber(finalPriceStr);
      if (plan.id === 'trial_30') return plan.discount;
      if (plan.oldPrice) {
          const oldPriceNum = parsePriceToNumber(plan.oldPrice);
          if (oldPriceNum > finalPriceNum) {
              const hasCoupon = appliedCoupon && (appliedCoupon.targetPlan === 'all' || appliedCoupon.targetPlan === plan.id);
              const hasTrialConversion = !appliedCoupon && (userPlan?.plan_type === 'trial_15' || userPlan?.plan_type === 'trial_30');
              if (hasCoupon || hasTrialConversion) {
                  return `-83% SUPERCUPOM`;
              }
              return `-33% OFF`;
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
    const phone = getFormattedPhone(globalSettings?.whatsappNumber);
    
    // Build custom message
    const targetPlan = showPaymentModal ? (plans.find(p => p.id === showPaymentModal.id) || showPaymentModal) : null;
    const planName = targetPlan ? targetPlan.name : 'Plano';
    const dynamicPrice = targetPlan ? getDiscountedPrice(targetPlan) : '';
    
    let methodDisplay = 'Transferência/Depósito';
    if (paymentMethod === 'iban') methodDisplay = 'IBAN Bancário';
    else if (paymentMethod === 'multicaixa') methodDisplay = 'USDT 🪙';
    else if (paymentMethod === 'express') methodDisplay = 'Multicaixa Express';
    else if (paymentMethod === 'kwik') methodDisplay = 'KWIK';

    const expressDetail = (paymentMethod === 'express' && expressCode) 
      ? `\n- Código da Transação: *${expressCode.trim()}*` 
      : (paymentMethod === 'iban' && ibanCode)
      ? `\n- Código da Transação: *${ibanCode.trim()}*`
      : (paymentMethod === 'kwik' && kwikCode)
      ? `\n- Código da Transação: *${kwikCode.trim()}*`
      : '';

    const priceInKz = targetPlan ? parsePriceToNumber(dynamicPrice) : 0;
    const usdtConv = targetPlan ? getUsdtConversion(priceInKz) : null;
    const usdtDetail = (paymentMethod === 'multicaixa' && usdtConv)
      ? `\n- Valor USDT Calculado: *${usdtConv.amount.toFixed(2)} USDT* (Câmbio: 1 USDT = ${usdtConv.rate.toFixed(2)} Kz)`
      : '';

    const text = `Olá Suporte C Profit ! Meu nome é *${payerName || 'Cliente'}*.

Acabei de solicitar a assinatura do plano *${planName}* (Valor: ${dynamicPrice} Kz) através de *${methodDisplay}*.${expressDetail}${usdtDetail}

*Meus Dados de Cadastro:*
- Nome: ${payerName || 'Não especificado'}
- Email da Conta: ${auth.currentUser?.email || 'Não especificado'}
- Telemóvel: ${payerPhone || 'Não especificado'}

Estou a enviar em anexo a esta mensagem o meu comprovativo de pagamento. Poderia, por favor, validar e ativar a minha conta para começarmos?

Fico no aguardo, obrigado!`;

    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/${phone}?text=${encodedText}`, '_blank');
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
    if (paymentMethod === 'iban' && !ibanCode.trim()) {
      alert('Por favor, insira o Código da Transação ou Operação do IBAN.');
      return;
    }
    if (paymentMethod === 'kwik' && !kwikCode.trim()) {
      alert('Por favor, insira o Código da Transação ou Operação do KWIK.');
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
      const targetPlan = plans.find(p => p.id === showPaymentModal.id) || showPaymentModal;
      const dynamicPrice = getDiscountedPrice(targetPlan);
      const priceInKz = parsePriceToNumber(dynamicPrice);
      const usdtConv = getUsdtConversion(priceInKz);

      await addDoc(collection(db, 'payments'), {
        userId: auth.currentUser?.uid,
        userName: payerName,
        userEmail: auth.currentUser?.email || '',
        userPhone: payerPhone,
        planId: showPaymentModal.id,
        amount: priceInKz,
        status: 'pending',
        transactionCode: numericId,
        proofUrl: 'WhatsApp Support',
        usedCoupon: appliedCoupon ? appliedCoupon.code : null,
        paymentMethod: paymentMethod,
        expressCode: paymentMethod === 'express' ? expressCode.trim() :
                     paymentMethod === 'iban' ? ibanCode.trim() :
                     paymentMethod === 'kwik' ? kwikCode.trim() : null,
        usdtAmount: paymentMethod === 'multicaixa' ? Number(usdtConv.amount.toFixed(2)) : null,
        usdtRate: paymentMethod === 'multicaixa' ? usdtConv.rate : null,
        usdtNetworkFee: paymentMethod === 'multicaixa' ? usdtConv.networkFee : null,
        usdtRateMode: paymentMethod === 'multicaixa' ? usdtConv.rateMode : null,
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
      expiryDate.setFullYear(expiryDate.getFullYear() + 10);
      
      const userRef = doc(db, 'usuarios', auth.currentUser.uid);
      await setDoc(userRef, {
        plan_type: 'Iniciante',
        expiry_date: expiryDate.toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      alert('Diário de Trades Gratuito ativado com sucesso! Bons registos!');
    } catch (err) {
      console.error(err);
      alert('Erro ao ativar Plano Grátis.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`p-4 md:p-8 max-w-[1440px] mx-auto min-h-screen animate-in fade-in duration-500 space-y-8 md:space-y-12 ${hideHeader ? 'min-h-fit py-0' : ''}`}>
      {forcedExpired && (
        <div className="bg-error/10 border border-error/50 p-6 rounded-3xl flex items-center gap-6 animate-in slide-in-from-top duration-500">
          <div className="w-14 h-14 bg-error/20 rounded-2xl flex items-center justify-center text-error shadow-lg shadow-error/10">
            <Lock className="text-3xl" />
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
              <PartyPopper className="text-3xl" />
            </div>
            <div>
              <h3 className="text-[#00f5a0] font-black text-lg uppercase tracking-wider">
                🎁 Desconto de Conversão Especial – 83% OFF Ativado!
              </h3>
              <p className="text-on-surface-variant text-xs font-semibold leading-relaxed">
                Como agradecimento especial por testar a plataforma Profit, você recebeu um <strong className="text-white">Desconto Exclusivo de 83%</strong> em qualquer assinatura ativa! O desconto já foi aplicado e está visível nos planos abaixo de forma automática.
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
            <Ticket className="text-primary text-2xl animate-bounce" />
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
            const isTrialBlocked = false;

            return (
              <div 
                key={`${plan.id}-${idx}`}
                className={`relative p-[32px_24px] rounded-[32px] border transition-all flex flex-col hover:-translate-y-[6px] hover:z-20 hover:shadow-[0_20px_40px_-5px_rgba(0,0,0,0.5)] w-[340px] shrink-0 ${
                  plan.featured 
                    ? 'bg-surface-container-high border-primary/40 shadow-[0_0_30px_rgba(0,245,160,0.06)] z-10' 
                    : 'bg-surface-container border-outline hover:border-outline-variant shadow-lg z-0'
                }`}
              >
                {/* Visual blocking overlay for used trial */}
                {isTrialBlocked && (
                  <div className="absolute inset-0 bg-[#080e1a]/85 rounded-[24px] z-[60] flex flex-col items-center justify-center p-6 text-center select-none backdrop-blur-[2px] transition-all">
                    <Lock className="text-rose-500 text-3xl mb-3 animate-pulse" />
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
                     const isPanorama = feature === 'Acesso ao Panorama Global';
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
                    if (!auth.currentUser && onAuthRequired) {
                      const initialCoupon = plan.id === 'iniciante' ? '' : 'CPROFIT83%OFF';
                      onAuthRequired(plan.id, initialCoupon);
                    } else if (plan.id === 'iniciante') {
                      handleActivateFreeTrial();
                    } else if (!plan.current) {
                      setShowPaymentModal(plan);
                    }
                  }}
                  disabled={plan.current}
                  className={`w-full py-[12px] rounded-[8px] font-headline text-[12px] font-bold tracking-[0.08em] uppercase transition-all flex items-center justify-center border ${
                    plan.current
                      ? 'bg-[#00f5a0]/10 text-[#00f5a0] border-[#00f5a0]/20 cursor-default'
                      : plan.featured
                        ? 'bg-primary text-background border-transparent hover:bg-primary-fixed-dim shadow-[0_8px_20px_rgba(0,245,160,0.25)]'
                        : 'bg-transparent text-on-surface border-outline-variant hover:bg-white/5'
                  }`}
                >
                  {plan.current ? 'Plano Ativo' : plan.id === 'iniciante' ? 'Testar Grátis Agora' : 'Adquirir Plano'}
                </button>
              </div>
            );
          })}
        </div>
      </div>



      {/* FAQ Section */}
      <div className="bg-surface border border-outline-variant/10 rounded-[32px] p-8 md:p-10 shadow-2xl mb-12">
        <h3 className="text-2xl font-black text-on-surface uppercase tracking-tighter mb-8 text-center">
          Dúvidas Frequentes
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/5">
            <h4 className="font-bold text-on-surface mb-2 flex items-center gap-2">
              <span className="text-primary">•</span> Como funcionam as restrições de contas?
            </h4>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              As restrições (ex: 6 Contas Forex + 6 Contas OB) referem-se ao número máximo de contas de trading que você pode integrar simultaneamente no terminal. Você pode excluir uma conta antiga para adicionar uma nova a qualquer momento, desde que não ultrapasse o limite ativo do seu plano.
            </p>
          </div>
          
          <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/5">
            <h4 className="font-bold text-on-surface mb-2 flex items-center gap-2">
              <span className="text-primary">•</span> Posso fazer upgrade de plano?
            </h4>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Sim! Ao realizar o upgrade para um plano superior (ex: Mensal para Semestral), os dias restantes do seu plano atual são mantidos, e as novas vantagens são ativadas imediatamente após a aprovação do comprovante.
            </p>
          </div>
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
          <div className="bg-surface-container border border-outline-variant/30 rounded-[40px] max-w-5xl w-full p-8 md:p-10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] relative max-h-[92vh] overflow-y-auto custom-scrollbar">
            <button 
              onClick={handleCloseModal}
              className="absolute top-8 right-8 text-on-surface-variant hover:text-on-surface transition-colors z-10"
            >
              <X size={28} />
            </button>

            {!paymentSubmitted ? (
              <>
                <div className="text-center mb-8">
                  <div className="w-20 h-20 bg-primary text-on-primary rounded-[2rem] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
                    <CreditCard size={40} />
                  </div>
                  <h3 className="text-3xl font-black text-on-surface mb-2 font-headline uppercase italic tracking-tighter">Dados de <span className="text-primary italic">Pagamento</span></h3>
                  
                  {/* Nome do Plano Destacado */}
                  {(() => {
                    const targetPlan = plans.find(p => p.id === showPaymentModal.id) || showPaymentModal;
                    return (
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full mb-3 animate-pulse">
                        <span className="w-2 h-2 bg-[#00f5a0] rounded-full"></span>
                        <span className="text-xs font-black uppercase tracking-wider text-white">
                          Plano Selecionado: <span className="text-[#00f5a0]">{targetPlan.name}</span>
                        </span>
                      </div>
                    );
                  })()}
                  
                  <p className="text-on-surface-variant text-xs px-4 max-w-md mx-auto">Utilize as informações oficiais abaixo para efetuar a transferência.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10 text-left items-start">
                  
                  {/* Left Column */}
                  <div className="lg:col-span-7 space-y-6">
                    <div className="bg-surface-container-high rounded-[32px] p-6 md:p-8 border border-outline-variant/20 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none"></div>
                      <h4 className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest border-b border-outline-variant/10 pb-3 mb-6 relative z-10">Dados do Pagador</h4>
                      <div className="relative z-10 space-y-4">
                        
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
                        <div className="flex gap-2">
                          <CountryDropdown 
                            value={payerDialCode}
                            onChange={handlePayerDialChange}
                          />

                          <input 
                            type="text" 
                            required
                            value={payerPhoneLocal}
                            onChange={(e) => handlePayerPhoneLocalChange(e.target.value)}
                            placeholder="Ex: 923 000 000"
                            className="flex-1 bg-surface-container border border-outline-variant/10 rounded-2xl px-6 py-4 text-sm font-bold text-on-surface outline-none focus:border-primary transition-all font-mono"
                          />
                        </div>
                      </div>
                    
                      </div>
                    </div>

                    <div className="bg-surface-container-high rounded-[32px] p-6 md:p-8 border border-outline-variant/20 relative overflow-hidden">
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
                            <span className="text-xs">🪙</span>
                            <span className="text-[9px] font-black uppercase tracking-tight">USDT</span>
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


                      <div className="pt-6 mt-6 border-t border-outline-variant/10">
                                            <div className="space-y-6">
                      {paymentMethod === 'kwik' && globalSettings?.showKwik !== false && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                          <div className="space-y-2 group cursor-pointer" onClick={() => {
                            if (globalSettings?.kwikName) {
                              navigator.clipboard.writeText(globalSettings.kwikName);
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
                              {globalSettings?.kwikKey && (
                                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                                  Titular: <span className="text-on-surface">{globalSettings.kwikKey}</span>
                                </span>
                              )}
                              <span className="text-base font-black text-primary font-mono tracking-tight whitespace-nowrap">{globalSettings?.kwikName || 'Chave não configurada'}</span>
                              <span className="text-[10px] text-on-surface-variant/80 font-medium font-sans mt-1.5 flex items-center justify-center gap-1.5 border-t border-outline-variant/10 pt-1.5 w-full">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/60"></span>
                                Kwik: <span className="text-on-surface font-semibold">Chave de Transferência Instantânea</span>
                              </span>
                            </div>
                          </div>

                          {/* KWIK Operation/Transaction Code Input */}
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Inserir Código da Transação / Operação</label>
                            <input 
                              type="text" 
                              value={kwikCode}
                              onChange={(e) => setKwikCode(e.target.value)}
                              placeholder="Ex: 08343843"
                              className="w-full bg-surface-container border border-outline-variant/20 rounded-2xl px-6 py-4 text-sm font-bold text-on-surface outline-none focus:border-primary transition-all font-mono text-center"
                            />
                          </div>
                        </div>
                      )}

                      {paymentMethod === 'iban' && globalSettings?.showIban && (
                        <div className="space-y-4 animate-in fade-in duration-200">
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
                              <span className="text-xs min-[360px]:text-sm min-[440px]:text-base sm:text-lg md:text-xl font-black text-on-surface font-mono tracking-tighter whitespace-nowrap max-w-full block py-1 select-all">{globalSettings?.iban || 'A carregar...'}</span>
                              {globalSettings?.ibanBank && (
                                <span className="text-[10px] text-on-surface-variant/80 font-medium font-sans mt-1.5 flex items-center justify-center gap-1.5 border-t border-outline-variant/10 pt-1.5 w-full">
                                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/60"></span>
                                  Banco: <span className="text-on-surface font-semibold">{globalSettings.ibanBank}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* IBAN Operation/Transaction Code Input */}
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Inserir Código da Transação / Operação</label>
                            <input 
                              type="text" 
                              value={ibanCode}
                              onChange={(e) => setIbanCode(e.target.value)}
                              placeholder="Ex: 08343843"
                              className="w-full bg-surface-container border border-outline-variant/20 rounded-2xl px-6 py-4 text-sm font-bold text-on-surface outline-none focus:border-primary transition-all font-mono text-center"
                            />
                          </div>
                        </div>
                      )}

                       {paymentMethod === 'multicaixa' && globalSettings?.showMulticaixa && (
                        <div className="space-y-4 pt-4 border-t border-outline-variant/10 animate-in fade-in duration-200">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
                              <span className="text-xs">🪙</span>
                              Pagamento via USDT
                            </label>
                          </div>

                          {/* USDT Exchange Rate Calculation Box */}
                          {(() => {
                            const targetPlan = plans.find(p => p.id === showPaymentModal.id) || showPaymentModal;
                            const dynamicPrice = getDiscountedPrice(targetPlan);
                            const priceInKz = parsePriceToNumber(dynamicPrice);
                            const conversion = getUsdtConversion(priceInKz);

                            return (
                              <div className="bg-surface-container-high/60 border border-[#00f5a0]/20 rounded-2xl p-4 space-y-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Valor Convertido:</span>
                                  <div className="flex items-center gap-1.5 bg-[#00f5a0]/10 border border-[#00f5a0]/20 px-3 py-1 rounded-xl">
                                    <span className="text-base font-mono font-black text-[#00f5a0]">{conversion.amount.toFixed(2)}</span>
                                    <span className="text-[10px] font-black text-[#00f5a0] uppercase tracking-wider">USDT</span>
                                  </div>
                                </div>

                                <div className="border-t border-dashed border-outline-variant/10 my-2"></div>

                                <div className="space-y-1 text-[11px] text-on-surface-variant font-medium">
                                  <div className="flex justify-between">
                                    <span>Preço em Kwanzas:</span>
                                    <span className="text-on-surface font-semibold font-mono">{formatPrice(priceInKz)} Kz</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Taxa de Câmbio:</span>
                                    <span className="text-on-surface font-semibold font-mono">
                                      {loadingLiveRate ? 'A carregar taxa...' : `1 USDT = ${conversion.rate.toFixed(2)} Kz`}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Valor Equivalente:</span>
                                    <span className="text-on-surface font-semibold font-mono">{conversion.rawAmount.toFixed(2)} USDT</span>
                                  </div>
                                  {conversion.networkFee > 0 && (
                                    <div className="flex justify-between text-amber-400">
                                      <span>Taxa de Rede (Gás):</span>
                                      <span className="font-bold font-mono">+{conversion.networkFee.toFixed(2)} USDT</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between text-[#00f5a0] pt-0.5 border-t border-outline-variant/5">
                                    <span>Tipo de Câmbio:</span>
                                    <span className="font-bold uppercase text-[9px] tracking-wide flex items-center gap-1">
                                      {conversion.rateMode === 'auto' ? '⚡ Tempo Real (API)' : '⚙️ Taxa Fixada'}
                                    </span>
                                  </div>
                                </div>

                                <div className="border-t border-dashed border-outline-variant/10 pt-2 flex items-center justify-between gap-2">
                                  <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest opacity-60">Enviar Exatamente:</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(conversion.amount.toFixed(2));
                                      alert('Quantia de ' + conversion.amount.toFixed(2) + ' USDT copiada para a área de transferência!');
                                    }}
                                    className="px-2.5 py-1 bg-surface-container border border-outline-variant/10 text-on-surface hover:text-[#00f5a0] text-[9px] font-black uppercase tracking-widest rounded-lg transition-all"
                                  >
                                    Copiar Quantia
                                  </button>
                                </div>
                              </div>
                            );
                          })()}

                          {/* QR Code Section */}
                          {globalSettings?.usdtQrCodeUrl && (
                            <div className="flex flex-col items-center justify-center p-4 bg-white/5 border border-outline-variant/10 rounded-2xl">
                              <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-2 opacity-60">Escaneie o QR Code</span>
                              <img 
                                src={globalSettings.usdtQrCodeUrl} 
                                alt="USDT Wallet QR" 
                                className="w-48 h-48 object-contain bg-white rounded-xl p-2 shadow-inner border border-slate-200"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}

                          {/* Address Section */}
                          {globalSettings?.usdtAddress && (
                            <div className="p-4 bg-surface-container/50 rounded-2xl border border-outline-variant/10 flex flex-col gap-2 relative group">
                              <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest opacity-60">Endereço de Carteira USDT</span>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-bold text-on-surface font-mono break-all select-all tracking-tight pr-16">
                                  {globalSettings.usdtAddress}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(globalSettings.usdtAddress);
                                    alert('Endereço USDT copiado!');
                                  }}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold rounded-xl transition-all shadow-md"
                                  title="Copiar Endereço"
                                >
                                  Copiar
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Legend / Network Warning Section */}
                          {globalSettings?.usdtLegend && (
                            <div className="px-5 py-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-center">
                              <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block mb-1">REDE / INSTRUÇÕES</span>
                              <p className="text-xs text-on-surface font-bold leading-relaxed">{globalSettings.usdtLegend}</p>
                            </div>
                          )}
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
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="lg:col-span-5 space-y-6 sticky top-6">
                    <div className="bg-surface-container-high rounded-[32px] p-6 md:p-8 border border-primary/30 relative overflow-hidden shadow-[0_0_30px_rgba(0,245,160,0.05)]">
                      <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none"></div>
                      <h4 className="text-[11px] font-black text-primary uppercase tracking-widest border-b border-primary/20 pb-3 mb-6 relative z-10">Resumo da Compra</h4>
                      <div className="space-y-6 relative z-10">
                                            {(() => {
                      const targetPlan = plans.find(p => p.id === showPaymentModal.id) || showPaymentModal;
                      const dynamicPrice = getDiscountedPrice(targetPlan);
                      const is83Off = (appliedCoupon || userPlan?.plan_type === 'trial_15' || userPlan?.plan_type === 'trial_30');
                      const originalOldPrice = targetPlan.oldPrice || targetPlan.price;
                      const savingsAmount = parsePriceToNumber(originalOldPrice) - parsePriceToNumber(dynamicPrice);

                      return (
                        <>
                          <div className="flex justify-between items-center pb-6 border-b border-outline-variant/20">
                            <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.3em]">Total a Liquidar:</span>
                            <span className="text-3xl font-black text-primary font-mono tracking-tighter">{dynamicPrice} Kz</span>
                          </div>

                          {/* Economia e Desconto Expressivo */}
                          {showPaymentModal.id !== 'trial_30' && (
                            <div className="bg-[#00f5a0]/10 border border-[#00f5a0]/30 rounded-2xl p-4 flex flex-col gap-2 text-left">
                              <div className="flex justify-between items-center text-xs font-bold text-on-surface-variant">
                                <span>Preço Normal Original:</span>
                                <span className="line-through font-mono text-white/50">{originalOldPrice} Kz</span>
                              </div>
                              <div className="flex justify-between items-center text-xs font-bold text-on-surface-variant">
                                <span>Desconto Activo:</span>
                                <span className="text-[#00f5a0] font-black">
                                  {is83Off ? '83% OFF' : '33% OFF'}
                                </span>
                              </div>
                              <div className="border-t border-dashed border-[#00f5a0]/20 my-1"></div>
                              <div className="flex justify-between items-center text-sm font-black text-white">
                                <span className="uppercase tracking-wider flex items-center gap-1.5 text-[11px] text-[#00f5a0]">
                                  <PiggyBank className="text-sm" />
                                  Poupança Total:
                                </span>
                                <span className="text-[#00f5a0] font-mono tracking-tight font-black text-base bg-[#00f5a0]/15 px-3 py-1 rounded-xl">
                                  Economiza {formatPrice(savingsAmount)} Kz
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Cupão de Desconto Interativo no Modal */}
                          {showPaymentModal.id !== 'trial_30' && (
                            <div className="border border-outline-variant/10 rounded-2xl p-3 bg-surface-container-low/50">
                              {!showModalCouponInput ? (
                                <button 
                                  type="button"
                                  onClick={() => setShowModalCouponInput(true)}
                                  className="text-[11px] font-black text-primary hover:underline flex items-center gap-1.5 transition-all text-left uppercase tracking-widest"
                                >
                                  <Ticket className="text-sm" />
                                  Tens um cupão ?
                                </button>
                              ) : (
                                <div className="space-y-2.5 animate-in slide-in-from-top-1 duration-200">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest flex items-center gap-1">
                                      <Ticket className="text-xs" />
                                      Código do Cupão
                                    </span>
                                    <button 
                                      type="button" 
                                      onClick={() => {
                                        setShowModalCouponInput(false);
                                        setModalCouponError(null);
                                        setModalCouponSuccessMsg(null);
                                      }}
                                      className="text-[9px] font-black text-rose-400 uppercase tracking-widest hover:underline"
                                    >
                                      Ocultar
                                    </button>
                                  </div>
                                  
                                  <div className="flex gap-2">
                                    <input 
                                      type="text" 
                                      value={modalCouponCode}
                                      onChange={(e) => setModalCouponCode(e.target.value.toUpperCase())}
                                      placeholder="Ex: CPROFIT83%OFF"
                                      className="flex-1 bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-2.5 text-xs font-bold text-on-surface uppercase outline-none focus:border-primary placeholder:text-on-surface-variant/30 font-mono text-white"
                                    />
                                    <button 
                                      type="button"
                                      onClick={async () => {
                                        await handleApplyCouponCode(modalCouponCode, true);
                                      }}
                                      className="bg-primary text-on-primary text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl hover:bg-opacity-90 transition-all shrink-0"
                                    >
                                      Aplicar
                                    </button>
                                  </div>
                                  
                                  {modalCouponSuccessMsg && (
                                    <p className="text-[10px] font-bold text-emerald-400 leading-normal">
                                      {modalCouponSuccessMsg}
                                    </p>
                                  )}
                                  {modalCouponError && (
                                    <p className="text-[10px] font-bold text-rose-400 leading-normal">
                                      {modalCouponError}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      );
                    })()}


                        <div className="pt-2">
                                            {payments.some(p => p.status === 'pending') ? (
                    <div className="flex flex-col gap-2 p-5 bg-error/10 border border-error/20 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="text-error text-xl" />
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
                        
                        <div className="pt-2">
                          <button 
                            onClick={handleRequestPayment}
                            disabled={isSubmitting || payments.some(p => p.status === 'pending')}
                            className="w-full bg-primary text-on-primary py-6 rounded-[24px] font-black hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-primary/30 uppercase tracking-[0.2em] disabled:opacity-40 disabled:hover:scale-100 disabled:active:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-sm"
                          >
                            {isSubmitting ? 'A processar...' : payments.some(p => p.status === 'pending') ? '⚠️ Aguardando Validação' : 'Confirmar Pagamento'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-10 animate-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                  <Check size={48} className="animate-in slide-in-from-bottom-4" />
                </div>
                <h3 className="text-3xl font-black text-on-surface mb-2 font-headline uppercase italic tracking-tighter">Quase <span className="text-emerald-500 italic">Lá!</span></h3>
                
                {(() => {
                  const targetPlan = plans.find(p => p.id === showPaymentModal.id) || showPaymentModal;
                  return (
                    <div className="inline-block px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-6">
                      <p className="text-xs font-black uppercase tracking-wider text-[#00f5a0]">
                        Plano: {targetPlan.name}
                      </p>
                    </div>
                  );
                })()}

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
