import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { LayoutDashboard, FileText, Calendar, CreditCard, Wallet, Globe, Users, Handshake, Crown, Settings, HelpCircle, LogOut, Menu, X, Grid } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function MobileBottomNav({ activeTab, setActiveTab }: MobileBottomNavProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(doc(db, 'usuarios', currentUser.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.photoURL) setUserPhoto(data.photoURL);
        if (data.nome) setUserName(data.nome);
      }
    });
    return () => unsub();
  }, [currentUser]);

  // Close the bottom drawer when active item switches or clicking outside
  useEffect(() => {
    setIsMoreOpen(false);
  }, [activeTab]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
    }
    if (isMoreOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMoreOpen]);

  // Main active bottom items
  const mainItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Desempenho' },
    { id: 'journal', icon: FileText, label: 'Diário' },
    { id: 'planner', icon: Calendar, label: 'Planejamento' },
    { id: 'community', icon: Users, label: 'Comunidade' },
  ];

  // Secondary items shown inside the "More" drawer
  const secondaryItems = [
    { id: 'panorama', icon: Globe, label: 'Panorama Global', desc: 'Análise, calendários e feeds técnicos' },
    { id: 'withdrawals', icon: Wallet, label: 'Levantamentos', desc: 'Gerencie saques e aportes' },
    { id: 'affiliates_user', icon: Handshake, label: 'Painel do Afiliado', desc: 'Gere receita indicando traders' },
    { id: 'payments', icon: CreditCard, label: 'Faturas e Registros', desc: 'Histórico de transações' },
    { id: 'plans', icon: Crown, label: 'Assinaturas', desc: 'Atualize seu plano de trading' },
    { id: 'settings', icon: Settings, label: 'Configurações', desc: 'Ajuste objetivos e corretoras' },
    { id: 'support', icon: HelpCircle, label: 'Suporte', desc: 'Fale com nossa equipe técnica' },
  ];

  const displayUserName = userName || currentUser?.displayName || 'Traders';
  const displayPhoto = userPhoto || currentUser?.photoURL;
  const userInitial = displayUserName.charAt(0).toUpperCase();

  return (
    <>
      {/* Immersive bottom navigation bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface-container/95 backdrop-blur-md border-t border-outline-variant/15 md:hidden px-4 py-2 flex items-center justify-around shadow-[0_-5px_25px_rgba(0,0,0,0.5)]">
        {mainItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsMoreOpen(false);
              }}
              className={`flex flex-col items-center justify-center gap-1 min-w-[64px] py-1 bg-transparent border-none outline-none transition-all duration-150 relative ${
                isActive ? 'text-primary scale-105' : 'text-on-surface-variant'
              }`}
            >
              <item.icon className="w-5 h-5 shrink-0 transition-all" strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[10px] tracking-wide font-medium font-body transition-colors ${isActive ? 'font-bold text-primary' : 'text-on-surface-variant'}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="absolute -top-1 w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_#00f5a0]" />
              )}
            </button>
          );
        })}

        {/* Dynamic "More" trigger button */}
        <button
          onClick={() => setIsMoreOpen(!isMoreOpen)}
          className={`flex flex-col items-center justify-center gap-1 min-w-[64px] py-1 bg-transparent border-none outline-none transition-all duration-150 relative ${
            isMoreOpen ? 'text-primary scale-105' : 'text-on-surface-variant'
          }`}
        >
          <Grid className="w-5 h-5 shrink-0 transition-all" strokeWidth={isMoreOpen ? 2.5 : 2} />
          <span className={`text-[10px] tracking-wide font-medium font-body ${isMoreOpen ? 'font-bold text-primary' : 'text-on-surface-variant'}`}>
            Mais
          </span>
          {isMoreOpen && (
            <span className="absolute -top-1 w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_#00f5a0]" />
          )}
        </button>
      </div>

      {/* Backdrop overlay */}
      {isMoreOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 transition-all duration-300 md:hidden" />
      )}

      {/* Responsive bottom-sheet drawer drawer for secondary options */}
      <div
        ref={moreMenuRef}
        className={`fixed left-0 right-0 bottom-0 z-40 bg-surface-container-high border-t border-outline-variant/35 rounded-t-[32px] shadow-[0_-15px_30px_rgba(0,0,0,0.6)] px-6 pt-5 pb-24 md:hidden transition-transform duration-300 ease-out max-h-[80vh] overflow-y-auto ${
          isMoreOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Sleek drawer indicator handle */}
        <div className="w-12 h-1 bg-outline-variant/30 rounded-full mx-auto mb-5" />

        {/* Quick Profile Overview inside Drawer */}
        <div className="flex items-center gap-3 bg-surface-container/50 border border-outline-variant/10 rounded-2xl p-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#00f5a0]/15 text-primary flex items-center justify-center font-bold text-sm overflow-hidden border border-[#00f5a0]/25">
            {displayPhoto ? (
              <img src={displayPhoto} alt="Minha foto" className="w-full h-full object-cover" />
            ) : (
              userInitial
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-on-surface font-extrabold text-xs tracking-wide">Olá, {displayUserName}!</span>
            <span className="text-[10px] text-on-surface-variant truncate">{currentUser?.email}</span>
          </div>
          <button
            onClick={() => setActiveTab('profile')}
            className="ml-auto flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 rounded-xl px-2.5 py-1 text-[10px] font-black uppercase tracking-wide transition-all"
          >
            Perfil
          </button>
        </div>

        {/* Drawer navigation grid */}
        <div className="space-y-2">
          {secondaryItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3.5 p-3 rounded-2xl transition-all duration-150 border text-left ${
                  isActive
                    ? 'bg-primary/10 border-primary/40 text-primary'
                    : 'bg-surface-container-high/40 hover:bg-surface-container border-outline-variant/10 text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isActive ? 'bg-primary/20' : 'bg-surface-container'}`}>
                  <item.icon className="w-[18px] h-[18px] shrink-0" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-extrabold tracking-wide uppercase block text-on-surface">
                    {item.label}
                  </span>
                  <span className="text-[9px] text-on-surface-variant block opacity-75 truncate">
                    {item.desc}
                  </span>
                </div>
              </button>
            );
          })}

          <button
            onClick={() => auth.signOut()}
            className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-error/5 border border-error/20 text-error hover:bg-error/10 transition-colors text-left font-bold mt-4"
          >
            <div className="w-8 h-8 rounded-xl bg-error/15 flex items-center justify-center shrink-0">
              <LogOut className="w-[18px] h-[18px] shrink-0" strokeWidth={2} />
            </div>
            <div>
              <span className="text-[11px] font-black tracking-widest uppercase block">
                Encerrar Sessão
              </span>
              <span className="text-[9px] text-error/70 block font-medium">
                Desconectar da sua conta com segurança
              </span>
            </div>
          </button>
        </div>
      </div>
    </>
  );
}
