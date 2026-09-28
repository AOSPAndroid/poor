'use strict';
let profileHorizon=20,profileHoldingType='all',profileHoldingOwner='all';
let profileResearchCache=null,profileResearchAt=0,profileResearchBusy=false;
function profileStats(rows){
 const dates=[...new Set(rows.map(disclosedDate).filter(Boolean))].sort(),lags=rows.map(disclosureDelay).filter(n=>Number.isFinite(n)&&n>=0),gaps=dates.slice(1).map((d,i)=>(Date.parse(d)-Date.parse(dates[i]))/86400000);
 return {batches:dates.length,last:dates.at(-1),lag:lags.length?lags.reduce((a,b)=>a+b,0)/lags.length:null,frequency:gaps.length?medianTrack(gaps):null,dated:lags.length};
}
function profileChange(r,rows){
 if(r.type==='Sale')return 'Sale disclosed · remaining balance unknown';
 if(r.type==='Exercise')return 'Exercise disclosed · check instrument';
 const older=rows.some(x=>x.id!==r.id&&x.person===r.person&&x.ticker===r.ticker&&x.owner===r.owner&&x.asset===r.asset&&x.type==='Purchase'&&x.traded<r.traded);
 return older?'Repeat purchase in loaded history':'First purchase in loaded history';
}
function profileComparison(rows,prices=PRICES,horizon=20,now=Date.now()){
 const unique=new Map(),samples=[],endDay=new Date(now).toISOString().slice(0,10),b=prices.SPY;
 for(const r of rows){if(r.type!=='Purchase'||!['Stock','ADR','ETF'].includes(r.asset)||r.quality==='User-provided'||!disclosedDate(r)||disclosedDate(r)>endDay||r.traded>endDay)continue;const key=r.ticker+'|'+r.traded,old=unique.get(key);if(!old||disclosedDate(r)<disclosedDate(old))unique.set(key,r)}
 const dates=Object.keys(b?.closes||{}).filter(d=>d<=endDay&&d<=b.asOf&&b.closes[d]>0).sort(),net=(a,z)=>(z*.999/(a*1.001)-1)*100;
 for(const r of unique.values()){
  const p=prices[r.ticker];if(!p||p.stale||p.error||b?.stale||b?.error||p.currency!==b?.currency||p.currency!=='USD')continue;
  const buy=dates.indexOf(r.traded),publicStart=dates.findIndex(d=>d>disclosedDate(r));if(buy<0||publicStart<0||Date.parse(dates[publicStart])-Date.parse(disclosedDate(r))>7*86400000)continue;
  const windows=[buy,publicStart].map(start=>dates.slice(start,start+horizon+1));
  if(windows.some(w=>w.length!==horizon+1||w.some(d=>!Number.isFinite(p.closes?.[d])||p.closes[d]<=0||d>p.asOf)))continue;
  const values=windows.map(w=>({stock:net(p.closes[w[0]],p.closes[w.at(-1)]),benchmark:net(b.closes[w[0]],b.closes[w.at(-1)])}));samples.push({ticker:r.ticker,purchase:values[0],disclosure:values[1]});
 }
 const mean=(mode,key)=>samples.length?samples.reduce((n,r)=>n+r[mode][key],0)/samples.length:null;
 return {count:samples.length,eligible:unique.size,purchase:mean('purchase','stock'),disclosure:mean('disclosure','stock'),purchaseBenchmark:mean('purchase','benchmark'),disclosureBenchmark:mean('disclosure','benchmark'),samples};
}
function profileResearchItems(person,records,archive,now=Date.now()){
 const portfolio=inferredPortfolio(person,records),positions=[...portfolio.held,...portfolio.uncertain.filter(p=>p.buy&&p.last.type!=='Sale')],symbols=new Set(positions.map(p=>p.ticker));
 const ordered=[...(archive?.items||[])].sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)),seen=new Set(),out=[];
 for(const a of ordered){if(a.phase!=='finding'||a.type!=='stock'||!symbols.has(a.target)||seen.has(a.target))continue;seen.add(a.target);const age=now-Date.parse(a.publishedAt);if(age<0||age>7*86400000||!researchEvidenceReady(a))continue;
 const review=ordered.find(r=>r.id===a.id&&r.phase==='challenge');out.push({...a,review,position:positions.find(p=>p.ticker===a.target)});}
 return out.sort((a,b)=>(b.verdict==='supported'&&b.review?.verdict==='supported')-(a.verdict==='supported'&&a.review?.verdict==='supported')||Date.parse(b.publishedAt)-Date.parse(a.publishedAt)).slice(0,4);
}
function profileOverview(person,rows){
 const s=profileStats(rows),m=profileComparison(rows,PRICES,profileHorizon),fmt=n=>Number.isFinite(n)?(n>=0?'+':'')+n.toFixed(1)+'%':'—',metric=(name,value)=>`<span><small>${name}</small><b>${value}</b></span>`;
 const batch=rows.filter(r=>disclosedDate(r)===s.last),range=Math.max(1,...[m.purchase,m.disclosure,m.purchaseBenchmark,m.disclosureBenchmark].filter(Number.isFinite).map(Math.abs));
 const bar=(name,n)=>`<div class="profile-comparison-row"><span>${name}</span><div class="profile-bar-track"><i class="${n<0?'negative':'positive'}" style="width:${Number.isFinite(n)?Math.abs(n)/range*50:0}%;${n<0?'right':'left'}:50%"></i></div><b>${fmt(n)}</b></div>`;
 return `<section class="profile-overview panel"><h2>Disclosure overview</h2><div class="track-metrics">${metric('Latest disclosure',s.last?date(s.last):'Unknown')}${metric('Average reporting delay',s.lag===null?'—':s.lag.toFixed(0)+' days')}${metric('Typical gap between disclosure dates',s.frequency===null?'—':s.frequency.toFixed(0)+' days')}${metric('Loaded disclosure dates',s.batches)}</div><p class="muted">${s.dated} dated transactions · loaded history only. Timing describes past filings, not a prediction of the next one.</p><div class="home-heading"><h3>What could a follower have captured?</h3><div role="group" aria-label="Comparison holding period">${[5,20,60].map(n=>`<button data-profile-horizon="${n}" aria-pressed="${n===profileHorizon}">${n} sessions</button>`).join('')}</div></div>${bar('After purchase',m.purchase)}${bar('S&P 500 · purchase window',m.purchaseBenchmark)}${bar('After disclosure',m.disclosure)}${bar('S&P 500 · disclosure window',m.disclosureBenchmark)}<p class="muted">${m.count} paired buys / ${m.eligible} eligible · all loaded history · same purchases, each held ${profileHorizon} sessions from its own entry. Mean net price returns, 10 bps/side. Disclosure entry is the first close after publication; purchase entry is that day’s close. SPY price proxy; excludes dividends, taxes and options. Missing or stale histories stay unscored; overlapping observations are not a portfolio.</p><details><summary>Latest disclosure · ${batch.length} transactions</summary>${batch.slice(0,12).map(r=>{const peers=[...new Set(signalData.filter(x=>x.person!==person&&x.ticker===r.ticker&&x.type==='Purchase'&&x.quality!=='User-provided'&&['Stock','ADR','Call options'].includes(x.asset)&&disclosedDate(x)&&disclosedDate(x)<=new Date().toISOString().slice(0,10)&&Math.abs(Date.parse(x.traded)-Date.parse(r.traded))<=30*86400000).map(x=>x.person))];return `<div class="profile-change"><button data-ticker="${esc(r.ticker)}">${esc(r.ticker)}</button><strong>${esc(profileChange(r,rows))}</strong><span>${esc(r.amount)} · ${esc(r.owner)} · ${esc(r.asset)}</span><small>Bought/sold ${date(r.traded)} · ${researchLink(r.source,'Source')}${r.type==='Purchase'&&peers.length?' · '+peers.length+' other household(s) bought within ±30 days; co-occurrence only':''}</small></div>`}).join('')}${batch.length>12?'<p>Remaining transactions appear in the timeline.</p>':''}</details><p class="muted">Follow enables in-app filing alerts after an initial baseline. Alerts are checked when your workspace refreshes; email and push are not connected.</p></section>`;
}
function profilePortfolio(person,rows){
 const p=inferredPortfolio(person,rows),all=[...p.held,...p.uncertain],owners=[...new Set(all.map(x=>x.owner))].sort();
 const selected=all.filter(x=>(profileHoldingOwner==='all'||x.owner===profileHoldingOwner)&&(profileHoldingType==='all'||profileHoldingType==='held'&&x.presumed||profileHoldingType==='options'&&/option/i.test(x.asset)||profileHoldingType==='uncertain'&&!x.presumed));
 const types=new Map();for(const x of all)types.set(x.asset,(types.get(x.asset)||0)+1);
 const sectors=new Map();for(const ticker of new Set(p.held.map(x=>x.ticker))){const sector=typeof SECTOR_DEFAULT!=='undefined'&&SECTOR_DEFAULT[ticker]&&SECTORS[SECTOR_DEFAULT[ticker]]||'Unclassified';sectors.set(sector,(sectors.get(sector)||0)+1)}
 return `<section class="politician-portfolio"><h3>Disclosed exposure</h3><div class="profile-filters"><label for="profileHoldingType">Positions<select id="profileHoldingType"><option value="all">All disclosed positions</option><option value="held">Presumed holdings</option><option value="options">Options</option><option value="uncertain">Sales & uncertain balances</option></select></label><label for="profileHoldingOwner">Ownership<select id="profileHoldingOwner"><option value="all">All owners</option>${owners.map(o=>`<option value="${esc(o)}">${esc(o)}</option>`).join('')}</select></label></div><p>${[...types].map(([name,count])=>esc(name)+': '+count).join(' · ')}</p><details><summary>Sector exposure · presumed holdings</summary><p>${[...sectors].map(([name,count])=>esc(name)+': '+count+' ticker(s)').join(' · ')||'No presumed stock holdings.'}</p><p class="muted">Default sector classifications where available; unclassified tickers remain visible. Counts, not value allocations.</p></details><p class="muted">Counts of disclosed owner/instrument groups, not portfolio weights. Transaction amount brackets are shown unchanged; current position values cannot be established.</p>${selected.map(portfolioRow).join('')||'<p>No positions match these filters.</p>'}</section>`;
}
function renderProfileResearch(){
 const el=$('#profileRelevantResearch');if(!el||!selectedPolitician)return;const rows=profileResearchItems(selectedPolitician,politicianRecords(selectedPolitician),profileResearchCache);
 el.innerHTML=`<h3>Research connected to disclosed exposure</h3>${rows.map(a=>`<article class="profile-change"><div><button data-ticker="${esc(a.target)}">${esc(a.target)}</button> <button data-map="${esc(a.target)}">Map ↗</button> · ${esc(investigationLabel[a.review?.verdict||a.verdict])}</div><b>${esc(a.title)}</b><small>${stamp(a.publishedAt)} · ${esc(a.position.asset)} · ${esc(a.position.owner)} · ${a.position.presumed?'presumed held':'contract/holding status uncertain'}</small><p><b>Connection:</b> ${esc(a.whyNow)}</p><p><b>Next catalyst/check:</b> ${esc(a.nextCheck)}</p><p><b>Risk:</b> ${esc(a.risk)}</p>${a.review?`<p><b>Challenge:</b> ${esc(a.review.reason)}</p>`:'<p>Independent review pending.</p>'}<p>${a.sources.map((u,i)=>researchLink(u,'Source '+(i+1))).join(' · ')}</p></article>`).join('')||`<p class="muted">${profileResearchBusy?'Checking sourced research…':profileResearchCache?'No current verified research linked to these disclosed positions. Open a stock’s map to investigate its evidence.':'Research unavailable; use Refresh to retry.'}</p>`}<button id="profileResearchRefresh">Refresh research</button>`;
 $('#profileResearchRefresh').onclick=()=>loadProfileResearch(true);
}
async function loadProfileResearch(force=false){if(profileResearchBusy)return;if(!force&&profileResearchCache&&Date.now()-profileResearchAt<15*60000){renderProfileResearch();return}profileResearchBusy=true;renderProfileResearch();try{profileResearchCache=await getLiveJSON('/api/research/activity');profileResearchAt=Date.now()}catch{profileResearchCache=null}finally{profileResearchBusy=false;renderProfileResearch()}}
if(typeof window!=='undefined'){
 document.addEventListener('click',e=>{const b=e.target.closest('[data-profile-horizon]');if(b){profileHorizon=Number(b.dataset.profileHorizon);renderPoliticianBrowser()}});
 document.addEventListener('change',e=>{if(e.target.id==='profileHoldingType'||e.target.id==='profileHoldingOwner'){profileHoldingType=$('#profileHoldingType').value;profileHoldingOwner=$('#profileHoldingOwner').value;renderPoliticianBrowser()}});
}
