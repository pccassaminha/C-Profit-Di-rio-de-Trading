import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Flame, Gauge, TrendingUp, Grid, Layers2, Activity } from 'lucide-react';

interface WidgetProps {
  widgetType: 'events' | 'forex-heat-map' | 'market-quotes' | 'technical-analysis' | 'stock-heatmap' | 'crypto-coins-heatmap' | 'ticker-tape';
  config: any;
  height?: string;
}

// Clean declarative widget renderer utilizing standard iframes decorated with host referrer metadata
// to fully resolve cross-origin "Permission denied" exceptions within nested sandboxed containers.
function TradingViewWidget({ widgetType, config, height = '550px' }: WidgetProps) {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  
  // Inject utm properties directly into configuration so s.tradingview.com avoids querying forbidden
  // properties such as window.parent.location.href or document.referrer under sandboxed contexts.
  const enhancedConfig = {
    ...config,
    utm_source: hostname,
    utm_medium: 'widget',
    utm_campaign: widgetType
  };
  
  const stringifiedConfig = encodeURIComponent(JSON.stringify(enhancedConfig));
  const url = `https://s.tradingview.com/embed-widget/${widgetType}/?locale=pt#${stringifiedConfig}`;

  return (
    <div className="w-full bg-surface-container-low border border-outline-variant/10 rounded-2xl p-2 relative overflow-hidden flex flex-col justify-between" style={{ height }}>
      <iframe
        src={url}
        title={`TradingView ${widgetType} Widget`}
        scrolling="no"
        allowTransparency={true}
        className="w-full h-full border-none bg-transparent block rounded-xl"
        allow="autoplay; encrypted-media; fullscreen"
      />
    </div>
  );
}

// Declarative, isolated iframe Ticker Tape widget to eliminate document.createElement('script') side-effects on top frame
function TickerTapeWidget() {
  const tickerConfig = {
    symbols: [
      { proName: 'FOREXCOM:SPXUSD', title: 'S&P 500' },
      { proName: 'FOREXCOM:NSXUSD', title: 'Nasdaq 100' },
      { proName: 'FOREXCOM:DJI', title: 'Dow Jones' },
      { proName: 'FX:EURUSD', title: 'EUR/USD' },
      { proName: 'BITSTAMP:BTCUSD', title: 'Bitcoin' },
      { proName: 'BITSTAMP:ETHUSD', title: 'Ethereum' },
      { proName: 'CMCMARKETS:GOLD', title: 'Ouro' },
      { proName: 'PEPPERSTONE:GBPUSD', title: 'GBP/USD' },
      { proName: 'PEPPERSTONE:USDJPY', title: 'USD/JPY' },
      { proName: 'GOMARKETS:DAX40', title: 'DAX 40' },
      { proName: 'PEPPERSTONE:USDCAD', title: 'USD/CAD' },
      { proName: 'PEPPERSTONE:USDCHF', title: 'USD/CHF' },
      { proName: 'PEPPERSTONE:NZDUSD', title: 'NZD/USD' },
      { proName: 'PEPPERSTONE:AUDUSD', title: 'AUD/USD' },
      { proName: 'PEPPERSTONE:AUDJPY', title: 'AUD/JPY' },
      { proName: 'PEPPERSTONE:NZDJPY', title: 'NZD/JPY' },
      { proName: 'PEPPERSTONE:FRA40', title: 'CAC 40' },
      { proName: 'PEPPERSTONE:JPN225', title: 'Nikkei 225' },
      { proName: 'IG:RUSSELL', title: 'Russell 2000' },
      { proName: 'TVC:DXY', title: 'DXY' },
      { proName: 'CFI:WTI', title: 'Crude Oil' },
      { proName: 'PEPPERSTONE:XAGUSD', title: 'Silver' }
    ],
    showSymbolLogo: true,
    colorTheme: 'dark',
    isTransparent: true,
    displayMode: 'adaptive',
    locale: 'pt'
  };

  return (
    <div className="w-full bg-surface-container border border-outline-variant/10 rounded-2xl overflow-hidden p-1 shadow-md">
      <TradingViewWidget
        widgetType="ticker-tape"
        config={tickerConfig}
        height="72px"
      />
    </div>
  );
}

