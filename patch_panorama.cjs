const fs = require('fs');

const path = 'src/components/Panorama.tsx';
let content = fs.readFileSync(path, 'utf8');

const newSymbols = `  const technicalSymbols = [
    // Majors
    { id: 'FX:EURUSD', label: 'EUR/USD' },
    { id: 'FX:GBPUSD', label: 'GBP/USD' },
    { id: 'FX:USDJPY', label: 'USD/JPY' },
    { id: 'FX:USDCHF', label: 'USD/CHF' },
    { id: 'FX:USDCAD', label: 'USD/CAD' },
    { id: 'FX:AUDUSD', label: 'AUD/USD' },
    { id: 'FX:NZDUSD', label: 'NZD/USD' },
    // Crosses
    { id: 'FX:EURJPY', label: 'EUR/JPY' },
    { id: 'FX:GBPJPY', label: 'GBP/JPY' },
    { id: 'FX:EURGBP', label: 'EUR/GBP' },
    { id: 'FX:AUDJPY', label: 'AUD/JPY' },
    { id: 'FX:EURAUD', label: 'EUR/AUD' },
    { id: 'FX:GBPAUD', label: 'GBP/AUD' },
    // Commodities/Crypto
    { id: 'OANDA:XAUUSD', label: 'XAU/USD' },
    { id: 'BINANCE:BTCUSD', label: 'BTC/USD' },
  ] as const;`;

content = content.replace(/const technicalSymbols = \[[\s\S]*?\] as const;/, newSymbols);

fs.writeFileSync(path, content);
console.log('Panorama updated');
