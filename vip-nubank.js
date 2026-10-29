'use strict';
// JOTTA STUDIOS — pagamento Pix DIRETO para Nubank, com confirmação HUMANA no banco.
// A ação "Já paguei" NÃO comprova pagamento nem libera privilégios.
// O servidor não recebe nem armazena CPF, fotos ou dados pessoais do pagador.
const crypto=require('node:crypto');
const DISCORD='https://discord.com/api/v10';
const SITE=(process.env.PUBLIC_SITE_URL||'https://jotta-portfolio-v5.onrender.com').replace(/\/$/,'');
const GUILD=process.env.DISCORD_GUILD_ID||'1564870796399214703';
const PLAN_ROLES={start:'💠・VIP START',plus:'💎・VIP PLUS',elite:'🔴・VIP ELITE',prime:'👑・VIP PRIME'};
const COLORS={start:14211288,plus:8896826,elite:14631964,prime:13863766};
const attempts=new Map();
const fail=(message,status=500)=>Object.assign(new Error(message),{status});
const clean=(v,max=160)=>String(v||'').trim().slice(0,max);
function setup(){
 return {oauth:!!(process.env.DISCORD_CLIENT_ID&&process.env.DISCORD_CLIENT_SECRET&&process.env.SESSION_SECRET),
 database:!!(process.env.SUPABASE_URL&&(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY)),
 discord:!!process.env.DISCORD_BOT_TOKEN,
 enabled:process.env.NUBANK_MANUAL_ENABLED==='true'};
}
function operational(){const c=setup();return c.oauth&&c.database&&c.discord&&c.enabled;}
function sign(v){return crypto.createHmac('sha256',process.env.SESSION_SECRET||'disabled').update(v).digest('hex')}
function token(obj){const part=Buffer.from(JSON.stringify(obj)).toString('base64url');return part+'.'+sign(part)}
function verify(value){
 if(!process.env.SESSION_SECRET||typeof value!=='string'||value.length>1800)return null;
 const [part,hash]=value.split('.');if(!part||!hash||hash.length!==64)return null;
 const expect=sign(part);if(!crypto.timingSafeEqual(Buffer.from(expect),Buffer.from(hash)))return null;
 try{const data=JSON.parse(Buffer.from(part,'base64url').toString('utf8'));
  return Number.isFinite(data.exp)&&data.exp>Date.now()?data:null;}catch{return null}
}
function cookie(req,name){
 const raw=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='));
 if(!raw)return '';try{return decodeURIComponent(raw.slice(name.length+1))}catch{return ''}
}
function session(req){
 const u=verify(cookie(req,'jotta_vip'));return u&&/^\d{16,22}$/.test(u.id)?u:null;
}
function setCookie(res,name,value,seconds){
 res.append('Set-Cookie',name+'='+encodeURIComponent(value)+'; Path=/; Max-Age='+seconds+'; HttpOnly; Secure; SameSite=Lax');
}
function csrf(req){
 const origin=req.headers.origin;
 if(origin){try{if(new URL(origin).host!==req.get('host'))throw new Error('cross-host')}
  catch{throw fail('Origem da solicitação inválida.',403)}}
 if(req.headers['sec-fetch-site']==='cross-site')throw fail('Origem não permitida.',403);
}
function throttle(req,type,max=12){
 const key=type+':'+req.ip,now=Date.now(),record=attempts.get(key)||{at:now,count:0};
 if(now-record.at>60000){record.at=now;record.count=0}
 record.count++;attempts.set(key,record);
 if(attempts.size>5000){for(const [key,val] of attempts)if(now-val.at>120000)attempts.delete(key)}
 if(record.count>max)throw fail('Muitas tentativas. Tente novamente em um minuto.',429);
}
function sendError(res,e){
 console.error('[JOTTA NUBANK VIP]',e.message);
 res.status(e.status||500).json({error:e.status&&e.status<500?e.message:'Falha temporária. Tente novamente ou contate a equipe.'});
}
async function db(path,method='GET',body,prefer){
 if(!setup().database)throw fail('Armazenamento de assinaturas ainda não configurado.',503);
 const secret=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 const headers={apikey:secret,Accept:'application/json'};
 if(!secret.startsWith('sb_secret_'))headers.Authorization='Bearer '+secret;
 if(body!==undefined)headers['Content-Type']='application/json';
 if(prefer)headers.Prefer=prefer;
 const endpoint=new URL(String(process.env.SUPABASE_URL||'').trim());
 if(endpoint.protocol!=='https:')throw fail('URL do Supabase inválida.',503);
 const response=await fetch(endpoint.origin+'/rest/v1/'+path,{
  method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
 if(!response.ok){console.error('[VIP DATABASE] HTTP',response.status,path.split('?')[0]);throw fail('Falha no banco de dados.',503)}
 const content=await response.text();if(!content)return [];
 try{return JSON.parse(content)}catch{throw fail('Resposta inesperada do banco.',503)}
}
async function discord(path,method='GET',body){
 const response=await fetch(DISCORD+path,{method,
  headers:{Authorization:'Bot '+process.env.DISCORD_BOT_TOKEN,...(body?{'Content-Type':'application/json'}:{})},
  body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(10000)});
 if(!response.ok){console.error('[VIP DISCORD] HTTP',response.status);throw fail('Não foi possível sincronizar o cargo no Discord.',503)}
 if(response.status===204)return true;
 return response.json().catch(()=>true);
}
async function roleIDs(){
 const rows=await discord('/guilds/'+GUILD+'/roles');
 const ids={};for(const [plan,name] of Object.entries(PLAN_ROLES)){
  let role=rows.find(x=>x.name===name);
  if(!role)role=await discord('/guilds/'+GUILD+'/roles','POST',{name,color:COLORS[plan],permissions:'0',hoist:false,mentionable:false});
  ids[plan]=role.id;
 }
 return ids;
}
async function syncRole(discordId,plan,removeAll=false){
 if(!/^\d{16,22}$/.test(discordId))throw fail('Conta Discord inválida.',400);
 const roles=await roleIDs();
 if(!removeAll){
  if(!roles[plan])throw fail('Plano VIP não encontrado.',400);
  await discord('/guilds/'+GUILD+'/members/'+discordId+'/roles/'+roles[plan],'PUT');
 }
 for(const [id,roleId] of Object.entries(roles)){
  if(removeAll||id!==plan)await discord('/guilds/'+GUILD+'/members/'+discordId+'/roles/'+roleId,'DELETE');
 }
 return true;
}
function requireCustomer(req,res,next){
 const u=session(req);if(!u)return res.status(401).json({error:'Conecte sua conta Discord para continuar.'});
 req.vipUser=u;next();
}
async function staffNotify(description){
 const url=process.env.DISCORD_VIP_STAFF_WEBHOOK_URL||'';
 if(!/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+$/.test(url))return;
 try{await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
  username:'JOTTA STUDIOS · VIP',allowed_mentions:{parse:[]},
  embeds:[{title:'NUBANK PIX · PEDIDO VIP',description:clean(description,1000),color:15879505,
   timestamp:new Date().toISOString()}]}),signal:AbortSignal.timeout(4500)})}
 catch(e){console.warn('[VIP STAFF NOTIFICATION]',e.message)}
}
function publicOrder(order){
 return {id:order.id,planId:order.plan_id,amount:Number(order.amount),
  status:order.status,createdAt:order.created_at,updatedAt:order.updated_at,
  roleSynced:Boolean(order.role_synced)};
}


