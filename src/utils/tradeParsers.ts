// ============================================================
// C PROFIT — SISTEMA DE IMPORTAÇÃO DE TRADES
// Versão: 3.1 Final
// Suporta: CSV MatchTrades | HTML MatchTrades | HTML MT5
// Grupo Cassaminha
// ============================================================
//
// LÓGICA DA LINHA "Total" — LEIA ISTO PRIMEIRO:
// ──────────────────────────────────────────────
// A linha "Total" no fim dos ficheiros CSV e HTML do MatchTrades
// NÃO é um trade — por isso NÃO entra na tabela de trades individuais.
//
// MAS ela é CRUCIAL e é guardada separadamente para 2 fins:
//
//   1. MOSTRAR o total de comissões cobrado pelo broker no período
//      (valor visível no painel de resumo pós-importação)
//
//   2. VERIFICAR integridade: o sistema soma o profit de cada trade
//      individualmente e compara com o Total do ficheiro.
//      Se bater certo → ✓ importação íntegra
//      Se houver diferença → ⚠ aviso de inconsistência
//
// Cada parser retorna sempre:
//   trades[]      → cada trade individual, nunca somados entre si
//   summary{}     → calculado pelo sistema (soma dos trades reais)
//   fileSummary{} → valores do Total do ficheiro (broker) para comparação
//
// ============================================================


// ============================================================
// SECÇÃO 1 — UTILITÁRIOS
// ============================================================

function parseMatchTradesDate(str: string) {
  if (!str || str.trim() === '') return null;
  const [datePart, timePart] = str.trim().split(' ');
  const [day, month, year]   = datePart.split('/');
  const [hour, min, sec]     = (timePart || '00:00:00').split(':');
  return new Date(+year, +month - 1, +day, +hour, +min, +sec);
}

function parseMT5Date(str: string) {
  if (!str || str.trim() === '') return null;
  const match = str.trim().match(/(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (!match) return null;
  const [, year, month, day, hour, min, sec] = match;
  return new Date(+year, +month - 1, +day, +hour, +min, +sec);
}

function toFloat(val: any) {
  if (val === null || val === undefined) return 0;
  // Remover espaços em branco (incluindo non-breaking spaces) e substituir vírgula por ponto
  const cleaned = String(val).replace(/[\s\u00A0]/g, '').replace(',', '.').trim();
  const parsed  = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

function readFileAsText(file: File, encoding = 'UTF-8'): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader   = new FileReader();
    reader.onload  = (e) => resolve(e.target?.result as string);
    reader.onerror = ()  => reject(new Error(`Erro ao ler ficheiro: ${file.name}`));
    reader.readAsText(file, encoding);
  });
}

/**
 * Calcula o resumo FINANCEIRO a partir dos trades INDIVIDUAIS.
 * É este valor que o sistema usa — nunca o Total do ficheiro directamente.
 * O Total do ficheiro serve apenas para validação/comparação.
 */
function calcSummary(trades: any[]) {
  const wins   = trades.filter(t => t.profit > 0);
  const losses = trades.filter(t => t.profit < 0);
  const be     = trades.filter(t => t.profit === 0);

  const grossProfit = wins.reduce((s, t) => s + t.profit, 0);
  const grossLoss   = losses.reduce((s, t) => s + t.profit, 0);
  const totalComm   = trades.reduce((s, t) => s + t.commission, 0);
  const totalSwap   = trades.reduce((s, t) => s + t.swap, 0);
  const netProfit   = grossProfit + grossLoss + totalComm + totalSwap;

  return {
    totalTrades:     trades.length,
    wins:            wins.length,
    losses:          losses.length,
    breakeven:       be.length,
    winRate:         trades.length > 0 ? +((wins.length / trades.length) * 100).toFixed(2) : 0,
    grossProfit:     +grossProfit.toFixed(2),
    grossLoss:       +grossLoss.toFixed(2),
    totalCommission: +totalComm.toFixed(2),
    totalSwap:       +totalSwap.toFixed(2),
    netProfit:       +netProfit.toFixed(2),
  };
}

