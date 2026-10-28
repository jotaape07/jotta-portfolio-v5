(()=>{'use strict';
const $=s=>document.querySelector(s);
const make=(tag,klass,text)=>{const n=document.createElement(tag);if(klass)n.className=klass;if(text!==undefined)n.textContent=text;return n};
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const STATUS={awaiting_payment:'AGUARDANDO PIX',awaiting_review:'EM CONFERÊNCIA NO NUBANK',approved:'PAGAMENTO APROVADO',rejected:'PEDIDO REJEITADO',cancelled:'CANCELADO'};
let config=null,me=null,orders=[],current=null,busy=false;
function notice(value){$('#notice').textContent=value}
async function call(path,options={}){
 const response=await fetch(path,{cache:'no-store',credentials:'same-origin',...options});
 let data;try{data=await response.json()}catch{data={}}
 if(!response.ok)throw Error(data.error||'Não foi possível completar a solicitação.');
 return data;
}
function post(path,value){return call(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value||{})})}
function showOrder(order){
 current=order;
 if(!order||!config?.payment){$('#n8PaymentSection').hidden=true;return}
 const p=config.payment;
 $('#n8PaymentSection').hidden=false;
 $('#n8Amount').textContent=money(order.amount);
 $('#n8Holder').textContent=p.holder;
 $('#n8PixKey').textContent=p.key;
 $('#n8OrderId').textContent=order.id;
 $('#n8Paid').hidden=order.status!=='awaiting_payment';
 $('#n8Paid').disabled=order.status!=='awaiting_payment';
 const title=Object.values(config.plans||[]).find(x=>x.id===order.planId)?.name||order.planId;
 const status=STATUS[order.status]||order.status;
 $('#n8PaymentTitle').textContent='PIX '+title+' · '+status;
}
function renderOrders(){
 const area=$('#n8OrderList');area.replaceChildren();
 if(!me?.authenticated){area.textContent='Conecte o Discord para acompanhar os pedidos.';return}
 if(!orders.length){area.textContent='Você ainda não tem pedidos registrados.';return}
 for(const order of orders){
  const entry=make('article','n8-order');
  const header=make('small','',new Date(order.createdAt).toLocaleString('pt-BR'));
  const name=config?.plans?.find(p=>p.id===order.planId)?.name||order.planId;
  entry.append(header,make('strong','',name+' · '+money(order.amount)),
    make('span','n8-order-status '+order.status,STATUS[order.status]||order.status),
    make('small','','PEDIDO '+order.id));
  if(order.status==='approved'&&!order.roleSynced){
   entry.append(make('small','','Pagamento confirmado; a equipe precisa sincronizar o cargo Discord.'));
  }else if(order.status==='approved'){
   entry.append(make('small','','Se o cargo não aparecer, confira se você entrou no servidor Discord.'));
  }else if(order.status==='awaiting_review'){
   entry.append(make('small','','A equipe está conferindo a entrada do dinheiro no Nubank.'));
  }else if(order.status==='rejected'){
   entry.append(make('small','','Se você pagou de verdade, entre em contato com o suporte para revisão.'));
  }
  if(order.status==='awaiting_payment'){
   const view=make('button','','VER DADOS PIX');
   view.type='button';view.addEventListener('click',()=>{
    showOrder(order);$('#n8PaymentSection').scrollIntoView({behavior:'smooth',block:'start'});
   });entry.append(view);
  }
  area.append(entry);
 }
}
async function loadOrders(){
 if(!me?.authenticated){orders=[];renderOrders();return}
 try{
  const result=await call('/api/vip/orders');orders=result.orders||[];
  renderOrders();
  if(orders.length&&(orders[0].status==='awaiting_payment'||orders[0].status==='awaiting_review'))
   showOrder(orders[0]);
  else showOrder(null);
 }catch(e){$('#n8OrderList').textContent='Falha ao consultar pedidos: '+e.message}
}
async function newOrder(planId){
 if(busy)return;
 if(!config?.configured){notice('Pagamento ainda não liberado pela administração. Nenhuma cobrança foi iniciada.');return}
 if(!$('#n8AcceptTerms').checked){notice('Para criar um pedido, leia e aceite os termos do VIP Club.');return}
 if(!me?.authenticated){location.assign('/api/vip/login');return}
 busy=true;
 try{
  notice('Registrando pedido Pix, sem cobrar nada automaticamente...');
  const result=await post('/api/vip/orders',{planId,acceptedTerms:true});
  showOrder(result.order);await loadOrders();
  notice('Pedido registrado! Confira o titular, faça o Pix no Nubank e solicite a conferência.');
  $('#n8PaymentSection').scrollIntoView({behavior:'smooth',block:'start'});
 }catch(e){notice(e.message)}finally{busy=false}
}
async function claim(){
 if(!current||busy)return;
 if(!confirm('Você já fez o Pix pelo seu banco? Essa ação apenas solicita conferência; não ativa o VIP automaticamente.'))return;
 busy=true;$('#n8Paid').disabled=true;
 try{
  const result=await post('/api/vip/orders/'+encodeURIComponent(current.id)+'/claim',{transferReference:$('#n8TransferReference').value.trim()});
  current=result.order;
  notice('Solicitação registrada! A equipe vai conferir o crédito diretamente no Nubank.');
  await loadOrders();
 }catch(e){notice('Não foi possível solicitar conferência: '+e.message)}
 finally{busy=false;$('#n8Paid').disabled=false}
}
async function copyPix(){
 const key=$('#n8PixKey').textContent;
 if(!key||key==='—')return;
 try{
  await navigator.clipboard.writeText(key);
  $('#n8Copy').textContent='CHAVE COPIADA ✓';
  setTimeout(()=>$('#n8Copy').textContent='COPIAR CHAVE',2200);
 }catch{
  const temp=document.createElement('textarea');temp.value=key;document.body.append(temp);
  temp.select();const ok=document.execCommand('copy');temp.remove();
  $('#n8Copy').textContent=ok?'CHAVE COPIADA ✓':'SELECIONE E COPIE';
 }
}
function renderPlans(){
 const area=$('#plans');area.replaceChildren();
 const plans=config?.plans||[];
 if(!plans.length){area.textContent='Planos ainda não disponíveis.';return}
 for(const p of plans){
  const card=make('article','plan'+(p.id==='prime'?' prime':''));
  card.append(make('div','n8-plan-badge','✦ '+p.id.toUpperCase()+' / MEMBERSHIP'),
   make('h3','',p.name));
  const price=make('div','n8-plan-price');
  price.append(document.createTextNode(money(p.monthly)),make('small','',' / 30 dias'));
  card.append(price,make('div','benefit',p.discount+'% OFF'),
   make('small','','Economia de até '+money(p.cap)+' por ciclo'));
  const ul=make('ul');
  for(const perk of p.perks||[])ul.append(make('li','',perk));
  card.append(ul);
  const button=make('button','',!config.configured?'PAGAMENTO EM PREPARAÇÃO':me?.authenticated?'ESCOLHER VIP ↗':'ENTRAR COM DISCORD ↗');
  button.type='button';button.disabled=!config.configured||!$('#n8AcceptTerms').checked;
  button.addEventListener('click',()=>newOrder(p.id));
  card.append(button);area.append(card);
 }
}
async function init(){
 try{
  const results=await Promise.all([call('/api/vip/config'),call('/api/vip/me')]);
  config=results[0];me=results[1];
  $('#connect').hidden=!!me.authenticated||!config.loginReady;
  $('#logout').hidden=!me.authenticated;
  if(!config.loginReady&&!me.authenticated)$('#account').textContent='A integração do login Discord ainda precisa ser configurada.';
  else if(me.authenticated){
   const membership=me.membership;
   $('#account').textContent='DISCORD: '+me.user.name+
    (membership?' | '+membership.plan_id.toUpperCase()+' ativo até '+new Date(membership.valid_until).toLocaleDateString('pt-BR'):' | Nenhum VIP ativo');
  }
  if(!config.configured)notice('Pix Nubank ainda em configuração com a administração. Não faça transferências até a liberação.');
  else if(me.authenticated)notice('Sua conta Discord está conectada. Selecione um plano e confira os dados Pix.');
  else notice('Conecte sua conta Discord para criar e acompanhar seus pedidos.');
  renderPlans();await loadOrders();
 }catch(e){notice('Não foi possível consultar o VIP Club: '+e.message)}
}
$('#n8AcceptTerms').addEventListener('change',renderPlans);
$('#n8Copy').addEventListener('click',copyPix);
$('#n8Paid').addEventListener('click',claim);
$('#n8Refresh').addEventListener('click',()=>{loadOrders();notice('Status dos pedidos atualizado.')});
$('#logout').addEventListener('click',async()=>{try{await post('/api/vip/logout');location.reload()}catch(e){notice(e.message)}});
setInterval(()=>{if(!document.hidden&&me?.authenticated&&orders.some(x=>x.status==='awaiting_review'))loadOrders()},30000);
init();
})();
