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
   `public/governo.json`, `public/history.json` e `public/editions/<data>.json`.
3. Se algo mudou, o workflow comita como `Arthur Fortuna
   <201008665+AFortuna5@users.noreply.github.com>` — e-mail que a Vercel
   reconhece para liberar o deploy.
4. A Vercel publica `public/` como site estático (`vercel.json`: sem framework,
   sem build — a pasta vai direto para a CDN).

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
public/            o site inteiro, servido pela Vercel
  index.html       jornal  ·  mercados.html  painel de mercados
  governo.html     contas do governo  ·  perfil.html  leitura de perfil
  *.js / *.css     um par por página + style.css (base) + mobile.css (mobile)
  feed-text.js     limpeza de HTML de feed e validação de datas (site + testes)
  *.json           dados gerados pelo coletor (não editar à mão)
scripts/
  update_news.py   o "backend": feeds, tradução, mercados, Focus, governo, agenda
  test-data.mjs    regressão: datas válidas e limpeza de HTML dos feeds
.github/workflows/ refresh-edition.yml (coleta 15min) + checks.yml (CI)
CONTINUIDADE_*.md  diário de decisões e pendências entre sessões
```

## Desenvolvimento

```bash
python scripts/update_news.py   # roda a coleta e grava os JSONs
node scripts/test-data.mjs      # regressão de dados/limpeza de HTML
# servir public/ com qualquer servidor estático para ver o site local
```

CI (`checks.yml`) valida a sintaxe de todos os JS públicos, compila o Python e
roda a regressão — não há dependências npm nem etapa de build.

## Regras de integridade

- Commits e deploys sempre assinados como Arthur Fortuna (e-mail noreply do
  GitHub — corporativo é bloqueado pela Vercel).
- Distinção obrigatória entre dado observado, indicador técnico, consenso de
  analistas e projeção ilustrativa — nada é vendido como previsão.
- Sem chaves de API no código e sem dependência de serviço pago.