/**
 * Compara o resumo calculado pelo sistema com o Total do ficheiro (broker).
 * Retorna um objecto de verificação com status e mensagem.
 *
 * Este painel de verificação deve ser MOSTRADO ao utilizador após cada importação
 * para confirmar que os dados foram lidos correctamente.
 */
function verificarIntegridade(summary: any, fileSummary: any) {
  if (!fileSummary) {
    return {
      status:  'SEM_TOTAL',
      ok:      null,
      message: 'Ficheiro não contém linha de Total para comparação (normal em MT5).',
      detalhe: null,
    };
  }

  const diffProfit = +(summary.netProfit - fileSummary.profit).toFixed(2);
  const diffComm   = +(summary.totalCommission - fileSummary.commission).toFixed(2);
  const diffSwap   = +(summary.totalSwap - fileSummary.swap).toFixed(2);
  const ok         = Math.abs(diffProfit) <= 0.02;

  return {
    status:  ok ? 'OK' : 'DIVERGENCIA',
    ok,

    // Valores calculados pelo sistema (soma dos trades individuais)
    calculado: {
      profit:     summary.netProfit,
      commission: summary.totalCommission,
      swap:       summary.totalSwap,
    },

    // Valores do Total do ficheiro (broker)
    broker: {
      profit:     fileSummary.profit,
      commission: fileSummary.commission,
      swap:       fileSummary.swap,
    },

    // Diferenças
    diferenca: {
      profit: diffProfit,
      commission: diffComm,
      swap:   diffSwap,
    },

    message: ok
      ? `✓ Dados verificados — o profit calculado (${summary.netProfit}) bate certo com o broker (${fileSummary.profit}).`
      : `⚠ Divergência detectada — sistema calculou ${summary.netProfit} mas broker diz ${fileSummary.profit}. Diferença: ${diffProfit}.`,
  };
}


// ============================================================
// SECÇÃO 2 — PARSER CSV (MatchTrades)
// ============================================================
//
// SOBRE A LINHA "Total" no CSV:
//   Última linha do ficheiro:  Total,,,,,,,,,,0.00,-45.34,-185.16,
//   ─ NÃO entra no array trades[]
//   ─ É guardada em fileSummary{} para:
//       a) Mostrar total de comissões cobradas pelo broker
//       b) Comparar com o profit calculado trade a trade
//
// ============================================================

const calcularRR = (entry: number, sl: number, tp: number) => {
  if (!entry || !sl || !tp || sl === 0 || tp === 0) return 0;
  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp - entry);
  if (risk === 0) return 0;
  return Number((reward / risk).toFixed(2));
};

function parseMatchTradesCSV(csvText: string, accountId: string) {

  const lines = csvText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) throw new Error('Ficheiro CSV vazio ou sem trades.');

  const dataLines  = lines.slice(1); // ignorar cabeçalho
  const trades     = [];
  let   fileSummary: any = null;

  for (const line of dataLines) {
    const cols = line.split(',');

    // ── LINHA "Total" ──────────────────────────────────────────────────────
    // Detectada quando a primeira coluna é exactamente "Total"
    // Guardada em fileSummary — NÃO adicionada ao array trades
    if (cols[0]?.trim().toLowerCase() === 'total') {
      fileSummary = {
        swap:       toFloat(cols[10]),  // total de swap do período
        commission: toFloat(cols[11]),  // total de comissões do período
        profit:     toFloat(cols[12]),  // profit total segundo o broker
      };
      continue; // passa para a linha seguinte — não processa como trade
    }

    if (cols.length < 14) continue;

    // 0=ID 1=Symbol 2=OpenTime 3=Volume 4=Side 5=CloseTime
    // 6=OpenPrice 7=ClosePrice 8=SL 9=TP 10=Swap 11=Commission 12=Profit 13=Reason
    const size = toFloat(cols[3]);
    if (size <= 0) continue; // Desconsiderar trades com volume/lotes igual ou inferior a 0

    const profit     = toFloat(cols[12]);
    const commission = toFloat(cols[11]);
    const swap       = toFloat(cols[10]);

    trades.push({
      ticket:     cols[0].trim(),
      symbol:     cols[1].trim().toUpperCase(),
      openTime:   parseMatchTradesDate(cols[2]),
      closeTime:  parseMatchTradesDate(cols[5]),
      size,
      action:     cols[4].trim().toUpperCase() === 'BUY' ? 'Buy' : 'Sell',
      openPrice:  toFloat(cols[6]),
      closePrice: toFloat(cols[7]),
      sl:         toFloat(cols[8]),
      tp:         toFloat(cols[9]),
      date:       cols[2]?.trim()?.split(' ')[0] || '',
      entryTime:  cols[2]?.trim()?.split(' ')[1] || '',
      swap,
      commission,
      pnl:        profit, // We will use pnl as grossProfit, or net depending. Let's keep profit
      profit:     profit,
      rr:         calcularRR(toFloat(cols[6]), toFloat(cols[8]), toFloat(cols[9])),
      netResult:  +(profit + commission + swap).toFixed(2),
      reason:     (cols[13] || '').trim(),
      isWin:      profit > 0,
      isLoss:     profit < 0,
      source:     'MATCHTRADES_CSV',
      accountId,
      type: 'forex',
      session:    detectSession(cols[2]?.trim()?.split(' ')[1] || ''),
      notes: '',
      psychology: ''
    });
  }

  const summary      = calcSummary(trades);
  const verificacao  = verificarIntegridade(summary, fileSummary);

  console.log(`[CSV Parser] ${verificacao.message}`);

  return { trades, summary, fileSummary, verificacao };
}


