"""Collect public RSS headlines; no full articles or API keys required."""
import concurrent.futures
import datetime as dt
import email.utils
import gzip
import html
import json
import pathlib
import re
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
    text = re.sub(r'</?[a-z](?:[^>"\']|"[^"]*"|\'[^\']*\')*(?:>|$)', ' ', text, flags=re.I)
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
    payload = json.dumps(output, ensure_ascii=False, indent=2)
    target.write_text(payload, encoding='utf-8')
    (editions_dir / f'{edition_id}.json').write_text(payload, encoding='utf-8')
    previous_history = json.loads(history_file.read_text(encoding='utf-8')) if history_file.exists() else []
    history = [{'id': edition_id, 'updatedAt': output['updatedAt']}] + [row for row in previous_history if row.get('id') != edition_id]
    history_file.write_text(json.dumps(history[:30], ensure_ascii=False, indent=2), encoding='utf-8')
    print(f"{len(translated)} notícias; {output['translationFailures']} traduções indisponíveis; fontes falhas: {sorted(set(failures)) or 'nenhuma'}.")


if __name__ == '__main__':
    main()
