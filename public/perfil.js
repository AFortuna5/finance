const $ = s => document.querySelector(s);
const LOC = () => window.merLocale ? window.merLocale() : 'pt-BR';
try { if (localStorage.getItem('meridiano-theme') === 'dark') document.body.classList.add('dark'); } catch {}
const setToday = () => { $('#today').textContent = new Date().toLocaleDateString(LOC(),{day:'numeric',month:'long',year:'numeric',timeZone:'America/Sao_Paulo'}).toUpperCase(); };
setToday();
$('#theme').onclick = () => { document.body.classList.toggle('dark'); try { localStorage.setItem('meridiano-theme', document.body.classList.contains('dark') ? 'dark' : 'light'); } catch {} };
window.addEventListener('mer-lang', () => location.reload());

const chat = $('#chat');
const pct = v => v == null ? '—' : (v > 0 ? '+' : '') + v.toLocaleString(LOC(), {minimumFractionDigits: 1, maximumFractionDigits: 1}) + '%';
const scroll = () => window.scrollTo({top: document.body.scrollHeight, behavior: 'smooth'});

function say(parts, opts = {}) {
  const div = document.createElement('div');
  div.className = 'msg bot';
  if (opts.lede) div.append(Object.assign(document.createElement('span'), {className: 'lede', textContent: opts.lede}));
  for (const p of parts) div.append(Object.assign(document.createElement('p'), {textContent: p, style: 'margin:6px 0'}));
  if (opts.figures) {
    const row = document.createElement('div'); row.className = 'figures';
    for (const [label, value] of opts.figures) {
      const chip = document.createElement('span');
      chip.className = value != null && value < 0 ? 'down' : 'up';
      chip.append(document.createTextNode(label + ' '), Object.assign(document.createElement('b'), {textContent: pct(value)}));
      row.append(chip);
    }
    div.append(row);
  }
  if (opts.fine) div.append(Object.assign(document.createElement('small'), {className: 'fine', textContent: opts.fine}));
  chat.append(div); scroll();
}
function userSay(text) {
  const div = document.createElement('div');
  div.className = 'msg user'; div.textContent = text;
  chat.append(div); scroll();
}
function typing() {
  const div = document.createElement('div');
  div.className = 'typing'; div.textContent = '···';
  chat.append(div); scroll();
  return () => div.remove();
}
function ask(text, options, next, opts = {}) {
  say([text], opts);
  const row = document.createElement('div'); row.className = 'chips';
  for (const [label, value] of options) {
    const b = document.createElement('button');
    b.textContent = label;
    b.onclick = () => { row.remove(); userSay(label); setTimeout(() => next(value), 350); };
    row.append(b);
  }
  setTimeout(() => { chat.append(row); scroll(); }, 400);
}

const state = {data: null, news: null};
const asset = sym => state.data?.assets?.find(a => a.symbol === sym);
const figures = () => [
  [pick('Dólar','Dollar'), asset('BRL=X')?.changeSecondRound],
  ['Ibovespa', asset('^BVSP')?.changeSecondRound],
  [pick('Ouro','Gold'), asset('GC=F')?.changeSecondRound],
  ['Bitcoin', asset('BTC-USD')?.changeSecondRound],
];
const selic = () => state.news?.indicators?.find(i => i.name === 'Selic meta')?.value;

