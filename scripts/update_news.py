"""Collect public RSS headlines; no full articles or API keys required."""
import concurrent.futures
import datetime as dt
import email.utils
import html
import json
import pathlib
import re
import urllib.request
import xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parents[1]
FEEDS = {
    'Brasil': 'https://agenciabrasil.ebc.com.br/rss/economia/feed.xml',
    'Mundo': 'https://feeds.bbci.co.uk/news/business/rss.xml',
    'Geopolítica': 'https://feeds.bbci.co.uk/news/world/rss.xml',
    'Mercados': 'https://www.cnbc.com/id/100003114/device/rss/rss.html',
}

def collect(pair):
    category, url = pair
    request = urllib.request.Request(url, headers={'User-Agent': 'Meridiano/1.0 RSS reader'})
    with urllib.request.urlopen(request, timeout=30) as response:
        root = ET.fromstring(response.read())
    result = []
    for item in root.findall('.//item')[:18]:
        title, link = item.findtext('title', '').strip(), item.findtext('link', '').strip()
        if not title or not link.startswith('https://'):
            continue
        try:
            date = email.utils.parsedate_to_datetime(item.findtext('pubDate', '')).astimezone(dt.timezone.utc).isoformat()
        except (ValueError, TypeError):
            continue
        result.append({'title': html.unescape(title), 'url': link, 'category': category,
                       'source': {'Brasil': 'Agência Brasil', 'Mundo': 'BBC News', 'Geopolítica': 'BBC News', 'Mercados': 'CNBC'}[category],
                       'publishedAt': date, 'language': 'pt' if category == 'Brasil' else 'en'})
    return result

def main():
    target = ROOT / 'public/news.json'
    history_file = ROOT / 'public/history.json'
    editions_dir = ROOT / 'public/editions'
    previous = json.loads(target.read_text(encoding='utf-8')) if target.exists() else {'articles': []}
    articles, failures = [], []
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        jobs = {pool.submit(collect, pair): pair[0] for pair in FEEDS.items()}
        for future, category in jobs.items():
            try:
                rows = future.result()
                if not rows:
                    raise ValueError('Feed sem notícias válidas')
                articles.extend(rows)
            except Exception as error:
                failures.append(category)
                print(f'Feed indisponível: {category}: {type(error).__name__}')
                articles.extend(a for a in previous['articles'] if a['category'] == category)
    if len(failures) == len(FEEDS):
        raise SystemExit('Nenhum feed atualizado; edição anterior preservada.')
    unique = {a['url']: a for a in articles}
    selected = sorted(unique.values(), key=lambda a: a['publishedAt'], reverse=True)
    edition_id = dt.datetime.now(dt.timezone.utc).astimezone(dt.timezone(dt.timedelta(hours=-3))).date().isoformat()
    for article in selected:
        article['titleOriginal'] = article['title']
        article['description'] = article['title']
        article['summary'] = article['title']
        article['translationStatus'] = 'original' if article['language'] == 'pt' else 'unavailable'
        article['topic'] = {'Brasil': 'Fiscal e atividade', 'Mercados': 'Empresas e mercados', 'Mundo': 'Cenário internacional', 'Geopolítica': 'Comércio e geopolítica'}[article['category']]
        article['context'] = 'Contexto educativo para acompanhar os efeitos econômicos e financeiros do tema. Consulte a fonte para a cobertura completa.'
        article['question'] = 'O que mudou, quem é afetado e qual dado confirma esse movimento?'
    output = {'updatedAt': dt.datetime.now(dt.timezone.utc).isoformat(), 'editionId': edition_id,
              'failedFeeds': failures, 'translationFailures': sum(a['language'] == 'en' for a in selected),
              'articles': selected, 'briefing': [a['url'] for a in selected[:5]], 'indicators': [],
              'calendar': {'events': [], 'sources': [
                  {'name': 'Banco Central · Copom', 'url': 'https://www.bcb.gov.br/controleinflacao/calendariocopom'},
                  {'name': 'Federal Reserve · FOMC', 'url': 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm'},
                  {'name': 'IBGE · calendário', 'url': 'https://www.ibge.gov.br/calendario-de-divulgacao.html'}]},
              'method': 'Coleta automática de RSS; consulte sempre a fonte original.'}
    editions_dir.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding='utf-8')
    edition_target = editions_dir / f'{edition_id}.json'
    edition_target.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding='utf-8')
    previous_history = json.loads(history_file.read_text(encoding='utf-8')) if history_file.exists() else []
    history = [{'id': edition_id, 'updatedAt': output['updatedAt']}] + [row for row in previous_history if row.get('id') != edition_id]
    history_file.write_text(json.dumps(history[:30], ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'{len(unique)} notícias; {len(failures)} fontes indisponíveis.')

if __name__ == '__main__':
    main()
