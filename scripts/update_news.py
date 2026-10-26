"""Collect public RSS headlines; no full articles or API keys required."""
import concurrent.futures
import datetime as dt
import email.utils
import gzip
import html
import json
import pathlib
import re
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parents[1]
TIMEZONE = dt.timezone(dt.timedelta(hours=-3))  # America/Sao_Paulo (sem horário de verão)
FEEDS = [
    ('Brasil', 'Agência Brasil', 'https://agenciabrasil.ebc.com.br/rss/economia/feed.xml', 'pt'),
    ('Brasil', 'InfoMoney', 'https://www.infomoney.com.br/feed/', 'pt'),
    ('Brasil', 'MoneyTimes', 'https://www.moneytimes.com.br/feed/', 'pt'),
    ('Brasil', 'Brazil Journal', 'https://braziljournal.com/feed/', 'pt'),
    ('Brasil', 'G1 Economia', 'https://g1.globo.com/rss/g1/economia/', 'pt'),
    ('Mercados', 'CNBC', 'https://www.cnbc.com/id/100003114/device/rss/rss.html', 'en'),
    ('Mercados', 'MarketWatch', 'https://feeds.marketwatch.com/marketwatch/topstories/', 'en'),
    ('Mercados', 'Financial Times', 'https://www.ft.com/rss/home', 'en'),
    ('Mundo', 'BBC News', 'https://feeds.bbci.co.uk/news/business/rss.xml', 'en'),
    ('Geopolítica', 'BBC News', 'https://feeds.bbci.co.uk/news/world/rss.xml', 'en'),
    ('Eleições', 'Agência Brasil', 'https://agenciabrasil.ebc.com.br/rss/politica/feed.xml', 'pt'),
    ('Eleições', 'Poder360', 'https://www.poder360.com.br/feed/', 'pt'),
    ('Eleições', 'G1 Política', 'https://g1.globo.com/rss/g1/politica/', 'pt'),
]
ITEMS_PER_FEED = 12
PER_CATEGORY_CAP = 10
TOTAL_CAP = 40
CALENDAR_SOURCES = [
    {'name': 'IBGE · inflação e atividade', 'url': 'https://www.ibge.gov.br/calendario-de-divulgacao.html'},
    {'name': 'Banco Central · Copom', 'url': 'https://www.bcb.gov.br/controleinflacao/calendariocopom'},
    {'name': 'Federal Reserve · FOMC', 'url': 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm'},
    {'name': 'BLS · inflação e emprego nos EUA', 'url': 'https://www.bls.gov/schedule/'},
]
TOPICS = [
    {'name': 'Eleições e política', 'pattern': r'eleiç|eleitor|presidente|campanha|debate|pesquisa|votaç|mandato|congresso|senado|câmara|supremo|\bstf\b|election|vote|ballot|trump|\bgop\b|democrat|midterm|congress',
     'context': 'Disputas e decisões políticas influenciam câmbio, juros futuros e apetite por risco. Sondagens medem intenção, não resultado; mercados reagem à diferença entre o esperado e o confirmado.',
     'question': 'O que já estava no preço e o que a notícia muda no cenário eleitoral ou na agenda do governo?'},
    {'name': 'Juros e inflação', 'pattern': r'interest rate|inflation|central bank|federal reserve|\bfed\b|\bjuros\b|infla|selic|copom|\bcpi\b|\bipca\b',
     'context': 'Juros alteram o custo do crédito e a taxa usada para avaliar investimentos. Inflação e expectativas influenciam decisões dos bancos centrais; a reação dos ativos depende do que já estava nos preços.',
     'question': 'O dado mudou a expectativa para os próximos juros ou apenas confirmou o esperado?'},
    {'name': 'Energia e commodities', 'pattern': r'\boil\b|brent|energy|gas |petrol|energia|commodit|\bgold\b|\bouro\b|petróleo|minério|soja\b',
     'context': 'Energia e matérias-primas entram nos custos de transporte e produção. Choques de oferta podem afetar a inflação e a renda de países exportadores e importadores de maneiras diferentes.',
     'question': 'A mudança vem da oferta, da demanda ou do risco de interrupção?'},
    {'name': 'Comércio e geopolítica', 'pattern': r'tariff|trade|sanction|war\b|ukrain|russia|iran|china|guerra|comércio|tarifa|sanções',
     'context': 'Conflitos e barreiras comerciais podem alterar cadeias de suprimentos, fretes e fluxos de capital. Um risco político só se traduz em efeito econômico conforme sua duração, escala e exposição dos países.',
     'question': 'Qual é o canal econômico concreto: energia, comércio, moeda ou financiamento?'},
    {'name': 'Fiscal e atividade', 'pattern': r'budget|debt|fiscal|gdp|growth|tax|econom|orçamento|dívida|arrecada|pib|emprego|jobs|unemployment',
     'context': 'Atividade e contas públicas influenciam arrecadação, demanda por crédito e percepção de risco. Compare valores reais e nominais, o período de referência e revisões antes de concluir uma tendência.',
     'question': 'O movimento é pontual ou aparece em uma série de dados comparáveis?'},
    {'name': 'Empresas e mercados', 'pattern': r'earnings|stock|market|bank|merger|tesla|bolsa|empresa|banco|lucro|finance|crédito|ibovespa|ações|investidor',
     'context': 'Resultados, condições de financiamento e expectativas mudam a avaliação de empresas. Alta de uma ação não prova melhora estrutural; confronte a manchete com lucros, dívida e geração de caixa.',
     'question': 'O que mudou nos resultados ou nas expectativas, e em qual horizonte?'},
]
SERIES = [
    ('Selic meta', 432, '% a.a.'),
    ('Dólar PTAX · venda', 1, 'R$ / US$'),
    ('IPCA · mensal', 433, '% no mês'),
    ('IPCA · 12 meses', 13522, '% em 12 meses'),
]
MARKET_ASSETS = [
    ('^BVSP', 'Ibovespa', 'pts', 'B3 · Brasil'),
    ('BRL=X', 'Dólar comercial', 'R$', 'Câmbio · Brasil'),
    ('EURBRL=X', 'Euro', 'R$', 'Câmbio · Brasil'),
    ('^GSPC', 'S&P 500', 'pts', 'Wall Street · EUA'),
    ('^IXIC', 'Nasdaq', 'pts', 'Tecnologia · EUA'),
    ('BTC-USD', 'Bitcoin', 'US$', 'Cripto · global'),
    ('GC=F', 'Ouro', 'US$/oz', 'Commodity · global'),
    ('CL=F', 'Petróleo WTI', 'US$/barril', 'Commodity · global'),
]
# symbol -> (mercado no scanner TradingView, ticker)
TV_SYMBOLS = {
    '^BVSP': ('brazil', 'BMFBOVESPA:IBOV'),
    'BRL=X': ('forex', 'FX_IDC:USDBRL'),
    'EURBRL=X': ('forex', 'FX_IDC:EURBRL'),
    '^GSPC': ('cfd', 'SP:SPX'),
    '^IXIC': ('america', 'NASDAQ:NDX'),
    'BTC-USD': ('crypto', 'COINBASE:BTCUSD'),
    'GC=F': ('cfd', 'TVC:GOLD'),
    'CL=F': ('futures', 'NYMEX:CL1!'),
}
TV_COLUMNS = ['Recommend.All', 'Recommend.MA', 'Recommend.Other', 'RSI', 'EMA50', 'EMA200', 'Volatility.D']
FOCUS_INDICATORS = ['Câmbio', 'Selic', 'IPCA', 'PIB Total']
# Painel do governo: séries mensais do SGS. (id, título, unidade, nota, modo)
GOV_CHARTS = [
    ('selic', 'Taxa Selic', '% a.a.', 'Juros básicos definidos pelo Copom — o preço do dinheiro no Brasil.', 'line', 432, 800),
    ('ipca12', 'IPCA · 12 meses', '%', 'Inflação oficial acumulada — a meta do regime é ~3% com banda de 1,5 p.p.', 'line', 13522, 72),
    ('ipca', 'IPCA · no mês', '%', 'Variação mensal da inflação oficial (IBGE).', 'bars', 433, 36),
    ('divida', 'Dívida pública', '% do PIB', 'Dívida bruta e líquida — quanto o Estado deve em relação ao tamanho da economia.', 'multi', None, None),
    ('desemprego', 'Desemprego', '%', 'Taxa de desocupação da PNAD Contínua (IBGE).', 'line', 24369, 48),
]
GOV_DIVIDA_SERIES = [('bruta', 'Dívida bruta (governo geral)', 13762), ('liquida', 'Dívida líquida (setor público)', 4503)]
# Fallback SIDRA (IBGE) quando o SGS está instável: card -> (tabela, variável)
GOV_SIDRA = {'ipca': (1737, 63), 'ipca12': (1737, 2265), 'desemprego': (6381, 4099)}
TESOURO_ENDPOINTS = [
    ('resultado_primario', 'Resultado primário acumulado', 'Governo gasta acima do que arrecada quando negativo'),
    ('receita_primaria_liquida', 'Receita primária líquida', 'O que entra no caixa, sem juros'),
    ('despesa_primaria_total', 'Despesa primária total', 'O que sai do caixa, sem juros'),
]
ELECTION_MARKERS = [
    {'date': '2026-10-04', 'label': '1º turno'},
    {'date': '2026-10-25', 'label': '2º turno'},
]


def request(url, timeout=20):
    req = urllib.request.Request(url, headers={'User-Agent': 'Meridiano/1.0 RSS reader'})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        data = response.read()
    if data[:2] == b'\x1f\x8b':
        data = gzip.decompress(data)
    return data


def clean_feed_text(value=''):
    text = str(value or '')
    for _ in range(8):
        decoded = re.sub(r'<!\[CDATA\[([\s\S]*?)\]\]>', r'\1', text, flags=re.I)
        decoded = html.unescape(decoded)
        if decoded == text:
            break
        text = decoded
    text = re.sub(r'<(script|style)\b[^>]*>[\s\S]*?</\1\s*>', ' ', text, flags=re.I)
    text = re.sub(r'<!--[\s\S]*?(?:-->|$)', ' ', text)
    text = re.sub(r'</?[a-z](?:"[^"]*"|\'[^\']*\'|"[^"]*$|\'[^\']*$|[^>"\'])*(?:>|$)', ' ', text, flags=re.I)
    return re.sub(r'\s+', ' ', text).strip()


def canonical(url):
    parts = urllib.parse.urlsplit(url)
    params = [(k, v) for k, v in urllib.parse.parse_qsl(parts.query) if not re.match(r'^(utm_|at_|fbclid|gclid)', k)]
    return urllib.parse.urlunsplit((parts.scheme, parts.netloc, parts.path, urllib.parse.urlencode(params), ''))


def words(text):
    normalized = re.sub(r'[̀-ͯ]', '', text.lower().encode('ascii', 'ignore').decode() or text.lower())
    return {w for w in re.findall(r'[a-z0-9]{4,}', normalized)}


def similar(a, b):
    x, y = words(a), words(b)
    return len(x) > 2 and len(y) > 2 and len(x & y) / min(len(x), len(y)) > 0.72


def parse_items(data):
    root = ET.fromstring(data)
    items = root.findall('.//item')
    if items:
        for item in items:
            yield {
                'title': item.findtext('title', ''),
                'link': item.findtext('link', ''),
                'pubDate': item.findtext('pubDate', ''),
                'description': item.findtext('description', ''),
            }
        return
    ns = {'a': 'http://www.w3.org/2005/Atom'}
    for entry in root.findall('.//a:entry', ns):
        link = next((l.get('href', '') for l in entry.findall('a:link', ns) if l.get('rel', 'alternate') == 'alternate'), '')
        yield {
            'title': entry.findtext('a:title', '', ns),
            'link': link,
            'pubDate': entry.findtext('a:published', '', ns) or entry.findtext('a:updated', '', ns),
            'description': entry.findtext('a:summary', '', ns) or entry.findtext('a:content', '', ns),
        }


def parse_date(value):
    try:
        return email.utils.parsedate_to_datetime(value).astimezone(dt.timezone.utc).isoformat()
    except (ValueError, TypeError):
        pass
    try:
        return dt.datetime.fromisoformat(value.replace('Z', '+00:00')).astimezone(dt.timezone.utc).isoformat()
    except (ValueError, TypeError):
        return ''


def collect(feed):
    category, source, url, language = feed
    data = request(url, timeout=30)
    result = []
    for raw in list(parse_items(data))[:ITEMS_PER_FEED]:
        title = clean_feed_text(raw['title'])
        link = canonical(raw['link'].strip())
        published = parse_date(raw['pubDate'].strip())
        if not title or not link.startswith('https://') or not published:
            continue
        description = re.sub(r'\s*The post\s.+?$', '', clean_feed_text(raw['description'])).strip()
        description = ' '.join(description.split()[:30])
        result.append({'title': title, 'titleOriginal': title, 'url': link, 'category': category,
                       'source': source, 'publishedAt': published, 'language': language,
                       'description': description})
    return result


def topic_for(text):
    for topic in TOPICS:
        if re.search(topic['pattern'], text, re.I):
            return topic
    return TOPICS[4]  # Fiscal e atividade


def any_topic(text):
    return any(re.search(t['pattern'], text, re.I) for t in TOPICS)


def rank(article, now):
    topic_boost = 30 if any_topic(article['titleOriginal']) else 0
    age = max(0, (now - dt.datetime.fromisoformat(article['publishedAt']).timestamp()) / 3600)
    return topic_boost + (7 if article['category'] == 'Brasil' else 0) + max(0, 24 - age) / 2


def curate(rows, now):
    selected, counts = [], {}
    for article in sorted(rows, key=lambda a: rank(a, now), reverse=True):
        if article['category'] == 'Geopolítica' and not re.search(r'war|sanction|tariff|trade|military|nuclear|iran|china|russia|ukrain|oil|energy|election|president|econom', article['titleOriginal'], re.I):
            continue
        published = dt.datetime.fromisoformat(article['publishedAt']).timestamp()
        if published < now - 7 * 86400 or published > now + 300:
            continue
        if counts.get(article['category'], 0) >= PER_CATEGORY_CAP:
            continue
        if any(other['url'] == article['url'] or similar(other['titleOriginal'], article['titleOriginal']) for other in selected):
            continue
        selected.append(article)
        counts[article['category']] = counts.get(article['category'], 0) + 1
        if len(selected) == TOTAL_CAP:
            break
    return selected


def google_translate(text):
    url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=pt-BR&dt=t&q=' + urllib.parse.quote(text)
    data = json.loads(request(url, timeout=12).decode('utf-8'))
    result = ''.join(part[0] or '' for part in (data[0] or [])).strip()
    if not result:
        raise ValueError('Resposta vazia do tradutor')
    return result


def mymemory_translate(text):
    if len(text.encode('utf-8')) > 500:
        raise ValueError('Limite do tradutor alternativo')
    url = 'https://api.mymemory.translated.net/get?langpair=en%7Cpt-BR&q=' + urllib.parse.quote(text)
    data = json.loads(request(url, timeout=12).decode('utf-8'))
    if data.get('responseStatus') != 200 or not data.get('responseData', {}).get('translatedText') or data.get('quotaFinished'):
        raise ValueError('Tradutor alternativo indisponível')
    return clean_feed_text(data['responseData']['translatedText'])


def translate(article, previous):
    if article['language'] == 'pt':
        return {**article, 'translationStatus': 'original', 'summary': article['description'] or article['title']}
    if (previous and previous.get('translationStatus') == 'translated'
            and previous.get('titleOriginal') == article['titleOriginal']
            and previous.get('description') == article['description']):
        return {**article, 'title': previous['title'], 'summary': previous['summary'], 'translationStatus': 'translated'}
    try:
        text = google_translate(article['titleOriginal'] + '\n' + (article['description'] or article['titleOriginal']))
        title, _, remainder = text.partition('\n')
        summary = remainder.strip()
        if not summary:  # Some translations collapse the line break; translate the fields separately.
            title, summary = google_translate(article['titleOriginal']), google_translate(article['description'] or article['titleOriginal'])
        return {**article, 'title': title.strip(), 'summary': summary, 'translationStatus': 'translated'}
    except Exception:
        try:
            return {**article,
                    'title': mymemory_translate(article['titleOriginal']),
                    'summary': mymemory_translate(article['description'] or article['titleOriginal']),
                    'translationStatus': 'translated', 'translationProvider': 'MyMemory'}
        except Exception:
            return {**article, 'summary': 'Tradução indisponível nesta coleta. Consulte a matéria original.',
                    'translationStatus': 'unavailable'}


def valid_observation(row, now):
    if not isinstance(row, dict) or not re.match(r'^\d{2}/\d{2}/\d{4}$', str(row.get('data', ''))):
        return False
    try:
        value = float(str(row.get('valor', '')).replace(',', '.'))
        day, month, year = map(int, row['data'].split('/'))
        date = dt.datetime(year, month, day, tzinfo=dt.timezone.utc)
    except (ValueError, TypeError):
        return False
    return date.timestamp() <= now


def indicators(previous):
    now = dt.datetime.now(dt.timezone.utc).timestamp()
    def fetch_series(series):
        name, code, unit = series
        url = f'https://api.bcb.gov.br/dados/serie/bcdata.sgs.{code}/dados/ultimos/10?formato=json'
        try:
            rows = json.loads(request(url, timeout=15).decode('utf-8'))
            valid = [r for r in rows if valid_observation(r, now)]
            if not valid:
                raise ValueError('Valor inválido')
            row = sorted(valid, key=lambda r: r['data'].split('/')[::-1])[-1]
            return {'name': name, 'unit': unit, 'value': float(str(row['valor']).replace(',', '.')),
                    'referenceDate': row['data'], 'source': 'Banco Central · SGS', 'url': url,
                    'checkedAt': dt.datetime.now(dt.timezone.utc).isoformat(), 'status': 'ok'}
        except Exception:
            old = next((x for x in previous if x.get('name') == name and valid_observation({'data': x.get('referenceDate'), 'valor': x.get('value')}, now)), None)
            return {**old, 'status': 'cached'} if old else {'name': name, 'unit': unit, 'status': 'unavailable', 'source': 'Banco Central · SGS', 'url': url}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        return list(pool.map(fetch_series, SERIES))


def change_since(series, boundary):
    base = next((p for p in reversed(series) if p['date'] <= boundary), None)
    last = series[-1]['value'] if series else None
    if not base or not last or not base['value']:
        return None
    return round((last / base['value'] - 1) * 100, 2)


def market_series(asset):
    symbol, name, unit, board = asset
    url = f'https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(symbol, safe="")}?range=3mo&interval=1d'
    data = json.loads(request(url, timeout=15).decode('utf-8'))
    result = (data.get('chart', {}).get('result') or [None])[0]
    if not result:
        raise ValueError('Resposta vazia')
    timestamps = result.get('timestamp') or []
    closes = ((result.get('indicators', {}).get('quote') or [{}])[0]).get('close') or []
    by_date = {}
    for ts, close in zip(timestamps, closes):
        if close is None:
            continue
        by_date[dt.datetime.fromtimestamp(ts, TIMEZONE).date().isoformat()] = round(float(close), 4)
    series = [{'date': d, 'value': by_date[d]} for d in sorted(by_date)]
    if len(series) < 5:
        raise ValueError('Série insuficiente')
    return {'symbol': symbol, 'name': name, 'unit': unit, 'board': board, 'series': series,
            'last': series[-1]['value'], 'lastDate': series[-1]['date'],
            'changeFirstRound': change_since(series, ELECTION_MARKERS[0]['date']),
            'changeSecondRound': change_since(series, ELECTION_MARKERS[1]['date']),
            'change30d': change_since(series, (dt.datetime.now(TIMEZONE).date() - dt.timedelta(days=30)).isoformat()),
            'source': 'Yahoo Finance', 'status': 'ok'}


def tv_signals():
    """Termômetro técnico do scanner público do TradingView, por mercado."""
    grouped = {}
    for symbol, (market, ticker) in TV_SYMBOLS.items():
        grouped.setdefault(market, []).append((symbol, ticker))
    signals = {}
    def scan(item):
        market, pairs = item
        payload = json.dumps({'symbols': {'tickers': [t for _, t in pairs], 'query': {'types': []}},
                              'columns': TV_COLUMNS}).encode()
        req = urllib.request.Request(f'https://scanner.tradingview.com/{market}/scan', data=payload,
                                     headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as response:
            data = json.loads(response.read())
        result = {}
        for row in data.get('data', []):
            symbol = next((s for s, t in pairs if row['s'] == t), None)
            if symbol:
                d = row['d']
                result[symbol] = {'rating': d[0], 'ratingMA': d[1], 'ratingOsc': d[2], 'rsi': d[3],
                                  'ema50': d[4], 'ema200': d[5], 'volatility': d[6], 'source': 'TradingView'}
        return result
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        for result in pool.map(scan, grouped.items()):
            signals.update(result)
    return signals


def focus_expectations():
    """Consenso do Boletim Focus (Banco Central): mediana das instituições para o ano corrente."""
    year = str(dt.datetime.now(TIMEZONE).year)
    base = 'https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/ExpectativasMercadoAnuais'
    rows = []
    for indicator in FOCUS_INDICATORS:
        query = urllib.parse.urlencode({'$filter': f"Indicador eq '{indicator}'", '$top': '20',
                                        '$orderby': 'Data desc', '$format': 'json'}, quote_via=urllib.parse.quote)
        try:
            data = json.loads(request(base + '?' + query, timeout=15).decode('utf-8'))
            latest = next((r for r in data.get('value', []) if r.get('DataReferencia') == year), None)
            if latest:
                rows.append({'indicator': indicator, 'year': int(latest['DataReferencia']),
                             'median': latest['Mediana'], 'date': latest['Data'],
                             'respondents': latest.get('numeroRespondentes')})
        except Exception as error:
            print(f'Focus indisponível: {indicator}: {type(error).__name__}')
    return {'items': rows, 'source': 'Banco Central · Boletim Focus',
            'url': 'https://www.bcb.gov.br/publicacoes/focus'}


def sgs_series(code, count):
    """Últimos `count` pontos de uma série SGS, normalizados para {date, value}."""
    url = f'https://api.bcb.gov.br/dados/serie/bcdata.sgs.{code}/dados/ultimos/{count}?formato=json'
    rows = None
    for attempt, wait in enumerate((0, 8, 20, 35, 50)):
        if wait:
            time.sleep(wait)
        try:
            rows = json.loads(request(url, timeout=60).decode('utf-8'))
            break
        except Exception:
            if attempt == 4:
                raise
    points = []
    for row in rows or []:
        try:
            day, month, year = row['data'].split('/')
            points.append({'date': f'{year}-{month}-{day}', 'value': float(row['valor'])})
        except (KeyError, ValueError):
            continue
    return points


def sidra_series(table, var, count):
    """Série mensal do SIDRA/IBGE (mesma família de dados do SGS para IPCA e PNAD)."""
    url = f'https://apisidra.ibge.gov.br/values/t/{table}/n1/all/v/{var}/p/last%20{count}/d/v{var}%202'
    rows = json.loads(request(url, timeout=30).decode('utf-8'))
    points = []
    for row in rows:
        try:
            yyyymm = row['D3C']
            points.append({'date': f'{yyyymm[:4]}-{yyyymm[4:]}-01', 'value': float(row['V'])})
        except (KeyError, ValueError):
            continue
    return points


def monthlyize(points):
    """Uma entrada por mês (a última do mês) — a Selic vem em granularidade diária."""
    by_month = {}
    for p in points:
        by_month[p['date'][:7]] = p
    return list(by_month.values())


def gov_panel():
    """Coleta as séries fiscais/macro para a página As contas do governo."""
    charts = []
    for cid, title, unit, note, mode, code, count in GOV_CHARTS:
        card = {'id': cid, 'title': title, 'unit': unit, 'note': note, 'mode': mode}
        try:
            if mode == 'multi':
                card['lines'] = [{'key': key, 'label': label, 'series': monthlyize(sgs_series(sid, 72))}
                                 for key, label, sid in GOV_DIVIDA_SERIES]
                card['lines'] = [l for l in card['lines'] if l['series']]
                if not card['lines']:
                    raise ValueError('sem dados')
            else:
                series, card['source'] = monthlyize(sgs_series(code, count)), 'Banco Central · SGS'
                if not series:
                    raise ValueError('sem dados')
                card['series'] = series
            card['status'] = 'ok'
            card['source'] = 'Banco Central · SGS'
            card['status'] = 'ok'
        except Exception as error:
            fb = GOV_SIDRA.get(cid)
            if fb and mode != 'multi':
                try:
                    series = sidra_series(fb[0], fb[1], 72)
                    if series:
                        card['series'], card['source'], card['status'] = series, 'IBGE · SIDRA', 'ok'
                        charts.append(card)
                        time.sleep(4)
                        continue
                except Exception:
                    pass
            card['status'] = 'unavailable'
            print(f'Série do governo indisponível: {title}: {type(error).__name__}')
        charts.append(card)
        time.sleep(4)  # o SGS limita requisições rápidas em sequência
    tesouro = []
    for endpoint, label, hint in TESOURO_ENDPOINTS:
        try:
            req = urllib.request.Request(f'https://grandesnumeros.tesouro.gov.br/{endpoint}',
                                         headers={'User-Agent': 'Meridiano/1.0'})
            data = json.loads(urllib.request.urlopen(req, timeout=20).read())
            value = data.get('num') or data.get('valor')
            if value:
                tesouro.append({'label': label, 'value': value, 'hint': hint})
        except Exception:
            pass
    return {'updatedAt': dt.datetime.now(dt.timezone.utc).isoformat(), 'charts': charts,
            'tesouro': tesouro,
            'sources': [['Banco Central · SGS', 'https://www.bcb.gov.br/estatisticas/series-temporais'],
                        ['IBGE · IPCA', 'https://www.ibge.gov.br/estatisticas/economicas/precos-e-custos/9256-indice-nacional-de-precos-ao-consumidor-amplo.html'],
                        ['IBGE · PNAD', 'https://www.ibge.gov.br/estatisticas/sociais/trabalho/9171-pesquisa-nacional-por-amostra-de-domicilios-continua-mensal.html'],
                        ['Tesouro Nacional', 'https://www.tesourotransparente.gov.br/ckan/dataset/resultado-do-tesouro-nacional']],
            'method': 'Séries oficiais do Banco Central (SGS), IBGE e Tesouro Nacional, atualizadas na coleta de 15 em 15 minutos. A maioria dos dados fiscais e de inflação é publicada mensalmente — cada gráfico mostra o mês de referência.'}


def markets(previous, previous_focus):
    def fetch(asset):
        try:
            return market_series(asset)
        except Exception as error:
            old = next((a for a in previous if a.get('symbol') == asset[0] and len(a.get('series', [])) >= 5), None)
            print(f'Mercado indisponível: {asset[1]}: {type(error).__name__}')
            return {**old, 'status': 'cached'} if old else {'symbol': asset[0], 'name': asset[1], 'unit': asset[2], 'board': asset[3], 'series': [], 'status': 'unavailable', 'source': 'Yahoo Finance'}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        assets = list(pool.map(fetch, MARKET_ASSETS))
    try:
        signals = tv_signals()
    except Exception:
        signals = {}
    for asset in assets:
        if asset['symbol'] in signals:
            asset['signals'] = signals[asset['symbol']]
        else:
            old = next((a for a in previous if a.get('symbol') == asset['symbol']), None)
            if old and old.get('signals'):
                asset['signals'] = {**old['signals'], 'stale': True}
    try:
        focus = focus_expectations()
        if not focus['items']:
            raise ValueError('Focus vazio')
    except Exception:
        focus = previous_focus or {'items': [], 'source': 'Banco Central · Boletim Focus', 'url': 'https://www.bcb.gov.br/publicacoes/focus'}
    return {'updatedAt': dt.datetime.now(dt.timezone.utc).isoformat(), 'elections': ELECTION_MARKERS,
            'assets': assets, 'focus': focus,
            'method': 'Fechamentos diários via Yahoo Finance (3 meses). Variações comparam o último fechamento com o último pregão anterior a cada turno. Termômetro técnico e médias: scanner público TradingView. Expectativas de analistas: Boletim Focus do Banco Central. A projeção tracejada é apenas a tendência linear dos últimos 10 fechamentos — ilustrativa, não é recomendação de investimento.'}


def event_ts(value):
    try:
        if len(str(value)) == 10:
            return dt.datetime.fromisoformat(value + 'T23:59:59-03:00').timestamp()
        return dt.datetime.fromisoformat(str(value).replace('Z', '+00:00')).timestamp()
    except (ValueError, TypeError):
        return 0


def calendar(previous_events):
    verified = json.loads((ROOT / 'lib/calendar-verified.json').read_text(encoding='utf-8'))
    now = dt.datetime.now(dt.timezone.utc).timestamp()
    events = [e for e in verified if event_ts(e['at']) > now]
    warnings = []
    try:
        ics = request('https://www.bls.gov/schedule/news_release/bls.ics', timeout=15).decode('utf-8')
        titles = {'Consumer Price Index': 'Inflação ao consumidor (CPI) · EUA', 'Employment Situation': 'Emprego e desemprego (Payroll) · EUA',
                  'Producer Price Index': 'Inflação ao produtor (PPI) · EUA', 'Job Openings and Labor Turnover': 'Vagas de emprego (JOLTS) · EUA'}
        for block in re.sub(r'\r?\n[ \t]', '', ics).split('BEGIN:VEVENT')[1:]:
            name = (re.search(r'SUMMARY:(.*)', block) or [None, ''])[1].strip()
            title = next((titles[k] for k in titles if name.startswith(k)), None)
            match = re.search(r'DTSTART([^:]*):(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)', block)
            if not title or not match:
                continue
            iso = f'{match[2]}-{match[3]}-{match[4]}T{match[5]}:{match[6]}:{match[7]}'
            if match[8]:
                at = dt.datetime.fromisoformat(iso + '+00:00')
            elif re.search(r'TZID=America/New_York|TZID=US/Eastern', match[1]):
                # US Eastern: EDT (-4) roughly Mar–Nov, EST (-5) otherwise; derive from event month.
                offset = -4 if int(match[3]) in range(4, 11) else -5
                at = dt.datetime.fromisoformat(iso).replace(tzinfo=dt.timezone(dt.timedelta(hours=offset)))
            else:
                continue
            if now < at.timestamp() < now + 90 * 86400:
                events.append({'title': title, 'at': at.isoformat(), 'source': 'BLS', 'url': 'https://www.bls.gov/schedule/', 'kind': 'timed'})
    except Exception:
        warnings.append('BLS')
        events += [e for e in previous_events if e.get('source') == 'BLS' and event_ts(e['at']) > now]
    try:
        page = request('https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm', timeout=15).decode('utf-8')
        months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
        today = dt.datetime.now(dt.timezone.utc).date().isoformat()
        for section in re.split(r'<h4[^>]*>', page)[1:]:
            year_match = re.search(r'(20\d{2}) FOMC Meetings', section)
            if not year_match:
                continue
            for m in re.finditer(r'fomc-meeting__month[^>]*>([\s\S]*?)</div>[\s\S]*?fomc-meeting__date[^>]*>([\s\S]*?)</div>', section):
                month_text = clean_feed_text(m[1]).split('/')[-1]
                day_text = clean_feed_text(m[2]).replace('*', '').split('-')[-1]
                month = months.index(month_text) + 1 if month_text in months else 0
                if not month or not day_text.isdigit():
                    continue
                at = f'{year_match[1]}-{month:02d}-{int(day_text):02d}'
                if at >= today and dt.datetime.fromisoformat(at).timestamp() < now + 180 * 86400:
                    events.append({'title': 'Decisão de juros · Federal Reserve', 'at': at, 'source': 'Federal Reserve', 'url': CALENDAR_SOURCES[2]['url'], 'kind': 'date'})
    except Exception:
        warnings.append('Federal Reserve')
        events += [e for e in previous_events if e.get('source') == 'Federal Reserve' and event_ts(e['at']) > now]
    unique = {(e['title'], e['at']): e for e in events}
    return {'events': sorted(unique.values(), key=lambda e: e['at'])[:14], 'warnings': warnings,
            'sources': CALENDAR_SOURCES, 'checkedAt': dt.datetime.now(dt.timezone.utc).isoformat()}


def main():
    target = ROOT / 'public/news.json'
    history_file = ROOT / 'public/history.json'
    editions_dir = ROOT / 'public/editions'
    previous = json.loads(target.read_text(encoding='utf-8')) if target.exists() else {'articles': [], 'indicators': [], 'calendar': {'events': []}}
    previous_by_url = {a['url']: a for a in previous.get('articles', [])}
    now = dt.datetime.now(dt.timezone.utc).timestamp()
    articles, failures = [], []
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        jobs = {pool.submit(collect, feed): feed for feed in FEEDS}
        for future, feed in jobs.items():
            category = feed[0]
            try:
                rows = future.result()
                if not rows:
                    raise ValueError('Feed sem notícias válidas')
                articles.extend(rows)
            except Exception as error:
                failures.append(category)
                print(f'Feed indisponível: {category} ({feed[1]}): {type(error).__name__}')
                articles.extend(a for a in previous['articles'] if a['category'] == category and a['source'] == feed[1])
    if len(failures) == len(FEEDS):
        raise SystemExit('Nenhum feed atualizado; edição anterior preservada.')
    selected = curate(articles, now)
    if not selected:
        raise SystemExit('Nenhuma notícia recente após curadoria.')
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        translated = list(pool.map(lambda a: translate(a, previous_by_url.get(a['url'])), selected))
    for article in translated:
        topic = topic_for(article['titleOriginal'])
        article['topic'] = topic['name']
        article['context'] = topic['context']
        article['question'] = topic['question']
        article['score'] = round(rank(article, now), 2)
    translated.sort(key=lambda a: a['publishedAt'], reverse=True)
    top, seen = [], set()
    for article in translated:
        if article['topic'] not in seen:
            top.append(article)
            seen.add(article['topic'])
            if len(top) == 5:
                break
    for article in translated:
        if len(top) == 5:
            break
        if all(article is not chosen for chosen in top):
            top.append(article)
    edition_id = dt.datetime.now(TIMEZONE).date().isoformat()
    output = {'updatedAt': dt.datetime.now(dt.timezone.utc).isoformat(), 'editionId': edition_id,
              'failedFeeds': sorted(set(failures)),
              'translationFailures': sum(1 for a in translated if a['translationStatus'] == 'unavailable'),
              'articles': translated, 'briefing': [a['url'] for a in top],
              'indicators': indicators(previous.get('indicators', [])),
              'calendar': calendar(previous.get('calendar', {}).get('events', [])),
              'method': 'Seleção automática por atualidade, relevância temática e diversidade; resumo extraído da descrição RSS, com tradução automática quando disponível. Contexto educativo por tema, sem previsão de preços.'}
    editions_dir.mkdir(parents=True, exist_ok=True)
    previous_markets, previous_focus = [], None
    markets_file = ROOT / 'public/markets.json'
    if markets_file.exists():
        previous_data = json.loads(markets_file.read_text(encoding='utf-8'))
        previous_markets = previous_data.get('assets', [])
        previous_focus = previous_data.get('focus')
    markets_file.write_text(json.dumps(markets(previous_markets, previous_focus), ensure_ascii=False, indent=2), encoding='utf-8')
    gov_file = ROOT / 'public/governo.json'
    previous_gov = json.loads(gov_file.read_text(encoding='utf-8')) if gov_file.exists() else {}
    fresh_gov = gov_panel()
    if previous_gov.get('charts'):
        fresh_ids = {c['id'] for c in fresh_gov['charts'] if c['status'] == 'ok'}
        for old in previous_gov['charts']:
            if old.get('id') not in fresh_ids and old.get('status') == 'ok':
                old['status'] = 'cached'
                fresh_gov['charts'].append(old)
        fresh_gov['charts'].sort(key=lambda c: next((i for i, g in enumerate(GOV_CHARTS) if g[0] == c['id']), 99))
    if not fresh_gov['tesouro'] and previous_gov.get('tesouro'):
        fresh_gov['tesouro'] = previous_gov['tesouro']
    gov_file.write_text(json.dumps(fresh_gov, ensure_ascii=False, indent=2), encoding='utf-8')
    payload = json.dumps(output, ensure_ascii=False, indent=2)
    target.write_text(payload, encoding='utf-8')
    (editions_dir / f'{edition_id}.json').write_text(payload, encoding='utf-8')
    previous_history = json.loads(history_file.read_text(encoding='utf-8')) if history_file.exists() else []
    history = [{'id': edition_id, 'updatedAt': output['updatedAt']}] + [row for row in previous_history if row.get('id') != edition_id]
    history_file.write_text(json.dumps(history[:30], ensure_ascii=False, indent=2), encoding='utf-8')
    print(f"{len(translated)} notícias; {output['translationFailures']} traduções indisponíveis; fontes falhas: {sorted(set(failures)) or 'nenhuma'}.")


if __name__ == '__main__':
    main()