const TOPICS = [
  {keys: ['dólar', 'dolar', 'câmbio', 'cambio', 'dolarizar', 'exterior', 'internacional', 'dollar', 'currency'],
   text: () => {
     const d = asset('BRL=X');
     return pick(
       `Dólar: desde o 2º turno, ${pct(d?.changeSecondRound)} (${pct(d?.changeFirstRound)} desde o 1º). Se a leitura for de dólar mais forte à frente, exposição cambial protege parte do patrimônio — via fundos cambiais, BDRs ou conta internacional. Se já caiu muito no curto prazo, entrar de uma vez pode pegar o movimento no fim; fracionar a entrada costuma fazer mais sentido que timing perfeito.`,
       `Dollar: since the runoff, ${pct(d?.changeSecondRound)} (${pct(d?.changeFirstRound)} since the first round). If your reading is a stronger dollar ahead, currency exposure shields part of your wealth — via FX funds, BDRs or an international account. If it already fell a lot short-term, entering all at once may catch the move at the end; scaling in usually makes more sense than perfect timing.`);
   }},
  {keys: ['bolsa', 'ações', 'acoes', 'ibovespa', 'empresa', 'fii', 'b3', 'stocks', 'equities'],
   text: () => pick(
     `Bolsa: o Ibovespa varreu ${pct(asset('^BVSP')?.changeSecondRound)} desde o 2º turno. Queda forte por reação política costuma ser avaliada em duas partes: o que é ruído de curto prazo e o que muda a tese das empresas. Posição gradual, por setores, tende a ser mais defensável do que uma entrada única tentando acertar o fundo.`,
     `Stocks: the Ibovespa moved ${pct(asset('^BVSP')?.changeSecondRound)} since the runoff. A sharp drop on political reaction is usually weighed in two parts: what is short-term noise and what changes the companies' thesis. A gradual position, sector by sector, tends to be more defensible than a single entry trying to time the bottom.`)},
  {keys: ['renda fixa', 'selic', 'cdb', 'tesouro', 'lci', 'lca', 'juros', 'prefixado', 'ipca', 'fixed income', 'bonds'],
   text: () => pick(
     `Renda fixa: com a Selic em ${selic() ?? '—'}% ao ano, o carrego brasileiro segue generoso — e em cenário de incerteza pós-eleição, taxas altas em títulos atrelados à inflação ou à Selic tendem a ser o porto seguro natural. Atenção apenas à duration: prefixados longos oscilam bastante quando o cenário muda.`,
     `Fixed income: with the Selic at ${selic() ?? '—'}% a year, Brazilian carry remains generous — and in post-election uncertainty, high rates on inflation- or Selic-linked bonds tend to be the natural safe harbor. Mind only the duration: long fixed-rate bonds swing hard when the landscape shifts.`)},
  {keys: ['ouro', 'gold'],
   text: () => pick(
     `Ouro: ${pct(asset('GC=F')?.changeSecondRound)} desde o 2º turno. O metal costuma atuar como proteção quando a confiança em moedas e governos balança — faz papel de seguro, não de motor de rentabilidade. Participação pequena na carteira costuma ser o uso clássico.`,
     `Gold: ${pct(asset('GC=F')?.changeSecondRound)} since the runoff. The metal usually acts as protection when trust in currencies and governments wavers — it plays the role of insurance, not a return engine. A small portfolio allocation is the classic use.`)},
  {keys: ['bitcoin', 'cripto', 'btc', 'crypto'],
   text: () => pick(
     `Bitcoin: ${pct(asset('BTC-USD')?.changeSecondRound)} desde o 2º turno. É o ativo mais volátil do painel — trate como aposta assimétrica de tamanho pequeno, nunca como núcleo. Se entrar, dimensione assumindo que pode cair pela metade.`,
     `Bitcoin: ${pct(asset('BTC-USD')?.changeSecondRound)} since the runoff. It is the most volatile asset on the panel — treat it as a small asymmetric bet, never the core. If you enter, size it assuming it can drop in half.`)},
  {keys: ['petróleo', 'petroleo', 'combustível', 'combustivel', 'wti', 'oil'],
   text: () => pick(
     `Petróleo: WTI em ${pct(asset('CL=F')?.changeSecondRound)} desde o 2º turno. Afeta sua vida via inflação e gasolina mais do que como investimento direto — para a maioria das pessoas, a leitura importa mais que a posição.`,
     `Oil: WTI at ${pct(asset('CL=F')?.changeSecondRound)} since the runoff. It affects your life through inflation and gasoline more than as a direct investment — for most people, the reading matters more than the position.`)},
  {keys: ['previdência', 'previdencia', 'aposentadoria', 'aposentar', 'retirement', 'pension'],
   text: () => pick(
     'Previdência: com horizonte longo, a reação de curto prazo da eleição pesa menos que a constância dos aportes. O erro clássico é mudar a estratégia toda vez que o cenário político muda.',
     'Retirement: with a long horizon, the short-term election reaction weighs less than the consistency of contributions. The classic mistake is changing strategy every time the political landscape shifts.')},
  {keys: ['imóvel', 'imovel', 'imóveis', 'imoveis', 'real estate'],
   text: () => pick(
     'Imóveis: não acompanho esse mercado aqui. O que a eleição muda indiretamente é o crédito imobiliário — juros altos seguram preços e financiamentos.',
     'Real estate: I do not track that market here. What the election changes indirectly is mortgage credit — high rates hold prices and financing back.')},
];

