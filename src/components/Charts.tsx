import React, { useState, useEffect } from 'react';
import { Maximize2, Minimize2, LineChart, Sparkles, Activity } from 'lucide-react';

export default function Charts() {
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const containerId = 'tradingview_comprehensive_advanced_chart';

  useEffect(() => {
    // Clear dynamic loader element safely
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = '';
    }

    const initWidget = () => {
      if (typeof window !== 'undefined' && (window as any).TradingView) {
        new (window as any).TradingView.widget({
          autosize: true,
          symbol: 'FX:EURUSD',
          interval: '15',
          timezone: 'America/Sao_Paulo',
          theme: 'dark',
          style: '1', // Candle chart
          locale: 'br',
          toolbar_bg: '#0c0c0f',
          enable_publishing: false,
          hide_side_toolbar: false,
          allow_symbol_change: true,
          container_id: containerId,
          snapshot_url: 'https://www.tradingview.com/snapshot/',
          withdateranges: true,
          details: true,
          hotlist: true,
          calendar: true,
          show_popup_button: true,
          popup_width: "1000",
          popup_height: "650",
          studies: [
            'RSI@tv-basicstudies',
            'MASimple@tv-basicstudies',
            'StochasticRSI@tv-basicstudies'
          ],
        });
      }
    };

    const existingScript = document.getElementById('tradingview-widget-script');
    if (existingScript) {
      if ((window as any).TradingView) {
        initWidget();
      } else {
        existingScript.addEventListener('load', initWidget);
      }
    } else {
      const script = document.createElement('script');
      script.id = 'tradingview-widget-script';
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      script.onload = initWidget;
      document.head.appendChild(script);
    }
  }, []);

  return (
    <div className={`flex flex-col space-y-6 w-full ${isFullScreen ? 'fixed inset-0 z-[110] bg-[#0c0c0f] p-4 md:p-6 space-y-4 overflow-hidden h-screen' : 'px-4 md:px-8 py-6'}`}>
      
      {/* Header compactado - Apenas Título e Tela Cheia */}
      <div className="flex flex-row items-center justify-between gap-4 bg-surface-container border border-outline-variant/10 rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-md transition-all">
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <LineChart size={20} />
          </div>
          <div>
            <h2 className="font-extrabold text-sm uppercase tracking-wider text-on-surface flex items-center gap-2">
              Análise Gráfica <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-md font-black">INTERATIVA</span>
            </h2>
            <p className="text-[11px] text-on-surface-variant font-medium">Estação profissional integrada TradingView em tempo real</p>
          </div>
        </div>

        {/* Lado Direito - Botão de maximização */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="flex items-center gap-2 px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/20 rounded-xl text-xs font-bold transition-all text-white max-h-[36px] cursor-pointer"
            title={isFullScreen ? 'Sair do Modo Tela Cheia' : 'Expandir para Tela Cheia'}
          >
            {isFullScreen ? (
              <>
                <Minimize2 size={13} className="text-secondary" />
                <span>Excluir Cheia</span>
              </>
            ) : (
              <>
                <Maximize2 size={13} className="text-primary" />
                <span>Tela Cheia</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* Container de Gráfico Principal */}
      <div className={`w-full bg-[#0c0c0f] border border-outline-variant/10 rounded-2xl overflow-hidden relative shadow-2xl transition-all ${
        isFullScreen ? 'flex-1 h-full' : 'h-[650px]'
      }`}>
        {/* Marca d'água / Layout de Terminal profissional */}
        <div className="absolute top-4 right-6 pointer-events-none text-[8px] font-semibold tracking-[0.2em] text-[#00f5a0]/10 select-none uppercase z-10 flex items-center gap-1">
          <Activity size={10} className="text-[#00f5a0]/30 animate-pulse" />
          PROFIT ANALYTICS GRAPHICS CORE v1.0
        </div>
        
        {/* Elemento de Renderização do Widget */}
        <div id={containerId} className="w-full h-full" />
      </div>

      {/* Dicas e Rodapé de Utilidades do Gráfico */}
      {!isFullScreen && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 text-[10px] text-on-surface-variant font-mono uppercase tracking-[0.08em] border border-outline-variant/15 bg-surface-container/40 p-4 rounded-xl">
            <span className="inline-block w-2 h-2 rounded-full bg-primary animate-ping shrink-0" />
            <span>Dica: Use a caixa de busca interativa diretamente no topo esquerdo do gráfico para alterar ativos ou intervalos de tempo.</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-on-surface-variant font-mono uppercase tracking-[0.08em] border border-outline-variant/15 bg-surface-container/40 p-4 rounded-xl">
            <Sparkles size={14} className="text-secondary shrink-0" />
            <span>Indicadores Integrados: Use os botões internos do gráfico para moldar suas médias móveis, RSI ou outras estratégias.</span>
          </div>
        </div>
      )}
    </div>
  );
}
