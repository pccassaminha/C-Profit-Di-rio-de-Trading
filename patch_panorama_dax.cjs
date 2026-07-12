const fs = require('fs');
const filepath = 'src/components/Panorama.tsx';
let content = fs.readFileSync(filepath, 'utf8');

// Update activeHeatmap type
content = content.replace(
  /useState<'sp500' \| 'nasdaq' \| 'djca' \| 'nikkei' \| 'forex' \| 'crypto'>/g,
  `useState<'sp500' | 'nasdaq' | 'djca' | 'nikkei' | 'dax' | 'forex' | 'crypto'>`
);

// Add daxHeatmapConfig after nikkeiHeatmapConfig
const configReplacement = `const nikkeiHeatmapConfig = {
    dataSource: "NKY",
    blockSize: "market_cap_basic",
    blockColor: "change",
    grouping: "sector",
    locale: "br",
    symbolUrl: "",
    colorTheme: "dark",
    exchanges: [],
    hasTopBar: true,
    isDataSetEnabled: true,
    isZoomEnabled: true,
    hasSymbolTooltip: true,
    isMonoSize: false,
    width: "100%",
    height: "100%"
  };

  const daxHeatmapConfig = {
    dataSource: "DAX",
    blockSize: "market_cap_basic",
    blockColor: "change",
    grouping: "sector",
    locale: "br",
    symbolUrl: "",
    colorTheme: "dark",
    exchanges: [],
    hasTopBar: true,
    isDataSetEnabled: true,
    isZoomEnabled: true,
    hasSymbolTooltip: true,
    isMonoSize: false,
    width: "100%",
    height: "100%"
  };`;
content = content.replace(/const nikkeiHeatmapConfig = \{[\s\S]*?height: "100%"\s*\};/, configReplacement);

// Add case 'dax' in getHeatmapProps
const switchReplacement = `case 'nikkei':
        return {
          widgetType: 'stock-heatmap' as const,
          config: nikkeiHeatmapConfig
        };
      case 'dax':
        return {
          widgetType: 'stock-heatmap' as const,
          config: daxHeatmapConfig
        };`;
content = content.replace(/case 'nikkei':\s*return \{\s*widgetType: 'stock-heatmap' as const,\s*config: nikkeiHeatmapConfig\s*\};/, switchReplacement);

// Update getHeatmapProps signature
content = content.replace(
  /const getHeatmapProps = \(type: 'sp500' \| 'nasdaq' \| 'djca' \| 'nikkei' \| 'forex' \| 'crypto'\)/g,
  `const getHeatmapProps = (type: 'sp500' | 'nasdaq' | 'djca' | 'nikkei' | 'dax' | 'forex' | 'crypto')`
);

// Add button 1 (desktop)
const nikkeiButton1 = `<button
                  onClick={() => setActiveHeatmap('nikkei')}
                  className={\`px-3 py-1.5 rounded-lg font-black uppercase text-[9px] tracking-wider transition-all cursor-pointer \${
                    activeHeatmap === 'nikkei'
                      ? 'bg-primary/20 text-primary border border-primary/20 shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }\`}
                >
                  Nikkei 225
                </button>`;

const daxButton1 = `
                <button
                  onClick={() => setActiveHeatmap('dax')}
                  className={\`px-3 py-1.5 rounded-lg font-black uppercase text-[9px] tracking-wider transition-all cursor-pointer \${
                    activeHeatmap === 'dax'
                      ? 'bg-primary/20 text-primary border border-primary/20 shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }\`}
                >
                  DAX Index
                </button>`;

content = content.replace(nikkeiButton1, nikkeiButton1 + daxButton1);

// Add button 2 (mobile/grid)
const nikkeiButton2 = `<button
                      onClick={() => setActiveHeatmap('nikkei')}
                      className={\`px-3 py-1.5 rounded-lg font-black uppercase text-[10px] tracking-wider transition-all cursor-pointer \${
                        activeHeatmap === 'nikkei'
                          ? 'bg-primary/10 text-primary border border-primary/25 shadow-sm'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }\`}
                    >
                      Nikkei 225
                    </button>`;

const daxButton2 = `
                    <button
                      onClick={() => setActiveHeatmap('dax')}
                      className={\`px-3 py-1.5 rounded-lg font-black uppercase text-[10px] tracking-wider transition-all cursor-pointer \${
                        activeHeatmap === 'dax'
                          ? 'bg-primary/10 text-primary border border-primary/25 shadow-sm'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }\`}
                    >
                      DAX Index
                    </button>`;
content = content.replace(nikkeiButton2, nikkeiButton2 + daxButton2);


fs.writeFileSync(filepath, content);
console.log('Patched DAX into Panorama');
