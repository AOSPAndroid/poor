// Public-source research. Independent caches keep a failed provider from hiding other evidence.
const RHOUR=3600000;
const researchUniverse={BE:['Bloom Energy','fuel cells'],INTC:['Intel','semiconductors'],NVDA:['NVIDIA','semiconductors'],AMD:['Advanced Micro Devices','semiconductors'],AAPL:['Apple','consumer electronics'],MSFT:['Microsoft','cloud computing'],AMZN:['Amazon','cloud computing'],GOOG:['Alphabet','artificial intelligence'],GOOGL:['Alphabet','artificial intelligence'],META:['Meta Platforms','social media'],TSLA:['Tesla','electric vehicles'],AVGO:['Broadcom','semiconductors'],LMT:['Lockheed Martin','defense'],RTX:['RTX','defense'],PLTR:['Palantir','artificial intelligence']};
const cleanXML=s=>String(s||'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").trim();
const xt=(s,t)=>cleanXML(new RegExp('<'+t+'(?:\\s[^>]*)?>([\\s\\S]*?)</'+t+'>','i').exec(s)?.[1]);
const blocks=(s,t)=>[...s.matchAll(new RegExp('<'+t+'(?:\\s[^>]*)?>([\\s\\S]*?)</'+t+'>','gi'))].map(m=>m[1]);
const day=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'')&&!isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
const num=s=>s!==''&&Number.isFinite(Number(s))?Number(s):null;
let secNextRequest=0;
const today=()=>new Date().toISOString().slice(0,10);
const ago=n=>new Date(Date.now()-n*86400000).toISOString().slice(0,10);
async function researchFetch(url,opts={}){if(new URL(url).hostname.endsWith('sec.gov')){const delay=Math.max(0,secNextRequest-Date.now());secNextRequest=Date.now()+delay+150;if(delay)await new Promise(resolve=>setTimeout(resolve,delay))}const r=await fetch(url,{...opts,headers:{'User-Agent':'poor public financial research https://poor.daaalil.chatgpt.site','Accept':'application/json, application/xml, text/csv',...opts.headers},signal:AbortSignal.timeout(18000)});if(!r.ok)throw Error('Provider returned '+r.status);const text=await r.text();if(text.length>8000000)throw Error('Source response exceeds limit');return text}
const rjson=async(url,opts)=>JSON.parse(await researchFetch(url,opts));
export function parseForm4(xml,{url,accepted,accession,symbol}){
 if(!xml.includes('<ownershipDocument'))throw Error('Invalid Form 4 XML');
 const issuer=xt(xml,'issuerTradingSymbol').toUpperCase();if(issuer!==symbol)throw Error('Issuer ticker mismatch');
 const amended=xt(xml,'documentType')==='4/A',owners=blocks(xml,'reportingOwner').map(o=>({name:xt(o,'rptOwnerName'),id:xt(o,'rptOwnerCik'),role:xt(o,'officerTitle')|| (xt(o,'isDirector')==='1'?'Director':xt(o,'isTenPercentOwner')==='1'?'10% owner':'Reporting owner')}));
 return blocks(xml,'nonDerivativeTransaction').map((t,i)=>{const traded=xt(t,'transactionDate'),shares=num(xt(t,'transactionShares')),price=num(xt(t,'transactionPricePerShare')),code=xt(t,'transactionCode');return {id:'sec:'+accession+':'+i,kind:'insider',symbol,title:owners.map(o=>o.name).join(' / '),owners,role:owners.map(o=>o.role).join(' / '),code,purchase:code==='P'&&xt(t,'transactionAcquiredDisposedCode')==='A'&&!amended,traded,published:accepted||null,url,amended,plan10b51:xt(xml,'aff10b5One')==='1',shares,price,amount:shares!==null&&price!==null?shares*price:null,security:xt(t,'securityTitle'),ownership:xt(t,'directOrIndirectOwnership'),match:'SEC issuer ticker',note:amended?'Amendment · excluded from signals':code==='P'?'Open-market or private purchase':({A:'Award / grant',M:'Exercise / conversion',F:'Tax withholding',S:'Sale',G:'Gift'}[code]||'Other transaction')};}).filter(r=>day(r.traded)&&r.traded<=today());
}
export function parseTreasury(xml){
 const rows=blocks(xml,'m:properties').map(x=>({date:xt(x,'d:NEW_DATE').slice(0,10),m3:num(xt(x,'d:BC_3MONTH')),y2:num(xt(x,'d:BC_2YEAR')),y10:num(xt(x,'d:BC_10YEAR')),y30:num(xt(x,'d:BC_30YEAR'))})).filter(x=>day(x.date)&&x.date<=today()&&x.y10!==null).sort((a,b)=>a.date.localeCompare(b.date));
 if(!rows.length)throw Error('No Treasury yield observations');return {rows:rows.slice(-65),url:'https://home.treasury.gov/resource-center-data-chart-center/interest-rates',unit:'percent',source:'US Treasury daily par yield curve'};
}
export function parseCalendar(csv){const rows=[];let row=[],value='',quoted=false;for(let i=0;i<csv.length;i++){const c=csv[i];if(c==='"'){if(quoted&&csv[i+1]==='"'){value+='"';i++}else quoted=!quoted}else if(!quoted&&(c===','||c==='\n')){row.push(value.replace(/\r$/,''));value='';if(c==='\n'){rows.push(row);row=[]}}else value+=c}if(value||row.length){row.push(value.trim());rows.push(row)}const h=rows.shift()||[];if(!h.includes('reportDate')||!h.includes('symbol'))throw Error('Earnings calendar unavailable or quota exceeded');return rows.map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]]))).filter(r=>day(r.reportDate));}
async function observed(env,symbol,source,result){
 const path='poor/research/observed/'+symbol+'/'+source,old=await env.BUCKET.get(path),known=old?await old.json():{},now=new Date().toISOString();
 result.items=(result.items||[]).map(item=>({...item,firstObserved:known[item.id]||now}));
 const next=Object.fromEntries(result.items.map(i=>[i.id,i.firstObserved]));await env.BUCKET.put(path,JSON.stringify({...known,...next}));return result;
}
async function secResearch(env,symbol,cache){
 const mapping=await cache(env,'sec-tickers',24*RHOUR,()=>rjson('https://www.sec.gov/files/company_tickers.json'));if(!mapping.value)throw Error('SEC company directory unavailable');
 const issuer=Object.values(mapping.value).find(v=>v.ticker===symbol);if(!issuer)return {items:[],coverage:'No SEC issuer match for this ticker'};
 const cik=String(issuer.cik_str).padStart(10,'0'),s=await rjson('https://data.sec.gov/submissions/CIK'+cik+'.json'),recent=s.filings?.recent;if(!recent?.form)throw Error('SEC filing index unavailable');
 const filings=recent.form.map((f,i)=>({form:f,accession:recent.accessionNumber[i],doc:recent.primaryDocument[i],accepted:recent.acceptanceDateTime[i],filed:recent.filingDate[i]})).filter(f=>['4','4/A'].includes(f.form)&&f.filed>=ago(180)).slice(0,20);
 const items=[],errors=[];for(const f of filings){try{const base='https://www.sec.gov/Archives/edgar/data/'+Number(cik)+'/'+f.accession.replaceAll('-','')+'/',file=f.doc.split('/').at(-1);if(!/^[\w.-]+\.xml$/i.test(file))continue;const url=base+file;const parsed=await cache(env,'sec-doc/'+f.accession,30*24*RHOUR,async()=>parseForm4(await researchFetch(url),{url,accepted:f.accepted,accession:f.accession,symbol}));if(!parsed.value)throw Error(parsed.error||'Filing unavailable');items.push(...parsed.value);}catch{errors.push(f.accession)}}
 // Any amendment makes matching owner history ambiguous; retain evidence but exclude that owner from automatic overlaps.
 const amendedOwners=new Set(items.filter(i=>i.amended).flatMap(i=>i.owners.map(o=>o.id)));for(const i of items)if(i.owners.some(o=>amendedOwners.has(o.id))){i.purchase=false;i.note+=' · owner has amendment in loaded filings; review required'}
 return observed(env,symbol,'sec',{items,company:s.name,cik,coverage:`Latest ${filings.length} Form 4/4A filings within 180 days; non-derivative transactions only. ${errors.length} filings unavailable. Not a complete insider history.`,partial:errors.length>0,url:'https://www.sec.gov/edgar/browse/?CIK='+cik});
}
export const normalizeRecipient=s=>String(s||'').toUpperCase().replace(/[^A-Z0-9 ]/g,' ').replace(/\b(CORPORATION|CORP|INCORPORATED|INC|LLC|LTD|LIMITED|CO|COMPANY)\b/g,'').replace(/\s+/g,' ').trim();
async function awardResearch(env,symbol){const company=researchUniverse[symbol]?.[0];if(!company)return {items:[],coverage:'No reviewed company search term for this ticker'};
 const body={filters:{keywords:[company],award_type_codes:['A','B','C','D','02','03','04','05'],time_period:[{start_date:ago(365),end_date:today()}]},fields:['Award ID','Recipient Name','Award Amount','Start Date','Awarding Agency','Description'],limit:20,page:1,sort:'Start Date',order:'desc'};
 // USAspending requires separate contract and assistance queries.
 const results=[];for(const types of [['A','B','C','D'],['02','03','04','05']]){const j=await rjson('https://api.usaspending.gov/api/v2/search/spending_by_award/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,filters:{...body.filters,award_type_codes:types}})});if(!Array.isArray(j.results))throw Error('Award schema changed');results.push(...j.results.map(r=>({...r,awardKind:types[0]==='A'?'Contract':'Grant'})))}
 const items=awardRows(results,symbol);
 return observed(env,symbol,'awards',{items,coverage:'Up to 20 contracts + 20 grants with activity in the past year, searched by company name. Subsidiaries and identity are not independently resolved; keyword candidates do not count as company evidence.'});}
export function awardRows(results,symbol){const company=researchUniverse[symbol]?.[0];return [...new Map(results.map(r=>[r.generated_internal_id,r])).values()].filter(r=>r.generated_internal_id).map(r=>({id:'award:'+r.generated_internal_id,kind:'award',symbol,title:r['Recipient Name'],description:r.Description,agency:r['Awarding Agency'],amount:r['Award Amount'],awardKind:r.awardKind,traded:r['Start Date'],published:null,url:'https://www.usaspending.gov/award/'+encodeURIComponent(r.generated_internal_id),match:normalizeRecipient(r['Recipient Name'])===normalizeRecipient(company)?'Normalized recipient name':'Keyword candidate · recipient unverified',exact:normalizeRecipient(r['Recipient Name'])===normalizeRecipient(company),note:'Obligated award amount, not company revenue. Award start is not publication date.'}));}
async function policyResearch(env,symbol){const term=researchUniverse[symbol]?.[1];if(!term)return {items:[],coverage:'No reviewed policy keyword for this ticker'};
 const j=await rjson('https://www.federalregister.gov/api/v1/documents.json?per_page=12&order=newest&conditions[publication_date][gte]='+ago(90)+'&conditions[term]='+encodeURIComponent(term));if(!Array.isArray(j.results))throw Error('Policy source unavailable');
 return observed(env,symbol,'policy',{items:j.results.map(r=>({id:'fr:'+r.document_number,kind:'policy',symbol,title:r.title,published:r.publication_date,traded:r.effective_on||null,url:r.html_url,documentType:r.type,agency:(r.agencies||[]).map(a=>a.name).join(', '),match:'Sector keyword: '+term,note:'Research candidate; company impact and direction unverified.'})),coverage:'Latest 12 sector-keyword matches published within 90 days. Proposed rules are not final rules.'});}
async function billResearch(env,symbol){if(!env.CONGRESS_API_KEY)return {items:[],unavailable:true,coverage:'Congress.gov API key required. Bill and committee matching is not connected.'};
 const term=researchUniverse[symbol]?.[1];if(!term)return {items:[],coverage:'No policy keyword configured'};
 const j=await rjson('https://api.congress.gov/v3/bill?format=json&limit=250&sort=updateDate+desc&api_key='+encodeURIComponent(env.CONGRESS_API_KEY));if(!Array.isArray(j.bills))throw Error('Congress.gov unavailable');
 const words=term==='semiconductors'?/semiconductor|chips/i:new RegExp(term,'i');const found=j.bills.filter(b=>['HR','S'].includes(b.type)&&words.test(b.title));const items=[];
 for(const b of found.slice(0,5)){const committees=await rjson(`https://api.congress.gov/v3/bill/${b.congress}/${b.type.toLowerCase()}/${b.number}/committees?format=json&api_key=${encodeURIComponent(env.CONGRESS_API_KEY)}`);items.push({id:`bill:${b.congress}:${b.type}:${b.number}`,kind:'bill',symbol,title:b.title,published:b.latestAction?.actionDate||null,traded:b.latestAction?.actionDate||null,url:`https://www.congress.gov/bill/${b.congress}th-congress/${b.type==='S'?'senate':'house'}-bill/${b.number}`,match:'Title keyword candidate',note:b.latestAction?.text,committees:(committees.committees||[]).map(c=>c.name)})}
 return observed(env,symbol,'bills',{items,coverage:'Keyword scan of the 250 most recently updated bills; committee referrals shown, not politician influence or verified company impact.'});}
async function earningsResearch(env,symbol,cache){if(!env.ALPHA_VANTAGE_API_KEY)return {items:[],unavailable:true,coverage:'Earnings feed needs an Alpha Vantage API key; no date is assumed.'};
 const all=await cache(env,'earnings-calendar-v1',24*RHOUR,async()=>({rows:parseCalendar(await researchFetch('https://www.alphavantage.co/query?function=EARNINGS_CALENDAR&horizon=3month&apikey='+encodeURIComponent(env.ALPHA_VANTAGE_API_KEY)))}));if(!all.value||all.stale)throw Error('Earnings provider unavailable');const items=all.value.rows.filter(r=>r.symbol===symbol&&r.reportDate>=today()).map(r=>({id:'earnings:'+symbol+':'+r.reportDate,kind:'earnings',symbol,title:'Expected earnings',traded:r.reportDate,published:null,url:'https://www.alphavantage.co/documentation/#earnings-calendar',match:'Provider ticker',note:'Expected date; confirm with investor relations. Release time not supplied.',currency:r.currency}));return {...await observed(env,symbol,'earnings',{items,coverage:items.length?'3-month provider calendar; dates can change.':'No date found in the next 3 months; this does not establish there is no earnings risk.'}),stale:all.stale};}
export async function researchRoute(url,env,cache,priceLoader){const path=url.pathname;if(path==='/api/research/treasury')return cache(env,'treasury-v1',6*RHOUR,async()=>{const year=new Date().getUTCFullYear(),xml=await researchFetch('https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value='+year);return parseTreasury(xml)});
 if(path==='/api/research/status'){const o=await env.BUCKET.get('poor/research/collector');return {collector:o?await o.json():null,congressConnected:!!env.CONGRESS_API_KEY,earningsConnected:!!env.ALPHA_VANTAGE_API_KEY}}
 if(path==='/api/research/politics'){const feed=await readResearch(env,'pif/v1/congress-universe-v3');return {value:{rows:mapPoliticalRows(feed),coverage:'Curated source records plus loaded feed; original provenance retained'}};}
 if(path==='/api/research/daily')return dailyArchive(env);
 if(path==='/api/research/performance')return articlePerformance(env,url.searchParams.get('id'),priceLoader);
 const symbol=url.searchParams.get('symbol');if(!/^[A-Z][A-Z0-9.-]{0,11}$/.test(symbol||''))return {error:'Invalid ticker'};
 if(path==='/api/research/signals')return evidenceSignals(env,symbol);
 if(path==='/api/research/map')return connectionMap(env,symbol);
 if(path==='/api/research/agent'){const o=await env.BUCKET.get('poor/research/agent/'+symbol);if(!o)return {items:[],coverage:'No research received yet.'};const saved=await o.json();return {...saved,coverage:'Source-linked research leads; claims require verification and do not enter buying counts.',items:(saved.items||[]).map(i=>({...i,match:i.mode==='fallback'?'Research fallback - source lead, not a verified transaction':'Research interpretation'}))}}
 const source=url.searchParams.get('source');const loaders={sec:()=>secResearch(env,symbol,cache),awards:()=>awardResearch(env,symbol),policy:()=>policyResearch(env,symbol),bills:()=>billResearch(env,symbol),earnings:()=>earningsResearch(env,symbol,cache)};if(!loaders[source])return {error:'Unknown research source'};
 return cache(env,'research-v1/'+symbol+'/'+source,6*RHOUR,loaders[source]);}
export function connectionSignals(politics,insiders){
 const purchases=politics.filter(r=>r.type==='Purchase'&&['Stock','ADR','Call options'].includes(r.asset)&&day(r.traded)&&day(r.filed));const candidates=[];
 for(const anchor of [...purchases,...insiders.filter(r=>r.purchase)]){const end=new Date(Date.parse(anchor.traded)+30*86400000).toISOString().slice(0,10),p=purchases.filter(r=>r.traded>=anchor.traded&&r.traded<=end),i=insiders.filter(r=>r.purchase&&r.traded>=anchor.traded&&r.traded<=end);const people=[...new Set(p.map(r=>r.person))].sort(),owners=[...new Set(i.flatMap(r=>r.owners.map(o=>o.id)).filter(Boolean))];if(people.length<2&&!(people.length&&owners.length))continue;
 const docs=[...new Set([...p.map(r=>r.source),...i.map(r=>r.url)])].sort(),key=docs.join('|');if(candidates.some(c=>c.key===key))continue;candidates.push({key,politicians:people,insiderOwners:owners.length,start:anchor.traded,end:[...p.map(r=>r.traded),...i.map(r=>r.traded)].sort().at(-1),publicBy:[...p.map(r=>r.filed),...i.map(r=>(r.published||'').slice(0,10))].sort().at(-1),sources:docs,families:owners.length?2:1});}
 return candidates.sort((a,b)=>b.politicians.length+b.insiderOwners-a.politicians.length-a.insiderOwners).slice(0,10);
}
export function forwardResult(closes,observedAt,horizon){const dates=Object.keys(closes||{}).filter(day).sort(),start=dates.findIndex(d=>d>observedAt.slice(0,10));if(start<0||!dates[start+horizon])return null;const end=start+horizon,a=closes[dates[start]],b=closes[dates[end]];return a>0&&b>0?{entry:dates[start],end:dates[end],return:(b/a-1)*100}:null;}
async function evidenceSignals(env,symbol){const read=async key=>{const o=await env.BUCKET.get(key);return o?await o.json():null};const [congress,sec,history,price,spy]=await Promise.all([read('pif/v1/congress-universe-v3'),read('pif/v1/research-v1/'+symbol+'/sec'),read('poor/research/signals/'+symbol),read('pif/v1/prices-v3/'+symbol),read('pif/v1/prices-v3/SPY')]);
 const inputsCurrent=[congress,sec].every(x=>x?.value&&!x.error&&!x.value.partial&&Date.now()-x.checkedAt<7*RHOUR),found=inputsCurrent?connectionSignals((congress?.value?.rows||[]).filter(r=>r.ticker===symbol&&r.traded>=ago(180)),sec?.value?.items||[]):[],records=history?.records||[];
 for(const c of found){const id=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(c.key)))).map(v=>v.toString(16).padStart(2,'0')).join('');if(!records.some(r=>r.id===id))records.push({...c,key:undefined,id,symbol,firstObserved:new Date().toISOString()})}
 const stored=records.slice(-300);if(found.length)await env.BUCKET.put('poor/research/signals/'+symbol,JSON.stringify({records:stored}));
 return {items:stored.map(r=>({...r,forward:[5,20,60].map(n=>{const ret=forwardResult(price?.value?.closes,r.firstObserved,n);const a=ret&&spy?.value?.closes?.[ret.entry],b=ret&&spy?.value?.closes?.[ret.end];return {sessions:n,...ret,excess:ret&&a>0&&b>0?ret.return-(b/a-1)*100:null}})})).reverse(),inputsCurrent,coverage:'30-calendar-day buying windows. One count per politician household; SEC owners counted separately. Forward tracking begins at the first close strictly after poor first observed the combination. 5/20/60-session returns exclude dividends, fees and execution costs. Overlapping windows are not independent samples; no probability of insider knowledge is inferred.'};}
