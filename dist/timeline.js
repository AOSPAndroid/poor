'use strict';
let allTimelineLimit=80;
function allTimelineRows(records=signalData,query='',person='',type='Purchase',following=false,now=Date.now()){
 const today=new Date(now).toISOString().slice(0,10),q=query.trim().toLowerCase(),seen=new Set();
 return records.filter(r=>r.quality!=='User-provided'&&['Purchase','Sale','Exercise'].includes(r.type)&&r.traded&&r.traded<=today&&disclosedDate(r)&&disclosedDate(r)<=today&&(!type||r.type===type)&&(!person||r.person===person)&&(!following||follows.has(r.person))&&(!q||[r.person,r.company,r.ticker].join(' ').toLowerCase().includes(q)))
 .sort((a,b)=>b.traded.localeCompare(a.traded)||disclosedDate(b).localeCompare(disclosedDate(a))||String(a.id).localeCompare(String(b.id)))
 .filter(r=>{const key=[r.person,r.ticker,r.type,r.traded,disclosedDate(r),r.asset,r.owner,r.amount,r.source].join('|');if(seen.has(key))return false;seen.add(key);return true});
}
function renderAllTimeline(){
 const select=$('#timelinePerson'),selected=select.value,names=politicianNames(),options='<option value="">All politicians</option>'+names.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('');if(select.innerHTML!==options){select.innerHTML=options;select.value=selected}
 const rows=allTimelineRows(signalData,$('#timelineSearch').value,select.value,$('#timelineType').value,$('#timelineFollowing').checked),visible=rows.slice(0,allTimelineLimit),more=rows.length>visible.length;
 $('#timelineCount').textContent=rows.length+' transactions · '+new Set(rows.map(r=>r.person)).size+' politicians · showing '+visible.length;
 let html=politicianTimeline(visible,true);if(more)html=html.replace(/<p class="timeline-end">.*?<\/p>$/,'');$('#allTimeline').innerHTML=html;$('#timelineOlder').hidden=!more;
}
if(typeof window!=='undefined'){
 for(const id of ['timelineSearch','timelinePerson','timelineType','timelineFollowing'])$('#'+id).addEventListener(id==='timelineSearch'?'input':'change',()=>{allTimelineLimit=80;renderAllTimeline()});
 $('#timelineOlder').onclick=()=>{allTimelineLimit+=80;renderAllTimeline()};
 new IntersectionObserver(entries=>{if(view==='timeline'&&!$('#timelineOlder').hidden&&entries.some(e=>e.isIntersecting)){allTimelineLimit+=80;renderAllTimeline()}},{rootMargin:'200px'}).observe($('#timelineOlder'));
}