// ============================================================
// SECÇÃO 3 — PARSER HTML (MatchTrades)
// ============================================================
//
// SOBRE A LINHA "Total" no HTML:
//   <tr style="background:#25c4ee99">
//     <th>Total</th><th></th>...<th>0.00</th><th>-45.34</th><th>-185.16</th>
//   </tr>
//   ─ Identificada porque a primeira célula é <th> com texto "Total"
//   ─ NÃO entra no array trades[]
//   ─ Guardada em fileSummary{} para verificação e exibição de comissões
//
// ============================================================

function parseMatchTradesHTML(htmlText: string, accountId: string) {

  const parser = new DOMParser();
  const doc    = parser.parseFromString(htmlText, 'text/html');

  const allRows    = doc.querySelectorAll('table tr');
  const trades     = [];
  let   fileSummary: any = null;

  for (const row of Array.from(allRows)) {
    const cells     = Array.from(row.querySelectorAll('th, td'));
    if (cells.length < 14) continue;

    const firstText = cells[0]?.textContent?.trim();
    const firstTag  = cells[0]?.tagName?.toUpperCase();

    // ── LINHA "Total" ──────────────────────────────────────────────────────
    // Primeira célula é <th> com texto "Total"
    // Guardada para verificação — NÃO é trade
    if (firstText === 'Total') {
      fileSummary = {
        swap:       toFloat(cells[10]?.textContent),  // total swap do período
        commission: toFloat(cells[11]?.textContent),  // total comissões do período
        profit:     toFloat(cells[12]?.textContent),  // profit total segundo o broker
      };
      continue; // não processar como trade
    }

    // ── Ignorar cabeçalho (linha com <th>ID</th>) ─────────────────────────
    if (firstText === 'ID' || firstTag === 'TH') continue;
    if (!firstText || firstText === '') continue;

    // 0=ID 1=Symbol 2=OpenTime 3=Volume 4=Side 5=CloseTime
    // 6=OpenPrice 7=ClosePrice 8=SL 9=TP 10=Swap 11=Commission 12=Profit 13=Reason
    const getText    = (i: number) => cells[i]?.textContent?.trim() ?? '';
    const size       = toFloat(getText(3));
    if (size <= 0) continue; // Desconsiderar trades com volume/lotes igual ou inferior a 0

    const profit     = toFloat(getText(12));
    const commission = toFloat(getText(11));
    const swap       = toFloat(getText(10));

    trades.push({
      ticket:     getText(0),
      symbol:     getText(1).toUpperCase(),
      openTime:   parseMatchTradesDate(getText(2)),
      closeTime:  parseMatchTradesDate(getText(5)),
      size,
      action:     getText(4).toUpperCase() === 'BUY' ? 'Buy' : 'Sell',
      openPrice:  toFloat(getText(6)),
      closePrice: toFloat(getText(7)),
      sl:         toFloat(getText(8)),
      tp:         toFloat(getText(9)),
      date:       getText(2)?.split(' ')[0] || '',
      entryTime:  getText(2)?.split(' ')[1] || '',
      swap,
      commission,
      profit,
      pnl:        profit, // Map to Trade info
      rr:         calcularRR(toFloat(getText(6)), toFloat(getText(8)), toFloat(getText(9))),
      netResult:  +(profit + commission + swap).toFixed(2),
      reason:     getText(13),
      isWin:      profit > 0,
      isLoss:     profit < 0,
      source:     'MATCHTRADES_HTML',
      accountId,
      type: 'forex',
      session:    detectSession(getText(2)?.split(' ')[1] || ''),
      notes: '',
      psychology: ''
    });
  }

  const summary     = calcSummary(trades);
  const verificacao = verificarIntegridade(summary, fileSummary);

  console.log(`[HTML MatchTrades Parser] ${verificacao.message}`);

  return { trades, summary, fileSummary, verificacao };
}


