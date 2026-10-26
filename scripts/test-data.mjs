import assert from 'node:assert/strict';
import {validObservation,cleanFeedText} from '../public/feed-text.js';
const now=new Date('2026-10-23T12:00:00Z');
assert.equal(validObservation({data:'04/11/2026',valor:'13.75'},now),false,'Dados futuros não podem ser apresentados como atuais');
assert.equal(validObservation({data:'22/10/2026',valor:'5.03'},now),true);
for(const row of [{data:'31/02/2026',valor:'1'},{data:'22/10/2026',valor:''},{data:'22/10/2026',valor:null},{data:'22/10/2026',valor:'NaN'}])assert.equal(validObservation(row,now),false);
console.log('Validação de referências e valores: OK');
assert.equal(cleanFeedText('&lt;p&gt;&lt;img src="x"&gt;&lt;strong&gt;Economia cresce&lt;/strong&gt;&lt;/p&gt;'),'Economia cresce');
assert.equal(cleanFeedText('<![CDATA[<p>Juros &amp; inflação</p>]]>'),'Juros & inflação');
const broken='<p><p style="text-align:center;"><a href="https://example.com"><img src="logo.svg" alt="Logo Agência Brasil"></a></p><strong>A arrecadação das receitas federais</strong> somou R$ 239,4 bilhões <a href="';
const expected='A arrecadação das receitas federais somou R$ 239,4 bilhões';
assert.equal(cleanFeedText(broken),expected,'Remove tags completas e atributos truncados do exemplo da tela');
let encoded=broken;
for(let i=0;i<4;i++){encoded=encoded.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');assert.equal(cleanFeedText(encoded),expected);}
assert.equal(cleanFeedText('&#x3c;p&#x3e;Economia&#x3c;/p&#x3e;'),'Economia');
assert.equal(cleanFeedText('<script>alert(1)</script><style>p{color:red}</style><p>Texto</p>'),'Texto');
assert.equal(cleanFeedText('Inflação < 5% & juros > 2%'),'Inflação < 5% & juros > 2%');
const {cleanEdition}=await import('../public/feed-text.js');
const legacy={articles:[{summary:broken,description:encoded,url:'https://example.com'}],editionId:'2026-10-22'};
assert.equal(cleanEdition(legacy).articles[0].summary,expected,'Edições antigas recebem a mesma correção');
assert.equal(legacy.articles[0].summary,broken,'Leitura não modifica o registro original');
console.log('Regressão de HTML bruto, escapado, truncado e histórico: OK');
// JSONs publicados precisam ser UTF-8 válido — um arquivo em cp1252 vira "?" no navegador.
import {readFileSync} from 'node:fs';
const utf8=new TextDecoder('utf-8',{fatal:true});
for(const file of ['news.json','markets.json','governo.json','history.json']){
  const raw=readFileSync(`public/${file}`);
  utf8.decode(raw);
  assert.doesNotMatch(utf8.decode(raw),/�/,`${file} contém caractere de substituição`);
}
console.log('Codificação UTF-8 dos JSONs publicados: OK');
