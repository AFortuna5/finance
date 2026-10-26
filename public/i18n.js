// Idioma do Meridiano — PT/EN. Persiste em localStorage 'mer-lang'.
// Uso: data-i18n="chave" (textContent), data-i18n-html (innerHTML),
// data-i18n-ph (placeholder), data-i18n-aria (aria-label).
// No JS: t('chave') para o dicionário, pick('pt','en') para literais.
(function () {
  const DICT = {
    // --- faixa de edição / cabeçalho (todas as páginas) ---
    'ed.look': {pt: 'UM OLHAR SOBRE O MUNDO', en: 'A LOOK AT THE WORLD'},
    'ed.archive': {pt: 'ARQUIVO ↓︎', en: 'ARCHIVE ↓︎'},
    'ed.markets': {pt: 'UM OLHAR SOBRE OS MERCADOS', en: 'A LOOK AT THE MARKETS'},
    'ed.gov': {pt: 'UM OLHAR SOBRE AS CONTAS PÚBLICAS', en: 'A LOOK AT PUBLIC ACCOUNTS'},
    'ed.perfil': {pt: 'UMA CONVERSA SOBRE O SEU DINHEIRO', en: 'A CONVERSATION ABOUT YOUR MONEY'},
    'theme.aria': {pt: 'Alternar tema', en: 'Toggle theme'},
    'lang.aria': {pt: 'Switch to English', en: 'Mudar para português'},
    'back.link': {pt: '←︎ Voltar ao jornal', en: '←︎ Back to the journal'},
    'skip.link': {pt: 'Pular para o conteúdo', en: 'Skip to content'},
    'tagline': {pt: 'Economia em perspectiva.<br>O mundo além da manchete.', en: 'Economics in perspective.<br>The world beyond the headline.'},
    'tagline.m': {pt: 'O mercado em números.', en: 'The market in numbers.'},
    'tagline.g': {pt: 'O Estado em números.', en: 'The State in numbers.'},
    'tagline.p': {pt: 'Leitura guiada do seu perfil.', en: 'A guided read of your profile.'},
    'status.load': {pt: 'Carregando edição…', en: 'Loading edition…'},
    'tab.jornal': {pt: 'Jornal', en: 'Journal'},
    'tab.mercados': {pt: 'Mercados', en: 'Markets'},
    'tab.governo': {pt: 'Governo', en: 'Government'},
    'tab.perfil': {pt: 'Perfil', en: 'Profile'},
    'tab.aria': {pt: 'Índice do Meridiano', en: 'Meridiano index'},
    'footer.motto': {pt: 'UM JORNAL PARA ENTENDER, ANTES DE DECIDIR.', en: 'A JOURNAL TO UNDERSTAND, BEFORE DECIDING.'},
    'footer.gh': {pt: 'Projeto no GitHub ↗︎', en: 'Project on GitHub ↗︎'},
    'footer.rss': {pt: 'RSS ↗︎', en: 'RSS ↗︎'},
    'method.eyebrow': {pt: 'SOBRE ESTA EDIÇÃO', en: 'ABOUT THIS EDITION'},
    'method.panel': {pt: 'SOBRE ESTE PAINEL', en: 'ABOUT THIS PANEL'},
    'method.reading': {pt: 'SOBRE ESTA LEITURA', en: 'ABOUT THIS READING'},

    // --- index ---
    'intro.eyebrow': {pt: 'SEU PONTO DE PARTIDA', en: 'YOUR STARTING POINT'},
    'intro.h1': {pt: 'O que move<br>o mundo <em>hoje</em><span>.</span>', en: 'What moves<br>the world <em>today</em><span>.</span>'},
    'intro.p': {pt: 'Conecte os acontecimentos.<br>Entenda os movimentos.<br>Forme sua própria leitura.', en: 'Connect the events.<br>Understand the moves.<br>Form your own reading.'},
    'stamp.articles': {pt: 'NOTÍCIAS<br>NESTA EDIÇÃO', en: 'STORIES<br>IN THIS EDITION'},
    'data.eyebrow': {pt: 'O PULSO DA ECONOMIA', en: "THE ECONOMY'S PULSE"},
    'data.note': {pt: 'Dados oficiais · sem cotação em tempo real', en: 'Official data · no real-time quotes'},
    'brief.eyebrow': {pt: 'EM CINCO PONTOS', en: 'IN FIVE POINTS'},
    'brief.h2': {pt: 'A leitura do dia.', en: "The day's reading."},
    'brief.p': {pt: 'Uma seleção para começar.<br>Do cenário macro aos seus desdobramentos.', en: 'A selection to begin.<br>From the macro picture to its ripples.'},
    'brief.time': {pt: '◷ Cerca de 5 minutos', en: '◷ About 5 minutes'},
    'hist.label': {pt: 'Edições anteriores', en: 'Past editions'},
    'hist.recent': {pt: 'Mais recente', en: 'Latest'},
    'hist.prev': {pt: '‹ Anterior', en: '‹ Prev'},
    'hist.next': {pt: 'Seguinte ›', en: 'Next ›'},
    'cat.all': {pt: 'A primeira página', en: 'Front page'},
    'cat.br': {pt: 'Brasil', en: 'Brazil'},
    'cat.world': {pt: 'Mundo', en: 'World'},
    'cat.markets': {pt: 'Mercados', en: 'Markets'},
    'cat.geo': {pt: 'Geopolítica', en: 'Geopolitics'},
    'cat.elec': {pt: 'Eleições', en: 'Elections'},

    'search.ph': {pt: 'Busque um assunto, país ou fonte', en: 'Search a topic, country or source'},
    'search.aria': {pt: 'Buscar notícias', en: 'Search stories'},
    'more': {pt: 'Ver mais notícias ↓︎', en: 'More stories ↓︎'},
    'radar.eyebrow': {pt: 'NO RADAR', en: 'ON THE RADAR'},
    'radar.h2': {pt: 'Agenda econômica', en: 'Economic calendar'},
    'radar.note': {pt: 'Próximas divulgações · horários de Brasília. Datas podem mudar.', en: 'Upcoming releases · Brasília time. Dates may change.'},
    'radar.sources': {pt: 'Calendários oficiais · Brasil e EUA', en: 'Official calendars · Brazil and US'},
    'fio.eyebrow': {pt: 'O FIO DA MEADA', en: 'CONNECTING THE DOTS'},
    'fio.h2': {pt: 'Uma notícia.<br>Várias conexões.', en: 'One story.<br>Many connections.'},
    'fio.p': {pt: 'Antes de olhar o preço, entenda o caminho que o dinheiro percorre.', en: 'Before looking at the price, understand the path money takes.'},
    'fio.c1': {pt: 'Inflação', en: 'Inflation'},
    'fio.c2': {pt: 'Decisão de juros', en: 'Rate decisions'},
    'fio.c3': {pt: 'Crédito e atividade', en: 'Credit and activity'},
    'fio.c4': {pt: 'Empresas e mercados', en: 'Companies and markets'},
    'fio.small': {pt: 'Relação ilustrativa. Expectativas, câmbio e política fiscal também influenciam esse percurso.', en: 'Illustrative relationship. Expectations, FX and fiscal policy also shape this path.'},
    'learn.eyebrow': {pt: 'CADERNO DE ECONOMIA', en: 'ECONOMICS NOTEBOOK'},
    'learn.h2': {pt: 'Vale entender', en: 'Worth knowing'},
    'learn.s1': {pt: 'Por que os juros importam?', en: 'Why do rates matter?'},
    'learn.p1': {pt: 'Juros influenciam o custo do crédito, o consumo e o investimento. Taxas mais altas podem ajudar a conter a demanda e a inflação, mas os efeitos levam tempo e dependem do contexto.', en: 'Rates shape the cost of credit, consumption and investment. Higher rates can help contain demand and inflation, but the effects take time and depend on context.'},
    'learn.s2': {pt: 'O que move o câmbio?', en: 'What moves the exchange rate?'},
    'learn.p2': {pt: 'Fluxos de capital, comércio, juros relativos e percepção de risco afetam a demanda por moedas. Não existe uma única variável que explique todas as oscilações.', en: 'Capital flows, trade, relative rates and risk perception drive currency demand. No single variable explains every move.'},
    'learn.s3': {pt: 'Inflação é tudo igual?', en: 'Is all inflation equal?'},
    'learn.p3': {pt: 'Não. Choques de oferta, demanda e preços administrados têm causas distintas. Compare o índice cheio, seus componentes e a tendência ao longo do tempo.', en: 'No. Supply shocks, demand and administered prices have different causes. Compare the headline index, its components and the trend over time.'},
    'learn.s4': {pt: 'Como ler uma manchete?', en: 'How to read a headline?'},
    'learn.p4': {pt: 'Confira a fonte e a data. Separe fatos, projeções e opiniões. Pergunte o que mudou, quem é afetado e o que ainda não sabemos.', en: 'Check the source and the date. Separate facts, forecasts and opinions. Ask what changed, who is affected and what we still do not know.'},
    'note.h3': {pt: 'Dez minutos, todo dia.', en: 'Ten minutes, every day.'},
    'note.p': {pt: 'Leia uma notícia do Brasil, uma do exterior e acompanhe um tema por uma semana. Contexto se constrói com continuidade.', en: 'Read one story from Brazil, one from abroad and follow one topic for a week. Context builds with continuity.'},
    'method.p1': {pt: 'Fontes: Agência Brasil, InfoMoney, MoneyTimes, Brazil Journal, G1, Poder360, BBC, CNBC, MarketWatch e Financial Times. Seleção automática por relevância temática, diversidade e atualidade, com remoção de manchetes semelhantes. Resumos usam a descrição fornecida pelo feed; traduções automáticas podem conter erros. Consulte a fonte para o texto completo.', en: 'Sources: Agência Brasil, InfoMoney, MoneyTimes, Brazil Journal, G1, Poder360, BBC, CNBC, MarketWatch and the Financial Times. Automatic selection by topical relevance, diversity and recency, with near-duplicate headlines removed. Summaries use the description provided by each feed; machine translations may contain errors. See the source for the full text.'},
    'method.p2': {pt: 'O contexto é educativo e organizado por tema; não é análise individual ou previsão de preços. Indicadores do Banco Central mostram a data de referência. Agenda automática: BLS e Federal Reserve; Brasil: calendários oficiais. Uma edição por dia é preservada no histórico. Favoritos ficam neste navegador.', en: 'Context is educational and organized by topic; it is not individual analysis or price forecasting. Central Bank indicators show their reference date. Automatic schedule: BLS and the Federal Reserve; Brazil: official calendars. One edition per day is kept in the archive. Saved stories stay in this browser.'},

    // --- mercados ---
    'mk.eyebrow': {pt: 'PAINEL DE MERCADOS', en: 'MARKETS PANEL'},
    'mk.h1': {pt: 'O placar<br>da <em>virada</em><span>.</span>', en: 'The scoreboard<br>of the <em>turnaround</em><span>.</span>'},
    'mk.intro': {pt: 'Fechamentos diários dos principais ativos,<br>com a régua dos dois turnos da eleição.<br>O trecho tracejado projeta a tendência recente —<br>é ilustrativo, não é previsão nem recomendação.', en: 'Daily closes of the main assets,<br>measured against both election rounds.<br>The dashed stretch projects the recent trend —<br>illustrative, not a forecast or a recommendation.'},
    'mk.stamp': {pt: 'RÉGUA<br>ELEITORAL', en: 'ELECTION<br>RULER'},
    'mk.loading': {pt: 'Carregando painel…', en: 'Loading panel…'},
    'mk.method.p1': {pt: 'Fechamentos diários: Yahoo Finance, últimos três meses. As variações comparam o último fechamento com o último pregão anterior a cada turno: 1º turno em 04/10/2026 e 2º turno em 25/10/2026.', en: 'Daily closes: Yahoo Finance, last three months. Changes compare the latest close to the last session before each round: first round on 10/04/2026 and runoff on 10/25/2026.'},
    'mk.method.p2': {pt: 'O termômetro técnico vem do scanner público do TradingView — sintetiza médias móveis e osciladores em compra/venda/neutro, com RSI, distância da média de 200 dias e volatilidade. O consenso Focus é a mediana das projeções de mais de cem instituições financeiras compiladas pelo Banco Central.', en: 'The technical gauge comes from TradingView’s public scanner — it compresses moving averages and oscillators into buy/sell/neutral, with RSI, distance to the 200-day average and volatility. The Focus consensus is the median of projections from over a hundred financial institutions compiled by the Central Bank.'},
    'mk.method.p3': {pt: 'A linha tracejada estende a tendência linear dos últimos dez fechamentos por uma semana — referência visual, sem modelo estatístico nem fundamentos. Os links de cada ativo abrem TradingView, Investing.com e fontes oficiais para conferência. Nada aqui é recomendação de investimento.', en: 'The dashed line extends the linear trend of the last ten closes one week out — a visual reference, no statistical model or fundamentals. Each asset links to TradingView, Investing.com and official sources for checking. Nothing here is investment advice.'},

    // --- governo ---
    'gv.eyebrow': {pt: 'AS CONTAS DO GOVERNO', en: 'GOVERNMENT ACCOUNTS'},
    'gv.h1': {pt: 'Quanto entra,<br>quanto <em>sai</em><span>.</span>', en: 'What comes in,<br>what goes <em>out</em><span>.</span>'},
    'gv.intro': {pt: 'Juros, inflação, dívida e o resultado<br>das contas públicas — direto das<br>fontes oficiais, sem intermediário.<br>Cada gráfico mostra o mês de referência.', en: 'Rates, inflation, debt and the result<br>of the public accounts — straight from<br>official sources, no middleman.<br>Each chart shows its reference month.'},
    'gv.stamp': {pt: 'DADOS<br>OFICIAIS', en: 'OFFICIAL<br>DATA'},
    'gv.loading': {pt: 'Carregando painel…', en: 'Loading panel…'},
    'gv.method.p1': {pt: 'Fontes: séries temporais do Banco Central (SGS), IPCA e PNAD Contínua do IBGE, e resultado primário do Tesouro Nacional. A coleta roda a cada 15 minutos, mas a maioria desses dados é divulgada uma vez por mês — a data de referência aparece em cada cartão.', en: 'Sources: Central Bank time series (SGS), IPCA and PNAD Contínua from IBGE, and the primary result from the National Treasury. Collection runs every 15 minutes, but most of these figures are released once a month — the reference date appears on each card.'},
    'gv.method.p2': {pt: 'O resultado primário do Tesouro é o acumulado do ano: negativo significa que o governo gastou mais do que arrecadou (antes dos juros da dívida). Dívida bruta mede o estoque total; a líquida desconta os ativos do setor público. Nada aqui é recomendação de investimento.', en: 'The Treasury primary result is the year-to-date figure: negative means the government spent more than it collected (before debt interest). Gross debt measures the total stock; net debt subtracts public-sector assets. Nothing here is investment advice.'},

    // --- perfil ---
    'pf.eyebrow': {pt: 'LEITURA DE PERFIL', en: 'PROFILE READING'},
    'pf.h1': {pt: 'Qual é<br>o seu <em>caminho</em><span>?</span>', en: 'What is<br>your <em>path</em><span>?</span>'},
    'pf.intro': {pt: 'Responda algumas perguntas e receba uma leitura<br>do cenário pós-eleição ajustada ao seu perfil.<br>Os números vêm dos fechamentos mais recentes —<br>o texto é educativo, não é recomendação.', en: 'Answer a few questions and get a reading<br>of the post-election landscape tuned to your profile.<br>Numbers come from the latest closes —<br>the text is educational, not a recommendation.'},
    'pf.stamp': {pt: 'PERFIL<br>DE RISCO', en: 'RISK<br>PROFILE'},
    'pf.loading': {pt: 'Carregando dados de mercado…', en: 'Loading market data…'},
    'chat.ph': {pt: 'Ou escreva sobre um tema — dólar, bolsa, renda fixa…', en: 'Or type a topic — dollar, stocks, fixed income…'},
    'chat.aria': {pt: 'Escrever mensagem', en: 'Type a message'},
    'send.aria': {pt: 'Enviar', en: 'Send'},
    'pf.method.p1': {pt: 'As respostas são montadas a partir das suas escolhas e dos fechamentos diários coletados na última edição — variação desde o 1º e o 2º turnos, indicadores oficiais do Banco Central e agenda econômica.', en: 'Answers are assembled from your choices and the daily closes collected in the latest edition — change since the first and second rounds, official Central Bank indicators and the economic calendar.'},
    'pf.method.p2': {pt: 'É material educativo para entender o cenário e organizar suas perguntas. Não considera seu patrimônio, seus objetivos completos nem tributos — e não é recomendação de investimento. Para decisões, fale com um assessor.', en: 'It is educational material to understand the landscape and organize your questions. It does not consider your wealth, your full goals or taxes — and it is not investment advice. For decisions, talk to an advisor.'},
  };

  const stored = () => { try { return localStorage.getItem('mer-lang') === 'en' ? 'en' : 'pt'; } catch { return 'pt'; } };
  let lang = stored();
  window.merLang = () => lang;
  window.merLocale = () => lang === 'en' ? 'en-US' : 'pt-BR';
  window.t = k => (DICT[k] && (DICT[k][lang] ?? DICT[k].pt)) ?? k;
  window.pick = (pt, en) => lang === 'en' ? (en ?? pt) : pt;

  function apply() {
    document.documentElement.lang = lang === 'en' ? 'en' : 'pt-BR';
    for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = window.t(el.dataset.i18n);
    for (const el of document.querySelectorAll('[data-i18n-html]')) el.innerHTML = window.t(el.dataset.i18nHtml);
    for (const el of document.querySelectorAll('[data-i18n-ph]')) el.placeholder = window.t(el.dataset.i18nPh);
    for (const el of document.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label', window.t(el.dataset.i18nAria));
    const btn = document.getElementById('lang');
    if (btn) { btn.textContent = lang === 'en' ? 'PT' : 'EN'; btn.setAttribute('aria-label', window.t('lang.aria')); }
  }
  window.applyI18n = apply;
  window.setLang = l => {
    lang = l === 'en' ? 'en' : 'pt';
    try { localStorage.setItem('mer-lang', lang); } catch {}
    apply();
    window.dispatchEvent(new Event('mer-lang'));
  };
  apply();
  document.addEventListener('DOMContentLoaded', () => {
    const b = document.getElementById('lang');
    if (b) b.onclick = () => setLang(lang === 'en' ? 'pt' : 'en');
  });
})();
