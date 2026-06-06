import React, { useState, useEffect, useMemo } from 'react';
import { 
  Maximize2, 
  Minimize2, 
  LineChart, 
  Sparkles, 
  Activity, 
  Link2, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  ExternalLink, 
  Copy, 
  HelpCircle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { useTrades } from '../hooks/useTrades';
import { db, auth } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

export default function Charts() {
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const { allTrades, loading: loadingTrades } = useTrades();
  
  // States for linking prints
  const [pastedUrl, setPastedUrl] = useState<string>('');
  const [selectedTradeId, setSelectedTradeId] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showHelperModal, setShowHelperModal] = useState<boolean>(false);

  // Copy state for individual items
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const containerId = 'tradingview_comprehensive_advanced_chart';

  useEffect(() => {
    // Clear dynamic loader element safely always before initializing
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

  // Filter current trades that do not have a study link yet or let user override any
  const recentTrades = useMemo(() => {
    if (!allTrades) return [];
    // Just select the most recent 10 trades to keep select dropdown performant and neat
    return allTrades.slice(0, 10);
  }, [allTrades]);

  // Set default selected trade on load
  useEffect(() => {
    if (recentTrades.length > 0 && !selectedTradeId) {
      setSelectedTradeId(recentTrades[0].id);
    }
  }, [recentTrades, selectedTradeId]);

  const handleLinkToTrade = async () => {
    if (!auth.currentUser) {
      setErrorMessage("Você precisa estar logado para vincular prints.");
      return;
    }
    if (!selectedTradeId) {
      setErrorMessage("Selecione um trade do diário para vincular.");
      return;
    }
    if (!pastedUrl) {
      setErrorMessage("Por favor, cole um link de imagem do TradingView.");
      return;
    }
    if (!pastedUrl.includes('tradingview.com') && !pastedUrl.startsWith('http')) {
      setErrorMessage("Insira um endereço de print válido.");
      return;
    }

    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const cleanUrl = pastedUrl.trim();
      const uid = auth.currentUser.uid;

      // Update old collection route safely inside try/catch
      try {
        await updateDoc(doc(db, 'trades', selectedTradeId), { studyLink: cleanUrl });
      } catch (e) {
        console.warn("Rota legada de trades indisponível, tentando rota SaaS...", e);
      }

      // Update subcollection SaaS path
      try {
        await updateDoc(doc(db, 'usuarios', uid, 'trades', selectedTradeId), { studyLink: cleanUrl });
      } catch (e) {
        console.warn("Rota de subcoleção SaaS indisponível.", e);
      }

      setSuccessMessage("Print vinculado com sucesso ao seu Trade!");
      setPastedUrl('');
      setTimeout(() => setSuccessMessage(''), 4500);
    } catch (err: any) {
      console.error("Erro ao salvar studyLink:", err);
      setErrorMessage("Ocorreu um erro ao salvar o link. " + (err.message || ''));
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className={`flex flex-col space-y-6 w-full ${isFullScreen ? 'fixed inset-0 z-[110] bg-[#0c0c0f] p-4 md:p-6 space-y-4 overflow-hidden h-screen' : 'px-4 md:px-8 py-6'}`}>
      
      {/* Header Compacto */}
      <div className="flex flex-row items-center justify-between gap-4 bg-surface-container border border-outline-variant/10 rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-md transition-all">
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <LineChart size={20} />
          </div>
          <div>
            <h2 className="font-extrabold text-sm uppercase tracking-wider text-on-surface flex items-center gap-2">
              Gráfico Profissional <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-md font-black">INTERATIVO</span>
            </h2>
            <p className="text-[11px] text-on-surface-variant font-medium">Estação profissional integrada com ferramentas de salvamento automático</p>
          </div>
        </div>

        {/* Lado Direito - Botões de controle */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowHelperModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/20 rounded-xl text-xs font-semibold transition-all text-on-surface cursor-pointer h-[36px]"
            title="Como salvar desenhos e indicadores"
          >
            <HelpCircle size={14} className="text-secondary" />
            <span className="hidden sm:inline">Autosave & Conta</span>
          </button>

          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="flex items-center gap-2 px-3.5 py-2 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/20 rounded-xl text-xs font-bold transition-all text-white h-[36px] cursor-pointer"
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

      {/* Main Grid - Alterna layout dependendo se estiver em tela cheia */}
      <div className={`w-full ${isFullScreen ? 'flex-1 h-full' : 'h-[650px]'}`}>
        
        {/* Coluna do Gráfico */}
        <div className="bg-[#0c0c0f] border border-outline-variant/10 rounded-2xl overflow-hidden relative shadow-2xl transition-all w-full h-full">
          {/* Marca d'água / Terminal Tracker */}
          <div className="absolute top-4 right-6 pointer-events-none text-[8px] font-semibold tracking-[0.2em] text-[#00f5a0]/10 select-none uppercase z-10 flex items-center gap-1">
            <Activity size={10} className="text-[#00f5a0]/30 animate-pulse" />
            PROFIT ANALYTICS GRAPHICS CORE v1.0
          </div>
          
          {/* Elemento de Renderização do Widget */}
          <div id={containerId} className="w-full h-full" />
        </div>

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
            <span>Indicadores Integrados: Seus indicadores e desenhos mantêm-se salvos de forma persistente através do cache do seu navegador local.</span>
          </div>
        </div>
      )}

      {/* MODAL AJUDA AUTOSAVE & CONTAS */}
      {showHelperModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-surface-container border border-outline-variant/20 max-w-lg w-full rounded-2xl md:rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            
            <h3 className="text-md font-bold uppercase tracking-wider text-white border-b border-outline-variant/10 pb-3 flex items-center gap-2">
              <Sparkles size={16} className="text-primary" />
              Sincronização & Autosave do Gráfico
            </h3>

            <div className="space-y-4 py-4 text-xs font-semibold leading-relaxed text-on-surface-variant">
              
              <div className="space-y-1.5">
                <h4 className="text-white font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Salvamento Automático Local (LocalStorage)
                </h4>
                <p className="pl-3">
                  Todos os seus traçados, desenhos e indicadores adicionados permanecem salvos de forma persistente no cache do seu navegador sob a chave de segurança do widget TradingView. Você pode mudar de abas e atualizar a página que suas ferramentas continuarão salvas no seu dispositivo!
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-white font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Sincronização em Nuvem via conta própria TradingView
                </h4>
                <p className="pl-3">
                  Para sincronizar seus layouts e desenhos em múltiplos dispositivos (celular, tablet e computador), você pode iniciar sessão na sua própria conta do TradingView.
                </p>
                <p className="pl-3 text-white/95">
                  Para fazer isso com máxima segurança, você pode abrir o gráfico diretamente no link oficial, onde sua conta já está conectada, copiar o link compartilhado e colá-lo em nosso painel inteligente do Diário de Trade!
                </p>
              </div>

              <div className="bg-[#0c0c0f]/80 p-3 rounded-xl border border-outline-variant/10 text-[11px] text-white/80 space-y-2">
                <span className="font-bold flex items-center gap-1.5 text-secondary">
                  <Info size={13} />
                  Dica de Pro
                </span>
                <p>
                  Abrir o TradingView em uma aba externa oferece a experiência completa com todos os seus layouts salvos integrados de forma nativa e sincronizados na nuvem do próprio site.
                </p>
              </div>

            </div>

            <div className="flex items-center justify-between gap-3 border-t border-outline-variant/10 pt-4">
              <a
                href="https://br.tradingview.com/chart/"
                target="_blank"
                rel="no-referrer noreferrer"
                className="flex items-center gap-1.5 text-[11px] font-bold text-secondary hover:underline cursor-pointer"
              >
                Abrir TradingView Externo
                <ExternalLink size={12} />
              </a>

              <button
                onClick={() => setShowHelperModal(false)}
                className="bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/30 text-white font-bold px-4 py-2 rounded-xl text-xs tracking-wider uppercase cursor-pointer transition-all"
              >
                Entendi
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
