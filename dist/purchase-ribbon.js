'use strict';
function ribbonPurchases(rows=signalData,now=Date.now()){
 const today=new Date(now).toISOString().slice(0,10),cutoff=new Date(now-90*86400000).toISOString().slice(0,10),seen=new Set();
 return rows.filter(r=>r.type==='Purchase'&&r.quality!=='User-provided'&&tickerValid(r.ticker)&&homeTrackPriority(r.person)>0&&disclosedDate(r)>=cutoff&&disclosedDate(r)<=today&&r.traded<=today)
 .sort((a,b)=>disclosedDate(b).localeCompare(disclosedDate(a))||b.traded.localeCompare(a.traded)||homeTrackPriority(b.person)-homeTrackPriority(a.person))
 .filter(r=>{const key=[r.person,r.ticker,r.traded,disclosedDate(r),r.asset,r.owner,r.amount,r.source].join('|');if(seen.has(key))return false;seen.add(key);return true}).slice(0,20);
}
function purchaseTile(r,copy=false){
 const score=r._ribbonScore??homeTrackPriority(r.person),label=score>=65?'Strong':'Positive';
 return `<div class="purchase-quote"><div class="purchase-line"><button data-profile="${esc(r.person)}" ${copy?'tabindex="-1"':''} class="purchase-person">${esc(r.person)}</button><small class="purchase-rating" data-rating-grade="${label.toLowerCase()}" title="${label}${r._ribbonScore?' · saved rating':''} · One-year after-disclosure track record; not a win probability">${score}/100</small><button data-ticker="${esc(r.ticker)}" ${copy?'tabindex="-1"':''} class="purchase-symbol" aria-label="Open ${esc(r.ticker)} workspace">${esc(r.ticker)} ↗</button></div><div class="purchase-line"><b class="purchase-amount">${esc(r.amount||'Amount unavailable')}</b><small>${esc(r.asset)}</small></div><small class="purchase-date">Disclosed ${disclosedDate(r)?date(disclosedDate(r)):'Unknown'}${r.owner&&r.owner!=='Not specified'?' · '+esc(r.owner):''}</small></div>`;
}
let purchasesSaved=read('poor-purchases-snapshot-v1',null),purchasesLoading=false,purchasesChecked=0;const purchasePriceChecks=new Map();
let purchasesSignature='',purchasesPaused=read('poor-purchases-paused',false),purchasesHover=false,purchasesHoldUntil=0,purchasesFrame=0,purchasesRemainder=0;
function renderPurchasesRibbon(force=false){
 const el=$('#purchasesTrack'),vp=$('#purchasesViewport');if(!el)return;
 const fresh=ribbonPurchases();
 if(fresh.length){const next=fresh.map(r=>({...r,_ribbonScore:homeTrackPriority(r.person)}));if(!purchasesSaved||JSON.stringify(next)!==JSON.stringify(purchasesSaved.rows)||Date.now()-purchasesSaved.at>5*60000){purchasesSaved={at:Date.now(),rows:next};try{localStorage.setItem('poor-purchases-snapshot-v1',JSON.stringify(purchasesSaved))}catch{}}}
 const saved=!fresh.length?savedRibbonPurchases(purchasesSaved):[],rows=fresh.length?fresh:saved,cached=!fresh.length&&!!saved.length;
 const status=cached?(purchasesLoading?'Saved · refreshing ratings':'Saved · current ratings unavailable'):purchasesLoading?'Checking ratings…':purchasesChecked?'Positive / Strong · past 90 days':'Loading purchases…';
 const statusEl=$('#purchasesRibbonStatus');if(statusEl){statusEl.textContent=status;statusEl.title=cached?'Saved '+stamp(purchasesSaved.at)+'; current ratings unavailable.':status}
 const signature=JSON.stringify([rows.map(r=>[r,r._ribbonScore??homeTrackPriority(r.person)]),status]);if(!force&&signature===purchasesSignature)return;purchasesSignature=signature;
 $('#purchasesMotion').hidden=!rows.length;
 if(!rows.length){el.innerHTML='<span class="favorite-empty">'+(purchasesLoading||!purchasesChecked?'Loading purchases and checking track records…':'No qualifying buys verified yet. Some price histories may be unavailable. <button data-view="trades">Browse all trades →</button>')+'</span>';return}
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
 renderPurchasesRibbon();refreshPurchaseRatings();requestAnimationFrame(tick);
 setInterval(()=>{if(!document.hidden&&view==='home')refreshPurchaseRatings()},5*60000);
}

function savedRibbonPurchases(snapshot,now=Date.now()){
 if(!snapshot||!Number.isFinite(snapshot.at)||now<snapshot.at||now-snapshot.at>86400000||!Array.isArray(snapshot.rows))return [];
 const today=new Date(now).toISOString().slice(0,10),cutoff=new Date(now-90*86400000).toISOString().slice(0,10);
 return snapshot.rows.filter(r=>r&&r.type==='Purchase'&&r.quality!=='User-provided'&&tickerValid(r.ticker)&&Number.isFinite(r._ribbonScore)&&r._ribbonScore>=55&&r._ribbonScore<=100&&disclosedDate(r)>=cutoff&&disclosedDate(r)<=today&&r.traded<=today).filter(r=>{const current=politicianRating(r.person);return current.score===null||current.stale||current.score>=55}).slice(0,20);
}
async function refreshPurchaseRatings(){
 if(purchasesLoading||typeof loadMarketPrices!=='function')return;
 const initialRows=signalData;purchasesLoading=true;renderPurchasesRibbon();
 try{
 const now=Date.now(),recent=new Set(signalData.filter(r=>r.type==='Purchase'&&now-Date.parse(disclosedDate(r))<=90*86400000).map(r=>r.person)),groups=new Map();
 for(const r of signalData){if(!recent.has(r.person)||r.type!=='Purchase'||r.quality==='User-provided'||!['Stock','ADR'].includes(r.asset)||now-Date.parse(r.traded)>365*86400000||!tickerValid(r.ticker))continue;if(!groups.has(r.person))groups.set(r.person,{buys:new Set(),symbols:new Set()});const g=groups.get(r.person);g.buys.add(r.ticker+'|'+r.traded);g.symbols.add(r.ticker)}
 const people=[...groups].filter(([,g])=>g.buys.size>=5).sort((a,b)=>a[1].symbols.size-b[1].symbols.size).slice(0,8);
 for(const [,g] of people){const symbols=['SPY',...g.symbols].filter(s=>!purchasePriceChecks.has(s)||now-purchasePriceChecks.get(s)>5*60000);symbols.forEach(s=>purchasePriceChecks.set(s,now));if(symbols.length)await loadMarketPrices(symbols);refreshRatingBadges();renderPurchasesRibbon();}
 }catch{}finally{purchasesLoading=false;purchasesChecked=Date.now();renderPurchasesRibbon();if(signalData!==initialRows)queueMicrotask(refreshPurchaseRatings);}
}
