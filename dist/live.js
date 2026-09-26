'use strict';
const liveFeeds={},liveStatus={},priceChecks=new Map();let liveBusy=false,priceBusy=false;
const stamp=t=>t?new Date(t).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'never';
function sourceGroup(r){let source;try{source=decodeURIComponent(r.source).toLowerCase()}catch{source=r.source}return [source,r.person.toLowerCase(),r.ticker,r.traded].join('|')}
function rebuildLiveData(){
 const seedGroups=new Set(SEED.map(sourceGroup)),seen=new Set();
 const feedRows=Object.values(liveFeeds).flat().filter(r=>!seedGroups.has(sourceGroup(r)));
 data=[...SEED,...feedRows,...imported].filter(r=>{if(seen.has(r.id))return false;seen.add(r.id);return true});render();
}
function liveStatusView(){
 const sources=Object.entries(liveStatus),fail=sources.some(([,v])=>v.stale||v.error||v.providerStale);
 $('.snapshot').textContent=liveBusy?'Updating feeds…':sources.length?`Auto updates · ${fail?'Check sources':'Connected'} ⓘ`:'Saved snapshot · Connecting…';
 $('.snapshot').title='Refreshes automatically while open and on return. No unattended scheduled task. Open Sources for coverage and freshness.';
 const checked=[...priceChecks.values()],good=checked.filter(x=>!x.error),failed=checked.length-good.length;
 const total=new Set(data.filter(r=>r.type!=='Sale'&&/^[A-Z][A-Z0-9.-]{0,11}$/.test(r.ticker)).map(r=>r.ticker)).size;
 $('.price-note').textContent=`Prices ${good.length}/${total} checked${priceBusy?' · Updating…':failed?' · '+failed+' unavailable':''} · dates per row`;
 $('#feedStatus').innerHTML=sources.map(([name,s])=>`<p><strong>${name==='congress'?'CongressInvests':'Trump · Open Cabinet'}</strong> · ${s.error?'Update failed; saved data':s.providerStale?'Provider data stale':s.stale?'Saved data':'Connected'}<br>Last success: ${esc(stamp(s.checkedAt))} · Provider updated: ${esc(stamp(s.value?.sourceUpdatedAt))}<br>${esc(s.value?.coverage||'Using selected historical records.')} ${s.value?`${s.value.rows.length} loaded; ${s.value.skipped||0} unsupported rows omitted.`:''}</p>`).join('')+`<p>Prices: ${good.length}/${total} symbols checked this session${failed?`; ${failed} unavailable`:''}. Each row shows its latest completed closing date. If a refresh fails, older prices remain labeled with their actual dates.</p>`;
}
async function getLiveJSON(url){const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error('Update unavailable');return r.json()}
async function refreshPrices(){
 if(priceBusy)return;priceBusy=true;liveStatusView();
 const symbols=[...new Set([...filtered(),...data].filter(r=>r.type!=='Sale'&&/^[A-Z][A-Z0-9.-]{0,11}$/.test(r.ticker)).map(r=>r.ticker))];
 for(let i=0;i<symbols.length;i+=6){
  const batch=symbols.slice(i,i+6);
  try{const values=await getLiveJSON('/api/prices?symbols='+encodeURIComponent(batch.join(',')));
   for(const ticker of batch){const result=values[ticker],p=result?.value;const valid=p&&p.latest>0&&typeof p.closes==='object'&&validDate(p.asOf)&&p.asOf<=new Date().toISOString().slice(0,10)&&typeof p.currency==='string'&&p.source?.startsWith('https://finance.yahoo.com/');
    if(valid)PRICES[ticker]={...p,stale:!!result.stale,checkedAt:result.checkedAt};
    priceChecks.set(ticker,{checkedAt:result?.checkedAt,error:!valid||!!result.error||!!result.stale});
   }
  }catch{for(const ticker of batch)priceChecks.set(ticker,{error:true})}
  renderRows();renderPeople();liveStatusView();
 }
 priceBusy=false;liveStatusView();if(typeof renderTerminal==='function'){await loadMarketPrices([...workspaceState.symbols,...workspaceState.rules.map(r=>r.symbol),marketSymbol,'SPY']);renderTerminal();await workspaceAction()}
}
async function refreshLive(){
 if(liveBusy)return;liveBusy=true;liveStatusView();
 await Promise.all(['congress','executive'].map(async name=>{
  try{const result=await getLiveJSON('/api/feed/'+name),value=result.value;
   if(value&&Array.isArray(value.rows)){
    const rows=value.rows.filter(r=>{try{validate(r);return typeof r.id==='string'}catch{return false}});
    if(value.rows.length&&!rows.length)throw Error('Invalid feed');
    liveFeeds[name]=rows;
   }
   liveStatus[name]={...result,providerStale:!!value&&(value.providerCurrent===false||!value.sourceUpdatedAt||Date.now()-Date.parse(value.sourceUpdatedAt)>48*3600000)};
  }catch{liveStatus[name]={...liveStatus[name],error:true,stale:true}}
 }));
 rebuildLiveData();if(typeof renderTerminal==='function')renderTerminal();liveBusy=false;liveStatusView();await refreshPrices();
}
if(typeof window!=='undefined'&&typeof fetch==='function'){
 refreshLive();
 setInterval(()=>{if(!document.hidden)refreshLive()},15*60000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshLive()});
}