function analysis() {
  const p = state.answers;
  const lines = [];
  const usd = asset('BRL=X')?.changeSecondRound, ibov = asset('^BVSP')?.changeSecondRound;
  const dir = usd != null && usd > 0 ? pick('subiu','rose') : usd != null && usd < 0 ? pick('recuou','fell back') : pick('seguiu estável','held steady');
  const dirB = ibov != null && ibov > 0 ? pick('avançou','advanced') : ibov != null && ibov < 0 ? pick('recuou','retreated') : pick('seguiu estável','held steady');
  say([], {lede: pick('Cenário na sua mesa','The picture on your desk'), figures: figures(), fine: pick('Variação desde o 2º turno · fechamentos diários','Change since the runoff · daily closes')});
  lines.push(pick(
    `Desde o 2º turno, o dólar ${dir} (${pct(usd)}) e a bolsa ${dirB} (${pct(ibov)}). Leituras de curto prazo ainda estão sendo formadas — o que você vê hoje é a primeira reação, não a tendência consolidada.`,
    `Since the runoff, the dollar ${dir} (${pct(usd)}) and the stock market ${dirB} (${pct(ibov)}). Short-term readings are still forming — what you see today is the first reaction, not the settled trend.`));

  if (p.perfil === 'conservador') {
    lines.push(pick(
      `Perfil conservador: a prioridade é não errar feio. Com a Selic em ${selic() ?? '—'}% ao ano, a renda fixa atrelada à Selic ou à inflação já entrega retorno real relevante sem sustos — esse continua sendo o alicerce.`,
      `Conservative profile: the priority is not making a big mistake. With the Selic at ${selic() ?? '—'}% a year, Selic- or inflation-linked fixed income already delivers meaningful real return without scares — that remains the foundation.`));
    lines.push(pick(
      'Diante da eleição, o ajuste típico é de proteção, não de aposta: uma faixa modesta em exposição cambial (fundos cambiais ou conta internacional) funciona como seguro caso o real deslanche, e posições em ouro fazem papel parecido. Evite resgatar proteção no primeiro dia de calmaria.',
      'Facing the election, the typical adjustment is protection, not a bet: a modest slice of currency exposure (FX funds or an international account) works as insurance if the real slides, and gold positions play a similar role. Avoid cashing out the hedge on the first calm day.'));
  } else if (p.perfil === 'moderado') {
    lines.push(pick(
      'Perfil moderado: você pode carregar algum risco, mas sem virar especulador. A base segue em renda fixa; na parte variável, a eleição cria duas leituras simultâneas — bolsa mais barata se o tombo for exagerado, e câmbio como hedge caso o cenário fiscal azede.',
      'Moderate profile: you can carry some risk without becoming a speculator. The base stays in fixed income; on the variable side, the election creates two simultaneous readings — cheaper stocks if the drop is overdone, and FX as a hedge if the fiscal picture sours.'));
    lines.push(pick(
      'O caminho equilibrado costuma ser rebalancear aos poucos: aumentar a parte que ficou barata sem abandonar a proteção. Evitar movimentos binários é o que separa moderado de impaciente.',
      'The balanced path is usually rebalancing gradually: increasing the part that got cheap without abandoning protection. Avoiding binary moves is what separates moderate from impatient.'));
  } else {
    lines.push(pick(
      'Perfil arrojado: volatilidade pós-eleição é onde retornos de longo prazo costumam nascer — mas só paga quem sobrevive ao caminho. Posições em bolsa compradas em pânico histórico tendem a envelhecer bem; posições concentradas feitas no impulso, não.',
      'Aggressive profile: post-election volatility is where long-term returns are usually born — but it only pays those who survive the path. Stock positions bought in historic panic tend to age well; concentrated positions made on impulse do not.'));
    lines.push(pick(
      'A regra prática dos perfis agressivos disciplinados: escada de entrada (três a cinco parcelas), tamanho de posição que você aguenta ver cair 20% e uma faixa sempre liquida para aproveitar os próximos capítulos da novela fiscal.',
      'The practical rule of disciplined aggressive profiles: an entry ladder (three to five tranches), position sizing you can watch drop 20%, and a always-liquid slice to play the next chapters of the fiscal saga.'));
  }

  if (p.horizonte === 'curto') lines.push(pick(
    'Com horizonte de até um ano, opinião sobre a eleição importa menos do que liquidez e previsibilidade — curto prazo é território da renda fixa, não de tese política.',
    'With a horizon of up to one year, opinions about the election matter less than liquidity and predictability — short term is fixed-income territory, not political thesis.'));
  if (p.horizonte === 'longo') lines.push(pick(
    'Com mais de três anos pela frente, você tem o luxo de ignorar a primeira semana de reação: ciclos eleitorais mexem no preço, mas quem paga a conta é o fluxo de caixa dos ativos, não a manchete.',
    'With more than three years ahead, you have the luxury of ignoring the first week of reaction: election cycles move the price, but what pays the bill is the assets’ cash flow, not the headline.'));
  if (p.objetivo === 'renda') lines.push(pick(
    'Para gerar renda, o cenário atual favorece juros reais altos: títulos e fundos de papel atrelados à inflação costumam combinar melhor com esse objetivo do que ativos que dependem de valorização.',
    'To generate income, the current landscape favors high real rates: inflation-linked bonds and credit funds usually fit that goal better than assets that depend on appreciation.'));
  if (p.objetivo === 'crescimento') lines.push(pick(
    'Para crescimento, o pós-eleição costuma premiar quem compra gradualmente o que ficou barato por motivo político — desde que a tese da empresa ou do ativo não tenha mudado de verdade.',
    'For growth, post-election periods usually reward those who gradually buy what got cheap for political reasons — as long as the company’s or asset’s thesis has not truly changed.'));
  if (p.exposicao === 'nada') lines.push(pick(
    `Você mencionou não ter exposição cambial. Se a sua leitura é de dólar estruturalmente mais forte, começar com uma faixa pequena (5% a 10% do patrimônio) já muda o comportamento da carteira sem transformar o cenário em aposta.`,
    `You mentioned having no currency exposure. If your reading is a structurally stronger dollar, starting with a small slice (5% to 10% of your wealth) already changes the portfolio's behavior without turning the scenario into a bet.`));
  if (p.exposicao === 'muita') lines.push(pick(
    'Com boa parte já dolarizada, a pergunta vira o inverso: o real barato pode compensar trazer algo de volta aos poucos, especialmente se suas despesas são em reais.',
    'With a large share already dollarized, the question flips: the cheap real may be worth bringing something back gradually, especially if your expenses are in reais.'));

  say(lines, {fine: pick('Leitura educativa sobre o cenário · não é recomendação de investimento','Educational reading of the landscape · not investment advice')});
  setTimeout(() => ask(pick('Quer aprofundar algum tema?','Want to go deeper on a topic?'), [[pick('Fale do dólar','Talk about the dollar'), 'dólar'], [pick('E a bolsa?','And stocks?'), 'bolsa'], [pick('E renda fixa?','And fixed income?'), 'renda fixa'], [pick('E ouro?','And gold?'), 'ouro']], v => answer(v)), 500);
}

