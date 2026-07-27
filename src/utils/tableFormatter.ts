export function parseAndFormatTables(text: string, theme: 'dark' | 'light' = 'dark'): string {
  if (!text) return text;

  const lines = text.split('\n');
  const resultLines: string[] = [];
  let currentTableRows: string[][] = [];
  let isInsideTable = false;

  const isSeparatorLine = (line: string) => {
    return /^\|?\s*:?-+:?\s*(\|?\s*:?-+:?\s*)+\|?$/.test(line.trim());
  };

  const getRowCells = (line: string): string[] | null => {
    const trimmed = line.trim();
    if (!trimmed) return null;

    // Check for pipe delimited (| col1 | col2 | or col1 | col2)
    if (trimmed.includes('|')) {
      let cells = trimmed.split('|').map(c => c.trim());
      if (cells[0] === '') cells.shift();
      if (cells.length > 0 && cells[cells.length - 1] === '') cells.pop();
      if (cells.length >= 2) return cells;
    }

    // Check for tab delimited (\t)
    if (line.includes('\t')) {
      const cells = line.split('\t').map(c => c.trim()).filter(c => c !== '');
      if (cells.length >= 2) return cells;
    }

    // Check for 3+ spaces delimited if line has multiple columns (e.g. copied from plain text matrix)
    if (/\s{3,}/.test(trimmed)) {
      const cells = trimmed.split(/\s{3,}/).map(c => c.trim()).filter(c => c !== '');
      if (cells.length >= 3) return cells;
    }

    return null;
  };

  const flushTable = () => {
    if (currentTableRows.length === 0) return;

    const hasHeader = currentTableRows.length > 1;
    const headerRow = currentTableRows[0];
    const bodyRows = hasHeader ? currentTableRows.slice(1) : currentTableRows;

    let html = `<div class="my-6 overflow-x-auto rounded-2xl border border-outline-variant/20 bg-surface-container-low/90 shadow-xl p-1 md:p-2 scrollbar-thin">`;
    html += `<table class="w-full min-w-[600px] md:min-w-[700px] text-left border-collapse text-xs md:text-sm">`;

    if (hasHeader) {
      html += `<thead class="bg-surface-container-high/90 border-b border-outline-variant/30 text-[11px] font-mono uppercase tracking-wider text-primary"><tr>`;
      headerRow.forEach(cell => {
        html += `<th class="p-3.5 md:p-4 font-black">${formatCellContent(cell, theme)}</th>`;
      });
      html += `</tr></thead>`;
    }

    html += `<tbody class="divide-y divide-outline-variant/10 font-sans">`;
    bodyRows.forEach((row, rowIndex) => {
      const bgClass = rowIndex % 2 === 0 ? 'bg-transparent' : 'bg-surface-container-high/20';
      html += `<tr class="${bgClass} hover:bg-surface-container-highest/30 transition-colors">`;
      row.forEach((cell, cellIndex) => {
        const isFirstCol = cellIndex === 0;
        const fontClass = isFirstCol ? 'font-bold text-on-surface' : 'text-on-surface-variant';
        html += `<td class="p-3.5 md:p-4 align-middle ${fontClass}">${formatCellContent(cell, theme)}</td>`;
      });
      html += `</tr>`;
    });

    html += `</tbody></table></div>`;
    resultLines.push(html);
    currentTableRows = [];
    isInsideTable = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (isSeparatorLine(line)) {
      // Markdown separator line like |---|---|---|
      continue;
    }

    const cells = getRowCells(line);

    if (cells && cells.length >= 2) {
      currentTableRows.push(cells);
      isInsideTable = true;
    } else {
      if (isInsideTable) {
        flushTable();
      }
      resultLines.push(line);
    }
  }

  if (isInsideTable) {
    flushTable();
  }

  return resultLines.join('\n');
}

