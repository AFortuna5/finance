const $ = s => document.querySelector(s);
let saved = new Set(), articles = [], category = 'Todas', limit = 12;
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
    const link = document.createElement('a');link.className='headline';link.href=a.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=a.title;link.lang=a.language;
    const bottom = document.createElement('div');bottom.className='article-bottom';
    const language = document.createElement('span'); language.textContent=a.language==='en'?'ORIGINAL EM INGLÊS':'ORIGINAL EM PORTUGUÊS';
    const read = document.createElement('a');read.href=a.url;read.target='_blank';read.rel='noopener noreferrer';read.textContent='Ler na fonte ↗';
    bottom.append(language,read);
    const button = document.createElement('button');button.className=`save ${saved.has(a.url)?'selected':''}`;button.textContent=saved.has(a.url)?'◆':'◇';button.setAttribute('aria-label',saved.has(a.url)?'Remover dos salvos':'Salvar notícia');button.setAttribute('aria-pressed',saved.has(a.url));
    button.onclick=()=>{saved.has(a.url)?saved.delete(a.url):saved.add(a.url);try{localStorage.setItem('meridiano-saved',JSON.stringify([...saved]));}catch{}render();};
    item.append(meta,link,bottom,button);$('#news').append(item);
  }
  if(!rows.length){const empty=document.createElement('p');empty.className='empty';empty.textContent=category==='Salvas'?'Seu caderno está em branco. Use o losango ao lado de uma manchete para guardar sua leitura.':'Nenhuma notícia encontrada para esta seleção.';$('#news').append(empty);}
  $('#more').hidden=rows.length<=limit;
}
$('#categories').onclick=e=>{const button=e.target.closest('button');if(!button)return;category=button.dataset.category;limit=12;document.querySelectorAll('#categories button').forEach(b=>b.classList.toggle('active',b===button));render();};
$('#search').oninput=()=>{limit=12;render();};
$('#more').onclick=()=>{limit+=12;render();};
$('#theme').onclick=()=>{document.body.classList.toggle('dark');try{localStorage.setItem('meridiano-theme',document.body.classList.contains('dark')?'dark':'light');}catch{}};
document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();$('#search').focus();}});
fetch('news.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{
  articles=data.articles.filter(a=>{try{return new URL(a.url).protocol==='https:';}catch{return false;}});
  $('#article-count').textContent=articles.length;
  const timestamp=new Date(data.updatedAt);
  const stale=Date.now()-timestamp.getTime()>36*60*60*1000;
  $('#updated').textContent=`Coleta: ${date(data.updatedAt)} às ${timestamp.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'})} (Brasília)${stale?' · Edição desatualizada':''}${data.failedFeeds?.length?' · Algumas fontes indisponíveis':''}`;
  render();
}).catch(()=>{$('#updated').textContent='Não foi possível carregar a edição.';$('#news').textContent='Recarregue a página para tentar novamente.';});
