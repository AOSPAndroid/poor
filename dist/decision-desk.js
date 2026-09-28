'use strict';
function swingDecision(p,benchmark,now=Date.now()){
 if(!p||p.stale||p.error||!validDate(p.asOf)||Date.parse(p.asOf)>now||now-Date.parse(p.asOf)>5*86400000)return {state:'Price check unavailable',reason:'Fresh closing prices needed'};
 const t=technicals(p),rs=benchmark&&!benchmark.stale?relativeReturn(p,benchmark,20):null;
 if(!t.sma20||!t.priorHigh20)return {state:'Price check unavailable',reason:'At least 21 closing prices needed'};
 const strength=rs===null?'S&P 500 comparison missing':(rs>=0?'+':'')+rs.toFixed(1)+' pp vs S&P 500 / 20 sessions';
 const state=t.last>t.priorHigh20?'Above prior 20-session closing high':t.last<t.sma20?'Below 20-session average':'Breakout not confirmed';
 return {state,reason:strength,asOf:p.asOf,high:t.priorHigh20,average:t.sma20,atr:t.atr,volume:t.relativeVolume,rsi:t.rsi};
}
function swingDecisionHTML(symbol){const p=PRICES[symbol],x=swingDecision(p,PRICES.SPY);return `<div class="decision-check"><b>Price confirmation</b><span>${esc(x.state)}</span><small>${esc(x.reason)}${x.asOf?' · '+date(x.asOf):''}</small>${x.high?`<small>Closing-high reference ${money(x.high,p.currency||'USD')} · 20d average ${money(x.average,p.currency||'USD')}${x.volume!==null?' · Volume '+x.volume.toFixed(1)+'×':''}</small>`:''}<small>Historical conditions, not a buy signal. Check the catalyst and invalidation.</small></div>`}
let deskMarketsChecked=0,deskMarketsBusy=false,deskMarketFeed=null;
async function refreshMarketDesk(){const el=$('#homePredictionDesk');if(!el||deskMarketsBusy||Date.now()-deskMarketsChecked<120000)return;deskMarketsBusy=true;
 try{const r=await getLiveJSON('/api/predictions'),markets=(r.value?.markets||[]).filter(m=>m.insight).sort((a,b)=>Date.parse(b.insight.createdAt)-Date.parse(a.insight.createdAt));deskMarketsChecked=Date.now();deskMarketFeed=r;
 el.innerHTML=`<div class="home-heading"><h2>Political contracts · research</h2><button data-view="predictions">All markets →</button></div>${markets.length?`<div class="setup-grid">${markets.slice(0,2).map(m=>`<article class="setup-card"><small>${r.stale?'Saved market snapshot':'Market snapshot'} · ${stamp(r.checkedAt)}</small><h3>${esc(m.question)}</h3><b>${m.outcomes.map(o=>esc(o.label)+' '+(o.price===null?'—':(o.price*100).toFixed(1)+'%')).join(' · ')}</b><p>${esc(m.insight.thesis)}</p><p><b>Against:</b> ${esc(m.insight.against)}</p><p><b>Next check:</b> ${esc(m.insight.watch)}</p><small>Assessment ${stamp(m.insight.createdAt)} · inference</small><button data-desk-market="${esc(m.id)}">Rules, prices & evidence →</button></article>`).join('')}</div>`:`<p class="home-caption">${r.value?'Real contracts available; no current sourced assessment to highlight.':'Market feed unavailable.'} ${esc(r.researchStatus||'Research pending')}${r.researchCheckedAt?' · '+stamp(r.researchCheckedAt):''}</p>`}`;
 }catch{el.innerHTML='<p class="home-caption">Contract research unavailable. <button data-view="predictions">Open markets →</button></p>'}finally{deskMarketsBusy=false}}
if(typeof window!=='undefined'){
 document.addEventListener('click',async e=>{const b=e.target.closest('[data-desk-market]');if(b&&deskMarketFeed){pmFeed=deskMarketFeed;changeView('predictions');selectPrediction(b.dataset.deskMarket)}if(e.target.closest('[data-view="home"],#refreshHomeSetups,.brand'))refreshMarketDesk()});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&view==='home')refreshMarketDesk()});
 setInterval(()=>{if(!document.hidden&&view==='home')refreshMarketDesk()},120000);
 if(view==='home')refreshMarketDesk();
}
