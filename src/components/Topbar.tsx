import React from 'react';
import { useCurrency } from '../contexts/CurrencyContext';
import { auth } from '../firebase';
import { useTrades } from '../hooks/useTrades';

export default function Topbar({ 
  toggleSidebar, 
  onProfileClick,
  onPlansClick
}: { 
  toggleSidebar?: () => void, 
  onProfileClick?: () => void,
  onPlansClick?: () => void
}) {
  const { currency, setCurrency } = useCurrency();
  const { userPlan } = useTrades();
  const userName = auth.currentUser?.displayName || 'Usuário';
  const initial = userName.charAt(0).toUpperCase();

  const getPlanDisplay = (type: string | undefined) => {
    if (!type) return 'Iniciante';
    const maps: Record<string, string> = {
      'mensal_2': 'Mensal Basic',
      'semestral_6': 'Semestral Pro',
      'anual_16': 'Anual Elite',
      'Unlimited Elite': 'Unlimited Elite',
      'Iniciante': 'Terminal Free'
    };
    return maps[type] || type;
  };

  return (
    <header className="flex justify-between items-center px-6 w-full h-20 sticky top-0 z-40 bg-background border-b border-outline-variant/20">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar}
          className="w-10 h-10 rounded-full border border-outline-variant/20 flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors"
        >
          <span className="material-symbols-outlined text-sm">menu</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary text-sm">show_chart</span>
          </div>
          <span className="text-xl font-black tracking-tight text-primary font-headline">C Profit</span>
        </div>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 hidden lg:block">
        <h2 className="text-primary font-bold text-center flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-[0.2em] font-black opacity-70 mb-px leading-none">{userPlan?.role === 'admin' ? 'System Status' : 'Trader Plan'}</span>
          <span className="text-xl font-headline italic tracking-widest uppercase truncate max-w-[200px]">
            {getPlanDisplay(userPlan?.plan_type)}
          </span>
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={onPlansClick}
          className="relative group overflow-hidden bg-gradient-to-r from-primary to-indigo-600 text-on-primary px-5 py-2 rounded-full text-sm font-black hover:scale-105 transition-all shadow-xl shadow-primary/30 flex items-center gap-2 animate-pulse"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          <span className="relative z-10">Atualizar Plano</span>
          <span className="material-symbols-outlined text-sm relative z-10">bolt</span>
        </button>
        <div 
          onClick={onProfileClick}
          className="flex items-center gap-2 bg-surface-container border border-outline-variant/20 rounded-full pl-1 pr-4 py-1 cursor-pointer hover:bg-surface-container-high transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-on-surface text-background flex items-center justify-center font-bold text-xs overflow-hidden">
            {auth.currentUser?.photoURL ? (
              <img src={auth.currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              initial
            )}
          </div>
          <span className="text-on-surface text-sm font-medium">{userName.split(' ')[0]}</span>
        </div>
        <button 
          onClick={() => auth.signOut()}
          title="Sair da Conta"
          className="w-10 h-10 rounded-full border border-outline-variant/20 flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/5 transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
        </button>
      </div>
    </header>
  );
}
