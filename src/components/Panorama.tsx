import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Flame, Gauge, TrendingUp, Grid, Layers2, Activity } from 'lucide-react';

interface WidgetProps {
  widgetType: 'events' | 'forex-heat-map' | 'market-quotes' | 'technical-analysis' | 'stock-heatmap';
  config: any;
  height?: string;
}

// Fully sandboxed widget render hidden from platform crawl utilizing Shadow Root and pure iframe hashed URLs
function TradingViewWidget({ widgetType, config, height = '550px' }: WidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stringifiedConfig = JSON.stringify(config);

  useEffect(() => {
    if (!containerRef.current) return;

    // Attach Shadow Root to completely encapsulate the iframe from parent crawling
    let shadow = containerRef.current.shadowRoot;
    if (!shadow) {
      shadow = containerRef.current.attachShadow({ mode: 'open' });
    }

    // Clean previous render inside shadow
    shadow.innerHTML = '';

    // Style elements locally inside Shadow Root to fill container
    const styles = document.createElement('style');
    styles.textContent = `
      iframe {
        width: 100% !important;
        height: 100% !important;
        border: none !important;
        background: transparent !important;
        display: block;
      }
    `;
    shadow.appendChild(styles);

    // Build absolute path to TradingView's standard iframe widgets
    const url = `https://s.tradingview.com/embed-widget/${widgetType}/?locale=pt#${encodeURIComponent(stringifiedConfig)}`;

    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.title = `TradingView ${widgetType} Widget`;
    iframe.scrolling = 'no';

    shadow.appendChild(iframe);

    return () => {
      if (containerRef.current && containerRef.current.shadowRoot) {
        containerRef.current.shadowRoot.innerHTML = '';
      }
    };
  }, [widgetType, stringifiedConfig]);

  return (
    <div className="w-full bg-surface-container-low border border-outline-variant/10 rounded-2xl p-2 relative overflow-hidden flex flex-col justify-between" style={{ height }}>
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}

// Sandbox self-bootstrapping Ticker Tape loader
function TickerTapeWidget() {
  const tapeContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tapeContainerRef.current) return;

    // Clear any previous setups
    tapeContainerRef.current.innerHTML = '';

    // Create TradingView tape script module loader
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://widgets.tradingview-widget.com/w/en/tv-ticker-tape.js';
    script.async = true;

    // Create custom HTML element representing television tape ticker
    const tape = document.createElement('tv-ticker-tape');
    tape.setAttribute(
      'symbols',
      'FOREXCOM:SPXUSD,FOREXCOM:NSXUSD,FOREXCOM:DJI,FX:EURUSD,BITSTAMP:BTCUSD,BITSTAMP:ETHUSD,CMCMARKETS:GOLD,PEPPERSTONE:GBPUSD,PEPPERSTONE:USDJPY,GOMARKETS:DAX40,PEPPERSTONE:USDCAD,PEPPERSTONE:USDCHF,PEPPERSTONE:NZDUSD,PEPPERSTONE:AUDUSD,PEPPERSTONE:AUDJPY,PEPPERSTONE:NZDJPY,PEPPERSTONE:FRA40,PEPPERSTONE:JPN225,IG:RUSSELL,TVC:DXY,CFI:WTI,TVC:USOIL,PEPPERSTONE:XAGUSD'
    );
    // Custom dark attributes corresponding to layout colors
    tape.setAttribute('colorTheme', 'dark');
    tape.setAttribute('isTransparent', 'true');
    tape.setAttribute('locale', 'pt');

    tapeContainerRef.current.appendChild(script);
    tapeContainerRef.current.appendChild(tape);

    return () => {
      if (tapeContainerRef.current) {
        tapeContainerRef.current.innerHTML = '';
      }
    };
  }, []);

  return (
    <div className="w-full bg-surface-container border border-outline-variant/10 rounded-2xl overflow-hidden p-1 shadow-md">
      <div ref={tapeContainerRef} className="tv-ticker-tape-wrapper w-full" />
    </div>
  );
}