module.exports=function mountNubankVip(app,{readSite,requireAuth}){
 app.get('/api/vip/config',async(req,res)=>{try{
  const site=await readSite();res.set('Cache-Control','no-store');
  const active=operational();
  res.json({configured:active,loginReady:setup().oauth,provider:'Nubank Pix com aprovação administrativa',
   renewal:'manual',mode:'nubank-manual',plans:site.vipPlans||[],
   payment:active?{bank:'Nubank',key:'jp904811@gmail.com',holder:'João Pedro Gonçalves Gomes'}:null});
 }catch(e){sendError(res,e)}});

 app.get('/api/vip/login',(req,res)=>{try{
  throttle(req,'login',10);
  if(!setup().oauth)return res.redirect('/club.html?status=setup');
  const state=token({nonce:crypto.randomBytes(18).toString('hex'),exp:Date.now()+600000});
  setCookie(res,'jotta_oauth_state',state,600);
  const params=new URLSearchParams({client_id:process.env.DISCORD_CLIENT_ID,
   response_type:'code',redirect_uri:SITE+'/api/vip/callback',scope:'identify',state});
  res.redirect('https://discord.com/oauth2/authorize?'+params);
 }catch(e){res.redirect('/club.html?status=error')}});

 app.get('/api/vip/callback',async(req,res)=>{try{
  throttle(req,'callback',10);
  const state=cookie(req,'jotta_oauth_state');
  setCookie(res,'jotta_oauth_state','',0);
  if(!verify(state)||req.query.state!==state||!req.query.code||typeof req.query.code!=='string')
   throw fail('Falha na autenticação.',401);
  const params=new URLSearchParams({client_id:process.env.DISCORD_CLIENT_ID,
   client_secret:process.env.DISCORD_CLIENT_SECRET,grant_type:'authorization_code',
   code:req.query.code,redirect_uri:SITE+'/api/vip/callback'});
  const tokenResponse=await fetch(DISCORD+'/oauth2/token',{
   method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
   body:params.toString(),signal:AbortSignal.timeout(9000)});
  if(!tokenResponse.ok)throw fail('Não foi possível conectar ao Discord.',401);
  const access=(await tokenResponse.json()).access_token;
  const profileResponse=await fetch(DISCORD+'/users/@me',{
   headers:{Authorization:'Bearer '+access},signal:AbortSignal.timeout(9000)});
  if(!profileResponse.ok)throw fail('Não foi possível consultar seu Discord.',401);
  const user=await profileResponse.json();
  if(!/^\d{16,22}$/.test(user.id))throw fail('Conta Discord inválida.',401);
  setCookie(res,'jotta_vip',token({id:user.id,
   name:clean(user.global_name||user.username,56),exp:Date.now()+7*86400000}),7*86400);
  res.redirect('/club.html?status=login');
 }catch(e){console.warn('[VIP OAUTH]',e.message);res.redirect('/club.html?status=error')}});

 app.post('/api/vip/logout',(req,res)=>{try{csrf(req);setCookie(res,'jotta_vip','',0);res.json({ok:true})}
  catch(e){sendError(res,e)}});
 app.get('/api/vip/me',async(req,res)=>{try{
  const u=session(req);res.set('Cache-Control','no-store');
  if(!u)return res.json({authenticated:false});
  const records=setup().database?await db('vip_memberships?discord_user_id=eq.'+u.id+'&select=plan_id,valid_until&limit=1'):[];
  const m=records?.[0];res.json({authenticated:true,user:{id:u.id,name:u.name},
   membership:m&&Date.parse(m.valid_until)>Date.now()?m:null});
 }catch(e){sendError(res,e)}});

 // Checkout de intermediadores substituído intencionalmente.
 app.post('/api/vip/checkout',(_req,res)=>res.status(410).json({
  error:'Checkout antigo desativado. Use os pedidos Pix Nubank com aprovação manual.'}));

 app.get('/api/vip/orders',requireCustomer,async(req,res)=>{try{
  if(!setup().database)return res.json({orders:[]});
  const rows=await db('vip_manual_orders?discord_user_id=eq.'+req.vipUser.id+
   '&select=id,plan_id,amount,status,created_at,updated_at,role_synced&order=created_at.desc&limit=20');
  res.set('Cache-Control','no-store').json({orders:rows.map(publicOrder)});
 }catch(e){sendError(res,e)}});

 app.post('/api/vip/orders',requireCustomer,async(req,res)=>{try{
  csrf(req);throttle(req,'order',5);
  if(!operational())throw fail('Os pagamentos ainda não foram liberados pelo responsável.',503);
  if(req.body?.acceptedTerms!==true)throw fail('Leia e aceite os Termos de Serviço para continuar.',400);
  const site=await readSite(),plan=site.vipPlans?.find(p=>p.id===req.body?.planId);
  if(!plan)throw fail('Plano VIP inválido.',400);
  const amount=Number(plan.monthly);
  if(!Number.isFinite(amount)||amount<1||amount>1000)throw fail('Preço temporariamente inválido.',503);
  const latest=await db('vip_manual_orders?discord_user_id=eq.'+req.vipUser.id+
   '&status=in.(awaiting_payment,awaiting_review)&select=*&order=created_at.desc&limit=5');
  const pending=latest.find(o=>o.plan_id===plan.id);
  if(pending)return res.json({order:publicOrder(pending),payment:{
   bank:'Nubank',holder:'João Pedro Gonçalves Gomes',key:'jp904811@gmail.com'},reused:true});
  if(latest.length)throw fail('Você já tem outro pedido pendente. Finalize esse pedido antes de escolher outro plano.',409);
  const order={id:crypto.randomUUID(),discord_user_id:req.vipUser.id,
   plan_id:plan.id,amount,status:'awaiting_payment',
   terms_version:'2026-10-28',terms_accepted_at:new Date().toISOString()};
  const rows=await db('vip_manual_orders','POST',order,'return=representation');
  const saved=rows[0];
  if(!saved)throw fail('Não foi possível registrar o pedido.',503);
  void staffNotify('Novo pedido: '+saved.id+' | '+plan.name+' | R$ '+amount.toFixed(2));
  res.status(201).set('Cache-Control','no-store').json({order:publicOrder(saved),
   payment:{bank:'Nubank',holder:'João Pedro Gonçalves Gomes',key:'jp904811@gmail.com'}});
 }catch(e){sendError(res,e)}});

 app.post('/api/vip/orders/:id/claim',requireCustomer,async(req,res)=>{try{
  csrf(req);throttle(req,'claim',8);
  const id=req.params.id;
  if(!/^[0-9a-f-]{36}$/i.test(id))throw fail('Pedido inválido.',400);
  const rows=await db('vip_manual_orders?id=eq.'+id+'&discord_user_id=eq.'+
   req.vipUser.id+'&select=*');
  const row=rows[0];if(!row)throw fail('Pedido não encontrado.',404);
  if(row.status==='awaiting_review')return res.json({order:publicOrder(row),alreadyClaimed:true});
  if(row.status!=='awaiting_payment')throw fail('Esse pedido já foi analisado.',409);
  const transfer=clean(req.body?.transferReference,120);
  if(transfer&&!/^[A-Za-z0-9._/-]{6,120}$/.test(transfer))throw fail('O identificador deve conter apenas letras, números, ponto, traço ou barra.',400);
  const updated=await db('vip_manual_orders?id=eq.'+id+'&discord_user_id=eq.'+
   req.vipUser.id+'&status=eq.awaiting_payment','PATCH',
   {status:'awaiting_review',buyer_reference:transfer||null,updated_at:new Date().toISOString()},'return=representation');
  if(!updated[0])throw fail('O pedido já mudou de status. Atualize a página.',409);
  void staffNotify('Cliente solicitou conferência no Nubank:\nPedido '+id+
    '\nValor: R$ '+Number(row.amount).toFixed(2)+
    '\nConfira o recebimento no extrato real antes de aprovar.');
  res.json({order:publicOrder(updated[0])});
 }catch(e){sendError(res,e)}});

 // Configuração técnica sem expor tokens, chaves, nomes de compradores ou credenciais.
 app.get('/api/admin/vip/readiness',requireAuth,async(req,res)=>{
  const flags=setup();
  const checks={
   database:{ready:false,detail:flags.database?'Verificando tabelas persistentes...':'Configure SUPABASE_URL e SUPABASE_SECRET_KEY no Render e execute nubank-vip.sql.'},
   oauth:{ready:flags.oauth,detail:flags.oauth?'Credenciais OAuth2 presentes (teste o login do cliente).':'Configure Discord Client ID, Client Secret e Session Secret.'},
   bot:{ready:false,detail:flags.discord?'Verificando acesso do bot ao Discord...':'Configure DISCORD_BOT_TOKEN no Render.'},
   enabled:{ready:flags.enabled,detail:flags.enabled?'Env NUBANK_MANUAL_ENABLED ativada.':'Compras fechadas; ative somente após testar o fluxo com responsáveis.'}
  };
  let activeVipCount=null;
  if(flags.database){
   try{
    await Promise.all([
     db('vip_manual_orders?select=id&limit=1'),
     db('vip_memberships?select=discord_user_id&limit=1')
    ]);
    checks.database={ready:true,detail:'Tabelas vip_manual_orders e vip_memberships acessíveis no Supabase.'};
    const members=await db('vip_memberships?valid_until=gt.'+
     encodeURIComponent(new Date().toISOString())+'&select=discord_user_id&limit=1000');
    activeVipCount=members.length;
   }catch{
    checks.database={ready:false,detail:'Tabelas ainda não acessíveis. Execute nubank-vip.sql e confira as credenciais.'};
   }
  }
  if(flags.discord){
   try{
    const bot=await discord('/users/@me');
    const roles=await discord('/guilds/'+GUILD+'/roles');
    if(bot?.id&&Array.isArray(roles)){
     checks.bot={ready:true,detail:'Bot autenticado e conectado ao servidor. Teste a hierarquia e a entrega de cargos.'};
    }else{
     checks.bot={ready:false,detail:'O bot não confirmou conexão válida com o servidor.'};
    }
   }catch{
    checks.bot={ready:false,detail:'Bot não respondeu ou não acessa o servidor. Confira token e permissões.'};
   }
  }
  const readyForOrders=Object.values(checks).every(check=>check.ready);
  res.set('Cache-Control','no-store').json({
   mode:'nubank-manual',readyForOrders,checks,activeVipCount,
   notice:'Pix sem verificação automática pelo Nubank. Aprovação apenas após conferência humana.',
   expirySweep:'Configure um cron externo protegido para revogar cargos expirados.'
  });
 });
 app.get('/api/admin/vip/orders',requireAuth,async(req,res)=>{try{
  if(!setup().database)throw fail('Configure o Supabase antes de analisar pedidos.',503);
  const rows=await db('vip_manual_orders?select=*&order=created_at.desc&limit=100');
  const statuses={awaiting_review:0,awaiting_payment:0,approved:0,rejected:0};
  for(const row of rows)if(Object.hasOwn(statuses,row.status))statuses[row.status]++;
  res.set('Cache-Control','no-store').json({
   orders:rows.map(o=>({...publicOrder(o),discordId:o.discord_user_id,
    bankReference:o.bank_reference||'',buyerReference:o.buyer_reference||'',reviewedAt:o.reviewed_at||null})),
   counts:statuses,enabled:operational()});
 }catch(e){sendError(res,e)}});

 app.post('/api/admin/vip/orders/:id/approve',requireAuth,async(req,res)=>{try{
  csrf(req);throttle(req,'approve',30);
  const id=req.params.id,reference=clean(req.body?.bankReference,120);
  if(!/^[0-9a-f-]{36}$/i.test(id))throw fail('Pedido inválido.',400);
  if(!/^[A-Za-z0-9._/-]{8,120}$/.test(reference))
   throw fail('Informe a referência única da transação que você conferiu no extrato Nubank (mínimo de 8 caracteres).',400);
  const rows=await db('vip_manual_orders?id=eq.'+id+'&select=*');
  if(!rows[0]||rows[0].status!=='awaiting_review')throw fail('Pedido não está aguardando conferência.',409);
  // Banco confirma pela conferência humana; uma transação só pode aprovar um pedido.
  const approved=await db('rpc/jotta_manual_vip_approve','POST',
   {p_order:id,p_reference:reference},'return=representation');
  if(!approved.length)throw fail('O banco não confirmou o registro da aprovação.',503);
  let synced=false;
  try{
   await syncRole(rows[0].discord_user_id,rows[0].plan_id);
   synced=true;
   await db('vip_manual_orders?id=eq.'+id,'PATCH',{role_synced:true},'return=minimal');
  }catch(e){console.warn('[VIP ROLE PENDING]',e.message)}
  res.json({ok:true,approved:true,roleSynced:synced,expiresAt:approved[0].valid_until});
 }catch(e){sendError(res,e)}});

 app.post('/api/admin/vip/orders/:id/reject',requireAuth,async(req,res)=>{try{
  csrf(req);const id=req.params.id;
  if(!/^[0-9a-f-]{36}$/i.test(id))throw fail('Pedido inválido.',400);
  const rows=await db('vip_manual_orders?id=eq.'+id+
   '&status=in.(awaiting_payment,awaiting_review)','PATCH',
   {status:'rejected',reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString()},
   'return=representation');
  if(!rows[0])throw fail('O pedido não pode ser rejeitado nesse estado.',409);
  res.json({ok:true,order:publicOrder(rows[0])});
 }catch(e){sendError(res,e)}});

 app.post('/api/admin/vip/orders/:id/resync',requireAuth,async(req,res)=>{try{
  csrf(req);const id=req.params.id;
  if(!/^[0-9a-f-]{36}$/i.test(id))throw fail('Pedido inválido.',400);
  const rows=await db('vip_manual_orders?id=eq.'+id+'&status=eq.approved&select=*');
  const order=rows[0];if(!order)throw fail('Pedido não aprovado.',409);
  const member=(await db('vip_memberships?discord_user_id=eq.'+
   order.discord_user_id+'&select=plan_id,valid_until'))[0];
  if(!member||Date.parse(member.valid_until)<=Date.now())
   throw fail('Assinatura vencida. Não é possível entregar cargo.',409);
  await syncRole(order.discord_user_id,member.plan_id);
  await db('vip_manual_orders?id=eq.'+id,'PATCH',{role_synced:true},'return=minimal');
  res.json({ok:true});
 }catch(e){sendError(res,e)}});

 app.post('/api/vip/sweep',async(req,res)=>{try{
  const secret=process.env.VIP_SWEEP_SECRET||'';
  const incoming=String(req.headers.authorization||'').replace(/^Bearer /,'');
  if(secret.length<24||secret.length!==incoming.length||
   !crypto.timingSafeEqual(Buffer.from(secret),Buffer.from(incoming)))return res.sendStatus(403);
  const expired=await db('vip_memberships?valid_until=lt.'+
   encodeURIComponent(new Date().toISOString())+'&select=discord_user_id,plan_id,valid_until&limit=100');
  let processed=0;for(const user of expired){
   // Releitura para não remover uma renovação ocorrida simultaneamente.
   const current=(await db('vip_memberships?discord_user_id=eq.'+user.discord_user_id+
    '&select=valid_until&limit=1'))[0];
   if(current&&Date.parse(current.valid_until)>Date.now())continue;
   try{await syncRole(user.discord_user_id,user.plan_id,true);processed++}catch(e){console.warn('[VIP EXPIRY]',e.message)}
  }
  res.json({ok:true,expired:expired.length,rolesRemoved:processed});
 }catch(e){sendError(res,e)}});
};
