const $ = s => document.querySelector(s);
try { if (localStorage.getItem('meridiano-theme') === 'dark') document.body.classList.add('dark'); } catch {}
$('#today').textContent = new Date().toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric',timeZone:'America/Sao_Paulo'}).toUpperCase();
$('#theme').onclick = () => { document.body.classList.toggle('dark'); try { localStorage.setItem('meridiano-theme', document.body.classList.contains('dark') ? 'dark' : 'light'); } catch {} };

const chat = $('#chat');
const pct = v => v == null ? '—' : (v > 0 ? '+' : '') + v.toLocaleString('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 1}) + '%';
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
  ['Dólar', asset('BRL=X')?.changeSecondRound],
  ['Ibovespa', asset('^BVSP')?.changeSecondRound],
  ['Ouro', asset('GC=F')?.changeSecondRound],
  ['Bitcoin', asset('BTC-USD')?.changeSecondRound],
];
const selic = () => state.news?.indicators?.find(i => i.name === 'Selic meta')?.value;

const TOPICS = [
  {keys: ['dólar', 'dolar', 'câmbio', 'cambio', 'dolarizar', 'exterior', 'internacional'],
   text: () => {
     const d = asset('BRL=X');
     return `Dólar: desde o 2º turno, ${pct(d?.changeSecondRound)} (${pct(d?.changeFirstRound)} desde o 1º). Se a leitura for de dólar mais forte à frente, exposição cambial protege parte do patrimônio — via fundos cambiais, BDRs ou conta internacional. Se já caiu muito no curto prazo, entrar de uma vez pode pegar o movimento no fim; fracionar a entrada costuma fazer mais sentido que timing perfeito.`;
   }},
  {keys: ['bolsa', 'ações', 'acoes', 'ibovespa', 'empresa', 'fii', 'b3'],
   text: () => `Bolsa: o Ibovespa varreu ${pct(asset('^BVSP')?.changeSecondRound)} desde o 2º turno. Queda forte por reação política costuma ser avaliada em duas partes: o que é ruído de curto prazo e o que muda a tese das empresas. Posição gradual, por setores, tende a ser mais defensável do que uma entrada única tentando acertar o fundo.`},
  {keys: ['renda fixa', 'selic', 'cdb', 'tesouro', 'lci', 'lca', 'juros', 'prefixado', 'ipca'],
   text: () => `Renda fixa: com a Selic em ${selic() ?? '—'}% ao ano, o carrego brasileiro segue generoso — e em cenário de incerteza pós-eleição, taxas altas em títulos atrelados à inflação ou à Selic tendem a ser o porto seguro natural. Atenção apenas à duration: prefixados longos oscilam bastante quando o cenário muda.`},
  {keys: ['ouro', 'gold'],
   text: () => `Ouro: ${pct(asset('GC=F')?.changeSecondRound)} desde o 2º turno. O metal costuma atuar como proteção quando a confiança em moedas e governos balança — faz papel de seguro, não de motor de rentabilidade. Participação pequena na carteira costuma ser o uso clássico.`},
  {keys: ['bitcoin', 'cripto', 'btc', 'crypto'],
   text: () => `Bitcoin: ${pct(asset('BTC-USD')?.changeSecondRound)} desde o 2º turno. É o ativo mais volátil do painel — trate como aposta assimétrica de tamanho pequeno, nunca como núcleo. Se entrar, dimensione assumindo que pode cair pela metade.`},
  {keys: ['petróleo', 'petroleo', 'combustível', 'combustivel', 'wti'],
   text: () => `Petróleo: WTI em ${pct(asset('CL=F')?.changeSecondRound)} desde o 2º turno. Afeta sua vida via inflação e gasolina mais do que como investimento direto — para a maioria das pessoas, a leitura importa mais que a posição.`},
  {keys: ['previdência', 'previdencia', 'aposentadoria', 'aposentar'],
   text: () => 'Previdência: com horizonte longo, a reação de curto prazo da eleição pesa menos que a constância dos aportes. O erro clássico é mudar a estratégia toda vez que o cenário político muda.'},
  {keys: ['imóvel', 'imovel', 'imóveis', 'imoveis'],
   text: () => 'Imóveis: não acompanho esse mercado aqui. O que a eleição muda indiretamente é o crédito imobiliário — juros altos seguram preços e financiamentos.'},
];