// ============================================================
// SECÇÃO 4 — PARSER HTML (MetaTrader 5)
// ============================================================
//
// O MT5 NÃO tem linha "Total" separada — tem um bloco de estatísticas
// no fim do ficheiro com "Total Net Profit", "Gross Profit", etc.
// Esses valores são extraídos para fileSummary e usados para verificação.
//
// Regra crítica: profit POSITIVO = ganhou | NEGATIVO = perdeu
// NÃO inverter o sinal com base no side (buy/sell).
//
// ============================================================

async function parseMT5HTML(file: File, accountId: string) {

  // Ler como UTF-16LE (encoding nativo dos ficheiros MT5)
  let rawText;
  try {
    rawText = await readFileAsText(file, 'UTF-16LE');
  } catch (e) {
    rawText = await readFileAsText(file, 'UTF-8');
  }

  const cleanText = rawText.replace(/\x00/g, '');

  const parser  = new DOMParser();
  const doc     = parser.parseFromString(cleanText, 'text/html');
  const trades  = [];
  let   parsing = false;

  const STOP_KEYWORDS = [
    'total net profit', 'gross profit', 'profit factor',
    'balance drawdown', 'recovery factor', 'total trades',
    'lucro líquido total', 'lucro bruto', 'fator de lucro',
    'rebaixamento do saldo', 'fator de recuperação', 'total de negociações',
    'beneficio neto total', 'beneficio bruto', 'factor de beneficio',
    'drawdown del balance', 'factor de recuperación', 'transacciones totales'
  ];

  const rows = doc.querySelectorAll('table tr');

  for (const row of Array.from(rows)) {
    const allCells  = Array.from(row.querySelectorAll('td, th'));
    if (allCells.length === 0) continue;

    const rowText   = row.textContent?.toLowerCase().trim() || '';
    const firstText = allCells[0]?.textContent?.trim().toLowerCase() || '';

    if (!parsing) {
      if (
        (rowText.includes('positions') && !rowText.includes('closed positions')) ||
        (rowText.includes('posições') && !rowText.includes('posições fechadas')) ||
        (rowText.includes('posiciones') && !rowText.includes('posiciones cerradas'))
      ) {
        parsing = true;
      }
      continue;
    }

    if (STOP_KEYWORDS.some(kw => rowText.startsWith(kw))) break;

    if (firstText === 'time' || allCells[0]?.tagName === 'TH') continue;
    if (allCells.length < 5) continue;
    if (allCells[3]?.textContent?.trim().toLowerCase() === 'balance') continue;

    // Filtrar célula hidden (colspan="8") — crítico para índices correctos
    const visibleCells = allCells.filter(td => !td.classList.contains('hidden'));
    if (visibleCells.length < 13) continue;

    const firstCellText = visibleCells[0]?.textContent?.trim();
    if (!firstCellText?.match(/^\d{4}\.\d{2}\.\d{2}/)) continue;

    const getText  = (i: number) => visibleCells[i]?.textContent?.trim() ?? '';
    const getFloat = (i: number) => toFloat(getText(i));

    // visível[0]=OpenTime  [1]=PositionID  [2]=Symbol   [3]=Type
    // visível[4]=Volume    [5]=OpenPrice   [6]=SL        [7]=TP
    // visível[8]=CloseTime [9]=ClosePrice  [10]=Comm    [11]=Swap  [12]=Profit

    const size = getFloat(4);
    if (size <= 0) continue; // Desconsiderar trades com volume/lotes igual ou inferior a 0

    const profit     = getFloat(12);
    const commission = getFloat(10);
    const swap       = getFloat(11);

    trades.push({
      ticket:     getText(1),
      symbol:     getText(2).toUpperCase(),
      openTime:   parseMT5Date(getText(0)),
      closeTime:  parseMT5Date(getText(8)),
      size,
      action:     getText(3).toUpperCase() === 'BUY' ? 'Buy' : 'Sell',
      openPrice:  getFloat(5),
      closePrice: getFloat(9),
      sl:         getFloat(6),
      tp:         getFloat(7),
      date:       getText(0)?.split(' ')[0] || '',
      entryTime:  getText(0)?.split(' ')[1] || '',
      swap,
      commission,
      profit,
      pnl:        profit, // Map to Trade info
      rr:         calcularRR(getFloat(5), getFloat(6), getFloat(7)),
      netResult:  +(profit + commission + swap).toFixed(2),
      reason:     profit > 0 ? 'TP' : 'SL',
      isWin:      profit > 0,
      isLoss:     profit < 0,
      source:     'MT5_HTML',
      accountId,
      type: 'forex',
      session:    detectSession(getText(0)?.split(' ')[1] || ''),
      notes: '',
      psychology: ''
    });
  }

  const summary = calcSummary(trades);

  // Extrair "Total Net Profit" do bloco de estatísticas do MT5
  // para usar como fileSummary na verificação
  let fileSummary: any = null;
  const totalMatch = cleanText.match(/(?:Total Net Profit|Lucro Líquido Total|Beneficio Neto Total).*?<b>([-\d.\s]+)<\/b>/is);
  if (totalMatch) {
    fileSummary = {
      profit:     parseFloat(totalMatch[1].replace(/\s/g, '')),
      commission: summary.totalCommission, // MT5 não separa comissões no bloco final
      swap:       summary.totalSwap,
    };
  }

  const verificacao = verificarIntegridade(summary, fileSummary);
  console.log(`[MT5 Parser] ${verificacao.message}`);

  return { trades, summary, fileSummary, verificacao };
}


