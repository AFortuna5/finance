const $ = s => document.querySelector(s);
try { if (localStorage.getItem('meridiano-theme') === 'dark') document.body.classList.add('dark'); } catch {}
$('#today').textContent = new Date().toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric',timeZone:'America/Sao_Paulo'}).toUpperCase();
$('#theme').onclick = () => { document.body.classList.toggle('dark'); try { localStorage.setItem('meridiano-theme', document.body.classList.contains('dark') ? 'dark' : 'light'); } catch {} };

const SVGNS = 'http://www.w3.org/2000/svg';
const W = 560, H = 210, PAD = {l: 6, r: 6, t: 18, b: 24};

function el(tag, attrs, parent) {
  const node = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (parent) parent.append(node);
  return node;
}
function node(tag, text, className) { const e = document.createElement(tag); if (text != null) e.textContent = text; if (className) e.className = className; return e; }
const fmtV = (v, unit) => unit.startsWith('%') ? v.toLocaleString('pt-BR', {maximumFractionDigits: 2}) + '%' : v.toLocaleString('pt-BR');
const MONTHS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const fmtDate = d => { const p = new Date(d + 'T12:00:00Z'); return MONTHS[p.getUTCMonth()] + '/' + String(p.getUTCFullYear()).slice(2); };
const ts = d => new Date(d + 'T12:00:00Z').getTime();

function dateTicks(svg, series, x) {
  const n = series.length;
  const step = Math.ceil(n / 5);
  for (let i = 0; i < n; i += step) {
    const px = x(ts(series[i].date));
    el('line', {class: 'tick', x1: px, x2: px, y1: H - PAD.b, y2: H - PAD.b + 4}, svg);
    const t = el('text', {class: 'axis', x: px, y: H - 8, 'text-anchor': 'middle'}, svg);
    t.textContent = fmtDate(series[i].date);
  }
  const last = series.at(-1);
  const pl = x(ts(last.date));
  el('line', {class: 'tick', x1: pl, x2: pl, y1: H - PAD.b, y2: H - PAD.b + 4}, svg);
  const tl = el('text', {class: 'axis', x: pl, y: H - 8, 'text-anchor': 'end'}, svg);
  tl.textContent = fmtDate(last.date);
}

function scales(seriesList) {
  const all = seriesList.flat().map(p => p.value);
  let lo = Math.min(...all), hi = Math.max(...all);
  if (hi === lo) { hi += 1; lo -= 1; }
  const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
  const t0 = ts(seriesList[0][0].date), t1 = ts(seriesList[0].at(-1).date);
  for (const s of seriesList) { const a = ts(s[0].date); if (a < t0) {} }
  return {
    x: t => PAD.l + (t - t0) / Math.max(1, t1 - t0) * (W - PAD.l - PAD.r),
    y: v => PAD.t + (hi - v) / (hi - lo) * (H - PAD.t - PAD.b),
    lo: lo + pad, hi: hi - pad, t0, t1
  };
}

function chartFrame(sc, unit) {
  const svg = el('svg', {viewBox: `0 0 ${W} ${H}`, role: 'img'});
  el('line', {class: 'grid', x1: PAD.l, x2: W - PAD.r, y1: sc.y(sc.hi), y2: sc.y(sc.hi)}, svg);
  el('line', {class: 'grid', x1: PAD.l, x2: W - PAD.r, y1: sc.y(sc.lo), y2: sc.y(sc.lo)}, svg);
  const hiLabel = el('text', {class: 'axis', x: PAD.l + 3, y: sc.y(sc.hi) - 4}, svg); hiLabel.textContent = fmtV(sc.hi, unit);
  const loLabel = el('text', {class: 'axis', x: PAD.l + 3, y: sc.y(sc.lo) + 12}, svg); loLabel.textContent = fmtV(sc.lo, unit);
  return svg;
}

function lineChart(card) {
  const s = card.series;
  const sc = scales([s]);
  const svg = chartFrame(sc, card.unit);
  el('polygon', {class: 'area', points: `${sc.x(sc.t0)},${sc.y(sc.lo)} ` + s.map(p => `${sc.x(ts(p.date))},${sc.y(p.value)}`).join(' ') + ` ${sc.x(sc.t1)},${sc.y(sc.lo)}`}, svg);
  el('polyline', {class: 'series', points: s.map(p => `${sc.x(ts(p.date))},${sc.y(p.value)}`).join(' ')}, svg);
  el('circle', {class: 'last-dot', cx: sc.x(sc.t1), cy: sc.y(s.at(-1).value), r: 3}, svg);
  dateTicks(svg, s, t => sc.x(t));
  return svg;
}