function analysis() {
  const p = state.answers;
  const lines = [];
  const usd = asset('BRL=X')?.changeSecondRound, ibov = asset('^BVSP')?.changeSecondRound;
  const dir = usd != null && usd > 0 ? 'subiu' : usd != null && usd < 0 ? 'recuou' : 'seguiu estável';
  const dirB = ibov != null && ibov > 0 ? 'avançou' : ibov != null && ibov < 0 ? 'recuou' : 'seguiu estável';
  say([], {lede: 'Cenário na sua mesa', figures: figures(), fine: 'Variação desde o 2º turno · fechamentos diários'});
  lines.push(`Desde o 2º turno, o dólar ${dir} (${pct(usd)}) e a bolsa ${dirB} (${pct(ibov)}). Leituras de curto prazo ainda estão sendo formadas — o que você vê hoje é a primeira reação, não a tendência consolidada.`);

  if (p.perfil === 'conservador') {
    lines.push(`Perfil conservador: a prioridade é não errar feio. Com a Selic em ${selic() ?? '—'}% ao ano, a renda fixa atrelada à Selic ou à inflação já entrega retorno real relevante sem sustos — esse continua sendo o alicerce.`);
    lines.push('Diante da eleição, o ajuste típico é de proteção, não de aposta: uma faixa modesta em exposição cambial (fundos cambiais ou conta internacional) funciona como seguro caso o real deslanche, e posições em ouro fazem papel parecido. Evite resgatar proteção no primeiro dia de calmaria.');
  } else if (p.perfil === 'moderado') {
    lines.push('Perfil moderado: você pode carregar algum risco, mas sem virar especulador. A base segue em renda fixa; na parte variável, a eleição cria duas leituras simultâneas — bolsa mais barata se o tombo for exagerado, e câmbio como hedge caso o cenário fiscal azede.');
    lines.push('O caminho equilibrado costuma ser rebalancear aos poucos: aumentar a parte que ficou barata sem abandonar a proteção. Evitar movimentos binários é o que separa moderado de impaciente.');
  } else {
    lines.push('Perfil arrojado: volatilidade pós-eleição é onde retornos de longo prazo costumam nascer — mas só paga quem sobrevive ao caminho. Posições em bolsa compradas em pânico histórico tendem a envelhecer bem; posições concentradas feitas no impulso, não.');
    lines.push('A regra prática dos perfis agressivos disciplinados: escada de entrada (três a cinco parcelas), tamanho de posição que você aguenta ver cair 20% e uma faixa sempre liquida para aproveitar os próximos capítulos da novela fiscal.');
  }

  if (p.horizonte === 'curto') lines.push('Com horizonte de até um ano, opinião sobre a eleição importa menos do que liquidez e previsibilidade — curto prazo é território da renda fixa, não de tese política.');
  if (p.horizonte === 'longo') lines.push('Com mais de três anos pela frente, você tem o luxo de ignorar a primeira semana de reação: ciclos eleitorais mexem no preço, mas quem paga a conta é o fluxo de caixa dos ativos, não a manchete.');
  if (p.objetivo === 'renda') lines.push('Para gerar renda, o cenário atual favorece juros reais altos: títulos e fundos de papel atrelados à inflação costumam combinar melhor com esse objetivo do que ativos que dependem de valorização.');
  if (p.objetivo === 'crescimento') lines.push('Para crescimento, o pós-eleição costuma premiar quem compra gradualmente o que ficou barato por motivo político — desde que a tese da empresa ou do ativo não tenha mudado de verdade.');
  if (p.exposicao === 'nada') lines.push(`Você mencionou não ter exposição cambial. Se a sua leitura é de dólar estruturalmente mais forte, começar com uma faixa pequena (5% a 10% do patrimônio) já muda o comportamento da carteira sem transformar o cenário em aposta.`);
  if (p.exposicao === 'muita') lines.push('Com boa parte já dolarizada, a pergunta vira o inverso: o real barato pode compensar trazer algo de volta aos poucos, especialmente se suas despesas são em reais.');

  say(lines, {fine: 'Leitura educativa sobre o cenário · não é recomendação de investimento'});
  setTimeout(() => ask('Quer aprofundar algum tema?', [['Fale do dólar', 'dólar'], ['E a bolsa?', 'bolsa'], ['E renda fixa?', 'renda fixa'], ['E ouro?', 'ouro']], v => answer(v)), 500);
}

