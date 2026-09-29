'use strict';
const CURRENT_QUOTES={};let quoteRunning=null,quoteTimer=null,quoteSeconds=read('poor-quote-seconds',30)===60?60:30,quoteAuto=read('poor-quote-auto',true)!==false;
function displayQuote(symbol){const base=PRICES[symbol],q=CURRENT_QUOTES[symbol];if(!q?.latest||base&&q.currency!==base.currency||base?.asOf>q.asOf)return base;return {...base,...q,stale:!!q.stale||Date.now()-q.checkedAt>Math.max(180000,quoteSeconds*3000)};}
function quoteLabel(p){return p?.quoteAt?`${p.stale?'Stale':p.marketOpen?(p.delayed?'Delayed':'Latest quote'):'Market closed'} · ${stamp(p.quoteAt)}`:p?'Close '+date(p.asOf)+(p.stale?' · stale':''):'Loading quote…';}
function quoteSymbols(){return [...new Set([marketSymbol,...workspaceState.symbols,...(workspaceState.portfolioTransactions||[]).map(t=>t.symbol),...(view==='home'?[...(typeof belowPurchaseCandidates==='function'?belowPurchaseCandidates().sort((a,b)=>homeTrackPriority(b.person)-homeTrackPriority(a.person)||disclosedDate(b).localeCompare(disclosedDate(a))).slice(0,24).map(r=>r.ticker):[]),...(typeof ribbonPurchases==='function'?ribbonPurchases().map(r=>r.ticker):[]),...(typeof savedRibbonPurchases==='function'?savedRibbonPurchases(purchasesSaved).map(r=>r.ticker):[]),...HOME_SECTOR_SYMBOLS,...HOME_ETFS,...HOME_TECH_ETFS,...HOME_STOCKS]:[])])].filter(tickerValid).slice(0,100);}
function currentPortfolioPrices(){const result={...PRICES};for(const s of quoteSymbols())result[s]=displayQuote(s);return result;}
function paintCurrentQuotes(){
 const previous=captureQuoteNumbers();
 if(view==='home')renderHome();
 if(view==='market')renderTerminal();
 if(view==='portfolio'&&!document.querySelector('#personalForm input:focus,#personalForm select:focus'))renderPersonal();
 animateQuoteNumbers(previous);
}
function captureQuoteNumbers(){const values=new Map();for(const el of document.querySelectorAll('[data-quote-number]')){if(!el.getClientRects().length)continue;const value=Number(el.dataset.quoteValue);if(el.dataset.quoteValue!==''&&Number.isFinite(value))values.set(el.dataset.quoteNumber,{value,text:el.textContent})}return values;}
function animateQuoteNumbers(previous){
 if(document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 for(const el of document.querySelectorAll('[data-quote-number]')){
  const old=previous.get(el.dataset.quoteNumber),next=Number(el.dataset.quoteValue);
  if(!old||!Number.isFinite(next)||el.dataset.quoteValue===''||next===old.value||el.textContent===old.text||!el.getClientRects().length||!el.animate)continue;
  const up=next>old.value;el.animate([{backgroundColor:up?'#c8ecdb':'#f8d6d9',color:up?'#166247':'#a32d3e',transform:`translateY(${up?5:-5}px)`},{backgroundColor:'transparent',transform:'translateY(0)'}],{duration:650,easing:'cubic-bezier(.2,.7,.2,1)'});
 }
}
function quoteNumberAttrs(key,value){return `data-quote-number="${esc(key)}" data-quote-value="${Number.isFinite(value)?value:''}"`;}
function setQuoteStatus(text){$('#quoteStatus').textContent=text;for(const id of ['quoteRefresh','quoteRefreshFixed']){const b=$('#'+id);if(b){b.title='Refresh prices · '+text;b.setAttribute('aria-label','Refresh prices · '+text)}}}
function quoteControls(){const on=$('#quoteAuto'),rate=$('#quoteSeconds');if(!on)return;on.checked=quoteAuto;rate.value=String(quoteSeconds);rate.disabled=!quoteAuto;for(const id of ['quoteRefresh','quoteRefreshFixed']){const b=$('#'+id);if(b){b.disabled=!!quoteRunning;b.classList.toggle('refreshing',!!quoteRunning);b.setAttribute('aria-busy',String(!!quoteRunning))}}}
function refreshCurrentQuotes(force=false){
 if(quoteRunning)return quoteRunning;
 const symbols=quoteSymbols();setQuoteStatus('Updating prices…');
 quoteRunning=(async()=>{let failed=0;
  for(let i=0;i<symbols.length;i+=6){const batch=symbols.slice(i,i+6);try{
   const results=await getLiveJSON('/api/quotes?symbols='+encodeURIComponent(batch.join(','))+(force?'&refresh=1':''));
   for(const s of batch){const r=results[s],q=r?.value;if(q?.symbol===s&&Number.isFinite(q.latest)&&q.latest>0&&q.quoteAt&&Number.isFinite(Date.parse(q.quoteAt))&&typeof q.currency==='string'){CURRENT_QUOTES[s]={...q,checkedAt:r.checkedAt,stale:!!r.stale||!!r.error};if(r.stale||r.error)failed++}else{failed++;if(CURRENT_QUOTES[s])CURRENT_QUOTES[s].stale=true}}
  }catch{failed+=batch.length;for(const s of batch)if(CURRENT_QUOTES[s])CURRENT_QUOTES[s].stale=true}}
  paintCurrentQuotes();setQuoteStatus(failed?`${failed} quotes unavailable · saved prices shown`:'Checked '+new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'}));
 })().finally(()=>{quoteRunning=null;quoteControls();scheduleQuotes()});quoteControls();return quoteRunning;
}
function scheduleQuotes(){clearTimeout(quoteTimer);if(quoteAuto&&!document.hidden)quoteTimer=setTimeout(()=>refreshCurrentQuotes(),quoteSeconds*1000);}
document.addEventListener('DOMContentLoaded',()=>{
 const el=document.createElement('div');el.className='quote-controls';el.innerHTML='<label><input id="quoteAuto" type="checkbox" role="switch"> Auto prices</label><select id="quoteSeconds" aria-label="Price refresh interval"><option value="30">30s</option><option value="60">60s</option></select>';$('#appUtilityMenu').append(el);
 const button=document.createElement('button');button.id='quoteRefresh';button.className='quote-refresh';button.type='button';button.title='Refresh prices';button.setAttribute('aria-label','Refresh prices');button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M20 12a8 8 0 1 0-2.4 5.7"/></svg><span id="quoteStatus" class="sr-only" role="status"></span>';$('#commandButton').before(button);
 const fixed=document.createElement('button');fixed.id='quoteRefreshFixed';fixed.className='quote-refresh quote-refresh-fixed';fixed.type='button';fixed.title='Refresh prices';fixed.setAttribute('aria-label','Refresh prices');fixed.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M20 12a8 8 0 1 0-2.4 5.7"/></svg>';document.body.append(fixed);fixed.onclick=()=>refreshCurrentQuotes(true);
 $('#quoteAuto').onchange=e=>{quoteAuto=e.target.checked;persist('poor-quote-auto',quoteAuto);quoteControls();scheduleQuotes();if(quoteAuto)refreshCurrentQuotes()};
 $('#quoteSeconds').onchange=e=>{quoteSeconds=Number(e.target.value)===30?30:60;persist('poor-quote-seconds',quoteSeconds);scheduleQuotes()};
 $('#quoteRefresh').onclick=()=>refreshCurrentQuotes(true);quoteControls();refreshCurrentQuotes(true);
 document.addEventListener('visibilitychange',()=>{clearTimeout(quoteTimer);if(!document.hidden&&quoteAuto)refreshCurrentQuotes()});
 document.addEventListener('click',e=>{if(e.target.closest('[data-ticker],[data-view]')&&quoteAuto)setTimeout(()=>refreshCurrentQuotes(),0)});
});

function liveMiniChart(symbol){
 const p=displayQuote(symbol),points=p?.intraday;if(!Array.isArray(points)||points.length<2)return '<span class="ribbon-chart-empty">Chart pending</span>';
 const values=points.map(v=>v[1]),lo=Math.min(...values),hi=Math.max(...values),from=points[0][0],to=points.at(-1)[0],x=t=>2+(t-from)/Math.max(1,to-from)*96,y=v=>21-(v-lo)/Math.max(.01,hi-lo)*18;
 const path=points.map(([t,v],i)=>`${i?'L':'M'}${x(t).toFixed(1)},${y(v).toFixed(1)}`).join(' '),color=values.at(-1)>=(p.previousClose||values[0])?'#16805a':'#bd4141';
 return `<svg viewBox="0 0 100 24" role="img" aria-label="${esc(symbol)} intraday prices · ${esc(quoteLabel(p))}"><title>${esc(quoteLabel(p))} · intraday</title><path d="${path}" fill="none" stroke="${color}" stroke-width="1.5" vector-effect="non-scaling-stroke"/><circle cx="${x(to)}" cy="${y(values.at(-1))}" r="1.8" fill="${color}"/></svg>`;
}
