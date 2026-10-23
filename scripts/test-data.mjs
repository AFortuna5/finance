import assert from 'node:assert/strict';
import {validObservation,cleanFeedText} from '../lib/validation.ts';
const now=new Date('2026-10-23T12:00:00Z');
assert.equal(validObservation({data:'04/11/2026',valor:'13.75'},now),false,'Dados futuros não podem ser apresentados como atuais');
assert.equal(validObservation({data:'22/10/2026',valor:'5.03'},now),true);
for(const row of [{data:'31/02/2026',valor:'1'},{data:'22/10/2026',valor:''},{data:'22/10/2026',valor:null},{data:'22/10/2026',valor:'NaN'}])assert.equal(validObservation(row,now),false);
console.log('Validação de referências e valores: OK');
assert.equal(cleanFeedText('&lt;p&gt;&lt;img src="x"&gt;&lt;strong&gt;Economia cresce&lt;/strong&gt;&lt;/p&gt;'),'Economia cresce');
assert.equal(cleanFeedText('<![CDATA[<p>Juros &amp; inflação</p>]]>'),'Juros & inflação');
