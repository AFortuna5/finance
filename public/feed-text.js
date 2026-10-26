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
    .replace(/<\/?[a-z](?:"[^"]*"|'[^']*'|"[^"]*$|'[^']*$|[^>"'])*(?:>|$)/gi, ' ')
    .replace(/\s+/g, ' ').trim();
}

export function cleanArticle(article) {
  const result = { ...article };
  for (const key of ['title', 'titleOriginal', 'description', 'summary', 'context', 'question', 'contextEn', 'questionEn', 'topicEn']) {
    if (typeof result[key] === 'string') result[key] = cleanFeedText(result[key]);
  }
  return result;
}

export function cleanEdition(data) {
  return { ...data, articles: (data.articles || []).map(cleanArticle) };
}

// Uma observação SGS só vale se a data é real, não futura, e o valor é número.
export function validObservation(row, now = new Date()) {
  if (typeof row?.data !== 'string' || !/^\d{2}\/\d{2}\/\d{4}$/.test(row.data) || row.valor == null || String(row.valor).trim() === '') return false;
  const [day, month, year] = row.data.split('/').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCDate() === day && date.getUTCMonth() === month - 1 && date.getUTCFullYear() === year && +date <= +now && Number.isFinite(Number(row.valor));
}
