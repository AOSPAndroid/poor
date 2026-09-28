// Read-only provider integration. No wallets, orders, or real-money transactions.
const PM_GAMMA='https://gamma-api.polymarket.com',PM_CLOB='https://clob.polymarket.com';
function pmList(x){try{const v=Array.isArray(x)?x:JSON.parse(x||'[]');return Array.isArray(v)?v:[]}catch{return []}}
function pmNum(x){if(x===null||x===undefined||x==='')return null;const n=Number(x);return Number.isFinite(n)?n:null}
function pmHTTPS(u){try{const x=new URL(u);return x.protocol==='https:'&&!x.username&&!x.password?x.href:null}catch{return null}}
async function pmJSON(url){const r=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Prediction data provider unavailable');const text=await r.text();if(text.length>6000000)throw Error('Provider response too large');return JSON.parse(text)}
export function normalizePrediction(m,event={}){
 const labels=pmList(m.outcomes).map(x=>String(x).toLowerCase()==='yes'?'Yes':String(x).toLowerCase()==='no'?'No':String(x)),prices=pmList(m.outcomePrices),tokens=pmList(m.clobTokenIds);
 if(!/^\d{1,20}$/.test(String(m.id))||labels.length!==2||!labels.every(x=>['yes','no'].includes(String(x).toLowerCase()))||!labels.includes('Yes')||!labels.includes('No'))return null;
 return {id:String(m.id),question:String(m.question||'').slice(0,500),slug:String(m.slug||''),event:String(event.title||m.events?.[0]?.title||''),url:'https://polymarket.com/event/'+encodeURIComponent(event.slug||m.events?.[0]?.slug||m.slug||''),rules:String(m.description||'Resolution rules unavailable.').slice(0,16000),resolutionSource:pmHTTPS(m.resolutionSource),end:m.endDate||event.endDate||null,active:m.active===true&&m.closed!==true&&m.acceptingOrders===true&&m.enableOrderBook===true,closed:m.closed===true,resolved:m.umaResolutionStatus==='resolved',feesEnabled:m.feesEnabled===true,volume:pmNum(m.volume24hr),liquidity:pmNum(m.liquidityNum??m.liquidity),change:pmNum(m.oneDayPriceChange),outcomes:labels.map((label,i)=>({label,price:pmNum(prices[i])!==null&&pmNum(prices[i])>=0&&pmNum(prices[i])<=1?pmNum(prices[i]):null,token:/^\d{1,100}$/.test(String(tokens[i]))?String(tokens[i]):null}))};
}
async function pmMarket(id){const m=normalizePrediction(await pmJSON(PM_GAMMA+'/markets/'+id));if(!m)throw Error('Only Yes/No markets are supported');return m}
function pmBook(b,token){if(String(b.asset_id)!==token||!Array.isArray(b.asks)||!Array.isArray(b.bids))throw Error('Invalid order book');const at=Number(b.timestamp);if(!Number.isFinite(at)||Date.now()-at>120000||at>Date.now()+30000)throw Error('Order book is stale');const clean=rows=>rows.map(x=>({price:pmNum(x.price),size:pmNum(x.size)})).filter(x=>x.price!==null&&x.price>0&&x.price<=1&&x.size!==null&&x.size>0);return {...b,asks:clean(b.asks).sort((a,b)=>a.price-b.price),bids:clean(b.bids).sort((a,b)=>b.price-a.price)}}
async function pmQuote(id,label){const m=await pmMarket(id),o=m.outcomes.find(x=>x.label===label);if(!m.active||!o?.token||m.end&&Date.parse(m.end)<Date.now())throw Error('Market is not accepting orders');const b=pmBook(await pmJSON(PM_CLOB+'/book?token_id='+o.token),o.token);return {market:m,outcome:o,book:b,checkedAt:new Date().toISOString()}}
function pmTerms(text){const stop=new Set('will would could their there these those about after before stock stocks market markets political politician politicians price prices company shares bought purchase latest today which event month year next this that with from have been into more than when what were they over under'.split(' '));return [...new Set(String(text).toLowerCase().match(/[a-z][a-z0-9]{3,}/g)||[])].filter(t=>!stop.has(t))}
export function predictionConnections(markets,news){return markets.map(m=>{const terms=new Set(pmTerms(m.question+' '+m.event));return {...m,connections:news.map(a=>{const shared=pmTerms(a.title+' '+a.summary).filter(t=>terms.has(t));return {title:a.title,summary:a.summary,impact:a.impact,risk:a.risk,watch:a.watch,date:a.date,tickers:a.tickers||[],sources:(a.sources||[]).filter(pmHTTPS),shared}}).filter(a=>a.shared.length>=2).sort((a,b)=>b.shared.length-a.shared.length).slice(0,3)}})}
async function pmBrowse(env,cached){
 const data=await cached(env,'prediction-politics-v1',120000,async()=>{
  const tag=await pmJSON(PM_GAMMA+'/tags/slug/politics');if(!/^\d+$/.test(String(tag.id)))throw Error('Political category unavailable');
  const events=await pmJSON(PM_GAMMA+'/events?tag_id='+tag.id+'&active=true&closed=false&limit=40&order=volume24hr&ascending=false');if(!Array.isArray(events))throw Error('Invalid market feed');
  return {markets:events.flatMap(e=>(e.markets||[]).map(m=>normalizePrediction(m,e))).filter(m=>m?.active).sort((a,b)=>(b.volume||0)-(a.volume||0)).slice(0,100),coverage:'Up to 100 open Yes/No contracts across 40 high-volume political events. Not every Polymarket contract.'};
 });
 const obj=await env.BUCKET.get('poor/research/news'),archive=obj?await obj.json():null,news=(archive?.editions||[]).flatMap(e=>e.items||[]).filter(a=>Date.parse(a.date)>Date.now()-21*86400000).slice(0,80);
 const saved=await env.BUCKET.get('poor/predictions/insights-v1'),insights=saved?await saved.json():{items:[]};
 return {...data,researchStatus:insights.status||'Not checked yet',researchCheckedAt:insights.checkedAt||null,value:data.value?{...data.value,markets:predictionConnections(data.value.markets,news).map(m=>({...m,insight:insights.items.find(i=>i.marketId===m.id&&i.rules===m.rules&&Date.now()-Date.parse(i.createdAt)<3*86400000)||null}))}:null};
}
export function validPredictionInsight(x){return x&&/^\d{1,20}$/.test(x.marketId)&&['thesis','against','pricedIn','watch'].every(k=>typeof x[k]==='string'&&x[k].trim().length>=10&&x[k].length<=650)&&typeof x.rules==='string'&&x.rules.length<=16000&&Array.isArray(x.sources)&&x.sources.length>=2&&x.sources.length<=4&&x.sources.every(u=>typeof u==='string'&&u.length<1500&&pmHTTPS(u))&&x.sources.some(u=>!/(^|\.)(polymarket\.com|x\.com|twitter\.com)$/.test(new URL(u).hostname))}
async function pmIngest(request,env){
 if(!env.RESEARCH_INGEST_TOKEN||request.headers.get('Authorization')!=='Bearer '+env.RESEARCH_INGEST_TOKEN)return {status:401,body:{error:'Unauthorized'}};
 if(request.method!=='POST')return {status:405,body:{error:'POST required'}};
 const raw=await request.text();if(raw.length>65000)return {status:413,body:{error:'Too large'}};let body;try{body=JSON.parse(raw)}catch{return {status:400,body:{error:'Invalid JSON'}}}
 if(!Array.isArray(body.items)||body.items.length>2||!body.items.every(validPredictionInsight))return {status:400,body:{error:'Invalid sourced assessment'}};
 const key='poor/predictions/insights-v1',checkedAt=new Date().toISOString();
 const items=body.items.map(x=>({marketId:x.marketId,rules:x.rules,thesis:x.thesis,against:x.against,pricedIn:x.pricedIn,watch:x.watch,sources:x.sources,createdAt:checkedAt}));
 const obj=await env.BUCKET.get(key),old=obj?await obj.json():{items:[]};
 await env.BUCKET.put(key,JSON.stringify({checkedAt,status:body.status==='complete'?'Checked':body.reason==='busy'?'Research service busy; next daily run will retry':'Research unavailable',items:[...items,...old.items.filter(x=>!items.some(i=>i.marketId===x.marketId))].slice(0,30)}));return {status:200,body:{published:items.length}};
}
export async function predictionsRoute(request,env,cached){
 const url=new URL(request.url),path=url.pathname;
 if(path==='/api/predictions/insights')return pmIngest(request,env);
 if(['/api/predictions/journal','/api/predictions/score'].includes(path))return {status:410,body:{error:'This feature has been retired'}};
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
 return {status:404,body:{error:'Not found'}};
}
