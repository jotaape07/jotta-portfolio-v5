(()=>{'use strict';
const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));
const pick=(tag,cl,text)=>{const x=document.createElement(tag);if(cl)x.className=cl;if(text!==undefined)x.textContent=text;return x};
let content=null,media=[],changed=false,pickerDone=null,toastTimer=null;
const fields=[['intro.background','FUNDO DA ABERTURA','Imagem da tela JOTTA de apresentação'],['hero.background','FUNDO DA CAPA','Imagem atrás do título principal'],['about.image','FUNDO DO SOBRE MIM','Pode mostrar fotos dos seus projetos'],['gallery.highlight','FUNDO DA GALERIA','Imagem na área de mídia']];
const coverSpecs=()=>[...fields,...(content?.projects||[]).map((p,i)=>[`projects.${i}.image`,`CAPA DO PROJETO: ${p.name}`,'Cartaz do projeto']),...(content?.games||[]).map((g,i)=>[`games.${i}.image`,`CAPA DO JOGO: ${g.name}`,'Aparece no catálogo de jogos'])];
function get(path){return path.split('.').reduce((o,k)=>o?.[k],content)}
function set(path,val){const a=path.split('.'),last=a.pop();let o=content;for(const key of a)o=o[key];o[last]=val;dirty()}
function dirty(){changed=true;$('#saveIndicator').textContent='ALTERAÇÕES NÃO PUBLICADAS';$('#saveIndicator').style.color='#f7d642'}
function clean(){changed=false;$('#saveIndicator').textContent='TUDO PUBLICADO';$('#saveIndicator').style.color='#95bc95'}
function toast(m,err=false){const e=$('#toast');e.textContent=m;e.hidden=false;e.style.background=err?'#ed9687':'';clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.hidden=true,4500)}
async function call(url,opts={}){const res=await fetch(url,{credentials:'same-origin',cache:'no-store',...opts});let data;try{data=await res.json()}catch{data={}}if(!res.ok)throw Error(data.error||`Erro HTTP ${res.status}`);return data}
function field(title,value,onChange,opts={}){const l=pick('label');l.append(document.createTextNode(title));const n=pick(opts.multiline?'textarea':'input');if(!opts.multiline)n.type=opts.type||'text';n.value=value??'';n.placeholder=opts.placeholder||'';n.maxLength=opts.max||700;if(opts.multiline)n.rows=opts.rows||3;n.addEventListener('input',()=>onChange(n.value));l.append(n);if(opts.wide)l.classList.add('wide');return l}
function choice(title,value,options,cb){const l=pick('label');l.append(document.createTextNode(title));const s=pick('select');for(const [v,text] of options){const o=pick('option');o.value=v;o.textContent=text;s.append(o)}s.value=value;s.addEventListener('change',()=>cb(s.value));l.append(s);return l}
function toggle(name,value,onChange){const l=pick('label','toggle-row');l.append(pick('span','',name));const c=pick('input');c.type='checkbox';c.checked=!!value;c.addEventListener('change',()=>onChange(c.checked));l.append(c);return l}
function box(title,kicker){const d=pick('div','panel editor-group'),h=pick('div','group-head'),t=pick('h2','',title);h.append(t);if(kicker)h.append(pick('span','overline',kicker));d.append(h);return d}
function grid(){return pick('div','field-grid')}
function preview(src,klass=''){const d=pick('div','cover-preview '+klass);if(src){const img=pick('img');img.src=src;img.alt='Prévia da imagem';d.append(img)}else d.append(pick('div','placeholder','NENHUMA IMAGEM DEFINIDA'));return d}
function openPicker(fn){pickerDone=fn;const area=$('#pickerItems');area.replaceChildren();for(const m of media.filter(m=>m.type==='image')){const b=pick('button');b.type='button';const img=pick('img');img.src=m.thumbnail||m.url;img.loading='lazy';const title=pick('span','',m.title||'Imagem');b.append(img,title);b.addEventListener('click',()=>{pickerDone?.(m.url);$('#mediaPicker').hidden=true;pickerDone=null});area.append(b)}if(!area.children.length)area.append(pick('p','hint','Ainda não há imagens enviadas. Vá em Galeria / Upload.'));$('#mediaPicker').hidden=false}
function imageControl(label,path,note){const d=pick('div','cover-item');d.append(preview(get(path)));d.append(pick('strong','',label),pick('p','',note));const inp=field('URL HTTPS ou assets/nome.jpg',get(path)||'',v=>{set(path,v);updatePreview()}, {placeholder:'https://...'});d.append(inp);const actions=pick('div','cover-item-actions'),choose=pick('button','', 'ESCOLHER DA BIBLIOTECA'),remove=pick('button','','REMOVER');choose.type='button';remove.type='button';function updatePreview(){d.querySelector('.cover-preview').replaceWith(preview(get(path)))}choose.addEventListener('click',()=>openPicker(v=>{set(path,v);inp.querySelector('input').value=v;updatePreview()}));remove.addEventListener('click',()=>{set(path,'');inp.querySelector('input').value='';updatePreview()});actions.append(choose,remove);d.append(actions);return d}
function textEditor(){const area=$('#textEditor');area.replaceChildren();const specs=[['INTRO / TELA DE ENTRADA',[['intro.overline','TEXTO PEQUENO'],['intro.line','FRASE DE IMPACTO'],['intro.note','SUBTÍTULO']]],['CAPA PRINCIPAL',[['hero.eyebrow','TAG'],['hero.line1','TÍTULO — LINHA 1'],['hero.line2','TÍTULO — LINHA 2'],['hero.description','DESCRIÇÃO']]],['SOBRE VOCÊ',[['about.kicker','CATEGORIA'],['about.title','TÍTULO'],['about.description','APRESENTAÇÃO']]],['GALERIA',[['gallery.title','TÍTULO'],['gallery.subtitle','SUBTÍTULO']]],['FRASE EM MOVIMENTO',[['settings.marquee','TEXTO DO LETREIRO']]]];for(const [title,list] of specs){const p=box(title);const g=grid();for(const [path,label] of list)g.append(field(label,get(path),v=>set(path,v),{wide:/(description|marquee|note)/.test(path),multiline:path.endsWith('description'),max:700}));p.append(g);area.append(p)}}
function coverEditor(){const area=$('#coverGrid');area.replaceChildren();for(const [path,name,description] of coverSpecs())area.append(imageControl(name,path,description));$$('#accentOptions button').forEach(b=>b.classList.toggle('selected',b.dataset.color===content.accent))}
function projectEditor(){const area=$('#projectsEditor');area.replaceChildren();(content.projects||[]).forEach((p,i)=>{const d=box('PROJETO '+String(i+1).padStart(2,'0'),p.id);const g=pick('div','project-form');const left=pick('div');const pic=pick('div','project-cover'),img=pick('img');img.src=p.image||p.fallback||'assets/systems-poster.svg';img.alt=p.name;pic.append(img);left.append(pic);const change=pick('button','ghost-btn','TROCAR CAPA');change.type='button';change.style.marginTop='12px';change.addEventListener('click',()=>openPicker(url=>{set(`projects.${i}.image`,url);img.src=url}));left.append(change);const right=pick('div','project-fields');for(const [k,label] of [['name','NOME'],['subtitle','SUBTÍTULO'],['category','CATEGORIA'],['link','LINK DO PROJETO'],['description','DESCRIÇÃO']])right.append(field(label,p[k],v=>set(`projects.${i}.${k}`,v),{wide:k==='description',multiline:k==='description'}));right.append(toggle('MOSTRAR PROJETO',p.active,v=>set(`projects.${i}.active`,v)));g.append(left,right);d.append(g);area.append(d)})}
function gameEditor(){const area=$('#gamesEditor');area.replaceChildren();(content.games||[]).forEach((game,i)=>{const item=box('JOGO '+String(i+1).padStart(2,'0'),game.status);const actions=pick('div','inline-actions');for(const [text,delta] of [['↑ SUBIR',-1],['↓ DESCER',1]]){const b=pick('button','ghost-btn',text);b.type='button';b.disabled=i+delta<0||i+delta>=content.games.length;b.addEventListener('click',()=>{const target=i+delta;[content.games[i],content.games[target]]=[content.games[target],content.games[i]];dirty();gameEditor();});actions.append(b)}const del=pick('button','ghost-btn','✕ EXCLUIR JOGO');del.type='button';del.addEventListener('click',()=>{if(!confirm(`Remover "${game.name}" da lista?`))return;content.games.splice(i,1);dirty();gameEditor()});actions.append(del);item.append(actions);const columns=pick('div','project-form');columns.style.marginTop='24px';const left=pick('div');const pic=pick('div','project-cover'),img=pick('img');img.src=game.image||'assets/forest-poster.svg';img.alt=game.name;pic.append(img);left.append(pic);const choose=pick('button','ghost-btn','SELECIONAR CAPA');choose.type='button';choose.style.marginTop='12px';choose.addEventListener('click',()=>openPicker(v=>{set(`games.${i}.image`,v);img.src=v}));left.append(choose);const f=pick('div','project-fields');for(const [key,label] of [['name','NOME DO JOGO'],['genre','GÊNERO'],['status','STATUS'],['link','LINK ROBLOX'],['description','DESCRIÇÃO'],['image','URL DA CAPA (HTTPS)']]){const a=field(label,game[key],v=>{set(`games.${i}.${key}`,v);if(key==='image')img.src=v||'assets/forest-poster.svg'},{wide:['description','image'].includes(key),multiline:key==='description',max:360});f.append(a)}f.append(toggle('EXIBIR NO SITE',game.visible,v=>set(`games.${i}.visible`,v)));columns.append(left,f);item.append(columns);area.append(item)})}
function skillsEditor(){const area=$('#skillsEditor'),service=$('#servicesEditor');area.replaceChildren();service.replaceChildren();const p=box('LINGUAGENS & TECNOLOGIAS'),g=pick('div','dynamic-list');content.skills.forEach((item,i)=>{const c=pick('div','dynamic-item');c.append(pick('strong','',String(i+1).padStart(2,'0')));for(const [k,title] of [['name','TECNOLOGIA'],['category','CATEGORIA'],['description','HABILIDADE']])c.append(field(title,item[k],v=>set(`skills.${i}.${k}`,v)));g.append(c)});p.append(g);area.append(p);const p2=box('SERVIÇOS'),g2=pick('div','dynamic-list');content.services.forEach((item,i)=>{const c=pick('div','dynamic-item');c.append(pick('strong','',String(i+1).padStart(2,'0')));for(const [k,title] of [['name','SERVIÇO'],['detail','ESPECIALIDADE'],['description','DESCRIÇÃO']])c.append(field(title,item[k],v=>set(`services.${i}.${k}`,v)));g2.append(c)});p2.append(g2);service.append(p2)}
function jottaClubEditor(){
 const area=$('#jottaClubEditor');if(!area||!content)return;
 area.replaceChildren();
 const prices=box('TABELA DE PREÇOS / EDITÁVEL','BRL');prices.append(pick('p','hint','Preço 0 = sob orçamento. Os valores indicados são a partir de, não preços fechados.'));
 const priceRows=pick('div','dynamic-list');(content.pricing||[]).forEach((x,i)=>{
  const item=pick('div','dynamic-item');item.append(pick('strong','',x.id.toUpperCase()));
  for(const [k,title] of [['name','SERVIÇO'],['tag','ETIQUETA'],['description','DESCRIÇÃO']])item.append(field(title,x[k],v=>set('pricing.'+i+'.'+k,v)));
  item.append(field('PREÇO INICIAL (R$)',String(x.from),v=>{const n=Number(v.replace(',','.'));if(Number.isFinite(n)&&n>=0)set('pricing.'+i+'.from',n)}));
  priceRows.append(item);
 });prices.append(priceRows);area.append(prices);
 const plans=box('ASSINATURAS MENSAIS / CLUB VIP','MEMBERSHIP');plans.append(pick('p','hint','Edite o valor, o desconto, o teto de economia por ciclo e as recompensas (separadas por ponto e vírgula).'));
 const vipRows=pick('div','dynamic-list');(content.vipPlans||[]).forEach((x,i)=>{
  const item=pick('div','dynamic-item');item.append(pick('strong','',x.name));
  item.append(field('NOME DO PLANO',x.name,v=>set('vipPlans.'+i+'.name',v)));
  for(const [k,title] of [['monthly','MENSALIDADE (R$)'],['discount','DESCONTO (%)'],['cap','ECONOMIA MÁXIMA POR CICLO (R$)']])item.append(field(title,String(x[k]),v=>{const n=Number(v.replace(',','.'));if(Number.isFinite(n)&&n>=0)set('vipPlans.'+i+'.'+k,n)}));
  item.append(field('RECOMPENSAS (SEPARAR POR ;)',(x.perks||[]).join('; '),v=>set('vipPlans.'+i+'.perks',v.split(';').map(x=>x.trim()).filter(Boolean)),{multiline:true,rows:2}));
  vipRows.append(item);
 });plans.append(vipRows);area.append(plans);
 const boost=box('BENEFÍCIOS PARA BOOSTERS','SERVER BOOST');const b=content.booster||{discount:10,cap:40,perks:[]};
 for(const [k,title] of [['discount','DESCONTO PARA BOOSTERS (%)'],['cap','ECONOMIA MÁXIMA (R$)']])boost.append(field(title,String(b[k]),v=>{const n=Number(v.replace(',','.'));if(Number.isFinite(n)&&n>=0)set('booster.'+k,n)}));
 boost.append(field('RECOMPENSAS (SEPARAR POR ;)',(b.perks||[]).join('; '),v=>set('booster.perks',v.split(';').map(s=>s.trim()).filter(Boolean)),{multiline:true,rows:2}));area.append(boost);
}

