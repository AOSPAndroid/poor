const HOUR=3600000, inflight=new Map();
const FEED_URL='https://congressinfor-production.up.railway.app/trades/recent?limit=500&offset=0&days=365';
const CABINET_URL='https://open-cabinet.org/data/all-transactions.csv';
const isoDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
const symbolOK=s=>typeof s==='string'&&/^[A-Z][A-Z0-9.-]{0,11}$/.test(s);
const safeSource=s=>{try{const u=new URL(s);return u.protocol==='https:'&&['disclosures-clerk.house.gov','efdsearch.senate.gov','extapps2.oge.gov'].includes(u.hostname)}catch{return false}};
const partyState={'Nancy Pelosi':['D','CA'],'Josh Gottheimer':['D','NJ'],'Tommy Tuberville':['R','AL'],'Warren Davidson':['R','OH'],'Terri Sewell':['D','AL'],'Donald Norcross':['D','NJ'],'Bryan Steil':['R','WI'],'Debbie Wasserman Schultz':['D','FL'],'Tom Suozzi':['D','NY'],'Dwight Evans':['D','PA'],'Markwayne Mullin':['R','OK'],'Ron Wyden':['D','OR'],'Susan Collins':['R','ME'],'Dan Sullivan':['R','AK'],'Rick Scott':['R','FL']};
function canonicalName(n){const key=n.toLowerCase().replace(/[^a-z]/g,''),aliases={ronlwyden:'Ron Wyden',ronaldwyden:'Ron Wyden',susanmcollins:'Susan Collins',danielsullivan:'Dan Sullivan',danielssullivan:'Dan Sullivan',ricklscott:'Rick Scott',richardlscott:'Rick Scott',thomasrsuozzi:'Tom Suozzi',thomassuozzi:'Tom Suozzi',debbieschultz:'Debbie Wasserman Schultz'};return aliases[key]||Object.keys(partyState).find(p=>p.toLowerCase().replace(/[^a-z]/g,'')===key)||n}
function assetType(text){if(/\[OP\]|option|\bcall\b|\bput\b/i.test(text))return /\bcall\b/i.test(text)&&!/\bput\b/i.test(text)?'Call options':'Options';if(/\bETF\b|exchange.traded|SPDR/i.test(text))return 'ETF';if(/\bADR\b/i.test(text))return 'ADR';if(/\[ST\]|common stock/i.test(text))return 'Stock';return 'Unclassified'}
function validRow(r){return r&&r.person&&r.person.length<150&&['House','Senate','Executive'].includes(r.chamber)&&isoDate(r.traded)&&isoDate(r.filed)&&r.traded<=r.filed&&r.filed<=new Date().toISOString().slice(0,10)&&safeSource(r.source)&&r.amount&&r.company}
export function congressRows(feed){
 if(!Array.isArray(feed.trades)||feed.cache_loading)throw Error('Disclosure feed is not ready');
 const counts=new Map();const rows=[];
 for(const t of feed.trades){
  if(typeof t.member!=='string'||typeof t.asset!=='string'||!['buy','sell'].includes(t.trade_type))continue;
  const person=canonicalName(t.member),ps=partyState[person]||['—','—'];
  const fingerprint=JSON.stringify([person,t.link,t.ticker,t.tx_date,t.trade_type,t.amount,t.asset]);
  const occurrence=counts.get(fingerprint)||0;counts.set(fingerprint,occurrence+1);
  const r={id:'ci:'+fingerprint+':'+occurrence,person,chamber:t.chamber,party:ps[0],state:ps[1],owner:'Not specified',ticker:symbolOK(t.ticker)?t.ticker:'—',company:t.asset.slice(0,800),asset:assetType(t.asset),type:t.trade_type==='buy'?'Purchase':'Sale',traded:t.tx_date,filed:t.disclosed,amount:t.amount,source:t.link,quality:'Feed summary',summarySource:'https://github.com/dianahub/congressinvests-api',summaryLabel:'CongressInvests',notes:'Automatically normalized by CongressInvests from public filings. Ownership and ambiguous instruments are not inferred. Amendments may require review; open the original filing.'};
  if(validRow(r))rows.push(r);
 }
 if(feed.trades.length&&!rows.length)throw Error('Disclosure format changed');
 return {rows,provider:'CongressInvests',sourceUpdatedAt:feed.last_updated||null,providerCurrent:feed.data_current===true,available:feed.total,limited:!!feed.has_more,skipped:feed.trades.length-rows.length,coverage:'Latest 500 filings rows within 365 days; source coverage may be incomplete.'};
}
const rosterMembers=new Set(['Nancy Pelosi','Debbie Wasserman Schultz','Tom Suozzi','Dwight Evans','Markwayne Mullin','Ron Wyden','Susan Collins','Dan Sullivan','Rick Scott']);
async function rosterFeed(){
 const pages=[];let offset=0;
 for(let i=0;i<10;i++){const page=await fetchJSON(FEED_URL.replace('offset=0','offset='+offset));if(!Array.isArray(page.trades)||page.cache_loading)throw Error('Disclosure feed not ready');pages.push(page);if(!page.has_more||!page.trades.length)break;offset+=page.trades.length}
 const last=pages.at(-1),normalized=congressRows({...pages[0],trades:pages.flatMap(p=>p.trades),has_more:last.has_more,data_current:pages.every(p=>p.data_current),last_updated:pages.map(p=>p.last_updated).filter(Boolean).sort()[0]});
 normalized.coverage='All available politician households; featured profiles do not limit shared-buy counts. Scanned up to 5,000 latest disclosure rows within 365 days. '+(last.has_more?'Older rows remain outside this feed.':'Reached end of available feed.');return normalized;
}
async function trackedRosterFeed(env){const value=await rosterFeed(),key='poor/research/political-observations',object=await env.BUCKET.get(key),seen=object?await object.json():{},now=new Date().toISOString();for(const r of value.rows){r.firstObserved=seen[r.id]||now;seen[r.id]=r.firstObserved}await env.BUCKET.put(key,JSON.stringify(seen));return value}
// These eight exact company labels were previously checked for poor's July records.
const knownTrump={'ABBOTT LABS':'ABT','ABBVIE INC':'ABBV','ACCENTURE PLC IRELAND F CLASS CLASS A':'ACN','BROADCOM INC':'AVGO','CISCO SYS INC':'CSCO','HOME DEPOT INC':'HD','META PLATFORMS INC CLASS A':'META','CHEVRON CORP NEW':'CVX'};
export function executiveRows(feed){
 if(!Array.isArray(feed.officials))throw Error('Executive feed format changed');
 const official=feed.officials.find(o=>o.slug==='trump-donald-j');if(!Array.isArray(official?.transactions))throw Error('Trump feed unavailable');
 const rows=[];let excluded=0;
 for(const t of official.transactions){
  if(t.sourceKind&&t.sourceKind!=='278-T'||t.historical||t.verificationState==='under-review'||t.verificationScore===0){excluded++;continue}
  const source=t.sourceUrl||'',decoded=decodeURIComponent(source),m=decoded.match(/(\d{1,2})\.(\d{1,2})\.(20\d{2})-278T/i);
  if(!m){excluded++;continue}
  const ticker=t.resolvedTicker||t.ticker||knownTrump[t.description]||'—';
  const asset=({common_stock:'Stock',etf:'ETF'})[t.instrumentType]||(knownTrump[t.description]?'Stock':'Unclassified');
  if(!['Stock','ETF'].includes(asset)||!symbolOK(ticker)||!['Purchase','Sale'].includes(t.type)){excluded++;continue}
  const r={id:'oc:'+t.recordId,person:'Donald Trump',chamber:'Executive',party:'R',state:'US',owner:t.accountLabel||'Not specified',ticker,company:t.description,asset,type:t.type,traded:t.date,filed:`${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`,amount:t.amount,source,quality:'Feed summary',summarySource:'https://open-cabinet.org/officials/trump-donald-j',summaryLabel:'Open Cabinet',notes:`Filed uses the report signature date from its filename, not the OGE publication date. Open Cabinet verification: ${t.verificationState||'unspecified'}. Annual-report rows, unresolved assets and under-review rows are excluded. Not independently rechecked by poor.`};
  if(validRow(r)&&t.recordId)rows.push(r);else excluded++;
 }
 rows.sort((a,b)=>b.filed.localeCompare(a.filed)||b.traded.localeCompare(a.traded));
 if(!rows.length)throw Error('No supported Trump records');
 return {rows:rows.slice(0,500),provider:'Open Cabinet',sourceUpdatedAt:feed.exportedAt||null,providerCurrent:true,available:rows.length,limited:rows.length>500,skipped:excluded,coverage:'Latest 500 resolved stock/ETF transactions on Trump periodic reports; annual and unresolved rows excluded.'};
}
export function cabinetCSV(text,modified){
 const rows=[];let header=null,row=[],cell='',quoted=false;
 const consume=()=>{if(!header){header=row}else if(row.length===header.length){const t=Object.fromEntries(header.map((h,i)=>[h,row[i]]));if(t.official_name==='Trump, Donald J.'&&t.source_kind==='278-T'&&(t.instrument_type==='common_stock'||t.instrument_type==='etf'||knownTrump[t.description]))rows.push({description:t.description,ticker:t.ticker,resolvedTicker:t.resolved_ticker,type:t.type,date:t.date,amount:t.amount_range,sourceUrl:t.source_filing_url,sourceKind:t.source_kind,recordId:t.recordId,verificationScore:t.verificationScore===''?null:Number(t.verificationScore),verificationState:t.verificationState,instrumentType:t.instrument_type,historical:t.historical_report==='yes',accountLabel:t.account_label})}else throw Error('Executive CSV schema changed');row=[]};
 const start=text.startsWith('#')?text.indexOf('\n')+1:0;
 for(let i=start;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(c===','&&!quoted){row.push(cell);cell=''}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);cell='';if(row.some(Boolean))consume();else row=[]}else cell+=c}
 if(quoted)throw Error('Truncated executive CSV');if(cell||row.length){row.push(cell);consume()}
 if(!header?.includes('recordId')||!header.includes('source_filing_url'))throw Error('Executive CSV schema changed');
 return {exportedAt:modified,officials:[{slug:'trump-donald-j',transactions:rows}]};
}
async function fetchText(url,maxBytes=3000000){
 const response=await fetch(url,{headers:{Accept:'application/json','User-Agent':'poor/1.0 public disclosure tracker'},signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error('Source returned HTTP '+response.status);
 if(Number(response.headers.get('content-length'))>maxBytes)throw Error('Source exceeds size limit');
 const reader=response.body.getReader(),decoder=new TextDecoder();let size=0,text='';
 for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>maxBytes){await reader.cancel();throw Error('Source exceeds size limit')}text+=decoder.decode(value,{stream:true})}
 return {text:text+decoder.decode(),modified:response.headers.get('last-modified')};
}
async function fetchJSON(url,maxBytes){return JSON.parse((await fetchText(url,maxBytes)).text)}
export function chartPrices(raw,symbol,now=Date.now()){
 const r=raw.chart?.result?.[0];if(!r||r.meta?.symbol!==symbol||!r.meta.currency||!Array.isArray(r.timestamp))throw Error('Price source unavailable');
 const closes={},bars={};const end=r.meta.currentTradingPeriod?.regular?.end*1000;
 const today=new Date(now).toISOString().slice(0,10);
 r.timestamp.forEach((ts,i)=>{const value=r.indicators?.quote?.[0]?.close?.[i],day=new Date(ts*1000).toISOString().slice(0,10);if(Number.isFinite(value)&&value>0&&ts*1000<=now&&!(day===today&&end>now))closes[day]=value});
 r.timestamp.forEach((ts,i)=>{const day=new Date(ts*1000).toISOString().slice(0,10),q=r.indicators?.quote?.[0];if(!closes[day]||!q)return;const high=q.high?.[i],low=q.low?.[i],volume=q.volume?.[i];if(Number.isFinite(high)&&Number.isFinite(low)&&high>=low&&low>0&&high>=closes[day]&&low<=closes[day])bars[day]={high,low,close:closes[day],volume:Number.isFinite(volume)&&volume>=0?volume:null}});
 const asOf=Object.keys(closes).sort().at(-1);if(!asOf)throw Error('No completed daily closes');
 const dates=Object.keys(closes).sort(),index=r.timestamp.findIndex(ts=>new Date(ts*1000).toISOString().slice(0,10)===asOf),quote=r.indicators.quote[0],previousClose=closes[dates.at(-2)]||null;
 return {currency:r.meta.currency,asOf,latest:closes[asOf],closes,bars,previousClose,name:r.meta.longName||r.meta.shortName||symbol,exchange:r.meta.fullExchangeName||r.meta.exchangeName||'',instrument:r.meta.instrumentType||'',open:quote.open?.[index]??null,high:quote.high?.[index]??null,low:quote.low?.[index]??null,volume:quote.volume?.[index]??null,high52:r.meta.fiftyTwoWeekHigh??null,low52:r.meta.fiftyTwoWeekLow??null,source:`https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}/history/`};
}
const xmlText=s=>s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Math.min(Number(n),1114111))).replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
export function newsRows(xml){
 const items=[...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0,6).map(([,item])=>{const get=tag=>xmlText(item.match(new RegExp('<'+tag+'(?: [^>]*)?>([\\s\\S]*?)<\\/'+tag+'>'))?.[1]||'').trim();return {title:get('title').slice(0,220),url:get('link'),published:get('pubDate')}});
 return items.filter(i=>i.title&&i.url.startsWith('https://')&&!isNaN(Date.parse(i.published)));
}
async function pricesFor(env,symbol){return cached(env,'prices-v3/'+symbol,15*60000,async()=>chartPrices(await fetchJSON(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=2y&interval=1d`),symbol))}
const DEFAULT_WATCH=['BE','INTC','NVDA','SPY'];
export function validateWorkspaceAction(action){
 if(!action||!['watch','rule','deleteRule','readAlerts'].includes(action.kind))throw Error('Unknown action');
 if(['watch','rule'].includes(action.kind)&&!symbolOK(action.symbol))throw Error('Invalid ticker');
 if(action.kind==='watch'&&typeof action.enabled!=='boolean')throw Error('Invalid watch setting');
 if(action.kind==='rule'&&(!['priceAbove','priceBelow','filings','cluster'].includes(action.type)||(['priceAbove','priceBelow'].includes(action.type)&&!(Number.isFinite(action.threshold)&&action.threshold>0&&action.threshold<1e9))))throw Error('Invalid alert rule');
 if(action.kind==='deleteRule'&&(typeof action.id!=='string'||action.id.length>100))throw Error('Invalid rule');
}
export function evaluateRules(state,records,prices,now=Date.now()){
 const events=[];for(const rule of state.rules){
  if(rule.type==='filings'){
   const matching=records.filter(r=>r.ticker===rule.symbol);const ids=matching.map(r=>r.id);const previous=new Set(rule.seen||[]);
   if(rule.initialized){for(const row of matching.filter(r=>!previous.has(r.id))){events.push({id:'filing:'+rule.id+':'+row.id,symbol:rule.symbol,title:`${row.person} · ${row.type} ${rule.symbol}`,detail:`Traded ${row.traded}; reported ${row.filed}. Newly observed by poor, not necessarily newly published.`,source:row.source,at:now})}}
   rule.seen=ids;rule.initialized=true;
  }else if(rule.type==='cluster'){
   const recent=records.filter(r=>r.ticker===rule.symbol&&r.type==='Purchase'&&['Stock','ADR','Call options'].includes(r.asset)&&Date.parse(r.traded)>=now-30*86400000&&Date.parse(r.traded)<=now);
   const people=[...new Set(recent.map(r=>r.person))].sort();const sig=people.join('|');
   if(rule.initialized&&people.length>=2&&sig!==rule.signature)events.push({id:'cluster:'+rule.id+':'+sig,symbol:rule.symbol,title:`${rule.symbol} · ${people.length} buying households`,detail:`${people.join(', ')} bought in the last 30 days. Shared buying is not proof of insider information.`,at:now});
   rule.initialized=true;rule.signature=sig;
  }else{
   const p=prices[rule.symbol];if(!p||p.stale||!p.value||now-p.checkedAt>30*60000||now-Date.parse(p.value.asOf)>5*86400000)continue;
   const hit=rule.type==='priceAbove'?p.value.latest>=rule.threshold:p.value.latest<=rule.threshold;
   if(hit&&!rule.hit)events.push({id:'price:'+rule.id+':'+p.value.asOf,symbol:rule.symbol,title:`${rule.symbol} closed ${rule.type==='priceAbove'?'above':'below'} ${rule.threshold}`,detail:`${p.value.latest.toFixed(2)} ${p.value.currency} · close ${p.value.asOf}. Daily closing-price alert.`,at:now});
   rule.hit=hit;
  }
 }
 const seen=new Set(state.alerts.map(a=>a.id));state.alerts=[...events.filter(e=>!seen.has(e.id)),...state.alerts].slice(0,100);state.evaluatedAt=now;return state;
}
async function workspace(request,env){
 const url=new URL(request.url),match=request.headers.get('cookie')?.match(/(?:^|;\s*)__Host-pif_session=([a-f0-9]{64})(?:;|$)/);
 // Identity headers are supplied and sanitized by Sites dispatch, never by the browser.
 const userId=request.headers.get('oai-authenticated-user-id'),email=request.headers.get('oai-authenticated-user-email');
 const user=userId&&email?{email}:null;
 const id=match?.[1]||[...crypto.getRandomValues(new Uint8Array(32))].map(b=>b.toString(16).padStart(2,'0')).join('');
 const accountKey=user?[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(userId)))].map(b=>b.toString(16).padStart(2,'0')).join(''):null;
 const key=user?'poor/accounts/'+accountKey:'pif/workspaces/'+id;
 if(request.method==='POST'&&(request.headers.get('origin')!==url.origin||!request.headers.get('content-type')?.startsWith('application/json')))return json({error:'Same-origin JSON required'},403);
 let action=null;if(request.method==='POST'){const text=await request.text();if(text.length>4096)return json({error:'Request too large'},413);try{action=JSON.parse(text);validateWorkspaceAction(action)}catch(e){return json({error:e.message},400)}}
 for(let attempt=0;attempt<3;attempt++){
  const object=await env.BUCKET.get(key),state=object?await object.json():{symbols:DEFAULT_WATCH.slice(),rules:[],alerts:[],readAt:0,evaluatedAt:0};
  state.alerts=state.alerts.map(a=>({...a,detail:a.detail?.replace(/Newly observed by PIF/g,'Newly observed by poor')}));
  if(action?.kind==='watch'){state.symbols=action.enabled?[...new Set([...state.symbols,action.symbol])]:state.symbols.filter(s=>s!==action.symbol);if(state.symbols.length>30)return json({error:'Watch up to 30 stocks'},400)}
  if(action?.kind==='rule'){
   if(state.rules.length>=20)return json({error:'Use up to 20 alert rules'},400);
   if(!state.rules.some(r=>r.symbol===action.symbol&&r.type===action.type&&r.threshold===action.threshold))state.rules.push({id:crypto.randomUUID(),symbol:action.symbol,type:action.type,threshold:action.threshold,createdAt:Date.now()});
  }
  if(action?.kind==='deleteRule')state.rules=state.rules.filter(r=>r.id!==action.id);
  if(action?.kind==='readAlerts')state.readAt=Date.now();
  if(state.rules.length&&(action?.kind==='rule'||Date.now()-state.evaluatedAt>60000)){
   const feeds=await Promise.all(['congress-universe-v3'].map(async k=>{const o=await env.BUCKET.get('pif/v1/'+k);return o?await o.json():null}));
   const records=feeds.flatMap(f=>f?.value?.rows||[]);const symbols=[...new Set(state.rules.filter(r=>r.type.startsWith('price')).map(r=>r.symbol))];const prices={};
   // Use cached quotes; browser's normal update loop obtains new quotes before checking alerts.
   for(const s of symbols){const o=await env.BUCKET.get('pif/v1/prices-v3/'+s);if(o)prices[s]=await o.json()}
   if(feeds.every(f=>f?.value&&!f.stale&&!f.error&&Date.now()-f.checkedAt<6*HOUR))evaluateRules(state,records,prices);else{const rules=state.rules.filter(r=>r.type.startsWith('price')),evaluated=evaluateRules({...state,rules},[],prices);state.alerts=evaluated.alerts;state.evaluatedAt=evaluated.evaluatedAt}
  }
  const saved=await env.BUCKET.put(key,JSON.stringify(state),{onlyIf:object?{etagMatches:object.etag}:{etagDoesNotMatch:'*'}});
  if(!saved)continue;
  const response=json({...state,user});if(!user)response.headers.set('Set-Cookie',`__Host-pif_session=${id}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=31536000`);return response;
 }
 return json({error:'Workspace changed; retry'},409);
}
export async function cached(env,key,ttl,loader,now=Date.now()){
 if(inflight.has(key))return inflight.get(key);
 const work=(async()=>{
  if(!env.BUCKET)throw Error('Persistent cache unavailable');
  const path='pif/v1/'+key,obj=await env.BUCKET.get(path),old=obj?await obj.json():null;
  if(old?.value&&now-old.checkedAt<ttl&&!old.error)return {...old,stale:false};
  if(old?.retryAt>now||old?.leaseUntil>now)return {...old,stale:true,error:old.error||'Refresh in progress'};
  const lock=await env.BUCKET.put(path,JSON.stringify({...old,leaseUntil:now+60000}),{onlyIf:obj?{etagMatches:obj.etag}:{etagDoesNotMatch:'*'}});
  if(!lock)return {...old,stale:true,error:'Refresh in progress'};
  try{
   const value=await loader();const next={value,checkedAt:Date.now(),attemptedAt:Date.now(),error:null};
   await env.BUCKET.put(path,JSON.stringify(next));return {...next,stale:false};
  }catch(err){const next={...old,leaseUntil:0,attemptedAt:Date.now(),retryAt:Date.now()+600000,error:String(err.message||err).slice(0,160)};await env.BUCKET.put(path,JSON.stringify(next));return {...next,stale:true}}
 })();inflight.set(key,work);try{return await work}finally{inflight.delete(key)}
}
function json(value,status=200){return new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})}
import {researchRoute,researchIngest} from './research.mjs';
export default {async fetch(request,env){
 const url=new URL(request.url);
 if(url.pathname==='/api/research/ingest'&&request.method==='POST'){try{const r=await researchIngest(request,env);return json(r.body,r.status)}catch{return json({error:'Report rejected'},400)}}
 if(url.pathname==='/api/workspace'&&['GET','POST'].includes(request.method)){try{return await workspace(request,env)}catch(error){console.error('Workspace failure',error.message);return json({error:'Workspace temporarily unavailable'},503)}}
 if(!['GET','HEAD'].includes(request.method))return json({error:'Method not allowed'},405);
 try{
  if(url.pathname.startsWith('/api/research')){const result=await researchRoute(url,env,cached,pricesFor);return json(result,result.error?400:200)}
  if(url.pathname==='/api/feed/congress')return json(await cached(env,'congress-universe-v3',6*HOUR,()=>trackedRosterFeed(env)));
  if(url.pathname==='/api/feed/executive')return json(await cached(env,'executive',6*HOUR,async()=>{const raw=await fetchText(CABINET_URL,24000000);return executiveRows(cabinetCSV(raw.text,raw.modified))}));
  if(url.pathname==='/api/news'){
   const symbol=url.searchParams.get('symbol');if(!symbolOK(symbol))return json({error:'Invalid ticker'},400);
   return json(await cached(env,'news/'+symbol,HOUR,async()=>({items:newsRows((await fetchText(`https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol)}&region=US&lang=en-US`,1000000)).text),source:'Yahoo Finance RSS'})));
  }
  if(url.pathname==='/api/prices'){
   const symbols=[...new Set((url.searchParams.get('symbols')||'').split(','))];
   if(!symbols.length||symbols.length>6||symbols.some(s=>!symbolOK(s)))return json({error:'Use 1–6 valid ticker symbols'},400);
   const results={};for(let i=0;i<symbols.length;i+=3){await Promise.all(symbols.slice(i,i+3).map(async s=>{results[s]=await pricesFor(env,s)}))}
   return json(results);
  }
  if(url.pathname.startsWith('/api/'))return json({error:'Not found'},404);
  const file=FILES[url.pathname==='/'?'/index.html':url.pathname];if(!file)return new Response('Not found',{status:404});
  return new Response(request.method==='HEAD'?null:file.body,{headers:{'Content-Type':file.type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}});
 }catch(error){console.error('poor request failed',url.pathname,error.message);return json({error:'Service temporarily unavailable; saved data remains visible.'},503)}
}};
