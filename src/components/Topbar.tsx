import React, { useState, useRef, useEffect } from 'react';
import { useCurrency } from '../contexts/CurrencyContext';
import { auth } from '../firebase';
import { useTrades } from '../hooks/useTrades';

export default function Topbar({ 
  toggleSidebar, 
  onProfileClick,
  onPlansClick,
  onNavigate
}: { 
  toggleSidebar?: () => void, 
  onProfileClick?: () => void,
  onPlansClick?: () => void,
  onNavigate?: (tab: string) => void
}) {
  const { currency, setCurrency } = useCurrency();
  const { userPlan } = useTrades();
  const userName = auth.currentUser?.displayName || 'Usuário';
  const initial = userName.charAt(0).toUpperCase();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  const handleNavigate = (tab: string) => {
    setDropdownOpen(false);
    if (onNavigate) {
      onNavigate(tab);
    } else if (tab === 'profile' && onProfileClick) {
      onProfileClick();
    }
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
        <div className="flex md:hidden items-center gap-2">
          <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary text-sm">show_chart</span>
          </div>
          <span className="text-xl font-black tracking-tight text-primary font-headline">C Profit</span>
        </div>
      </div>

      <div className="flex items-center gap-4 relative">
        <div className="relative" ref={dropdownRef}>
          <div 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={`flex items-center gap-2 bg-surface-container border border-outline-variant/20 rounded-full pl-1 pr-4 py-1 cursor-pointer hover:bg-surface-container-high transition-colors ${dropdownOpen ? 'ring-2 ring-primary bg-surface-container-high' : ''}`}
          >
            <div className="w-8 h-8 rounded-full bg-on-surface text-background flex items-center justify-center font-bold text-xs overflow-hidden">
              {auth.currentUser?.photoURL ? (
                <img src={auth.currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <span className="text-on-surface text-sm font-medium">{userName.split(' ')[0]}</span>
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant transition-transform duration-200" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
          </div>

          {dropdownOpen && (
            <div className="absolute top-full right-0 mt-3 w-56 bg-surface-container-high border border-outline-variant/20 rounded-2xl shadow-xl overflow-hidden py-2 z-50 animate-in fade-in slide-in-from-top-4 duration-200 origin-top-right">
              <button 
                onClick={() => handleNavigate('profile')}
                className="w-full text-left px-4 py-3 text-sm text-on-surface hover:bg-surface-container hover:text-primary transition-colors flex items-center gap-3"
              >
                <span className="material-symbols-outlined text-[18px]">person</span>
                Meu Perfil
              </button>
              <button 
                onClick={() => handleNavigate('settings')}
                className="w-full text-left px-4 py-3 text-sm text-on-surface hover:bg-surface-container hover:text-primary transition-colors flex items-center gap-3 border-t border-outline-variant/10"
              >
                <span className="material-symbols-outlined text-[18px]">settings</span>
                Configurações
              </button>
              <button 
                onClick={() => handleNavigate('support')}
                className="w-full text-left px-4 py-3 text-sm text-on-surface hover:bg-surface-container hover:text-primary transition-colors flex items-center gap-3 border-t border-outline-variant/10"
              >
                <span className="material-symbols-outlined text-[18px]">help</span>
                Suporte
              </button>
              <button 
                onClick={() => auth.signOut()}
                className="w-full text-left px-4 py-3 text-sm text-error hover:bg-error/10 transition-colors flex items-center gap-3 border-t border-outline-variant/10 font-bold"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                Sair da Conta
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