function barChart(card) {
  const s = card.series;
  const lo0 = Math.min(0, ...s.map(p => p.value)), hi0 = Math.max(0, ...s.map(p => p.value));
  const sc = scales([s.map(p => ({date: p.date, value: p.value}))]);
  const lo = Math.min(0, sc.lo), hi = Math.max(0, sc.hi);
  const y = v => PAD.t + (hi - v) / (hi - lo) * (H - PAD.t - PAD.b);
  const x = t => PAD.l + (t - sc.t0) / Math.max(1, sc.t1 - sc.t0) * (W - PAD.l - PAD.r);
  const svg = chartFrame(sc, card.unit);
  const y0 = y(0);
  el('line', {class: 'zero', x1: PAD.l, x2: W - PAD.r, y1: y0, y2: y0}, svg);
  const bw = Math.max(2, (x(sc.t1) - x(sc.t0)) / s.length * 0.62);
  for (const p of s) {
    const px = x(ts(p.date)) - bw / 2, py = y(Math.max(0, p.value)), h = Math.abs(y(p.value) - y0);
    el('rect', {class: 'bar ' + (p.value >= 0 ? 'pos' : 'neg'), x: px, y: py, width: bw, height: Math.max(0.5, h)}, svg);
  }
  dateTicks(svg, s, x);
  return svg;
}

function multiChart(card) {
  const lines = card.lines;
  const sc = scales(lines.map(l => l.series));
  const svg = chartFrame(sc, card.unit);
  for (const [i, l] of lines.entries()) {
    const pts = l.series.map(p => `${sc.x(ts(p.date))},${sc.y(p.value)}`).join(' ');
    el('polyline', {class: i ? 'series-2' : 'series', points: pts}, svg);
    el('circle', {class: i ? 'dot-2' : 'last-dot', cx: sc.x(ts(l.series.at(-1).date)), cy: sc.y(l.series.at(-1).value), r: 3}, svg);
  }
  dateTicks(svg, lines[0].series, t => sc.x(t));
  return svg;
}

function cardEl(card) {
  const box = node('article', null, 'mkt gov' + (card.status === 'cached' ? ' stale' : ''));
  const top = node('div', null, 'mkt-top');
  const left = node('div');
  left.append(node('div', card.title, 'mkt-name'), node('div', card.note || '', 'mkt-board'));
  const right = node('div', null, 'mkt-last');
  let last = null, lastDate = null;
  if (card.series?.length) { last = card.series.at(-1).value; lastDate = card.series.at(-1).date; }
  else if (card.mode === 'multi' && card.lines?.length) {
    const l0 = card.lines[0].series.at(-1);
    last = l0.value; lastDate = l0.date;
  }
  right.append(node('strong', last != null ? fmtV(last, card.unit) : 'Indisponível'),
               node('small', (lastDate ? 'ref. ' + fmtDate(lastDate) : '') + (card.source ? ' · ' + card.source : '') + (card.status === 'cached' ? ' · cache' : '')));
  top.append(left, right);
  box.append(top);
  if (card.mode === 'multi' && card.lines?.length) {
    const legend = node('div', null, 'gov-legend');
    for (const [i, l] of card.lines.entries()) {
      const item = node('span', null, 'lg');
      item.append(node('i', null, i ? 'sw s2' : 'sw s1'), document.createTextNode(`${l.label} · ${fmtV(l.series.at(-1).value, card.unit)}`));
      legend.append(item);
    }
    box.append(legend);
  }
  if (card.status !== 'unavailable') {
    if (card.mode === 'bars') box.append(barChart(card));
    else if (card.mode === 'multi' && card.lines?.length) box.append(multiChart(card));
    else if (card.series?.length) box.append(lineChart(card));
  }
  return box;
}

async function load() {
  const response = await fetch('governo.json', {cache: 'no-store'});
  if (!response.ok) throw Error('HTTP ' + response.status);
  const data = await response.json();
  const updated = new Date(data.updatedAt);
  $('#updated').textContent = `Atualizado ${updated.toLocaleDateString('pt-BR', {day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo'})} às ${updated.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo'})} · fontes oficiais`;
  for (const t of data.tesouro || []) {
    const chip = node('span', null, 'tchip');
    chip.append(node('small', t.label), node('b', t.value), node('em', t.hint));
    $('#tesouro').append(chip);
  }
  const charts = data.charts || [];
  if (!charts.length) { $('#charts').append(node('p', 'Painel temporariamente indisponível.', 'charts-empty')); return; }
  for (const card of charts) $('#charts').append(cardEl(card));
}
load().catch(() => { $('#updated').textContent = 'Não foi possível carregar o painel.'; });
