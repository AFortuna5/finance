const $ = s => document.querySelector(s);
try { if (localStorage.getItem('meridiano-theme') === 'dark') document.body.classList.add('dark'); } catch {}
$('#today').textContent = new Date().toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric',timeZone:'America/Sao_Paulo'}).toUpperCase();
$('#theme').onclick = () => { document.body.classList.toggle('dark'); try { localStorage.setItem('meridiano-theme', document.body.classList.contains('dark') ? 'dark' : 'light'); } catch {} };

const SVGNS = 'http://www.w3.org/2000/svg';
const W = 560, H = 210, PAD = {l: 6, r: 6, t: 30, b: 24};
const DAY = 86400000;

const LINKS = {
  '^BVSP': [['TradingView','https://br.tradingview.com/symbols/BMFBOVESPA-IBOV/'],['Investing.com','https://br.investing.com/indices/bovespa'],['B3','https://www.b3.com.br/pt_br/market-data-e-indices/indices/indices-amplos/ibovespa.htm']],
  'BRL=X': [['TradingView','https://br.tradingview.com/symbols/USDBRL/'],['Investing.com','https://br.investing.com/currencies/usd-brl'],['Banco Central','https://www.bcb.gov.br/estabilidadefinanceira/fechamentodolar']],
  'EURBRL=X': [['TradingView','https://br.tradingview.com/symbols/EURBRL/'],['Investing.com','https://br.investing.com/currencies/eur-brl']],
  '^GSPC': [['TradingView','https://br.tradingview.com/symbols/SPX/'],['Investing.com','https://br.investing.com/indices/us-spx-500']],
  '^IXIC': [['TradingView','https://br.tradingview.com/symbols/NASDAQ-NDX/'],['Investing.com','https://br.investing.com/indices/nasdaq-100']],
  'BTC-USD': [['TradingView','https://br.tradingview.com/symbols/BTCUSD/'],['Investing.com','https://br.investing.com/crypto/bitcoin/btc-usd']],
  'GC=F': [['TradingView','https://br.tradingview.com/symbols/GOLD/'],['Investing.com','https://br.investing.com/commodities/gold']],
  'CL=F': [['TradingView','https://br.tradingview.com/symbols/NYMEX-CL1!/'],['Investing.com','https://br.investing.com/commodities/crude-oil']],
};
const ABOUT = {
  '^BVSP': 'O Ibovespa é o índice da B3 que reúne as ações mais negociadas do Brasil — Vale, Petrobras, bancos e companhia. Quando ele sobe, o mercado está pagando mais pelas maiores empresas do país.',
  'BRL=X': 'O dólar comercial é o câmbio usado entre bancos e empresas — a referência de todos os outros preços em dólar. Ele pesa na inflação, em viagens, em importados e nas contas de quem exporta ou deve em moeda.',
  'EURBRL=X': 'O euro em reais é a referência para quem se expõe à Europa — viagens, reservas e empresas que faturam em euros.',
  '^GSPC': 'O S&P 500 reúne as 500 maiores empresas listadas nos EUA. É a régua mundial da bolsa — quando cai, o mundo inteiro reprecifica risco.',
  '^IXIC': 'A Nasdaq é o índice concentrado em tecnologia — Apple, Microsoft, Nvidia. Por depender de crescimento futuro, reage forte a juros americanos.',
  'BTC-USD': 'O bitcoin é um criptoativo negociado 24 horas por dia, sem banco central e com oferta limitada a 21 milhões. Trata-se como ativo de risco de alta volatilidade.',
  'GC=F': 'O ouro é o metal usado há séculos como reserva de valor. Ganha atenção em crises, quando os juros reais caem ou quando o dólar enfraquece.',
  'CL=F': 'O WTI é a referência de preço do barril nos EUA. Petróleo mais caro pressiona gasolina, transporte e inflação — e anima produtoras como a Petrobras.',
};
const FOCUS_LABELS = {'Câmbio': ['DÓLAR', v => 'R$\u00a0' + v.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})],
  'Selic': ['SELIC', v => v.toLocaleString('pt-BR', {maximumFractionDigits: 2}) + '%'],
  'IPCA': ['IPCA', v => v.toLocaleString('pt-BR', {maximumFractionDigits: 2}) + '%'],
  'PIB Total': ['PIB', v => v.toLocaleString('pt-BR', {maximumFractionDigits: 2}) + '%']};

