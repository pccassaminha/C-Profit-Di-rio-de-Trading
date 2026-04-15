import React, { useState, useRef, useEffect } from 'react';
import { DayPicker, DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import 'react-day-picker/style.css';

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  className?: string;
}

export function DateRangePicker({ dateRange, onDateRangeChange, className = '' }: DateRangePickerProps) {
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

  let displayValue = 'Selecionar período';
  if (dateRange?.from) {
    if (!dateRange.to) {
      displayValue = formatDate(dateRange.from);
    } else if (dateRange.to.getTime() === dateRange.from.getTime()) {
      displayValue = formatDate(dateRange.from);
    } else {
      displayValue = `${formatDate(dateRange.from)} - ${formatDate(dateRange.to)}`;
    }
  }

  return (
    <div className={`relative ${className}`} ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-surface-container-low border border-outline-variant/20 text-on-surface px-4 py-2.5 rounded-lg text-sm font-bold outline-none cursor-pointer hover:bg-surface-container transition-colors"
      >
        <span className="material-symbols-outlined text-[20px]">calendar_month</span>
        {displayValue}
        <span className="material-symbols-outlined text-[20px] ml-2">
          {isOpen ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 right-0 bg-surface-container-low border border-outline-variant/20 rounded-xl shadow-xl p-4">
          <DayPicker
            mode="range"
            selected={dateRange}
            onSelect={onDateRangeChange}
            locale={ptBR}
          />
          <div className="flex justify-end mt-4 pt-4 border-t border-outline-variant/20 gap-2">
            <button
              onClick={() => {
                onDateRangeChange(undefined);
                setIsOpen(false);
              }}
              className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Limpar
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 text-sm font-bold bg-primary text-on-primary rounded-lg hover:bg-primary/90 transition-colors"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
