'use strict';
// Every window is bounded by its first and last trade, not chained neighbors.
function buyingClusters(records,days){
 const groups=new Map(),out=[];
 const personKey=r=>r.person.trim().toLowerCase().replace(/\s+/g,' ');
 for(const r of records){
  if(r.type!=='Purchase'||!['stock','adr','call options'].includes(r.asset.trim().toLowerCase()))continue;
  const today=new Date().toISOString().slice(0,10),publicDate=disclosedDate(r);if(r.quality==='User-provided'||!publicDate||publicDate>today||r.traded>today)continue;
  const ticker=r.ticker.trim().toUpperCase();if(!ticker||ticker==='N/A'||ticker==='—')continue;
  if(!groups.has(ticker))groups.set(ticker,[]);groups.get(ticker).push(r);
 }
 for(const [ticker,rows] of groups){
  rows.sort((a,b)=>a.traded.localeCompare(b.traded));let previousEnd=-1;
  for(let start=0,end=0;start<rows.length;start++){
   while(end<rows.length&&(Date.parse(rows[end].traded)-Date.parse(rows[start].traded))/86400000<=days)end++;
   if(end===previousEnd)continue;previousEnd=end;
   const slice=rows.slice(start,end),people=new Map(slice.map(r=>[personKey(r),r.person]));
   if(people.size<2)continue;
   out.push({ticker,rows:slice,people:[...people.values()],count:people.size,disclosed:slice.map(disclosedDate).sort().at(-1),start:slice[0].traded,end:slice.at(-1).traded});
  }
 }
 return out.sort((a,b)=>b.count-a.count||b.end.localeCompare(a.end)||a.ticker.localeCompare(b.ticker));
}
let clusterDays=30,clusterCache=null,clusterData=null,clusterCacheDays=null,clusterByRow=new Map();
function clusters(){
 if(clusterData!==signalData||clusterCacheDays!==clusterDays){
  clusterData=signalData;clusterCacheDays=clusterDays;clusterCache=buyingClusters(signalData,clusterDays);clusterByRow=new Map();
  clusterCache.forEach((g,i)=>g.rows.forEach(r=>{if(!clusterByRow.has(r.id))clusterByRow.set(r.id,{...g,index:i})}));
 }
 return clusterCache;
}
function clusterBadge(r){const g=clusterByRow.get(r.id);return g?`<button class="cluster-flag" data-cluster="${g.index}" title="${g.count} distinct politician households bought ${esc(g.ticker)} within ${clusterDays} days">⚑ ${g.count} buyers</button>`:'';}
function renderClusters(){
 renderSharedBuying();const groups=clusters(),tickers=new Set(groups.map(g=>g.ticker));
 $('#clusterSummary').textContent=tickers.size?`${tickers.size} flagged stocks · ${groups.length} windows`:'No shared buys in this snapshot';
 $('#clusterChips').innerHTML=groups.slice(0,5).map((g,i)=>`<button class="cluster-flag" data-cluster="${i}">${esc(g.ticker)} · ${g.count} buyers</button>`).join('');
}
function clusterDetails(index){
 const g=clusters()[Number(index)];if(!g)return;
 $('#detailContent').innerHTML=`<div class="eyebrow">SHARED BUYING · ${clusterDays}D WINDOW</div><h2>${esc(g.ticker)} · ${g.count} buyers</h2><p>Bought ${date(g.start)} – ${date(g.end)}<br>Last disclosure ${date(g.disclosed)}</p><p>${g.people.filter(p=>ROSTER[p]).length} featured · ${g.count-g.people.filter(p=>ROSTER[p]).length} other households</p><p class="muted">Distinct politician households. Counts include stock, ADR and call purchases; imports are excluded; ownership and evidence appear below. Shared buying is not evidence of insider information.</p><div class="cluster-evidence">${g.rows.map(r=>`<article><strong>${esc(r.person)}</strong> · ${esc(r.owner)}<br>Bought on ${date(r.traded)} · ${esc(r.asset)} · ${esc(r.amount)}<br><small>Disclosed ${disclosedDate(r)?date(disclosedDate(r)):'date unknown'} · ${disclosureDelay(r)!==null?disclosureDelay(r)+'d gap':'signed '+date(r.filed)} · ${esc(r.quality)}</small> <a href="${esc(r.source)}" target="_blank" rel="noopener">Source ↗</a></article>`).join('')}</div><p class="muted">All available feed households, including politicians outside the featured list. Coverage is incomplete; scanned filings can be missing. Multiple rows for one politician count once. Windows use trade dates, even when disclosed later.</p>`;
 $('#details').showModal();
}

function renderSharedBuying(){const el=$('#homeSharedBuys');if(!el)return;const groups=buyingClusters(signalData,30),latest=[...new Set(groups.map(g=>g.ticker))].map(t=>groups.filter(g=>g.ticker===t).sort((a,b)=>b.end.localeCompare(a.end)||b.count-a.count)[0]).sort((a,b)=>b.end.localeCompare(a.end)||b.count-a.count).slice(0,6);el.innerHTML=latest.map(g=>`<button class="shared-buy-card" data-shared-stock="${esc(g.ticker)}"><b>${esc(g.ticker)} <strong>${g.count} buyers</strong></b><span>${g.people.filter(p=>ROSTER[p]).length} featured · ${g.count-g.people.filter(p=>ROSTER[p]).length} other households</span><small>Bought ${date(g.start)} → ${date(g.end)}<br>Last disclosed ${date(g.disclosed)}</small></button>`).join('')||'<p class="muted">No overlapping purchases in the available disclosures.</p>';$('#sharedCoverage').textContent=`${new Set(signalData.map(r=>r.person)).size} households in available records · 30-day purchase windows · one count per household · incomplete coverage`}
function openSharedStock(ticker){clusterDays=30;$('#clusterWindow').value='30';const groups=clusters(),match=groups.map((g,i)=>({g,i})).filter(x=>x.g.ticker===ticker).sort((a,b)=>b.g.end.localeCompare(a.g.end)||b.g.count-a.g.count)[0];if(match)clusterDetails(match.i)}
if(typeof window!=='undefined')document.addEventListener('click',e=>{const b=e.target.closest('[data-shared-stock]');if(b)openSharedStock(b.dataset.sharedStock)});
