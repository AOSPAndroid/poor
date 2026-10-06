'use strict';
function isIntradayRange(range=marketRange){return range==='1D'||range==='30m'}
function intradayPoints(quote,range,now=Date.now()){
 const samples=new Map();
 for(const pair of quote?.intraday||[]){const [t,v]=pair;if(Number.isFinite(t)&&t<=now&&Number.isFinite(v)&&v>0)samples.set(t,v)}
 const sorted=[...samples].sort((a,b)=>a[0]-b[0]);if(!sorted.length)return [];
 const end=sorted.at(-1)[0],session=new Date(end).toISOString().slice(0,10);
 return sorted.filter(([t])=>new Date(t).toISOString().slice(0,10)===session&&(range!=='30m'||t>=end-30*60000)).map(([t,v])=>[new Date(t).toISOString(),v]);
}
function intradayClock(t){return new Intl.DateTimeFormat('en-GB',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit'}).format(new Date(t))}
function intradayReadout(point){const q=displayQuote(marketSymbol);return `${date(point[0].slice(0,10))} · ${intradayClock(point[0])} New York · ${marketSymbol} ${money(point[1],q?.currency||'USD')} · 1-min samples · ${quoteLabel(q)}`}
function renderIntradayChart(){
 const q=displayQuote(marketSymbol),points=intradayPoints(q,marketRange);plottedPoints=points;chartGeometry=null;
 $('#chartActivity').hidden=true;$('#chartActivity').innerHTML='';syncChartSwitches();
 $('#markerCount').textContent='1-min samples · New York time · political execution times unknown';
 $('#chartBenchmarkCaption').textContent='Daily overlays available from 1M';
 $('#chartScrub').setAttribute('aria-label','Inspect intraday time');
 if(points.length<2){$('#stockChart').innerHTML='<div class="chart-empty">Intraday samples unavailable.<br><button class="secondary" data-retry-intraday>Refresh intraday</button></div>';$('#chartScrub').disabled=true;$('#rangeReturn').textContent='';$('#chartReadout').textContent=q?.quoteAt?quoteLabel(q):'Waiting for intraday quotes…';return}
 $('#chartScrub').disabled=false;
 const W=Math.max(320,Math.round($('#stockChart').clientWidth||900)),H=285,L=55,R=18,T=20,B=30,values=points.map(p=>p[1]),lo=Math.min(...values),hi=Math.max(...values),pad=Math.max((hi-lo)*.12,hi*.0005),min=lo-pad,max=hi+pad,from=Date.parse(points[0][0]),to=Date.parse(points.at(-1)[0]);
 const x=d=>L+(Date.parse(d)-from)/Math.max(1,to-from)*(W-L-R),y=v=>T+(max-v)/(max-min)*(H-T-B),path=points.map(([d,v],i)=>`${i?'L':'M'}${x(d).toFixed(1)},${y(v).toFixed(1)}`).join(' '),color=values.at(-1)>=values[0]?'#16805a':'#bd4141';
 let svg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(marketSymbol)} ${marketRange} intraday chart, one-minute samples. Touch or use slider to inspect prices.">`;
 for(let i=0;i<5;i++){const v=min+(max-min)*i/4;svg+=`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" class="chart-grid"/><text x="${L-7}" y="${y(v)+4}" text-anchor="end" class="chart-axis">${v.toFixed(2)}</text>`}
 for(const i of [0,Math.floor(points.length/2),points.length-1])svg+=`<text x="${x(points[i][0])}" y="${H-8}" text-anchor="${i===0?'start':i===points.length-1?'end':'middle'}" class="chart-axis">${intradayClock(points[i][0])}</text>`;
 svg+=`<path d="${path}" fill="none" stroke="${color}" stroke-width="2"/><line id="chartCrosshair" class="chart-crosshair"/><circle id="chartFocus" r="4" class="chart-focus"/></svg>`;
 $('#stockChart').innerHTML=svg;chartGeometry={x,y,from,to,L,R,W,H,B,T};$('#chartScrub').max=points.length-1;
 const selected=points.findIndex(p=>p[0]===inspectedDate);inspectChart(selected>=0?selected:points.length-1);
 const change=(values.at(-1)/values[0]-1)*100;$('#rangeReturn').textContent=signed(change)+' · '+marketRange+' window';$('#rangeReturn').className=change>=0?'gain':'loss';
 $('#markerCount').textContent=`${marketRange==='30m'?'Last 30 minutes of available session':'Latest available session'} · ${date(points.at(-1)[0].slice(0,10))} · 1-min samples · New York time`;
}
