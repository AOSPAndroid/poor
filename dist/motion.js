'use strict';
(()=>{
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),active=new Set();
 function enter(el,frames,duration=190){
  if(!el||el.hidden||reduced.matches||document.hidden||!el.animate)return;
  const animation=el.animate(frames,{duration,easing:'cubic-bezier(.2,.7,.2,1)'});
  active.add(animation);animation.finished.catch(()=>{}).finally(()=>active.delete(animation));
 }
 reduced.addEventListener('change',()=>{if(reduced.matches){for(const a of active)a.cancel();active.clear()}});
 // Observe visibility, not page contents: background refreshes never replay entrances.
 const pages=[...document.querySelectorAll('main > section[id$="View"],#chatPopover')];
 const visible=new WeakMap(pages.map(el=>[el,!el.hidden]));
 const visibility=new MutationObserver(changes=>{
  for(const el of new Set(changes.map(c=>c.target))){const now=!el.hidden;
   if(now&&!visible.get(el))enter(el,[{opacity:0,transform:el.id==='chatPopover'?'translateY(12px)':'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],el.id==='chatPopover'?220:170);
   visible.set(el,now);
  }
 });
 pages.forEach(el=>visibility.observe(el,{attributes:true,attributeFilter:['hidden']}));
 const canvas=document.querySelector('#mapCanvas');let previous=new Set(),root='';
 if(canvas)new MutationObserver(()=>{
  const identity=typeof mapMode==='undefined'?'':mapMode==='people'?`person:${peopleRoot}`:`stock:${typeof mapTicker==='undefined'?'':mapTicker}`;
  if(identity!==root){previous.clear();root=identity}
  const cards=[...canvas.querySelectorAll('[data-people-card],[data-board-card]')];
  const key=el=>el.dataset.peopleCard??el.dataset.boardCard;
  const added=cards.filter(el=>!previous.has(key(el)));
  if(previous.size)added.slice(0,16).forEach(el=>enter(el,[{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],220));
  previous=new Set(cards.map(key));
 }).observe(canvas,{childList:true});
 // A reply gets one entrance when it changes from pending to complete.
 const messages=document.querySelector('#chatMessages'),answers=new Map();
 if(messages)new MutationObserver(()=>{
  for(const turn of messages.querySelectorAll('[data-message-id]')){
   const id=turn.dataset.messageId,complete=turn.dataset.complete==='true';
   if(answers.get(id)===false&&complete)enter(turn.querySelector('.chat-answer'),[{opacity:.35},{opacity:1}],220);
   answers.set(id,complete);
  }
 }).observe(messages,{childList:true});
})();