// Custom Premium Investing.com economic calendar widget styled perfectly to match the application's dark aesthetic
function InvestingCalendarWidget({ height = '500px' }: { height?: string }) {
  return (
    <div className="w-full bg-[#141414] border border-outline-variant/10 rounded-2xl p-2 relative overflow-hidden flex flex-col justify-between" style={{ height }}>
      <div className="flex-1 w-full flex items-center justify-center bg-[#141414] overflow-hidden rounded-xl">
        <iframe
          src="https://sslecal2.investing.com?columns=exc_flags,exc_currency,exc_importance,exc_actual,exc_forecast,exc_previous&category=_employment,_economicActivity,_inflation,_credit,_centralBanks,_confidenceIndex,_balance,_Bonds&features=datepicker,timezone,timeselector,filters&countries=17,86,25,6,37,26,5,22,39,14,48,10,35,43,38,4,36,12,72&calType=day&timeZone=60&lang=12"
          width="100%"
          height="100%"
          frameBorder="0"
          allowtransparency="true"
          className="w-full h-full bg-white transition-opacity duration-300 max-w-[850px] mx-auto rounded-lg"
          style={{ 
            colorScheme: 'dark',
            filter: 'invert(0.92) hue-rotate(180deg) brightness(0.9) contrast(1.15)',
          }}
          title="Economic Calendar"
        />
      </div>
      <div className="flex justify-between items-center px-1 pt-1.5 select-none shrink-0 bg-[#141414]">
        <span className="text-[10px] text-on-surface-variant/40 font-mono">Investing.com Engine V2</span>
        <div className="text-[10px] text-on-surface-variant font-medium">
          <span className="opacity-65">Calendário por </span>
          <a href="https://br.investing.com/" rel="noopener nofollow" target="_blank" className="text-primary hover:underline font-bold transition-all">
            Investing.com Brasil
          </a>
        </div>
      </div>
    </div>
  );
}

