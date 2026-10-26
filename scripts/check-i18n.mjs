// Regressão do dicionário i18n: toda chave data-i18n* do HTML existe em i18n.js,
// e toda entrada tem pt+en. Roda no CI para impedir chave órfã.
import { readFileSync, readdirSync } from 'node:fs';

const dictSrc = readFileSync('public/i18n.js', 'utf-8');
const dictKeys = new Set([...dictSrc.matchAll(/'([\w.]+)':\s*\{pt:/g)].map(m => m[1]));
const missingEn = [...dictSrc.matchAll(/'([\w.]+)':\s*\{pt:[^}]*\}/g)]
  .filter(m => !m[0].includes('en:')).map(m => m[1]);
if (missingEn.length) { console.error('Entradas sem en:', missingEn); process.exit(1); }

const used = new Set();
for (const f of readdirSync('public').filter(f => f.endsWith('.html'))) {
  const html = readFileSync('public/' + f, 'utf-8');
  for (const m of html.matchAll(/data-i18n(?:-html|-ph|-aria)?="([^"]+)"/g)) used.add(m[1]);
}
const orphans = [...used].filter(k => !dictKeys.has(k));
if (orphans.length) { console.error('Chaves sem tradução:', orphans); process.exit(1); }
console.log(`Dicionário i18n: ${dictKeys.size} chaves, ${used.size} usadas no HTML — OK`);
