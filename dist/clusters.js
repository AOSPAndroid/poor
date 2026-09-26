'use strict';
// Every window is bounded by its first and last trade, not chained neighbors.
function buyingClusters(records,days){
 const groups=new Map(),out=[];
 const personKey=r=>r.person.trim().toLowerCase().replace(/\s+/g,' ');
 for(const r of records){
  if(r.type!=='Purchase'||!['stock','adr','call options'].includes(r.asset.trim().toLowerCase()))continue;
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
   out.push({ticker,rows:slice,people:[...people.values()],count:people.size,start:slice[0].traded,end:slice.at(-1).traded});
  }
 }
 return out.sort((a,b)=>b.count-a.count||b.end.localeCompare(a.end)||a.ticker.localeCompare(b.ticker));
}
let clusterDays=30,clusterCache=null,clusterData=null,clusterCacheDays=null,clusterByRow=new Map();
function clusters(){
 if(clusterData!==data||clusterCacheDays!==clusterDays){
  clusterData=data;clusterCacheDays=clusterDays;clusterCache=buyingClusters(data,clusterDays);clusterByRow=new Map();
  clusterCache.forEach((g,i)=>g.rows.forEach(r=>{if(!clusterByRow.has(r.id))clusterByRow.set(r.id,{...g,index:i})}));
 }
 return clusterCache;
}
function clusterBadge(r){const g=clusterByRow.get(r.id);return g?`<button class="cluster-flag" data-cluster="${g.index}" title="${g.count} distinct politician households bought ${esc(g.ticker)} within ${clusterDays} days">⚑ ${g.count} buyers</button>`:'';}
function renderClusters(){
 const groups=clusters(),tickers=new Set(groups.map(g=>g.ticker));
 $('#clusterSummary').textContent=tickers.size?`${tickers.size} flagged stocks · ${groups.length} windows`:'No shared buys in this snapshot';
 $('#clusterChips').innerHTML=groups.slice(0,5).map((g,i)=>`<button class="cluster-flag" data-cluster="${i}">${esc(g.ticker)} · ${g.count} buyers</button>`).join('');
}
function clusterDetails(index){
 const g=clusters()[Number(index)];if(!g)return;
 $('#detailContent').innerHTML=`<div class="eyebrow">SHARED BUYING · ${clusterDays}D WINDOW</div><h2>${esc(g.ticker)} · ${g.count} buyers</h2><p>${date(g.start)} – ${date(g.end)}</p><p class="muted">Distinct politician households. Counts include stock, ADR and call purchases; ownership and evidence appear below. Shared buying is not evidence of insider information.</p><div class="cluster-evidence">${g.rows.map(r=>`<article><strong>${esc(r.person)}</strong> · ${esc(r.owner)}<br>${date(r.traded)} · ${esc(r.asset)} · ${esc(r.amount)}<br><small>Filed ${date(r.filed)} · ${lag(r)}d delay · ${esc(r.quality)}</small> <a href="${esc(r.source)}" target="_blank" rel="noopener">Source ↗</a></article>`).join('')}</div><p class="muted">Selected historical records, not live signals. Multiple rows for one politician count once. Windows use trade dates, even when disclosed later.</p>`;
 $('#details').showModal();
}
