import React from 'react';
import { motion } from 'motion/react';
import { LineChart, ShieldCheck, Zap, TrendingUp, Wallet, ArrowRight, CheckCircle2, Globe, BarChart3, Lock } from 'lucide-react';
import Plans from './Plans';

interface LandingProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
  onNavigate?: (page: string) => void;
}

export default function Landing({ onLoginClick, onRegisterClick, onNavigate }: LandingProps) {
  return (
    <div className="min-h-screen bg-background text-on-surface font-body overflow-x-hidden">
      <div className="noise-overlay"></div>
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-[5%] h-[100px] bg-background/85 backdrop-blur-[20px] border-b border-outline">
        <a href="#" onClick={(e) => {e.preventDefault(); window.scrollTo(0,0)}} className="flex items-center gap-[16px] text-none hover:opacity-90 transition-opacity">
          <img src="https://i.postimg.cc/v8qJ6KTk/C-profit.png" alt="C Logo" className="h-[44px] drop-shadow-md rounded-[8px]" />
          <span className="font-headline text-[22px] font-extrabold text-on-surface tracking-tight uppercase">Profit</span>
        </a>
        <ul className="hidden md:flex items-center gap-[36px] list-none">
          <li><a href="#recursos" className="text-[13px] font-medium tracking-[0.08em] uppercase text-on-surface-variant hover:text-primary transition-colors">Recursos</a></li>
          <li><a href="#planos" className="text-[13px] font-medium tracking-[0.08em] uppercase text-on-surface-variant hover:text-primary transition-colors">Planos</a></li>
          <li><a href="#sobre" className="text-[13px] font-medium tracking-[0.08em] uppercase text-on-surface-variant hover:text-primary transition-colors">Sobre</a></li>
        </ul>
        <div className="flex items-center gap-[16px]">
          <button onClick={onLoginClick} className="bg-transparent border-none text-on-surface-variant font-body text-[14px] font-medium cursor-pointer hover:text-on-surface transition-colors">Entrar</button>
          <button onClick={onRegisterClick} className="bg-primary text-on-primary border-none py-[10px] px-[22px] rounded-[8px] font-body text-[13px] font-bold tracking-[0.06em] uppercase cursor-pointer transition-all hover:bg-primary-fixed-dim hover:-translate-y-[1px] hover:shadow-[0_8px_30px_rgba(0,245,160,0.3)]">Começar Agora</button>
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
          O diário de trading definitivo para <strong className="text-on-surface font-bold">Forex, Índices e Opções Binárias</strong>. Monitore, analise e escale suas operações com a inteligência que os profissionais usam.
        </p>

        <div className="flex items-center gap-[24px] flex-wrap justify-center animate-in slide-in-from-bottom-6 duration-700 delay-300 fill-mode-both">
          <button onClick={onRegisterClick} className="bg-primary text-on-primary border-none py-[16px] px-[36px] rounded-[10px] font-headline text-[14px] font-bold tracking-[0.08em] uppercase cursor-pointer transition-all inline-flex items-center gap-[10px] hover:bg-primary-fixed-dim hover:-translate-y-[2px] hover:shadow-[0_12px_40px_rgba(0,245,160,0.35)] group">
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
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="px-[5%] pb-[120px] relative z-10">
        <div className="text-center mb-[48px]">
          <div className="inline-block text-[11px] font-bold tracking-[0.15em] uppercase text-primary mb-[16px]">Plataforma</div>
          <h2 className="font-headline text-[clamp(36px,4vw,56px)] font-extrabold leading-none tracking-[-0.02em] text-center">Visão geral do <em className="italic text-on-surface-variant font-normal">seu terminal</em></h2>
        </div>
        <div className="rounded-[16px] border border-outline-variant overflow-hidden bg-surface-container-low shadow-[0_40px_120px_rgba(0,0,0,0.6),0_0_0_1px_rgba(0,245,160,0.05)] relative">
          <div className="bg-surface-container-lowest border-b border-outline p-[14px_20px] flex items-center gap-[12px]">
            <div className="flex gap-[6px]">
              <div className="w-[10px] h-[10px] rounded-full bg-[#ff5f57]"></div>
              <div className="w-[10px] h-[10px] rounded-full bg-[#febc2e]"></div>
              <div className="w-[10px] h-[10px] rounded-full bg-[#28c840]"></div>
            </div>
            <div className="flex-1 bg-white/5 rounded-[6px] p-[6px_14px] text-[12px] text-on-surface-variant/70 font-mono text-center">
              cprofit.app/dashboard
            </div>
          </div>
          <div className="p-[28px] grid grid-cols-1 md:grid-cols-[220px_1fr_240px] gap-[16px] min-h-[420px]">
            
            <div className="hidden md:block bg-surface-container-lowest rounded-[10px] border border-outline p-[20px_16px] row-span-2">
              <div className="text-[11px] tracking-[0.08em] uppercase text-on-surface-variant/70 mb-[16px] px-[12px]">Navegação</div>
              <div className="flex items-center gap-[10px] p-[10px_12px] rounded-[8px] text-[13px] mb-[4px] cursor-pointer transition-all bg-primary/10 text-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                Dashboard
              </div>
              <div className="flex items-center gap-[10px] p-[10px_12px] rounded-[8px] text-[13px] text-on-surface-variant mb-[4px] cursor-pointer transition-all hover:bg-surface-container">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-70"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Diário
              </div>
              <div className="flex items-center gap-[10px] p-[10px_12px] rounded-[8px] text-[13px] text-on-surface-variant mb-[4px] cursor-pointer transition-all hover:bg-surface-container">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-70"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/></svg>
                Analytics
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-[10px] border border-outline p-[20px]">
              <div className="flex justify-between items-center mb-[16px]">
                <div>
                  <div className="text-[13px] text-on-surface-variant/70 mb-[4px]">Performance Semanal</div>
                  <div className="font-headline text-[22px] font-extrabold text-[#00f5a0]">+12.4%</div>
                </div>
                <div className="text-[11px] tracking-[0.06em] uppercase bg-primary/10 p-[6px_12px] rounded-[6px] text-primary">Mai 2025</div>
              </div>
              <div className="flex items-end gap-[4px] h-[120px] pt-[10px]">
                <div className="flex-1 rounded-t-[4px] bg-[#00f5a0]/60 hover:opacity-80 transition-opacity" style={{height: '45%'}}></div>
                <div className="flex-1 rounded-t-[4px] bg-[#00f5a0]/60 hover:opacity-80 transition-opacity" style={{height: '60%'}}></div>
                <div className="flex-1 rounded-t-[4px] bg-[#ff4b6e]/50 hover:opacity-80 transition-opacity" style={{height: '25%'}}></div>
                <div className="flex-1 rounded-t-[4px] bg-[#00f5a0]/60 hover:opacity-80 transition-opacity" style={{height: '80%'}}></div>
                <div className="flex-1 rounded-t-[4px] bg-[#00f5a0]/60 hover:opacity-80 transition-opacity" style={{height: '55%'}}></div>
              </div>
            </div>

            <div className="flex flex-col gap-[12px] md:row-span-2">
              <div className="bg-surface-container-lowest rounded-[10px] border border-outline p-[16px_18px]">
                <div className="text-[11px] tracking-[0.08em] uppercase text-on-surface-variant/70 mb-[6px]">Winrate</div>
                <div className="font-headline text-[26px] font-extrabold text-[#00f5a0]">68.4%</div>
                <div className="text-[12px] text-on-surface-variant/70 mt-[4px]">↑ +4.2% vs semana anterior</div>
              </div>
              <div className="bg-surface-container-lowest rounded-[10px] border border-outline p-[16px_18px]">
                <div className="text-[11px] tracking-[0.08em] uppercase text-on-surface-variant/70 mb-[6px]">Profit Factor</div>
                <div className="font-headline text-[26px] font-extrabold text-secondary">2.14</div>
                <div className="text-[12px] text-on-surface-variant/70 mt-[4px]">Acima do benchmark (1.5)</div>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-[10px] border border-outline p-[16px_18px] md:col-start-2">
              <div className="text-[11px] tracking-[0.08em] uppercase text-on-surface-variant/70 mb-[12px]">Últimas Operações</div>
              <div className="flex justify-between items-center py-[8px] border-b border-outline text-[12px]">
                <span className="font-semibold text-on-surface">EURUSD</span>
                <span className="text-on-surface-variant/70 text-[11px]">Buy · 0.5 Lote</span>
                <span className="text-[#00f5a0] font-semibold">+$84.50</span>
              </div>
              <div className="flex justify-between items-center py-[8px] border-b border-outline text-[12px]">
                <span className="font-semibold text-on-surface">XAUUSD</span>
                <span className="text-on-surface-variant/70 text-[11px]">Sell · 0.2 Lote</span>
                <span className="text-[#ff4b6e] font-semibold">-$32.00</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Pricing Section inline (or use Plans component) */}
      <section id="planos" className="px-[5%] py-[120px] relative z-10 border-t border-outline">
        <Plans hideHeader onAuthRequired={onRegisterClick} />
      </section>

      {/* Brands */}
      <section id="sobre" className="px-[5%] py-[80px] text-center border-y border-outline bg-surface-container-lowest">
        <p className="text-[12px] font-medium tracking-[0.1em] uppercase text-on-surface-variant/70 mb-[36px]">Desenvolvido pelo Grupo Cassaminha</p>
        <div className="flex items-center justify-center gap-[48px] flex-wrap">
          <a href="#" onClick={(e) => {e.preventDefault(); window.scrollTo(0,0)}} className="flex items-center gap-[10px] opacity-50 hover:opacity-100 transition-opacity cursor-pointer no-underline">
            <img src="https://i.postimg.cc/v8qJ6KTk/C-profit.png" alt="C Profit Logo" className="h-[32px] w-[32px] object-contain rounded-[8px]" />
            <span className="font-headline text-[15px] font-bold text-on-surface">Profit</span>
          </a>
          <a href="https://validac.shop/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-[10px] opacity-50 hover:opacity-100 transition-opacity cursor-pointer no-underline">
            <img src="https://i.postimg.cc/Prh7BMBw/Chat-GPT-Image-14-de-mai-de-2026-11-53-41.png" alt="Valida C Logo" className="h-[32px] w-[32px] object-contain rounded-[8px]" />
            <span className="font-headline text-[15px] font-bold text-on-surface">Valida C</span>
          </a>
          <a href="https://www.cstoreao.shop/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-[10px] opacity-50 hover:opacity-100 transition-opacity cursor-pointer no-underline">
            <img src="https://i.postimg.cc/3wsKF20v/Chat-GPT-Image-13-de-mai-de-2026-12-40-58.png" alt="C Store Angola Logo" className="h-[40px] w-auto object-contain rounded-[8px]" />
            <span className="font-headline text-[15px] font-bold text-on-surface">C Store Angola</span>
          </a>
          <a href="https://www.cstoreao.shop/page" target="_blank" rel="noopener noreferrer" className="flex items-center gap-[10px] opacity-50 hover:opacity-100 transition-opacity cursor-pointer no-underline">
            <img src="https://i.postimg.cc/Prh7BMBw/Chat-GPT-Image-14-de-mai-de-2026-11-53-41.png" alt="C Gestão Empresarial Logo" className="h-[32px] w-[32px] object-contain rounded-[8px]" />
            <span className="font-headline text-[15px] font-bold text-on-surface">C Gestão Empresarial</span>
          </a>
        </div>
        <p className="mt-[28px] text-[14px] text-on-surface-variant/70 max-w-[460px] mx-auto leading-[1.7]">
          O terminal oficial para traders que buscam a maestria através dos dados. Desenvolvido por traders, para traders.
        </p>
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
      </footer>
    </div>
  );
}