function answer(input) {
  const text = String(input).toLowerCase();
  const topic = TOPICS.find(t => t.keys.some(k => text.includes(k)));
  const stop = typing();
  setTimeout(() => {
    stop();
    if (topic) {
      say([topic.text()], {fine: pick('Leitura educativa · não é recomendação','Educational reading · not advice')});
      setTimeout(() => ask(pick('Mais algum tema?','Any other topic?'), [['Bitcoin', 'bitcoin'], [pick('Petróleo','Oil'), 'petróleo'], [pick('Previdência','Retirement'), 'previdência'], [pick('Encerrar','Done'), '__fim']], v => v === '__fim' ? farewell() : answer(v)), 500);
    } else {
      say([pick('Não tenho uma leitura pronta para isso — mas posso falar de câmbio, bolsa, renda fixa, ouro, bitcoin, petróleo ou previdência.','I do not have a ready reading on that — but I can talk about FX, stocks, fixed income, gold, bitcoin, oil or retirement.')], {});
      setTimeout(() => ask(pick('Escolha um tema:','Pick a topic:'), [[pick('Dólar','Dollar'), 'dólar'], [pick('Bolsa','Stocks'), 'bolsa'], [pick('Renda fixa','Fixed income'), 'renda fixa'], ['Bitcoin', 'bitcoin']], v => answer(v)), 500);
    }
  }, 650);
}