export function formatCellContent(cell: string, theme: 'dark' | 'light' = 'dark'): string {
  if (!cell) return '';

  let formatted = cell;

  // Format intensity numbers like "6/10", "7/10", "10/10"
  formatted = formatted.replace(/\b([0-9]{1,2})\/10\b/g, (_match, numStr) => {
    const val = parseInt(numStr, 10);
    let colorClass = 'bg-primary/20 text-primary border-primary/30';
    if (val >= 8) colorClass = 'bg-rose-500/20 text-rose-400 border-rose-500/30';
    else if (val >= 6) colorClass = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    else if (val <= 4) colorClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';

    return `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-black border ${colorClass}">
      <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
      ${val}/10
    </span>`;
  });

  // Format Biases (Comprado, Baixista, Vendido, Neutro, etc.)
  // Comprado / Comprado (tático) / Comprado (estrutural) / Alta
  formatted = formatted.replace(/\b(Comprado(?:\s*\([^)]+\))?|Alta|Bullish)\b/gi, 
    '<span class="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">$1</span>');

  // Baixista / Vendido / Vendido (tático) / Baixa / Bearish
  formatted = formatted.replace(/\b(Baixista(?:\s*\([^)]+\))?|Vendido(?:\s*\([^)]+\))?|Baixa|Bearish)\b/gi, 
    '<span class="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-black bg-rose-500/20 text-rose-400 border border-rose-500/30 uppercase tracking-wider">$1</span>');

  // Neutro / Neutro/pressionado / Neutro/correção / Neutro/vendido
  formatted = formatted.replace(/\b(Neutro(?:\/[a-zA-Záàâãéèêíóôõúç]+)?|Correção)\b/gi, 
    '<span class="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wider">$1</span>');

  return formatted;
}

export function formatCommunityContent(text: string, theme: 'dark' | 'light' = 'dark'): string {
  if (!text) return '';

  // Escapar tags HTML para evitar XSS básico
  let formatted = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Formatar menções @usuario
  formatted = formatted.replace(/@([a-zA-Z0-9_\u00C0-\u00FF\s]+?)(?=\s|$|[,.?!])/g, (match, username) => {
    return `<span class="font-extrabold text-primary bg-primary/10 px-1 rounded inline-flex items-center">@${username}</span>`;
  });

  // Identificar cabeçalhos numerados (ex: "18. Matriz C Profit Macro") e markdown (# Cabeçalho)
  const h3Class = theme === 'dark' 
    ? 'text-white font-black text-xl mt-4 mb-2 font-headline border-b border-outline-variant/20 pb-2 flex items-center gap-2' 
    : 'text-neutral-900 font-black text-xl mt-4 mb-2 font-headline border-b border-neutral-300 pb-2 flex items-center gap-2';
  
  formatted = formatted.replace(/^(#+)\s+(.+)$/gm, `<h3 class="${h3Class}">$2</h3>`);
  formatted = formatted.replace(/^(\d+\.\s+[^\n]+)$/gm, `<h3 class="${h3Class}">$1</h3>`);

  // Parse e formata tabelas/matrizes coladas
  formatted = parseAndFormatTables(formatted, theme);

  // Identificar negrito **texto**
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-extrabold text-on-surface">$1</strong>');

  // Identificar Forte/Fraco
  formatted = formatted.replace(/\bForte\b/gi, '<span class="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-xs font-black uppercase tracking-wider">Forte</span>');
  formatted = formatted.replace(/\bFraco\b/gi, '<span class="bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded text-xs font-black uppercase tracking-wider">Fraco</span>');

  // Identificar Risk-on / Risk-off
  formatted = formatted.replace(/\bRisk-on\b/gi, '<span class="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-xs font-black border border-emerald-500/30">RISK-ON</span>');
  formatted = formatted.replace(/\bRisk-off\b/gi, '<span class="bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded text-xs font-black border border-rose-500/30">RISK-OFF</span>');

  return formatted;
}