// ============================================================
// SECÇÃO OB — PARSER CSV (Opções Binárias)
// ============================================================
function parseOBCsv(csvText: string, accountId: string) {
  const lines = csvText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) throw new Error('Ficheiro CSV vazio ou sem trades.');

  const headerLine = lines[0];
  const headers = headerLine.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => h.replace(/^"|"$/g, '').trim());

  const infoIdx = headers.findIndex(h => h === 'Informações');
  const openTimeIdx = headers.findIndex(h => h === 'Hora de abertura');
  const openPriceIdx = headers.findIndex(h => h === 'Preço de abertura');
  const closeTimeIdx = headers.findIndex(h => h === 'Hora de fechamento');
  const closePriceIdx = headers.findIndex(h => h === 'Preço de fechamento');
  const valueIdx = headers.findIndex(h => h === 'Valor');
  const returnIdx = headers.findIndex(h => h === 'Renda');
  const actionIdx = headers.findIndex(h => h === 'Modelo');
  const idIdx = headers.findIndex(h => h === 'ID');

  if (infoIdx === -1 || valueIdx === -1 || returnIdx === -1) {
    throw new Error('Formato de colunas inválido para Opções Binárias.');
  }

  const dataLines = lines.slice(1);
  const trades = [];

  for (const line of dataLines) {
    if (line.toLowerCase().startsWith('total')) continue;

    const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, ''));
    if (cols.length < headers.length) continue;

    const size = toFloat(cols[valueIdx]);
    const renda = toFloat(cols[returnIdx]);
    
    // Se renda == 0 -> perdeu (profit = -size)
    // Se renda > 0 -> ganhou (profit = renda - size)
    const profit = +(renda === 0 ? -size : (renda - size)).toFixed(2);
    
    const openTimeStr = cols[openTimeIdx] || '';
    const closeTimeStr = cols[closeTimeIdx] || '';
    
    let openDate = new Date(openTimeStr.replace(/-/g, '/'));
    let closeDate = new Date(closeTimeStr.replace(/-/g, '/'));
    
    if (isNaN(openDate.getTime())) openDate = new Date();
    if (isNaN(closeDate.getTime())) closeDate = new Date();

    const [datePart, timePart] = openTimeStr.split(' ');
    
    let formattedDate = datePart;
    if (datePart && datePart.includes('-')) {
      // YYYY-MM-DD -> DD/MM/YYYY for consistency
      const [y, m, d] = datePart.split('-');
      if (y && m && d) formattedDate = `${d}/${m}/${y}`;
    }

    let timeframe = 'M1';
    if (!isNaN(openDate.getTime()) && !isNaN(closeDate.getTime())) {
      const diffSecs = Math.abs(Math.round((closeDate.getTime() - openDate.getTime()) / 1000));
      if (diffSecs <= 90) timeframe = 'M1';
      else if (diffSecs <= 360) timeframe = 'M5';
      else if (diffSecs <= 1000) timeframe = 'M15';
      else if (diffSecs <= 2000) timeframe = 'M30';
      else if (diffSecs <= 4000) timeframe = 'H1';
      else if (diffSecs <= 15000) timeframe = 'H4';
      else timeframe = 'D1+';
    }

    trades.push({
      ticket: cols[idIdx] || Math.random().toString(36).substring(7),
      symbol: cols[infoIdx].toUpperCase(),
      openTime: openDate,
      closeTime: closeDate,
      size,
      action: cols[actionIdx]?.toLowerCase().includes('baixo') ? 'Sell' : 'Buy',
      openPrice: toFloat(cols[openPriceIdx]),
      closePrice: toFloat(cols[closePriceIdx]),
      sl: 0,
      tp: 0,
      date: formattedDate,
      entryTime: timePart || '',
      timeframe,
      swap: 0,
      commission: 0,
      pnl: profit,
      profit: profit,
      rr: 0,
      netResult: profit,
      reason: profit > 0 ? 'Win' : 'Loss',
      isWin: profit > 0,
      isLoss: profit < 0,
      source: 'OB_CSV',
      accountId,
      type: 'ob',
      session: detectSession(timePart || '', true),
      notes: '',
      psychology: ''
    });
  }

  const summary = calcSummary(trades);
  const fileSummary = { swap: 0, commission: 0, profit: summary.netProfit };
  const verificacao = verificarIntegridade(summary, fileSummary);

  console.log(`[OB CSV Parser] ${verificacao.message}`);

  return { trades, summary, fileSummary, verificacao };
}