// Custom Premium Investing.com economic calendar widget styled perfectly to match the application's dark aesthetic
function InvestingCalendarWidget({ height = '500px' }: { height?: string }) {
  return (
    <div className="w-full max-w-[850px] mx-auto bg-[#141414] border border-outline-variant/10 rounded-2xl p-2 relative overflow-hidden flex flex-col justify-between animate-in fade-in duration-300" style={{ height }}>
      <div className="flex-1 w-full flex items-center justify-center bg-[#141414] overflow-hidden rounded-xl">
        <iframe
          src="https://sslecal2.investing.com?columns=exc_flags,exc_currency,exc_importance,exc_actual,exc_forecast,exc_previous&category=_employment,_economicActivity,_inflation,_credit,_centralBanks,_confidenceIndex,_balance,_Bonds&features=datepicker,timezone,timeselector,filters&countries=17,86,25,6,37,26,5,22,39,14,48,10,35,43,38,4,36,12,72&calType=day&timeZone=60&lang=12"
          width="100%"
          height="100%"
          frameBorder="0"
          allowtransparency="true"
          className="w-full h-full bg-white transition-opacity duration-300 rounded-lg"
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
  const [activeTab, setActiveTab] = useState<'calendar' | 'heatmap' | 'technical' | 'quotes'>('calendar');

  // Technical Analysis selector state
  const [technicalSymbol, setTechnicalSymbol] = useState<'FX:EURUSD' | 'PEPPERSTONE:NAS100' | 'OANDA:XAUUSD' | 'BINANCE:BTCUSD'>('FX:EURUSD');
  
  // Unified heatmap selector state
  const [activeHeatmap, setActiveHeatmap] = useState<'nasdaq' | 'djca' | 'forex' | 'crypto'>('nasdaq');

  // Technical symbols constant
  const technicalSymbols = [
    { id: 'FX:EURUSD', label: 'EUR/USD (Euro)' },
    { id: 'PEPPERSTONE:NAS100', label: 'NASDAQ 100' },
    { id: 'OANDA:XAUUSD', label: 'Ouro (XAU/USD)' },
    { id: 'BINANCE:BTCUSD', label: 'Bitcoin (BTC/USD)' },
  ] as const;

  // Widget config definitions
  const calendarConfig = {
    colorTheme: 'dark',
    isTransparent: true,
    width: '100%',
    height: '100%',
    locale: 'br',
    importanceFilter: '-1,0,1',
    countryFilter: 'us,eu,gb,jp,ch,ca,au,nz,br,ao'
  };

  const heatmapConfig = {
    width: '100%',
    height: '100%',
    currencies: ['EUR', 'USD', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD'],
    isTransparent: true,
    colorTheme: 'dark',
    locale: 'br'
  };

  const cryptoHeatmapConfig = {
    dataSource: "Crypto",
    blockSize: "market_cap_calc",
    blockColor: "24h_close_change|5",
    locale: "br",
    symbolUrl: "",
    colorTheme: "dark",
    hasTopBar: false,
    isDataSetEnabled: false,
    isZoomEnabled: true,
    hasSymbolTooltip: true,
    isMonoSize: false,
    width: "100%",
    height: "100%"
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
    hasTopBar: true,
    isDataSetEnabled: true,
    isZoomEnabled: true,
    hasSymbolTooltip: true,
    isMonoSize: false,
    width: "100%",
    height: "100%"
  };

  const djcaHeatmapConfig = {
    dataSource: "DJCA",
    blockSize: "market_cap_basic",
    blockColor: "change",
    grouping: "sector",
    locale: "br",
    symbolUrl: "",
    colorTheme: "dark",
    exchanges: [],
    hasTopBar: true,
    isDataSetEnabled: true,
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
    locale: 'br',
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

  const getTechnicalConfig = (symbol: string) => ({
    interval: '1m',
    width: '100%',
    isTransparent: true,
    height: '100%',
    symbol: symbol,
    showIntervalTabs: true,
    displayMode: 'single',
    locale: 'br',
    colorTheme: 'dark'
  });

  const getHeatmapProps = (type: 'nasdaq' | 'djca' | 'forex' | 'crypto') => {
    switch (type) {
      case 'nasdaq':
        return {
          widgetType: 'stock-heatmap' as const,
          config: stockHeatmapConfig
        };
      case 'djca':
        return {
          widgetType: 'stock-heatmap' as const,
          config: djcaHeatmapConfig
        };
      case 'forex':
        return {
          widgetType: 'forex-heat-map' as const,
          config: heatmapConfig
        };
      case 'crypto':
        return {
          widgetType: 'crypto-coins-heatmap' as const,
          config: cryptoHeatmapConfig
        };
    }
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
          <div className="bg-surface-container border border-outline-variant/10 rounded-3xl p-6 flex flex-col space-y-4 xl:col-span-2">
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

          {/* Card 2: Cotacoes */}
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

          {/* Card 3: Analise Tecnica */}
          <div className="bg-surface-container border border-outline-variant/10 rounded-3xl p-6 flex flex-col space-y-4">
            <div className="flex flex-col space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
                  <Gauge size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-tight text-on-surface">Análise Técnica</h3>
                  <p className="text-[11px] text-on-surface-variant font-medium">Indicador de força e termômetro de tendências.</p>
                </div>
              </div>

              {/* Symbol selector */}
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap bg-surface-container-low border border-outline-variant/10 rounded-xl p-1 gap-1 select-none shrink-0 w-full">
                {technicalSymbols.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setTechnicalSymbol(s.id)}
                    className={`flex-1 min-w-[70px] px-2 py-1.5 rounded-lg font-bold uppercase text-[9px] tracking-wider transition-all cursor-pointer text-center ${
                      technicalSymbol === s.id
                        ? 'bg-primary/20 text-primary border border-primary/20'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 min-h-[480px]">
              <TradingViewWidget
                widgetType="technical-analysis"
                config={getTechnicalConfig(technicalSymbol)}
                height="480px"
              />
            </div>
          </div>

          {/* Card 4: Mapa de Calor Global */}
          <div className="bg-surface-container border border-outline-variant/10 rounded-3xl p-6 flex flex-col space-y-4 xl:col-span-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#00f5a0]/15 text-primary flex items-center justify-center animate-pulse">
                  <Activity size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-tight text-on-surface">Mapa de Calor Global</h3>
                  <p className="text-[11px] text-on-surface-variant font-medium">Mapeamento térmico de ativos e setores do mercado global em tempo real.</p>
                </div>
              </div>

              {/* Switcher Toggles */}
              <div className="flex bg-surface-container-low border border-outline-variant/10 rounded-xl p-1 gap-1 select-none shrink-0 self-start sm:self-auto">
                <button
                  onClick={() => setActiveHeatmap('nasdaq')}
                  className={`px-3 py-1.5 rounded-lg font-black uppercase text-[9px] tracking-wider transition-all cursor-pointer ${
                    activeHeatmap === 'nasdaq'
                      ? 'bg-primary/20 text-primary border border-primary/20 shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  NASDAQ 100
                </button>
                <button
                  onClick={() => setActiveHeatmap('djca')}
                  className={`px-3 py-1.5 rounded-lg font-black uppercase text-[9px] tracking-wider transition-all cursor-pointer ${
                    activeHeatmap === 'djca'
                      ? 'bg-primary/20 text-primary border border-primary/20 shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Dow Jones (DJCA)
                </button>
                <button
                  onClick={() => setActiveHeatmap('forex')}
                  className={`px-3 py-1.5 rounded-lg font-black uppercase text-[9px] tracking-wider transition-all cursor-pointer ${
                    activeHeatmap === 'forex'
                      ? 'bg-primary/20 text-primary border border-primary/20 shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Forex
                </button>
                <button
                  onClick={() => setActiveHeatmap('crypto')}
                  className={`px-3 py-1.5 rounded-lg font-black uppercase text-[9px] tracking-wider transition-all cursor-pointer ${
                    activeHeatmap === 'crypto'
                      ? 'bg-primary/20 text-primary border border-primary/20 shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Cripto
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-[550px]">
              <TradingViewWidget
                {...getHeatmapProps(activeHeatmap)}
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
              Mapa de Calor Global
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Flame className="text-orange-400" size={20} />
                    <h3 className="font-bold text-lg text-on-surface">Mapa Termográfico Global</h3>
                  </div>
                  
                  {/* Heatmap Type Toggle */}
                  <div className="flex bg-surface-container-low border border-outline-variant/10 rounded-xl p-1 gap-1 select-none shrink-0 self-start sm:self-auto">
                    <button
                      onClick={() => setActiveHeatmap('nasdaq')}
                      className={`px-3 py-1.5 rounded-lg font-black uppercase text-[10px] tracking-wider transition-all cursor-pointer ${
                        activeHeatmap === 'nasdaq'
                          ? 'bg-primary/10 text-primary border border-primary/25 shadow-sm'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      NASDAQ 100
                    </button>
                    <button
                      onClick={() => setActiveHeatmap('djca')}
                      className={`px-3 py-1.5 rounded-lg font-black uppercase text-[10px] tracking-wider transition-all cursor-pointer ${
                        activeHeatmap === 'djca'
                          ? 'bg-primary/10 text-primary border border-primary/25 shadow-sm'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      Dow Jones
                    </button>
                    <button
                      onClick={() => setActiveHeatmap('forex')}
                      className={`px-3 py-1.5 rounded-lg font-black uppercase text-[10px] tracking-wider transition-all cursor-pointer ${
                        activeHeatmap === 'forex'
                          ? 'bg-primary/10 text-primary border border-primary/25 shadow-sm'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      Forex / Moedas
                    </button>
                    <button
                      onClick={() => setActiveHeatmap('crypto')}
                      className={`px-3 py-1.5 rounded-lg font-black uppercase text-[10px] tracking-wider transition-all cursor-pointer ${
                        activeHeatmap === 'crypto'
                          ? 'bg-primary/10 text-primary border border-primary/25 shadow-sm'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      Criptomoedas
                    </button>
                  </div>
                </div>
                <div className="flex-1 min-h-[550px]">
                  <TradingViewWidget
                    {...getHeatmapProps(activeHeatmap)}
                    height="580px"
                  />
                </div>
              </div>
            )}

            {activeTab === 'technical' && (
              <div className="flex-1 flex flex-col space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Gauge className="text-purple-400" size={20} />
                    <h3 className="font-bold text-lg text-on-surface">Medidores Rápidos de Tendência Técnica</h3>
                  </div>

                  {/* Symbol Selector */}
                  <div className="flex flex-wrap bg-surface-container-low border border-outline-variant/10 rounded-xl p-1 gap-1 select-none shrink-0 self-start lg:self-auto">
                    {technicalSymbols.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setTechnicalSymbol(s.id)}
                        className={`px-3 py-1.5 rounded-lg font-bold uppercase text-[10px] tracking-wider transition-all cursor-pointer ${
                          technicalSymbol === s.id
                            ? 'bg-primary/10 text-primary border border-primary/25 shadow-sm'
                            : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 min-h-[550px]">
                  <TradingViewWidget
                    widgetType="technical-analysis"
                    config={getTechnicalConfig(technicalSymbol)}
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
          </div>

        </div>
      )}

    </div>
  );
}

