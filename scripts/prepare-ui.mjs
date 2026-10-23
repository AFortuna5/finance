import fs from 'node:fs';
const html=fs.readFileSync('public/index.html','utf8');
fs.writeFileSync('lib/journal-html.ts','export default '+JSON.stringify(html)+';\n');
