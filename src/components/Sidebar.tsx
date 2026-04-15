import React from 'react';

export default function Sidebar({ activeTab, setActiveTab, isOpen }: { activeTab: string, setActiveTab: (tab: string) => void, isOpen: boolean }) {
  const navItems = [
    { id: 'dashboard', icon: 'dashboard', label: 'Performance' },
    { id: 'journal', icon: 'receipt_long', label: 'Diário de Trades' },
    { id: 'withdrawals', icon: 'account_balance_wallet', label: 'Levantamentos' },
    { id: 'psychology', icon: 'psychology', label: 'Psicologia' },
    { id: 'planner', icon: 'calendar_today', label: 'Planejamento' },
  ];

  return (
    <aside className={`h-screen sticky top-0 bg-surface-container-low flex flex-col border-r border-outline-variant/20 z-50 transition-all duration-300 ${isOpen ? 'w-64' : 'w-20'} hidden md:flex shrink-0`}>
      <div className={`p-6 flex items-center ${isOpen ? 'justify-start' : 'justify-center'}`}>
        {isOpen ? (
          <div>
            <h1 className="text-lg font-black text-primary font-headline tracking-tight whitespace-nowrap">Terminal v1.0</h1>
            <p className="text-[10px] uppercase tracking-[0.1em] text-on-surface-variant font-label mt-1 whitespace-nowrap">Sessão Ativa</p>
          </div>
        ) : (
          <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center text-primary font-bold">C</div>
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
        </div>
      </div>
    </aside>
  );
}
