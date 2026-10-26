import {cleanEdition} from './feed-text.js';
const $ = s => document.querySelector(s);
let saved = new Set(), articles = [], category = 'Todas', limit = 12, currentEdition = null;
try { saved = new Set(JSON.parse(localStorage.getItem('meridiano-saved') || '[]')); if (localStorage.getItem('meridiano-theme') === 'dark') document.body.classList.add('dark'); } catch {}
const LOC = () => window.merLocale ? window.merLocale() : 'pt-BR';
const EN = () => window.merLang && window.merLang() === 'en';
const CAT_EN = {'Brasil':'Brazil','Mundo':'World','Mercados':'Markets','Geopolítica':'Geopolitics','Eleições':'Elections'};
const catLabel = c => EN() ? (CAT_EN[c] || c) : c;
const artTitle = a => EN() && a.language === 'en' ? (a.titleOriginal || a.title) : a.title;
const artSummary = a => EN() && a.language === 'en' ? (a.description || a.summary) : a.summary;
const artContext = a => EN() ? (a.contextEn || a.context) : a.context;
const artQuestion = a => EN() ? (a.questionEn || a.question) : a.question;
const artTopic = a => EN() ? (a.topicEn || a.topic) : a.topic;
const date = value => new Date(value).toLocaleDateString(LOC(), {day:'2-digit',month:'short',timeZone:'America/Sao_Paulo'});
const setToday = () => { $('#today').textContent = new Date().toLocaleDateString(LOC(),{day:'numeric',month:'long',year:'numeric',timeZone:'America/Sao_Paulo'}).toUpperCase(); };
setToday();
function render() {
  const query = $('#search').value.toLocaleLowerCase(LOC());
  const rows = articles.filter(a => (category === 'Todas' || (category === 'Salvas' ? saved.has(a.url) : a.category === category)) && `${a.title} ${a.titleOriginal||''} ${a.source} ${a.category}`.toLocaleLowerCase(LOC()).includes(query));
  $('#saved-count').textContent = saved.size;
  $('#result-count').textContent = `${rows.length} ${pick('notícias','stories')}`;
  $('#section-label').textContent = category === 'Todas' ? pick('Na primeira página','Front page') : category === 'Salvas' ? pick('Para ler com calma','Read at leisure') : catLabel(category);
  $('#news').replaceChildren();
  for (const a of rows.slice(0,limit)) {
    const item = document.createElement('article');
    const meta = document.createElement('div'); meta.className = 'meta';
    const tag = document.createElement('span'); tag.className='category';tag.textContent=catLabel(a.category);
    const source = document.createElement('span');source.textContent=`${a.source} · ${date(a.publishedAt)}`;
    meta.append(tag,source);
    const link = document.createElement('a');link.className='headline';link.href=a.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=artTitle(a);link.lang=(EN()||a.translationStatus==='translated')?(EN()?a.language:'pt-BR'):a.language;
    const bottom = document.createElement('div');bottom.className='article-bottom';
    const language = document.createElement('span'); language.textContent=EN()?(a.language==='en'?'ENGLISH SOURCE':'PORTUGUESE SOURCE'):(a.language==='en'?(a.translationStatus==='translated'?'TRADUÇÃO AUTOMÁTICA · FONTE EM INGLÊS':'TRADUÇÃO INDISPONÍVEL · ORIGINAL EM INGLÊS'):'FONTE EM PORTUGUÊS');
    const read = document.createElement('a');read.href=a.url;read.target='_blank';read.rel='noopener noreferrer';read.textContent=pick('Ler na fonte ↗︎','Read at source ↗︎');
    bottom.append(language,read);
    const button = document.createElement('button');button.className=`save ${saved.has(a.url)?'selected':''}`;button.textContent=saved.has(a.url)?'◆':'◇';button.setAttribute('aria-label',saved.has(a.url)?pick('Remover dos salvos','Remove from saved'):pick('Salvar notícia','Save story'));button.setAttribute('aria-pressed',saved.has(a.url));
    button.onclick=()=>{saved.has(a.url)?saved.delete(a.url):saved.add(a.url);try{localStorage.setItem('meridiano-saved',JSON.stringify([...saved]));}catch{}render();};
    item.append(meta,link);
    const summary=artSummary(a);if(summary&&summary!==artTitle(a)){const p=document.createElement('p');p.className='news-summary';p.textContent=summary;item.append(p);}
    const ctx=artContext(a);if(ctx){const context=document.createElement('details');context.className='article-context';const heading=document.createElement('summary');heading.textContent=pick('Por que isso importa?','Why does it matter?');const body=document.createElement('p');body.textContent=ctx;const label=document.createElement('small');label.textContent=pick('CONTEXTO EDUCATIVO · ','EDUCATIONAL CONTEXT · ')+(artTopic(a)||'');const question=document.createElement('p');question.className='reading-question';question.textContent=pick('Para acompanhar: ','To follow: ')+(artQuestion(a)||'');context.append(heading,label,body,question);item.append(context);}
    if(!EN()&&a.titleOriginal&&a.titleOriginal!==a.title){const original=document.createElement('details');original.className='original-title';const heading=document.createElement('summary');heading.textContent='Ver manchete original';const text=document.createElement('p');text.textContent=a.titleOriginal;text.lang=a.language;original.append(heading,text);item.append(original);}
    item.append(bottom,button);$('#news').append(item);
  }
  if(!rows.length){const empty=document.createElement('p');empty.className='empty';empty.textContent=category==='Salvas'?pick('Seu caderno está em branco. Use o losango ao lado de uma manchete para guardar sua leitura.','Your notebook is blank. Use the diamond next to a headline to keep your reading.'):pick('Nenhuma notícia encontrada para esta seleção.','No stories found for this selection.');$('#news').append(empty);}
  $('#more').hidden=rows.length<=limit;
}
$('#categories').onclick=e=>{const button=e.target.closest('button');if(!button)return;category=button.dataset.category;limit=12;document.querySelectorAll('#categories button').forEach(b=>b.classList.toggle('active',b===button));render();};
$('#search').oninput=()=>{limit=12;render();};
$('#more').onclick=()=>{limit+=12;render();};
$('#theme').onclick=()=>{document.body.classList.toggle('dark');try{localStorage.setItem('meridiano-theme',document.body.classList.contains('dark')?'dark':'light');}catch{}};
document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();$('#search').focus();}});
function setUpdated(data){
  const timestamp=new Date(data.updatedAt);
  const stale=Date.now()-timestamp.getTime()>36*60*60*1000;
  $('#updated').textContent=`${pick('Coleta: ','Collected: ')}${date(data.updatedAt)} ${pick('às','at')} ${timestamp.toLocaleTimeString(LOC(),{hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'})} (Brasília)${stale?pick(' · Edição desatualizada',' · Stale edition'):''}${data.failedFeeds?.length?pick(' · Algumas fontes indisponíveis',' · Some sources unavailable'):''}`;
}
function showEdition(data){
  data=cleanEdition(data);
  currentEdition=data;
  articles=data.articles.filter(a=>{try{return new URL(a.url).protocol==='https:';}catch{return false;}});
  $('#article-count').textContent=articles.length;
  setUpdated(data);
  render(); renderDashboard(data);
}
function node(tag,text,className){const e=document.createElement(tag);if(text)e.textContent=text;if(className)e.className=className;return e;}
function safeLink(title,url){const a=node('a',title);try{if(new URL(url).protocol!=='https:')return a;}catch{return a;}a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
function renderDashboard(data){
  $('#brief-list').replaceChildren();
  const top=(data.briefing||[]).map(url=>data.articles.find(a=>a.url===url)).filter(Boolean);
  for(const [index,a] of top.entries()){const li=node('li');const text=node('div');text.append(node('small',artTopic(a)||catLabel(a.category)),safeLink(artTitle(a),a.url),node('p',artSummary(a)||''));li.append(node('span',String(index+1).padStart(2,'0')),text);$('#brief-list').append(li);}
  if(!top.length)$('#brief-list').append(node('p',pick('A primeira edição com curadoria está sendo preparada.','The first curated edition is being prepared.')));
  $('#indicators').replaceChildren();
  for(const value of data.indicators||[]){const card=node('div',null,'indicator');card.append(node('small',(EN()&&value.nameEn)||value.name),node('strong',value.value==null?pick('Indisponível','Unavailable'):Number(value.value).toLocaleString(LOC(),{minimumFractionDigits:2,maximumFractionDigits:4})),node('span',value.unit),safeLink(value.source,value.url),node('small',value.referenceDate?pick('Referência: ','Reference: ')+value.referenceDate:pick('Aguardando fonte','Awaiting source')));if(value.status==='cached')card.append(node('em',pick('Último valor preservado · fonte indisponível','Last preserved value · source unavailable')));$('#indicators').append(card);}
  $('#calendar-events').replaceChildren();
  for(const event of data.calendar?.events||[]){const card=node('div',null,'calendar-event');card.append(node('time',event.kind==='date'?event.at.split('-').reverse().join('/')+pick(' · horário a confirmar',' · time to be confirmed'):new Date(event.at).toLocaleString(LOC(),{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'})+' · Brasília'),safeLink((EN()&&event.titleEn)||event.title,event.url),node('small',event.source));$('#calendar-events').append(card);}
  if(!data.calendar?.events?.length)$('#calendar-events').append(node('p',pick('Agenda automática indisponível nesta edição. Consulte os calendários oficiais abaixo.','Automatic schedule unavailable this edition. See the official calendars below.')));
  $('#calendar-sources').replaceChildren();
  for(const source of data.calendar?.sources||[])$('#calendar-sources').append(safeLink(((EN()&&source.nameEn)||source.name)+' ↗︎',source.url));
  $('#edition-note').textContent=(data.editionId?pick('Edição de ','Edition of ')+data.editionId.split('-').reverse().join('/')+'. ':'')+(data.translationFailures?`${data.translationFailures} ${pick('traduções indisponíveis.','translations unavailable.')} `:'')+pick('Resumo do feed; contexto educativo por tema. Não é recomendação de investimento.','Feed summaries; educational context by topic. Not investment advice.');
}
async function fetchEdition(url){const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw Error();return response.json();}
async function loadEdition(id=''){
  try { showEdition(await fetchEdition('/api/news'+(id?'?edition='+encodeURIComponent(id):''))); return; }
  catch { showEdition(await fetchEdition(id?`editions/${encodeURIComponent(id)}.json`:'news.json')); }
}
loadEdition().catch(()=>{$('#updated').textContent=pick('Não foi possível carregar a edição.','Could not load the edition.');$('#news').textContent=pick('Recarregue a página para tentar novamente.','Reload the page to try again.');});
window.addEventListener('mer-lang',()=>{setToday();if(currentEdition){setUpdated(currentEdition);render();renderDashboard(currentEdition);}});
fetchEdition('/api/news?history=1').catch(()=>fetchEdition('history.json')).then(rows=>{if(rows.length){const en=$('#edition-no');if(en)en.textContent='Nº '+rows.length;}for(const row of rows){const option=node('option',row.id.split('-').reverse().join('/'));option.value=row.id;$('#history').append(option);}}).catch(()=>{});
$('#history').onchange=async()=>{try{await loadEdition($('#history').value);}catch{$('#edition-note').textContent=pick('Não foi possível abrir esta edição. Tente novamente.','Could not open this edition. Try again.');}};
