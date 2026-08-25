import React, { useEffect, useMemo } from 'react';
import { Zap, Crown, ArrowRight, Sparkles, TrendingUp } from 'lucide-react';

interface AdBannerProps {
  isPro?: boolean;
  globalSettings?: any;
  className?: string;
  slotId?: string;
  adKey?: string;
  width?: number;
  height?: number;
  variant?: 'leaderboard' | 'card' | 'compact' | 'feed-card' | 'sidebar';
  title?: string;
  subtitle?: string;
}

export default function AdBanner({ 
  isPro = false, 
  globalSettings, 
  className = '', 
  slotId, 
  adKey, 
  width, 
  height,
  variant = 'leaderboard',
  title,
  subtitle
}: AdBannerProps) {
  // If user is Premium/Pro, never display ads
  if (isPro) return null;

  const enableAdsForFree = globalSettings?.enableAdsForFree !== false;
  
  const adProvider = globalSettings?.adProvider || (globalSettings?.adsterraKey || globalSettings?.adsterraScriptCode ? 'adsterra' : (globalSettings?.adsenseClientId ? 'adsense' : 'auto'));

  const adsterraKey = adKey || globalSettings?.adsterraKey || localStorage.getItem('adsterra_key') || '8e59cc5ff459e7164b9ffa94d698ca18';
  const adsterraScriptCode = globalSettings?.adsterraScriptCode || localStorage.getItem('adsterra_script_code') || '';
  const adsterraIframeUrl = globalSettings?.adsterraIframeUrl || localStorage.getItem('adsterra_iframe_url') || '';

  const adsenseClientId = globalSettings?.adsenseClientId || localStorage.getItem('adsense_client_id');
  const adsenseSlotId = slotId || globalSettings?.adsenseSlotId || localStorage.getItem('adsense_slot_id');

  const defaultWidth = variant === 'card' || variant === 'feed-card' ? 300 : (adKey === '5cba24c0ad586b33f4097be71bbaadb0' ? 468 : 728);
  const defaultHeight = variant === 'card' || variant === 'feed-card' ? 250 : (adKey === '5cba24c0ad586b33f4097be71bbaadb0' ? 60 : 90);

  const bannerWidth = width || defaultWidth;
  const bannerHeight = height || defaultHeight;

  useEffect(() => {
    if (enableAdsForFree && (adProvider === 'adsense' || adProvider === 'auto') && adsenseClientId && adsenseSlotId) {
      try {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (err) {
        console.warn("[AdSense] Initialization skipped or blocked:", err);
      }
    }
  }, [enableAdsForFree, adProvider, adsenseClientId, adsenseSlotId]);

  const handleUpgradeClick = () => {
    const customEvent = new CustomEvent('navigateToTab', { detail: 'plans' });
    window.dispatchEvent(customEvent);
  };

  const adsterraHtml = useMemo(() => {
    if (!enableAdsForFree) return null;
    if (adsterraIframeUrl) return null;

    if (adsterraScriptCode) {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; background: transparent; overflow: hidden; height: 100vh; }
  </style>
</head>
<body>
  ${adsterraScriptCode}
</body>
</html>`;
    }

    if (adsterraKey) {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; background: transparent; overflow: hidden; height: 100vh; }
  </style>
</head>
<body>
  <script type="text/javascript">
    atOptions = {
      'key': '${adsterraKey.trim()}',
      'format': 'iframe',
      'height': ${bannerHeight},
      'width': ${bannerWidth},
      'params': {}
    };
  </script>
  <script type="text/javascript" src="https://www.highperformanceformat.com/${adsterraKey.trim()}/invoke.js"></script>
</body>
</html>`;
    }

    return null;
  }, [enableAdsForFree, adsterraScriptCode, adsterraKey, adsterraIframeUrl, bannerWidth, bannerHeight]);

  const hasAdsterra = enableAdsForFree && (adsterraIframeUrl || adsterraHtml);
  const hasAdsense = enableAdsForFree && adsenseClientId && adsenseSlotId;

  // Render variant: COMPACT / INLINE STRIP
  if (variant === 'compact') {
    return (
      <div className={`w-full my-3 ${className}`}>
        <div className="bg-surface-container-high/90 border border-primary/20 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 bg-amber-500/15 text-amber-400 font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded">
              <Zap className="w-3 h-3" /> Patrocinado
            </span>
            <span className="text-on-surface-variant font-medium text-[11px]">
              {title || 'Utilize a plataforma sem anúncios e com até 16 contas simultâneas'}
            </span>
          </div>
          <button
            onClick={handleUpgradeClick}
            className="shrink-0 bg-primary/15 hover:bg-primary text-primary hover:text-black font-black text-[10px] uppercase px-3 py-1 rounded-lg border border-primary/30 transition-all flex items-center gap-1"
          >
            <Crown className="w-3 h-3" />
            <span>Remover Anúncios</span>
          </button>
        </div>
      </div>
    );
  }

  // Render variant: FEED-CARD (Social / Community Stream)
  if (variant === 'feed-card') {
    return (
      <div className={`w-full bg-gradient-to-br from-surface-container-high via-surface-container to-surface-container-high border-2 border-primary/25 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden my-6 ${className}`}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary/30 to-amber-400/30 border border-primary/40 flex items-center justify-center text-primary font-black shadow-md">
              <Sparkles className="w-5 h-5 text-[#00f5a0]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white uppercase tracking-wider">Patrocinador Oficial • C Profit</span>
                <span className="bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[8px] font-black uppercase px-1.5 py-0.5 rounded">Ad</span>
              </div>
              <span className="text-[10px] text-on-surface-variant">Exclusivo para utilizadores no Plano Gratuito</span>
            </div>
          </div>
          <button
            onClick={handleUpgradeClick}
            className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 uppercase tracking-wider"
          >
            <Crown className="w-3 h-3 text-amber-400" />
            <span className="hidden sm:inline">Assinar para Ocultar</span>
          </button>
        </div>

        {hasAdsterra ? (
          <div className="w-full overflow-hidden flex justify-center items-center py-2" style={{ minHeight: `${bannerHeight}px` }}>
            {adsterraIframeUrl ? (
              <iframe
                src={adsterraIframeUrl}
                title="Anúncio Patrocinado"
                className="w-full border-0 rounded-xl"
                style={{ maxWidth: `${bannerWidth}px`, height: `${bannerHeight}px` }}
                scrolling="no"
              />
            ) : (
              <iframe
                srcDoc={adsterraHtml!}
                title="Anúncio Patrocinado"
                className="w-full border-0 overflow-hidden rounded-xl"
                style={{ maxWidth: `${bannerWidth}px`, height: `${bannerHeight}px` }}
                scrolling="no"
              />
            )}
          </div>
        ) : (
          <div className="bg-surface-container-highest/60 border border-outline-variant/20 rounded-2xl p-5 text-center space-y-3">
            <h4 className="text-sm font-black text-white uppercase tracking-tight">
              {title || '🚀 Aumente a sua Consistência com o Plano Semestral'}
            </h4>
            <p className="text-xs text-on-surface-variant max-w-md mx-auto leading-relaxed">
              {subtitle || 'Acesse o Panorama Macroeconômico Global, gerencie até 16 contas simultâneas de Forex & Opções Binárias e navegue 100% livre de publicidades.'}
            </p>
            <button
              onClick={handleUpgradeClick}
              className="bg-gradient-to-r from-primary to-emerald-400 text-black font-black text-xs uppercase tracking-wider px-6 py-2.5 rounded-xl shadow-lg hover:brightness-110 transition-all inline-flex items-center gap-2"
            >
              <Crown className="w-4 h-4" />
              <span>Ver Planos a partir de 7.500 Kz</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // Render variant: CARD (Boxed widget inside dashboards/charts/columns)
  if (variant === 'card') {
    return (
      <div className={`w-full bg-surface-container-high/90 border border-outline-variant/20 rounded-2xl p-4 sm:p-5 shadow-md relative overflow-hidden my-4 ${className}`}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 text-[9px] uppercase font-black tracking-widest text-on-surface-variant/80 bg-surface-container-highest/80 px-2 py-0.5 rounded-md">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>Publicidade • Free Plan</span>
          </div>
          <button 
            onClick={handleUpgradeClick}
            className="text-[9px] font-extrabold text-primary hover:underline flex items-center gap-1 uppercase tracking-wider"
          >
            <Crown className="w-3 h-3 text-amber-400" />
            <span>Remover Anúncios</span>
          </button>
        </div>

        {hasAdsterra ? (
          <div className="w-full overflow-hidden flex justify-center items-center" style={{ minHeight: `${bannerHeight}px` }}>
            {adsterraIframeUrl ? (
              <iframe
                src={adsterraIframeUrl}
                title="Anúncio Patrocinado"
                className="w-full border-0"
                style={{ maxWidth: `${bannerWidth}px`, height: `${bannerHeight}px` }}
                scrolling="no"
              />
            ) : (
              <iframe
                srcDoc={adsterraHtml!}
                title="Anúncio Patrocinado"
                className="w-full border-0 overflow-hidden"
                style={{ maxWidth: `${bannerWidth}px`, height: `${bannerHeight}px` }}
                scrolling="no"
              />
            )}
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-black text-white leading-snug">
                  {title || 'Opere com Vantagem Institucional'}
                </p>
                <p className="text-[11px] text-on-surface-variant leading-tight mt-0.5">
                  {subtitle || 'Desbloqueie até 16 contas simultâneas, Panorama Global e suporte WhatsApp com o Plano Semestral (14.000 Kz).'}
                </p>
              </div>
            </div>
            <button
              onClick={handleUpgradeClick}
              className="w-full sm:w-auto bg-primary text-black font-black text-xs px-4 py-2.5 rounded-xl shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-1.5 shrink-0 uppercase tracking-wider"
            >
              <span>Fazer Upgrade</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // Standard LEADERBOARD (Default)
  return (
    <div className={`w-full my-4 ${className}`}>
      <div className="w-full bg-gradient-to-r from-surface-container-high/90 via-surface-container/70 to-surface-container-high/90 border border-outline-variant/20 rounded-2xl p-4 shadow-sm relative overflow-hidden group">
        {/* Ad Tag Badge */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-on-surface-variant/70 bg-surface-container-highest/70 px-2 py-0.5 rounded-md">
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

        {/* Adsterra Display */}
        {hasAdsterra ? (
          <div className="w-full overflow-hidden flex justify-center items-center" style={{ minHeight: `${bannerHeight}px` }}>
            {adsterraIframeUrl ? (
              <iframe
                src={adsterraIframeUrl}
                title="Anúncio Patrocinado"
                className="w-full border-0"
                style={{ maxWidth: `${bannerWidth}px`, height: `${bannerHeight}px` }}
                scrolling="no"
              />
            ) : (
              <iframe
                srcDoc={adsterraHtml!}
                title="Anúncio Patrocinado"
                className="w-full border-0 overflow-hidden"
                style={{ maxWidth: `${bannerWidth}px`, height: `${bannerHeight}px` }}
                scrolling="no"
              />
            )}
          </div>
        ) : hasAdsense ? (
          /* AdSense Display */
          <div className="w-full overflow-hidden flex justify-center items-center" style={{ minHeight: `${bannerHeight}px` }}>
            <ins
              className="adsbygoogle"
              style={{ display: 'block', width: '100%', height: `${bannerHeight}px` }}
              data-ad-client={adsenseClientId}
              data-ad-slot={adsenseSlotId}
              data-ad-format="auto"
              data-full-width-responsive="true"
            />
          </div>
        ) : (
          /* Internal Premium Promotion Fallback */
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <Crown className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-white leading-snug">
                  {title || 'C Profit Premium — Desbloqueie o Máximo Potencial'}
                </p>
                <p className="text-[11px] text-on-surface-variant leading-tight">
                  {subtitle || 'Acesse o Panorama Global, Comunidade VIP, Resumos Macroeconômicos e Contas Ilimitadas sem anúncios.'}
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