export default function Panorama() {
  const [layoutMode, setLayoutMode] = useState<'grid' | 'tabs'>('grid');
  const [activeTab, setActiveTab] = useState<'calendar' | 'heatmap' | 'technical' | 'quotes' | 'stockHeatmap'>('calendar');

  // Widget config definitions
  const calendarConfig = {
    colorTheme: 'dark',
    isTransparent: true,
    width: '100%',
    height: '100%',
    locale: 'pt',
    importanceFilter: '-1,0,1',
    countryFilter: 'us,eu,gb,jp,ch,ca,au,nz,br,ao'
  };

  const heatmapConfig = {
    width: '100%',
    height: '100%',
    currencies: ['EUR', 'USD', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD'],
    isTransparent: true,
    colorTheme: 'dark',
    locale: 'pt'
  };

  const stockHeatmapConfig = {
    dataSource: "NASDAQ100",
    blockSize: "market_cap_basic",
    blockColor: "change",
    grouping: "sector",
    locale: "br",
    symbolUrl: "",
    colorTheme: "dark",
    exchanges: [],
    hasTopBar: false,
    isDataSetEnabled: false,
    isZoomEnabled: true,
    hasSymbolTooltip: true,
    isMonoSize: false,
    width: "100%",
    height: "100%"
  };

  // Upgraded custom-configured quotesConfig containing precisely requested symbols groups
  const quotesConfig = {
    width: '100%',
    height: '100%',
    colorTheme: 'dark',
    isTransparent: true,
    showSymbolLogo: true,
    locale: 'pt',
    largeChartUrl: '',
    symbolsGroups: [
      {
        name: 'Índices Mundiais',
        symbols: [
          { name: 'FOREXCOM:SPXUSD', displayName: 'S&P 500 Index' },
          { name: 'FOREXCOM:NSXUSD', displayName: 'US 100 Cash CFD' },
          { name: 'FOREXCOM:DJI', displayName: 'Dow Jones Index' },
          { name: 'INDEX:NKY', displayName: 'Japan 225' },
          { name: 'INDEX:DEU40', displayName: 'DAX Index' },
          { name: 'FOREXCOM:UKXGBP', displayName: 'FTSE 100 Index' }
        ]
      },
      {
        name: 'Futuros & Commodities',
        symbols: [
          { name: 'BMFBOVESPA:ISP1!', displayName: 'S&P 500 Futures' },
          { name: 'BMFBOVESPA:EUR1!', displayName: 'Euro' },
          { name: 'CMCMARKETS:GOLD', displayName: 'Gold' },
          { name: 'PYTH:WTI3!', displayName: 'WTI Crude Oil' },
          { name: 'BMFBOVESPA:CCM1!', displayName: 'Corn' }
        ]
      },
      {
        name: 'Títulos de Tesouro',
        symbols: [
          { name: 'EUREX:FGBL1!', displayName: 'Euro Bund' },
          { name: 'EUREX:FBTP1!', displayName: 'Euro BTP' },
          { name: 'EUREX:FGBM1!', displayName: 'Euro BOBL' }
        ]
      },
      {
        name: 'Forex',
        symbols: [
          { name: 'FX:EURUSD', displayName: 'EUR to USD' },
          { name: 'FX:GBPUSD', displayName: 'GBP to USD' },
          { name: 'FX:USDJPY', displayName: 'USD to JPY' },
          { name: 'FX:USDCHF', displayName: 'USD to CHF' },
          { name: 'FX:AUDUSD', displayName: 'AUD to USD' },
          { name: 'FX:USDCAD', displayName: 'USD to CAD' }
        ]
      }
    ]
  };

  const technicalConfig = {
    interval: '1h',
    width: '100%',
    isTransparent: true,
    height: '100%',
    symbol: 'FX:EURUSD',
    showIntervalTabs: true,
    displayMode: 'single',
    locale: 'pt',
    colorTheme: 'dark'
  };

  return (
    <div id="panorama-container" className="p-4 md:p-8 max-w-[1600px] mx-auto w-full space-y-8 animate-in fade-in duration-500">
      
      {/* Page Title & Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-on-surface font-headline uppercase italic tracking-tighter">
            Panorama do <span className="text-primary italic">Mercado</span>
          </h2>
          <p className="text-on-surface-variant mt-2 max-w-2xl text-sm font-medium">
            Acompanhe em tempo real o calendário de notícias de alto impacto acadêmicas, mapa de calor com a volatilidade das moedas e o sumário de análise técnica institucional.
          </p>
        </div>

        {/* Layout Swapper buttons */}
        <div className="flex bg-surface-container-low border border-outline-variant/10 rounded-2xl p-1.5 gap-2 select-none self-stretch lg:self-auto">
          <button
            onClick={() => setLayoutMode('grid')}
            className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold uppercase tracking-wider text-[11px] transition-all cursor-pointer ${
              layoutMode === 'grid'
                ? 'bg-primary text-background shadow-lg shadow-primary/20'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            <Grid size={15} />
            Grade Geral
          </button>
          <button
            onClick={() => setLayoutMode('tabs')}
            className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold uppercase tracking-wider text-[11px] transition-all cursor-pointer ${
              layoutMode === 'tabs'
                ? 'bg-primary text-background shadow-lg shadow-primary/20'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            <Layers2 size={15} />
            Abas de Foco
          </button>
        </div>
      </div>

      {/* Dynamic Animated Ticker Tape positioned right below header/legend in top layout */}
      <TickerTapeWidget />

      {/* RENDER GRID MODE */}
      {layoutMode === 'grid' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          
          {/* Card 1: Calendario */}
          <div className="bg-surface-container border border-outline-variant/10 rounded-3xl p-6 flex flex-col space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#00f5a0]/15 text-primary flex items-center justify-center">
                <Calendar size={18} />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-tight text-on-surface">Calendário Econômico</h3>
                <p className="text-[11px] text-on-surface-variant">Notícias macroeconômicas e eventos de alta liquidez.</p>
              </div>
            </div>
            <div className="flex-1 min-h-[500px]">
              <InvestingCalendarWidget height="500px" />
            </div>
          </div>

          {/* Card 2: Mapa de Calor */}
          <div className="bg-surface-container border border-outline-variant/10 rounded-3xl p-6 flex flex-col space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-500/15 text-orange-400 flex items-center justify-center">
                <Flame size={18} />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-tight text-on-surface">Mapa de Calor FX</h3>
                <p className="text-[11px] text-on-surface-variant font-medium">Volatilidade relativa entre as moedas maiores.</p>
              </div>
            </div>
            <div className="flex-1 min-h-[500px]">
              <TradingViewWidget
                widgetType="forex-heat-map"
                config={heatmapConfig}
                height="500px"
              />
            </div>
          </div>

          {/* Card 3: Cotacoes */}
          <div className="bg-surface-container border border-outline-variant/10 rounded-3xl p-6 flex flex-col space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
                <TrendingUp size={18} />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-tight text-on-surface">Cotações em Tempo Real</h3>
                <p className="text-[11px] text-on-surface-variant font-medium">Preços de Forex ativos e de índices mundiais.</p>
              </div>
            </div>
            <div className="flex-1 min-h-[480px]">
              <TradingViewWidget
                widgetType="market-quotes"
                config={quotesConfig}
                height="480px"
              />
            </div>
          </div>

          {/* Card 4: Analise Tecnica */}
          <div className="bg-surface-container border border-outline-variant/10 rounded-3xl p-6 flex flex-col space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
                <Gauge size={18} />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-tight text-on-surface">Análise Técnica</h3>
                <p className="text-[11px] text-on-surface-variant font-medium">Indicador de força e termómetro de tendências.</p>
              </div>
            </div>
            <div className="flex-1 min-h-[480px]">
              <TradingViewWidget
                widgetType="technical-analysis"
                config={technicalConfig}
                height="480px"
              />
            </div>
          </div>

          {/* Card 5: Mapa de Calor de Ações (NASDAQ100) */}
          <div className="bg-surface-container border border-outline-variant/10 rounded-3xl p-6 flex flex-col space-y-4 xl:col-span-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center animate-pulse">
                <Activity size={18} />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-tight text-on-surface">Mapa de Calor de Ações (NASDAQ 100)</h3>
                <p className="text-[11px] text-on-surface-variant font-medium">Distribuição e desempenho setorial do ecossistema de ações globais em tempo real.</p>
              </div>
            </div>
            <div className="flex-1 min-h-[550px]">
              <TradingViewWidget
                widgetType="stock-heatmap"
                config={stockHeatmapConfig}
                height="550px"
              />
            </div>
          </div>

        </div>
      )}

      {/* RENDER TAB MODE */}
      {layoutMode === 'tabs' && (
        <div className="space-y-6">
          
          {/* Sub Navigation Abas */}
          <div className="flex flex-wrap bg-surface-container-low border border-outline-variant/10 rounded-2xl p-1.5 gap-2">
            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all cursor-pointer ${
                activeTab === 'calendar'
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <Calendar size={14} />
              Calendário Econômico
            </button>
            <button
              onClick={() => setActiveTab('heatmap')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all cursor-pointer ${
                activeTab === 'heatmap'
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <Flame size={14} />
              Mapa de Calor FX
            </button>
            <button
              onClick={() => setActiveTab('technical')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all cursor-pointer ${
                activeTab === 'technical'
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <Gauge size={14} />
              Termómetro Técnico
            </button>
            <button
              onClick={() => setActiveTab('quotes')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all cursor-pointer ${
                activeTab === 'quotes'
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <TrendingUp size={14} />
              Cotações de Moedas
            </button>
            <button
              onClick={() => setActiveTab('stockHeatmap')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all cursor-pointer ${
                activeTab === 'stockHeatmap'
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <Activity size={14} />
              Mapa de Calor Ações
            </button>
          </div>

          {" "}
          {/* Active Tab Screen */}
          <div className="bg-surface-container border border-outline-variant/10 rounded-3xl p-6 min-h-[600px] flex flex-col">
            {activeTab === 'calendar' && (
              <div className="flex-1 flex flex-col space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="text-primary" size={20} />
                  <h3 className="font-bold text-lg text-on-surface">Calendário Macro-Econômico em Tela Cheia</h3>
                </div>
                <div className="flex-1 min-h-[550px]">
                  <InvestingCalendarWidget height="580px" />
                </div>
              </div>
            )}

            {activeTab === 'heatmap' && (
              <div className="flex-1 flex flex-col space-y-4">
                <div className="flex items-center gap-3">
                  <Flame className="text-orange-400" size={20} />
                  <h3 className="font-bold text-lg text-on-surface">Mapa Termográfico Forex (Intercalares)</h3>
                </div>
                <div className="flex-1 min-h-[550px]">
                  <TradingViewWidget
                    widgetType="forex-heat-map"
                    config={heatmapConfig}
                    height="580px"
                  />
                </div>
              </div>
            )}

            {activeTab === 'technical' && (
              <div className="flex-1 flex flex-col space-y-4">
                <div className="flex items-center gap-3">
                  <Gauge className="text-purple-400" size={20} />
                  <h3 className="font-bold text-lg text-on-surface">Medidores Rápidos de Tendência Técnica</h3>
                </div>
                <div className="flex-1 min-h-[550px]">
                  <TradingViewWidget
                    widgetType="technical-analysis"
                    config={technicalConfig}
                    height="580px"
                  />
                </div>
              </div>
            )}

            {activeTab === 'quotes' && (
              <div className="flex-1 flex flex-col space-y-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="text-blue-400" size={20} />
                  <h3 className="font-bold text-lg text-on-surface">Monitor de Cotações & Índices de Referência</h3>
                </div>
                <div className="flex-1 min-h-[550px]">
                  <TradingViewWidget
                    widgetType="market-quotes"
                    config={quotesConfig}
                    height="580px"
                  />
                </div>
              </div>
            )}

            {activeTab === 'stockHeatmap' && (
              <div className="flex-1 flex flex-col space-y-4">
                <div className="flex items-center gap-3">
                  <Activity className="text-primary animate-pulse" size={20} />
                  <h3 className="font-bold text-lg text-on-surface">Mapa Termográfico de Ações NASDAQ 100</h3>
                </div>
                <div className="flex-1 min-h-[550px]">
                  <TradingViewWidget
                    widgetType="stock-heatmap"
                    config={stockHeatmapConfig}
                    height="580px"
                  />
                </div>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}