export function validDailyThesis(a){
 if(['title','tldr','watch','invalidation','horizon'].reduce((n,k)=>n+String(a[k]||'').trim().split(/\s+/).filter(Boolean).length,0)>100)return false;
 if(!['pricedIn','invalidation','horizon'].every(k=>typeof a[k]==='string'&&a[k].trim()&&a[k].length<=800)||!Array.isArray(a.evidence)||a.evidence.length<2||a.evidence.length>4)return false;
 const kinds=new Set(),urls=new Set();let political=false,primary=false;
 for(const e of a.evidence){if(!e||!['political','insider','policy','contract','company','market'].includes(e.kind)||typeof e.fact!=='string'||!e.fact.trim()||e.fact.length>800||!a.sources.includes(e.url)||e.date!==null&&(!day(e.date)||e.date>today()))return false;
  let host;try{host=new URL(e.url).hostname}catch{return false}if(['disclosures-clerk.house.gov','efdsearch.senate.gov','extapps2.oge.gov','www.sec.gov','www.federalregister.gov','www.usaspending.gov','www.congress.gov'].includes(host))primary=true;
  kinds.add(e.kind);urls.add(e.url);if(['political','policy'].includes(e.kind))political=true;
 }
 return kinds.size>=2&&urls.size>=2&&political&&primary;
}
export async function researchIngest(request,env){
 const token=request.headers.get('Authorization');if(!env.RESEARCH_INGEST_TOKEN||token!=='Bearer '+env.RESEARCH_INGEST_TOKEN)return {status:401,body:{error:'Unauthorized'}};
 if(!(request.headers.get('Content-Type')||'').startsWith('application/json'))return {status:415,body:{error:'JSON required'}};const text=await request.text();if(text.length>100000)return {status:413,body:{error:'Too large'}};let b;try{b=JSON.parse(text)}catch{return {status:400,body:{error:'Invalid JSON'}}}
 if(b.kind==='review-status'){await env.BUCKET.put('poor/research/reviewer-status',JSON.stringify({checkedAt:new Date().toISOString(),status:String(b.status||'').slice(0,200)}));return {status:200,body:{ok:true}};}
 if(b.kind==='review')return ingestReview(b,env);
 if(b.kind==='daily'){
  if(!day(b.date)||b.date>today()||!Array.isArray(b.articles)||b.articles.length>4)return {status:400,body:{error:'Invalid daily edition'}};
  const articles=[];
  for(const a of b.articles){
   if(!['title','tldr','why','risk','watch'].every(k=>typeof a[k]==='string'&&a[k].trim()&&a[k].length<=(k==='title'?160:800))||!day(a.published)||a.published>today()||a.published<ago(7)||!Array.isArray(a.tickers)||a.tickers.length>8||a.tickers.some(t=>!/^[$A-Z][A-Z0-9.-]{0,11}$/.test(t))||!Array.isArray(a.sources)||!a.sources.length||a.sources.length>4)return {status:400,body:{error:'Invalid article fields'}};
   const sources=a.sources.map(u=>{try{const x=new URL(u);return x.protocol==='https:'&&!x.username&&!x.password&&x.hostname.includes('.')&&u.length<1500?u:null}catch{return null}});if(sources.some(u=>!u))return {status:400,body:{error:'Invalid sources'}};
   if(!validDailyThesis(a))return {status:400,body:{error:'Research requires two evidence types, sourced facts and a testable thesis'}};
   articles.push({title:a.title,tldr:a.tldr,why:a.why,risk:a.risk,watch:a.watch,published:a.published,tickers:a.tickers,sources,format:2,evidence:a.evidence,pricedIn:a.pricedIn,invalidation:a.invalidation,horizon:a.horizon});
  }
  const object=await env.BUCKET.get('poor/research/daily'),old=object?await object.json():{editions:[]},now=new Date().toISOString();
  const editions=old.editions||[],known=new Set(editions.flatMap(e=>e.articles).map(a=>[...a.sources].sort().join('|')));const fresh=articles.filter(a=>!known.has([...a.sources].sort().join('|')));
  for(const a of fresh){a.id=await researchId(now+'|'+a.title+'|'+a.sources.join('|'));a.publishedAt=now;}
  if(fresh.length)editions.unshift({date:b.date,createdAt:now,articles:fresh});
  const next={editions:editions,lastAttempt:now,status:String(b.status|| (fresh.length?'Published '+fresh.length+' new briefs':'No qualifying new stories')).slice(0,300),schedule:'Daily at 08:00 Europe/Paris while the PC is awake and signed in'};
  await env.BUCKET.put('poor/research/daily',JSON.stringify(next));return {status:200,body:{ok:true,published:fresh.length}};
 }
 if(b.kind==='collector'){const status={lastRun:new Date().toISOString(),successful:Number(b.successful)||0,failed:Number(b.failed)||0,issues:(Array.isArray(b.issues)?b.issues:[]).slice(0,100).map(i=>({path:String(i.path||'').slice(0,180),reason:String(i.reason||'').slice(0,100)})),fallbackStatus:String(b.fallbackStatus||'Not run').slice(0,300),agentStatus:String(b.agentStatus||'No new overlap').slice(0,300),schedule:'Every 6 hours while this PC is awake and you are signed in'};await env.BUCKET.put('poor/research/collector',JSON.stringify(status));return {status:200,body:{ok:true}}}
 if(b.kind==='awards'){
  if(!researchUniverse[b.symbol]||!Array.isArray(b.rows)||b.rows.length>40||b.rows.some(r=>typeof r['Recipient Name']!=='string'||r['Recipient Name'].length>300||typeof r.generated_internal_id!=='string'||!day(r['Start Date'])||!Number.isFinite(r['Award Amount'])||!['Contract','Grant'].includes(r.awardKind)))return {status:400,body:{error:'Invalid award collection'}};
  const value=await observed(env,b.symbol,'awards',{items:awardRows(b.rows,b.symbol),coverage:'USAspending via scheduled collector. Up to 20 contracts + 20 grants with activity in the past year. Name matches are not independently resolved identities; keyword matches are research candidates.'});
  await env.BUCKET.put('pif/v1/research-v1/'+b.symbol+'/awards',JSON.stringify({value,checkedAt:Date.now(),attemptedAt:Date.now(),error:null}));return {status:200,body:{ok:true}};
 }
 if(b.kind==='treasury'){
  if(!Array.isArray(b.rows)||!b.rows.length||b.rows.length>65||b.rows.some(r=>!day(r.date)||r.date>today()||['m3','y2','y10','y30'].some(k=>r[k]!==null&&(!Number.isFinite(r[k])||r[k]<0||r[k]>100))))return {status:400,body:{error:'Invalid Treasury observations'}};
  const rows=[...new Map(b.rows.map(r=>[r.date,{date:r.date,m3:r.m3,y2:r.y2,y10:r.y10,y30:r.y30}])).values()].sort((a,b)=>a.date.localeCompare(b.date));
  const value={rows,url:'https://home.treasury.gov/resource-center-data-chart-center/interest-rates',unit:'percent',source:'US Treasury daily par yield curve via scheduled collector'};await env.BUCKET.put('pif/v1/treasury-v1',JSON.stringify({value,checkedAt:Date.now(),attemptedAt:Date.now(),error:null}));return {status:200,body:{ok:true}};
 }
 if(b.kind!=='agent'||!/^[A-Z][A-Z0-9.-]{0,11}$/.test(b.symbol||'')||!Array.isArray(b.items)||b.items.length>12)return {status:400,body:{error:'Invalid report'}};
 const items=b.items.map(r=>({title:String(r.title||'').slice(0,200),summary:String(r.summary||'').slice(0,1200),url:String(r.url||''),published:day(r.published)?r.published:null,firstObserved:new Date().toISOString(),kind:'agent',mode:b.mode==='fallback'?'fallback':'overlap',match:b.mode==='fallback'?'Research fallback - source lead, not a verified transaction':'poor research · unverified inference'}));if(items.some(r=>!r.title||!/^https:\/\//.test(r.url)||r.url.length>1500))return {status:400,body:{error:'Reports need HTTPS source links'}};
 const previous=await env.BUCKET.get('poor/research/agent/'+b.symbol);const existing=previous?(await previous.json()).items||[]:[];const merged=[...new Map([...items,...existing].map(i=>[i.url+'|'+i.title,i])).values()].slice(0,30);await env.BUCKET.put('poor/research/agent/'+b.symbol,JSON.stringify({items:merged,updatedAt:new Date().toISOString(),coverage:'poor research leads. Claims require primary-source verification; not counted in purchase signals.'}));return {status:200,body:{ok:true}};
}

// Connection records are evidence, not a probability of confidential information.
const readResearch=async(env,key)=>{const o=await env.BUCKET.get(key);return o?await o.json():null};
async function researchId(text){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(v=>v.toString(16).padStart(2,'0')).join('').slice(0,24)}
async function dailyArchive(env){
 const saved=await readResearch(env,'poor/research/daily')||{editions:[],status:'Waiting for the first research thesis'};
 for(const e of saved.editions||[])for(const a of e.articles){a.id||=await researchId(e.createdAt+'|'+a.title+'|'+a.sources.join('|'));a.publishedAt||=e.createdAt||null;}
 const reviews=await readResearch(env,'poor/research/reviews')||{};
 return {...saved,reviewer:await readResearch(env,'poor/research/reviewer-status'),editions:(saved.editions||[]).map(e=>({...e,articles:e.articles.map(a=>({...a,reviews:reviews[a.id]||[]}))}))};
}
export function evaluateArticle(p,spy,publishedAt,locked){
 if(!publishedAt||!Number.isFinite(Date.parse(publishedAt)))return {status:'Publication time unknown'};
 const dates=Object.keys(p?.closes||{}).filter(d=>day(d)&&d<=p.asOf&&p.closes[d]>0).sort(),entry=locked?.entry||dates.find(d=>d>publishedAt.slice(0,10));
 if(!entry)return {status:'Awaiting first close after publication'};
 if(!locked&&(Date.parse(entry)-Date.parse(publishedAt.slice(0,10)))/86400000>7)return {status:'Entry history unavailable'};
 const entryPrice=p?.closes?.[entry],currency=locked?.currency||p?.currency;
 if(!(entryPrice>0))return {status:'Entry history unavailable',basis:locked};
 if(!(entryPrice>0)||!p?.latest||p.asOf<entry||currency!==p.currency)return {status:'Comparable price unavailable',basis:locked};
 const spyEntry=spy?.closes?.[entry],last=spy?.closes?.[p.asOf],since=(p.latest/entryPrice-1)*100;
 const series=dates.filter(d=>d>=entry);let peak=entryPrice,drawdown=0;
 for(const d of series){peak=Math.max(peak,p.closes[d]);drawdown=Math.min(drawdown,(p.closes[d]/peak-1)*100)}
 const complete=series[0]===entry;
 return {status:'Tracking',entry,entryPrice,currency,asOf:p.asOf,latest:p.latest,return:since,excess:spyEntry>0&&last>0?since-(last/spyEntry-1)*100:null,drawdown:complete?drawdown:null,sessions:complete?series.length-1:null,forward:[5,20,60].map(n=>{const end=complete?series[n]:null;return {sessions:n,end:end||null,return:end?(p.closes[end]/entryPrice-1)*100:null}}),basis:{entry,entryPrice,currency,spyEntry:spyEntry||null,originalEntryPrice:locked?.originalEntryPrice||entryPrice}};
}
async function articlePerformance(env,id,priceLoader){
 if(!/^[a-f0-9]{24}$/.test(id||''))return {error:'Invalid article'};
 const archive=await dailyArchive(env),a=archive.editions.flatMap(e=>e.articles).find(a=>a.id===id);if(!a)return {error:'Article not found'};
 const old=await readResearch(env,'poor/research/performance/'+id)||{basis:{}},symbols=[...new Set(a.tickers)];
 const quotes=Object.fromEntries(await Promise.all([...new Set([...symbols,'SPY'])].map(async s=>{try{return [s,priceLoader?await priceLoader(env,s):await readResearch(env,'pif/v1/prices-v3/'+s)]}catch{return [s,null]}})));
 const rows=symbols.map(symbol=>{const q=quotes[symbol],r=evaluateArticle(q?.value,quotes.SPY?.value,a.publishedAt,old.basis[symbol]);if(r.basis)old.basis[symbol]=r.basis;return {symbol,...r,basis:undefined,stale:!!q?.stale||!!q?.error,benchmarkStale:!!quotes.SPY?.stale||!!quotes.SPY?.error,source:q?.value?.source||null}});
 const result={id,publishedAt:a.publishedAt,rows,updatedAt:new Date().toISOString(),method:'Hypothetical long stock price return from the first daily close strictly after the publication UTC date. Each ticker separately; no assumed basket. Excludes dividends, fees, taxes and slippage. SPY uses identical dates. Drawdown uses daily closes; options are not modeled.'};
 await env.BUCKET.put('poor/research/performance/'+id,JSON.stringify({...old,result}));return result;
}
async function ingestReview(b,env){
 if(!/^[a-f0-9]{24}$/.test(b.articleId||'')||!['supported','mixed','challenged','invalidated','inconclusive'].includes(b.verdict)||typeof b.summary!=='string'||!b.summary.trim()||b.summary.length>1000||!Array.isArray(b.sources)||!b.sources.length||b.sources.length>6||b.sources.some(u=>{try{const x=new URL(u);return x.protocol!=='https:'||!!x.username||!!x.password||u.length>1500}catch{return true}}))return {status:400,body:{error:'Invalid review'}};
 const a=(await dailyArchive(env)).editions.flatMap(e=>e.articles).find(a=>a.id===b.articleId);if(!a)return {status:404,body:{error:'Unknown article'}};
 const all=await readResearch(env,'poor/research/reviews')||{},list=all[b.articleId]||[];
 if(list.some(r=>r.summary===b.summary&&r.verdict===b.verdict))return {status:200,body:{ok:true,duplicate:true}};
 list.push({verdict:b.verdict,summary:b.summary,sources:b.sources,reviewedAt:new Date().toISOString()});all[b.articleId]=list;
 await env.BUCKET.put('poor/research/reviews',JSON.stringify(all));return {status:200,body:{ok:true}};
}
async function connectionMap(env,symbol){
 const [congress,daily,old,...feeds]=await Promise.all([readResearch(env,'pif/v1/congress-universe-v3'),dailyArchive(env),readResearch(env,'poor/research/map/'+symbol),...['sec','awards','policy','bills','earnings'].map(s=>readResearch(env,'pif/v1/research-v1/'+symbol+'/'+s)),readResearch(env,'poor/research/agent/'+symbol)]);
 const now=new Date().toISOString(),nodes=new Map((old?.nodes||[]).map(n=>[n.id,n])),edges=new Map((old?.edges||[]).map(e=>[e.id,e]));
 const root='stock:'+symbol;nodes.set(root,{id:root,kind:'stock',label:symbol,status:'record',detail:researchUniverse[symbol]?.[0]||symbol});
 const add=async(record,to=root,relation='Relates to')=>{const id=record.id||await researchId(record.kind+'|'+record.url+'|'+record.label+'|'+record.date);nodes.set(id,{...record,id,firstObserved:nodes.get(id)?.firstObserved||record.firstObserved||now,lastSeen:now});const eid=id+'>'+to;edges.set(eid,{id:eid,from:id,to,relation,status:record.status});return id};
 for(const r of mapPoliticalRows(congress)){if(r.ticker!==symbol)continue;await add({id:await researchId('political|'+[r.id,r.source,r.person,r.traded,r.type,r.asset,r.owner].join('|')),kind:'political',label:r.person,subtitle:r.type+' · '+r.asset,detail:[r.type,r.asset,r.owner,r.amount,r.notes,'Trade '+r.traded,'Disclosed '+(r.disclosed||r.filed)].filter(Boolean).join(' · '),date:r.disclosed||r.filed,eventDate:r.traded,url:r.source,status:r.quality==='Secondary source'?'candidate':'record',provenance:r.quality||'Disclosed transaction',firstObserved:r.firstObserved},root,r.type==='Purchase'?'Disclosed purchase':'Disclosed '+r.type.toLowerCase())}
 const names=['sec','awards','policy','bills','earnings','agent'];const coverage=[];
 feeds.forEach((r,i)=>coverage.push({source:names[i],count:(r?.value?.items||r?.items||[]).length,checkedAt:r?.checkedAt?new Date(r.checkedAt).toISOString():r?.updatedAt||null,state:!r?'Not loaded':r.error?'Unavailable; saved records':r.value?.unavailable?'Not connected':r.value?.partial?'Partial':r.checkedAt&&Date.now()-r.checkedAt>7*RHOUR?'Stale snapshot':'Loaded',note:r?.value?.coverage||r?.coverage||''}));
 for(let i=0;i<feeds.length;i++){const r=feeds[i];for(const x of (r?.value?.items||r?.items||[]))await add({id:x.id?await researchId(names[i]+'|'+x.id):undefined,kind:x.kind||names[i],label:x.title,detail:x.summary||x.description||x.note||x.match||'',date:x.published?.slice(0,10)||x.traded||null,eventDate:x.traded,url:x.url,status:['policy','bill','agent','award','earnings'].includes(x.kind)?'candidate':'record',provenance:x.match||'',firstObserved:x.firstObserved,amount:x.amount},root,x.kind==='insider'?(x.purchase?'Filed purchase':'Filed '+(x.note||'transaction')):x.kind==='award'?'Award candidate':x.kind==='policy'?'Sector keyword match':x.kind==='agent'?'Research lead':'Research context')}
 const [price,benchmark,signals,treasury]=await Promise.all([readResearch(env,'pif/v1/prices-v3/'+symbol),readResearch(env,'pif/v1/prices-v3/SPY'),readResearch(env,'poor/research/signals/'+symbol),readResearch(env,'pif/v1/treasury-v1')]);
 const quote=price?.value,dates=Object.keys(quote?.closes||{}).sort();if(quote?.latest>0){const start=dates.at(-21),move=start?(quote.latest/quote.closes[start]-1)*100:null,b=benchmark?.value?.closes,relative=move!==null&&b?.[start]>0&&b?.[quote.asOf]>0?move-(b[quote.asOf]/b[start]-1)*100:null;await add({id:'market:'+symbol,kind:'market',label:'Price & relative strength',detail:'Close '+quote.latest.toFixed(2)+' '+quote.currency+(move===null?'':' · 20 sessions '+move.toFixed(2)+'%')+(relative===null?'':' · vs SPY '+relative.toFixed(2)+' pp')+' · Historical prices, not a forecast',date:quote.asOf,url:quote.source,status:'record'},root,'Market pricing context')}
 for(const x of signals?.records||[])await add({id:'signal:'+x.id,kind:'cluster',label:x.politicians.length+' political households'+(x.insiderOwners?' + '+x.insiderOwners+' corporate owners':''),detail:x.politicians.join(', ')+' · trades '+x.start+' to '+x.end+' · all public by '+x.publicBy+'. Co-occurrence is a lead, not proof of coordination.',date:x.publicBy,status:'inference',sources:x.sources,firstObserved:x.firstObserved},root,'Buying overlap');
 const yieldRow=treasury?.value?.rows?.at(-1);if(yieldRow)await add({id:'macro:treasury',kind:'market',label:'Treasury rate context',detail:'10-year yield '+yieldRow.y10+'% · 2-year '+(yieldRow.y2??'unknown')+'%. Broad valuation / financing context; company impact requires research.',date:yieldRow.date,url:treasury.value.url,status:'candidate'},root,'Macro context');
 const theses=daily.editions.flatMap(e=>e.articles).filter(a=>a.format===2&&a.tickers.includes(symbol));
 for(const a of theses){const id='thesis:'+a.id;await add({id,kind:'thesis',label:a.title,detail:a.tldr,status:'inference',date:a.publishedAt?.slice(0,10),articleId:a.id,why:a.why,pricedIn:a.pricedIn,watch:a.watch,invalidation:a.invalidation,risk:a.risk,horizon:a.horizon,review:a.reviews?.at(-1),sources:a.sources},root,'Why this stock now?');
  for(const e of a.evidence)await add({kind:e.kind,label:e.fact,detail:e.fact,date:e.date,url:e.url,status:'sourced',provenance:'Sourced claim in research; inspect original document'},id,'Evidence for hypothesis');
 }
 const sorted=[...nodes.values()].sort((a,b)=>(b.date||'').localeCompare(a.date||''));const saved={symbol,nodes:sorted,edges:[...edges.values()],updatedAt:now,coverage:[{source:'political',count:mapPoliticalRows(congress).filter(r=>r.ticker===symbol).length,state:congress?.value?'Loaded':'Not loaded',checkedAt:congress?.checkedAt?new Date(congress.checkedAt).toISOString():null},...coverage]};
 await env.BUCKET.put('poor/research/map/'+symbol,JSON.stringify(saved));return saved;
}

function mapPoliticalRows(feed){const curated=typeof STATIC_RESEARCH_ROWS==='undefined'?[]:STATIC_RESEARCH_ROWS;const key=r=>[r.source,r.person,r.ticker,r.traded].join('|'),known=new Set(curated.map(key));return [...curated,...(feed?.value?.rows||[]).filter(r=>!known.has(key(r)))];}