function linksEditor(){const area=$('#linksEditor'),visibility=$('#visibilityEditor');area.replaceChildren();visibility.replaceChildren();for(const [k,title] of [['roblox','PERFIL ROBLOX'],['github','GITHUB'],['discord','LINK PERMANENTE DO SERVIDOR DISCORD'],['game','LINK DO JOGO PRINCIPAL'],['contact','EMAIL DE CONTATO OU URL']])area.append(field(title,content.links[k]||'',v=>set(`links.${k}`,v),{placeholder:k==='discord'?'xwjoaolk ou https://discord.gg/...':'https://...'}));for(const [key,text] of [['showAbout','SOBRE MIM'],['showSkills','SKILLS'],['showServices','SERVIÇOS'],['showGallery','GALERIA'],['showGames','CATÁLOGO / TODOS OS JOGOS']])visibility.append(toggle(text,content.settings[key]!==false,v=>set(`settings.${key}`,v)))}
function updateStats(){ $('#statProjects').textContent=String(content.projects.filter(x=>x.active).length).padStart(2,'0');$('#statSkills').textContent=String(content.skills.length).padStart(2,'0');$('#statMedia').textContent=String(media.length).padStart(2,'0');}
function rebuild(){textEditor();projectEditor();gameEditor();skillsEditor();jottaClubEditor();linksEditor();coverEditor();updateStats();populatePlacement()}
async function init(){try{const status=await call('/api/admin/status');if(!status.authenticated)return showLogin();const [result,list]=await Promise.all([call('/api/site'),call('/api/media')]);content=result.content;media=list.items||[];$('#loginScreen').hidden=true;$('#adminApp').hidden=false;clean();rebuild();renderMedia();const siteRecovering=Boolean(result.storage?.readOnly);
$('#storageStatus').textContent=siteRecovering
 ?'⚠ MODO DE RECUPERAÇÃO — A conexão com a tabela site_config no Supabase falhou. Você pode entrar e visualizar o painel, mas não publique alterações ainda. Volte ao SQL Editor, execute o nubank-vip.sql atualizado e recarregue esta página.'
 :status.persistent?'DADOS PERSISTENTES — CLOUDINARY + SUPABASE'
 :`Armazenamento: ${status.uploads} / ${status.settings}. Sem ambos os serviços externos, dados locais podem sumir no Render.`;
$('#saveBtn').disabled=siteRecovering;
if(siteRecovering)toast('Painel reaberto em modo de recuperação. A publicação foi bloqueada até a conexão funcionar.',true);$('#uploadHelp').textContent=status.uploads==='cloudinary'?'Armazenamento externo ativo. Você pode enviar imagens e vídeos para a biblioteca.':'SELEÇÃO DE ARQUIVOS CORRIGIDA. Sem Cloudinary, os uploads ainda podem desaparecer quando o Render reiniciar. As 7 artes novas já vêm instaladas no site e não precisam de upload.';try{const r=await call('/api/roblox-avatar');if(r.full)$('#adminAvatar').src=r.full}catch{}}
catch(e){toast('Erro ao abrir o painel: '+e.message,true);showLogin()}}
function showLogin(){$('#loginScreen').hidden=false;$('#adminApp').hidden=true}
function navigate(page){$$('#adminNav button').forEach(b=>b.classList.toggle('active',b.dataset.page===page));$$('.admin-page').forEach(p=>p.classList.toggle('active',p.dataset.panel===page));$('#pageCrumb').textContent=($(`#adminNav button[data-page="${page}"]`)?.textContent||page).trim();scrollTo({top:0,behavior:'smooth'})}
async function save(){if(!content)return;const b=$('#saveBtn');b.disabled=true;b.textContent='PUBLICANDO...';try{const d=await call('/api/admin/site',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({content})});content=d.content;clean();toast('Alterações publicadas no site!');rebuild();if(!d.persistent)toast('Publicado — configure o Supabase para salvar permanentemente no Render.')}catch(e){toast('Não salvou: '+e.message,true)}finally{b.disabled=false;b.textContent='PUBLICAR ALTERAÇÕES ↗'}}
function populatePlacement(){const s=$('#uploadPlacement'),last=s.value;s.replaceChildren();const n=pick('option','','Apenas galeria');n.value='';s.append(n);for(const [path,name] of coverSpecs()){const o=pick('option','',name);o.value=path;s.append(o)}s.value=last}
async function fetchMedia(){try{media=(await call('/api/media')).items||[];renderMedia();updateStats()}catch(e){toast(e.message,true)}}
function renderMedia(){const wrap=$('#adminMediaList');wrap.replaceChildren();if(!media.length)wrap.append(pick('p','hint','Nenhum arquivo enviado ainda.'));media.forEach(m=>{const d=pick('div','media-entry'),img=pick('img');img.src=m.thumbnail||m.url||'assets/systems-poster.svg';img.alt=m.title||'Mídia';const info=pick('div');info.append(pick('strong','',m.title||'Sem título'),pick('small','',m.category+' / '+m.type));const actions=pick('div','media-entry-actions');if(m.type==='image'){const s=pick('select');const first=pick('option','','USAR COMO CAPA...');first.value='';s.append(first);for(const [path,name] of coverSpecs()){const opt=pick('option','',name);opt.value=path;s.append(opt)}s.addEventListener('change',()=>{if(s.value){set(s.value,m.url);coverEditor();projectEditor();gameEditor();toast('Capa selecionada. Clique em Publicar alterações.')}});actions.append(s)}const del=pick('button','danger','EXCLUIR');del.type='button';del.addEventListener('click',async()=>{if(!confirm(`Excluir a mídia "${m.title}" permanentemente?`))return;try{await call('/api/admin/media/'+encodeURIComponent(m.id),{method:'DELETE'});await fetchMedia();toast('Mídia removida')}catch(e){toast(e.message,true)}});actions.append(del);d.append(img,info,actions);wrap.append(d)})}
$('#loginForm').addEventListener('submit',async e=>{e.preventDefault();const btn=$('#loginBtn');btn.disabled=true;$('#loginError').textContent='';try{await call('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:$('#password').value})});$('#password').value='';await init()}catch(err){$('#loginError').textContent=err.message}finally{btn.disabled=false}});
$('#logoutBtn').addEventListener('click',async()=>{try{await call('/api/admin/logout',{method:'POST'})}finally{showLogin()}});
$$('#adminNav button').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.page)));$('#saveBtn').addEventListener('click',save);
$$('#accentOptions button').forEach(b=>b.addEventListener('click',()=>{set('accent',b.dataset.color);$$('#accentOptions button').forEach(x=>x.classList.toggle('selected',x===b))}));
$('#applyArtPack').addEventListener('click',()=>{const art={'intro.background':'assets/jotta-intro-clean.svg','hero.background':'assets/jotta-developer-workspace.svg','about.image':'assets/jotta-profile-identity.svg','gallery.highlight':'assets/jotta-gallery-board.svg'};for(const [path,value] of Object.entries(art))set(path,value);for(const [id,image] of Object.entries({'hunters':'jotta-hunters-forest.svg','lab':'jotta-systems-lab.svg'})){const i=content.projects.findIndex(p=>p.id===id);if(i>=0)set(`projects.${i}.image`,`assets/${image}`)}const game=content.games.findIndex(g=>g.id==='cacadores'||g.name?.includes('Caçadores'));if(game>=0)set(`games.${game}.image`,'assets/jotta-hunters-forest.svg');coverEditor();projectEditor();gameEditor();toast('Temas JOTTA Developer aplicados! Clique em PUBLICAR ALTERAÇÕES.');});
$('#addGame').addEventListener('click',()=>{content.games.push({id:'game-'+Date.now().toString(36),name:'NOVO JOGO',genre:'Roblox Experience',status:'Em desenvolvimento',description:'',image:'',link:'',visible:true});dirty();gameEditor();navigate('games')});
$('#closePicker').addEventListener('click',()=>{$('#mediaPicker').hidden=true});$('#mediaPicker').addEventListener('click',e=>{if(e.target===$('#mediaPicker'))$('#mediaPicker').hidden=true});
$('#exportBtn').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(content,null,2)],{type:'application/json'}),a=pick('a');a.href=URL.createObjectURL(blob);a.download='jotta-site-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)});
$('#importFile').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{const c=JSON.parse(await f.text());if(!c||!Array.isArray(c.projects)||!c.hero||!c.links)throw Error('Backup inválido');content=c;content.games||=[];dirty();rebuild();toast('Backup importado. Clique em Publicar alterações.')}catch(er){toast(er.message,true)}e.target.value=''});
const file=$('#mediaFile'),zone=$('#dropzone');zone.addEventListener('click',e=>{if(e.target!==file)file.click()});file.addEventListener('click',e=>e.stopPropagation());zone.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();file.click()}});for(const event of ['dragover','dragenter'])zone.addEventListener(event,e=>{e.preventDefault();zone.classList.add('drag')});for(const event of ['dragleave','drop'])zone.addEventListener(event,e=>{e.preventDefault();zone.classList.remove('drag')});zone.addEventListener('drop',e=>{if(e.dataTransfer.files?.length){file.files=e.dataTransfer.files;file.dispatchEvent(new Event('change'))}});

