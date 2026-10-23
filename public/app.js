const $ = s => document.querySelector(s);
let saved = new Set(), articles = [], category = 'Todas', limit = 12, currentEdition = null;
try { saved = new Set(JSON.parse(localStorage.getItem('meridiano-saved') || '[]')); if (localStorage.getItem('meridiano-theme') === 'dark') document.body.classList.add('dark'); } catch {}
const date = value => new Date(value).toLocaleDateString('pt-BR', {day:'2-digit',month:'short',timeZone:'America/Sao_Paulo'});
$('#today').textContent = new Date().toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric',timeZone:'America/Sao_Paulo'}).toUpperCase();
function render() {
  const query = $('#search').value.toLocaleLowerCase('pt-BR');
  const rows = articles.filter(a => (category === 'Todas' || (category === 'Salvas' ? saved.has(a.url) : a.category === category)) && `${a.title} ${a.source} ${a.category}`.toLocaleLowerCase('pt-BR').includes(query));
  $('#saved-count').textContent = saved.size;
  $('#result-count').textContent = `${rows.length} notícias`;
  $('#section-label').textContent = category === 'Todas' ? 'Na primeira página' : category === 'Salvas' ? 'Para ler com calma' : category;
  $('#news').replaceChildren();
  for (const a of rows.slice(0,limit)) {
    const item = document.createElement('article');
    const meta = document.createElement('div'); meta.className = 'meta';
    const tag = document.createElement('span'); tag.className='category';tag.textContent=a.category;
    const source = document.createElement('span');source.textContent=`${a.source} · ${date(a.publishedAt)}`;
    meta.append(tag,source);
    const link = document.createElement('a');link.className='headline';link.href=a.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=a.title;link.lang=a.translationStatus==='translated'?'pt-BR':a.language;
    const bottom = document.createElement('div');bottom.className='article-bottom';
    const language = document.createElement('span'); language.textContent=a.language==='en'?(a.translationStatus==='translated'?'TRADUÇÃO AUTOMÁTICA · FONTE EM INGLÊS':'TRADUÇÃO INDISPONÍVEL · ORIGINAL EM INGLÊS'):'FONTE EM PORTUGUÊS';
    const read = document.createElement('a');read.href=a.url;read.target='_blank';read.rel='noopener noreferrer';read.textContent='Ler na fonte ↗';
    bottom.append(language,read);
    const button = document.createElement('button');button.className=`save ${saved.has(a.url)?'selected':''}`;button.textContent=saved.has(a.url)?'◆':'◇';button.setAttribute('aria-label',saved.has(a.url)?'Remover dos salvos':'Salvar notícia');button.setAttribute('aria-pressed',saved.has(a.url));
    button.onclick=()=>{saved.has(a.url)?saved.delete(a.url):saved.add(a.url);try{localStorage.setItem('meridiano-saved',JSON.stringify([...saved]));}catch{}render();};
    item.append(meta,link);
    if(a.summary&&a.summary!==a.title){const summary=document.createElement('p');summary.className='news-summary';summary.textContent=a.summary;item.append(summary);}
    if(a.context){const context=document.createElement('details');context.className='article-context';const heading=document.createElement('summary');heading.textContent='Por que isso importa?';const body=document.createElement('p');body.textContent=a.context;const label=document.createElement('small');label.textContent='CONTEXTO EDUCATIVO · '+a.topic;const question=document.createElement('p');question.className='reading-question';question.textContent='Para acompanhar: '+a.question;context.append(heading,label,body,question);item.append(context);}
    if(a.titleOriginal&&a.titleOriginal!==a.title){const original=document.createElement('details');original.className='original-title';const heading=document.createElement('summary');heading.textContent='Ver manchete original';const text=document.createElement('p');text.textContent=a.titleOriginal;text.lang=a.language;original.append(heading,text);item.append(original);}
    item.append(bottom,button);$('#news').append(item);
  }
  if(!rows.length){const empty=document.createElement('p');empty.className='empty';empty.textContent=category==='Salvas'?'Seu caderno está em branco. Use o losango ao lado de uma manchete para guardar sua leitura.':'Nenhuma notícia encontrada para esta seleção.';$('#news').append(empty);}
  $('#more').hidden=rows.length<=limit;
}
$('#categories').onclick=e=>{const button=e.target.closest('button');if(!button)return;category=button.dataset.category;limit=12;document.querySelectorAll('#categories button').forEach(b=>b.classList.toggle('active',b===button));render();};
$('#search').oninput=()=>{limit=12;render();};
$('#more').onclick=()=>{limit+=12;render();};
$('#theme').onclick=()=>{document.body.classList.toggle('dark');try{localStorage.setItem('meridiano-theme',document.body.classList.contains('dark')?'dark':'light');}catch{}};
document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();$('#search').focus();}});
function showEdition(data){
  currentEdition=data;
  articles=data.articles.filter(a=>{try{return new URL(a.url).protocol==='https:';}catch{return false;}});
  $('#article-count').textContent=articles.length;
  const timestamp=new Date(data.updatedAt);
  const stale=Date.now()-timestamp.getTime()>36*60*60*1000;
  $('#updated').textContent=`Coleta: ${date(data.updatedAt)} às ${timestamp.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'})} (Brasília)${stale?' · Edição desatualizada':''}${data.failedFeeds?.length?' · Algumas fontes indisponíveis':''}`;
  render(); renderDashboard(data);
}
function node(tag,text,className){const e=document.createElement(tag);if(text)e.textContent=text;if(className)e.className=className;return e;}
function safeLink(title,url){const a=node('a',title);try{if(new URL(url).protocol!=='https:')return a;}catch{return a;}a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
function renderDashboard(data){
  $('#brief-list').replaceChildren();
  const top=(data.briefing||[]).map(url=>data.articles.find(a=>a.url===url)).filter(Boolean);
  for(const [index,a] of top.entries()){const li=node('li');const text=node('div');text.append(node('small',a.topic||a.category),safeLink(a.title,a.url),node('p',a.summary||''));li.append(node('span',String(index+1).padStart(2,'0')),text);$('#brief-list').append(li);}
  if(!top.length)$('#brief-list').append(node('p','A primeira edição com curadoria está sendo preparada.'));
  $('#indicators').replaceChildren();
  for(const value of data.indicators||[]){const card=node('div',null,'indicator');card.append(node('small',value.name),node('strong',value.value==null?'Indisponível':Number(value.value).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:4})),node('span',value.unit),safeLink(value.source,value.url),node('small',value.referenceDate?'Referência: '+value.referenceDate:'Aguardando fonte'));if(value.status==='cached')card.append(node('em','Último valor preservado · fonte indisponível'));$('#indicators').append(card);}
  $('#calendar-events').replaceChildren();
  for(const event of data.calendar?.events||[]){const card=node('div',null,'calendar-event');card.append(node('time',event.kind==='date'?event.at.split('-').reverse().join('/')+' · horário a confirmar':new Date(event.at).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'})+' · Brasília'),safeLink(event.title,event.url),node('small',event.source));$('#calendar-events').append(card);}
  if(!data.calendar?.events?.length)$('#calendar-events').append(node('p','Agenda automática indisponível nesta edição. Consulte os calendários oficiais abaixo.'));
  $('#calendar-sources').replaceChildren();
  for(const source of data.calendar?.sources||[])$('#calendar-sources').append(safeLink(source.name+' ↗',source.url));
  $('#edition-note').textContent=(data.editionId?'Edição de '+data.editionId.split('-').reverse().join('/')+'. ':'')+(data.translationFailures?`${data.translationFailures} traduções indisponíveis. `:'')+'Resumo do feed; contexto educativo por tema. Não é recomendação de investimento.';
}
async function loadEdition(id=''){const response=await fetch('/api/news'+(id?'?edition='+encodeURIComponent(id):''),{cache:'no-store'});if(!response.ok)throw Error();showEdition(await response.json());}
loadEdition().catch(()=>{$('#updated').textContent='Não foi possível carregar a edição.';$('#news').textContent='Recarregue a página para tentar novamente.';});
fetch('/api/news?history=1',{cache:'no-store'}).then(r=>r.json()).then(rows=>{for(const row of rows){const option=node('option',row.id.split('-').reverse().join('/'));option.value=row.id;$('#history').append(option);}}).catch(()=>{});
$('#history').onchange=async()=>{try{await loadEdition($('#history').value);}catch{$('#edition-note').textContent='Não foi possível abrir esta edição. Tente novamente.';}};
