const $ = s => document.querySelector(s);
try { if (localStorage.getItem('meridiano-theme') === 'dark') document.body.classList.add('dark'); } catch {}
$('#today').textContent = new Date().toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric',timeZone:'America/Sao_Paulo'}).toUpperCase();
$('#theme').onclick = () => { document.body.classList.toggle('dark'); try { localStorage.setItem('meridiano-theme', document.body.classList.contains('dark') ? 'dark' : 'light'); } catch {} };

const SVGNS = 'http://www.w3.org/2000/svg';
const W = 560, H = 210, PAD = {l: 6, r: 6, t: 30, b: 24};
const DAY = 86400000;

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
  const hiLabel = el('text', {class: 'axis', x: W - PAD.r, y: y(hi - pad) - 4, 'text-anchor': 'end'}, svg); hiLabel.textContent = fmt(hi - pad, asset.unit);
  const loLabel = el('text', {class: 'axis', x: W - PAD.r, y: y(lo + pad) + 12, 'text-anchor': 'end'}, svg); loLabel.textContent = fmt(lo + pad, asset.unit);

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

  const firstLabel = el('text', {class: 'axis', x: PAD.l, y: H - 8}, svg); firstLabel.textContent = fmtDate(series[0].date);
  const lastLabel = el('text', {class: 'axis', x: x(lastT), y: H - 8, 'text-anchor': 'middle'}, svg); lastLabel.textContent = fmtDate(series.at(-1).date);
  const projLabel = el('text', {class: 'axis', x: W - PAD.r, y: H - 8, 'text-anchor': 'end', fill: 'var(--accent)'}, svg); projLabel.textContent = 'tendência →';
  return svg;
}

function delta(label, value) {
  const chip = node('span', null, 'delta ' + (value == null ? '' : value >= 0 ? 'up' : 'down'));
  chip.append(node('span', label + ' '), node('b', pct(value)));
  return chip;
}

function card(asset, elections) {
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
  if (asset.series?.length >= 5) box.append(chart(asset, elections));
  box.append(node('p', 'Traço vermelho: tendência linear dos últimos 10 fechamentos, por uma semana — ilustrativo.', 'mkt-note'));
  return box;
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
  if (!assets.length) { $('#charts').append(node('p', 'Painel temporariamente indisponível. Recarregue em instantes.', 'charts-empty')); return; }
  for (const asset of assets) $('#charts').append(card(asset, data.elections || []));
}
load().catch(() => { $('#updated').textContent = 'Não foi possível carregar o painel.'; });
