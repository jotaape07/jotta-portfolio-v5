'use strict';
require('dotenv').config();
const express=require('express'), multer=require('multer'), crypto=require('node:crypto'), fs=require('node:fs/promises'), path=require('node:path');
const {v2:cloudinary}=require('cloudinary');
const app=express(), ROOT=__dirname, PUB=path.join(ROOT,'public'), UPLOADS=path.join(ROOT,'data','uploads'), DB=path.join(ROOT,'data','media.json'), SITE_DB=path.join(ROOT,'data','site.json');
const DEFAULT=require('./content-default.json');
const CLOUD=Boolean(process.env.CLOUDINARY_CLOUD_NAME&&process.env.CLOUDINARY_API_KEY&&process.env.CLOUDINARY_API_SECRET);
const SUPA=Boolean(process.env.SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY);
const PASS=process.env.ADMIN_PASSWORD||'';
const SECRET=process.env.SESSION_SECRET||crypto.randomBytes(32).toString('hex');
const PROD=process.env.NODE_ENV==='production';
if(PROD&&(!PASS||SECRET.length<32)){console.error('Configure ADMIN_PASSWORD e SESSION_SECRET (32+ caracteres).');process.exit(1)}
if(CLOUD)cloudinary.config({cloud_name:process.env.CLOUDINARY_CLOUD_NAME,api_key:process.env.CLOUDINARY_API_KEY,api_secret:process.env.CLOUDINARY_API_SECRET,secure:true});
app.disable('x-powered-by');app.set('trust proxy',1);app.use(express.json({limit:'140kb'}));
app.use((req,res,next)=>{res.set({'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'strict-origin-when-cross-origin'});next()});
app.use('/uploads',express.static(UPLOADS,{fallthrough:false,maxAge:'1h'}));app.use(express.static(PUB,{maxAge:0}));
app.get('/admin',(req,res)=>res.sendFile(path.join(PUB,'admin.html')));
app.get('/health',(req,res)=>res.json({ok:true,uploads:CLOUD?'cloudinary':'local',content:SUPA?'supabase':'local'}));
function sign(v){return crypto.createHmac('sha256',SECRET).update(v).digest('base64url')}
function equal(a,b){const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&crypto.timingSafeEqual(x,y)}
function authed(req){const cookie=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('jotta_sid='));if(!cookie)return false;const [ts,sig]=cookie.slice(10).split('.');const expiry=Number(ts);return Number.isFinite(expiry)&&expiry>Date.now()&&expiry<Date.now()+8*86400000&&equal(sig||'',sign(ts||''))}
function requireAuth(req,res,next){if(!authed(req))return res.status(401).json({error:'Sessão expirada. Entre novamente.'});next()}
function guard(req,res,next){if(!['POST','PUT','PATCH','DELETE'].includes(req.method))return next();const origin=req.headers.origin;if(origin){try{if(new URL(origin).host!==req.headers.host)return res.status(403).json({error:'Origem inválida.'})}catch{return res.status(403).json({error:'Origem inválida.'})}}next()}
app.use('/api/admin',guard);
const attempts=new Map();app.post('/api/admin/login',(req,res)=>{const ip=req.ip,item=attempts.get(ip)||{n:0,blocked:0};if(item.blocked>Date.now())return res.status(429).json({error:'Muitas tentativas; tente depois.'});if(!PASS)return res.status(503).json({error:'Configure ADMIN_PASSWORD no servidor.'});if(!equal(req.body?.password||'',PASS)){item.n++;if(item.n>=6){item.n=0;item.blocked=Date.now()+15*60*1000}attempts.set(ip,item);return res.status(401).json({error:'Senha incorreta.'})}attempts.delete(ip);const expires=String(Date.now()+7*86400000);res.cookie('jotta_sid',expires+'.'+sign(expires),{httpOnly:true,secure:PROD,sameSite:'strict',path:'/',maxAge:7*86400000});res.json({ok:true})});
app.post('/api/admin/logout',requireAuth,(req,res)=>{res.clearCookie('jotta_sid',{path:'/',sameSite:'strict',secure:PROD});res.json({ok:true})});
app.get('/api/admin/status',(req,res)=>res.json({authenticated:authed(req),uploads:CLOUD?'cloudinary':'local',settings:SUPA?'supabase':'local',persistent:CLOUD&&SUPA,loginEnabled:!!PASS}));
const clone=x=>JSON.parse(JSON.stringify(x));
function clean(v,len=200){return String(v??'').trim().replace(/[<>]/g,'').slice(0,len)}
function url(v){const s=clean(v,1000);if(!s)return '';if(/^https:\/\//i.test(s))return s;if(/^(assets\/|\/uploads\/)/.test(s)&&!s.includes('..'))return s;return ''}
function extLink(v){const s=clean(v,1000);return /^https:\/\//i.test(s)?s:''}
function normalize(doc){const d=clone(DEFAULT),c=doc&&typeof doc==='object'&&!Array.isArray(doc)?doc:{};
 d.accent=c.accent==='red'?'red':'yellow';d.brand=clean(c.brand||d.brand,32);
 for(const field of ['intro','hero','about','gallery']){const obj=c[field]||{};for(const key in d[field]){if(typeof d[field][key]==='string')d[field][key]=key.toLowerCase().includes('background')||key==='image'||key==='highlight'?url(obj[key]??d[field][key]):clean(obj[key]??d[field][key],key==='description'?700:160);else if(typeof d[field][key]==='boolean')d[field][key]=Boolean(obj[key]??d[field][key])}}
 for(const key in d.links){
  const v=c.links?.[key]??d.links[key];
  if(key==='discord')d.links[key]=extLink(v)||clean(v,80).replace(/^@/,'');
  else if(key==='contact'){const value=clean(v,120);d.links[key]=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)?value:extLink(value);}
  else d.links[key]=extLink(v);
 }
 d.projects=d.projects.map((p,i)=>{const v=c.projects?.find?.(x=>x.id===p.id)||c.projects?.[i]||{};return {...p,name:clean(v.name??p.name,70),subtitle:clean(v.subtitle??p.subtitle,80),description:clean(v.description??p.description,360),category:clean(v.category??p.category,50),image:url(v.image??p.image),link:extLink(v.link??p.link),active:v.active===undefined?p.active:Boolean(v.active)}});
 if(Array.isArray(c.games))d.games=c.games.slice(0,60).filter(v=>v&&typeof v==='object').map((v,i)=>({id:clean(v.id||('game-'+i),60)||('game-'+i),name:clean(v.name||'Novo jogo',90),genre:clean(v.genre||'Roblox Experience',55),status:clean(v.status||'Em desenvolvimento',42),description:clean(v.description,360),image:url(v.image),link:extLink(v.link),visible:v.visible!==false}));
 if(Array.isArray(c.skills))d.skills=d.skills.map((s,i)=>({...s,...Object.fromEntries(['name','category','description'].map(k=>[k,clean(c.skills?.[i]?.[k]??s[k],120)]))}));
 if(Array.isArray(c.services))d.services=d.services.map((s,i)=>({...s,...Object.fromEntries(['name','description','detail'].map(k=>[k,clean(c.services?.[i]?.[k]??s[k],240)]))}));
 // Catálogo editável com preços e planos VIP limitados e saneados.
 const catalog=Array.isArray(c.pricing)?c.pricing:[];
 d.pricing=DEFAULT.pricing.map((item,i)=>{const v=catalog.find(x=>x?.id===item.id)||catalog[i]||{};const n=Number(v.from??item.from);
  return {id:item.id,name:clean(v.name??item.name,70),description:clean(v.description??item.description,220),tag:clean(v.tag??item.tag,30),from:Number.isFinite(n)?Math.min(100000,Math.max(0,Math.round(n*100)/100)):item.from};
 });
 const plans=Array.isArray(c.vipPlans)?c.vipPlans:[];
 d.vipPlans=DEFAULT.vipPlans.map((item,i)=>{const v=plans.find(x=>x?.id===item.id)||plans[i]||{};
  const monthly=Number(v.monthly??item.monthly),discount=Number(v.discount??item.discount),cap=Number(v.cap??item.cap);
  const perks=Array.isArray(v.perks)?v.perks:item.perks;
  return {id:item.id,name:clean(v.name??item.name,40),color:item.color,
   monthly:Number.isFinite(monthly)?Math.min(1000,Math.max(0,Math.round(monthly*100)/100)):item.monthly,
   discount:Number.isFinite(discount)?Math.min(35,Math.max(0,Math.round(discount))):item.discount,
   cap:Number.isFinite(cap)?Math.min(500,Math.max(0,Math.round(cap))):item.cap,
   perks:perks.slice(0,5).map(p=>clean(p,110)).filter(Boolean)};
 });
 const boost=c.booster||{};const bp=Array.isArray(boost.perks)?boost.perks:DEFAULT.booster.perks;
 const bd=Number(boost.discount??DEFAULT.booster.discount),bc=Number(boost.cap??DEFAULT.booster.cap);
 d.booster={discount:Number.isFinite(bd)?Math.min(25,Math.max(0,Math.round(bd))):DEFAULT.booster.discount,
 cap:Number.isFinite(bc)?Math.min(200,Math.max(0,Math.round(bc))):DEFAULT.booster.cap,
 perks:bp.slice(0,5).map(x=>clean(x,110)).filter(Boolean)};
 if(['xwjoaolk','@xwjoaolk'].includes(d.links.discord))d.links.discord='https://discord.gg/Bds2pxD7qd';
 for(const k in d.settings){if(typeof d.settings[k]==='boolean')d.settings[k]=Boolean(c.settings?.[k]??d.settings[k]);else d.settings[k]=clean(c.settings?.[k]??d.settings[k],220)}return d;
}
async function localFile(file,fallback){try{return JSON.parse(await fs.readFile(file,'utf8'))}catch{return clone(fallback)}}
async function writeFile(file,obj){await fs.mkdir(path.dirname(file),{recursive:true});const temp=file+'.tmp-'+process.pid;await fs.writeFile(temp,JSON.stringify(obj,null,2));await fs.rename(temp,file)}
async function supa(pathname,method='GET',body){const base=process.env.SUPABASE_URL.replace(/\/$/,'');const r=await fetch(`${base}/rest/v1/${pathname}`,{method,headers:{'apikey':process.env.SUPABASE_SERVICE_ROLE_KEY,'Authorization':`Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=representation'},...(body?{body:JSON.stringify(body)}:{}) ,signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Banco de dados indisponível: '+r.status);return r.json()}
async function readSite(){if(!SUPA)return normalize(await localFile(SITE_DB,DEFAULT));const rows=await supa('site_config?select=content&id=eq.main&limit=1');return normalize(rows[0]?.content||DEFAULT)}
async function saveSite(obj){const doc=normalize(obj);if(SUPA)await supa('site_config?on_conflict=id','POST',[{id:'main',content:doc,updated_at:new Date().toISOString()}]);else await writeFile(SITE_DB,doc);return doc}

/* Avisos do portfólio no Discord: webhook privado armazenado apenas no Render. */
async function notifyDiscord(title,description,link){
 const webhook=process.env.DISCORD_UPDATES_WEBHOOK_URL||'';
 if(!/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+$/.test(webhook))return false;
 const payload={username:'JOTTA STUDIOS • NOVIDADES',allowed_mentions:{parse:[]},
  embeds:[{title:String(title).slice(0,200),description:String(description).slice(0,1200),url:link||'https://jotta-portfolio-v5.onrender.com/',
   color:15749955,footer:{text:'JOTTA STUDIOS | PORTFÓLIO • ATUALIZAÇÕES'},timestamp:new Date().toISOString()}]};
 try{const r=await fetch(webhook,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(5000)});
  if(!r.ok)throw Error('Discord HTTP '+r.status);return true;
 }catch(e){console.error('[JOTTA DISCORD]',e.message);return false}
}
function diffForDiscord(before,after){
 const notes=[];
 if(JSON.stringify(before.pricing)!==JSON.stringify(after.pricing))notes.push('💰 Tabela de preços atualizada');
 if(JSON.stringify(before.vipPlans)!==JSON.stringify(after.vipPlans)||JSON.stringify(before.booster)!==JSON.stringify(after.booster))notes.push('💎 Planos VIP ou benefícios dos boosters atualizados');
 if(JSON.stringify(before.projects)!==JSON.stringify(after.projects))notes.push('🧩 Portfólio de projetos atualizado');
 if(JSON.stringify(before.games)!==JSON.stringify(after.games))notes.push('🎮 Catálogo de jogos atualizado');
 if(JSON.stringify(before.services)!==JSON.stringify(after.services))notes.push('⚙️ Serviços do estúdio atualizados');
 if(JSON.stringify(before.gallery)!==JSON.stringify(after.gallery))notes.push('🖼️ Apresentação da galeria atualizada');
 if(JSON.stringify(before.hero)!==JSON.stringify(after.hero)||JSON.stringify(before.about)!==JSON.stringify(after.about))notes.push('✨ Apresentação visual atualizada');
 if(JSON.stringify(before.links)!==JSON.stringify(after.links))notes.push('🔗 Informações e links atualizados');
 if(!notes.length&&JSON.stringify(before)!==JSON.stringify(after))notes.push('✨ Melhorias publicadas no portfólio');
 return notes;
}

app.get('/api/site',async(req,res)=>{try{res.set('Cache-Control','no-store');res.json({content:await readSite()})}catch(e){console.error(e);res.status(503).json({error:'Não foi possível carregar o conteúdo.'})}});
app.put('/api/admin/site',requireAuth,async(req,res)=>{try{
 const previous=await readSite(),result=await saveSite(req.body?.content);
 const notes=diffForDiscord(previous,result);
 let discordNotified=false;
 if(notes.length)discordNotified=await notifyDiscord('🚀 NOVA ATUALIZAÇÃO NO PORTFÓLIO',notes.join('\\n'),'https://jotta-portfolio-v5.onrender.com/');
 res.json({ok:true,content:result,persistent:SUPA,discordNotified,discordConfigured:!!process.env.DISCORD_UPDATES_WEBHOOK_URL});
 }catch(e){console.error(e);res.status(503).json({error:'Falha ao salvar. Confira o Supabase.'})}});
const ROBLOX_ID='1729771980',AVATAR_TTL=4*60000,avatarCache={at:0,value:null};
app.get('/api/roblox-avatar',async(req,res)=>{res.set('Cache-Control','no-store');if(avatarCache.value&&Date.now()-avatarCache.at<AVATAR_TTL)return res.json(avatarCache.value);
 try{const prefix='https://thumbnails.roblox.com/v1/users/',suffix=`?userIds=${ROBLOX_ID}&size=420x420&format=Png&isCircular=false`;
  const [full,head]=await Promise.all(['avatar','avatar-headshot'].map(async e=>{const r=await fetch(prefix+e+suffix,{signal:AbortSignal.timeout(6000)});if(!r.ok)throw Error('Roblox '+r.status);return r.json()}));
  const get=j=>j?.data?.find?.(x=>x.targetId===Number(ROBLOX_ID)&&x.state==='Completed')?.imageUrl||'';
  if(!get(full))throw Error('Avatar não disponível');avatarCache.value={id:ROBLOX_ID,full:get(full),head:get(head)||get(full),profile:'https://www.roblox.com/pt/users/'+ROBLOX_ID+'/profile',updatedAt:new Date().toISOString()};avatarCache.at=Date.now();res.json(avatarCache.value)
 }catch(e){console.error('Avatar:',e.message);if(avatarCache.value)return res.json({...avatarCache.value,stale:true});res.status(503).json({error:'Avatar temporariamente indisponível',id:ROBLOX_ID})}
});
const allowed=new Set(['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']);
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:80*1048576,files:1},fileFilter:(req,file,cb)=>cb(null,allowed.has(file.mimetype))});
const categories=new Set(['projetos','gameplay','mapas','sistemas','interfaces','bastidores','capas','videos']);
function normalizeCloud(r){return {id:r.public_id,title:r.context?.custom?.caption||r.context?.caption||'Arquivo',description:r.context?.custom?.description||'',category:r.context?.custom?.category||'projetos',type:r.resource_type,url:r.secure_url,thumbnail:r.resource_type==='video'?cloudinary.url(r.public_id,{secure:true,resource_type:'video',format:'jpg',transformation:[{start_offset:0,width:800,crop:'limit'}]}):r.secure_url,date:r.created_at,storage:'cloudinary'}}
async function allMedia(){if(!CLOUD)return localFile(DB,[]);const rows=[];for(const resource_type of ['image','video']){let cursor;do{const p=await cloudinary.api.resources({resource_type,type:'upload',prefix:'jotta_portfolio_v5/',max_results:100,context:true,...(cursor?{next_cursor:cursor}:{})});rows.push(...p.resources.map(normalizeCloud));cursor=p.next_cursor}while(cursor&&rows.length<400)}return rows.sort((a,b)=>new Date(b.date)-new Date(a.date))}
app.get('/api/media',async(req,res)=>{try{res.set('Cache-Control','no-store');res.json({items:await allMedia()})}catch(e){console.error(e);res.status(503).json({error:'Galeria temporariamente indisponível'})}});
app.post('/api/admin/media',requireAuth,upload.single('media'),async(req,res)=>{try{if(!req.file)return res.status(400).json({error:'Selecione uma imagem ou vídeo válido.'});const type=req.file.mimetype.startsWith('video/')?'video':'image';if(type==='image'&&req.file.size>15*1048576)return res.status(413).json({error:'Imagem deve ter até 15 MB'});const title=clean(req.body.title,100)||'Mídia sem título',description=clean(req.body.description,250),category=categories.has(req.body.category)?req.body.category:'projetos';let item;
 if(CLOUD){const result=await new Promise((resolve,reject)=>{const stream=cloudinary.uploader.upload_stream({folder:'jotta_portfolio_v5',resource_type:type,context:{caption:title,description,category}},(err,r)=>err?reject(err):resolve(r));stream.end(req.file.buffer)});item=normalizeCloud({...result,context:{custom:{caption:title,description,category}}})}
 else{const ext=({'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','image/gif':'.gif','video/mp4':'.mp4','video/webm':'.webm','video/quicktime':'.mov'})[req.file.mimetype];const name=crypto.randomUUID()+ext;await fs.mkdir(UPLOADS,{recursive:true});await fs.writeFile(path.join(UPLOADS,name),req.file.buffer);item={id:name,title,description,category,type,url:'/uploads/'+name,thumbnail:type==='image'?'/uploads/'+name:'',date:new Date().toISOString(),storage:'local'};const rows=await allMedia();rows.unshift(item);await writeFile(DB,rows)}
 await notifyDiscord(type==='video'?'🎬 NOVO VÍDEO DE SISTEMA':'🖼️ NOVA IMAGEM NO PORTFÓLIO',`**${title}**\n${description||'Novo trabalho adicionado à vitrine.'}`,'https://jotta-portfolio-v5.onrender.com/#media');
 res.status(201).json({item})
 }catch(e){console.error(e);res.status(500).json({error:'Falha no upload. Verifique as configurações.'})}});
app.delete('/api/admin/media/:id',requireAuth,async(req,res)=>{try{const all=await allMedia(),item=all.find(x=>x.id===req.params.id);if(!item)return res.status(404).json({error:'Mídia não encontrada'});if(CLOUD)await cloudinary.uploader.destroy(item.id,{resource_type:item.type,invalidate:true});else{await writeFile(DB,all.filter(x=>x.id!==item.id));await fs.unlink(path.join(UPLOADS,path.basename(item.url))).catch(()=>{})}res.json({ok:true})}catch(e){console.error(e);res.status(500).json({error:'Falha ao excluir mídia'})}});
require('./vip-checkout')(app,{readSite});
app.use((err,req,res,next)=>{if(err instanceof multer.MulterError)return res.status(413).json({error:'Arquivo excedeu o limite de 80 MB.'});console.error(err);res.status(500).json({error:'Erro interno'})});
app.listen(process.env.PORT||3000,()=>console.log(`JOTTA V5 na porta ${process.env.PORT||3000} | mídia ${CLOUD?'Cloudinary':'local'} | conteúdo ${SUPA?'Supabase':'local'}`));
