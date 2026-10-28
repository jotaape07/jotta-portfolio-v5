/* JOTTA STUDIOS // MOTION ENGINE 6.0
   Event delegation keeps dynamically rendered cards animated without a separate listener per card.
   No canvas/WebGL dependency, battery-conscious pointer effects and reduced-motion support. */
(()=>{'use strict';
 const $=(sel)=>document.querySelector(sel);
 const fine=matchMedia('(pointer:fine) and (hover:hover) and (prefers-reduced-motion:no-preference)');
 const motion=matchMedia('(prefers-reduced-motion:no-preference)');
 const cardQuery='.project,.media-card,.game-row,.j3-vip-card,.j3-price-card,.skill,.j6-browser,.j6-browser-body';
 const hero=$('#hero'),work=$('#j6Workspace'),browser=$('#j6BrowserBody'),theme=$('#j6ThemeBtn'),floating=$('#j6FloatingCta');
 let tick=false,mouse=null,activeCard=null;
 function assignCursor(e){
   if(!fine.matches)return;
   mouse={x:e.clientX,y:e.clientY,target:e.target};
   if(tick)return;
   tick=true;requestAnimationFrame(()=>{
     tick=false;
     if(!mouse)return;
     const point=mouse;mouse=null;
     const card=point.target instanceof Element?point.target.closest(cardQuery):null;
     if(card){
       card.classList.add('j6-surface');
       const bounds=card.getBoundingClientRect();
       card.style.setProperty('--j6-x',(point.x-bounds.left).toFixed(0)+'px');
       card.style.setProperty('--j6-y',(point.y-bounds.top).toFixed(0)+'px');
     }
     if(activeCard&&activeCard!==card){
       activeCard.style.removeProperty('--j6-x');activeCard.style.removeProperty('--j6-y');
     }
     activeCard=card;
     if(hero&&point.target instanceof Element&&hero.contains(point.target)){
       const r=hero.getBoundingClientRect();
       hero.style.setProperty('--j6-cursor-x',Math.max(0,Math.min(100,(point.x-r.left)/r.width*100)).toFixed(1)+'%');
       hero.style.setProperty('--j6-cursor-y',Math.max(0,Math.min(100,(point.y-r.top)/r.height*100)).toFixed(1)+'%');
     }
     if(work&&point.target instanceof Element&&work.contains(point.target)){
       const r=work.getBoundingClientRect();
       const dx=(point.x-r.left)/Math.max(r.width,1)-.5,dy=(point.y-r.top)/Math.max(r.height,1)-.5;
       work.style.setProperty('--j6-rotate-x',(-dy*5).toFixed(2)+'deg');
       work.style.setProperty('--j6-rotate-y',(dx*6).toFixed(2)+'deg');
     }else if(work){
       work.style.setProperty('--j6-rotate-x','0deg');
       work.style.setProperty('--j6-rotate-y','0deg');
     }
   });
 }
 document.addEventListener('pointermove',assignCursor,{passive:true});
 if(theme&&browser){
   theme.addEventListener('click',()=>{
     const isAlt=browser.classList.toggle('j6-aurora');
     theme.setAttribute('aria-pressed',String(isAlt));
     theme.textContent=isAlt?'↺ VOLTAR AO VISUAL NOIR':'↺ TESTAR OUTRO VISUAL';
   });
 }
 function scrollUI(){
   const visible=window.scrollY>Math.max(900,window.innerHeight*1.1);
   if(floating)floating.classList.toggle('j6-on',visible);
 }
 scrollUI();window.addEventListener('scroll',scrollUI,{passive:true});
 const line=$('.j6-draw-line');
 if(line){
   if(!motion.matches||!('IntersectionObserver'in window))line.classList.add('j6-in');
   else{
     const io=new IntersectionObserver(entries=>{
       entries.forEach(entry=>{
         if(entry.isIntersecting){entry.target.classList.add('j6-in');io.unobserve(entry.target);}
       });
     },{threshold:.25});
     io.observe(line);
   }
 }
})();
