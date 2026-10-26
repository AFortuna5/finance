# Meridiano

Jornal financeiro pessoal em português: economia, mercados, geopolítica e eleições,
com dados oficiais, painéis próprios e leitura educativa — sem recomendação de
investimento.

**Site:** https://finance-teal-two.vercel.app

## Páginas

| Página | Conteúdo |
| --- | --- |
| `/` | Edição do dia: manchetes curadas e traduzidas, cinco destaques, indicadores (Selic, PTAX, IPCA), agenda econômica e histórico de edições. |
| `/mercados.html` | Painel de mercados: 8 ativos (Ibovespa, dólar, euro, S&P 500, Nasdaq, Bitcoin, ouro, petróleo WTI) com fechamentos diários, marcadores dos turnos eleitorais, termômetro técnico, consenso Focus e explicação de cada ativo. |
| `/governo.html` | As contas do governo: Selic, IPCA 12m e mensal, dívida pública % PIB, desemprego e os grandes números do Tesouro (resultado primário, receita, despesa). |
| `/perfil.html` | Conversa guiada: o visitante descreve objetivo, risco, horizonte e exposição cambial; recebe uma leitura do cenário pós-eleição com os dados reais do dia. |

O projeto também contém a versão "app" do jornal (interface React/Next em `app/`,
`components/`, `lib/`, `worker/`), publicada separadamente no ambiente de apps do
ChatGPT. O site público não depende dela.

## Como o site se atualiza

```
GitHub Actions (a cada 15 min)          Vercel
┌──────────────────────────────┐
│ scripts/update_news.py       │   push    ┌────────────────────────┐
│  · lê 13 feeds RSS           │ ───────►  │ build: prepare-ui.mjs  │
│  · cura, traduz, contextualiza│  commit   │ public/  ──►  CDN      │
│  · coleta APIs de dados      │           └────────────────────────┘
│  · grava JSONs em public/    │
└──────────────────────────────┘
```

1. `.github/workflows/refresh-edition.yml` roda `*/15 * * * *` (com trava de
   concorrência) e executa `scripts/update_news.py`.
2. O script coleta e grava `public/news.json`, `public/markets.json`,
   `public/governo.json`, `public/history.json` e `public/editions/<data>.json`.
3. Se algo mudou, o workflow comita como `Arthur Fortuna
   <201008665+AFortuna5@users.noreply.github.com>` — e-mail que a Vercel
   reconhece para liberar o deploy.
4. A Vercel publica `public/` como site estático (`vercel.json`: sem framework,
   build apenas roda `prepare-ui.mjs` para manter o HTML embutido do app).

O navegador só lê os JSONs gerados — nenhuma chave privada ou chamada direta a
APIs externas acontece no front-end.

## Fontes de dados

| Fonte | Uso |
| --- | --- |
| RSS: Agência Brasil, InfoMoney, MoneyTimes, Brazil Journal, G1, Poder360, BBC, CNBC, MarketWatch, FT | Manchetes nacionais e internacionais |
| Banco Central · SGS | Selic, PTAX, IPCA, dívida pública, desemprego |
| Banco Central · Olinda (Focus) | Consenso de ~110 instituições: câmbio, Selic, IPCA, PIB |
| Yahoo Finance | Fechamentos diários dos ativos |
| TradingView (scanner público) | Termômetro técnico, RSI, médias móveis |
| IBGE · SIDRA | Fallback de IPCA e desemprego |
| IPEA · Ipeadata | Fallback de Selic e dívida pública |
| Tesouro · Grandes Números | Resultado primário, receita e despesa |
| BLS / Copom / IBGE / FOMC | Agenda econômica |
| Google Translate, MyMemory | Tradução de manchetes para pt-BR |

Tudo público e sem chave. Cada card indica a fonte e a data de referência;
séries indisponíveis mostram o último cache bom (`status: cached`) ou
"Indisponível" — nunca números inventados.

## Estrutura

```
public/            site estático servido pela Vercel
  index.html       jornal  ·  mercados.html  painel de mercados
  governo.html     contas do governo  ·  perfil.html  leitura de perfil
  *.js / *.css     um par por página + style.css (base) + mobile.css (mobile)
  *.json           dados gerados pelo coletor (não editar à mão)
scripts/
  update_news.py   coletor: feeds, tradução, mercados, Focus, governo
  prepare-ui.mjs   gera lib/journal-html.ts a partir de public/index.html
  test-data.mjs    regressão: datas válidas e limpeza de HTML dos feeds
app/ components/ lib/ db/ worker/   versão app (ChatGPT), independente do site
.github/workflows/ refresh-edition.yml (coleta 15min) + checks.yml (CI)
CONTINUIDADE_*.md  diário de decisões e pendências entre sessões
```

## Desenvolvimento

```bash
python scripts/update_news.py   # roda a coleta e grava os JSONs
node scripts/test-data.mjs      # regressão de dados/limpeza de HTML
# servir public/ com qualquer servidor estático para ver o site local
```

CI (`checks.yml`) valida sintaxe dos JS, compila o Python, roda a regressão e
garante que `lib/journal-html.ts` está sincronizado com `public/index.html`.

## Regras de integridade

- Commits e deploys sempre assinados como Arthur Fortuna (e-mail noreply do
  GitHub — corporativo é bloqueado pela Vercel).
- Distinção obrigatória entre dado observado, indicador técnico, consenso de
  analistas e projeção ilustrativa — nada é vendido como previsão.
- Sem chaves de API no código e sem dependência de serviço pago.
