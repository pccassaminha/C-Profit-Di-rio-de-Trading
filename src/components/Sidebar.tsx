import React from 'react';
import { useTrades } from '../hooks/useTrades';
import { auth } from '../firebase';

export default function Sidebar({ activeTab, setActiveTab, isOpen }: { activeTab: string, setActiveTab: (tab: string) => void, isOpen: boolean }) {
  const { userPlan } = useTrades();
  const currentUser = auth.currentUser;
  
  // Super Admin check - only this email can see the admin panel
  const isSuperAdmin = currentUser?.email === 'exportacoes.extras@gmail.com' || userPlan?.role === 'admin';

  const getPlanDisplay = (type: string | undefined) => {
    if (!type) return 'Iniciante';
    const maps: Record<string, string> = {
      'mensal_6': 'Mensal',
      'mensal_2': 'Mensal',
      'trimestral_6': 'Trimestral',
      'semestral_8': 'Semestral',
      'semestral_6': 'Semestral',
      'anual_16': 'Anual',
      'trial_15': 'Trial 15 Dias',
      'trial_30': 'Teste 30 Dias',
      'Unlimited Elite': 'Unlimited Elite',
      'Iniciante': 'Sem Acesso'
    };
    return maps[type] || type;
  };

  const navItems = [
    { id: 'dashboard', icon: 'dashboard', label: 'Performance' },
    { id: 'journal', icon: 'receipt_long', label: 'Diário de Trades' },
    { id: 'planner', icon: 'calendar_today', label: 'Planejamento' },
    { id: 'payments', icon: 'payments', label: 'Pagamentos' },
    { id: 'withdrawals', icon: 'account_balance_wallet', label: 'Levantamentos' },
    { id: 'panorama', icon: 'explore', label: 'Panorama' },
    { id: 'community', icon: 'groups', label: 'Comunidade' },
    { id: 'affiliates_user', icon: 'handshake', label: 'Área de Afiliado' },
  ];

  return (
    <aside className={`h-screen sticky top-0 bg-surface-container-low flex flex-col border-r border-outline-variant/20 z-50 transition-all duration-300 ${isOpen ? 'w-64' : 'w-20'} hidden md:flex shrink-0`}>
      <div className={`p-6 flex items-center ${isOpen ? 'justify-start' : 'justify-center'}`}>
        {isOpen ? (
          <div className="flex flex-col items-start mt-2 mb-4">
            <button onClick={() => setActiveTab('dashboard')} className="cursor-pointer hover:scale-105 transition-transform bg-transparent border-none p-0 outline-none text-left flex items-center gap-[12px]">
              <img src="https://i.postimg.cc/v8qJ6KTk/C-profit.png" alt="C Logo" className="h-[36px] drop-shadow-md rounded-[8px]" />
              <span className="font-headline text-[20px] font-extrabold text-on-surface tracking-tight uppercase">Profit</span>
            </button>
            <p className="text-[10px] uppercase tracking-[0.1em] text-primary font-bold mt-2 whitespace-nowrap ml-2">Plano: {getPlanDisplay(userPlan?.plan_type)}</p>
          </div>
        ) : (
          <button onClick={() => setActiveTab('dashboard')} className="cursor-pointer hover:scale-110 transition-transform bg-transparent border-none p-0 outline-none flex items-center justify-center mt-2 mb-4">
            <img src="https://i.postimg.cc/v8qJ6KTk/C-profit.png" alt="C Logo" className="w-[32px] h-[32px] object-contain drop-shadow-md rounded-[8px]" />
          </button>
        )}
      </div>
      <nav className="flex-1 mt-4">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            title={!isOpen ? item.label : undefined}
            className={`w-full flex items-center py-3 transition-all duration-150 ${isOpen ? 'px-6 gap-3' : 'justify-center px-0'} ${
              activeTab === item.id
                ? 'text-primary border-l-4 border-primary bg-surface-container'
                : 'text-on-surface-variant hover:text-primary hover:bg-surface-container border-l-4 border-transparent'
            }`}
          >
            <span className="material-symbols-outlined" style={activeTab === item.id ? { fontVariationSettings: "'FILL' 1" } : {}}>{item.icon}</span>
            {isOpen && <span className={`font-body whitespace-nowrap ${activeTab === item.id ? 'font-bold' : 'font-medium'}`}>{item.label}</span>}
          </button>
        ))}
      </nav>
      <div className={`p-6 mt-auto border-t border-outline-variant/20 ${isOpen ? '' : 'flex flex-col items-center px-2'}`}>
        <div className={`flex flex-col ${isOpen ? 'gap-2' : 'gap-4 items-center'}`}>
          <button 
            onClick={() => setActiveTab('plans')}
            title={!isOpen ? "Planos" : undefined}
            className={`flex items-center transition-colors text-left ${isOpen ? 'gap-3 text-sm w-full' : 'justify-center'} ${activeTab === 'plans' ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}
          >
            <span className="material-symbols-outlined text-[20px]">workspace_premium</span> 
            {isOpen && <span className="whitespace-nowrap">Planos de Assinatura</span>}
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            title={!isOpen ? "Configurações" : undefined}
            className={`flex items-center transition-colors text-left ${isOpen ? 'gap-3 text-sm w-full' : 'justify-center'} ${activeTab === 'settings' ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}
          >
            <span className="material-symbols-outlined text-[20px]">settings</span> 
            {isOpen && <span className="whitespace-nowrap">Configurações</span>}
          </button>
          <button 
            onClick={() => setActiveTab('support')}
            title={!isOpen ? "Suporte" : undefined}
            className={`flex items-center transition-colors text-left ${isOpen ? 'gap-3 text-sm w-full' : 'justify-center'} ${activeTab === 'support' ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}
          >
            <span className="material-symbols-outlined text-[20px]">help</span> 
            {isOpen && <span className="whitespace-nowrap">Suporte</span>}
          </button>
          <button 
            onClick={() => auth.signOut()}
            title={!isOpen ? "Sair da Conta" : undefined}
            className={`flex items-center transition-colors text-left mt-2 py-2 border-t border-outline-variant/10 ${isOpen ? 'gap-3 text-sm w-full' : 'justify-center'} text-error/60 hover:text-error`}
          >
            <span className="material-symbols-outlined text-[20px]">logout</span> 
            {isOpen && <span className="whitespace-nowrap font-bold uppercase tracking-widest text-[10px]">Encerrar Sessão</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