function farewell() {
  say([pick('Fechado. O painel de mercados ao lado mostra os mesmos números em gráfico — e o jornal explica por que eles se moveram. Volte quando quiser revisar a leitura: ela muda junto com os dados.','Done. The markets panel beside it shows the same numbers in charts — and the journal explains why they moved. Come back whenever you want to review the reading: it changes with the data.')], {fine: pick('Conversa encerrada · os dados continuam sendo atualizados','Conversation closed · data keeps updating')});
  $('#chat-text').placeholder = pick('Ainda com dúvida? Escreva um tema — dólar, bolsa, renda fixa…','Still curious? Type a topic — dollar, stocks, fixed income…');
}

function start() {
  ask(pick('Vamos lá. Para começar: qual é o seu principal objetivo com esse dinheiro?','Let’s go. First: what is your main goal with this money?'),
      [[pick('Proteger o que tenho','Protect what I have'), 'proteger'], [pick('Crescer no longo prazo','Grow long-term'), 'crescimento'], [pick('Gerar renda','Generate income'), 'renda']],
      v => { state.answers = {objetivo: v};
        ask(pick('E seu estômago para risco? Se a carteira caísse 10% num mês, você…','And your stomach for risk? If the portfolio dropped 10% in a month, you…'),
            [[pick('Venderia tudo','Would sell everything'), 'conservador'], [pick('Aguardaria','Would wait'), 'moderado'], [pick('Compraria mais','Would buy more'), 'arrojado']],
            v => { state.answers.perfil = v;
              ask(pick('Quando você vai precisar desse dinheiro?','When will you need this money?'),
                  [[pick('Em até 1 ano','Within 1 year'), 'curto'], [pick('Em 1 a 3 anos','In 1 to 3 years'), 'medio'], [pick('Daqui a 3+ anos','In 3+ years'), 'longo']],
                  v => { state.answers.horizonte = v;
                    ask(pick('Última: hoje, quanto do seu dinheiro já está em dólar ou no exterior?','Last one: today, how much of your money is already in dollars or abroad?'),
                        [[pick('Nada','None'), 'nada'], [pick('Uma parte','Some'), 'parte'], [pick('Boa parte','A good share'), 'muita']],
                        v => { state.answers.exposicao = v;
                          const stop = typing();
                          setTimeout(() => { stop(); analysis(); }, 800);
                        });
                  });
            });
      });
}

$('#chat-form').onsubmit = e => {
  e.preventDefault();
  const input = $('#chat-text');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  userSay(text);
  if (!state.answers) {
    const stop = typing();
    setTimeout(() => { stop(); say([pick('Boa pergunta — vou responder melhor depois de entender seu perfil. Duas perguntas rápidas:','Good question — I will answer better once I understand your profile. Two quick questions:')]); start(); }, 600);
  } else answer(text);
};

Promise.all([
  fetch('markets.json', {cache: 'no-store'}).then(r => r.ok ? r.json() : null),
  fetch('news.json', {cache: 'no-store'}).then(r => r.ok ? r.json() : null),
]).then(([m, n]) => {
  state.data = m; state.news = n;
  const updated = m ? new Date(m.updatedAt) : new Date();
  $('#updated').textContent = `${pick('Dados: ','Data: ')}${updated.toLocaleDateString(LOC(), {day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo'})} ${pick('às','at')} ${updated.toLocaleTimeString(LOC(), {hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo'})} (Brasília)`;
  say([], {lede: pick('Bom te ver por aqui.','Good to see you here.')});
  setTimeout(() => say([pick('Eu acompanho os fechamentos dos mercados a cada edição. Me conta seu perfil e eu te mostro uma leitura do momento — o que a eleição mexeu, o que isso costuma significar e quais caminhos entram na conversa de quem investe.','I track the market closes each edition. Tell me your profile and I’ll show you a reading of the moment — what the election moved, what it usually means and which paths enter the conversation of those who invest.')]), 400);
  setTimeout(start, 1400);
}).catch(() => { $('#updated').textContent = pick('Não foi possível carregar os dados de mercado.','Could not load market data.'); });
