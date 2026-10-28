(()=>{'use strict';
const $=q=>document.querySelector(q),$$=q=>[...document.querySelectorAll(q)];let config=null,media=[],activeFilter='todos';const B=document.body;
const labels={projetos:'PROJETOS',gameplay:'MAPAS',mapas:'MAPAS',sistemas:'SISTEMAS',interfaces:'UI / UX',bastidores:'BASTIDORES',capas:'CAPAS',videos:'VÍDEOS'};
function txt(q,v){const e=$(q);if(e&&v!==undefined)e.textContent=v}
function el(tag,cls,content){const x=document.createElement(tag);if(cls)x.className=cls;if(content!==undefined)x.textContent=content;return x}
function safeImg(v,fallback){if(typeof v!=='string'||!v)return fallback;return /^https:\/\//.test(v)||/^(assets\/|\/uploads\/)/.test(v)?v:fallback}
function link(elm,v){if(!elm)return;const good=typeof v==='string'&&/^https:\/\//.test(v);if(good){elm.href=v;elm.classList.remove('disabled');elm.setAttribute('target','_blank');elm.setAttribute('rel','noopener noreferrer');elm.removeAttribute('aria-disabled')}else{elm.removeAttribute('href');elm.classList.add('disabled');elm.setAttribute('aria-disabled','true')}}
function configureDiscord(value){
 const a=$('#contactDiscord');if(!a)return;
 if(typeof value==='string'&&/^https:\/\//.test(value)){link(a,value);a.dataset.discordCopy='';a.removeAttribute('role');a.removeAttribute('tabindex');a.replaceChildren(document.createTextNode('DISCORD'),el('span','','↗'));return}
 const name=(typeof value==='string'&&value.trim()?value.trim():'xwjoaolk').replace(/^@/,'');
 a.classList.remove('disabled');a.removeAttribute('aria-disabled');a.removeAttribute('href');
 a.dataset.discordCopy=name;a.setAttribute('role','button');a.setAttribute('tabindex','0');a.title='Clique para copiar @'+name;
 a.replaceChildren(document.createTextNode('DISCORD · @'+name),el('span','','⧉'));
}
async function copyDiscord(){
 const a=$('#contactDiscord'),user=a?.dataset.discordCopy;if(!user)return;
 let copied=false;try{await navigator.clipboard.writeText(user);copied=true}catch(e){console.warn('Clipboard:',e.message)}
 if(!copied){const t=document.createElement('textarea');t.value=user;document.body.appendChild(t);t.select();try{copied=document.execCommand('copy')}catch{}t.remove()}
 const original='DISCORD · @'+user;
 a.replaceChildren(document.createTextNode(copied?'COPIADO: @'+user:'USUÁRIO: @'+user),el('span','',copied?'✓':'⧉'));
 setTimeout(()=>{if(a.dataset.discordCopy===user)a.replaceChildren(document.createTextNode(original),el('span','','⧉'))},2500);
}
function setCover(elm,url){if(!elm)return;const safe=safeImg(url,'');if(safe){elm.style.setProperty('--custom-cover',`url("${safe.replace(/["\\]/g,'')}")`);elm.classList.add('custom-cover')}else{elm.classList.remove('custom-cover');elm.style.removeProperty('--custom-cover')}}
function apply(c){config=c;B.dataset.accent=c.accent||'yellow';txt('#themeLabel',c.accent==='red'?'RED':'YELLOW');txt('#introOverline',c.intro.overline);txt('#introLine',c.intro.line);txt('#introNote',c.intro.note);setCover($('#intro'),c.intro.background);txt('#heroEyebrow',c.hero.eyebrow);txt('#heroLine1',c.hero.line1);txt('#heroLine2',c.hero.line2);txt('#heroDescription',c.hero.description);setCover($('#hero'),c.hero.background);$('#avatarLink').style.display=c.hero.avatar?'':'none';txt('#aboutKicker',c.about.kicker);txt('#aboutTitle',c.about.title);txt('#aboutDescription',c.about.description);setCover($('#aboutVisual'),c.about.image);setCover($('#media'),c.gallery.highlight);txt('#gallerySubtitle',c.gallery.subtitle);const lines=(c.gallery.title||'WORK IN MOTION').split(' ');$('#galleryTitle').replaceChildren(document.createTextNode(lines[0]||'WORK'),document.createElement('br'),el('em','',lines.slice(1).join(' ')||'IN MOTION.'));
 link($('#heroRoblox'),c.links.roblox);link($('#avatarLink'),c.links.roblox);link($('#aboutRoblox'),c.links.roblox);link($('#contactRoblox'),c.links.roblox);configureDiscord(c.links.discord);link($('#contactGithub'),c.links.github);link($('#navGithub'),c.links.github);link($('#contactEmail'),c.links.contact&&/^https:\/\//.test(c.links.contact)?c.links.contact:'');link($('#gameLink'),c.links.game);if(c.links.contact&&c.links.contact.includes('@')&&!c.links.contact.startsWith('https:')){$('#contactEmail').href='mailto:'+c.links.contact;$('#contactEmail').classList.remove('disabled');$('#contactEmail').removeAttribute('aria-disabled')}
 for(const [k,selector] of Object.entries({showSkills:'#stack',showAbout:'#about',showGallery:'#media',showServices:'#services',showGames:'#games'})){$(selector).hidden===false;$(selector).hidden=c.settings[k]===false}
 const track=$('#tickerTrack'),phrase=c.settings.marquee||'GAME DEVELOPMENT ✳ SCRIPTING ✳ UI / UX ✳ CREATIVE SYSTEMS ✳';track.replaceChildren(...Array.from({length:6},()=>el('span','',phrase)));
 renderProjects();renderGames();renderSkills();renderServices();renderMedia();observe();
}
function renderProjects(){const grid=$('#projectsGrid');grid.replaceChildren();const projects=config.projects.filter(p=>p.active);if(!projects.length){grid.append(el('p','gallery-empty','NOVOS PROJETOS EM BREVE.'));return}projects.forEach((p,i)=>{const card=el(p.link?'a':'article','project reveal');if(p.link){card.href=p.link;card.target='_blank';card.rel='noopener noreferrer'}const img=el('img');img.src=safeImg(p.image,p.fallback||'assets/systems-poster.svg');img.alt=`Arte do projeto ${p.name}`;img.loading='lazy';img.addEventListener('error',()=>{img.src=p.id==='hunters'?'assets/jotta-hunters-forest.svg':'assets/jotta-systems-lab.svg'},{once:true});card.append(img);const top=el('div','project-top');top.append(el('span','',p.number||String(i+1).padStart(2,'0')),el('i','',p.category));card.append(top);const info=el('div','project-content');info.append(el('span','project-category',p.category),el('h3','',p.name),el('div','project-sub',p.subtitle));const foot=el('div','project-footer');foot.append(el('p','',p.description),el('span','project-arrow',p.link?'↗':'✳'));info.append(foot);card.append(info);if(matchMedia('(pointer:fine)').matches){card.addEventListener('pointermove',e=>{const r=card.getBoundingClientRect();card.style.setProperty('--mx',Math.round(e.clientX-r.left)+'px');card.style.setProperty('--my',Math.round(e.clientY-r.top)+'px')},{passive:true})}grid.append(card)})}
function renderGames(){const wrap=$('#gamesList');if(!wrap)return;wrap.replaceChildren();const games=(config.games||[]).filter(g=>g.visible);txt('#gamesCount',String(games.length).padStart(2,'0')+(games.length===1?' GAME':' GAMES'));if(!games.length){wrap.append(el('div','gallery-empty','NOVAS EXPERIÊNCIAS EM DESENVOLVIMENTO.'));return}games.forEach((g,i)=>{const card=el(g.link?'a':'article','game-row reveal');if(g.link){card.href=g.link;card.target='_blank';card.rel='noopener noreferrer'}const n=el('div','game-no','/'+String(i+1).padStart(2,'0'));const image=el('img','game-thumbnail');image.src=safeImg(g.image,'assets/forest-poster.svg');image.loading='lazy';image.alt='Capa de '+g.name;const details=el('div','game-details');details.append(el('span','game-genre',g.genre||'ROBLOX EXPERIENCE'),el('h3','',g.name||'Projeto sem título'),el('p','',g.description||''));const meta=el('div','game-meta');meta.append(el('span','game-status',g.status||'Em desenvolvimento'),el('span','game-arrow',g.link?'↗':'✳'));card.append(n,image,details,meta);wrap.append(card)})}
function renderSkills(){const grid=$('#skillsGrid');grid.replaceChildren();config.skills.forEach((s,i)=>{const card=el('div','skill reveal');const top=el('div','skill-top');top.append(el('span','',String(i+1).padStart(2,'0')+' / 0'+config.skills.length),el('span','',s.category));card.append(top,el('strong','',s.name),el('div','skill-bottom',s.description));grid.append(card)})}
function renderServices(){const grid=$('#servicesList');grid.replaceChildren();config.services.forEach((s,i)=>{const row=el('div','service reveal');row.append(el('span','service-num',String(i+1).padStart(2,'0')));const name=el('div');name.append(el('small','',s.detail),el('strong','',s.name));row.append(name,el('p','service-desc',s.description),el('span','service-arrow','↗'));grid.append(row)})}
function mediaType(m){return m.type==='video'||m.category==='videos'?'video':'image'}
function mediaCard(m,featured=false){
 const kind=mediaType(m)==='video'?'sistema':'mapa';
 const b=el('button','media-card'+(featured?' media-feature-card':'')+' media-'+kind);
 b.type='button';b.setAttribute('aria-label',(kind==='sistema'?'Assistir demonstração: ':'Ampliar imagem: ')+(m.title||'Mídia'));
 const cover=el('div','media-cover'),img=el('img');
 img.loading=featured?'eager':'lazy';img.decoding='async';img.src=safeImg(m.thumbnail||m.url,'assets/jotta-systems-lab.svg');img.alt=m.title||'Projeto';
 img.addEventListener('error',()=>{img.src='assets/jotta-systems-lab.svg'},{once:true});
 cover.append(img);
 const top=el('div','media-overlay-top');
 top.append(el('span','media-type-pill',kind==='sistema'?'DEMONSTRAÇÃO DE SISTEMA':'CENÁRIO / MAPA'));
 if(featured)top.append(el('span','media-feature-label','DESTAQUE DO ESTÚDIO'));
 cover.append(top);
 if(kind==='sistema')cover.append(el('span','media-play','▶'));
 const foot=el('div','media-text'),info=el('div','media-caption');
 info.append(el('small','media-category',labels[m.category]||'PORTFÓLIO'),el('strong','',m.title||'Sem título'));
 if(m.description)info.append(el('p','media-description',m.description));
 foot.append(info,el('span','media-action',kind==='sistema'?'ASSISTIR ↗':'AMPLIAR ↗'));
 b.append(cover,foot);
 b.addEventListener('click',()=>openMedia(m));
 return b;
}
function renderMedia(){
 const grid=$('#mediaGrid'),feature=$('#featuredMedia'),heading=$('#showcaseSection'),empty=$('#galleryEmpty');
 const matches=m=>activeFilter==='todos'||(activeFilter==='videos'?mediaType(m)==='video':m.category===activeFilter);
 const filtered=media.filter(matches);
 const selected=activeFilter==='todos'?[media.find(m=>m.id==='jotta-system-02'),media.find(m=>m.id==='jotta-mapa-cidade')].filter(Boolean):[];
 feature.replaceChildren(...selected.map(m=>mediaCard(m,true)));
 feature.hidden=selected.length===0;heading.hidden=selected.length===0;
 const rest=filtered.filter(m=>!selected.includes(m));
 grid.replaceChildren(...rest.map(m=>mediaCard(m)));
 empty.hidden=filtered.length!==0;
 txt('#mediaCount','/ '+String(media.length).padStart(2,'0')+' ITEMS');
 txt('#mediaArchiveCount','/ '+String(rest.length).padStart(2,'0'));
 txt('[data-stat="sistemas"]',String(media.filter(m=>m.category==='sistemas').length).padStart(2,'0'));
 txt('[data-stat="mapas"]',String(media.filter(m=>m.category==='mapas'||m.category==='gameplay').length).padStart(2,'0'));
 txt('[data-stat="jogos"]',String((config?.games||[]).filter(g=>g.visible).length).padStart(2,'0'));
 for(const b of $$('#mediaFilters [data-filter]')){
  const name=b.dataset.filter,num=media.filter(m=>name==='todos'||(name==='videos'?mediaType(m)==='video':m.category===name)).length;
  let stat=b.querySelector('.filter-count');if(!stat){stat=el('span','filter-count');b.append(stat)}
  stat.textContent=String(num).padStart(2,'0');
 }
}
function openMedia(m){
 const modal=$('#lightbox'),holder=$('#lightboxBody');holder.replaceChildren();
 const isVideo=mediaType(m)==='video',obj=el(isVideo?'video':'img');
 if(isVideo){obj.src=m.url;obj.controls=true;obj.preload='metadata';obj.playsInline=true;obj.poster=safeImg(m.thumbnail,'');obj.setAttribute('controlsList','nodownload')}
 else{obj.src=m.url;obj.alt=m.title||'Imagem ampliada'}
 holder.append(obj);
 txt('#lightboxTitle',m.title||'MÍDIA');txt('#lightboxMeta',labels[m.category]||'PROJETO');
 const original=$('#lightboxOriginal');if(original){original.href=m.url;original.textContent=isVideo?'ABRIR VÍDEO ORIGINAL ↗':'ABRIR IMAGEM ORIGINAL ↗'}
 modal.hidden=false;B.classList.add('modal-open');$('#lightboxClose').focus();
 if(isVideo&&!(matchMedia('(prefers-reduced-motion:reduce)').matches)){const attempt=obj.play();if(attempt?.catch)attempt.catch(()=>{})}
}
function closeMedia(){
 const modal=$('#lightbox'),video=$('#lightboxBody video');
 if(video){video.pause();video.removeAttribute('src');video.load()}
 modal.hidden=true;$('#lightboxBody').replaceChildren();B.classList.remove('modal-open');
}
const builtInGallery=[
 {id:'jotta-mapa-casa',title:'Mapa — Casa Moderna',category:'mapas',type:'image',url:'assets/Roblox_Mapa_01.webp?v=hd3'},
 {id:'jotta-mapa-cidade',title:'Mapa — Cidade no Roblox',category:'mapas',type:'image',url:'assets/Roblox_Mapa_02.webp?v=hd3'},
 {id:'jotta-mapa-cerejeiras',title:'Mapa — Cenário Noturno',category:'mapas',type:'image',url:'assets/Roblox_Mapa_03.webp?v=hd3'},
 {id:'jotta-mapa-estrada',title:'Mapa — Estrada e Iluminação',category:'mapas',type:'image',url:'assets/Roblox_Mapa_04.webp?v=hd3'},
 ...[
  ['Sistema de Menu Inicial','Abertura e seleção de opções do jogo'],
  ['Sistema de Garagem','Visualização e gerenciamento de veículos'],
  ['Sistema de Equipes','Organização e escolha de equipes'],
  ['Sistema de Lendas','Catálogo e informações das lendas'],
  ['Sistema de Ranking','Classificação e desempenho dos jogadores'],
  ['Sistema de Concessionária','Loja de veículos e informações dos carros']
 ].map(([title,description],i)=>{const n=String(i+1).padStart(2,'0');return {id:'jotta-system-'+n,title,description,category:'sistemas',type:'video',url:'assets/Roblox_Sistema_'+n+'.mp4?v=hd3',thumbnail:'assets/Roblox_Sistema_'+n+'_Capa.webp?v=hd3'}})
];
async function loadMedia(){
 let remote=[];
 try{const r=await fetch('/api/media',{cache:'no-store'});if(r.ok)remote=(await r.json()).items||[]}catch(e){console.warn('Galeria:',e.message)}
 // Imagens e vídeos commitados em public/assets são permanentes e aparecem automaticamente.
 const present=await Promise.all(builtInGallery.map(async item=>{
   try{const r=await fetch(item.url,{method:'HEAD',cache:'no-store'});return r.ok?item:null}catch{return null}
 }));
 const uploaded=present.filter(Boolean);
 media=[...remote,...uploaded];
 if(!media.length)media=[
   {id:'studio-hunters',title:'Caçadores de Lendas — Atmosfera',category:'projetos',type:'image',url:'assets/jotta-hunters-forest.svg'},
   {id:'studio-game',title:'Roblox Studio — Desenvolvimento',category:'bastidores',type:'image',url:'assets/jotta-developer-workspace.svg'},
   {id:'studio-systems',title:'Systems Lab — Interface',category:'interfaces',type:'image',url:'assets/jotta-systems-lab.svg'},
   {id:'studio-archive',title:'JOTTA — Design e Criação',category:'capas',type:'image',url:'assets/jotta-gallery-board.svg'}
 ];
 renderMedia();
}
async function loadSite(){try{const r=await fetch('/api/site',{cache:'no-store'});if(!r.ok)throw Error('Não carregou');const data=await r.json();apply(data.content)}catch(e){console.warn('Site config:',e)}}
async function updateAvatar(){try{const r=await fetch('/api/roblox-avatar?refresh='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('avatar indisponível');const a=await r.json();if(a.full){$('#avatarFull').src=a.full;$('#avatarFull').alt='Avatar Roblox atualizado do perfil '+a.id}if(a.head)$('#avatarHead').src=a.head}catch(e){console.warn('Roblox avatar:',e.message)}}
let observer;function observe(){if(!('IntersectionObserver'in window)){$$('.reveal').forEach(x=>x.classList.add('visible'));return}if(!observer)observer=new IntersectionObserver(entries=>{for(const e of entries){if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target)}}},{threshold:.08,rootMargin:'0px 0px -25px 0px'});$$('.reveal:not(.visible)').forEach(x=>observer.observe(x))}
function initIntro(){const i=$('#intro');let seen=false;try{seen=sessionStorage.getItem('jotta_intro_seen')==='1'}catch{}const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;if(seen||reduced){i.hidden=true;return}B.classList.add('modal-open');function enter(){if(i.classList.contains('done'))return;i.classList.add('done');B.classList.remove('modal-open');try{sessionStorage.setItem('jotta_intro_seen','1')}catch{}setTimeout(()=>{i.hidden=true},1200)}$('#enterBtn').addEventListener('click',enter);$('#skipIntro').addEventListener('click',enter)}
$('#contactDiscord').addEventListener('click',e=>{if(e.currentTarget.dataset.discordCopy){e.preventDefault();copyDiscord()}});$('#contactDiscord').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.currentTarget.dataset.discordCopy){e.preventDefault();copyDiscord()}});
$('#themeBtn').addEventListener('click',()=>{B.dataset.accent=B.dataset.accent==='red'?'yellow':'red';txt('#themeLabel',B.dataset.accent.toUpperCase())});$('#menuBtn').addEventListener('click',()=>{const open=$('#mainNav').classList.toggle('open');$('#menuBtn').setAttribute('aria-expanded',open)});$$('#mainNav a').forEach(a=>a.addEventListener('click',()=>{$('#mainNav').classList.remove('open');$('#menuBtn').setAttribute('aria-expanded','false')}));
$$('#mediaFilters [data-filter]').forEach(b=>b.addEventListener('click',()=>{activeFilter=b.dataset.filter;$$('#mediaFilters button').forEach(x=>x.classList.toggle('active',x===b));renderMedia()}));$('#lightboxClose').addEventListener('click',closeMedia);$('#lightbox').addEventListener('click',e=>{if(e.target===$('#lightbox'))closeMedia()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#lightbox').hidden)closeMedia()});
let scrollTick=false;addEventListener('scroll',()=>{if(scrollTick)return;scrollTick=true;requestAnimationFrame(()=>{B.classList.toggle('scrolled',scrollY>50);const max=Math.max(1,document.documentElement.scrollHeight-innerHeight);$('#scrollProgress').style.width=100*scrollY/max+'%';scrollTick=false})},{passive:true});
if(matchMedia('(pointer:fine) and (prefers-reduced-motion:no-preference)').matches){addEventListener('pointermove',e=>{$('#cursorGlow').style.left=e.clientX+'px';$('#cursorGlow').style.top=e.clientY+'px'},{passive:true})}
initIntro();observe();loadSite();loadMedia();updateAvatar();setInterval(updateAvatar,5*60000);
})();
