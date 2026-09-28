'use strict';
const CURRENT_QUOTES={};let quoteRunning=null,quoteTimer=null,quoteSeconds=read('poor-quote-seconds',30)===60?60:30,quoteAuto=read('poor-quote-auto',true)!==false;
function displayQuote(symbol){const base=PRICES[symbol],q=CURRENT_QUOTES[symbol];if(!q?.latest||base&&q.currency!==base.currency||base?.asOf>q.asOf)return base;return {...base,...q,stale:!!q.stale||Date.now()-q.checkedAt>Math.max(180000,quoteSeconds*3000)};}
function quoteLabel(p){return p?.quoteAt?`${p.stale?'Stale':p.marketOpen?(p.delayed?'Delayed':'Latest quote'):'Market closed'} · ${stamp(p.quoteAt)}`:p?'Close '+date(p.asOf)+(p.stale?' · stale':''):'Loading quote…';}
function quoteSymbols(){return [...new Set([marketSymbol,...workspaceState.symbols,...(workspaceState.portfolioTransactions||[]).map(t=>t.symbol),...(view==='home'?[...HOME_SECTOR_SYMBOLS,...HOME_ETFS,...HOME_TECH_ETFS,...HOME_STOCKS]:[])])].filter(tickerValid).slice(0,100);}
function currentPortfolioPrices(){const result={...PRICES};for(const s of quoteSymbols())result[s]=displayQuote(s);return result;}
function paintCurrentQuotes(){
 if(view==='home')renderHome();
 if(view==='market')renderTerminal();
 if(view==='portfolio'&&!document.querySelector('#personalForm input:focus,#personalForm select:focus'))renderPersonal();
}
function setQuoteStatus(text){$('#quoteStatus').textContent=text;$('#quoteRefresh').title='Refresh prices · '+text;$('#quoteRefresh').setAttribute('aria-label','Refresh prices · '+text)}
function quoteControls(){const on=$('#quoteAuto'),rate=$('#quoteSeconds');if(!on)return;on.checked=quoteAuto;rate.value=String(quoteSeconds);rate.disabled=!quoteAuto;$('#quoteRefresh').disabled=!!quoteRunning;$('#quoteRefresh').classList.toggle('refreshing',!!quoteRunning);$('#quoteRefresh').setAttribute('aria-busy',String(!!quoteRunning));}
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
 $('#quoteAuto').onchange=e=>{quoteAuto=e.target.checked;persist('poor-quote-auto',quoteAuto);quoteControls();scheduleQuotes();if(quoteAuto)refreshCurrentQuotes()};
 $('#quoteSeconds').onchange=e=>{quoteSeconds=Number(e.target.value)===30?30:60;persist('poor-quote-seconds',quoteSeconds);scheduleQuotes()};
 $('#quoteRefresh').onclick=()=>refreshCurrentQuotes(true);quoteControls();refreshCurrentQuotes(true);
 document.addEventListener('visibilitychange',()=>{clearTimeout(quoteTimer);if(!document.hidden&&quoteAuto)refreshCurrentQuotes()});
 document.addEventListener('click',e=>{if(e.target.closest('[data-ticker],[data-view]')&&quoteAuto)setTimeout(()=>refreshCurrentQuotes(),0)});
});
