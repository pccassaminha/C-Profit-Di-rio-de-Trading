import React from 'react';
import { useCurrency } from '../contexts/CurrencyContext';
import { auth } from '../firebase';

export default function Topbar({ toggleSidebar, onProfileClick }: { toggleSidebar?: () => void, onProfileClick?: () => void }) {
  const { currency, setCurrency } = useCurrency();
  const userName = auth.currentUser?.displayName || 'Usuário';
  const initial = userName.charAt(0).toUpperCase();

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

      <div className="absolute left-1/2 -translate-x-1/2">
        <h2 className="text-on-surface font-bold text-xl font-headline">Diário de Trades</h2>
      </div>

      <div className="flex items-center gap-4">
        <button className="bg-primary text-on-primary px-4 py-1.5 rounded-full text-sm font-bold hover:brightness-110 transition-all shadow-lg shadow-primary/20">
          Atualizar Plano
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
      </div>
    </header>
  );
}
