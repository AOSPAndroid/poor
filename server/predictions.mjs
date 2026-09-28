// Read-only provider integration. No wallets, orders, or real-money transactions.
const PM_GAMMA='https://gamma-api.polymarket.com',PM_CLOB='https://clob.polymarket.com';
function pmList(x){try{return Array.isArray(x)?x:JSON.parse(x||'[]')}catch{return []}}
function pmNum(x){if(x===null||x===undefined||x==='')return null;const n=Number(x);return Number.isFinite(n)?n:null}
function pmHTTPS(u){try{const x=new URL(u);return x.protocol==='https:'&&!x.username&&!x.password?x.href:null}catch{return null}}
async function pmJSON(url){const r=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Prediction data provider unavailable');const text=await r.text();if(text.length>6000000)throw Error('Provider response too large');return JSON.parse(text)}
export function normalizePrediction(m,event={}){
 const labels=pmList(m.outcomes),prices=pmList(m.outcomePrices),tokens=pmList(m.clobTokenIds);
 if(!/^\d{1,20}$/.test(String(m.id))||labels.length!==2||!labels.every(x=>['yes','no'].includes(String(x).toLowerCase()))||!labels.includes('Yes')||!labels.includes('No'))return null;
 return {id:String(m.id),question:String(m.question||'').slice(0,500),slug:String(m.slug||''),event:String(event.title||m.events?.[0]?.title||''),url:'https://polymarket.com/event/'+encodeURIComponent(event.slug||m.events?.[0]?.slug||m.slug||''),rules:String(m.description||'Resolution rules unavailable.').slice(0,16000),resolutionSource:pmHTTPS(m.resolutionSource),end:m.endDate||event.endDate||null,active:m.active===true&&m.closed!==true&&m.acceptingOrders===true&&m.enableOrderBook===true,closed:m.closed===true,resolved:m.umaResolutionStatus==='resolved',feesEnabled:m.feesEnabled===true,volume:pmNum(m.volume24hr),liquidity:pmNum(m.liquidityNum??m.liquidity),change:pmNum(m.oneDayPriceChange),outcomes:labels.map((label,i)=>({label,price:pmNum(prices[i])!==null&&pmNum(prices[i])>=0&&pmNum(prices[i])<=1?pmNum(prices[i]):null,token:/^\d{1,100}$/.test(String(tokens[i]))?String(tokens[i]):null}))};
}
async function pmMarket(id){const m=normalizePrediction(await pmJSON(PM_GAMMA+'/markets/'+id));if(!m)throw Error('Only Yes/No markets are supported');return m}
export function predictionFill(levels,amount,mode='buy'){
 const sorted=(levels||[]).map(x=>({price:Number(x.price),size:Number(x.size)})).filter(x=>x.price>0&&x.price<=1&&x.size>0&&Number.isFinite(x.size)).sort((a,b)=>mode==='buy'?a.price-b.price:b.price-a.price);
 let remaining=amount,shares=0,cash=0;
 for(const l of sorted){const take=Math.min(l.size,mode==='buy'?remaining/l.price:remaining);shares+=take;cash+=take*l.price;remaining-=mode==='buy'?take*l.price:take;if(remaining<1e-8)break}
 return {complete:remaining<1e-6,shares,cash,average:shares?cash/shares:null};
}
function pmBook(b,token){if(String(b.asset_id)!==token||!Array.isArray(b.asks)||!Array.isArray(b.bids))throw Error('Invalid order book');const at=Number(b.timestamp);if(!Number.isFinite(at)||Date.now()-at>120000||at>Date.now()+30000)throw Error('Order book is stale');return b}
async function pmQuote(id,label){const m=await pmMarket(id),o=m.outcomes.find(x=>x.label===label);if(!m.active||!o?.token||m.end&&Date.parse(m.end)<Date.now())throw Error('Market is not open for a fresh paper entry');const b=pmBook(await pmJSON(PM_CLOB+'/book?token_id='+o.token),o.token);return {market:m,outcome:o,book:b,checkedAt:new Date().toISOString()}}
function pmTerms(text){const stop=new Set('will would could their there these those about after before stock stocks market markets political politician politicians price prices company shares bought purchase latest today which event month year next this that with from have been into more than when what were they over under'.split(' '));return [...new Set(String(text).toLowerCase().match(/[a-z][a-z0-9]{3,}/g)||[])].filter(t=>!stop.has(t))}
export function predictionConnections(markets,news){return markets.map(m=>{const terms=new Set(pmTerms(m.question+' '+m.event));return {...m,connections:news.map(a=>{const shared=pmTerms(a.title+' '+a.summary).filter(t=>terms.has(t));return {title:a.title,summary:a.summary,impact:a.impact,risk:a.risk,watch:a.watch,date:a.date,tickers:a.tickers||[],sources:(a.sources||[]).filter(pmHTTPS),shared}}).filter(a=>a.shared.length>=2).sort((a,b)=>b.shared.length-a.shared.length).slice(0,3)}})}
async function pmBrowse(env,cached){
 const data=await cached(env,'prediction-politics-v1',120000,async()=>{
  const tag=await pmJSON(PM_GAMMA+'/tags/slug/politics');if(!/^\d+$/.test(String(tag.id)))throw Error('Political category unavailable');
  const events=await pmJSON(PM_GAMMA+'/events?tag_id='+tag.id+'&active=true&closed=false&limit=40&order=volume24hr&ascending=false');if(!Array.isArray(events))throw Error('Invalid market feed');
  return {markets:events.flatMap(e=>(e.markets||[]).map(m=>normalizePrediction(m,e))).filter(m=>m?.active).sort((a,b)=>(b.volume||0)-(a.volume||0)).slice(0,100),coverage:'Up to 100 open Yes/No contracts across 40 high-volume political events. Not every Polymarket contract.'};
 });
 const obj=await env.BUCKET.get('poor/research/news'),archive=obj?await obj.json():null,news=(archive?.editions||[]).flatMap(e=>e.items||[]).filter(a=>Date.parse(a.date)>Date.now()-21*86400000).slice(0,80);
 return {...data,value:data.value?{...data.value,markets:predictionConnections(data.value.markets,news)}:null};
}
export function predictionScore(row,market,book){
 const outcome=market.outcomes.find(o=>o.label===row.outcome);if(!outcome)return {state:'Unavailable'};
 if(market.resolved&&[0,1].includes(outcome.price))return {state:'Resolved',value:row.shares*outcome.price,pnl:row.shares*outcome.price-100,brier:(row.probability-outcome.price)**2,result:outcome.price,checkedAt:new Date().toISOString()};
 if(book){const fill=predictionFill(book.bids,row.shares,'sell');if(fill.complete)return {state:'Open · estimated exit',value:fill.cash*(1-row.fee),pnl:fill.cash*(1-row.fee)-100,checkedAt:new Date().toISOString()}}
 return {state:market.closed?'Awaiting confirmed resolution':'No complete exit quote',pnl:null};
}
async function pmLedger(request,env){
 const uid=request.headers.get('oai-authenticated-user-id'),email=request.headers.get('oai-authenticated-user-email');if(!uid||!email)return {status:401,body:{error:'Sign in to save and measure paper forecasts.'}};
 const owner=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(uid)))).map(n=>n.toString(16).padStart(2,'0')).join(''),key='poor/predictions/accounts/'+owner;
 if(request.method==='GET'){const obj=await env.BUCKET.get(key),state=obj?await obj.json():{rows:[]};return {status:200,body:state}}
 if(request.method!=='POST'||request.headers.get('Origin')!==new URL(request.url).origin||!request.headers.get('Content-Type')?.startsWith('application/json'))return {status:403,body:{error:'Same-origin JSON required'}};
 const text=await request.text();if(text.length>5000)return {status:413,body:{error:'Forecast too long'}};let b;try{b=JSON.parse(text)}catch{return {status:400,body:{error:'Invalid JSON'}}}
 if(!/^\d{1,20}$/.test(b.marketId)||!['Yes','No'].includes(b.outcome)||!Number.isFinite(b.probability)||b.probability<=0||b.probability>=1||!Number.isFinite(b.fee)||b.fee<0||b.fee>.1||!Number.isFinite(b.maxPrice)||b.maxPrice<=0||b.maxPrice>1||typeof b.thesis!=='string'||b.thesis.trim().length<15||b.thesis.length>1200||typeof b.invalidation!=='string'||b.invalidation.trim().length<10||b.invalidation.length>500||!Array.isArray(b.sources)||b.sources.length<1||b.sources.length>4||b.sources.some(u=>typeof u!=='string'||u.length>1500||!pmHTTPS(u)))return {status:400,body:{error:'Add a probability, thesis, invalidation and 1–4 HTTPS evidence links.'}};
 let q;try{q=await pmQuote(b.marketId,b.outcome)}catch{return {status:503,body:{error:'Fresh order book unavailable. No paper entry was saved.'}}}
 const fill=predictionFill(q.book.asks,100/(1+b.fee));if(!fill.complete||fill.shares<Number(q.book.min_order_size||0))return {status:409,body:{error:'Order-book depth or minimum size does not support this $100 paper entry.'}};if(fill.average>b.maxPrice+.00001)return {status:409,body:{error:'Price moved. Refresh the quote before saving.'}};
 const row={id:crypto.randomUUID(),marketId:b.marketId,question:q.market.question,outcome:b.outcome,probability:b.probability,fee:b.fee,shares:fill.shares,entry:fill.average,cost:100,createdAt:new Date().toISOString(),bookAt:q.book.timestamp,thesis:b.thesis.trim(),invalidation:b.invalidation.trim(),sources:b.sources,rules:q.market.rules,resolutionSource:q.market.resolutionSource,end:q.market.end,url:q.market.url};
 for(let n=0;n<4;n++){const obj=await env.BUCKET.get(key),state=obj?await obj.json():{rows:[]};if(state.rows.length>=40)return {status:400,body:{error:'Paper journal is limited to 40 forecasts.'}};if(state.rows.some(r=>r.marketId===b.marketId))return {status:409,body:{error:'A forecast for this market is already locked in your journal.'}};state.rows.unshift(row);if(await env.BUCKET.put(key,JSON.stringify(state),{onlyIf:obj?{etagMatches:obj.etag}:{etagDoesNotMatch:'*'}}))return {status:201,body:{row}}}
 return {status:409,body:{error:'Journal changed. Try again.'}};
}
export async function predictionsRoute(request,env,cached){
 const url=new URL(request.url),path=url.pathname;
 if(path==='/api/predictions/journal')return pmLedger(request,env);
 if(request.method!=='GET')return {status:405,body:{error:'GET required'}};
 if(path==='/api/predictions')return {status:200,body:await pmBrowse(env,cached)};
 const id=url.searchParams.get('id'),outcome=url.searchParams.get('outcome');if(!/^\d{1,20}$/.test(id||''))return {status:400,body:{error:'Invalid market'}};
 if(path==='/api/predictions/history'){
  const data=await cached(env,'prediction-history/'+id,600000,async()=>{const m=await pmMarket(id),token=m.outcomes.find(o=>o.label==='Yes')?.token;if(!token)throw Error('History unavailable');const raw=await pmJSON(PM_CLOB+'/prices-history?market='+token+'&interval=1w&fidelity=60');if(!Array.isArray(raw.history))throw Error('History unavailable');return {points:raw.history.map(x=>({t:Number(x.t),p:Number(x.p)})).filter(x=>Number.isFinite(x.t)&&x.t>=Date.now()/1000-8*86400&&x.t<=Date.now()/1000+60&&Number.isFinite(x.p)&&x.p>=0&&x.p<=1).sort((a,b)=>a.t-b.t).slice(-2000)}});return {status:200,body:data};
 }
 if(path==='/api/predictions/quote'){
  if(!['Yes','No'].includes(outcome))return {status:400,body:{error:'Choose Yes or No'}};
  const q=await pmQuote(id,outcome),bids=q.book.bids.map(x=>Number(x.price)).filter(n=>n>0&&n<=1),asks=q.book.asks.map(x=>Number(x.price)).filter(n=>n>0&&n<=1);
  return {status:200,body:{...q,book:{asks:q.book.asks,bids:q.book.bids,timestamp:q.book.timestamp},bid:bids.length?Math.max(...bids):null,ask:asks.length?Math.min(...asks):null}};
 }
 if(path==='/api/predictions/score'){
  const journal=await pmLedger(new Request(request.url,{headers:request.headers}),env);if(journal.status!==200)return journal;const row=journal.body.rows.find(r=>r.id===url.searchParams.get('entry'));if(!row||row.marketId!==id)return {status:404,body:{error:'Forecast not found'}};
  const data=await cached(env,'prediction-score/'+row.id,60000,async()=>{const m=await pmMarket(id);let book=null;if(!m.resolved){const token=m.outcomes.find(o=>o.label===row.outcome)?.token;if(token)try{book=pmBook(await pmJSON(PM_CLOB+'/book?token_id='+token),token)}catch{}}return {...predictionScore(row,m,book),rulesChanged:row.rules!==m.rules}});return {status:200,body:data};
 }
 return {status:404,body:{error:'Not found'}};
}
