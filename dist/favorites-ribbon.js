'use strict';
let favoritesSignature='',favoritesPaused=read('poor-favorites-paused',false),favoritesHoldUntil=0,favoritesHover=false,favoritesFrame=0,favoritesRemainder=0;
function favoriteQuote(symbol,copy=false){
 const p=displayQuote(symbol),delta=p?.latest>0&&p?.previousClose>0?(p.latest/p.previousClose-1)*100:null,dir=delta===null?'':delta>0?'▲':delta<0?'▼':'→';
 return `<button class="favorite-quote" data-ticker="${esc(symbol)}" ${copy?'tabindex="-1"':''} aria-label="Open ${esc(symbol)} workspace" title="${esc((p?.name||symbol)+' · '+quoteLabel(p)+' · previous close '+(p?.previousClose?money(p.previousClose,p.currency):'unavailable'))}"><b>${esc(symbol)}</b><strong ${quoteNumberAttrs(symbol+':price:'+p?.currency,p?.latest)}>${p?.latest>0?money(p.latest,p.currency):'—'}</strong><small ${quoteNumberAttrs(symbol+':change',delta)} class="${delta===null?'muted':delta>=0?'gain':'loss'}">${delta===null?'—':signed(delta)}</small><span class="ribbon-spark">${liveMiniChart(symbol)}</span>${p?.stale||p?.delayed?'<small class="ribbon-warning">'+(p.stale?'Stale':'Delayed')+'</small>':''}</button>`;
}
function renderFavoritesRibbon(force=false){
 const el=$('#favoritesTrack'),viewport=$('#favoritesViewport');if(!el)return;
 const symbols=[...new Set(workspaceState.symbols)].filter(tickerValid),signature=JSON.stringify(symbols.map(s=>[s,displayQuote(s)]));if(!force&&signature===favoritesSignature)return;favoritesSignature=signature;
 if(!symbols.length){el.innerHTML='<span class="favorite-empty">Star a stock or ETF to put it here.</span>';$('#favoritesMotion').hidden=true;return}
 $('#favoritesMotion').hidden=false;
 // Each repeated group fills the viewport so even a short watchlist loops cleanly.
 const scroll=viewport.scrollLeft;const repeats=Math.max(1,Math.ceil(viewport.clientWidth/(symbols.length*200))),group=symbols.map(s=>favoriteQuote(s)).join(''),duplicates=symbols.map(s=>favoriteQuote(s,true)).join('');
 el.innerHTML=`<div class="favorites-group">${group}${Array.from({length:repeats-1},()=>`<span aria-hidden="true" class="favorites-copy">${duplicates}</span>`).join('')}</div><div class="favorites-group" aria-hidden="true">${duplicates.repeat(repeats)}</div>`;
 const width=el.querySelector('.favorites-group')?.offsetWidth||1;viewport.scrollLeft=scroll%width;
}
function updateFavoritesMotion(){const b=$('#favoritesMotion');b.textContent=favoritesPaused?'▶':'Ⅱ';b.setAttribute('aria-pressed',String(favoritesPaused));b.setAttribute('aria-label',(favoritesPaused?'Start':'Pause')+' favorites scrolling');persist('poor-favorites-paused',favoritesPaused)}
if(typeof window!=='undefined'){
 const vp=$('#favoritesViewport'),reduce=matchMedia('(prefers-reduced-motion: reduce)');if(reduce.matches)favoritesPaused=true;
 $('#favoritesSearch').textContent='+';$('#favoritesSearch').title='Add favorite';
 $('#favoritesSearch').onclick=()=>openCommands();$('#favoritesMotion').onclick=()=>{favoritesPaused=!favoritesPaused;updateFavoritesMotion()};updateFavoritesMotion();
 vp.addEventListener('mouseenter',()=>favoritesHover=true);vp.addEventListener('mouseleave',()=>favoritesHover=false);
 for(const name of ['pointerdown','pointermove','wheel','touchstart','touchend','keydown'])vp.addEventListener(name,()=>favoritesHoldUntil=performance.now()+6000,{passive:true});
 vp.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();vp.scrollLeft+=e.key==='ArrowRight'?272:-272}});
 reduce.addEventListener('change',e=>{if(e.matches){favoritesPaused=true;updateFavoritesMotion()}});
 new ResizeObserver(()=>renderFavoritesRibbon(true)).observe(vp);
 function tick(now){const dt=Math.min(50,now-favoritesFrame);favoritesFrame=now;const width=$('#favoritesTrack .favorites-group')?.offsetWidth||0;if(width&&!document.hidden&&view==='home'&&!favoritesPaused&&!favoritesHover&&!vp.contains(document.activeElement)&&now>favoritesHoldUntil){favoritesRemainder+=dt*.024;const step=Math.floor(favoritesRemainder);favoritesRemainder-=step;vp.scrollLeft+=step;if(vp.scrollLeft>=width)vp.scrollLeft-=width}requestAnimationFrame(tick)}
 renderFavoritesRibbon();requestAnimationFrame(tick);
}
