'use strict';
let marketSymbol='BE',marketRange='6M',markerMode='disclosed',showBenchmark=true,marketRequest=0;
let workspaceState={symbols:['BE','INTC','NVDA','SPY'],rules:[],alerts:[],readAt:0},workspaceReady=false,workspaceBusy=false;
const marketNews=new Map();let plottedPoints=[];
const tickerValid=s=>/^[A-Z][A-Z0-9.-]{0,11}$/.test(s);
const signed=n=>(n>=0?'+':'')+n.toFixed(2)+'%';
const number=n=>Number.isFinite(n)?new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1}).format(n):'—';
function stockRecords(symbol=marketSymbol){return data.filter(r=>r.ticker===symbol).sort((a,b)=>(disclosedDate(b)||b.filed).localeCompare(disclosedDate(a)||a.filed))}
function chartPoints(p,range){
 const entries=Object.entries({...p?.closes,...(p?.asOf&&p?.latest?{[p.asOf]:p.latest}:{})}).filter(([d,v])=>validDate(d)&&Number.isFinite(v)&&v>0).sort((a,b)=>a[0].localeCompare(b[0]));if(!entries.length)return [];
 const days=({'1M':30,'3M':90,'6M':183,'1Y':366,'2Y':732})[range]||183,cutoff=Date.parse(entries.at(-1)[0])-days*86400000;
 return entries.filter(([d])=>Date.parse(d)>=cutoff);
}
function benchmarkSeries(points,benchmark){if(!points.length)return [];const first=points.find(([d])=>benchmark?.closes?.[d]>0);if(!first)return [];const base=benchmark.closes[first[0]];return points.filter(([d])=>benchmark.closes[d]>0).map(([d])=>[d,benchmark.closes[d]/base*first[1]])}
function eventGroups(records,mode,points){
 if(!points.length)return [];const first=points[0][0],last=points.at(-1)[0],groups=new Map();
 for(const r of records){const day=mode==='traded'?r.traded:disclosedDate(r);if(!day||day<first||day>last)continue;if(!groups.has(day))groups.set(day,[]);groups.get(day).push(r)}return [...groups].sort((a,b)=>a[0].localeCompare(b[0]));
}
function renderStockChart(){
 const p=PRICES[marketSymbol],points=chartPoints(p,marketRange);plottedPoints=points;
 if(points.length<10){$('#rangeReturn').textContent='';$('#markerCount').textContent='';$('#stockChart').innerHTML='<div class="chart-empty">Loading price history…</div>';$('#chartReadout').textContent='Daily closes · history unavailable until refreshed';return}
 const bench=showBenchmark?benchmarkSeries(points,PRICES.SPY):[],W=900,H=285,L=55,R=18,T=16,B=30;
 const values=[...points,...bench].map(a=>a[1]),min=Math.min(...values)*.97,max=Math.max(...values)*1.03,from=Date.parse(points[0][0]),to=Date.parse(points.at(-1)[0]);
 const x=d=>L+(Date.parse(d)-from)/Math.max(1,to-from)*(W-L-R),y=v=>T+(max-v)/Math.max(.01,max-min)*(H-T-B);
 const path=series=>series.map(([d,v],i)=>`${i?'L':'M'}${x(d).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
 let svg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(marketSymbol)} daily close price chart, ${marketRange}. Use the date slider to inspect values."><defs><linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#51c8c0" stop-opacity=".2"/><stop offset="100%" stop-color="#51c8c0" stop-opacity="0"/></linearGradient></defs>`;
 for(let i=0;i<5;i++){const v=min+(max-min)*i/4,py=y(v);svg+=`<line x1="${L}" x2="${W-R}" y1="${py}" y2="${py}" class="chart-grid"/><text x="${L-8}" y="${py+4}" text-anchor="end" class="chart-axis">${v.toFixed(v<10?2:0)}</text>`}
 for(const index of [0,Math.floor(points.length/2),points.length-1]){const d=points[index][0];svg+=`<text x="${x(d)}" y="${H-8}" text-anchor="${index===0?'start':index===points.length-1?'end':'middle'}" class="chart-axis">${esc(date(d))}</text>`}
 svg+=`<path d="${path(points)} L${x(points.at(-1)[0])},${H-B} L${x(points[0][0])},${H-B} Z" fill="url(#priceFill)"/><path d="${path(points)}" class="price-line"/>`;
 if(bench.length>1)svg+=`<path d="${path(bench)}" class="benchmark-line"/>`;
 const groups=eventGroups(stockRecords(),markerMode,points);
 groups.forEach(([day,records],i)=>{const close=points.find(([d])=>d>=day)||points.at(-1),sale=records.every(r=>r.type==='Sale');svg+=`<g class="chart-marker" data-event-date="${day}" tabindex="0" role="button" aria-label="${esc(day+' '+records.length+' '+markerMode+' events')}"><title>${esc(day+' · '+records.length+' '+markerMode+' events · '+[...new Set(records.map(r=>r.person))].join(', '))}</title><line x1="${x(day)}" x2="${x(day)}" y1="${y(close[1])+7}" y2="${H-B}" class="event-guide"/><circle cx="${x(day)}" cy="${y(close[1])}" r="6" fill="${sale?'#ef8591':'#f5bf63'}" stroke="#101a26" stroke-width="2"/></g>`});
 svg+='</svg>';$('#stockChart').innerHTML=svg;
 $('#chartScrub').max=points.length-1;$('#chartScrub').value=points.length-1;inspectChart(points.length-1);
 const change=(points.at(-1)[1]/points[0][1]-1)*100;$('#rangeReturn').textContent=signed(change)+' · '+marketRange;$('#rangeReturn').className=change>=0?'gain':'loss';
 $('#markerCount').textContent=`${groups.length} ${markerMode==='traded'?'transaction':'disclosure'} dates · amber buys / pink sells`;
}
function inspectChart(index){const point=plottedPoints[Number(index)];if(!point)return;const p=PRICES[marketSymbol],b=PRICES.SPY?.closes?.[point[0]];$('#chartReadout').textContent=`${date(point[0])} · ${marketSymbol} ${money(point[1],p?.currency||'USD')}${b?' · SPY '+money(b):''}`}
function renderTerminal(){
 const p=PRICES[marketSymbol],records=stockRecords(),buyers=new Set(records.filter(r=>r.type==='Purchase').map(r=>r.person)),groups=clusters().filter(g=>g.ticker===marketSymbol);
 $('#stockSymbol').textContent=marketSymbol;$('#stockCompany').textContent=p?.name||records[0]?.company||marketSymbol;
 $('#stockPrice').textContent=p?money(p.latest,p.currency):'—';
 const change=p?.previousClose?(p.latest/p.previousClose-1)*100:null;
 $('#stockDayChange').textContent=change===null?'Daily change unavailable':signed(change)+' day';$('#stockDayChange').className=change===null?'muted':change>=0?'gain':'loss';
 $('#stockAsOf').textContent=p?`Close ${date(p.asOf)} · ${p.exchange||'Yahoo Finance'}${p.stale?' · stale':''}`:'Fetching market data…';
 $('#watchStock').textContent=workspaceState.symbols.includes(marketSymbol)?'★ Watching':'☆ Watch';$('#watchStock').disabled=!workspaceReady;
 $('#stockMetrics').innerHTML=[['Day range',p?.low&&p?.high?money(p.low,p.currency)+'–'+money(p.high,p.currency):'—'],['52-week range',p?.low52&&p?.high52?money(p.low52,p.currency)+'–'+money(p.high52,p.currency):'—'],['Volume',number(p?.volume)],['Buying households',buyers.size],['Shared-buy windows',groups.length]].map(([k,v])=>`<div><small>${k}</small><strong>${esc(v)}</strong></div>`).join('');
 $('#stockWatchlist').innerHTML=workspaceState.symbols.map(s=>{const q=PRICES[s],n=q?.previousClose?(q.latest/q.previousClose-1)*100:null;return `<button data-ticker="${s}" class="watch-row ${s===marketSymbol?'selected':''}"><b>${s}</b><span>${q?money(q.latest,q.currency):'—'}</span><small class="${n===null?'muted':n>=0?'gain':'loss'}">${n===null?'daily close':signed(n)}</small></button>`}).join('')||'<p class="muted">Search a ticker and choose Watch.</p>';
 $('#stockTradeCount').textContent=records.length+' loaded disclosures';
 $('#stockTrades').innerHTML=records.slice(0,40).map(r=>`<tr><td><strong>${esc(r.person)}</strong><small>${esc(r.owner)}</small></td><td><span class="type-badge ${r.type.toLowerCase()}">${esc(r.type)}</span><small>${esc(r.asset)}</small></td><td><small>${transactionLabel(r)}</small>${date(r.traded)}</td><td><small>Disclosed on</small>${disclosedDate(r)?date(disclosedDate(r)):'Unknown'}<small>${disclosureDelay(r)!==null?disclosureDelay(r)+'d gap':'Signed '+date(r.filed)}</small></td><td>${esc(r.amount)}</td><td><span class="${(priceReturn(r)?.pct||0)>=0?'gain':'loss'}">${priceReturn(r)?percent(priceReturn(r)):'—'}</span><small>since trade${r.asset==='Call options'?' · stock only':''}</small></td><td><button class="row-details" data-detail="${esc(r.id)}">Details</button></td></tr>`).join('')||'<tr><td colspan="7" class="empty">No political disclosures for this ticker in the loaded feeds.</td></tr>';
 $('#signalSummary').innerHTML=groups.slice(0,3).map(g=>`<button class="signal-item" data-cluster="${clusters().indexOf(g)}"><strong>${g.count} households bought ${esc(g.ticker)}</strong><small>${date(g.start)}–${date(g.end)}</small></button>`).join('')||'<p class="muted">No multi-household buying window in the loaded records.</p>';
 renderStockChart();renderNews();renderAlerts();
}
function renderNews(){const result=marketNews.get(marketSymbol);$('#stockNews').innerHTML=result?.items?.length?result.items.map(i=>`<article class="news-item"><a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.title)}</a><small>${esc(stamp(i.published))} · Yahoo Finance</small></article>`).join(''):`<p class="muted">${result?.error?'News unavailable. Try again after the next refresh.':'Loading headlines…'}</p>`}
async function openStock(symbol,push=true){
 symbol=String(symbol).trim().toUpperCase();if(!tickerValid(symbol)){notify('Enter a valid ticker, such as BE or AAPL');return}
 marketSymbol=symbol;const ticket=++marketRequest;changeView('market');renderTerminal();
 if(push&&typeof history!=='undefined')history.pushState(null,'','#stock/'+symbol);
 await Promise.allSettled([loadMarketPrices([symbol,'SPY']),getLiveJSON('/api/news?symbol='+encodeURIComponent(symbol)).then(r=>{marketNews.set(symbol,r.value?{...r.value,stale:r.stale}:{error:true})}).catch(()=>marketNews.set(symbol,{error:true}))]);
 if(ticket===marketRequest){renderTerminal();if(!PRICES[symbol])$('#stockChart').innerHTML='<div class="chart-empty">No price history available for this ticker.</div>'}
}
async function loadMarketPrices(symbols){
 const unique=[...new Set(symbols)].filter(tickerValid);for(let i=0;i<unique.length;i+=6){try{const result=await getLiveJSON('/api/prices?symbols='+encodeURIComponent(unique.slice(i,i+6).join(',')));for(const [s,r] of Object.entries(result))if(r.value?.latest>0&&r.value.closes)PRICES[s]={...r.value,stale:r.stale,checkedAt:r.checkedAt}}catch{}}
}
async function workspaceAction(action){
 if(workspaceBusy)return;workspaceBusy=true;
 try{const r=await fetch('/api/workspace',action?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(action)}:{cache:'no-store'}),result=await r.json();if(!r.ok)throw Error(result.error||'Workspace unavailable');if(!Array.isArray(result.symbols)||!Array.isArray(result.rules))throw Error('Workspace unavailable');workspaceState=result;workspaceReady=true;$('#workspaceStatus').textContent='Saved on server · this browser';renderTerminal();return true}catch(e){$('#workspaceStatus').textContent='Workspace unavailable · retry shortly';notify(e.message);return false}finally{workspaceBusy=false}
}
function ruleLabel(r){return r.type==='priceAbove'?`Close ≥ ${r.threshold}`:r.type==='priceBelow'?`Close ≤ ${r.threshold}`:r.type==='cluster'?'New 30-day buying cluster':'New disclosure'}
function renderAlerts(){
 const unread=workspaceState.alerts.filter(a=>a.at>workspaceState.readAt).length;$('#alertCount').textContent=unread;
 $('#alertRules').innerHTML=workspaceState.rules.map(r=>`<div class="alert-rule"><button data-ticker="${esc(r.symbol)}"><strong>${esc(r.symbol)}</strong></button><span>${esc(ruleLabel(r))}</span><button data-delete-rule="${esc(r.id)}" aria-label="Delete ${esc(r.symbol)} alert">×</button></div>`).join('')||'<p class="muted">No rules yet. Add a rule to a stock.</p>';
 $('#alertInbox').innerHTML=workspaceState.alerts.map(a=>`<article class="alert-item ${a.at>workspaceState.readAt?'unread':''}"><button data-ticker="${esc(a.symbol)}"><strong>${esc(a.title)}</strong></button><p>${esc(a.detail)}</p><small>${esc(stamp(a.at))}${a.source?` · <a href="${esc(a.source)}" target="_blank" rel="noopener">Filing ↗</a>`:''}</small></article>`).join('')||'<div class="empty"><h2>No alerts yet</h2><p>New-filing and cluster rules establish a baseline first. Price rules check completed daily closes.</p></div>';
}
function openAlertForm(){if(!workspaceReady){notify('Wait for the workspace connection');return}$('#ruleSymbol').value=marketSymbol;$('#ruleThreshold').value='';$('#ruleType').value='filings';$('#thresholdLabel').hidden=true;$('#ruleStatus').textContent='';$('#alertDialog').showModal()}
function eventDetails(day){const records=stockRecords().filter(r=>(markerMode==='traded'?r.traded:disclosedDate(r))===day);$('#detailContent').innerHTML=`<div class="eyebrow">${markerMode==='traded'?'TRANSACTIONS':'PUBLIC DISCLOSURES'}</div><h2>${esc(marketSymbol)} · ${date(day)}</h2>${records.map(r=>`<article class="event-detail"><strong>${esc(r.person)}</strong> · ${esc(r.type)} · ${esc(r.asset)}<p>${transactionLabel(r)} ${date(r.traded)}<br>Disclosed on ${disclosedDate(r)?date(disclosedDate(r)):'Unknown'}<br>${esc(r.amount)} · ${esc(r.owner)}</p><button class="secondary" data-detail="${esc(r.id)}">Full transaction</button></article>`).join('')}<p class="muted">Markers show calendar dates. On a non-trading date, the marker uses the next available closing price for display only.</p>`;$('#details').showModal()}
if(typeof window!=='undefined'){
 document.addEventListener('click',async e=>{const b=e.target.closest('button');if(b?.dataset.ticker)openStock(b.dataset.ticker);if(b?.dataset.range){marketRange=b.dataset.range;$$('[data-range]').forEach(x=>x.classList.toggle('selected',x===b));renderStockChart()}if(b?.dataset.deleteRule)await workspaceAction({kind:'deleteRule',id:b.dataset.deleteRule});const marker=e.target.closest('[data-event-date]');if(marker)eventDetails(marker.dataset.eventDate)});
 $('#stockChart').addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)&&e.target.dataset.eventDate){e.preventDefault();eventDetails(e.target.dataset.eventDate)}});
 $('#tickerSearch').onsubmit=e=>{e.preventDefault();openStock($('#tickerInput').value)};
 $('#openAllStockTrades').onclick=()=>{clear();$('#search').value='$'+marketSymbol;changeView('trades');renderRows()};
 $('#chartScrub').oninput=e=>inspectChart(e.target.value);
 $('#markerMode').onchange=e=>{markerMode=e.target.value;renderStockChart()};$('#benchmarkToggle').onchange=e=>{showBenchmark=e.target.checked;renderStockChart()};
 $('#watchStock').onclick=()=>workspaceAction({kind:'watch',symbol:marketSymbol,enabled:!workspaceState.symbols.includes(marketSymbol)});
 $('#addStockAlert').onclick=openAlertForm;$('#newAlert').onclick=openAlertForm;$('#markAlertsRead').onclick=()=>workspaceAction({kind:'readAlerts'});
 $('#ruleType').onchange=e=>$('#thresholdLabel').hidden=!e.target.value.startsWith('price');
 $('#alertForm').onsubmit=async e=>{e.preventDefault();const type=$('#ruleType').value,action={kind:'rule',symbol:$('#ruleSymbol').value.trim().toUpperCase(),type};if(type.startsWith('price'))action.threshold=Number($('#ruleThreshold').value);if(await workspaceAction(action)){$('#alertDialog').close();notify('Alert rule saved')}};
 window.addEventListener('hashchange',()=>{const match=location.hash.match(/^#stock\/([A-Za-z0-9.-]+)$/);if(match)openStock(match[1],false)});
 const initial=location.hash.match(/^#stock\/([A-Za-z0-9.-]+)$/)?.[1]||'BE';
 workspaceAction().then(()=>loadMarketPrices([...workspaceState.symbols,...workspaceState.rules.map(r=>r.symbol)])).then(renderTerminal);openStock(initial,false);
}
