import React, { useState, useRef, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DatePickerProps {
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  className?: string;
}

export function DatePicker({ date, onDateChange, className = '' }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDate = (date: Date) => format(date, 'dd/MM/yyyy', { locale: ptBR });

  const displayValue = date ? formatDate(date) : 'Selecionar data';

  return (
    <div className={`relative ${className}`} ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-surface-container-highest border border-outline-variant/30 text-on-surface px-4 py-3 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-on-surface-variant">calendar_month</span>
          <span>{displayValue}</span>
        </div>
        <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
          {isOpen ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 left-0 bg-surface-container-low border border-outline-variant/20 rounded-xl shadow-xl p-4">
          <DayPicker
            mode="single"
            selected={date}
            onSelect={(d) => {
              onDateChange(d);
              setIsOpen(false);
            }}
            locale={ptBR}
          />
        </div>
      )}
    </div>
  );
}
