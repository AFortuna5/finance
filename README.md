# Meridiano

Jornal digital em português sobre economia, mercados, geopolítica e eleições —
feito para uso pessoal e publicado para quem quiser acompanhar também. As
notícias vêm de feeds RSS confiáveis (sempre com link para a fonte), os números
vêm de APIs oficiais, e o contexto é educativo: **nada aqui é recomendação de
investimento**.

**Site:** https://meridiano-news.vercel.app

## O que tem dentro

| Página | Conteúdo |
| --- | --- |
| `/` | Edição do dia: manchetes curadas e traduzidas para pt-BR, cinco destaques, indicadores (Selic, PTAX, IPCA), agenda econômica identificada por país (Brasil/EUA) e arquivo de edições anteriores. |
| `/mercados.html` | Painel de mercados: 8 ativos (Ibovespa, dólar, euro, S&P 500, Nasdaq, Bitcoin, ouro, petróleo WTI) com fechamentos diários, marcadores dos turnos eleitorais, termômetro técnico, consenso Focus e explicação de cada ativo. |
| `/governo.html` | As contas do governo: Selic, IPCA 12m e mensal, dívida pública % PIB, desemprego e os grandes números do Tesouro (resultado primário, receita, despesa). |
| `/perfil.html` | Conversa guiada (chat): o visitante responde sobre objetivo, risco, horizonte e exposição cambial e recebe uma leitura do cenário montada com os dados reais do dia. |

Extras: interface **PT/EN** com troca em runtime (manchetes internacionais
voltam ao inglês original no modo EN), modo claro/escuro, layout próprio para
mobile com barra de navegação fixa, skip link e foco visível para
acessibilidade, e `og:image`/`robots.txt`/`sitemap.xml` para compartilhamento
e indexação.

## Tecnologias

| Camada | Stack |
| --- | --- |
| Front-end | HTML, CSS e JavaScript puros — **zero framework, zero dependência npm**. Renderização via DOM/`textContent` (conteúdo de feed nunca vira HTML injetado) e links validados para `https:` |
| "Backend" | `scripts/update_news.py` — Python 3.12 **só com stdlib** (`urllib`, `xml.etree`, `json`, `concurrent.futures`). Nenhum `pip install`, nenhuma chave de API |
| "Banco de dados" | Arquivos JSON commitados no próprio repositório e servidos como estáticos pela CDN |
| Automação | GitHub Actions: workflow agendado a cada 15 min coleta, valida e comita os dados; o push dispara o deploy |
| Hospedagem | Vercel, site 100% estático (sem servidor, sem função) |
| CI | `checks.yml`: `node --check` em todos os JS, `py_compile`, regressão de dados (`test-data.mjs`) e cobertura do dicionário PT/EN (`check-i18n.mjs`) |

## Como o site se atualiza

```
GitHub Actions (a cada 15 min)          Vercel
┌──────────────────────────────┐
│ scripts/update_news.py       │   push    ┌──────────────────┐
│  · lê 13 feeds RSS           │ ───────►  │ public/ ──► CDN  │
│  · cura, traduz, contextualiza│  commit   └──────────────────┘
│  · coleta APIs de dados      │
│  · grava JSONs em public/    │
└──────────────────────────────┘
```

1. `.github/workflows/refresh-edition.yml` roda `*/15 * * * *` (com trava de
   concorrência) e executa `scripts/update_news.py`.
2. O script coleta e grava `public/news.json`, `public/markets.json`,
   `public/governo.json`, `public/history.json` e `public/editions/<data>.json`
   (um snapshot por dia — o arquivo do jornal).
3. Se algo mudou, o workflow comita como `Arthur Fortuna
   <201008665+AFortuna5@users.noreply.github.com>` — e-mail que a Vercel
   reconhece para liberar o deploy.
4. A Vercel roda `node scripts/test-data.mjs` como etapa de build: se os dados
   estiverem corrompidos, o deploy falha em vez de publicar lixo.

O navegador só lê os JSONs gerados — nenhuma chave privada ou chamada direta a
APIs externas acontece no front-end.

> Nota: em repositório privado, o plano gratuito do GitHub Actions limita
> minutos mensais e pode atrasar/suprimir execuções agendadas. Com o repo
> público, o agendamento roda sem custo.

## APIs e fontes de dados

Tudo público e **sem chave de API**:

