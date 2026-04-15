import React, { createContext, useState, useContext, useEffect } from 'react';

type Currency = 'USD' | 'EUR' | 'GBP' | 'AOA' | 'BRL';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatCurrency: (value: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrency] = useState<Currency>('USD');

  useEffect(() => {
    const saved = localStorage.getItem('app_currency') as Currency;
    if (saved) setCurrency(saved);
  }, []);

  const handleSetCurrency = (c: Currency) => {
    setCurrency(c);
    localStorage.setItem('app_currency', c);
  };

  const formatCurrency = (value: number) => {
    let formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currency }).format(value);
    return formatted.replace('US$', '$').replace('US$ ', '$');
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency: handleSetCurrency, formatCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error('useCurrency must be used within CurrencyProvider');
  return context;
};
