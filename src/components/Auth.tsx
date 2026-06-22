import React, { useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  Wallet, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  AlertCircle,
  LineChart,
  Target,
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  Phone
} from 'lucide-react';

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

interface AuthProps {
  onSuccess: (isNewUser?: boolean) => void;
  initialMode?: 'login' | 'register';
  initialPlan?: string;
}

const getFriendlyErrorMessage = (err: any) => {
  if (!err) return 'Erro desconhecido.';
  const code = err.code || '';
  if (code === 'auth/email-already-in-use') return 'Este e-mail já está em uso. Por favor, faça login ou use outro e-mail.';
  if (code === 'auth/invalid-email') return 'E-mail inválido.';
  if (code === 'auth/user-not-found' || code === 'auth/invalid-credential' || code === 'auth/wrong-password') return 'Credenciais incorretas (usuário ou senha).';
  if (code === 'auth/network-request-failed') return 'Falha na conexão de rede. Verifique sua internet ou tente novamente mais tarde.';
  if (code === 'auth/too-many-requests') return 'Muitas tentativas falhas. Tente novamente mais tarde.';
  return err.message || 'Erro durante a autenticação.';
};

export default function Auth({ onSuccess, initialMode = 'login', initialPlan = 'mensal_6' }: AuthProps) {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneDialCode, setPhoneDialCode] = useState('+244');
  const [phoneLocal, setPhoneLocal] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(initialPlan);
  const [couponCode, setCouponCode] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponFeedback, setCouponFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialPlan) {
      setSelectedPlan(initialPlan);
    }
  }, [initialPlan]);

  const BASE_PLANS = [
    { id: 'trial_30', name: 'Teste (30 Dias)', rawPrice: 500, defaultTag: 'Grátis c/ Convite', defaultPrice: '500 Kz', oldPrice: 500 },
    { id: 'mensal_6', name: 'Plano Mensal', rawPrice: 5000, defaultTag: 'Básico', defaultPrice: '5.000 Kz', oldPrice: 7500 },
    { id: 'trimestral_6', name: 'Trimestral', rawPrice: 15000, defaultTag: '-33% OFF', defaultPrice: '15.000 Kz', oldPrice: 22500 },
    { id: 'semestral_8', name: 'Semestral', rawPrice: 30000, defaultTag: 'Best Choice', defaultPrice: '30.000 Kz', oldPrice: 45000 },
    { id: 'anual_16', name: 'Anual', rawPrice: 60000, defaultTag: 'Premium', defaultPrice: '60.000 Kz', oldPrice: 90000 }
  ];

  const REGISTRATION_PLANS = BASE_PLANS.map(plan => {
    let finalPriceNum = plan.rawPrice;
    let tag = plan.defaultTag;

    let hasCouponApplied = false;
    if (appliedCoupon && plan.rawPrice >= 5000) {
      if (appliedCoupon.targetPlan === 'all' || appliedCoupon.targetPlan === plan.id) {
        hasCouponApplied = true;
        if (appliedCoupon.discountType === 'percentage') {
          finalPriceNum = plan.rawPrice - (plan.rawPrice * (appliedCoupon.discountValue / 100));
        } else if (appliedCoupon.discountType === 'fixed') {
          finalPriceNum = plan.rawPrice - appliedCoupon.discountValue;
        }
        
        if (finalPriceNum < 0) finalPriceNum = 0;
        
        if (appliedCoupon.code === 'CPROFIT83%OFF') {
          tag = '-83% SUPERCUPOM';
        } else if (appliedCoupon.discountType === 'percentage') {
          tag = `-${appliedCoupon.discountValue}% OFF`;
        } else if (appliedCoupon.discountType === 'fixed') {
          tag = `-${appliedCoupon.discountValue} Kz`;
        }
      }
    }

    return {
      ...plan,
      price: finalPriceNum === plan.rawPrice ? plan.defaultPrice : `${finalPriceNum.toLocaleString('pt-BR')} Kz`,
      tag,
      hasDiscount: hasCouponApplied,
      originalStr: hasCouponApplied ? `${plan.oldPrice.toLocaleString('pt-BR')} Kz` : plan.defaultPrice,
      savings: hasCouponApplied ? (plan.oldPrice - finalPriceNum) : undefined
    };
  });

  useEffect(() => {
    setPhoneNumber(phoneDialCode + phoneLocal.replace(/\D/g, ''));
  }, [phoneDialCode, phoneLocal]);

  useEffect(() => {
    if (!isLogin) {
      const storedRef = localStorage.getItem('referredBy');
      if (storedRef) {
        setCouponCode(storedRef.toUpperCase());
      }
    }
  }, [isLogin]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      const loggedInEmail = result.user.email?.trim().toLowerCase();
      let partnerDetected = false;
      if (loggedInEmail) {
        const qPartner = query(
          collection(db, 'usuarios'),
          where('partnerEmail', '==', loggedInEmail)
        );
        const partnerSnap = await getDocs(qPartner);
        if (!partnerSnap.empty) {
          partnerDetected = true;
          const parentDoc = partnerSnap.docs[0];
          const parentUid = parentDoc.id;
          const parentData = parentDoc.data();

          // Store partner mode variables in localStorage
          localStorage.setItem('partnerModeActive', 'true');
          localStorage.setItem('partnerMainUserUid', parentUid);
          localStorage.setItem('partnerMainUserEmail', parentData.email || '');
          localStorage.setItem('partnerMainUserDisplayName', (parentData.nome || parentData.name || 'Maestro') + ' (Parceiro)');
          localStorage.setItem('partnerMainUserPhotoURL', parentData.photoURL || '');
          console.log("[Partner Google Logged] Partner mode ready for parent UID:", parentUid);
        } else {
          // Standard Google login - make sure partner mode is cleared
          localStorage.removeItem('partnerModeActive');
          localStorage.removeItem('partnerMainUserUid');
          localStorage.removeItem('partnerMainUserEmail');
          localStorage.removeItem('partnerMainUserDisplayName');
          localStorage.removeItem('partnerMainUserPhotoURL');
        }
      }

      const userRef = doc(db, 'usuarios', result.user.uid);
      const userDoc = await getDoc(userRef);
      
      const isNewUser = !userDoc.exists();
      
      if (isNewUser) {
        const referredBy = localStorage.getItem('referredBy') || null;
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);

        // Resolve referredBy if it is a short refCode or UID
        let finalReferredUid: string | null = null;
        if (referredBy) {
          const cleanRef = referredBy.trim().toUpperCase();
          const qUserRef = query(collection(db, 'usuarios'), where('refCode', '==', cleanRef));
          const userRefSnap = await getDocs(qUserRef);
          if (!userRefSnap.empty) {
            finalReferredUid = userRefSnap.docs[0].id;
          } else {
            const directDoc = await getDoc(doc(db, 'usuarios', referredBy));
            if (directDoc.exists()) {
              finalReferredUid = directDoc.id;
            }
          }
        }

        const isTrialQualified = !!(finalReferredUid || referredBy);
        const resolvedPlanType = 'Iniciante';
        const resolvedExpiryDate = new Date().toISOString();

        const googleDisplayName = result.user.displayName || 'Usuário Google';
        const parts = googleDisplayName.trim().split(' ');
        const googleFirstName = parts[0] || '';
        const googleLastName = parts.slice(1).join(' ') || '';

        // Create initial profile for Google user with Iniciante status
        await setDoc(userRef, {
          nome: googleDisplayName,
          firstName: googleFirstName,
          lastName: googleLastName,
          email: result.user.email,
          createdAt: new Date().toISOString(),
          plan_type: resolvedPlanType,
          intendedPlan: selectedPlan,
          expiry_date: resolvedExpiryDate,
          account_limit: 2,
          role: 'user',
          refCode: result.user.uid.substring(0, 6).toUpperCase(),
          referredBy: finalReferredUid || referredBy,
          affiliateBalance: 0
        });

        // Register referral if referred
        if (isTrialQualified) {
          await addDoc(collection(db, 'referrals'), {
            referrerId: finalReferredUid || referredBy,
            referredId: result.user.uid,
            referredName: result.user.displayName || 'Usuário Google',
            referredEmail: result.user.email || '',
            referredPlan: 'trial_30',
            paymentAmount: 0,
            rewardType: 'free_month',
            rewardValue: '1_month_free_progress',
            status: 'approved',
            createdAt: new Date().toISOString()
          });
        }
        onSuccess(true); // new user
      } else {
        onSuccess(false); // existing user
      }
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Por favor, insira seu e-mail para redefinir a senha.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponFeedback(null);
      setAppliedCoupon(null);
      return;
    }
    setIsApplyingCoupon(true);
    setCouponFeedback(null);
    setAppliedCoupon(null);
    try {
      const uppercaseCode = couponCode.trim().toUpperCase();

      // 1. Check if it's a promotional coupon
      const qCoupons = query(collection(db, 'coupons'), where('code', '==', uppercaseCode));
      const couponSnap = await getDocs(qCoupons);
      
      if (!couponSnap.empty) {
        const couponDoc = couponSnap.docs[0].data();
        if (couponDoc.active) {
          setAppliedCoupon({ id: couponSnap.docs[0].id, ...couponDoc });
          setCouponFeedback({ type: 'success', message: `Cupom ${couponDoc.discountValue}${couponDoc.discountType === 'percentage' ? '%' : 'Kz'} aplicado!` });
          return;
        } else {
          setCouponFeedback({ type: 'error', message: 'Cupom de desconto inativo.' });
          return;
        }
      } else if (uppercaseCode === 'CPROFIT83%OFF') {
        setAppliedCoupon({
          id: 'descontode83_static',
          code: 'CPROFIT83%OFF',
          active: true,
          discountType: 'percentage',
          discountValue: 50,
          targetPlan: 'all'
        });
        setCouponFeedback({ type: 'success', message: 'Cupom 83% OFF aplicado com sucesso!' });
        return;
      }

      // 2. Check if it's a referral code
      const qRef = query(collection(db, 'usuarios'), where('refCode', '==', uppercaseCode));
      const userRefSnap = await getDocs(qRef);
      
      if (!userRefSnap.empty) {
        setCouponFeedback({ type: 'success', message: 'Código de convite válido!' });
        return;
      } else {
        const parentUserDoc = await getDoc(doc(db, 'usuarios', couponCode.trim()));
        if (parentUserDoc.exists()) {
          setCouponFeedback({ type: 'success', message: 'Código de indicação válido!' });
          return;
        }
      }

      setCouponFeedback({ type: 'error', message: 'Cupom ou código inválido.' });
    } catch (err) {
      console.error(err);
      setCouponFeedback({ type: 'error', message: 'Erro ao validar.' });
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isLogin && !isForgotPassword && password !== confirmPassword) {
      setError('As senhas não coincidem. Por favor, verifique.');
      return;
    }

    setLoading(true);

    try {
      let validCoupon: any = null;
      let solvedReferredUid: string | null = null;

      if (isLogin) {
        let partnerDetected = false;
        try {
          const qPartner = query(
            collection(db, 'usuarios'),
            where('partnerEmail', '==', email.trim().toLowerCase()),
            where('partnerPassword', '==', password.trim())
          );
          const partnerSnap = await getDocs(qPartner);

          if (!partnerSnap.empty) {
            partnerDetected = true;
            const parentDoc = partnerSnap.docs[0];
            const parentUid = parentDoc.id;
            const parentData = parentDoc.data();

            // Store partner mode variables in localStorage
            localStorage.setItem('partnerModeActive', 'true');
            localStorage.setItem('partnerMainUserUid', parentUid);
            localStorage.setItem('partnerMainUserEmail', parentData.email || '');
            localStorage.setItem('partnerMainUserDisplayName', (parentData.nome || parentData.name || 'Maestro') + ' (Parceiro)');
            localStorage.setItem('partnerMainUserPhotoURL', parentData.photoURL || '');
            console.log("[Partner Logged] Partner mode ready for parent UID:", parentUid);
          } else {
            // Standard user sign in
            localStorage.removeItem('partnerModeActive');
            localStorage.removeItem('partnerMainUserUid');
            localStorage.removeItem('partnerMainUserEmail');
            localStorage.removeItem('partnerMainUserDisplayName');
            localStorage.removeItem('partnerMainUserPhotoURL');
          }
        } catch (partnerErr: any) {
          if (partnerErr.code !== 'permission-denied') {
            console.warn("Partner log lookup failed under submissive flow:", partnerErr);
          }
        }

        try {
          await signInWithEmailAndPassword(auth, email, password);
        } catch (loginErr: any) {
          if (partnerDetected && (loginErr.code === 'auth/user-not-found' || loginErr.code === 'auth/invalid-credential')) {
            try {
              const { createUserWithEmailAndPassword: createAuthUser } = await import('firebase/auth');
              await createAuthUser(auth, email, password);
            } catch (createErr) {
              throw loginErr;
            }
          } else {
            throw loginErr;
          }
        }
        
        onSuccess(false); // existing user
      } else {
        // Create the user in Firebase Auth FIRST! This immediately authenticates the session
        // and allows the coupon and referral resolution queries to execute without permission errors.
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const fullName = `${firstName.trim()} ${lastName.trim()}`;
        if (fullName) {
          try {
            await updateProfile(result.user, { displayName: fullName });
          } catch (profileErr) {
            console.error('Erro ao atualizar nome de exibição:', profileErr);
          }
        }

        if (couponCode.trim() !== '') {
          const uppercaseCode = couponCode.trim().toUpperCase();

          // 1. Check if it's a promotional coupon (Maestro coupon)
          const qCoupons = query(collection(db, 'coupons'), where('code', '==', uppercaseCode));
          const couponSnap = await getDocs(qCoupons);
          
          if (!couponSnap.empty) {
            const couponDoc = couponSnap.docs[0].data();
            if (couponDoc.active) {
              validCoupon = { id: couponSnap.docs[0].id, ...couponDoc };
            } else {
              console.warn('Cupom de desconto inativo.');
            }
          } else if (uppercaseCode === 'CPROFIT83%OFF') {
            // Fallback if coupon collection is not synced or loaded yet
            validCoupon = {
              id: 'descontode83_static',
              code: 'CPROFIT83%OFF',
              discountType: 'percentage',
              discountValue: 50,
              targetPlan: 'all',
              partnerRef: 'Plataforma',
              active: true
            };
          } else {
            // 2. See if it matches a user's reference code (refCode)
            const qUserRef = query(collection(db, 'usuarios'), where('refCode', '==', uppercaseCode));
            const userRefSnap = await getDocs(qUserRef);
            
            if (!userRefSnap.empty) {
              solvedReferredUid = userRefSnap.docs[0].id; // The UID of the parent referrer user
            } else {
              // Check if they directly pasted a full UID as code
              const parentUserDoc = await getDoc(doc(db, 'usuarios', couponCode.trim()));
              if (parentUserDoc.exists()) {
                solvedReferredUid = parentUserDoc.id;
              } else {
                console.warn('Cupom ou código de indicação inexistente ou inativo.');
              }
            }
          }
        }
        
        const referredBy = localStorage.getItem('referredBy') || null;
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);

        let finalReferredUid: string | null = null;
        if (solvedReferredUid) {
          finalReferredUid = solvedReferredUid;
        } else if (referredBy) {
          const cleanRef = referredBy.trim().toUpperCase();
          const qUserRef = query(collection(db, 'usuarios'), where('refCode', '==', cleanRef));
          const userRefSnap = await getDocs(qUserRef);
          if (!userRefSnap.empty) {
            finalReferredUid = userRefSnap.docs[0].id;
          } else {
            const directDoc = await getDoc(doc(db, 'usuarios', referredBy));
            if (directDoc.exists()) {
              finalReferredUid = directDoc.id;
            }
          }
        }

        const isTrialQualified = !!(finalReferredUid || referredBy);
        const resolvedPlanType = 'Iniciante';
        const resolvedExpiryDate = new Date().toISOString();

        const newUserData: any = {
          nome: fullName,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email,
          phoneNumber: phoneNumber,
          createdAt: new Date().toISOString(),
          plan_type: resolvedPlanType,
          intendedPlan: selectedPlan,
          expiry_date: resolvedExpiryDate,
          account_limit: 2,
          role: 'user',
          refCode: result.user.uid.substring(0, 6).toUpperCase(),
          referredBy: finalReferredUid || referredBy,
          affiliateBalance: 0
        };

        if (validCoupon) {
          newUserData.usedCoupon = validCoupon.code;
          if (validCoupon.partnerRef) {
            newUserData.partnerRef = validCoupon.partnerRef;
          }
        }

        await setDoc(doc(db, 'usuarios', result.user.uid), newUserData);

        // Register referral if referred
        if (isTrialQualified) {
          await addDoc(collection(db, 'referrals'), {
            referrerId: finalReferredUid || referredBy,
            referredId: result.user.uid,
            referredName: fullName || 'Novo Trader',
            referredEmail: email,
            referredPlan: 'trial_30',
            paymentAmount: 0,
            rewardType: 'free_month',
            rewardValue: '1_month_free_progress',
            status: 'approved',
            createdAt: new Date().toISOString()
          });
        }
        onSuccess(true); // new user
      }
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1326] flex flex-col lg:flex-row overflow-hidden font-body text-white">
      {/* Lado Esquerdo: Ilustrações e Copy */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary/10 to-background p-16 flex-col justify-between overflow-hidden">
        {/* Background Decor */}
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[100px]"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-[16px] mb-12">
            <button onClick={() => window.location.href = '/'} className="cursor-pointer hover:opacity-90 transition-opacity bg-transparent border-none p-0 outline-none flex items-center gap-[16px]">
              <img src="https://i.postimg.cc/v8qJ6KTk/C-profit.png" alt="C Logo" className="h-[44px] drop-shadow-md rounded-[8px]" />
              <span className="font-headline text-[26px] font-extrabold text-on-surface tracking-tight uppercase">Profit</span>
            </button>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            <h2 className="text-6xl font-black text-on-surface leading-[0.95] tracking-tighter max-w-lg uppercase italic text-white">
              TRANSFORME SEUS <span className="text-primary not-italic">INSIGHTS</span> EM RESULTADOS.
            </h2>
            <p className="text-on-surface-variant text-xl max-w-md font-medium leading-relaxed opacity-70">
              O terminal definitivo para traders profissionais. Monitore, analise e escale suas operações com inteligência de dados.
            </p>
          </motion.div>
        </div>

        {/* Feature List */}
        <div className="relative z-10 grid grid-cols-2 gap-8">
          <div className="flex flex-col gap-3">
             <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-primary border border-white/10">
                <TrendingUp size={20} />
             </div>
             <h4 className="font-bold text-on-surface font-headline uppercase text-xs tracking-widest italic">Trade Journaling</h4>
             <p className="text-on-surface-variant text-xs leading-relaxed opacity-60">Registro detalhado de cada operação com capturas de tela.</p>
          </div>
          <div className="flex flex-col gap-3">
             <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-secondary border border-white/10">
                <Wallet size={20} />
             </div>
             <h4 className="font-bold text-on-surface font-headline uppercase text-xs tracking-widest italic">Profit Tracking</h4>
             <p className="text-on-surface-variant text-xs leading-relaxed opacity-60">Cálculos automáticos de ROI, Winrate e Drawdown.</p>
          </div>
        </div>

        {/* Bottom pattern */}
        <div className="absolute bottom-0 right-0 p-8 opacity-20 pointer-events-none">
           <div className="flex gap-2 items-end">
              {[40, 70, 50, 90, 60, 100, 80].map((h, i) => (
                <div key={i} className="w-4 bg-primary rounded-t-sm" style={{ height: h }}></div>
              ))}
           </div>
        </div>
      </div>

      {/* Lado Direito: Formulário */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative overflow-y-auto bg-background">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md space-y-8"
        >
          <div className="text-center lg:text-left">
            <h3 className="text-3xl font-black text-on-surface font-headline uppercase italic tracking-tighter text-white">
              {isForgotPassword ? 'Redefinir Senha' : (isLogin ? 'Bem-vindo de volta' : 'Crie sua conta')}
            </h3>
            <p className="text-on-surface-variant mt-2 opacity-70">
              {isForgotPassword 
                ? (resetSent ? 'Instruções enviadas para o seu e-mail.' : 'Enviaremos um link para você recuperar sua conta.')
                : (isLogin ? 'Continue sua jornada rumo à consistência.' : 'Comece hoje mesmo a monitorar sua performance.')}
            </p>
          </div>

          {error && (
            <div className="bg-error/10 border border-error/20 p-4 rounded-xl flex items-center gap-3 text-error text-sm font-bold">
              <AlertTriangle size={18} />
              {error}
            </div>
          )}

          {isForgotPassword && resetSent ? (
            <button 
              type="button"
              onClick={() => {
                setIsForgotPassword(false);
                setResetSent(false);
              }}
              className="w-full bg-primary text-on-primary py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-sm mt-8"
            >
              Voltar para o Login
            </button>
          ) : (
            <form onSubmit={isForgotPassword ? handleForgotPassword : handleSubmit} className="space-y-5">
              <AnimatePresence mode="wait">
                {!isLogin && !isForgotPassword && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-hidden"
                  >
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant ml-1 font-mono opacity-50">Primeiro Nome</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-40" size={20} />
                        <input 
                          type="text" 
                          required
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="Ex: João"
                          className="w-full bg-surface-container border border-outline-variant/10 rounded-2xl pl-12 pr-6 py-4 text-on-surface outline-none focus:border-primary transition-all font-bold placeholder:text-on-surface-variant/30 text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant ml-1 font-mono opacity-50">Sobrenome</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-40" size={20} />
                        <input 
                          type="text" 
                          required
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Ex: Silva"
                          className="w-full bg-surface-container border border-outline-variant/10 rounded-2xl pl-12 pr-6 py-4 text-on-surface outline-none focus:border-primary transition-all font-bold placeholder:text-on-surface-variant/30 text-sm"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {!isLogin && !isForgotPassword && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant ml-1 font-mono opacity-50 block">Número de Telefone</label>
                    <div className="flex gap-2">
                      <div className="relative shrink-0">
                        <select 
                          value={phoneDialCode}
                          onChange={(e) => setPhoneDialCode(e.target.value)}
                          className="bg-surface-container border border-outline-variant/10 rounded-2xl pl-4 pr-9 py-4 text-xs font-black text-on-surface outline-none focus:border-primary transition-all appearance-none cursor-pointer h-full"
                        >
                          {COUNTRIES.map(c => (
                            <option key={c.code} value={c.dialCode}>{c.flag} {c.label}</option>
                          ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[8px]">▼</div>
                      </div>

                      <div className="relative flex-1">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-40" size={18} />
                        <input 
                          type="tel" 
                          required={!isLogin}
                          value={phoneLocal}
                          onChange={(e) => setPhoneLocal(e.target.value)}
                          placeholder="Ex: 923 000 000"
                          className="w-full bg-surface-container border border-outline-variant/10 rounded-2xl pl-12 pr-6 py-4 text-on-surface outline-none focus:border-primary transition-all font-bold placeholder:text-on-surface-variant/30 font-mono"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {!isLogin && !isForgotPassword && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant ml-1 font-mono opacity-50">Código de Convite / Cupom</label>
                    <div className="relative">
                      <Target className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-40" size={20} />
                      <input 
                        type="text" 
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="Ex: Código de amigo ou cupom (Opcional)"
                        className="w-full bg-surface-container border border-outline-variant/10 rounded-2xl pl-12 pr-28 py-4 text-on-surface outline-none focus:border-primary transition-all font-bold placeholder:text-on-surface-variant/30 uppercase text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={!couponCode.trim() || isApplyingCoupon}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-surface-container-high border border-outline-variant/20 text-on-surface px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-surface-container-highest transition-colors disabled:opacity-50"
                      >
                        {isApplyingCoupon ? '...' : 'Aplicar'}
                      </button>
                    </div>
                    {couponFeedback && (
                      <div className={`text-xs font-bold pl-2 ${couponFeedback.type === 'success' ? 'text-primary' : 'text-rose-500'}`}>
                        {couponFeedback.message}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>



              <AnimatePresence mode="wait">
                {!isLogin && !isForgotPassword && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 overflow-hidden pb-2 pt-2"
                  >
                    <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant ml-1 font-mono opacity-50 block">Escolha o seu Plano</label>
                    <div className="grid grid-cols-2 gap-2">
                       {REGISTRATION_PLANS.map(plan => (
                         <button
                           key={plan.id}
                           type="button"
                           onClick={() => setSelectedPlan(plan.id)}
                           className={`relative border rounded-xl p-3 text-left transition-all flex flex-col items-start gap-1 ${
                             selectedPlan === plan.id 
                               ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(0,245,160,0.15)] shadow-primary/10' 
                               : 'border-outline-variant/10 bg-surface-container hover:bg-surface-container-high'
                           }`}
                         >
                            {plan.tag && (
                                <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-[4px] absolute -top-2 right-2 border ${
                                  selectedPlan === plan.id 
                                    ? 'bg-primary text-background border-primary' 
                                    : 'bg-surface-container-high text-on-surface-variant border-outline-variant/30'
                                }`}>
                                  {plan.tag}
                                </span>
                            )}
                            <div className="flex flex-col w-full mt-1">
                               <span className={`text-[10px] font-black tracking-widest uppercase ${selectedPlan === plan.id ? 'text-primary' : 'text-on-surface'}`}>
                                 {plan.name}
                               </span>
                               <span className={`text-xs font-bold font-mono mt-0.5 ${selectedPlan === plan.id ? 'text-white' : 'text-on-surface-variant/70'}`}>
                                 {plan.hasDiscount ? (
                                   <div className="flex flex-col gap-0 items-start">
                                     <span className="line-through text-[9px] opacity-60 font-medium">{plan.originalStr}</span>
                                     <span className={`${selectedPlan === plan.id ? 'text-white' : 'text-[#00f5a0]'}`}>{plan.price}</span>
                                   </div>
                                 ) : (
                                   <span>{plan.price}</span>
                                 )}
                               </span>
                               {plan.savings && plan.savings > 0 ? (
                                  <div className="mt-1.5 text-[8px] font-bold text-[#00f5a0] bg-[#00f5a0]/10 border border-[#00f5a0]/20 px-1.5 py-0.5 rounded shadow-sm self-start uppercase">
                                    Poupa {(plan.savings || 0).toLocaleString('pt-BR')} Kz
                                  </div>
                               ) : null}
                            </div>
                         </button>
                       ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant ml-1 font-mono opacity-50">E-mail Profissional</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-40" size={20} />
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full bg-surface-container border border-outline-variant/10 rounded-2xl pl-12 pr-6 py-4 text-on-surface outline-none focus:border-primary transition-all font-bold placeholder:text-on-surface-variant/30"
                  />
                </div>
              </div>

              {!isForgotPassword && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant font-mono opacity-50">Sua Senha</label>
                    {isLogin && (
                      <button 
                        type="button"
                        onClick={() => setIsForgotPassword(true)}
                        className="text-[10px] text-primary font-black uppercase tracking-widest hover:underline focus:outline-none"
                      >
                        Esqueci a Senha
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-40" size={20} />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-surface-container border border-outline-variant/10 rounded-2xl pl-12 pr-14 py-4 text-on-surface outline-none focus:border-primary transition-all font-bold placeholder:text-on-surface-variant/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
              )}

              <AnimatePresence mode="wait">
                {!isLogin && !isForgotPassword && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant ml-1 font-mono opacity-50">Confirmar Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-40" size={20} />
                      <input 
                        type={showConfirmPassword ? "text" : "password"} 
                        required={!isLogin}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-surface-container border border-outline-variant/10 rounded-2xl pl-12 pr-14 py-4 text-on-surface outline-none focus:border-primary transition-all font-bold placeholder:text-on-surface-variant/30"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors focus:outline-none"
                      >
                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-on-primary py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3 text-sm mt-8"
              >
                {loading ? 'Aguarde...' : (isForgotPassword ? 'Enviar Link de Recuperação' : (isLogin ? 'Entrar no Terminal' : 'Criar minha Conta'))}
                <ArrowRight size={20} />
              </button>

              {isForgotPassword && (
                <button 
                  type="button"
                  onClick={() => setIsForgotPassword(false)}
                  className="w-full text-xs text-on-surface-variant font-black uppercase tracking-widest hover:text-primary transition-colors py-2"
                >
                  Voltar para o Login
                </button>
              )}
            </form>
          )}

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-outline-variant/20 opacity-30"></div></div>
            <div className="relative flex justify-center text-xs uppercase tracking-[0.3em]"><span className="bg-background px-4 text-on-surface-variant font-black opacity-50">Ou continue com</span></div>
          </div>

          <button 
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-surface-container-high border border-outline-variant/20 text-on-surface py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 text-xs hover:bg-surface-container transition-all"
          >
            <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
               <svg viewBox="0 0 24 24" width="16" height="16"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            </div>
            Entrar com Google
          </button>

          <p className="text-center text-sm text-on-surface-variant font-medium">
            {isForgotPassword ? '' : (isLogin ? 'Não possui uma conta?' : 'Já possui uma conta?')}
            {!isForgotPassword && (
              <button 
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="ml-2 text-primary font-black uppercase tracking-widest text-xs hover:underline"
              >
                {isLogin ? 'Cadastrar-se' : 'Fazer Login'}
              </button>
            )}
          </p>
        </motion.div>
      </div>

      <div className="absolute top-10 right-[25%] pointer-events-none opacity-20 hidden xl:block">
         <motion.div animate={{ y: [0, -20, 0] }} transition={{ repeat: Infinity, duration: 4 }} className="flex items-center gap-2 bg-secondary/10 p-3 rounded-xl border border-secondary/20">
           <div className="w-8 h-8 rounded bg-secondary/20 flex items-center justify-center text-secondary">
             <CheckCircle size={16} />
           </div>
           <span className="text-[10px] font-black uppercase tracking-widest text-secondary">Aporte Confirmado</span>
         </motion.div>
      </div>
    </div>
  );
}
