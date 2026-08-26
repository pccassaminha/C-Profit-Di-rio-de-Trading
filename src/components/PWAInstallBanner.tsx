import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, Check, Share, MoreVertical, Sparkles } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

interface PWAInstallBannerProps {
  compact?: boolean;
}

export default function PWAInstallBanner({ compact = false }: PWAInstallBannerProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [activePlatformTab, setActivePlatformTab] = useState<'android' | 'ios'>('android');

  const recordPWAInstallation = async () => {
    try {
      if (auth.currentUser) {
        await setDoc(doc(db, 'usuarios', auth.currentUser.uid), {
          pwaInstalled: true,
          pwaInstalledAt: new Date().toISOString(),
          pwaPlatform: /iPad|iPhone|iPod/.test(navigator.userAgent) ? 'iOS' : 'Android/Chrome'
        }, { merge: true });
      }
    } catch (e) {
      console.warn('Erro ao registrar instalação PWA:', e);
    }
  };

  useEffect(() => {
    // 1. Check if already installed / running in standalone mode (iOS or Android/Chrome)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone || localStorage.getItem('c_profit_pwa_installed') === 'true') {
      setIsInstalled(true);
      recordPWAInstallation();
      return;
    }

    // 2. Check if previously dismissed in this session
    const dismissed = sessionStorage.getItem('c_profit_pwa_dismissed');
    if (dismissed) {
      setIsDismissed(true);
    }

    // 3. Strict Mobile Detection (Android or iOS) - DO NOT SHOW ON DESKTOP
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    const isAndroidDevice = /android/i.test(userAgent);
    const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isMobileViewport = window.innerWidth <= 768;

    const detectedMobile = isIOSDevice || isAndroidDevice || (hasTouchScreen && isMobileViewport);
    setIsMobile(detectedMobile);

    if (isIOSDevice) {
      setActivePlatformTab('ios');
    } else {
      setActivePlatformTab('android');
    }

    // Capture Chrome beforeinstallprompt event (Mobile)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      localStorage.setItem('c_profit_pwa_installed', 'true');
      recordPWAInstallation();
      setDeferredPrompt(null);
      setShowModal(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
          localStorage.setItem('c_profit_pwa_installed', 'true');
          recordPWAInstallation();
        }
        setDeferredPrompt(null);
      } catch (err) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
    sessionStorage.setItem('c_profit_pwa_dismissed', 'true');
  };

  // Only render on mobile devices, and never if already installed or dismissed
  if (!isMobile || isInstalled || isDismissed) {
    return null;
  }

  return (
    <>
      {/* Floating App Install Trigger (Top Center or Compact) */}
      <aside 
        aria-label="Instalação do Aplicativo C Profit"
        onClick={() => setShowModal(true)}
        className="fixed top-3 left-1/2 -translate-x-1/2 z-50 max-w-[92vw] sm:max-w-md bg-[#0d1425]/95 backdrop-blur-md border border-[#00f5a0]/40 rounded-full px-3.5 py-1.5 shadow-[0_8px_30px_rgba(0,245,160,0.25)] flex items-center justify-between gap-3 cursor-pointer hover:border-[#00f5a0] transition-all group animate-in slide-in-from-top-4 duration-300"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <img 
            src="https://i.postimg.cc/v8qJ6KTk/C-profit.png" 
            alt="C Profit App" 
            className="w-7 h-7 rounded-lg object-cover shadow-sm shrink-0 group-hover:scale-110 transition-transform" 
            loading="eager"
            decoding="async"
          />
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-black text-white flex items-center gap-1.5 leading-tight">
              Instalar App C Profit
              <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-[#00f5a0] animate-ping"></span>
            </span>
            <span className="text-[9px] text-[#00f5a0] font-bold truncate leading-none">
              Acesso rápido no seu telemóvel
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleInstallClick();
            }}
            className="bg-[#00f5a0] hover:bg-[#00f5a0]/80 text-[#022c16] text-[10px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1 transition-all active:scale-95 shadow-sm"
          >
            <Download className="w-3 h-3" />
            <span className="hidden min-[360px]:inline">Instalar</span>
          </button>
          
          <button 
            type="button"
            onClick={handleDismiss}
            className="text-white/40 hover:text-white p-1 transition-colors rounded-full"
            title="Fechar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>

      {/* Simplified & Clean Step-by-Step Install Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0d1425] border border-[#00f5a0]/30 rounded-3xl p-6 max-w-md w-full shadow-2xl relative animate-in zoom-in-95 duration-200 text-white">
            
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <img 
                  src="https://i.postimg.cc/v8qJ6KTk/C-profit.png" 
                  alt="C Profit Logo" 
                  className="w-12 h-12 rounded-2xl object-cover border border-[#00f5a0]/40 shadow-lg shrink-0" 
                  loading="eager"
                  decoding="async"
                />
                <div>
                  <h3 className="text-base font-black text-white font-headline leading-tight">
                    Instalar Aplicativo C Profit
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    Navegue em ecrã total, sem barras de pesquisa e com notificações em tempo real.
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowModal(false)}
                className="text-white/40 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Platform Selector Tabs - Mobile only */}
            <div className="flex rounded-xl bg-surface-container p-1 border border-outline-variant/10 mb-4">
              <button
                type="button"
                onClick={() => setActivePlatformTab('android')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${activePlatformTab === 'android' ? 'bg-[#00f5a0] text-black shadow-md' : 'text-on-surface-variant hover:text-white'}`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                Android / Chrome
              </button>
              <button
                type="button"
                onClick={() => setActivePlatformTab('ios')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${activePlatformTab === 'ios' ? 'bg-[#00f5a0] text-black shadow-md' : 'text-on-surface-variant hover:text-white'}`}
              >
                <Share className="w-3.5 h-3.5" />
                iPhone / Safari
              </button>
            </div>

            {/* Simple Visual Step-by-Step Instructions */}
            <div className="space-y-3 bg-surface-container/50 border border-outline-variant/10 rounded-2xl p-4 mb-5">
              {activePlatformTab === 'android' && (
                <>
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#00f5a0]/20 text-[#00f5a0] font-black text-xs flex items-center justify-center shrink-0">1</span>
                    <p className="text-xs text-on-surface leading-snug">
                      Toque nos <strong>3 pontinhos</strong> <MoreVertical className="inline w-3.5 h-3.5 text-[#00f5a0]" /> no canto superior direito do seu navegador Chrome.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#00f5a0]/20 text-[#00f5a0] font-black text-xs flex items-center justify-center shrink-0">2</span>
                    <p className="text-xs text-on-surface leading-snug">
                      Toque em <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar ao ecrã inicial"</strong>.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#00f5a0]/20 text-[#00f5a0] font-black text-xs flex items-center justify-center shrink-0">3</span>
                    <p className="text-xs text-on-surface leading-snug">
                      Confirme em <strong>"Instalar"</strong>. O ícone oficial aparecerá no seu ecrã!
                    </p>
                  </div>
                </>
              )}

              {activePlatformTab === 'ios' && (
                <>
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#00f5a0]/20 text-[#00f5a0] font-black text-xs flex items-center justify-center shrink-0">1</span>
                    <p className="text-xs text-on-surface leading-snug">
                      Abra o <strong>Safari</strong> e toque no botão <strong>Partilhar</strong> <Share className="inline w-3.5 h-3.5 text-[#00f5a0]" /> na barra inferior.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#00f5a0]/20 text-[#00f5a0] font-black text-xs flex items-center justify-center shrink-0">2</span>
                    <p className="text-xs text-on-surface leading-snug">
                      Role para baixo e selecione <strong>"Ecrã Principal"</strong> (Adicionar ao Ecrã Principal).
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#00f5a0]/20 text-[#00f5a0] font-black text-xs flex items-center justify-center shrink-0">3</span>
                    <p className="text-xs text-on-surface leading-snug">
                      Toque em <strong>"Adicionar"</strong> no topo direito. Pronto!
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Direct Action Button if browser prompt is available */}
            {deferredPrompt && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full bg-[#00f5a0] hover:bg-[#00f5a0]/90 text-black py-3.5 rounded-2xl font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#00f5a0]/20 active:scale-95 transition-all mb-2"
              >
                <Download className="w-4 h-4" />
                Instalar Agora com 1 Clique
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="w-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-white py-2.5 rounded-xl font-bold text-xs transition-colors text-center"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