function answer(input) {
  const text = String(input).toLowerCase();
  const topic = TOPICS.find(t => t.keys.some(k => text.includes(k)));
  const stop = typing();
  setTimeout(() => {
    stop();
    if (topic) {
      say([topic.text()], {fine: 'Leitura educativa · não é recomendação'});
      setTimeout(() => ask('Mais algum tema?', [['Bitcoin', 'bitcoin'], ['Petróleo', 'petróleo'], ['Previdência', 'previdência'], ['Encerrar', '__fim']], v => v === '__fim' ? farewell() : answer(v)), 500);
    } else {
      say(['Não tenho uma leitura pronta para isso — mas posso falar de câmbio, bolsa, renda fixa, ouro, bitcoin, petróleo ou previdência.'], {});
      setTimeout(() => ask('Escolha um tema:', [['Dólar', 'dólar'], ['Bolsa', 'bolsa'], ['Renda fixa', 'renda fixa'], ['Bitcoin', 'bitcoin']], v => answer(v)), 500);
    }
  }, 650);
}

function farewell() {
  say(['Fechado. O painel de mercados ao lado mostra os mesmos números em gráfico — e o jornal explica por que eles se moveram. Volte quando quiser revisar a leitura: ela muda junto com os dados.'], {fine: 'Conversa encerrada · os dados continuam sendo atualizados'});
  $('#chat-text').placeholder = 'Ainda com dúvida? Escreva um tema — dólar, bolsa, renda fixa…';
}

function start() {
  ask('Vamos lá. Para começar: qual é o seu principal objetivo com esse dinheiro?',
      [['Proteger o que tenho', 'proteger'], ['Crescer no longo prazo', 'crescimento'], ['Gerar renda', 'renda']],
      v => { state.answers = {objetivo: v};
        ask('E seu estômago para risco? Se a carteira caísse 10% num mês, você…',
            [['Venderia tudo', 'conservador'], ['Aguardaria', 'moderado'], ['Compraria mais', 'arrojado']],
            v => { state.answers.perfil = v;
              ask('Quando você vai precisar desse dinheiro?',
                  [['Em até 1 ano', 'curto'], ['Em 1 a 3 anos', 'medio'], ['Daqui a 3+ anos', 'longo']],
                  v => { state.answers.horizonte = v;
                    ask('Última: hoje, quanto do seu dinheiro já está em dólar ou no exterior?',
                        [['Nada', 'nada'], ['Uma parte', 'parte'], ['Boa parte', 'muita']],
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
    setTimeout(() => { stop(); say(['Boa pergunta — vou responder melhor depois de entender seu perfil. Duas perguntas rápidas:']); start(); }, 600);
  } else answer(text);
};

Promise.all([
  fetch('markets.json', {cache: 'no-store'}).then(r => r.ok ? r.json() : null),
  fetch('news.json', {cache: 'no-store'}).then(r => r.ok ? r.json() : null),
]).then(([m, n]) => {
  state.data = m; state.news = n;
  const updated = m ? new Date(m.updatedAt) : new Date();
  $('#updated').textContent = `Dados: ${updated.toLocaleDateString('pt-BR', {day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo'})} às ${updated.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo'})} (Brasília)`;
  say([], {lede: 'Bom te ver por aqui.'});
  setTimeout(() => say(['Eu acompanho os fechamentos dos mercados a cada edição. Me conta seu perfil e eu te mostro uma leitura do momento — o que a eleição mexeu, o que isso costuma significar e quais caminhos entram na conversa de quem investe.']), 400);
  setTimeout(start, 1400);
}).catch(() => { $('#updated').textContent = 'Não foi possível carregar os dados de mercado.'; });
