import React from 'react';

export const COUNTRIES = [
  { code: 'AO', label: 'Angola', dialCode: '+244', flag: '🇦🇴' },
  { code: 'PT', label: 'Portugal', dialCode: '+351', flag: '🇵🇹' },
  { code: 'BR', label: 'Brasil', dialCode: '+55', flag: '🇧🇷' },
  { code: 'MZ', label: 'Moçambique', dialCode: '+258', flag: '🇲🇿' },
  { code: 'CV', label: 'Cabo Verde', dialCode: '+238', flag: '🇨🇻' },
  { code: 'GW', label: 'Guiné-Bissau', dialCode: '+245', flag: '🇬🇼' },
  { code: 'ST', label: 'São Tomé e Príncipe', dialCode: '+239', flag: '🇸🇹' },
  { code: 'GQ', label: 'Guiné Equatorial', dialCode: '+240', flag: '🇬🇶' }
];

interface CountryDropdownProps {
  value: string;
  onChange: (value: string) => void;
  buttonClassName?: string;
  align?: 'left' | 'right';
}

export default function CountryDropdown({ 
  value, 
  onChange, 
  buttonClassName = "bg-surface-container border border-outline-variant/10 rounded-2xl px-4 py-4 text-xs font-black text-on-surface outline-none focus:border-primary hover:bg-surface-container/80 transition-all cursor-pointer h-full select-none",
  align = 'left' 
}: CountryDropdownProps) {
  const selectedCountry = COUNTRIES.find(c => c.dialCode === value) || COUNTRIES[0];

  return (
    <div className="relative inline-block">
      {/* Native Select Overlay - invisible but occupies full button space */}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 bg-[#1e293b] text-white"
      >
        {COUNTRIES.map((c) => (
          <option 
            key={c.code} 
            value={c.dialCode}
            className="bg-[#1e293b] text-white font-sans text-sm"
          >
            {c.flag} {c.label} ({c.dialCode})
          </option>
        ))}
      </select>

      {/* Visually stunning custom select UI underneath */}
      <div
        className={`flex items-center gap-2 whitespace-nowrap pointer-events-none ${buttonClassName}`}
      >
        <img
          src={`https://flagcdn.com/w40/${selectedCountry.code.toLowerCase()}.png`}
          alt={selectedCountry.label}
          className="w-5 h-3.5 object-cover rounded shadow-sm shrink-0"
          referrerPolicy="no-referrer"
        />
        <span className="font-mono text-xs">{selectedCountry.dialCode}</span>
        <span className="text-[8px] text-on-surface-variant opacity-60">▼</span>
      </div>
    </div>
  );
}
