'use strict';
function renderHealth(){
 const target=$('#healthMarkers');if(!target)return;
 const feeds=Object.values(liveStatus),issues=feeds.filter(s=>s.error||s.stale||s.providerStale),quotes=Object.values(CURRENT_QUOTES),bad=quotes.filter(q=>q.stale||Date.now()-q.checkedAt>180000),history=[...priceChecks.values()],historyBad=history.filter(p=>p.error);
 const marker=(title,label,tone,detail)=>`<article class="health-marker"><small>${title}</small><strong class="health-${tone}"><i></i>${label}</strong><p>${esc(detail)}</p></article>`;
 target.innerHTML=marker('Political disclosures',liveBusy?'Checking':!feeds.length?'Not checked':issues.length?'Needs attention':'Connected',issues.length?'warn':feeds.length?'good':'unknown',feeds.length?`${feeds.length-issues.length}/${feeds.length} feeds available · detailed dates below`:'Waiting for a successful feed check')
 +marker('Current quotes',quoteRunning?'Refreshing':!quotes.length?'Not checked':bad.length?'Some stale':'Available',bad.length?'warn':quotes.length?'good':'unknown',`${quotes.length-bad.length}/${quotes.length} fetched quotes fresh · ${quoteAuto?quoteSeconds+'s automatic refresh':'automatic refresh off'}. Market-closed quotes retain their last trading time.`)
 +marker('Price history',priceBusy?'Refreshing':!history.length?'Not checked':historyBad.length?'Some unavailable':'Available',historyBad.length?'warn':history.length?'good':'unknown',`${history.length-historyBad.length}/${history.length} checked symbols available · completed daily closes`)
 +marker('Research feed',activityBusy?'Checking':!activityChecked?'Not checked':Date.now()-activityChecked>1800000?'Check overdue':'Reachable',!activityChecked?'unknown':Date.now()-activityChecked>1800000?'warn':'good',activityChecked?'Last successful retrieval '+stamp(activityChecked)+'. Retrieval does not confirm a new article was published.':'No successful retrieval recorded this session')
 +marker('Portfolio & bookmarks',workspaceBusy?'Syncing':workspaceReady?'Connected':'Not connected',workspaceReady?'good':'unknown',workspaceReady?(workspaceState.user?'Signed-in account storage':'Guest storage · this browser identity'):'Waiting for saved account data')
 +marker('Agent research',!activityPipeline?'Not checked':Date.now()-Date.parse(activityPipeline.checkedAt)>7200000?'Check overdue':activityPipeline.health?.degraded?'Needs attention':activityPipeline.health?.verified?'Evidence verified':'Monitoring',!activityPipeline?'unknown':Date.now()-Date.parse(activityPipeline.checkedAt)>7200000||activityPipeline.health?.degraded?'warn':activityPipeline.health?.verified?'good':'unknown',activityPipeline?(activityPipeline.status+' · '+stamp(activityPipeline.checkedAt)):'Waiting for the research health report');
}
document.addEventListener('DOMContentLoaded',()=>{
 const overview=$('.overview');if(overview)$('#statusSummary').append(overview);
 const feed=$('#feedStatus');if(feed)$('#statusFeedDetails').append(feed);
 $('#statusRefresh').onclick=async()=>{const b=$('#statusRefresh');b.disabled=true;try{await Promise.allSettled([refreshLive(),refreshCurrentQuotes(true),refreshResearchActivity(true),loadDailyResearch(),workspaceAction()])}finally{b.disabled=false;renderHealth()}};
 renderHealth();setInterval(()=>{if(view==='status'&&!document.hidden)renderHealth()},2000);
});