// ============================================================
// SECÇÃO 5 — DETECÇÃO AUTOMÁTICA DO TIPO DE FICHEIRO
// ============================================================

function detectAccountNumber(text: string): string | null {
  // Pattern 1: MT5 "Account: 123456"
  const mt5Match = text.match(/Account:\s*(\d+)/i);
  if (mt5Match) return mt5Match[1];

  // Pattern 2: MatchTrades HTML header table often has account info
  const mtMatch = text.match(/Account\s*ID:\s*(\d+)/i) || text.match(/Account:\s*(\d+)/i);
  if (mtMatch) return mtMatch[1];
  
  return null;
}

export async function importTradeFile(file: File, accountId: string, accountType: 'forex' | 'ob' = 'forex') {
  if (!file) throw new Error('Nenhum ficheiro seleccionado.');

  const fileName = file.name.toLowerCase();
  const ext      = fileName.split('.').pop();
  let detectedAccountId: string | null = null;

  if (ext === 'csv') {
    const text   = await readFileAsText(file, 'UTF-8');
    detectedAccountId = detectAccountNumber(text);

    // Detecção OB vs Forex
    const isOBFile = text.includes('Renda') || text.includes('Informações') || text.includes('Preço de abertura');

    if (accountType === 'ob') {
      if (!isOBFile) throw new Error('O ficheiro selecionado não parece ser um histórico de Opções Binárias. Verifique se selecionou o arquivo correto.');
      return { ...parseOBCsv(text, accountId), source: 'OB_CSV', detectedAccountId };
    } else {
      if (isOBFile) throw new Error('O ficheiro selecionado parece ser de Opções Binárias, mas a conta atual é de Forex/Índices. Troque a conta ou selecione outro arquivo.');
      return { ...parseMatchTradesCSV(text, accountId), source: 'MATCHTRADES_CSV', detectedAccountId };
    }
  }

  if (ext === 'html' || ext === 'htm') {
    let previewText = '';
    try { previewText = await readFileAsText(file, 'UTF-8'); } catch (_) {}
    
    // Check for weird encodings for detection
    if (!previewText || previewText.includes('\x00')) {
       try { previewText = await readFileAsText(file, 'UTF-16LE'); } catch (_) {}
    }

    detectedAccountId = detectAccountNumber(previewText);

    // HTMLs geralmente são de Forex (MT5, MatchTrades). Se o usuário está numa conta OB, impedir.
    if (accountType === 'ob') {
      throw new Error('A conta atual é de Opções Binárias, mas você está importando um arquivo HTML (Forex). Por favor, importe o CSV de OB correto.');
    }

    const isMT5 =
      previewText.includes('Trade History Report') ||
      previewText.includes('mso-number-format')    ||
      previewText.includes('client terminal')      ||
      previewText.includes('Balance Drawdown');

    const isMatchTrades =
      previewText.includes('Closed Positions') ||
      previewText.includes('25c4ee')           ||
      previewText.includes('EquityEdge')       ||
      (previewText.includes('<th>ID</th>') && previewText.includes('<th>Reason</th>'));

    if (isMT5) {
      const result = await parseMT5HTML(file, accountId);
      return { ...result, source: 'MT5_HTML', detectedAccountId };
    }

    if (isMatchTrades) {
      const result = parseMatchTradesHTML(previewText, accountId);
      return { ...result, source: 'MATCHTRADES_HTML', detectedAccountId };
    }

    // Fallback
    const result = parseMatchTradesHTML(previewText, accountId);
    return { ...result, source: 'MATCHTRADES_HTML', detectedAccountId };
  }

  throw new Error(`Formato "${ext}" não suportado. Aceites: .csv, .html`);
}

