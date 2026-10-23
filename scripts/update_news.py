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
    target = ROOT / 'dist/news.json'
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
    output = {'updatedAt': dt.datetime.now(dt.timezone.utc).isoformat(), 'failedFeeds': failures,
              'articles': sorted(unique.values(), key=lambda a: a['publishedAt'], reverse=True)}
    target.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'{len(unique)} notícias; {len(failures)} fontes indisponíveis.')

if __name__ == '__main__':
    main()
