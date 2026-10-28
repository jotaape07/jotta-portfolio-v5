/* JOTTA STUDIOS — CONTROL ROOM V10
 * Premium interface for real Nubank payment orders, no fabricated data.
 * Approval always requires human bank verification and one unique Nubank reference.
 */
(()=>{'use strict';
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const el=(tag,klass,value)=>{const node=document.createElement(tag);if(klass)node.className=klass;if(value!==undefined)node.textContent=String(value);return node};
const money=n=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const STATUS={awaiting_review:'CONFERIR NO NUBANK',awaiting_payment:'AGUARDANDO PIX',approved:'APROVADO',rejected:'REJEITADO',cancelled:'CANCELADO'};
const statusKey=['awaiting_review','awaiting_payment','approved','rejected'];
let orders=[],ordersLoaded=false,readiness=null,filter='all',search='',sort='priority',busy=false,pendingRequest=false,loadError='';
let activeCount=null;
const date=v=>{const d=new Date(v||0);return Number.isFinite(d.getTime())?d.toLocaleString('pt-BR'):'—'};
const shortDate=v=>{const d=new Date(v||0);return Number.isFinite(d.getTime())?d.toLocaleDateString('pt-BR'):'—'};
const stamp=()=>new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
const visible=()=>!!$('#adminApp')&&!$('#adminApp').hidden;
function tell(value){const node=$('#n8AdminStatus');if(node)node.textContent=value}
async function request(url,opts={}){
 const response=await fetch(url,{cache:'no-store',credentials:'same-origin',...opts});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(data.error||'Resposta HTTP '+response.status);
 return data;
}
const post=(url,obj)=>request(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(obj||{})});
const nav=page=>$('#adminNav button[data-page="'+page+'"]')?.click();
function setText(selector,value){const node=$(selector);if(node)node.textContent=String(value)}
function colorStatus(elm,good,warning=false){if(!elm)return;elm.classList.toggle('good',good);elm.classList.toggle('off',!good&&!warning)}
function readinessCards(container){
 if(!container)return;
 container.replaceChildren();
 if(!readiness){container.textContent='Não foi possível verificar as integrações.';return}
 const steps=[
  ['database','BANCO PERSISTENTE','Supabase e tabelas dos pedidos'],
  ['oauth','LOGIN DISCORD','Identificação do comprador'],
  ['bot','BOT DISCORD','Token e acesso ao servidor'],
  ['enabled','LIBERAÇÃO DE VENDAS','Ativação após os testes'],
 ];
 for(const [key,title,defaultHint] of steps){
  const item=readiness.checks?.[key]||{ready:false};
  const line=el('div','j10-checkitem '+(item.ready?'ok':'no'));
  line.append(el('span','',item.ready?'✓':'×'));
  const copy=el('div');
  copy.append(el('strong','',title),el('small','',item.detail||defaultHint));
  line.append(copy);container.append(line);
 }
}
function renderReadiness(){
 const isLive=Boolean(readiness?.readyForOrders);
 for(const id of ['#j10ReadyBadge','#j10FinanceState']){
  const node=$(id);
  if(!node)continue;
  node.textContent=isLive?'PEDIDOS HABILITADOS':'VENDAS BLOQUEADAS';
  colorStatus(node,isLive);
 }
 setText('#j10SidebarState',isLive?'CHECKOUT MANUAL ATIVO':'MODO DE PREPARAÇÃO');
 readinessCards($('#j10LaunchList'));
 readinessCards($('#j10FinanceReadiness'));
 activeCount=typeof readiness?.activeVipCount==='number'?readiness.activeVipCount:null;
 setText('#j10KpiActive',activeCount===null?'—':activeCount);
}
function kpis(){
 if(!ordersLoaded){
  ['#j10KpiPending','#j10KpiApproved','#j10KpiGross','#j10FinanceReview','#j10FinanceAwaiting','#j10FinanceApproved','#j10FinanceGross'].forEach(key=>setText(key,'—'));
  const bars=$('#j10Bars');if(bars){bars.replaceChildren();bars.append(el('div','j10-chart-empty','DADOS AINDA NÃO DISPONÍVEIS'))}
  const count=$('#j10NavCount');if(count)count.hidden=true;
  return;
 }
 const all=orders;
 const approved=all.filter(o=>o.status==='approved');
 const review=all.filter(o=>o.status==='awaiting_review');
 const awaiting=all.filter(o=>o.status==='awaiting_payment');
 const gross=approved.reduce((sum,o)=>sum+Number(o.amount||0),0);
 setText('#j10KpiPending',review.length);
 setText('#j10KpiApproved',approved.length);
 setText('#j10KpiGross',money(gross));
 setText('#j10FinanceReview',review.length);
 setText('#j10FinanceAwaiting',awaiting.length);
 setText('#j10FinanceApproved',approved.length);
 setText('#j10FinanceGross',money(gross));
 const badge=$('#j10NavCount');
 if(badge){badge.textContent=String(review.length);badge.hidden=!review.length}
 renderChart(approved);
}
function renderChart(approved){
 const root=$('#j10Bars');if(!root)return;
 root.replaceChildren();
 const now=new Date(),items=[];
 for(let i=6;i>=0;i--){
  const day=new Date(now.getFullYear(),now.getMonth(),now.getDate()-i);
  const next=new Date(day.getFullYear(),day.getMonth(),day.getDate()+1);
  const value=approved.reduce((sum,o)=>{
   const d=new Date(o.createdAt||0);
   return d>=day&&d<next?sum+Number(o.amount||0):sum;
  },0);
  items.push({day,value});
 }
 const max=Math.max(0,...items.map(x=>x.value));
 items.forEach(item=>{
  const container=el('div','j10-chart-col');
  const count=el('b','',item.value?money(item.value):'0');
  count.title='Volume aprovado de pedidos criados em '+shortDate(item.day);
  const bar=el('div','j10-chart-bar');
  bar.style.setProperty('--j10-height',max?Math.max(3,100*item.value/max)+'%':'3%');
  bar.title=count.title;bar.setAttribute('role','img');bar.setAttribute('aria-label',count.title);
  container.append(count,bar,el('small','',item.day.toLocaleDateString('pt-BR',{weekday:'short'}).replace('.','').toUpperCase()));
  root.append(container);
 });
 setText('#j10ChartCaption','Valor aprovado por data de criação do pedido • últimos 100');
}
function priority(o){return o.status==='awaiting_review'?0:o.status==='awaiting_payment'?1:o.status==='approved'&&!o.roleSynced?2:o.status==='approved'?3:4}
function matching(){
 const q=search.trim().toLowerCase();
 const base=orders.filter(o=>(filter==='all'||o.status===filter)&&
  (!q||[o.id,o.discordId,o.buyerReference,o.bankReference,o.planId,o.status]
   .some(v=>String(v||'').toLowerCase().includes(q))));
 const cmpNew=(a,b)=>Date.parse(b.createdAt||0)-Date.parse(a.createdAt||0);
 switch(sort){
  case 'new':return base.sort(cmpNew);
  case 'old':return base.sort((a,b)=>-cmpNew(a,b));
  case 'amount':return base.sort((a,b)=>Number(b.amount)-Number(a.amount)||cmpNew(a,b));
  default:return base.sort((a,b)=>priority(a)-priority(b)||cmpNew(a,b));
 }
}
function chips(){
 const div=$('#n8AdminCounts');if(!div)return;
 div.replaceChildren();const group=el('div','n8-admin-count-grid');
 const counts={all:orders.length};for(const item of statusKey)counts[item]=orders.filter(x=>x.status===item).length;
 const tags=[['all','TODOS'],['awaiting_review','◆ CONFERIR'],['awaiting_payment','AGUARDANDO'],['approved','APROVADOS'],['rejected','REJEITADOS']];
 for(const [key,label] of tags){
  const b=el('button','n8-stat-chip'+(filter===key?' active':''),label+' · '+counts[key]);
  b.type='button';b.setAttribute('aria-pressed',String(filter===key));b.addEventListener('click',()=>{filter=key;renderOrders()});
  group.append(b);
 }
 div.append(group);
}
function info(row,label,value){
 if(value===null||value===undefined||value==='')return;
 const p=el('p');p.append(el('b','',label+': '),document.createTextNode(String(value)));row.append(p);
}
function orderCard(o){
 const box=el('article','n8-admin-order'+(o.status==='awaiting_review'?' pending':'')+(o.status==='approved'?' approved':''));
 const head=el('div','n8-admin-order-head'),copy=el('div');
 copy.append(el('small','',date(o.createdAt)),el('strong','',String(o.planId||'VIP').toUpperCase()+' · '+money(o.amount)));
 const pill=el('span','n8-admin-status-pill',STATUS[o.status]||o.status);
 head.append(copy,pill);box.append(head);
 const details=el('div','n8-admin-order-details');
 info(details,'PEDIDO',o.id);
 info(details,'CONTA DISCORD',o.discordId);
 info(details,'INFORMADO PELO COMPRADOR',o.buyerReference);
 info(details,'REFERÊNCIA NUBANK VERIFICADA',o.bankReference);
 info(details,'CONFERIDO EM',o.reviewedAt?date(o.reviewedAt):'');
 if(o.status==='approved')info(details,'CARGO DISCORD',o.roleSynced?'Sincronizado':'Precisa de sincronização');
 box.append(details);
 if(o.status==='awaiting_review'){
  const area=el('div','n8-admin-approve');
  area.append(el('label','','REFERÊNCIA REAL DA TRANSAÇÃO NO NUBANK'));
  const input=el('input');input.type='text';input.maxLength=120;input.autocomplete='off';input.spellcheck=false;
  input.placeholder='Cole o EndToEndId do Pix recebido';
  input.setAttribute('aria-label','Referência única do Pix confirmada no Nubank');
  const check=el('label','n8-confirm-row'),cb=el('input');
  cb.type='checkbox';
  check.append(cb,document.createTextNode('Conferi no app Nubank: crédito recebido, valor correto e referência ainda não utilizada.'));
  const actions=el('div','n8-admin-actions');
  const approve=el('button','approve','✓ APROVAR E LIBERAR VIP');
  approve.type='button';approve.disabled=true;
  const updateState=()=>approve.disabled=busy||!cb.checked||!/^[A-Za-z0-9._/-]{8,120}$/.test(input.value.trim());
  input.addEventListener('input',updateState);cb.addEventListener('change',updateState);
  approve.addEventListener('click',async()=>{
   const reference=input.value.trim();if(approve.disabled||busy)return;
   const confirmed=confirm('Confirma que o Nubank recebeu '+money(o.amount)+' referente a este pedido e que a referência '+reference+' não foi utilizada antes?');
   if(!confirmed)return;
   await applyAction('/api/admin/vip/orders/'+encodeURIComponent(o.id)+'/approve',{bankReference:reference});
  });
  const reject=el('button','reject','REJEITAR PEDIDO');
  reject.type='button';
  reject.addEventListener('click',async()=>{
   if(!confirm('Rejeitar este pedido? Se houver pagamento recebido, não rejeite até resolver a divergência.'))return;
   await applyAction('/api/admin/vip/orders/'+encodeURIComponent(o.id)+'/reject',{});
  });
  actions.append(approve,reject);
  area.append(input,check,actions,el('small','n8-admin-info','O botão “já paguei” do cliente não concede benefícios. A verificação e a aprovação são manuais.'));
  box.append(area);
 }else if(o.status==='approved'&&!o.roleSynced){
  const actions=el('div','n8-admin-actions');
  const retry=el('button','retry','↻ SINCRONIZAR CARGO DISCORD');
  retry.type='button';retry.addEventListener('click',()=>applyAction('/api/admin/vip/orders/'+encodeURIComponent(o.id)+'/resync',{}));
  actions.append(retry);box.append(actions);
 }else if(o.status==='awaiting_payment'){
  box.append(el('small','n8-admin-info','Ainda não foi solicitado verificar o crédito. O cliente precisa concluir o Pix e enviar o pedido para conferência.'));
 }else if(o.status==='rejected'){
  box.append(el('small','n8-admin-info','Pedido rejeitado. Se houve transferência recebida, revise com o cliente e responsável antes de tomar novas ações.'));
 }
 return box;
}
function renderOrders(){
 chips();const root=$('#n8AdminOrderList');if(!root)return;
 root.replaceChildren();const view=matching();
 setText('#j10OrderVisible',view.length+' de '+orders.length+' pedidos exibidos (máx. 100 recentes)');
 if(!view.length){
  const msg=el('div','j10-empty');
  msg.append(el('strong','','NENHUM PEDIDO ENCONTRADO'),
    el('p','',loadError||'Quando os primeiros pedidos forem registrados, eles aparecerão aqui com seus respectivos status.'));
  root.append(msg);return;
 }
 view.forEach(item=>root.append(orderCard(item)));
}
async function loadReadiness(){
 try{readiness=await request('/api/admin/vip/readiness');renderReadiness()}
 catch(e){readiness=null;renderReadiness();tell('Conexões indisponíveis: '+e.message)}
}
async function loadOrders(){
 try{
  const resp=await request('/api/admin/vip/orders');orders=resp.orders||[];ordersLoaded=true;
  loadError='';
  kpis();renderOrders();
  tell(orders.length+' pedido(s) consultado(s). Última atualização: '+stamp()+'. Confirme sempre o crédito no Nubank.');
 }catch(e){
  orders=[];ordersLoaded=false;loadError='A lista ainda não está disponível: '+e.message;
  kpis();renderOrders();tell(loadError);
 }
}
async function loadAll(){
 if(!visible()||pendingRequest)return;
 pendingRequest=true;
 try{await Promise.all([loadReadiness(),loadOrders()])}finally{pendingRequest=false}
}
async function applyAction(url,body){
 if(busy)return;busy=true;tell('Registrando decisão no servidor...');
 try{
  const result=await post(url,body);
  if(result.approved&&!result.roleSynced)tell('Pagamento aprovado; é necessário sincronizar o cargo no Discord.');
  else tell('Operação registrada com sucesso.');
  busy=false;await loadAll();
 }catch(e){busy=false;tell('A operação não foi concluída: '+e.message);await loadOrders()}
}
function exportCsv(){
 if(!ordersLoaded||!orders.length){tell('Não há pedidos disponíveis para exportar.');return}
 const headings=['Pedido','Data','Discord ID','Plano','Valor BRL','Status','Ref. informada','Ref. verificada','Cargo sincronizado'];
 const cell=v=>{
  const raw=String(v??'');
  const safe=/^[=+\-@]/.test(raw)?"'"+raw:raw;
  return '"'+safe.replace(/"/g,'""')+'"';
 };
 const lines=[headings.map(cell).join(';'),...orders.map(o=>[
  o.id,date(o.createdAt),o.discordId,o.planId,Number(o.amount||0).toFixed(2).replace('.',','),
  STATUS[o.status]||o.status,o.buyerReference||'',o.bankReference||'',o.roleSynced?'Sim':'Não'
 ].map(cell).join(';'))];
 const url=URL.createObjectURL(new Blob(['\uFEFF'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}));
 const link=el('a');link.href=url;link.download='jotta-pedidos-vip-'+new Date().toISOString().slice(0,10)+'.csv';
 document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
 tell('CSV exportado com os até 100 pedidos carregados. Guarde esse arquivo em local seguro.');
}
function attach(){
 $('#n8AdminReload')?.addEventListener('click',loadAll);
 $('#j10ReadinessRefresh')?.addEventListener('click',loadReadiness);
 $('#j10OrderSearch')?.addEventListener('input',e=>{search=e.target.value;renderOrders()});
 $('#j10OrderSort')?.addEventListener('change',e=>{sort=e.target.value;renderOrders()});
 $('#j10ExportCsv')?.addEventListener('click',exportCsv);
 $('#j10GoFinance')?.addEventListener('click',()=>nav('vip-orders'));
 $('#j10PendingShortcut')?.addEventListener('click',()=>{filter='awaiting_review';nav('vip-orders');renderOrders()});
 for(const item of $$('#adminNav button[data-page="overview"],#adminNav button[data-page="vip-orders"]')){
  item.addEventListener('click',()=>{if(visible())loadAll()});
 }
 if($('#adminApp')){
  const observer=new MutationObserver(()=>{
   if(visible()){loadAll();observer.disconnect()}
  });
  observer.observe($('#adminApp'),{attributes:true,attributeFilter:['hidden']});
 }
 if(visible())loadAll();
 document.addEventListener('visibilitychange',()=>{
  if(!document.hidden&&visible()&&$('#adminNav button[data-page="vip-orders"]')?.classList.contains('active'))
   loadAll();
 });
 // Avoid erasing a bank-reference input while the admin is typing.
 setInterval(()=>{
  if(document.hidden||!visible()||busy||pendingRequest)return;
  if(!$('#adminNav button[data-page="vip-orders"]')?.classList.contains('active'))return;
  const active=document.activeElement;
  if(active&&active.closest('.n8-admin-order'))return;
  if(active&&active.id==='j10OrderSearch')return;
  loadAll();
 },60000);
}
attach();
})();
