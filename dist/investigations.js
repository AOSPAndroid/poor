'use strict';
let activityChecked=0,activityBusy=false;
const investigationLabel={supported:'Supported thesis',wait:'Wait',rejected:'Rejected',unverified:'Could not verify'};
function investigationCard(a,review){return `<article class="setup-card investigation-card"><div class="home-heading"><b>${esc(a.type==='briefing'?'Market briefing':a.target)}</b><span class="investigation-verdict">${investigationLabel[review?.verdict||a.verdict]}</span></div><h3>${esc(a.title)}</h3><small>${stamp(a.publishedAt)} · public-evidence research</small><p>${esc(a.whyNow)}</p><p><b>Entry:</b> ${esc(a.entry)}</p><p><b>Risk:</b> ${esc(a.risk)}</p><p><b>Next check:</b> ${esc(a.nextCheck)}</p>${review&&review.verdict!==a.verdict?`<p><b>Challenge:</b> ${esc(review.reason)}</p>`:''}<details><summary>Decision & independent challenge</summary><p><b>Investigation · ${investigationLabel[a.verdict]}:</b> ${esc(a.reason)}</p>${review?`<p><b>Challenge · ${investigationLabel[review.verdict]}:</b> ${esc(review.reason)}</p><small>${stamp(review.publishedAt)}</small><p>${review.sources.map((u,i)=>researchLink(u,'Review source '+(i+1))).join(' · ')}</p>`:'<p>Independent challenge pending. This case has not passed a second review.</p>'}<p>Agreement is not proof of an edge. Claims and causal connections still require judgment.</p></details><p>${a.sources.map((u,i)=>researchLink(u,'Source '+(i+1))).join(' · ')}</p>${a.type==='stock'?`<button data-ticker="${esc(a.target)}">Chart ↗</button> <button data-map="${esc(a.target)}">Map ↗</button>`:a.type==='contract'?`<button data-research-contract="${esc(a.target)}">Current contract & odds ↗</button>`:''}</article>`}
function researchEvidenceReady(a){return !!a&&a.decisiveEvidenceRetrieved===true&&['supported','wait','rejected'].includes(a.verdict)&&Array.isArray(a.sources)&&a.sources.length>0}
function researchFeed(items,now=Date.now()){
 const ordered=[...items].sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)),findings=ordered.filter(a=>a.phase==='finding'),latest=[],seen=new Set();
 for(const a of findings){const key=a.type+':'+a.target;if(!seen.has(key)){seen.add(key);latest.push(a)}}
 const review=a=>ordered.find(r=>r.phase==='challenge'&&r.id===a.id),fresh=a=>{const age=now-Date.parse(a.publishedAt);return age>=0&&age<=3*86400000};
 const research=latest.filter(a=>researchEvidenceReady(a)&&fresh(a));
 const home=research.filter(a=>a.verdict==='supported'&&(a.type==='briefing'? !review(a)||review(a).verdict==='supported':review(a)?.verdict==='supported'));
 return {home,research,earlier:findings.filter(a=>researchEvidenceReady(a)&&!research.includes(a)),review};
}
async function refreshResearchActivity(force=false){if(activityBusy||!force&&Date.now()-activityChecked<900000)return;activityBusy=true;try{
 const d=await getLiveJSON('/api/research/activity'),feed=researchFeed(d.items||[]);
 for(const [id,limit]of [['homeResearchActivity',3],['dailyResearchActivity',20]]){
  const el=document.getElementById(id);if(!el)continue;const home=id==='homeResearchActivity',rows=(home?feed.home:feed.research).slice(0,limit);
  el.hidden=home&&!rows.length;
  if(el.hidden){el.innerHTML='';continue}
  el.innerHTML=`<div class="home-heading"><h2>${home?'Research worth a closer look':'Evidence-backed research'}</h2>${home?'<button data-view="daily">All research →</button>':''}</div><div class="setup-grid">${rows.map(a=>investigationCard(a,feed.review(a))).join('')||'<p>No new evidence-backed findings yet. Market news and existing research remain available.</p>'}</div>${!home&&feed.earlier.length?`<details><summary>Earlier findings & follow-ups</summary><p class="home-caption">Historical research; conditions may have changed. Includes rejected and superseded theses.</p><div class="setup-grid">${feed.earlier.map(a=>investigationCard(a,feed.review(a))).join('')}</div></details>`:''}`;
 }activityChecked=Date.now();
 }catch{const el=document.getElementById('dailyResearchActivity');if(el&&!el.querySelector('article'))el.textContent='Research unavailable; retry shortly.'}finally{activityBusy=false}}
function renderResearchPriority(){const el=document.getElementById('researchPriority');if(el){el.checked=!!workspaceState.researchPriority;el.disabled=!workspaceState.user}}
if(typeof window!=='undefined'){
 refreshResearchActivity();renderResearchPriority();document.getElementById('researchPriority').onchange=async e=>{await workspaceAction({kind:'researchPriority',enabled:e.target.checked});renderResearchPriority()};
 document.addEventListener('click',async e=>{if(e.target.closest('#dailyRefresh,#refreshHomeSetups'))refreshResearchActivity(true);const b=e.target.closest('[data-research-contract]');if(b){changeView('predictions');await loadPredictions();if(pmFeed?.value?.markets.some(m=>m.id===b.dataset.researchContract))selectPrediction(b.dataset.researchContract);else notify('Contract is not in the current open-market feed.')}});
 setInterval(()=>{if(!document.hidden)refreshResearchActivity()},900000);
}
