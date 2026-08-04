import React, { useEffect, useMemo } from 'react';
import { Zap, Crown, ArrowRight } from 'lucide-react';

interface AdBannerProps {
  isPro?: boolean;
  globalSettings?: any;
  className?: string;
  slotId?: string;
  adKey?: string;
  width?: number;
  height?: number;
}

export default function AdBanner({ isPro = false, globalSettings, className = '', slotId, adKey, width, height }: AdBannerProps) {
  // If user is Premium/Pro, never display ads
  if (isPro) return null;

  const enableAdsForFree = globalSettings?.enableAdsForFree !== false;
  
  const adProvider = globalSettings?.adProvider || (globalSettings?.adsterraKey || globalSettings?.adsterraScriptCode ? 'adsterra' : (globalSettings?.adsenseClientId ? 'adsense' : 'auto'));

  const adsterraKey = adKey || globalSettings?.adsterraKey || localStorage.getItem('adsterra_key') || '8e59cc5ff459e7164b9ffa94d698ca18';
  const adsterraScriptCode = globalSettings?.adsterraScriptCode || localStorage.getItem('adsterra_script_code') || '';
  const adsterraIframeUrl = globalSettings?.adsterraIframeUrl || localStorage.getItem('adsterra_iframe_url') || '';

  const adsenseClientId = globalSettings?.adsenseClientId || localStorage.getItem('adsense_client_id');
  const adsenseSlotId = slotId || globalSettings?.adsenseSlotId || localStorage.getItem('adsense_slot_id');

  const bannerWidth = width || (adKey === '5cba24c0ad586b33f4097be71bbaadb0' ? 468 : 728);
  const bannerHeight = height || (adKey === '5cba24c0ad586b33f4097be71bbaadb0' ? 60 : 90);

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

