// Shared by the collector, API and browser. Feed markup is always plain text.
export function cleanFeedText(value = '') {
  let text = String(value ?? '');
  const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  for (let pass = 0; pass < 8; pass++) {
    const decoded = text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
      .replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (match, entity) => {
        if (!entity.startsWith('#')) return entities[entity.toLowerCase()] ?? match;
        const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
        return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : '';
      });
    if (decoded === text) break;
    text = decoded;
  }
  return text.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<!--[\s\S]*?(?:-->|$)/g, ' ')
    .replace(/<\/?[a-z][^>]*(?:>|$)/gi, ' ')
    .replace(/\s+/g, ' ').trim();
}

export function cleanArticle(article) {
  const result = { ...article };
  for (const key of ['title', 'titleOriginal', 'description', 'summary', 'context', 'question']) {
    if (typeof result[key] === 'string') result[key] = cleanFeedText(result[key]);
  }
  return result;
}

export function cleanEdition(data) {
  return { ...data, articles: (data.articles || []).map(cleanArticle) };
}