function el(tag, attrs, parent) {
  const node = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (parent) parent.append(node);
  return node;
}
function node(tag, text, className) { const e = document.createElement(tag); if (text != null) e.textContent = text; if (className) e.className = className; return e; }
function fmt(value, unit) {
  if (unit === 'pts') return Math.round(value).toLocaleString('pt-BR');
  if (unit === 'R$') return 'R$\u00a0' + value.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 3});
  if (unit.startsWith('US$')) return 'US$\u00a0' + (value >= 100 ? Math.round(value).toLocaleString('pt-BR') : value.toLocaleString('pt-BR', {maximumFractionDigits: 2}));
  return value.toLocaleString('pt-BR');
}
function pct(v) { return v == null ? '—' : (v > 0 ? '+' : '') + v.toLocaleString('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 1}) + '%'; }
const ts = d => new Date(d + 'T12:00:00Z').getTime();
const fmtDate = d => new Date(d + 'T12:00:00Z').toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit', timeZone: 'UTC'});

function linearProjection(series, days = 7) {
  const tail = series.slice(-10);
  const n = tail.length;
  const t0 = ts(tail[0].date);
  const xs = tail.map(p => (ts(p.date) - t0) / DAY), ys = tail.map(p => p.value);
  const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2; }
  const slope = den ? num / den : 0;
  const lastT = ts(series.at(-1).date);
  return Array.from({length: days}, (_, i) => {
    const t = lastT + (i + 1) * DAY;
    return {t, v: my + slope * ((t - t0) / DAY - mx)};
  });
}

function chart(asset, elections) {
  const series = asset.series;
  const projection = linearProjection(series);
  const firstT = ts(series[0].date), lastT = ts(series.at(-1).date);
  const maxT = projection.at(-1).t;
  const values = series.map(p => p.value).concat(projection.map(p => p.v));
  let lo = Math.min(...values), hi = Math.max(...values);
  if (hi === lo) { hi += 1; lo -= 1; }
  const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
  const x = t => PAD.l + (t - firstT) / (maxT - firstT) * (W - PAD.l - PAD.r);
  const y = v => PAD.t + (hi - v) / (hi - lo) * (H - PAD.t - PAD.b);

  const svg = el('svg', {viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `Gráfico de ${asset.name}`});
  el('line', {class: 'grid', x1: PAD.l, x2: W - PAD.r, y1: y(hi - pad), y2: y(hi - pad)}, svg);
  el('line', {class: 'grid', x1: PAD.l, x2: W - PAD.r, y1: y(lo + pad), y2: y(lo + pad)}, svg);
  const hiLabel = el('text', {class: 'axis', x: PAD.l + 3, y: y(hi - pad) - 4}, svg); hiLabel.textContent = fmt(hi - pad, asset.unit);
  const loLabel = el('text', {class: 'axis', x: PAD.l + 3, y: y(lo + pad) + 12}, svg); loLabel.textContent = fmt(lo + pad, asset.unit);

  for (const m of elections) {
    const mt = ts(m.date);
    if (mt < firstT || mt > maxT) continue;
    el('line', {class: 'marker', x1: x(mt), x2: x(mt), y1: PAD.t - 8, y2: H - PAD.b}, svg);
    const label = el('text', {class: 'marker-label', x: Math.min(x(mt) + 4, W - 70), y: PAD.t - 12}, svg);
    label.textContent = m.label;
  }

  const pts = series.map(p => `${x(ts(p.date))},${y(p.value)}`).join(' ');
  el('polygon', {class: 'area', points: `${x(firstT)},${y(lo + pad)} ${pts} ${x(lastT)},${y(lo + pad)}`}, svg);
  el('polyline', {class: 'series', points: pts}, svg);
  el('polyline', {class: 'projection', points: `${x(lastT)},${y(series.at(-1).value)} ` + projection.map(p => `${x(p.t)},${y(p.v)}`).join(' ')}, svg);
  el('circle', {class: 'last-dot', cx: x(lastT), cy: y(series.at(-1).value), r: 3}, svg);

  const projEnd = projection.at(-1);
  const projLabel = el('text', {class: 'proj-label', x: W - PAD.r, y: Math.max(PAD.t + 4, y(projEnd.v) - 8), 'text-anchor': 'end'}, svg);
  projLabel.textContent = 'TENDÊNCIA →';

  const firstLabel = el('text', {class: 'axis', x: PAD.l, y: H - 8}, svg); firstLabel.textContent = fmtDate(series[0].date);
  const lastLabel = el('text', {class: 'axis', x: Math.min(x(lastT), W - PAD.r - 22), y: H - 8, 'text-anchor': 'middle'}, svg); lastLabel.textContent = fmtDate(series.at(-1).date);
  return svg;
}

function delta(label, value) {
  const chip = node('span', null, 'delta ' + (value == null ? '' : value >= 0 ? 'up' : 'down'));
  chip.append(node('span', label + ' '), node('b', pct(value)));
  return chip;
}

const ratingLabel = r => r >= .5 ? 'COMPRA FORTE' : r >= .1 ? 'COMPRA' : r > -.1 ? 'NEUTRO' : r > -.5 ? 'VENDA' : 'VENDA FORTE';
const ratingClass = r => r >= .1 ? 'sig-buy' : r > -.1 ? 'sig-neutral' : 'sig-sell';

function signalBlock(asset) {
  const s = asset.signals;
  if (!s || s.rating == null) return null;
  const box = node('div', null, 'mkt-sig');
  const head = node('div', null, 'sig-head');
  head.append(node('span', 'TERMÔMETRO TÉCNICO · TRADINGVIEW' + (s.stale ? ' (ÚLTIMA LEITURA)' : '')),
              node('b', ratingLabel(s.rating), ratingClass(s.rating)));
  const gauge = node('div', null, 'gauge');
  const tick = node('i');
  tick.style.left = Math.max(2, Math.min(98, (s.rating + 1) / 2 * 100)) + '%';
  gauge.append(tick);
  const parts = [];
  if (s.rsi != null) parts.push('RSI ' + s.rsi.toLocaleString('pt-BR', {maximumFractionDigits: 0}) + (s.rsi >= 70 ? ' (sobrecomprado)' : s.rsi <= 30 ? ' (sobrevendido)' : ''));
  if (s.ema200 != null && asset.last != null) {
    const diff = (asset.last / s.ema200 - 1) * 100;
    parts.push(Math.abs(diff).toLocaleString('pt-BR', {maximumFractionDigits: 1}) + '% ' + (diff >= 0 ? 'acima' : 'abaixo') + ' da média de 200d');
  }
  if (s.volatility != null && s.volatility < 8) parts.push('volatilidade ' + s.volatility.toLocaleString('pt-BR', {maximumFractionDigits: 1}) + '%/dia');
  box.append(head, gauge, node('div', parts.join(' · '), 'sig-sub'));
  return box;
}

function statsBlock(asset) {
  const values = asset.series.map(p => p.value);
  const lo = Math.min(...values), hi = Math.max(...values);
  const last = values.at(-1);
  const fromTop = (last / hi - 1) * 100;
  const box = node('div', null, 'mkt-stats');
  box.append(node('span', 'MÍN ' + fmt(lo, asset.unit)), node('span', 'MÁX ' + fmt(hi, asset.unit)),
             node('span', fromTop < -0.05 ? Math.abs(fromTop).toLocaleString('pt-BR', {maximumFractionDigits: 1}) + '% ABAIXO DO TOPO' : 'NO TOPO DO PERÍODO'));
  return box;
}

function linksBlock(asset) {
  const links = LINKS[asset.symbol];
  if (!links) return null;
  const box = node('div', null, 'mkt-links');
  box.append(node('span', 'ACOMPANHAR EM '));
  for (const [name, url] of links) {
    const a = node('a', name + ' ↗');
    a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    box.append(a);
  }
  return box;
}

function card(asset, elections, focus) {
  const box = node('article', null, 'mkt' + (asset.status === 'cached' ? ' stale' : ''));
  const top = node('div', null, 'mkt-top');
  const left = node('div');
  left.append(node('div', asset.name, 'mkt-name'), node('div', asset.board || '', 'mkt-board'));
  const right = node('div', null, 'mkt-last');
  right.append(node('strong', asset.last != null ? fmt(asset.last, asset.unit) : 'Indisponível'), node('small', (asset.lastDate ? fmtDate(asset.lastDate) : '') + (asset.status === 'cached' ? ' · fonte indisponível' : '')));
  top.append(left, right);
  box.append(top);
  const deltas = node('div', null, 'mkt-deltas');
  deltas.append(delta('1º TURNO', asset.changeFirstRound), delta('2º TURNO', asset.changeSecondRound), delta('30 DIAS', asset.change30d));
  box.append(deltas);
  if (asset.series?.length >= 5) box.append(chart(asset, elections), statsBlock(asset));
  if (ABOUT[asset.symbol]) box.append(node('p', ABOUT[asset.symbol], 'mkt-about'));
  const sig = signalBlock(asset);
  if (sig) box.append(sig);
  const fx = focus?.items?.find(i => i.indicator === 'Câmbio');
  if (asset.symbol === 'BRL=X' && fx) {
    const note = node('p', `Consenso Focus (${fx.respondents || '~110'} instituições): dólar a ` +
      'R$\u00a0' + fx.median.toLocaleString('pt-BR', {minimumFractionDigits: 2}) + ` no fim de ${fx.year} — mediana das projeções do Banco Central.`, 'mkt-focus-note');
    box.append(note);
  }
  box.append(node('p', 'Traço vermelho: tendência linear dos últimos 10 fechamentos, por uma semana — ilustrativo.', 'mkt-note'));
  const links = linksBlock(asset);
  if (links) box.append(links);
  return box;
}

function focusStrip(focus) {
  const items = focus?.items || [];
  if (!items.length) return;
  const strip = node('div', null, 'focus-strip');
  const head = node('div', null, 'focus-head');
  head.append(node('span', 'CONSENSO FOCUS · BANCO CENTRAL'),
              node('small', `mediana de ${items[0].respondents || '~110'} instituições · ${new Date(items[0].date + 'T12:00:00Z').toLocaleDateString('pt-BR', {timeZone: 'UTC'})}`));
  const chips = node('div', null, 'focus-chips');
  for (const item of items) {
    const conf = FOCUS_LABELS[item.indicator];
    if (!conf) continue;
    const chip = node('span', null, 'chip');
    chip.append(node('span', `${conf[0]} ${item.year} `), node('b', conf[1](item.median)));
    chips.append(chip);
  }
  const link = node('a', 'Focus · BCB ↗');
  link.href = focus.url || 'https://www.bcb.gov.br/publicacoes/focus';
  link.target = '_blank'; link.rel = 'noopener noreferrer';
  strip.append(head, chips, link);
  $('#focus').append(strip);
}

async function load() {
  const response = await fetch('markets.json', {cache: 'no-store'});
  if (!response.ok) throw Error('HTTP ' + response.status);
  const data = await response.json();
  const assets = (data.assets || []).filter(a => a.series?.length);
  const updated = new Date(data.updatedAt);
  $('#updated').textContent = `Cotações: ${updated.toLocaleDateString('pt-BR', {day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo'})} às ${updated.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo'})} (Brasília)`;
  const movers = assets.filter(a => a.changeSecondRound != null).sort((a, b) => Math.abs(b.changeSecondRound) - Math.abs(a.changeSecondRound)).slice(0, 4);
  for (const a of movers) {
    const chip = node('span', null, 'chip');
    chip.append(node('span', a.name + ' '), node('b', pct(a.changeSecondRound)));
    $('#movers').append(chip);
  }
  if (movers.length) $('#movers').prepend(node('span', 'desde o 2º turno ·', 'chip'));
  focusStrip(data.focus);
  if (!assets.length) { $('#charts').append(node('p', 'Painel temporariamente indisponível. Recarregue em instantes.', 'charts-empty')); return; }
  for (const asset of assets) $('#charts').append(card(asset, data.elections || [], data.focus));
}
load().catch(() => { $('#updated').textContent = 'Não foi possível carregar o painel.'; });