export function detectSession(entryTime: string, isOB = false): string {
  if (!entryTime) return 'Importado';
  
  // Format entryTime to HH:MM (strip seconds if present)
  const timePart = entryTime.split(' ')[1] || entryTime.split(' ')[0];
  const timeMatch = timePart.match(/^(\d{2}):(\d{2})/);
  if (!timeMatch) return 'Importado';
  
  const hour = parseInt(timeMatch[1], 10);
  const min = parseInt(timeMatch[2], 10);
  const tVal = hour * 60 + min;

  if (isOB) {
    // Opções Binárias: Meia-noite (00:00 - 04:59), Dia (06:00 às 18:00), Noite (o resto)
    if (hour >= 0 && hour < 5) {
      return "Meia-noite";
    } else if (hour >= 6 && hour < 18) {
      return "Dia";
    } else {
      return "Noite";
    }
  }

  // Detecção de Sessões de Forex personalizada
  const sessionType = localStorage.getItem('app_session_type') || 'subdivided';
  const appSessions = localStorage.getItem('app_sessions');
  let userSessions = [
    { id: 'asian', name: 'Sessão Asiática', start: '20:00', end: '04:00' },
    { id: 'london', name: 'Sessão de Londres', start: '03:00', end: '11:00' },
    { id: 'newyork', name: 'Sessão de Nova York', start: '08:00', end: '17:00' },
  ];
  
  if (appSessions) {
    try {
      userSessions = JSON.parse(appSessions);
    } catch (_) {}
  }

  for (const session of userSessions) {
    const sMatch = session.start.match(/^(\d{2}):(\d{2})/);
    const eMatch = session.end.match(/^(\d{2}):(\d{2})/);
    if (!sMatch || !eMatch) continue;

    const sHour = parseInt(sMatch[1], 10);
    const sMin = parseInt(sMatch[2], 10);
    const sVal = sHour * 60 + sMin;

    const eHour = parseInt(eMatch[1], 10);
    const eMin = parseInt(eMatch[2], 10);
    const eVal = eHour * 60 + eMin;

    let inSession = false;
    if (sVal <= eVal) {
      inSession = tVal >= sVal && tVal <= eVal;
    } else {
      inSession = tVal >= sVal || tVal <= eVal;
    }

    if (inSession) {
      // Mapear o nome base da sessão em português coerente
      let baseName = 'Londres';
      const lowercaseName = session.name.toLowerCase();
      if (session.id === 'asian' || lowercaseName.includes('asiática') || lowercaseName.includes('asiatica') || lowercaseName.includes('asian')) {
        baseName = 'Asiática';
      } else if (session.id === 'newyork' || lowercaseName.includes('nova york') || lowercaseName.includes('nova iorque') || lowercaseName.includes('new york') || lowercaseName.includes('newyork')) {
        baseName = 'Nova Iorque';
      } else if (session.id === 'london' || lowercaseName.includes('londres') || lowercaseName.includes('london')) {
        baseName = 'Londres';
      } else {
        baseName = session.name;
      }

      if (sessionType === 'simple') {
        return baseName;
      } else {
        const subs = (session as any).subdivisions || {
          pre: { start: session.id === 'asian' ? '20:00' : session.id === 'london' ? '03:00' : '08:00', end: session.id === 'asian' ? '21:00' : session.id === 'london' ? '04:00' : '09:30', label: 'Pré-Mercado' },
          intra: { start: session.id === 'asian' ? '21:00' : session.id === 'london' ? '04:00' : '09:30', end: session.id === 'asian' ? '02:00' : session.id === 'london' ? '09:00' : '14:30', label: 'Intra Mercado' },
          noop: { start: session.id === 'asian' ? '02:00' : session.id === 'london' ? '09:00' : '14:30', end: session.id === 'asian' ? '03:00' : session.id === 'london' ? '10:00' : '16:00', label: 'Zona Não Operável' },
          close: { start: session.id === 'asian' ? '03:00' : session.id === 'london' ? '10:00' : '16:00', end: session.id === 'asian' ? '04:00' : session.id === 'london' ? '11:00' : '17:00', label: 'Fechamento' },
        };

        for (const sub of Object.values(subs) as any[]) {
          const subSMatch = sub.start.match(/^(\d{2}):(\d{2})/);
          const subEMatch = sub.end.match(/^(\d{2}):(\d{2})/);
          if (!subSMatch || !subEMatch) continue;

          const subSHour = parseInt(subSMatch[1], 10);
          const subSMin = parseInt(subSMatch[2], 10);
          const subSVal = subSHour * 60 + subSMin;

          const subEHour = parseInt(subEMatch[1], 10);
          const subEMin = parseInt(subEMatch[2], 10);
          const subEVal = subEHour * 60 + subEMin;

          let inSub = false;
          if (subSVal <= subEVal) {
            inSub = tVal >= subSVal && tVal <= subEVal;
          } else {
            inSub = tVal >= subSVal || tVal <= subEVal;
          }

          if (inSub) {
            return `${baseName} (${sub.label})`;
          }
        }

        // Subdividida: calcular os minutos decorridos e percentual (como fallback)
        let duration = 0;
        let elapsed = 0;

        if (sVal <= eVal) {
          duration = eVal - sVal;
          elapsed = tVal - sVal;
        } else {
          duration = (1440 - sVal) + eVal;
          if (tVal >= sVal) {
            elapsed = tVal - sVal;
          } else {
            elapsed = (1440 - sVal) + tVal;
          }
        }

        const pct = duration > 0 ? elapsed / duration : 0;
        let subPhase = 'Intra Mercado';
        if (pct < 0.20) {
          subPhase = 'Pré-Mercado';
        } else if (pct < 0.65) {
          subPhase = 'Intra Mercado';
        } else if (pct < 0.80) {
          subPhase = 'Zona Não Operável';
        } else {
          subPhase = 'Fechamento';
        }

        return `${baseName} (${subPhase})`;
      }
    }
  }

  return 'Importado';
}

export { parseMatchTradesCSV, parseMatchTradesHTML, parseMT5HTML, calcSummary, verificarIntegridade };
