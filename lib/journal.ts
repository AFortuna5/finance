import { env } from 'cloudflare:workers';
import seed from '../public/news.json';
import verifiedEvents from './calendar-verified.json';
import {validObservation,cleanFeedText} from './validation';
import {cleanEdition} from '../public/feed-text.js';

function database(){if(!env.DB)throw Error('Banco indisponível');return env.DB;}
const FEEDS = [
  ['Brasil','Agência Brasil','https://agenciabrasil.ebc.com.br/rss/economia/feed.xml','pt'],
  ['Mundo','BBC News','https://feeds.bbci.co.uk/news/business/rss.xml','en'],
  ['Geopolítica','BBC News','https://feeds.bbci.co.uk/news/world/rss.xml','en'],
  ['Mercados','CNBC','https://www.cnbc.com/id/100003114/device/rss/rss.html','en'],
];
export const calendarSources = [
  {name:'IBGE · inflação e atividade',url:'https://www.ibge.gov.br/calendario-de-divulgacao.html'},
  {name:'Banco Central · Copom',url:'https://www.bcb.gov.br/controleinflacao/calendariocopom'},
  {name:'Federal Reserve · FOMC',url:'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm'},
  {name:'BLS · inflação e emprego nos EUA',url:'https://www.bls.gov/schedule/'},
];
const topics = [
  {name:'Juros e inflação',pattern:/interest rate|inflation|central bank|federal reserve|\bfed\b|\bjuros\b|infla|selic|copom|\bcpi\b/i,context:'Juros alteram o custo do crédito e a taxa usada para avaliar investimentos. Inflação e expectativas influenciam decisões dos bancos centrais; a reação dos ativos depende do que já estava nos preços.',question:'O dado mudou a expectativa para os próximos juros ou apenas confirmou o esperado?'},
  {name:'Energia e commodities',pattern:/\boil\b|brent|energy|gas |petrol|energia|commodit|\bgold\b|\bouro\b/i,context:'Energia e matérias-primas entram nos custos de transporte e produção. Choques de oferta podem afetar a inflação e a renda de países exportadores e importadores de maneiras diferentes.',question:'A mudança vem da oferta, da demanda ou do risco de interrupção?'},
  {name:'Comércio e geopolítica',pattern:/tariff|trade|sanction|war\b|ukrain|russia|iran|china|guerra|comércio|tarifa|sanções/i,context:'Conflitos e barreiras comerciais podem alterar cadeias de suprimentos, fretes e fluxos de capital. Um risco político só se traduz em efeito econômico conforme sua duração, escala e exposição dos países.',question:'Qual é o canal econômico concreto: energia, comércio, moeda ou financiamento?'},
  {name:'Fiscal e atividade',pattern:/budget|debt|fiscal|gdp|growth|tax|econom|orçamento|dívida|arrecada|pib|emprego|jobs|unemployment/i,context:'Atividade e contas públicas influenciam arrecadação, demanda por crédito e percepção de risco. Compare valores reais e nominais, o período de referência e revisões antes de concluir uma tendência.',question:'O movimento é pontual ou aparece em uma série de dados comparáveis?'},
  {name:'Empresas e mercados',pattern:/earnings|stock|market|bank|merger|tesla|bolsa|empresa|banco|lucro|finance|crédito/i,context:'Resultados, condições de financiamento e expectativas mudam a avaliação de empresas. Alta de uma ação não prova melhora estrutural; confronte a manchete com lucros, dívida e geração de caixa.',question:'O que mudou nos resultados ou nas expectativas, e em qual horizonte?'},
];
export function topicFor(text:string){return topics.find(t=>t.pattern.test(text)) || topics[3];}
const plain=cleanFeedText;
function field(item:string,tag:string){return plain(item.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,'i'))?.[1]||'');}
async function request(url:string){const r=await fetch(url,{headers:{'User-Agent':'Meridiano personal news reader'},signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error(`HTTP ${r.status}`);return r;}
async function pool<T,R>(items:T[],fn:(a:T)=>Promise<R>,width=4){const result:R[]=new Array(items.length);let index=0;await Promise.all(Array.from({length:Math.min(width,items.length)},async()=>{while(index<items.length){const i=index++;result[i]=await fn(items[i]);}}));return result;}
export function canonical(url:string){const u=new URL(url);for(const key of [...u.searchParams.keys()])if(/^(utm_|at_|fbclid|gclid)/.test(key))u.searchParams.delete(key);u.hash='';return u.toString();}
export function similar(a:string,b:string){const words=(s:string)=>new Set(s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').match(/[a-z0-9]{4,}/g)||[]);const x=words(a),y=words(b);return x.size>2&&y.size>2&&[...x].filter(w=>y.has(w)).length/Math.min(x.size,y.size)>.72;}
async function feed([category,source,url,language]:string[]){const xml=await(await request(url)).text();return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].slice(0,18).map(match=>{
  const item=match[1],title=field(item,'title'),url=field(item,'link'),publishedAt=new Date(field(item,'pubDate'));
  const description=field(item,'description').split(/\s+/).slice(0,30).join(' ');
  return {title,titleOriginal:title,url:url.startsWith('https://')?canonical(url):'',publishedAt:Number.isNaN(+publishedAt)?'':publishedAt.toISOString(),category,source,language,description};
}).filter(a=>a.title&&a.url&&a.publishedAt);}
function rank(a:any){const text=a.titleOriginal;const topic=topics.find(t=>t.pattern.test(text));const age=Math.max(0,(Date.now()-Date.parse(a.publishedAt))/3600000);return (topic?30:0)+(a.category==='Brasil'?7:0)+Math.max(0,24-age)/2;}
export function curate(rows:any[]){const selected:any[]=[];const counts:Record<string,number>={};for(const a of rows.sort((a,b)=>rank(b)-rank(a))){if(a.category==='Geopolítica'&&!/war|sanction|tariff|trade|military|nuclear|iran|china|russia|ukrain|oil|energy|election|president|econom/i.test(a.titleOriginal))continue;if(Date.parse(a.publishedAt)<Date.now()-7*86400000||Date.parse(a.publishedAt)>Date.now()+300000)continue;if((counts[a.category]||0)>=7)continue;if(selected.some(b=>b.url===a.url||similar(b.titleOriginal,a.titleOriginal)))continue;selected.push({...a,score:rank(a)});counts[a.category]=(counts[a.category]||0)+1;if(selected.length===24)break;}return selected;}
async function translate(a:any,old:any){if(a.language==='pt')return {...a,translationStatus:'original',summary:a.description||a.title};if(old?.translationStatus==='translated'&&old.titleOriginal===a.titleOriginal&&old.description===a.description)return {...a,title:old.title,summary:old.summary,translationStatus:'translated'};
  const translateText=async(q:string)=>{const data=await(await request('https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=pt&dt=t&q='+encodeURIComponent(q))).json() as any;const text=data?.[0]?.map((p:any)=>p[0]||'').join('').trim();if(!text)throw Error('Resposta vazia do tradutor');return text as string;};
  try{const text=await translateText(a.titleOriginal+'\n'+(a.description||a.titleOriginal));let [title,...parts]=text.split('\n');let summary=parts.join(' ').trim();
    // Some translations collapse the line break. Retry the two fields separately.
    if(!summary){[title,summary]=await Promise.all([translateText(a.titleOriginal),translateText(a.description||a.titleOriginal)]);}
    return {...a,title,summary,translationStatus:'translated'};
  }catch{
    try{const fallback=async(q:string)=>{if(new TextEncoder().encode(q).length>500)throw Error('Limite do tradutor alternativo');const data=await(await request('https://api.mymemory.translated.net/get?langpair=en%7Cpt-BR&q='+encodeURIComponent(q))).json() as any;if(data.responseStatus!==200||!data.responseData?.translatedText||data.quotaFinished)throw Error('Tradutor alternativo indisponível');return plain(data.responseData.translatedText);};const [title,summary]=await Promise.all([fallback(a.titleOriginal),fallback(a.description||a.titleOriginal)]);return {...a,title,summary,translationStatus:'translated',translationProvider:'MyMemory'};}catch{return {...a,summary:'Tradução indisponível nesta coleta. Consulte a matéria original.',translationStatus:'unavailable'};}
  }}
const SERIES=[['Selic meta',432,'% a.a.'],['Dólar PTAX · venda',1,'R$ / US$'],['IPCA · mensal',433,'% no mês'],['IPCA · 12 meses',13522,'% em 12 meses']];
async function indicators(previous:any[]=[]){return Promise.all(SERIES.map(async([name,code,unit])=>{const url=`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados/ultimos/10?formato=json`;try{const rows=await(await request(url)).json() as any[];const row=rows.filter(r=>validObservation(r)).sort((a,b)=>a.data.split('/').reverse().join('-').localeCompare(b.data.split('/').reverse().join('-'))).at(-1);if(!row||!Number.isFinite(Number(row.valor)))throw Error('Valor inválido');return {name,unit,value:Number(row.valor),referenceDate:row.data,source:'Banco Central · SGS',url,checkedAt:new Date().toISOString(),status:'ok'};}catch{const old=previous.find(x=>x.name===name&&validObservation({data:x.referenceDate,valor:x.value}));return old?{...old,status:'cached'}:{name,unit,status:'unavailable',source:'Banco Central · SGS',url};}}));}
async function calendar(previous:any[]=[]){const events:any[]=verifiedEvents.filter(e=>Date.parse(e.at+'T23:59:59-03:00')>Date.now());const warnings:string[]=[];
  try{const ics=await(await request('https://www.bls.gov/schedule/news_release/bls.ics')).text();const titles:Record<string,string>={'Consumer Price Index':'Inflação ao consumidor (CPI) · EUA','Employment Situation':'Emprego e desemprego (Payroll) · EUA','Producer Price Index':'Inflação ao produtor (PPI) · EUA','Job Openings and Labor Turnover':'Vagas de emprego (JOLTS) · EUA'};for(const block of ics.replace(/\r?\n[ \t]/g,'').split('BEGIN:VEVENT').slice(1)){const name=block.match(/SUMMARY:(.*)/)?.[1]?.trim()||'';const key=Object.keys(titles).find(k=>name.startsWith(k));if(!key)continue;const m=block.match(/DTSTART([^:]*):(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)/);if(!m)continue;
    // BLS publishes either UTC or America/New_York wall-clock time; calculate DST from the actual event date.
    let iso=`${m[2]}-${m[3]}-${m[4]}T${m[5]}:${m[6]}:${m[7]}`;
    if(m[8])iso+='Z';else if(/TZID=America\/New_York|TZID=US\/Eastern/.test(m[1])){const guess=new Date(iso+'Z');const ny=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',timeZoneName:'shortOffset'}).formatToParts(guess).find(p=>p.type==='timeZoneName')?.value||'';iso+=ny.includes('-4')?'-04:00':'-05:00';}else continue;
    const at=new Date(iso);if(+at>Date.now()&&+at<Date.now()+90*86400000)events.push({title:titles[key],at:at.toISOString(),source:'BLS',url:'https://www.bls.gov/schedule/',kind:'timed'});
  }}catch{warnings.push('BLS');events.push(...previous.filter(e=>e.source==='BLS'&&Date.parse(e.at)>Date.now()));}
  try{const page=await(await request('https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm')).text();const months=['January','February','March','April','May','June','July','August','September','October','November','December'];for(const section of page.split(/<h4[^>]*>/).slice(1)){const year=Number(section.match(/(20\d{2}) FOMC Meetings/)?.[1]);if(!year)continue;for(const m of section.matchAll(/fomc-meeting__month[^>]*>([\s\S]*?)<\/div>[\s\S]*?fomc-meeting__date[^>]*>([\s\S]*?)<\/div>/g)){const month=months.indexOf(plain(m[1]).split('/').at(-1)!);const day=Number(plain(m[2]).replace(/\*/g,'').split('-').at(-1));if(month<0||!day)continue;const at=`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;if(at>=new Date().toISOString().slice(0,10)&&Date.parse(at)<Date.now()+180*86400000)events.push({title:'Decisão de juros · Federal Reserve',at,source:'Federal Reserve',url:calendarSources[2].url,kind:'date'});}}}catch{warnings.push('Federal Reserve');events.push(...previous.filter(e=>e.source==='Federal Reserve'&&Date.parse(e.at)>Date.now()));}
  return {events:events.sort((a,b)=>a.at.localeCompare(b.at)).slice(0,14),warnings,sources:calendarSources,checkedAt:new Date().toISOString()};
}
export async function latest(){const row=await database().prepare('SELECT payload FROM editions ORDER BY collected_at DESC LIMIT 1').first<{payload:string}>();return cleanEdition(row?JSON.parse(row.payload):seed);}
export async function update(){const old=await latest();const failures:string[]=[];const sources=await Promise.all(FEEDS.map(async f=>{try{const rows=await feed(f);if(!rows.length)throw Error('Feed vazio');return rows;}catch{failures.push(f[0]);return(old.articles||[]).filter((a:any)=>a.category===f[0]);}}));if(failures.length===FEEDS.length)throw Error('Todos os feeds falharam; edição anterior preservada.');
  const selected=curate(sources.flat());if(!selected.length)throw Error('Nenhuma notícia recente após curadoria.');
  const [rows,values,agenda]=await Promise.all([pool(selected,async a=>{const translated=await translate(a,old.articles?.find((b:any)=>b.url===a.url));const topic=topicFor(a.titleOriginal);return {...translated,topic:topic.name,context:topic.context,question:topic.question};}),indicators(old.indicators),calendar(old.calendar?.events)]);
  const top:any[]=[];const seen=new Set();for(const a of rows){if(!seen.has(a.topic)){top.push(a);seen.add(a.topic);if(top.length===5)break;}}for(const a of rows){if(top.length===5)break;if(!top.includes(a))top.push(a);}
  const collectedAt=new Date().toISOString();const id=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const payload=cleanEdition({updatedAt:collectedAt,editionId:id,failedFeeds:failures,translationFailures:rows.filter(a=>a.translationStatus==='unavailable').length,articles:rows,briefing:top.map(a=>a.url),indicators:values,calendar:agenda,method:'Seleção automática por atualidade, relevância temática e diversidade; resumo extraído da descrição RSS, com tradução automática quando disponível. Contexto educativo por tema, sem previsão de preços.'});
  await database().prepare('INSERT INTO editions (id,collected_at,payload) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET collected_at=excluded.collected_at,payload=excluded.payload').bind(id,collectedAt,JSON.stringify(payload)).run();
  return {editionId:id,updatedAt:collectedAt,articles:rows.length,translationFailures:payload.translationFailures,failedFeeds:failures};
}
export async function history(){return(await database().prepare('SELECT id,collected_at FROM editions ORDER BY id DESC LIMIT 366').all()).results;}
export async function edition(id:string){const row=await database().prepare('SELECT payload FROM editions WHERE id=?').bind(id).first<{payload:string}>();return row?cleanEdition(JSON.parse(row.payload)):null;}
