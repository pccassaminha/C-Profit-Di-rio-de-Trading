import React, { useState } from 'react';
import { ExternalLink, TrendingUp, TrendingDown, Activity, Image as ImageIcon, Link as LinkIcon, BarChart2, ShieldCheck, Maximize2, X } from 'lucide-react';
import { useCurrency } from '../contexts/CurrencyContext';

export interface TradeDetails {
  symbol?: string;
  action?: string;
  pnl?: number | string;
  type?: string;
  session?: string;
  size?: string | number;
  ticket?: string | number;
  openPrice?: string | number;
  sl?: string | number;
  tp?: string | number;
  notes?: string;
  studyLink?: string;
  date?: string;
  timeframe?: string;
}

interface TradeShareCardProps {
  tradeDetails?: TradeDetails;
  imageUrl?: string;
  userName?: string;
  interactive?: boolean;
}

export const TradeShareCard: React.FC<TradeShareCardProps> = ({ tradeDetails, imageUrl, userName, interactive = true }) => {
  const { formatCurrency } = useCurrency();
  const [imageError, setImageError] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const pnlNum = tradeDetails?.pnl !== undefined ? Number(tradeDetails.pnl) : undefined;
  const isWin = pnlNum !== undefined ? pnlNum >= 0 : undefined;
  
  const rawLink = tradeDetails?.studyLink || imageUrl || '';

  // Process links for proper image resolution (TradingView, Firebase Storage, direct images, etc.)
  let imageDisplayUrl = rawLink.trim();
  
  if (imageDisplayUrl.includes('tradingview.com/x/')) {
    // Strip trailing slashes and ensure .png extension
    imageDisplayUrl = imageDisplayUrl.replace(/\/+$/, '');
    if (!imageDisplayUrl.toLowerCase().endsWith('.png')) {
      imageDisplayUrl += '.png';
    }
  }

  // Determine if URL is likely an image
  const isExplicitImage = Boolean(
    imageDisplayUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)($|\?)/i) ||
    imageDisplayUrl.includes('tradingview.com/x/') ||
    imageDisplayUrl.includes('firebasestorage.googleapis.com') ||
    imageDisplayUrl.includes('storage.googleapis.com') ||
    imageDisplayUrl.startsWith('data:image/') ||
    imageDisplayUrl.startsWith('blob:')
  );

  const shouldTryImage = isExplicitImage || (rawLink.length > 5 && !imageError);

  // Extract domain for Facebook-style link header
  let domain = '';
  try {
    if (rawLink) {
      const urlObj = new URL(rawLink.startsWith('http') ? rawLink : `https://${rawLink}`);
      domain = urlObj.hostname.replace('www.', '');
    }
  } catch (e) {
    domain = 'link';
  }

  return (
    <>
      <div className="border border-outline-variant/20 rounded-2xl overflow-hidden bg-surface-container-high/80 shadow-md transition-all hover:border-outline-variant/40">
        {/* Facebook-style Source Banner */}
        <div className="bg-surface-container-highest px-4 py-2.5 border-b border-outline-variant/15 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-primary/20 text-primary flex items-center justify-center">
              <Activity size={12} />
            </div>
            <span className="text-[11px] font-bold tracking-wider text-on-surface-variant uppercase">
              C PROFIT • REGISTRO DE TRADE
            </span>
          </div>
          {domain && (
            <span className="text-[10px] font-semibold text-primary/80 bg-primary/10 px-2 py-0.5 rounded-full flex items-center gap-1">
              <LinkIcon size={10} />
              {domain}
            </span>
          )}
        </div>

        {/* Trade Summary Grid (If Trade details are provided) */}
        {tradeDetails && (
          <div className="p-4 sm:p-5 bg-surface-container-low border-b border-outline-variant/10">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-base sm:text-lg font-black text-on-surface tracking-tight">
                  {tradeDetails.symbol || 'SÍMBOLO'}
                </span>
                <span className={`text-xs px-2.5 py-0.5 rounded-md font-extrabold uppercase tracking-wider ${
                  tradeDetails.action === 'Buy' || tradeDetails.action === 'CALL'
                    ? 'bg-secondary/20 text-secondary border border-secondary/30'
                    : 'bg-error/20 text-error border border-error/30'
                }`}>
                  {tradeDetails.type === 'ob' 
                    ? (tradeDetails.action === 'Buy' ? 'CALL (ACIMA)' : 'PUT (ABAIXO)')
                    : (tradeDetails.action || 'COMPRA')
                  }
                </span>
                {tradeDetails.timeframe && (
                  <span className="text-[10px] bg-surface-container-highest px-2 py-0.5 rounded font-mono text-on-surface-variant">
                    {tradeDetails.timeframe}
                  </span>
                )}
              </div>

              {pnlNum !== undefined && (
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-black text-sm ${
                  isWin 
                    ? 'bg-secondary/15 text-secondary border border-secondary/30 shadow-sm shadow-secondary/10' 
                    : 'bg-error/15 text-error border border-error/30 shadow-sm shadow-error/10'
                }`}>
                  {isWin ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  <span>{isWin ? 'WIN' : 'LOSS'}</span>
                  <span className="opacity-90">({isWin ? '+' : ''}{formatCurrency(pnlNum)})</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-surface-container/60 p-3 rounded-xl border border-outline-variant/10 text-xs">
              <div>
                <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider mb-0.5">Ticket / Tipo</p>
                <p className="font-bold text-on-surface truncate">{tradeDetails.ticket || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider mb-0.5">
                  {tradeDetails.type === 'ob' ? 'Valor' : 'Lotes'}
                </p>
                <p className="font-bold text-on-surface">{tradeDetails.size || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider mb-0.5">Sessão</p>
                <p className="font-bold text-on-surface truncate">{tradeDetails.session || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider mb-0.5">Data</p>
                <p className="font-bold text-on-surface">{tradeDetails.date || '-'}</p>
              </div>
            </div>

            {(tradeDetails.openPrice || tradeDetails.sl || tradeDetails.tp) && (
              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-on-surface-variant font-mono">
                {tradeDetails.openPrice && <span>Entrada: <strong className="text-on-surface">{tradeDetails.openPrice}</strong></span>}
                {tradeDetails.sl && <span>SL: <strong className="text-error/90">{tradeDetails.sl}</strong></span>}
                {tradeDetails.tp && <span>TP: <strong className="text-secondary/90">{tradeDetails.tp}</strong></span>}
              </div>
            )}

            {tradeDetails.notes && (
              <p className="text-xs text-on-surface-variant italic mt-3 bg-surface-container/30 p-2.5 rounded-lg border border-outline-variant/5">
                "{tradeDetails.notes}"
              </p>
            )}
          </div>
        )}

        {/* Facebook Link / Image Preview Section */}
        {rawLink && (
          <div className="group relative">
            {shouldTryImage && !imageError ? (
              <div 
                className="relative overflow-hidden bg-black/50 cursor-pointer group/img min-h-[160px] flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLightboxOpen(true);
                }}
              >
                <img 
                  src={imageDisplayUrl} 
                  alt="Gráfico e Análise" 
                  className="w-full h-auto max-h-[420px] object-contain mx-auto transition-transform duration-300 group-hover/img:scale-[1.02]"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  onError={() => {
                    console.warn("Failed to load image preview for:", imageDisplayUrl);
                    setImageError(true);
                  }}
                />
                
                {/* Overlay Badge & Expand Button */}
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <div className="bg-black/70 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-lg">
                    <ImageIcon size={12} />
                    <span>Análise de Gráfico</span>
                  </div>
                  <div className="bg-primary/90 text-on-primary p-1.5 rounded-full shadow-lg opacity-0 group-hover/img:opacity-100 transition-opacity">
                    <Maximize2 size={14} />
                  </div>
                </div>

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3 opacity-0 group-hover/img:opacity-100 transition-opacity flex justify-between items-center text-white text-xs">
                  <span>Clique para ampliar na plataforma</span>
                  <Maximize2 size={14} />
                </div>
              </div>
            ) : (
              <div className="p-4 bg-surface-container-high/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                    <LinkIcon size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-primary tracking-wider uppercase">{domain || 'LINK EXTERNO'}</p>
                    <p className="text-sm font-bold text-on-surface line-clamp-1">
                      Análise / Estudo do Trade
                    </p>
                    <p className="text-xs text-on-surface-variant line-clamp-1">{rawLink}</p>
                  </div>
                </div>
                {interactive && (
                  <a 
                    href={rawLink.startsWith('http') ? rawLink : `https://${rawLink}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    onClick={(e) => e.stopPropagation()}
                    className="px-4 py-2 bg-primary/10 hover:bg-primary text-primary hover:text-on-primary rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
                  >
                    <span>Abrir Link</span>
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            )}

            {/* Facebook Link Bottom Bar */}
            {domain && (
              <div className="px-4 py-2 bg-surface-container-highest/60 flex items-center justify-between border-t border-outline-variant/10 text-xs">
                <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">{domain}</span>
                {interactive && (
                  <a 
                    href={rawLink.startsWith('http') ? rawLink : `https://${rawLink}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    onClick={(e) => e.stopPropagation()}
                    className="text-primary hover:underline text-[11px] font-bold flex items-center gap-1"
                  >
                    <span>Abrir em Nova Aba</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox / Full-screen Image Viewer Modal inside platform */}
      {isLightboxOpen && (
        <div 
          className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            e.stopPropagation();
            setIsLightboxOpen(false);
          }}
        >
          <div className="absolute top-4 right-4 flex items-center gap-3 z-10">
            <a 
              href={rawLink.startsWith('http') ? rawLink : `https://${rawLink}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 backdrop-blur-md"
            >
              <span>Abrir Original</span>
              <ExternalLink size={14} />
            </a>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsLightboxOpen(false);
              }}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors backdrop-blur-md"
            >
              <X size={20} />
            </button>
          </div>

          <div 
            className="max-w-5xl max-h-[85vh] w-full flex items-center justify-center p-2 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={imageDisplayUrl} 
              alt="Análise em alta resolução" 
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10"
              referrerPolicy="no-referrer"
            />
          </div>

          {tradeDetails?.symbol && (
            <div className="mt-4 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-6 py-2.5 text-white text-xs flex items-center gap-4">
              <span className="font-black text-sm">{tradeDetails.symbol}</span>
              <span>{tradeDetails.action}</span>
              {tradeDetails.date && <span className="opacity-70">{tradeDetails.date}</span>}
            </div>
          )}
        </div>
      )}
    </>
  );
};

