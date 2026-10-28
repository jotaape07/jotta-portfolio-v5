(()=>{'use strict';
const $=s=>document.querySelector(s);
const el=(tag,klass,text)=>{const x=document.createElement(tag);if(klass)x.className=klass;if(text!==undefined)x.textContent=text;return x};
const STATUS={awaiting_payment:'AGUARDANDO PIX',awaiting_review:'CONFERIR NO NUBANK',approved:'APROVADO',rejected:'REJEITADO',cancelled:'CANCELADO'};
const money=n=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
let busy=false,filter='all',cache=[];
function message(s){const box=$('#n8AdminStatus');if(box)box.textContent=s}
async function req(url,opts={}){
 const res=await fetch(url,{cache:'no-store',credentials:'same-origin',...opts});
 let data;try{data=await res.json()}catch{data={}}
 if(!res.ok)throw Error(data.error||'Erro HTTP '+res.status);
 return data;
}
function post(path,body){return req(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body||{})})}
function addInfo(box,label,value){
 const p=el('p');p.append(el('b','',label+': '),document.createTextNode(String(value??'—')));box.append(p);
}
function statusFirst(o){return o.status==='awaiting_review'?0:o.status==='awaiting_payment'?1:o.status==='approved'&&!o.roleSynced?2:o.status==='approved'?3:4}
function stamp(value){try{return new Date(value).toLocaleString('pt-BR')}catch{return '—'}}
async function update(){
 if(busy)return;
 const area=$('#n8AdminOrderList');if(!area)return;
 message('Atualizando os pedidos VIP...');
 try{
  const info=await req('/api/admin/vip/orders');
  cache=info.orders||[];
  const counts=info.counts||{};
  const counted=el('div','n8-admin-count-grid');
  for(const [key,name] of [['awaiting_review','CONFERIR'],['awaiting_payment','AGUARDANDO PIX'],['approved','APROVADOS'],['rejected','REJEITADOS']]){
   const chip=el('button','n8-stat-chip'+(filter===key?' active':''),name+' · '+(counts[key]||0));
   chip.type='button';chip.setAttribute('aria-pressed',String(filter===key));
   chip.addEventListener('click',()=>{filter=filter===key?'all':key;render()});
   counted.append(chip);
  }
  const all=el('button','n8-stat-chip'+(filter==='all'?' active':''),'TODOS · '+cache.length);
  all.type='button';all.addEventListener('click',()=>{filter='all';render()});counted.prepend(all);
  $('#n8AdminCounts').replaceChildren(counted);
  render();
  message(cache.length+' pedido(s) encontrados. Aprovar somente após conferir o crédito no aplicativo Nubank.');
 }catch(e){message('Não foi possível carregar: '+e.message);
  if(!cache.length)area.textContent='Confira a conexão do Supabase e a sessão administrativa.';
 }
}
function render(){
 const area=$('#n8AdminOrderList');if(!area)return;
 area.replaceChildren();
 const list=cache.filter(o=>filter==='all'||o.status===filter).sort((a,b)=>statusFirst(a)-statusFirst(b)||Date.parse(b.createdAt)-Date.parse(a.createdAt));
 if(!list.length){area.append(el('p','n8-admin-empty','Nenhum pedido nessa categoria.'));return}
 list.forEach(o=>area.append(card(o)));
 $$('.n8-stat-chip').forEach(b=>{
  const name=b.textContent.split(' · ')[0];
  const active=(name==='TODOS'&&filter==='all')||(name==='CONFERIR'&&filter==='awaiting_review')||(name==='AGUARDANDO PIX'&&filter==='awaiting_payment')||(name==='APROVADOS'&&filter==='approved')||(name==='REJEITADOS'&&filter==='rejected');
  b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));
 });
}
function $$(q){return [...document.querySelectorAll(q)]}
function card(o){
 const box=el('article','n8-admin-order'+(o.status==='awaiting_review'?' pending':'')+(o.status==='approved'?' approved':''));
 const head=el('div','n8-admin-order-head'),left=el('div');
 left.append(el('small','',stamp(o.createdAt)),el('strong','',String(o.planId||'VIP').toUpperCase()+' · '+money(o.amount)));
 head.append(left,el('span','n8-admin-status-pill',STATUS[o.status]||o.status));box.append(head);
 const details=el('div','n8-admin-order-details');
 addInfo(details,'Nº DO PEDIDO',o.id);
 addInfo(details,'DISCORD ID',o.discordId);
 if(o.buyerReference)addInfo(details,'INFORMADO PELO COMPRADOR',o.buyerReference);
 if(o.bankReference)addInfo(details,'TRANSACÃO NUBANK',o.bankReference);
 if(o.reviewedAt)addInfo(details,'CONFERIDO EM',stamp(o.reviewedAt));
 if(o.status==='approved')addInfo(details,'CARGO DISCORD',o.roleSynced?'SINCRONIZADO':'PENDENTE');
 box.append(details);
 if(o.status==='awaiting_review'){
  const actions=el('div','n8-admin-approve');
  actions.append(el('label','','REFERÊNCIA ÚNICA DA TRANSFERÊNCIA NO NUBANK'));
  const input=el('input');
  input.type='text';input.placeholder='Ex.: EndToEndId do Pix recebido';
  input.minLength=8;input.maxLength=120;input.autocomplete='off';input.spellcheck=false;
  input.setAttribute('aria-label','Identificador da transferência recebida no Nubank');
  const confirmRow=el('label','n8-confirm-row');
  const confirmCheck=el('input');confirmCheck.type='checkbox';confirmCheck.checked=false;
  confirmRow.append(confirmCheck,document.createTextNode('Conferi no aplicativo Nubank: dinheiro recebido, valor correto e transferência ainda não utilizada.'));
  actions.append(input,confirmRow);
  const buttons=el('div','n8-admin-actions');
  const approve=el('button','approve','APROVAR E LIBERAR VIP ✓');
  approve.type='button';approve.disabled=true;
  function validate(){
   approve.disabled=busy||!confirmCheck.checked||!/^[A-Za-z0-9._/-]{8,120}$/.test(input.value.trim());
  }
  input.addEventListener('input',validate);confirmCheck.addEventListener('change',validate);
  approve.addEventListener('click',async()=>{
   const reference=input.value.trim();if(busy||!confirmCheck.checked||approve.disabled)return;
   if(!confirm('Confirma que R$ '+Number(o.amount).toFixed(2).replace('.',',')+' entrou no Nubank para este pedido e que a referência '+reference+' não foi usada em outra venda?'))return;
   await act('/api/admin/vip/orders/'+encodeURIComponent(o.id)+'/approve',{bankReference:reference});
  });
  const reject=el('button','reject','REJEITAR');
  reject.type='button';reject.addEventListener('click',async()=>{
   if(!confirm('Rejeitar pedido '+o.id+'? Faça isso apenas após conferir no Nubank que não recebeu o pagamento.'))return;
   await act('/api/admin/vip/orders/'+encodeURIComponent(o.id)+'/reject',{});
  });
  buttons.append(approve,reject);actions.append(buttons);
  actions.append(el('small','n8-admin-info','Somente a sessão administrativa pode aprovar. Um identificador bancário não pode ser reutilizado. O botão de confirmação do comprador não entrega o cargo.'));
  box.append(actions);
 }else if(o.status==='approved'&&!o.roleSynced){
  const controls=el('div','n8-admin-actions'),retry=el('button','retry','SINCRONIZAR CARGO ↻');
  retry.type='button';retry.addEventListener('click',()=>act('/api/admin/vip/orders/'+encodeURIComponent(o.id)+'/resync',{}));
  controls.append(retry);box.append(controls);
 }else if(o.status==='awaiting_payment'){
  box.append(el('small','n8-admin-info','O cliente ainda não solicitou conferência. Não aprove sem recebimento bancário.'));
 }
 return box;
}
async function act(endpoint,body){
 if(busy)return;
 busy=true;message('Registrando sua decisão com segurança...');
 try{
  const result=await post(endpoint,body);
  if(result.approved&&!result.roleSynced)
   message('Pagamento confirmado! O cargo Discord ainda precisa ser sincronizado. Use o botão SINCRONIZAR CARGO.');
  else message('Operação salva com sucesso.');
  busy=false;
  await update();
 }catch(e){
  message('Não foi possível concluir: '+e.message);
  busy=false;
 }
}
const reload=$('#n8AdminReload');
if(reload)reload.addEventListener('click',update);
const tab=document.querySelector('#adminNav button[data-page="vip-orders"]');
if(tab)tab.addEventListener('click',update);
document.addEventListener('visibilitychange',()=>{
 if(!document.hidden&&document.querySelector('.admin-page[data-panel="vip-orders"].active'))update();
});
setInterval(()=>{
 if(!document.hidden&&!busy&&document.querySelector('.admin-page[data-panel="vip-orders"].active'))update();
},45000);
})();