| Fonte | Endpoint / forma | Uso |
| --- | --- | --- |
| RSS (13 feeds) | Agência Brasil, InfoMoney, MoneyTimes, Brazil Journal, G1, Poder360, BBC, CNBC, MarketWatch, FT | Manchetes nacionais e internacionais |
| Banco Central · SGS | `api.bcb.gov.br/dados/serie/bcdata.sgs.{serie}` (CSV→JSON) | Selic, PTAX, IPCA, dívida pública, desemprego |
| Banco Central · Olinda | `olinda.bcb.gov.br/.../ExpectativasMercadoAnuais` (OData) | Consenso Focus de ~110 instituições |
| Yahoo Finance | `query1.finance.yahoo.com/v8/finance/chart/{símbolo}` | Fechamentos diários dos 8 ativos |
| TradingView | `scanner.tradingview.com/{mercado}/scan` | Termômetro técnico, RSI, médias móveis |
| IBGE · SIDRA | `apisidra.ibge.gov.br/values/...` | Fallback de IPCA e desemprego |
| IPEA · Ipeadata | `ipeadata.gov.br/api/odata4/ValoresSerie(...)` | Fallback de Selic e dívida |
| Tesouro Nacional | `grandesnumeros.tesouro.gov.br` | Resultado primário, receita, despesa |
| BLS | `bls.gov/schedule/news_release/bls.ics` | Agenda EUA: CPI, Payroll, PPI, JOLTS |
| Federal Reserve | `federalreserve.gov/monetarypolicy/fomccalendars.htm` | Datas do FOMC |
| Banco Central | Comunicado oficial (verificado em `lib/calendar-verified.json`) | Datas do Copom |
| Google Translate / MyMemory | endpoints públicos | Tradução automática de manchetes para pt-BR |

Cada card indica a fonte e a data de referência. Quando uma fonte falha, a
cadeia de fallback tenta a próxima (SGS → SIDRA → Ipeadata); se todas falharem,
o card mostra o último valor em cache marcado como `cached` ou "Indisponível" —
nunca número inventado.

## O chat de perfil

A conversa em `/perfil.html` é **determinística — não é LLM**. Uma máquina de
estados em `perfil.js` pergunta objetivo, tolerância a risco, horizonte e
exposição cambial; depois cruza as respostas com os dados reais da edição
(Selic, variação dos ativos desde os turnos da eleição, agenda) e monta a
leitura com os números de verdade dentro do texto. Reproduzível, sem alucinação
de dados e sem chamada de API paga no navegador.

## Estrutura

```
public/            o site inteiro, servido pela Vercel
  index.html       jornal  ·  mercados.html  painel de mercados
  governo.html     contas do governo  ·  perfil.html  leitura de perfil
  *.js / *.css     um par por página + style.css (base) + mobile.css (mobile)
  i18n.js          dicionário PT/EN + helpers (t, pick) para todo o front
  feed-text.js     limpeza de HTML de feed e validação de datas (site + testes)
  *.json           dados gerados pelo coletor (não editar à mão)
  editions/        snapshots diários do jornal (arquivo navegável, ~1 ano)
  og-image.png     card de compartilhamento · robots.txt · sitemap.xml
lib/
  calendar-verified.json   datas do Copom conferidas em fonte oficial
scripts/
  update_news.py   o "backend": feeds, tradução, mercados, Focus, governo, agenda
  test-data.mjs    regressão: datas, limpeza de HTML, referências, UTF-8
  check-i18n.mjs   garante que toda chave data-i18n existe no dicionário
  make-og-card.py  gera o og-image.png (1200×630)
.github/workflows/ refresh-edition.yml (coleta 15min) + checks.yml (CI)
CONTINUIDADE_*.md  diário de decisões e pendências entre sessões
```

## Desenvolvimento

```bash
python scripts/update_news.py   # roda a coleta e grava os JSONs
node scripts/test-data.mjs      # regressão de dados/limpeza de HTML
node scripts/check-i18n.mjs     # cobertura do dicionário PT/EN
# servir public/ com qualquer servidor estático para ver o site local
python -m http.server -d public 8778
```

## Regras de integridade

- Commits e deploys sempre assinados como Arthur Fortuna (e-mail noreply do
  GitHub — corporativo é bloqueado pela Vercel).
- Distinção obrigatória entre dado observado, indicador técnico, consenso de
  analistas e projeção ilustrativa — nada é vendido como previsão.
- Sem chaves de API no código e sem dependência de serviço pago.