file.addEventListener('change',()=>{
 const files=Array.from(file.files||[]);
 $('#selectedFile').hidden=!files.length;
 if(files.length)$('#selectedFile').textContent=files.length===1
 ?files[0].name+' • '+(files[0].size/1048576).toFixed(1)+' MB'
 :files.length+' ARQUIVOS PRONTOS • '+(files.reduce((n,f)=>n+f.size,0)/1048576).toFixed(1)+' MB';
});
$('#uploadForm').addEventListener('submit',async e=>{
 e.preventDefault();
 const files=Array.from(file.files||[]);
 if(!files.length)return toast('Selecione uma ou mais imagens/vídeos.',true);
 for(const f of files){const max=(f.type.startsWith('video/')?80:15)*1048576;if(f.size>max)return toast('Arquivo '+f.name+' excedeu o limite.',true)}
 const btn=$('#uploadBtn'),bar=$('#uploadBar'),prog=$('#uploadProgress');
 btn.disabled=true;prog.hidden=false;bar.style.width='0%';
 let completed=0,failed=0;
 const titleInput=$('#mediaTitle').value.trim(),singlePlacement=$('#uploadPlacement').value;
 for(const f of files){
   const data=new FormData();data.append('media',f);
   data.append('title',files.length===1&&titleInput?titleInput:f.name.replace(/\.[^.]+$/,'').replace(/[-_]+/g,' ').slice(0,100));
   data.append('description',$('#mediaDescription').value.trim());
   data.append('category',$('#mediaCategory').value);
   $('#uploadStatus').textContent='Enviando '+(completed+failed+1)+' de '+files.length+': '+f.name;
   try{
      const item=await new Promise((resolve,reject)=>{
        const xhr=new XMLHttpRequest();xhr.open('POST','/api/admin/media');
        xhr.upload.onprogress=ev=>{if(ev.lengthComputable)bar.style.width=(((completed+failed)+ev.loaded/ev.total)/files.length*100).toFixed(1)+'%'};
        xhr.onload=()=>{let obj={};try{obj=JSON.parse(xhr.responseText)}catch{}if(xhr.status>=200&&xhr.status<300)resolve(obj.item);else reject(Error(obj.error||'HTTP '+xhr.status))};
        xhr.onerror=()=>reject(Error('Falha de conexão'));
        xhr.send(data);
      });
      completed++;
      if(files.length===1&&singlePlacement&&item?.type==='image'){
        set(singlePlacement,item.url);coverEditor();projectEditor();gameEditor();
      }
   }catch(err){failed++;console.error('Upload:',f.name,err.message);toast('Erro em '+f.name+': '+err.message,true)}
   bar.style.width=((completed+failed)/files.length*100).toFixed(1)+'%';
 }
 btn.disabled=false;
 if(completed){file.value='';$('#selectedFile').hidden=true;await fetchMedia()}
 const message=completed+' de '+files.length+' arquivo(s) publicado(s)'+(failed?' • '+failed+' com erro':'');
 $('#uploadStatus').textContent=message+(singlePlacement&&files.length===1?' • Publique as alterações para aplicar a capa.':'');
 toast(message,failed>0);
});
$('#reloadMedia').addEventListener('click',fetchMedia);addEventListener('beforeunload',e=>{if(changed){e.preventDefault();e.returnValue=''}});init();
})();
