import React, { useEffect } from 'react';
import { Zap, Crown, ArrowRight } from 'lucide-react';

interface AdBannerProps {
  isPro?: boolean;
  globalSettings?: any;
  className?: string;
  slotId?: string;
}

export default function AdBanner({ isPro = false, globalSettings, className = '', slotId }: AdBannerProps) {
  // If user is Premium/Pro, never display ads
  if (isPro) return null;

  const adsenseClientId = globalSettings?.adsenseClientId || localStorage.getItem('adsense_client_id');
  const adsenseSlotId = slotId || globalSettings?.adsenseSlotId || localStorage.getItem('adsense_slot_id');

  useEffect(() => {
    if (adsenseClientId && adsenseSlotId) {
      try {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (err) {
        console.warn("[AdSense] Initialization skipped or blocked:", err);
      }
    }
  }, [adsenseClientId, adsenseSlotId]);

  const handleUpgradeClick = () => {
    const customEvent = new CustomEvent('navigateToTab', { detail: 'plans' });
    window.dispatchEvent(customEvent);
  };

  return (
    <div className={`w-full my-4 ${className}`}>
      <div className="w-full bg-gradient-to-r from-surface-container-high/80 via-surface-container/60 to-surface-container-high/80 border border-outline-variant/15 rounded-2xl p-4 shadow-sm relative overflow-hidden group">
        {/* Ad Tag Badge */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-on-surface-variant/60 bg-surface-container-highest/60 px-2 py-0.5 rounded-md">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>Patrocinado • Plano Gratuito</span>
          </div>
          <button 
            onClick={handleUpgradeClick}
            className="text-[10px] font-extrabold text-primary hover:underline flex items-center gap-1 uppercase tracking-wider"
          >
            <Crown className="w-3 h-3 text-amber-400" />
            <span>Remover Anúncios com o Premium</span>
          </button>
        </div>

        {adsenseClientId && adsenseSlotId ? (
          <div className="w-full overflow-hidden flex justify-center items-center min-h-[90px]">
            <ins
              className="adsbygoogle"
              style={{ display: 'block', width: '100%', height: '90px' }}
              data-ad-client={adsenseClientId}
              data-ad-slot={adsenseSlotId}
              data-ad-format="auto"
              data-full-width-responsive="true"
            />
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <Crown className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-white leading-snug">
                  C Profit Premium — Desbloqueie o Máximo Potencial
                </p>
                <p className="text-[11px] text-on-surface-variant leading-tight">
                  Acesse o Panorama Global, Comunidade VIP, Resumos Macroeconômicos e Contas Ilimitadas sem anúncios.
                </p>
              </div>
            </div>
            <button
              onClick={handleUpgradeClick}
              className="w-full sm:w-auto bg-gradient-to-r from-primary to-emerald-400 text-black font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-1.5 shrink-0 uppercase tracking-wider"
            >
              <span>Upgrade para Premium</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
