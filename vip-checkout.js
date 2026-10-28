'use strict';
// JOTTA STUDIOS / VIP - somente servidor. Nunca colocar chaves no front-end.
const crypto=require('node:crypto');
const API='https://api.mercadopago.com';
const DISCORD='https://discord.com/api/v10';
const SITE='https://jotta-portfolio-v5.onrender.com';
const GUILD=process.env.DISCORD_GUILD_ID||'1564870796399214703';
const NAMES={start:'💠・VIP START',plus:'💎・VIP PLUS',elite:'🔴・VIP ELITE',prime:'👑・VIP PRIME'};
const COLORS={start:14211288,plus:8896826,elite:14631964,prime:13863766};
const hold=new Map();
const configured=()=>Boolean(process.env.DISCORD_CLIENT_ID&&process.env.DISCORD_CLIENT_SECRET&&process.env.DISCORD_BOT_TOKEN&&process.env.MP_ACCESS_TOKEN&&process.env.MP_WEBHOOK_SECRET&&process.env.SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY&&process.env.SESSION_SECRET&&process.env.VIP_CHECKOUT_ENABLED==='true');
const httpError=(s,n=500)=>Object.assign(new Error(s),{code:n});
const sign=s=>crypto.createHmac('sha256',process.env.SESSION_SECRET||'disabled').update(s).digest('hex');
function token(data){const b=Buffer.from(JSON.stringify(data)).toString('base64url');return b+'.'+sign(b)}
function verify(v){if(!v||typeof v!=='string')return null;const [b,h]=v.split('.');if(!b||!h||h.length!==64)return null;const expect=sign(b);if(!crypto.timingSafeEqual(Buffer.from(h),Buffer.from(expect)))return null;try{const x=JSON.parse(Buffer.from(b,'base64url').toString());return x.exp>Date.now()?x:null}catch{return null}}
function cookie(req,name){const value=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='));if(!value)return '';try{return decodeURIComponent(value.slice(name.length+1))}catch{return ''}}
function putCookie(res,name,val,seconds){res.append('Set-Cookie',name+'='+encodeURIComponent(val)+'; Path=/; Max-Age='+seconds+'; HttpOnly; Secure; SameSite=Lax')}
function user(req){const x=verify(cookie(req,'jotta_vip'));return x&&/^\d{16,22}$/.test(x.id)?x:null}
function origin(req){const o=req.headers.origin;if(o&&o!==SITE)throw httpError('Origem de requisição inválida',403)}
function throttle(req,k,limit=8){const id=k+':'+req.ip,now=Date.now(),row=hold.get(id)||{at:now,n:0};if(now-row.at>60000){row.at=now;row.n=0}row.n++;hold.set(id,row);if(hold.size>3000)hold.clear();if(row.n>limit)throw httpError('Muitas tentativas. Tente novamente em um minuto.',429)}
async function call(url,options={}){
 const r=await fetch(url,{...options,signal:AbortSignal.timeout(12000)});
 if(!r.ok)throw httpError('Integração indisponível ('+r.status+')',502);
 return r.status===204?true:r.json();
}
async function db(path,{method='GET',body,prefer}={}){
 if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY)throw httpError('Armazenamento não configurado',503);
 return call(process.env.SUPABASE_URL.replace(/\/$/,'')+'/rest/v1/'+path,{method,headers:{
  apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY,
  ...(body?{'Content-Type':'application/json'}:{}),...(prefer?{Prefer:prefer}:{})
 },body:body?JSON.stringify(body):undefined});
}
async function mp(path,{method='GET',body}={}){
 if(!process.env.MP_ACCESS_TOKEN)throw httpError('Checkout não configurado',503);
 return call(API+path,{method,headers:{Authorization:'Bearer '+process.env.MP_ACCESS_TOKEN,'Content-Type':'application/json'},
  body:body?JSON.stringify(body):undefined});
}
async function discord(path,method='GET',body){
 const r=await fetch(DISCORD+path,{method,headers:{Authorization:'Bot '+process.env.DISCORD_BOT_TOKEN,
 ...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(8000)});
 if(!r.ok)throw httpError('Discord ('+r.status+') indisponível',502);
 return r.status===204?true:r.json().catch(()=>true);
}
async function roleIds(){
 const roles=await discord('/guilds/'+GUILD+'/roles');
 const map={};
 for(const [plan,name] of Object.entries(NAMES)){
  let r=roles.find(r=>r.name===name);
  if(!r){r=await discord('/guilds/'+GUILD+'/roles','POST',{name,color:COLORS[plan],mentionable:false,hoist:false,permissions:'0'});roles.push(r)}
  map[plan]=r.id;
 }
 return map;
}
async function syncRole(id,plan,remove=false){
 if(!process.env.DISCORD_BOT_TOKEN)return false;
 const roles=await roleIds();
 if(!remove)await discord('/guilds/'+GUILD+'/members/'+id+'/roles/'+roles[plan],'PUT');
 for(const [key,rid] of Object.entries(roles)){
  if(remove||key!==plan){try{await discord('/guilds/'+GUILD+'/members/'+id+'/roles/'+rid,'DELETE')}catch(e){console.warn('VIP role remove',e.message)}}
 }
 return true;
}
function checkSignature(req){
 const h=req.headers['x-signature']||'',r=req.headers['x-request-id']||'';
 const id=String(req.query['data.id']||'').toLowerCase(),secret=process.env.MP_WEBHOOK_SECRET||'';
 if(!id||!r||!secret||typeof h!=='string')return false;
 const parts=Object.fromEntries(h.split(',').map(x=>x.trim().split('=')));
 if(!parts.ts||!/^[0-9a-f]{64}$/i.test(parts.v1||''))return false;
 const manifest='id:'+id+';request-id:'+r+';ts:'+parts.ts+';';
 const hash=crypto.createHmac('sha256',secret).update(manifest).digest('hex');
 return crypto.timingSafeEqual(Buffer.from(hash),Buffer.from(parts.v1.toLowerCase()));
}
function publicFail(res,e){console.error('[JOTTA VIP]',e.message);res.status(e.code||500).json({error:e.code&&e.code<500?e.message:'Serviço temporariamente indisponível.'})}
function safeCheckout(u){
 try{const x=new URL(u);return x.protocol==='https:'&&(x.hostname==='mercadopago.com.br'||x.hostname.endsWith('.mercadopago.com.br'))?u:null}catch{return null}
}
async function settle(payment){
 const orderId=String(payment.external_reference||'');
 if(!/^[0-9a-f-]{36}$/i.test(orderId))return;
 const rows=await db('vip_orders?id=eq.'+encodeURIComponent(orderId)+'&select=*');
 const o=rows?.[0];if(!o)return;
 if(payment.currency_id!=='BRL'||Number(payment.transaction_amount)!==Number(o.amount)||!['pix','account_money'].includes(payment.payment_method_id))throw httpError('Pagamento inconsistente',409);
 if(payment.status==='approved'&&payment.live_mode===true){
  const rows=await db('rpc/jotta_vip_approve',{method:'POST',body:{p_order:orderId,p_payment:String(payment.id)},prefer:'return=representation'});
  const item=Array.isArray(rows)?rows[0]:null;
  if(item?.plan_id)try{await syncRole(o.discord_user_id,item.plan_id)}catch(e){console.warn('[JOTTA VIP ROLE]',e.message)}
 }else if(['refunded','charged_back'].includes(payment.status)){
  await db('rpc/jotta_vip_refund',{method:'POST',body:{p_order:orderId},prefer:'return=minimal'});
  const list=await db('vip_memberships?discord_user_id=eq.'+encodeURIComponent(o.discord_user_id)+'&select=valid_until');
  if(!list?.[0]||new Date(list[0].valid_until).getTime()<Date.now())try{await syncRole(o.discord_user_id,o.plan_id,true)}catch{}
 }else if(o.status!=='approved'){
  await db('vip_orders?id=eq.'+orderId,{method:'PATCH',body:{status:['pending','rejected','cancelled'].includes(payment.status)?payment.status:'pending'},prefer:'return=minimal'});
 }
}
module.exports=function mountVip(app,{readSite}){
 app.get('/api/vip/config',async(req,res)=>{try{const site=await readSite();res.set('Cache-Control','no-store');res.json({
  configured:configured(),loginReady:Boolean(process.env.DISCORD_CLIENT_ID&&process.env.DISCORD_CLIENT_SECRET),
  plans:site.vipPlans||[],renewal:'manual',provider:'Mercado Pago Checkout Pro'
 })}catch(e){publicFail(res,e)}});
 app.get('/api/vip/login',(req,res)=>{try{
  if(!process.env.DISCORD_CLIENT_ID||!process.env.DISCORD_CLIENT_SECRET)return res.redirect('/club.html?status=setup');
  throttle(req,'login');
  const state=token({nonce:crypto.randomBytes(12).toString('hex'),exp:Date.now()+600000});
  putCookie(res,'jotta_oauth_state',state,600);
  const q=new URLSearchParams({client_id:process.env.DISCORD_CLIENT_ID,redirect_uri:SITE+'/api/vip/callback',response_type:'code',scope:'identify',state});
  res.redirect('https://discord.com/oauth2/authorize?'+q);
 }catch(e){res.redirect('/club.html?status=error')}});
 app.get('/api/vip/callback',async(req,res)=>{try{
  const state=cookie(req,'jotta_oauth_state');putCookie(res,'jotta_oauth_state','',0);
  if(!verify(state)||req.query.state!==state||typeof req.query.code!=='string')throw httpError('Login inválido',401);
  const body=new URLSearchParams({client_id:process.env.DISCORD_CLIENT_ID,client_secret:process.env.DISCORD_CLIENT_SECRET,grant_type:'authorization_code',code:req.query.code,redirect_uri:SITE+'/api/vip/callback'});
  const auth=await call(DISCORD+'/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body.toString()});
  const profile=await call(DISCORD+'/users/@me',{headers:{Authorization:'Bearer '+auth.access_token}});
  if(!/^\d{16,22}$/.test(profile.id))throw httpError('Conta inválida',401);
  putCookie(res,'jotta_vip',token({id:profile.id,name:String(profile.global_name||profile.username).slice(0,50),exp:Date.now()+7*86400000}),7*86400);
  res.redirect('/club.html?status=login');
 }catch(e){console.warn('VIP OAuth:',e.message);res.redirect('/club.html?status=error')}});
 app.post('/api/vip/logout',(req,res)=>{putCookie(res,'jotta_vip','',0);res.json({ok:true})});
 app.get('/api/vip/me',async(req,res)=>{try{
  const u=user(req);if(!u)return res.json({authenticated:false});
  const rows=process.env.SUPABASE_URL?await db('vip_memberships?discord_user_id=eq.'+u.id+'&select=plan_id,valid_until&limit=1'):[];
  const active=rows?.[0]&&new Date(rows[0].valid_until).getTime()>Date.now();
  res.set('Cache-Control','no-store').json({authenticated:true,user:{name:u.name,id:u.id},membership:active?rows[0]:null});
 }catch(e){publicFail(res,e)}});
 app.post('/api/vip/checkout',async(req,res)=>{try{
  origin(req);throttle(req,'checkout',4);const u=user(req);
  if(!u)return res.status(401).json({error:'Faça login com Discord primeiro.'});
  if(!configured())return res.status(503).json({error:'Checkout aguardando configuração da conta de recebimento autorizada.'});
  const site=await readSite(),p=site.vipPlans?.find(x=>x.id===req.body?.planId);
  if(!p)throw httpError('Plano indisponível',400);
  const amount=Number(p.monthly);if(!Number.isFinite(amount)||amount<1||amount>1000)throw httpError('Valor inválido',400);
  const orderId=crypto.randomUUID(),row={id:orderId,discord_user_id:u.id,plan_id:p.id,amount,status:'created'};
  await db('vip_orders',{method:'POST',body:row,prefer:'return=representation'});
  const pref=await mp('/checkout/preferences',{method:'POST',body:{
   items:[{id:p.id,title:'JOTTA STUDIOS - '+p.name+' (30 dias)',quantity:1,unit_price:amount,currency_id:'BRL'}],
   external_reference:orderId,
   statement_descriptor:'JOTTA STUDIOS',
   back_urls:{success:SITE+'/club.html?status=return',pending:SITE+'/club.html?status=pending',failure:SITE+'/club.html?status=failed'},
   auto_return:'approved'
  }});
  const url=safeCheckout(pref.init_point);
  if(!url)throw httpError('Link de pagamento não validado',502);
  await db('vip_orders?id=eq.'+orderId,{method:'PATCH',body:{preference_id:pref.id,status:'pending'},prefer:'return=minimal'});
  res.set('Cache-Control','no-store').json({url,orderId});
 }catch(e){publicFail(res,e)}});
 app.post('/api/vip/webhook',async(req,res)=>{try{
  throttle(req,'webhook',80);
  if(!checkSignature(req))return res.sendStatus(401);
  const id=String(req.query['data.id']||'');if(!/^\d{3,25}$/.test(id))return res.sendStatus(200);
  const pay=await mp('/v1/payments/'+id);
  await settle(pay);res.sendStatus(200);
 }catch(e){console.error('VIP webhook:',e.message);res.sendStatus(503)}});
 app.post('/api/vip/sweep',async(req,res)=>{try{
  const secret=process.env.VIP_SWEEP_SECRET||'',auth=(req.headers.authorization||'').replace(/^Bearer /,'');
  if(secret.length<24||auth.length!==secret.length||!crypto.timingSafeEqual(Buffer.from(secret),Buffer.from(auth)))return res.sendStatus(403);
  const rows=await db('vip_memberships?valid_until=lt.'+encodeURIComponent(new Date().toISOString())+'&select=discord_user_id,plan_id&limit=100');
  for(const row of rows||[])try{await syncRole(row.discord_user_id,row.plan_id,true)}catch{}
  res.json({ok:true,checked:rows?.length||0});
 }catch(e){publicFail(res,e)}});
};
