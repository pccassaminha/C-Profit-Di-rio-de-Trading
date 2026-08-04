import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, ShieldCheck, Zap, TrendingUp, Wallet, ArrowRight, CheckCircle2, Globe, BarChart3, Lock, X } from 'lucide-react';
import Plans from './Plans';

interface LandingProps {
  onLoginClick: () => void;
  onRegisterClick: (planId?: string, couponCode?: string) => void;
  onNavigate?: (page: string) => void;
}

export default function Landing({ onLoginClick, onRegisterClick, onNavigate }: LandingProps) {
  const [activePreviewTab, setActivePreviewTab] = useState<'dashboard' | 'diario' | 'psicologia' | 'planeador'>('dashboard');
  const [couponCopied, setCouponCopied] = useState(false);
  const [showPromoPopup, setShowPromoPopup] = useState(false);
  const [popupCopied, setPopupCopied] = useState(false);

  useEffect(() => {
    const hasSeen = sessionStorage.getItem('promo_popup_seen');
    if (!hasSeen) {
      const timer = setTimeout(() => {
        setShowPromoPopup(true);
      }, 120000); // 2 minutos (120.000 ms) para permitir exploração prévia
      return () => clearTimeout(timer);
    }
  }, []);

  const closePromoPopup = () => {
    setShowPromoPopup(false);
    sessionStorage.setItem('promo_popup_seen', 'true');
  };

  const copyPopupCoupon = () => {
    navigator.clipboard.writeText('CPROFIT83%OFF');
    setPopupCopied(true);
    setTimeout(() => {
      setPopupCopied(false);
    }, 3000);
  };

  const copyCouponCode = () => {
    navigator.clipboard.writeText('CPROFIT83%OFF');
    setCouponCopied(true);
    setTimeout(() => {
      setCouponCopied(false);
    }, 3000);
  };
  return (
    <div className="min-h-screen bg-background text-on-surface font-body overflow-x-hidden">
      <div className="noise-overlay"></div>
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-[5%] h-[100px] bg-background/85 backdrop-blur-[20px] border-b border-outline">
        <a href="#" onClick={(e) => {e.preventDefault(); window.scrollTo(0,0)}} className="flex items-center gap-2 md:gap-[16px] text-none hover:opacity-90 transition-opacity shrink-0">
          <img src="https://i.postimg.cc/v8qJ6KTk/C-profit.png" alt="C Logo" className="h-[32px] md:h-[44px] drop-shadow-md rounded-[8px]" />
          <span className="font-headline text-[18px] md:text-[22px] font-extrabold text-on-surface tracking-tight uppercase">Profit</span>
        </a>
        <ul className="hidden lg:flex items-center gap-[36px] list-none">
          <li><a href="#recursos" className="text-[13px] font-medium tracking-[0.08em] uppercase text-on-surface-variant hover:text-primary transition-colors">Recursos</a></li>
          <li><a href="#planos" className="text-[13px] font-medium tracking-[0.08em] uppercase text-on-surface-variant hover:text-primary transition-colors">Planos</a></li>
          <li><a href="#sobre" className="text-[13px] font-medium tracking-[0.08em] uppercase text-on-surface-variant hover:text-primary transition-colors">Sobre</a></li>
          <li><a href="#afiliados" className="text-[13px] font-medium tracking-[0.08em] uppercase text-[#00f5a0] hover:text-[#00f5a0]/80 transition-colors">Afiliados</a></li>
        </ul>
        <div className="flex items-center gap-3 md:gap-[16px] shrink-0">
          <button onClick={onLoginClick} className="bg-transparent border-none text-on-surface-variant font-body text-[13px] md:text-[14px] font-medium cursor-pointer hover:text-on-surface transition-colors">Entrar</button>
          <button onClick={() => onRegisterClick()} className="bg-primary text-on-primary border-none py-2 px-3 md:py-[10px] md:px-[22px] rounded-[8px] font-body text-[11px] md:text-[13px] font-bold tracking-[0.06em] uppercase cursor-pointer transition-all hover:bg-primary-fixed-dim hover:-translate-y-[1px] hover:shadow-[0_8px_30px_rgba(0,245,160,0.3)] whitespace-nowrap">
            <span className="sm:hidden">Começar</span>
            <span className="hidden sm:inline">Começar Agora</span>
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-[5%] pt-[140px] pb-[80px] overflow-hidden">
        <div className="grid-bg"></div>
        <div className="hero-glow"></div>
        <div className="hero-glow2"></div>

        <div className="inline-flex items-center gap-[8px] px-[16px] py-[6px] rounded-[100px] border border-primary/30 bg-primary/5 text-[12px] font-medium tracking-[0.1em] uppercase text-primary mb-[32px] animate-in slide-in-from-bottom-4 duration-700">
          <div className="w-[6px] h-[6px] rounded-full bg-primary animate-pulse-dot"></div>
          O Terminal Definitivo
        </div>

        <h1 className="font-headline text-[clamp(48px,7vw,96px)] font-extrabold leading-[0.95] tracking-[-0.03em] text-on-surface mb-[28px] relative animate-in slide-in-from-bottom-6 duration-700 delay-100 fill-mode-both">
          Domine o
          <span className="block text-primary">mercado</span>
          <span className="block text-transparent" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.2)' }}>com dados precisos.</span>
        </h1>

        <p className="max-w-[560px] text-[17px] text-on-surface-variant leading-[1.7] mb-[48px] animate-in slide-in-from-bottom-6 duration-700 delay-200 fill-mode-both">
          O diário de trading definitivo para <strong className="text-on-surface font-bold">Forex, Índices e Opções Binárias</strong>. Registe-se agora e <strong className="text-primary font-black uppercase bg-primary/10 px-2 py-0.5 rounded-md inline-block">inicie gratuitamente o seu diário de trades</strong> para explorar a plataforma!
        </p>

        <div className="flex items-center gap-[24px] flex-wrap justify-center animate-in slide-in-from-bottom-6 duration-700 delay-300 fill-mode-both">
          <button onClick={() => onRegisterClick()} className="bg-primary text-on-primary border-none py-[16px] px-[36px] rounded-[10px] font-headline text-[14px] font-bold tracking-[0.08em] uppercase cursor-pointer transition-all inline-flex items-center gap-[10px] hover:bg-primary-fixed-dim hover:-translate-y-[2px] hover:shadow-[0_12px_40px_rgba(0,245,160,0.35)] group">
            Criar Conta Agora
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="transition-transform group-hover:translate-x-[3px]">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="flex items-center gap-[12px] text-[14px] text-on-surface-variant">
            <div className="flex">
              <div className="w-[32px] h-[32px] rounded-full border-2 border-background ml-0 flex items-center justify-center text-[11px] font-bold bg-gradient-to-br from-[#4facfe] to-[#00f2fe] text-background">JR</div>
              <div className="w-[32px] h-[32px] rounded-full border-2 border-background -ml-[8px] flex items-center justify-center text-[11px] font-bold bg-gradient-to-br from-[#f093fb] to-[#f5576c] text-background">MT</div>
              <div className="w-[32px] h-[32px] rounded-full border-2 border-background -ml-[8px] flex items-center justify-center text-[11px] font-bold bg-gradient-to-br from-[#43e97b] to-[#38f9d7] text-background">PL</div>
              <div className="w-[32px] h-[32px] rounded-full border-2 border-background -ml-[8px] flex items-center justify-center text-[11px] font-bold bg-gradient-to-br from-[#fa709a] to-[#fee140] text-background">KA</div>
            </div>
            +2.400 traders ativos
          </div>
        </div>
      </section>

      {/* Ticker */}
      <div className="w-full overflow-hidden py-[20px] border-y border-outline bg-surface-container-lowest mt-[80px]">
        <div className="ticker-track">
          {[...Array(2)].map((_, i) => (
            <React.Fragment key={i}>
              <span className="flex items-center gap-[12px] text-[13px] font-medium tracking-[0.06em] uppercase text-on-surface-variant/70"><span className="w-[4px] h-[4px] rounded-full bg-primary/50 shrink-0"></span>Forex</span>
              <span className="flex items-center gap-[12px] text-[13px] font-medium tracking-[0.06em] uppercase text-on-surface-variant/70"><span className="w-[4px] h-[4px] rounded-full bg-primary/50 shrink-0"></span>Índices Globais</span>
              <span className="flex items-center gap-[12px] text-[13px] font-medium tracking-[0.06em] uppercase text-on-surface-variant/70"><span className="w-[4px] h-[4px] rounded-full bg-primary/50 shrink-0"></span>Opções Binárias</span>
              <span className="flex items-center gap-[12px] text-[13px] font-medium tracking-[0.06em] uppercase text-on-surface-variant/70"><span className="w-[4px] h-[4px] rounded-full bg-primary/50 shrink-0"></span>Trade Journaling</span>
              <span className="flex items-center gap-[12px] text-[13px] font-medium tracking-[0.06em] uppercase text-on-surface-variant/70"><span className="w-[4px] h-[4px] rounded-full bg-primary/50 shrink-0"></span>Advanced Analytics</span>
              <span className="flex items-center gap-[12px] text-[13px] font-medium tracking-[0.06em] uppercase text-on-surface-variant/70"><span className="w-[4px] h-[4px] rounded-full bg-primary/50 shrink-0"></span>Market Intel</span>
              <span className="flex items-center gap-[12px] text-[13px] font-medium tracking-[0.06em] uppercase text-on-surface-variant/70"><span className="w-[4px] h-[4px] rounded-full bg-primary/50 shrink-0"></span>Sincronização MT5</span>
              <span className="flex items-center gap-[12px] text-[13px] font-medium tracking-[0.06em] uppercase text-on-surface-variant/70"><span className="w-[4px] h-[4px] rounded-full bg-primary/50 shrink-0"></span>Sharpe Ratio</span>
              <span className="flex items-center gap-[12px] text-[13px] font-medium tracking-[0.06em] uppercase text-on-surface-variant/70"><span className="w-[4px] h-[4px] rounded-full bg-primary/50 shrink-0"></span>Winrate Automático</span>
              <span className="flex items-center gap-[12px] text-[13px] font-medium tracking-[0.06em] uppercase text-on-surface-variant/70"><span className="w-[4px] h-[4px] rounded-full bg-primary/50 shrink-0"></span>Exportação PDF</span>
              <span className="flex items-center gap-[12px] text-[13px] font-medium tracking-[0.06em] uppercase text-on-surface-variant/70"><span className="w-[4px] h-[4px] rounded-full bg-primary/50 shrink-0"></span>Comunidade Exclusiva</span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="px-[5%] py-[80px] grid grid-cols-2 md:grid-cols-4 gap-[2px] bg-outline border-y border-outline relative z-10">
        <div className="bg-surface-container-lowest py-[40px] px-[32px] text-center">
          <div className="font-headline text-[48px] font-extrabold tracking-[-0.03em] text-primary leading-none mb-[8px]">$1.2B<span className="text-secondary">+</span></div>
          <div className="text-[12px] font-medium tracking-[0.1em] uppercase text-on-surface-variant/70">Volume Trackeado</div>
        </div>
        <div className="bg-surface-container-lowest py-[40px] px-[32px] text-center">
          <div className="font-headline text-[48px] font-extrabold tracking-[-0.03em] text-primary leading-none mb-[8px]">98<span className="text-secondary">%</span></div>
          <div className="text-[12px] font-medium tracking-[0.1em] uppercase text-on-surface-variant/70">Uptime Garantido</div>
        </div>
        <div className="bg-surface-container-lowest py-[40px] px-[32px] text-center">
          <div className="font-headline text-[48px] font-extrabold tracking-[-0.03em] text-primary leading-none mb-[8px]">15<span className="text-secondary">k+</span></div>
          <div className="text-[12px] font-medium tracking-[0.1em] uppercase text-on-surface-variant/70">Trades Diários</div>
        </div>
        <div className="bg-surface-container-lowest py-[40px] px-[32px] text-center">
          <div className="font-headline text-[48px] font-extrabold tracking-[-0.03em] text-primary leading-none mb-[8px]">0.1<span className="text-secondary">s</span></div>
          <div className="text-[12px] font-medium tracking-[0.1em] uppercase text-on-surface-variant/70">Latência de Dados</div>
        </div>
      </div>

      {/* Features */}
      <section id="recursos" className="px-[5%] py-[120px] relative z-10">
        <div className="inline-block text-[11px] font-bold tracking-[0.15em] uppercase text-primary mb-[16px]">Recursos</div>
        <h2 className="font-headline text-[clamp(36px,4vw,56px)] font-extrabold leading-none tracking-[-0.02em] mb-[16px]">Tudo que um trader<br/><em className="italic text-on-surface-variant font-normal">sério precisa.</em></h2>
        <p className="text-[16px] text-on-surface-variant max-w-[480px] mb-[60px]">Ferramentas construídas por traders, para traders que levam sua performance a sério.</p>

        <div className="flex gap-[12px] mb-[48px] flex-wrap">
          <div className="flex items-center gap-[8px] px-[20px] py-[10px] rounded-[100px] border border-primary/20 bg-primary/5 text-[13px] font-semibold text-primary">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
            Forex
          </div>
          <div className="flex items-center gap-[8px] px-[20px] py-[10px] rounded-[100px] border border-secondary/20 bg-secondary/5 text-[13px] font-semibold text-secondary">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10z"/></svg>
            Índices Globais
          </div>
          <div className="flex items-center gap-[8px] px-[20px] py-[10px] rounded-[100px] border border-warning/20 bg-warning/5 text-[13px] font-semibold text-warning">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
            Opções Binárias
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-[1px] bg-outline border border-outline rounded-[16px] overflow-hidden">
          <div className="bg-surface-container p-[48px_40px] relative transition-colors hover:bg-surface-container-high group">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
            <div className="w-[52px] h-[52px] rounded-[10px] bg-primary/10 border border-primary/20 flex items-center justify-center mb-[24px] text-primary">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 16l4-4 4 4"/><path d="M7 8h.01M11 8h6"/></svg>
            </div>
            <div className="font-headline text-[18px] font-bold tracking-[-0.01em] mb-[12px]">Trade Journaling</div>
            <p className="text-[14px] text-on-surface-variant leading-[1.7]">Registro detalhado de cada operação com tags, sentimentos, capturas de tela e contexto macro para revisão constante.</p>
            <span className="inline-block mt-[20px] text-[11px] font-semibold tracking-[0.08em] uppercase text-primary px-[10px] py-[4px] rounded-[4px] bg-primary/10">Core</span>
          </div>

          <div className="bg-surface-container p-[48px_40px] relative transition-colors hover:bg-surface-container-high group">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
            <div className="w-[52px] h-[52px] rounded-[10px] bg-secondary/10 border border-secondary/20 flex items-center justify-center mb-[24px] text-secondary">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
            </div>
            <div className="font-headline text-[18px] font-bold tracking-[-0.01em] mb-[12px]">Advanced Analytics</div>
            <p className="text-[14px] text-on-surface-variant leading-[1.7]">Cálculos automáticos de Winrate, Profit Factor, Sharpe Ratio e Drawdown para entender seu real desempenho com precisão.</p>
            <span className="inline-block mt-[20px] text-[11px] font-semibold tracking-[0.08em] uppercase text-secondary px-[10px] py-[4px] rounded-[4px] bg-secondary/10">Analytics</span>
          </div>

          <div className="bg-surface-container p-[48px_40px] relative transition-colors hover:bg-surface-container-high group">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
            <div className="w-[52px] h-[52px] rounded-[10px] bg-primary/10 border border-primary/20 flex items-center justify-center mb-[24px] text-primary">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            </div>
            <div className="font-headline text-[18px] font-bold tracking-[-0.01em] mb-[12px]">Market Intel</div>
            <p className="text-[14px] text-on-surface-variant leading-[1.7]">Mantenha seus planos semanais e notas diárias organizados para nunca perder um contexto macro importante das suas operações.</p>
            <span className="inline-block mt-[20px] text-[11px] font-semibold tracking-[0.08em] uppercase text-primary px-[10px] py-[4px] rounded-[4px] bg-primary/10">Inteligência</span>
          </div>

          <div className="bg-surface-container p-[48px_40px] relative transition-colors hover:bg-surface-container-high group">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
            <div className="w-[52px] h-[52px] rounded-[10px] bg-secondary/10 border border-secondary/20 flex items-center justify-center mb-[24px] text-secondary">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </div>
            <div className="font-headline text-[18px] font-bold tracking-[-0.01em] mb-[12px]">Importação Múltipla</div>
            <p className="text-[14px] text-on-surface-variant leading-[1.7]">Importe seus trades via <strong className="text-on-surface font-semibold">MT5, HTML e CSV</strong>. Compatível com os principais brokers. Zero trabalho manual, histórico completo em segundos.</p>
            <div className="flex gap-[6px] mt-[18px] flex-wrap">
              <span className="text-[10px] font-bold tracking-[0.08em] px-[9px] py-[3px] rounded-[4px] bg-secondary/10 text-secondary border border-secondary/20">MT5</span>
              <span className="text-[10px] font-bold tracking-[0.08em] px-[9px] py-[3px] rounded-[4px] bg-secondary/10 text-secondary border border-secondary/20">HTML</span>
              <span className="text-[10px] font-bold tracking-[0.08em] px-[9px] py-[3px] rounded-[4px] bg-secondary/10 text-secondary border border-secondary/20">CSV</span>
            </div>
          </div>

          <div className="bg-surface-container p-[48px_40px] relative transition-colors hover:bg-surface-container-high group">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
            <div className="w-[52px] h-[52px] rounded-[10px] bg-primary/10 border border-primary/20 flex items-center justify-center mb-[24px] text-primary">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            </div>
            <div className="font-headline text-[18px] font-bold tracking-[-0.01em] mb-[12px]">Relatórios PDF</div>
            <p className="text-[14px] text-on-surface-variant leading-[1.7]">Exporte relatórios completos de performance em PDF para análise offline, mentoria ou apresentação para investidores.</p>
            <span className="inline-block mt-[20px] text-[11px] font-semibold tracking-[0.08em] uppercase text-primary px-[10px] py-[4px] rounded-[4px] bg-primary/10">Exportação</span>
          </div>

          <div className="bg-surface-container p-[48px_40px] relative transition-colors hover:bg-surface-container-high group">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
            <div className="w-[52px] h-[52px] rounded-[10px] bg-secondary/10 border border-secondary/20 flex items-center justify-center mb-[24px] text-secondary">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <div className="font-headline text-[18px] font-bold tracking-[-0.01em] mb-[12px]">Comunidade de Traders</div>
            <p className="text-[14px] text-on-surface-variant leading-[1.7]">Acesse uma comunidade exclusiva dentro da plataforma. Troque análises, tire dúvidas e evolua junto com outros traders sérios.</p>
            <span className="inline-block mt-[20px] text-[11px] font-semibold tracking-[0.08em] uppercase text-secondary px-[10px] py-[4px] rounded-[4px] bg-secondary/10">Comunidade</span>
          </div>

          <div className="md:col-span-3 bg-gradient-to-br from-[#00f5a0]/10 via-surface-container to-surface-container-high p-[48px_40px] relative transition-colors hover:bg-surface-container-high group border-t border-[#00f5a0]/20">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00f5a0] to-transparent opacity-50"></div>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="space-y-4 max-w-2xl">
                <div className="w-[52px] h-[52px] rounded-[10px] bg-[#00f5a0]/10 border border-[#00f5a0]/20 flex items-center justify-center text-[#00f5a0]">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10z"/><path d="M2 12h20"/><circle cx="12" cy="12" r="4"/><path d="M12 8v8"/></svg>
                </div>
                <div>
                  <span className="inline-block mb-2 text-[10px] font-black tracking-[0.15em] uppercase text-[#00f5a0] px-[12px] py-[4px] rounded-full bg-[#00f5a0]/10 border border-[#00f5a0]/20 animate-pulse">
                    NOVO RECURSO INTEGRADO!
                  </span>
                  <div className="font-headline text-[22px] font-black tracking-[-0.02em] text-white">
                    Panorama Económico Global & Calendário em Tempo Real
                  </div>
                </div>
                <p className="text-[14px] text-on-surface-variant leading-[1.7]">
                  Obtenha uma visão macro completa do mercado sem sair do seu terminal. Acompanhe o <strong className="text-white">Calendário Económico Geral de Eventos</strong> de alta importância com relevância por país, monitore <strong className="text-white">Mapas de Calor FX, Cripto e de Ações (NASDAQ 100 & Dow Jones)</strong> e consulte <strong className="text-white">Medidores Rápidos de Tendência Técnica (Termómetros)</strong> para obter dados quantitativos na ponta dos seus dedos.
                </p>
                <div className="flex flex-wrap gap-4 pt-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-on-surface-variant">
                    <span className="text-[#00f5a0] text-sm">✓</span> Calendário Económico Geral
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-on-surface-variant">
                    <span className="text-[#00f5a0] text-sm">✓</span> Termómetros FX & Cripto
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-on-surface-variant">
                    <span className="text-[#00f5a0] text-sm">✓</span> Mapas de Calor Setorizados
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-[#00f5a0]">
                    <span className="text-sm">✓</span> Grátis em TODOS os Planos!
                  </div>
                </div>
              </div>
              <div className="bg-[#00f5a0]/5 border border-[#00f5a0]/15 p-6 rounded-2xl flex flex-col items-center justify-center text-center max-w-xs shrink-0 self-stretch lg:self-auto">
                <span className="text-3xl mb-2">🌍</span>
                <span className="font-headline text-xs font-black uppercase text-[#00f5a0] tracking-widest mb-1">Acesso Irrestrito</span>
                <p className="text-[11px] text-on-surface-variant/80 font-medium">Disponível de forma 100% gratuita para todas as nossas licenças e assinaturas de forma direta.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="px-[5%] pb-[120px] relative z-10">
        <div className="text-center mb-[48px]">
          <div className="inline-block text-[11px] font-bold tracking-[0.15em] uppercase text-primary mb-[16px]">Plataforma</div>
          <h2 className="font-headline text-[clamp(36px,4vw,56px)] font-extrabold leading-none tracking-[-0.02em] text-center">
            Conheça o <em className="italic text-on-surface-variant font-normal">seu terminal de trading</em>
          </h2>
          <p className="text-xs text-on-surface-variant max-w-xl mx-auto mt-3 font-medium">
            Navegue pelos módulos internos e veja como a nossa estrutura organiza os seus trades com dados matematicamente comprováveis e 100% positivos!
          </p>
        </div>

        {/* Tab selection indicators */}
        <div className="flex flex-wrap justify-center gap-2 mb-8 select-none">
          <button 
            onClick={() => setActivePreviewTab('dashboard')} 
            className={`px-5 py-3 rounded-2xl border text-xs uppercase font-black tracking-widest transition-all ${activePreviewTab === 'dashboard' ? 'bg-[#00f5a0] text-background border-[#00f5a0] shadow-xl shadow-[#00f5a0]/15' : 'bg-surface-container border-outline-variant/15 text-on-surface-variant hover:text-white hover:border-outline-variant/40'}`}
          >
            📊 Dashboard Analítico
          </button>
          <button 
            onClick={() => setActivePreviewTab('diario')} 
            className={`px-5 py-3 rounded-2xl border text-xs uppercase font-black tracking-widest transition-all ${activePreviewTab === 'diario' ? 'bg-[#00f5a0] text-background border-[#00f5a0] shadow-xl shadow-[#00f5a0]/15' : 'bg-surface-container border-outline-variant/15 text-on-surface-variant hover:text-white hover:border-outline-variant/40'}`}
          >
            📓 Diário de Trades
          </button>
          <button 
            onClick={() => setActivePreviewTab('psicologia')} 
            className={`px-5 py-3 rounded-2xl border text-xs uppercase font-black tracking-widest transition-all ${activePreviewTab === 'psicologia' ? 'bg-[#00f5a0] text-background border-[#00f5a0] shadow-xl shadow-[#00f5a0]/15' : 'bg-surface-container border-outline-variant/15 text-on-surface-variant hover:text-white hover:border-outline-variant/40'}`}
          >
            🧠 Controlo Psicológico
          </button>
          <button 
            onClick={() => setActivePreviewTab('planeador')} 
            className={`px-5 py-3 rounded-2xl border text-xs uppercase font-black tracking-widest transition-all ${activePreviewTab === 'planeador' ? 'bg-[#00f5a0] text-background border-[#00f5a0] shadow-xl shadow-[#00f5a0]/15' : 'bg-surface-container border-outline-variant/15 text-on-surface-variant hover:text-white hover:border-outline-variant/40'}`}
          >
            📅 Planeador Diário
          </button>
        </div>

        {/* Display Panel */}
        <div className="rounded-[24px] border border-outline-variant/20 overflow-hidden bg-surface-container-low shadow-[0_40px_120px_rgba(0,0,0,0.65),0_0_0_1px_rgba(0,245,160,0.05)] relative">
          <div className="bg-surface-container-lowest border-b border-outline/10 p-[16px_24px] flex items-center justify-between gap-[12px]">
            <div className="flex gap-[6px]">
              <div className="w-[10px] h-[10px] rounded-full bg-[#ff5f57]"></div>
              <div className="w-[10px] h-[10px] rounded-full bg-[#febc2e]"></div>
              <div className="w-[10px] h-[10px] rounded-full bg-[#28c840]"></div>
            </div>
            <div className="flex-1 max-w-sm bg-white/5 rounded-[8px] p-[6px_14px] text-[11px] text-[#00f5a0]/80 font-mono text-center border border-outline-variant/5">
              cprofit.app/app/{activePreviewTab}
            </div>
            <span className="text-[10px] font-mono font-bold bg-[#00f5a0]/10 text-[#00f5a0] px-3 py-1 rounded border border-[#00f5a0]/20 hidden sm:inline-block animate-pulse">
              ● SESSÃO ACTIVADA
            </span>
          </div>

          <div className="p-6 md:p-8 min-h-[460px] bg-gradient-to-br from-surface-container-low to-surface-container-lowest text-left">
            {activePreviewTab === 'dashboard' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
                {/* Lateral helper list */}
                <div className="bg-surface-container-lowest rounded-2xl border border-outline/10 p-5 space-y-4">
                  <h4 className="text-xs font-black uppercase text-[#00f5a0] tracking-widest">Painel Analítico de Risco</h4>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed">
                    A análise de performance calcula em tempo real o fator de drawdown, rácio de Sharpe e retorno sobre contas conectadas.
                  </p>
                  <div className="p-4 bg-[#00f5a0]/5 border border-[#00f5a0]/10 rounded-xl space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-on-surface-variant">Rácio de Sharpe:</span>
                      <span className="text-white font-black font-mono">3.45 (Excelente)</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-on-surface-variant">Drawdown Máx:</span>
                      <span className="text-[#00f5a0] font-black font-mono">0.45%</span>
                    </div>
                  </div>
                </div>

                {/* Growth stats chart box */}
                <div className="bg-surface-container p-6 rounded-2xl border border-outline/10 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">Lucro Líquido Acumulado</p>
                      <h4 className="text-2xl font-black text-[#00f5a0] font-mono mt-1">+920.400 Kz</h4>
                    </div>
                    <span className="text-[10px] font-black uppercase bg-[#00f5a0]/10 text-[#00f5a0] px-2.5 py-1 rounded">Consistente</span>
                  </div>

                  {/* Simulated Recharts Line chart area */}
                  <div className="h-32 flex items-end justify-between pt-6 border-b border-outline-variant/10">
                    <div className="w-[10%] bg-[#00f5a0] rounded-t-sm" style={{ height: '30%' }}></div>
                    <div className="w-[10%] bg-[#00f5a0] rounded-t-sm" style={{ height: '45%' }}></div>
                    <div className="w-[10%] bg-[#00f5a0] rounded-t-sm" style={{ height: '40%' }}></div>
                    <div className="w-[10%] bg-[#00f5a0] rounded-t-sm" style={{ height: '65%' }}></div>
                    <div className="w-[10%] bg-[#00f5a0] rounded-t-sm" style={{ height: '58%' }}></div>
                    <div className="w-[10%] bg-[#00f5a0] rounded-t-sm" style={{ height: '85%' }}></div>
                    <div className="w-[10%] bg-[#00f5a0] rounded-t-sm" style={{ height: '78%' }}></div>
                    <div className="w-[10%] bg-[#00f5a0] rounded-t-sm" style={{ height: '100%' }}></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-on-surface-variant font-mono">
                    <span>Semana 1</span>
                    <span>Semana 2</span>
                    <span>Semana 3</span>
                    <span>Semana 4 (Hoje)</span>
                  </div>
                </div>

                {/* Live indicators list */}
                <div className="space-y-4">
                  <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline/10">
                    <p className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">Taxa de Acerto (Winrate)</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <h4 className="text-3xl font-black text-[#00f5a0] font-mono">78.5%</h4>
                      <span className="text-[11px] text-[#00f5a0] font-semibold">↑ +5.4% de melhoria</span>
                    </div>
                    <p className="text-[10px] text-on-surface-variant mt-2">Média global de 35 trades registados sob risco controlado.</p>
                  </div>

                  <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline/10">
                    <p className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">Fator de Lucro (Profit Factor)</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <h4 className="text-3xl font-black text-secondary font-mono">2.84</h4>
                      <span className="text-[11px] text-secondary font-semibold">Excecional</span>
                    </div>
                    <p className="text-[10px] text-on-surface-variant mt-2">Rácio ideal acima de 1.5, comprovando consistência matemática.</p>
                  </div>
                </div>
              </div>
            )}

            {activePreviewTab === 'diario' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
                {/* Description helper list */}
                <div className="bg-surface-container-lowest rounded-2xl border border-outline/10 p-5 space-y-4 lg:col-span-1">
                  <h4 className="text-xs font-black uppercase text-[#00f5a0] tracking-widest">Diário Fotográfico & Clássico</h4>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed">
                    Registe as suas entradas automaticamente ou de forma manual. Adicione links de imagens, anotações de sentimento do mercado e gatilhos técnicos.
                  </p>
                  <div className="p-4 bg-white/5 border border-outline-variant/10 rounded-xl">
                    <p className="text-[10px] font-black text-white uppercase tracking-wider mb-2">💡 Estatística de hoje:</p>
                    <p className="text-[11px] text-on-surface-variant leading-relaxed">
                      "Utilizou diários detalhados em 100% dos seus trades hoje, protegendo o seu capital contra o overtrading."
                    </p>
                  </div>
                </div>

                {/* Positive Trades visual list */}
                <div className="lg:col-span-2 space-y-3">
                  <h4 className="text-xs font-black uppercase text-on-surface-variant tracking-widest mb-2">Lista de Trades de Alta Performance</h4>
                  
                  {/* Trade 1 */}
                  <div className="bg-surface-container p-4 rounded-xl border border-outline/10 flex flex-col sm:flex-row justify-between sm:items-center gap-3 hover:border-[#00f5a0]/30 transition-all">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-emerald-500/10 text-emerald-400 font-extrabold px-2 py-0.5 rounded">GANHO (WIN)</span>
                        <span className="text-xs font-black text-white">EURUSD · Compra</span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant leading-relaxed">
                        <strong className="text-on-surface font-semibold">Gatilho técnico:</strong> Respeitou a zona de liquidez em M15. Retorno de risco 1:3 cumprido.
                      </p>
                      <div className="flex gap-2 text-[10px] text-on-surface-variant/70 font-mono">
                        <span>Lote: 0.50</span>
                        <span>·</span>
                        <span>Estado: 🟢 Calmo e Paciente</span>
                      </div>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <span className="text-base font-mono font-black text-[#00f5a0]">+124.500 Kz</span>
                    </div>
                  </div>

                  {/* Trade 2 */}
                  <div className="bg-surface-container p-4 rounded-xl border border-outline/10 flex flex-col sm:flex-row justify-between sm:items-center gap-3 hover:border-[#00f5a0]/30 transition-all">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-emerald-500/10 text-emerald-400 font-extrabold px-2 py-0.5 rounded">GANHO (WIN)</span>
                        <span className="text-xs font-black text-white">XAUUSD (Ouro) · Venda</span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant leading-relaxed">
                        <strong className="text-on-surface font-semibold">Gatilho técnico:</strong> Pullback perfeito após forte quebra estrutural na abertura de Nova Iorque.
                      </p>
                      <div className="flex gap-2 text-[10px] text-on-surface-variant/70 font-mono">
                        <span>Lote: 0.20</span>
                        <span>·</span>
                        <span>Estado: 🟢 Altamente Focado</span>
                      </div>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <span className="text-base font-mono font-black text-[#00f5a0]">+95.000 Kz</span>
                    </div>
                  </div>

                  {/* Trade 3 */}
                  <div className="bg-surface-container p-4 rounded-xl border border-outline/10 flex flex-col sm:flex-row justify-between sm:items-center gap-3 hover:border-[#00f5a0]/30 transition-all">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-emerald-500/10 text-emerald-400 font-extrabold px-2 py-0.5 rounded">GANHO (WIN)</span>
                        <span className="text-xs font-black text-white">GBPUSD · Compra</span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant leading-relaxed">
                        <strong className="text-on-surface font-semibold">Gatilho técnico:</strong> Rejeição de suporte psicológico com confirmação de volume no indicador.
                      </p>
                      <div className="flex gap-2 text-[10px] text-on-surface-variant/70 font-mono">
                        <span>Lote: 1.00</span>
                        <span>·</span>
                        <span>Estado: 🟢 Calmo e Disciplinado</span>
                      </div>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <span className="text-base font-mono font-black text-[#00f5a0]">+280.000 Kz</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activePreviewTab === 'psicologia' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
                {/* Psychology cards layout */}
                <div className="bg-surface-container-lowest rounded-xl border border-outline/10 p-5 space-y-4 lg:col-span-1">
                  <h4 className="text-xs font-black uppercase text-[#00f5a0] tracking-widest">Mapeamento Emocional</h4>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed">
                    Evite a indisciplina e o overtrading antes que afetem a sua banca. Descubra qual é o estado de espírito em que mais lucra.
                  </p>
                  <p className="text-[11px] text-on-surface-variant bg-white/5 p-3 rounded-lg border border-outline-variant/10">
                    💡 <strong className="text-white">Alerta de IA:</strong> "A sua taxa de ganho cresce <strong className="text-[#00f5a0]">72%</strong> quando se sente <strong className="text-white">Calmo</strong>. Posições abertas sob ansiedade registaram perdas menores hoje."
                  </p>
                </div>

                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Box 1 */}
                  <div className="bg-surface-container p-6 rounded-2xl border border-outline/10 space-y-4">
                    <h5 className="text-[11px] font-black uppercase tracking-widest text-[#00f5a0]">Métricas Emocionais Globais</h5>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-xs font-bold text-white mb-1.5">
                          <span>Calmo &amp; Sereno</span>
                          <span className="text-[#00f5a0]">85%</span>
                        </div>
                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-[#00f5a0] rounded-full" style={{ width: '85%' }}></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-bold text-white mb-1.5">
                          <span>Focado &amp; Paciente</span>
                          <span className="text-secondary">12%</span>
                        </div>
                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-secondary rounded-full" style={{ width: '12%' }}></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-bold text-white mb-1.5">
                          <span>Ansioso ou Impaciente</span>
                          <span className="text-red-400">3%</span>
                        </div>
                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-red-500 rounded-full" style={{ width: '3%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Box 2 */}
                  <div className="bg-surface-container p-6 rounded-2xl border border-outline/10 flex flex-col justify-between">
                    <div>
                      <h5 className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Erros Evitados (Filtros Psicológicos)</h5>
                      <p className="text-[11px] text-on-surface-variant leading-relaxed">
                        Defina gatilhos pré-trade que bloqueiam a sua conta se tentar operar fora do plano habitual de negociação.
                      </p>
                    </div>

                    <div className="space-y-2 mt-4">
                      <div className="flex items-center gap-2 p-2.5 bg-[#00f5a0]/5 border border-[#00f5a0]/15 rounded-xl text-[11px] text-[#00f5a0] font-bold">
                        <span className="text-base">🛡️</span> Bloqueio de Overtrading Ativo (0 violações)
                      </div>
                      <div className="flex items-center gap-2 p-2.5 bg-[#00f5a0]/5 border border-[#00f5a0]/15 rounded-xl text-[11px] text-[#00f5a0] font-bold">
                        <span className="text-base">🛡️</span> Filtro de Vingança contra o mercado: Zero Ativações
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activePreviewTab === 'planeador' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
                {/* Overview descriptions */}
                <div className="bg-surface-container-lowest rounded-xl border border-outline/10 p-5 space-y-4 lg:col-span-1">
                  <h4 className="text-xs font-black uppercase text-[#00f5a0] tracking-widest">Planeador de Metas Diárias</h4>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed">
                    Crie tarefas, estabeleça checklists rigorosas antes de iniciar a sua sessão no mercado e cumpra metas a curto prazo.
                  </p>
                  <div className="p-3 bg-white/5 border border-outline-variant/10 rounded-xl">
                    <p className="text-[10px] font-black uppercase text-white tracking-widest">Disciplina Actual:</p>
                    <p className="text-[13px] font-extrabold text-[#00f5a0] font-mono mt-1">CUMPRIMENTO 100%</p>
                    <p className="text-[10px] text-on-surface-variant mt-0.5">12 dias consecutivos dentro do plano.</p>
                  </div>
                </div>

                {/* Practical interactive items */}
                <div className="lg:col-span-2 space-y-4">
                  <h4 className="text-xs font-black uppercase text-on-surface-variant tracking-widest">Checklist de Consistência (Cumprido Hoje)</h4>
                  
                  <div className="space-y-2">
                    <div className="bg-surface-container p-3.5 rounded-xl border border-outline/10 flex items-center gap-3">
                      <div className="w-5 h-5 bg-[#00f5a0] text-background rounded-full flex items-center justify-center font-bold text-xs">✓</div>
                      <div>
                        <p className="text-xs font-bold text-white">Análise Económica no Calendário de Eventos</p>
                        <p className="text-[10px] text-on-surface-variant">Consultado às 07:30 antes do faturamento continental.</p>
                      </div>
                    </div>

                    <div className="bg-surface-container p-3.5 rounded-xl border border-outline/10 flex items-center gap-3">
                      <div className="w-5 h-5 bg-[#00f5a0] text-background rounded-full flex items-center justify-center font-bold text-xs">✓</div>
                      <div>
                        <p className="text-xs font-bold text-white">Definição Externa de Stop Loss Diário no MT5</p>
                        <p className="text-[10px] text-on-surface-variant">Protegendo o capital global contra movimentos rápidos.</p>
                      </div>
                    </div>

                    <div className="bg-surface-container p-3.5 rounded-xl border border-outline/10 flex items-center gap-3">
                      <div className="w-5 h-5 bg-[#00f5a0] text-background rounded-full flex items-center justify-center font-bold text-xs">✓</div>
                      <div>
                        <p className="text-xs font-bold text-white">Cumprimento de Risco Máximo de 1% por Operação</p>
                        <p className="text-[10px] text-on-surface-variant">Estabilidade matemática preservada. Sem pressa.</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-[#00f5a0]/5 border border-[#00f5a0]/15 rounded-xl flex items-center justify-between text-xs">
                    <span className="text-on-surface-variant font-medium">Drawdown Diário Restante:</span>
                    <span className="font-mono font-black text-[#00f5a0] bg-[#00f5a0]/10 px-3 py-1 rounded border border-[#00f5a0]/10">5.000 Kz (Intacto)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Sistema de Afiliados */}
      <section id="afiliados" className="px-[5%] py-[120px] relative z-10 border-t border-outline bg-gradient-to-b from-background to-surface-container-lowest/30 animate-in fade-in duration-300">
        <div className="absolute top-[20%] right-[-10%] w-[45%] h-[45%] bg-[#00f5a0]/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#00f5a0]/30 bg-[#00f5a0]/5 text-xs font-black uppercase tracking-widest text-[#00f5a0]">
              🎯 Sistema de Indicação &amp; Parcerias
            </div>
            <h2 className="font-headline text-[clamp(28px,4vw,48px)] font-extrabold tracking-[-0.02em] text-white">
              Ganhe Dinheiro com o <em className="italic text-[#00f5a0] font-normal">Nosso Sistema de Afiliados</em>
            </h2>
            <p className="text-sm text-on-surface-variant max-w-xl mx-auto leading-relaxed">
              Partilhe o Profit Terminal com a sua comunidade de traders e suba de nível para desbloquear comissões monetárias de até 30% pagas diretamente na sua conta bancária!
            </p>
          </div>

          {/* Highlight/Explanation Block */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="bg-surface-container border border-outline-variant/30 rounded-[32px] p-8 space-y-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Globe size={180} className="text-[#00f5a0]" />
              </div>

              <span className="text-[10px] bg-[#00f5a0]/10 text-[#00f5a0] border border-[#00f5a0]/20 font-black px-3 py-1 rounded-full uppercase tracking-widest">
                Regra Especial Nível 6 Elite
              </span>

              <h3 className="text-2xl font-bold font-headline text-white mt-1">Como funciona o Payout Bancário?</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed font-medium font-body bg-white/5 p-4 rounded-xl border border-outline-variant/10">
                À medida que recomenda novos traders, o seu Nível de Afiliado sobe. A cada <strong className="text-white">10 convidados</strong>, você ganha <strong className="text-[#00f5a0]">1 mês grátis adicional</strong>. Ao alcançar o <strong className="text-[#00f5a0]">Nível 6 (após convidar 50 pessoas)</strong>, o seu plano torna-se Elite e desbloqueia ganhos financeiros líquidos:
              </p>

              <div className="p-5 bg-[#00f5a0]/5 border border-[#00f5a0]/20 rounded-2xl flex items-start gap-4">
                <div className="w-10 h-10 bg-[#00f5a0]/10 rounded-xl flex items-center justify-center text-[#00f5a0] shrink-0 font-bold font-mono text-sm">
                  30%
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Ganhos Reais em Dinheiro Vivo</h4>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed mt-1">
                    Como Afiliado Nível 6, receberá <strong className="text-[#00f5a0]">30% da primeira assinatura paga de cada usuário</strong> indicado por si. Sem barreiras, pago via transferência para o seu IBAN angolano!
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-xs text-on-surface-variant font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#00f5a0]"></span>
                  <span>Convites ilimitados com link exclusivo ou código.</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-on-surface-variant font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#00f5a0]"></span>
                  <span>Acompanhamento em tempo real no dashboard de Afiliados.</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-on-surface-variant font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#00f5a0]"></span>
                  <span>Pedido de saque direto com IBAN nacional (mínimo 5.000 Kz).</span>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => onRegisterClick()}
                  className="flex-grow bg-[#00f5a0] hover:bg-[#00f5a0]/90 text-background font-black py-4 px-6 rounded-2xl text-xs uppercase tracking-widest transition-all text-center animate-pulse"
                >
                  Registar & Começar Agora
                </button>
              </div>
            </div>

            {/* Levels visual steps */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold font-headline text-white flex items-center gap-2">
                🏆 Níveis de Afiliado &amp; Plano de Carreira
              </h3>
              <p className="text-xs text-on-surface-variant font-body">Suba na carreira recomendando traders. Nível 1 a 5 garante bónus de tempo de uso; Nível 6 garante renda real:</p>

              <div className="space-y-3 pt-2">
                {/* Level 1 */}
                <div className="bg-surface-container/50 border border-outline-variant/15 rounded-2xl p-4 flex justify-between items-center gap-4 hover:border-outline-variant/40 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-orange-600/10 text-orange-400 rounded-xl flex items-center justify-center font-bold text-xs">N1</div>
                    <div>
                      <h4 className="font-bold text-xs text-white">Nível 1 (Bronze)</h4>
                      <p className="text-[10px] text-on-surface-variant">Requisito: 1 a 9 pessoas convidadas</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-mono font-black text-on-surface bg-surface-container px-2.5 py-1 rounded-lg">Progresso</span>
                  </div>
                </div>

                {/* Level 2 */}
                <div className="bg-surface-container/50 border border-outline-variant/15 rounded-2xl p-4 flex justify-between items-center gap-4 hover:border-outline-variant/40 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-slate-400/10 text-slate-300 rounded-xl flex items-center justify-center font-bold text-xs">N2</div>
                    <div>
                      <h4 className="font-bold text-xs text-white">Nível 2 (Prata)</h4>
                      <p className="text-[10px] text-on-surface-variant">Requisito: 10 a 19 pessoas convidadas</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-mono font-black text-[#00f5a0] bg-[#00f5a0]/5 border border-[#00f5a0]/10 px-2.5 py-1 rounded-lg">1 Mês Grátis</span>
                  </div>
                </div>

                {/* Level 3 */}
                <div className="bg-surface-container/50 border border-outline-variant/15 rounded-2xl p-4 flex justify-between items-center gap-4 hover:border-outline-variant/40 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-yellow-500/10 text-yellow-400 rounded-xl flex items-center justify-center font-bold text-xs">N3</div>
                    <div>
                      <h4 className="font-bold text-xs text-white">Nível 3 (Ouro)</h4>
                      <p className="text-[10px] text-on-surface-variant">Requisito: 20 a 29 pessoas convidadas</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-mono font-black text-[#00f5a0] bg-[#00f5a0]/5 border border-[#00f5a0]/10 px-2.5 py-1 rounded-lg">2 Meses Grátis</span>
                  </div>
                </div>

                {/* Level 4 */}
                <div className="bg-surface-container/50 border border-cyan-500/15 rounded-2xl p-4 flex justify-between items-center gap-4 hover:border-cyan-500/40 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-cyan-500/10 text-cyan-400 rounded-xl flex items-center justify-center font-bold text-xs">N4</div>
                    <div>
                      <h4 className="font-bold text-xs text-white">Nível 4 (Diamante)</h4>
                      <p className="text-[10px] text-on-surface-variant">Requisito: 30 a 39 pessoas convidadas</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-mono font-black text-cyan-400 bg-cyan-500/5 px-2.5 py-1 rounded-lg border border-cyan-500/20">3 Meses Grátis</span>
                  </div>
                </div>

                {/* Level 5 */}
                <div className="bg-surface-container/50 border border-purple-500/15 rounded-2xl p-4 flex justify-between items-center gap-4 hover:border-purple-500/40 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center font-bold text-xs">N5</div>
                    <div>
                      <h4 className="font-bold text-xs text-white">Nível 5 (Platina)</h4>
                      <p className="text-[10px] text-on-surface-variant">Requisito: 40 a 49 pessoas convidadas</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-mono font-black text-purple-400 bg-purple-500/5 px-2.5 py-1 rounded-lg border border-purple-500/20">4 Meses Grátis</span>
                  </div>
                </div>

                {/* Level 6 */}
                <div className="bg-[#00f5a0]/5 border border-[#00f5a0]/40 rounded-2xl p-4 flex justify-between items-center gap-4 shadow-md shadow-[#00f5a0]/5 hover:bg-[#00f5a0]/10 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-[#00f5a0] text-background rounded-xl flex items-center justify-center font-extrabold text-xs">👑 N6</div>
                    <div>
                      <h4 className="font-bold text-xs text-white">Nível 6 (Maestro Elite)</h4>
                      <p className="text-[10px] text-[#00f5a0] font-bold uppercase tracking-wider">Requisito: 50+ convites ativos</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-mono font-black text-background bg-[#00f5a0] px-3 py-1.5 rounded-lg inline-block shadow-lg shadow-[#00f5a0]/20">30% Payout / Subs</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section inline (or use Plans component) */}
      <section id="planos" className="px-[5%] py-[120px] relative z-10 border-t border-outline">
        <div className="max-w-4xl mx-auto text-center mb-12 space-y-4">
          <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-black px-3 py-1 rounded-full uppercase tracking-widest inline-block animate-pulse">
            🔥 CAMPANHA DE LANÇAMENTO EXCLUSIVA
          </span>
          <h2 className="font-headline text-[clamp(28px,3vw,38px)] font-extrabold tracking-[-0.02em] text-white">
            Garanta <span className="text-[#00f5a0]">83% de Desconto</span> no Seu Acesso
          </h2>
          <p className="text-xs text-on-surface-variant max-w-lg mx-auto">
            Facilitamos o seu início! Clique no botão abaixo para copiar o cupão oficial e cole-o diretamente na barra de checkout durante o pagamento.
          </p>

          <div className="mt-6 inline-flex flex-col sm:flex-row items-center gap-3 bg-white/5 border border-outline-variant/15 p-3 rounded-2xl max-w-md mx-auto">
            <div className="flex items-center gap-2 px-4 py-2 bg-black/40 rounded-xl border border-outline-variant/10 font-mono text-xs font-black text-white select-all">
              🏷️ <span className="text-[#00f5a0]">CPROFIT83%OFF</span>
            </div>
            
            <button
              onClick={copyCouponCode}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all w-full sm:w-auto ${couponCopied ? 'bg-[#00f5a0] text-background' : 'bg-white/10 hover:bg-white/20 text-white'}`}
            >
              {couponCopied ? '✓ COPIADO!' : '📋 COPIAR CUPÃO'}
            </button>
          </div>

          {couponCopied && (
            <p className="text-[11px] text-[#00f5a0] font-black tracking-wider animate-bounce select-none">
              🎉 Cupão copiado para a área de transferência! Cole-o no campo de cupão ao pagar.
            </p>
          )}
        </div>

        <Plans hideHeader onAuthRequired={onRegisterClick} />
      </section>

      {/* Footer */}
      <footer className="px-[5%] pt-[64px] pb-[32px] border-t border-outline">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-[64px] mb-[64px]">
          <div>
            <a href="#" className="flex items-center gap-[16px] mb-[16px] hover:opacity-90 transition-opacity">
               <img src="https://i.postimg.cc/v8qJ6KTk/C-profit.png" alt="C Logo" className="h-[44px] drop-shadow-md rounded-[8px]" />
               <span className="font-headline text-[22px] font-extrabold text-on-surface tracking-tight uppercase">Profit</span>
            </a>
            <p className="text-[14px] text-on-surface-variant/70 leading-[1.7] max-w-[320px] mt-[16px]">O terminal definitivo para traders que levam a performance a sério. Journaling, analytics e planejamento num só lugar.</p>
          </div>
          <div>
            <h4 className="text-[12px] font-bold tracking-[0.1em] uppercase text-on-surface-variant mb-[20px]">Início</h4>
            <ul className="list-none space-y-[12px]">
               <li><button onClick={() => window.scrollTo(0,0)} className="text-[14px] text-on-surface-variant/70 hover:text-on-surface transition-colors cursor-pointer bg-transparent border-none">Home</button></li>
               <li><a href="#recursos" className="text-[14px] text-on-surface-variant/70 hover:text-on-surface transition-colors">Recursos</a></li>
               <li><a href="#planos" className="text-[14px] text-on-surface-variant/70 hover:text-on-surface transition-colors">Planos</a></li>
               <li><a href="#afiliados" className="text-[14px] text-[#00f5a0] font-bold hover:text-white transition-colors">Afiliados</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[12px] font-bold tracking-[0.1em] uppercase text-on-surface-variant mb-[20px]">Suporte</h4>
            <ul className="list-none space-y-[12px]">
               <li><button onClick={() => onNavigate && onNavigate('ajuda')} className="text-[14px] text-on-surface-variant/70 hover:text-on-surface transition-colors cursor-pointer bg-transparent border-none">Central de Ajuda</button></li>
               <li><button onClick={() => onNavigate && onNavigate('termos')} className="text-[14px] text-on-surface-variant/70 hover:text-on-surface transition-colors cursor-pointer bg-transparent border-none">Termos</button></li>
               <li><button onClick={() => onNavigate && onNavigate('privacidade')} className="text-[14px] text-on-surface-variant/70 hover:text-on-surface transition-colors cursor-pointer bg-transparent border-none">Privacidade</button></li>
            </ul>
          </div>
        </div>
        <div className="flex justify-between items-center pt-[32px] border-t border-outline text-[13px] text-on-surface-variant/70">
          <span>© 2024 C PROFIT Terminal. Todos os direitos reservados.</span>
          <div className="flex items-center gap-[8px] text-[12px] font-medium tracking-[0.06em] uppercase text-[#00f5a0]">
            <div className="w-[6px] h-[6px] rounded-full bg-[#00f5a0] animate-pulse-dot"></div>
            Sistemas Operacionais
          </div>
        </div>

        {/* Ecosystem Brands — Discreet sub-footer element */}
        <div id="sobre" className="mt-12 pt-8 border-t border-outline/10 text-center space-y-4">
          <p className="text-[10px] font-black tracking-[0.15em] uppercase text-on-surface-variant/30">
            Desenvolvido pelo Grupo Cassaminha — Nosso Ecossistema
          </p>
          <div className="flex items-center justify-center gap-[32px] flex-wrap opacity-35 hover:opacity-75 transition-opacity duration-300">
            <a href="#" onClick={(e) => {e.preventDefault(); window.scrollTo(0,0)}} className="flex items-center gap-[6px] hover:text-[#00f5a0] transition-colors cursor-pointer no-underline text-on-surface-variant text-[11px] font-bold uppercase tracking-wider">
              <img src="https://i.postimg.cc/v8qJ6KTk/C-profit.png" alt="C Profit" className="h-[18px] w-[18px] object-contain rounded" />
              <span>Profit</span>
            </a>
            <a href="https://validac.shop/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-[6px] hover:text-[#00f5a0] transition-colors cursor-pointer no-underline text-on-surface-variant text-[11px] font-bold uppercase tracking-wider">
              <img src="https://i.postimg.cc/Prh7BMBw/Chat-GPT-Image-14-de-mai-de-2026-11-53-41.png" alt="Valida C" className="h-[18px] w-[18px] object-contain rounded" />
              <span>Valida C</span>
            </a>
            <a href="https://www.cstoreao.shop/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-[6px] hover:text-[#00f5a0] transition-colors cursor-pointer no-underline text-on-surface-variant text-[11px] font-bold uppercase tracking-wider">
              <img src="https://i.postimg.cc/3wsKF20v/Chat-GPT-Image-13-de-mai-de-2026-12-40-58.png" alt="C Store Angola" className="h-[20px] w-auto object-contain rounded animate-pulse" />
              <span>C Store</span>
            </a>
            <a href="https://www.cstoreao.shop/page" target="_blank" rel="noopener noreferrer" className="flex items-center gap-[6px] hover:text-[#00f5a0] transition-colors cursor-pointer no-underline text-on-surface-variant text-[11px] font-bold uppercase tracking-wider">
              <img src="https://i.postimg.cc/Prh7BMBw/Chat-GPT-Image-14-de-mai-de-2026-11-53-41.png" alt="C Gestão" className="h-[18px] w-[18px] object-contain rounded animate-pulse" />
              <span>C Gestão</span>
            </a>
          </div>
          <p className="text-[10px] text-on-surface-variant/25 max-w-[460px] mx-auto leading-[1.6]">
            O terminal oficial para traders que buscam a maestria através dos dados. Desenvolvido por traders, para traders.
          </p>
        </div>
      </footer>

      {/* Modern, high-conversion floating discount promotion modal */}
      <AnimatePresence>
        {showPromoPopup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closePromoPopup}
              className="absolute inset-0 bg-black/85 backdrop-blur-[12px]"
            />

            {/* Centered Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-lg bg-gradient-to-br from-surface-container-high via-surface-container-lowest to-background border border-[#00f5a0]/30 rounded-[32px] p-8 md:p-10 shadow-[0_20px_50px_rgba(0,245,160,0.15)] overflow-hidden z-10"
            >
              {/* Subtle visual glow accent block */}
              <div className="absolute -top-[120px] -right-[120px] w-[240px] h-[240px] bg-[#00f5a0]/10 rounded-full blur-[60px] pointer-events-none"></div>

              {/* Close Button UI */}
              <button
                onClick={closePromoPopup}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 text-on-surface-variant hover:text-white transition-all cursor-pointer border border-transparent hover:border-white/10"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>

              {/* Header Content */}
              <div className="text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#00f5a0]/30 bg-[#00f5a0]/10 text-[10px] font-black uppercase tracking-wider text-[#00f5a0] mb-5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00f5a0] animate-pulse"></span>
                  🎁 DESCONTO DE BOAS-VINDAS
                </div>
                
                <h3 className="font-headline text-[28px] md:text-[34px] font-black leading-tight tracking-tight text-white">
                  Obtenha <span className="text-[#00f5a0]">83% OFF</span> na Primeira Subscrição!
                </h3>
                
                <p className="text-sm text-on-surface-variant leading-relaxed mt-4 max-w-md">
                  Aproveite este bónus exclusivo na sua primeira subscrição mensal para desbloquear todas as ferramentas premium do terminal e elevar a sua consistência operacional.
                </p>
              </div>

              {/* Coupon Copier Container */}
              <div className="mt-8 p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col sm:flex-row items-center gap-3">
                <div className="flex-1 flex items-center justify-between w-full px-4 py-3 bg-black/60 border border-outline-variant/10 rounded-xl font-mono text-sm font-black text-white selection:bg-[#00f5a0]/30 select-all">
                  <span className="text-[#00f5a0]">CPROFIT83%OFF</span>
                  <span className="text-[10px] text-white/30 uppercase tracking-widest ml-2 font-normal">CUPÃO</span>
                </div>
                
                <button
                  onClick={copyPopupCoupon}
                  className={`w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 transform active:scale-95 cursor-pointer flex items-center justify-center gap-2 ${
                    popupCopied 
                      ? 'bg-[#00f5a0] text-background shadow-[0_0_20px_rgba(0,245,160,0.4)]' 
                      : 'bg-white text-background hover:bg-neutral-200'
                  }`}
                >
                  {popupCopied ? '✓ COPIADO!' : '📋 COPIAR'}
                </button>
              </div>

              {/* Action buttons footer */}
              <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
                <button
                  onClick={() => {
                    closePromoPopup();
                    onRegisterClick('mensal_6', 'CPROFIT83%OFF');
                  }}
                  className="w-full py-4 rounded-xl bg-[#00f5a0] text-background text-xs font-black uppercase tracking-wider hover:opacity-95 transition-all text-center cursor-pointer shadow-[0_10px_30px_rgba(0,245,160,0.25)] flex items-center justify-center gap-2"
                >
                  <Wallet size={14} /> ASSINATURA (83% OFF)
                </button>
                <button
                  onClick={() => {
                    closePromoPopup();
                    onRegisterClick('iniciante');
                  }}
                  className="w-full py-4 rounded-xl bg-transparent hover:bg-cyan-500/10 border border-cyan-500/60 text-cyan-400 hover:text-white hover:border-cyan-500 text-xs font-black uppercase tracking-wider transition-all text-center cursor-pointer flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(6,182,212,0.15)]"
                >
                  <Zap size={14} className="text-cyan-400 animate-pulse" /> INICIAR GRÁTIS
                </button>
              </div>

              <div className="mt-4 text-center">
                <button
                  onClick={closePromoPopup}
                  className="text-on-surface-variant/50 hover:text-white text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer bg-transparent border-none"
                >
                  Talvez mais tarde
                </button>
              </div>

              {/* Prompt notification indicator */}
              {popupCopied && (
                <p className="text-[11px] text-[#00f5a0] text-center font-bold tracking-wider mt-4 animate-pulse">
                  ✨ Copiado com sucesso! Insira-o no campo de cupão ao assinar.
                </p>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
