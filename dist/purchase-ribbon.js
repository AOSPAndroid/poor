'use strict';
function ribbonPurchases(rows=signalData,now=Date.now()){
 const today=new Date(now).toISOString().slice(0,10),cutoff=new Date(now-90*86400000).toISOString().slice(0,10),seen=new Set();
 return rows.filter(r=>r.type==='Purchase'&&r.quality!=='User-provided'&&tickerValid(r.ticker)&&homeTrackPriority(r.person)>0&&disclosedDate(r)>=cutoff&&disclosedDate(r)<=today&&r.traded<=today)
 .sort((a,b)=>disclosedDate(b).localeCompare(disclosedDate(a))||b.traded.localeCompare(a.traded)||homeTrackPriority(b.person)-homeTrackPriority(a.person))
 .filter(r=>{const key=[r.person,r.ticker,r.traded,disclosedDate(r),r.asset,r.owner,r.amount,r.source].join('|');if(seen.has(key))return false;seen.add(key);return true}).slice(0,20);
}
function purchaseTile(r,copy=false){
 return `<div class="purchase-quote"><div class="purchase-line"><button data-profile="${esc(r.person)}" ${copy?'tabindex="-1"':''} class="purchase-person">${esc(r.person)}</button><small class="purchase-rating" title="One-year after-disclosure track record; not a win probability">${homeTrackPriority(r.person)}/100</small><button data-ticker="${esc(r.ticker)}" ${copy?'tabindex="-1"':''} class="purchase-symbol" aria-label="Open ${esc(r.ticker)} terminal">${esc(r.ticker)} ↗</button></div><div class="purchase-line"><b class="purchase-amount">${esc(r.amount||'Amount unavailable')}</b><small>${esc(r.asset)}</small></div><small class="purchase-date">Disclosed ${disclosedDate(r)?date(disclosedDate(r)):'Unknown'}${r.owner&&r.owner!=='Not specified'?' · '+esc(r.owner):''}</small></div>`;
}
let purchasesSignature='',purchasesPaused=read('poor-purchases-paused',false),purchasesHover=false,purchasesHoldUntil=0,purchasesFrame=0,purchasesRemainder=0;
function renderPurchasesRibbon(force=false){
 const el=$('#purchasesTrack'),vp=$('#purchasesViewport');if(!el)return;
 const rows=ribbonPurchases(),signature=JSON.stringify(rows.map(r=>[r,homeTrackPriority(r.person)]));if(!force&&signature===purchasesSignature)return;purchasesSignature=signature;
 $('#purchasesMotion').hidden=!rows.length;
 if(!rows.length){el.innerHTML='<span class="favorite-empty">No purchases disclosed in the past 90 days from politicians with a current Positive or Strong score.</span>';return}
 const repeats=Math.max(1,Math.ceil(vp.clientWidth/(rows.length*340))),original=rows.map(r=>purchaseTile(r)).join(''),copy=rows.map(r=>purchaseTile(r,true)).join('');
 el.innerHTML=`<div class="purchases-group">${original}${Array.from({length:repeats-1},()=>`<span class="purchases-copy" aria-hidden="true">${copy}</span>`).join('')}</div><div class="purchases-group" aria-hidden="true">${copy.repeat(repeats)}</div>`;vp.scrollLeft=0;
}
function updatePurchasesMotion(){const b=$('#purchasesMotion');b.textContent=purchasesPaused?'Play':'Pause';b.setAttribute('aria-pressed',String(purchasesPaused));b.setAttribute('aria-label',(purchasesPaused?'Start':'Pause')+' political purchases scrolling');persist('poor-purchases-paused',purchasesPaused)}
if(typeof window!=='undefined'){
 const vp=$('#purchasesViewport'),reduce=matchMedia('(prefers-reduced-motion: reduce)');if(reduce.matches)purchasesPaused=true;
 $('#purchasesMotion').onclick=()=>{purchasesPaused=!purchasesPaused;updatePurchasesMotion()};updatePurchasesMotion();
 vp.addEventListener('mouseenter',()=>purchasesHover=true);vp.addEventListener('mouseleave',()=>purchasesHover=false);
 for(const event of ['pointerdown','pointermove','wheel','touchstart','touchend','keydown'])vp.addEventListener(event,()=>purchasesHoldUntil=performance.now()+6000,{passive:true});
 vp.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();vp.scrollLeft+=e.key==='ArrowRight'?340:-340}});
 reduce.addEventListener('change',e=>{if(e.matches){purchasesPaused=true;updatePurchasesMotion()}});
 new ResizeObserver(()=>renderPurchasesRibbon(true)).observe(vp);
 function tick(now){const dt=Math.min(50,now-purchasesFrame);purchasesFrame=now;const width=$('#purchasesTrack .purchases-group')?.offsetWidth||0;
  if(width&&!document.hidden&&view==='home'&&!purchasesPaused&&!purchasesHover&&!vp.contains(document.activeElement)&&now>purchasesHoldUntil){purchasesRemainder+=dt*.024;const step=Math.floor(purchasesRemainder);purchasesRemainder-=step;vp.scrollLeft+=step;if(vp.scrollLeft>=width)vp.scrollLeft-=width}requestAnimationFrame(tick)}
 renderPurchasesRibbon();requestAnimationFrame(tick);
}
