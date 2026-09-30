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
 if(path==='/api/research/politics'){const feed=await readResearch(env,'pif/v1/congress-universe-v4');return {value:{rows:mapPoliticalRows(feed),coverage:'Curated source records plus loaded feed; original provenance retained'}};}
 if(path==='/api/research/analyst-targets')return analystTargetsArchive(env);
 if(path==='/api/research/daily')return dailyArchive(env);
 if(path==='/api/research/activity')return {items:(await readResearch(env,'poor/research/activity-index'))?.items||[],status:await readResearch(env,'poor/research/pipeline-status')};
 if(path==='/api/research/investigation-scorecard')return cache(env,'investigation-scorecard-v1',15*60000,()=>investigationScorecard(env));
 if(path==='/api/research/coverage')return coverageReport(env);
 if(path==='/api/research/ledger')return investigationLedger(env,url.searchParams.get('cursor'));
 if(path==='/api/research/investigation-result')return investigationResult(env,url.searchParams.get('id'));
 if(path==='/api/research/scorecard')return cache(env,'research-scorecard-v1',15*60000,()=>researchScorecard(env,priceLoader));
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
async function evidenceSignals(env,symbol){const read=async key=>{const o=await env.BUCKET.get(key);return o?await o.json():null};const [congress,sec,history,price,spy]=await Promise.all([read('pif/v1/congress-universe-v4'),read('pif/v1/research-v1/'+symbol+'/sec'),read('poor/research/signals/'+symbol),read('pif/v1/prices-v4/'+symbol),read('pif/v1/prices-v4/SPY')]);
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
export function validNewsItem(a){
 if(!a||!['title','summary','impact','risk','watch'].every(k=>typeof a[k]==='string'&&a[k].trim()&&a[k].length<=(k==='title'?120:500)))return false;
 if(['title','summary','impact','risk','watch'].reduce((n,k)=>n+a[k].trim().split(/\s+/).length,0)>110||!day(a.date)||a.date>today()||!['new','general','context','upcoming'].includes(a.category)||a.date<ago(['context','upcoming'].includes(a.category)?21:7))return false;
 if(!Array.isArray(a.tickers)||!a.tickers.length||a.tickers.length>5||a.tickers.some(t=>!/^[A-Z][A-Z0-9.-]{0,11}$/.test(t))||!Array.isArray(a.sources)||a.sources.length<1||a.sources.length>4)return false;
 let independent=false;for(const u of a.sources){try{const x=new URL(u);if(x.protocol!=='https:'||x.username||x.password||!x.hostname.includes('.')||u.length>1500)return false;if(!/(^|\.)(x\.com|twitter\.com)$/.test(x.hostname))independent=true}catch{return false}}return independent;
}
async function ingestNews(b,env){
 if(!Array.isArray(b.items)||b.items.length>8||!b.items.every(validNewsItem))return {status:400,body:{error:'Invalid news briefing'}};
 const old=await readResearch(env,'poor/research/news')||{editions:[]},now=new Date().toISOString(),known=new Set(old.editions.flatMap(e=>e.items).map(a=>[...a.sources].sort().join('|'))),items=[];
 for(const a of b.items){const key=[...a.sources].sort().join('|');if(known.has(key))continue;known.add(key);items.push({id:await researchId(key),category:a.category,title:a.title,summary:a.summary,impact:a.impact,risk:a.risk,watch:a.watch,date:a.date,tickers:a.tickers,sources:a.sources,publishedAt:now})}
 const editions=items.length?[{date:today(),publishedAt:now,items},...old.editions].slice(0,30):old.editions;
 await env.BUCKET.put('poor/research/news',JSON.stringify({editions,lastAttempt:now,status:b.status==='failed'?(b.reason==='busy'?'Research service busy; next daily run will retry':'Briefing update failed'):items.length?'Updated':'No publishable items from this search'}));return {status:200,body:{ok:true,published:items.length}};
}
export async function researchIngest(request,env){
 const token=request.headers.get('Authorization');if(!env.RESEARCH_INGEST_TOKEN||token!=='Bearer '+env.RESEARCH_INGEST_TOKEN)return {status:401,body:{error:'Unauthorized'}};
 if(!(request.headers.get('Content-Type')||'').startsWith('application/json'))return {status:415,body:{error:'JSON required'}};const text=await request.text();if(text.length>100000)return {status:413,body:{error:'Too large'}};let b;try{b=JSON.parse(text)}catch{return {status:400,body:{error:'Invalid JSON'}}}
 if(b.kind==='analyst-targets')return ingestAnalystTargets(b,env);
 if(b.kind==='news')return ingestNews(b,env);
 if(b.kind==='investigation')return ingestInvestigation(b,env);
 if(b.kind==='pipeline-status'){if(!Number.isInteger(b.investigations)||b.investigations<0||b.investigations>8||!Number.isInteger(b.challenges)||b.challenges<0||b.challenges>8)return {status:400,body:{error:'Invalid budget'}};await env.BUCKET.put('poor/research/pipeline-status',JSON.stringify({checkedAt:new Date().toISOString(),investigations:b.investigations,challenges:b.challenges,status:String(b.status||'').slice(0,250)}));return {status:200,body:{ok:true}};}
 if(b.kind==='review-status'){await env.BUCKET.put('poor/research/reviewer-status',JSON.stringify({checkedAt:new Date().toISOString(),status:String(b.status||'').slice(0,200)}));return {status:200,body:{ok:true}};}
 if(b.kind==='review')return ingestReview(b,env);
 if(b.kind==='daily'){
  if(!day(b.date)||b.date>today()||!Array.isArray(b.articles)||b.articles.length>4)return {status:400,body:{error:'Invalid daily edition'}};
  const articles=[];
  for(const a of b.articles){
   if(!['title','tldr','why','risk','watch'].every(k=>typeof a[k]==='string'&&a[k].trim()&&a[k].length<=(k==='title'?160:800))||!day(a.published)||a.published>today()||a.published<ago(7)||!Array.isArray(a.tickers)||a.tickers.length>8||a.tickers.some(t=>!/^[$A-Z][A-Z0-9.-]{0,11}$/.test(t))||!Array.isArray(a.sources)||!a.sources.length||a.sources.length>4)return {status:400,body:{error:'Invalid article fields'}};
   const sources=a.sources.map(u=>{try{const x=new URL(u);return x.protocol==='https:'&&!x.username&&!x.password&&x.hostname.includes('.')&&u.length<1500?u:null}catch{return null}});if(sources.some(u=>!u))return {status:400,body:{error:'Invalid sources'}};
   if(!validDailyThesis(a))return {status:400,body:{error:'Research requires two evidence types, sourced facts and a testable thesis'}};
   if(a.tradePlan!==undefined&&!validTradePlan(a.tradePlan,a.tickers))return {status:400,body:{error:'Invalid decision plan'}};
   articles.push({title:a.title,tldr:a.tldr,why:a.why,risk:a.risk,watch:a.watch,published:a.published,tickers:a.tickers,sources,format:2,evidence:a.evidence,pricedIn:a.pricedIn,invalidation:a.invalidation,horizon:a.horizon,...(a.tradePlan?{tradePlan:a.tradePlan}:{})});
  }
  const object=await env.BUCKET.get('poor/research/daily'),old=object?await object.json():{editions:[]},now=new Date().toISOString();
  const editions=old.editions||[],known=new Set(editions.flatMap(e=>e.articles).map(a=>[...a.sources].sort().join('|')));const fresh=articles.filter(a=>!known.has([...a.sources].sort().join('|')));
  for(const a of fresh){a.id=await researchId(now+'|'+a.title+'|'+a.sources.join('|'));a.publishedAt=now;if(a.tradePlan)a.measurement={version:1,registeredAt:now,symbol:a.tradePlan.symbol,direction:a.tradePlan.direction,holdingSessions:20,oneWayCostBps:10};}
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
 return {...saved,news:await readResearch(env,'poor/research/news'),reviewer:await readResearch(env,'poor/research/reviewer-status'),editions:(saved.editions||[]).map(e=>({...e,articles:e.articles.map(a=>({...a,reviews:reviews[a.id]||[]}))}))};
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
 const quotes=Object.fromEntries(await Promise.all([...new Set([...symbols,'SPY'])].map(async s=>{try{return [s,priceLoader?await priceLoader(env,s):await readResearch(env,'pif/v1/prices-v4/'+s)]}catch{return [s,null]}})));
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
 const [congress,daily,old,...feeds]=await Promise.all([readResearch(env,'pif/v1/congress-universe-v4'),dailyArchive(env),readResearch(env,'poor/research/map/'+symbol),...['sec','awards','policy','bills','earnings'].map(s=>readResearch(env,'pif/v1/research-v1/'+symbol+'/'+s)),readResearch(env,'poor/research/agent/'+symbol)]);
 const now=new Date().toISOString(),nodes=new Map((old?.nodes||[]).map(n=>[n.id,n])),edges=new Map((old?.edges||[]).map(e=>[e.id,e]));
 const root='stock:'+symbol;nodes.set(root,{id:root,kind:'stock',label:symbol,status:'record',detail:researchUniverse[symbol]?.[0]||symbol});
 const add=async(record,to=root,relation='Relates to')=>{const id=record.id||await researchId(record.kind+'|'+record.url+'|'+record.label+'|'+record.date);nodes.set(id,{...record,id,firstObserved:nodes.get(id)?.firstObserved||record.firstObserved||now,lastSeen:now});const eid=id+'>'+to;edges.set(eid,{id:eid,from:id,to,relation,status:record.status});return id};
 for(const r of mapPoliticalRows(congress)){if(r.ticker!==symbol)continue;await add({id:await researchId('political|'+[r.id,r.source,r.person,r.traded,r.type,r.asset,r.owner].join('|')),kind:'political',label:r.person,subtitle:r.type+' · '+r.asset,detail:[r.type,r.asset,r.owner,r.amount,r.notes,'Trade '+r.traded,'Disclosed '+(r.disclosed||r.filed)].filter(Boolean).join(' · '),date:r.disclosed||r.filed,eventDate:r.traded,url:r.source,status:r.quality==='Secondary source'?'candidate':'record',provenance:r.quality||'Disclosed transaction',firstObserved:r.firstObserved},root,r.type==='Purchase'?'Disclosed purchase':'Disclosed '+r.type.toLowerCase())}
 const names=['sec','awards','policy','bills','earnings','agent'];const coverage=[];
 feeds.forEach((r,i)=>coverage.push({source:names[i],count:(r?.value?.items||r?.items||[]).length,checkedAt:r?.checkedAt?new Date(r.checkedAt).toISOString():r?.updatedAt||null,state:!r?'Not loaded':r.error?'Unavailable; saved records':r.value?.unavailable?'Not connected':r.value?.partial?'Partial':r.checkedAt&&Date.now()-r.checkedAt>7*RHOUR?'Stale snapshot':'Loaded',note:r?.value?.coverage||r?.coverage||''}));
 for(let i=0;i<feeds.length;i++){const r=feeds[i];for(const x of (r?.value?.items||r?.items||[]))await add({id:x.id?await researchId(names[i]+'|'+x.id):undefined,kind:x.kind||names[i],label:x.title,detail:x.summary||x.description||x.note||x.match||'',date:x.published?.slice(0,10)||x.traded||null,eventDate:x.traded,url:x.url,status:['policy','bill','agent','award','earnings'].includes(x.kind)?'candidate':'record',provenance:x.match||'',firstObserved:x.firstObserved,amount:x.amount},root,x.kind==='insider'?(x.purchase?'Filed purchase':'Filed '+(x.note||'transaction')):x.kind==='award'?'Award candidate':x.kind==='policy'?'Sector keyword match':x.kind==='agent'?'Research lead':'Research context')}
 const [price,benchmark,signals,treasury]=await Promise.all([readResearch(env,'pif/v1/prices-v4/'+symbol),readResearch(env,'pif/v1/prices-v4/SPY'),readResearch(env,'poor/research/signals/'+symbol),readResearch(env,'pif/v1/treasury-v1')]);
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
export function validTradePlan(p,tickers){return p&&['long','watch'].includes(p.direction)&&tickers.includes(p.symbol)&&['entryTrigger','exitRule','catalyst'].every(k=>typeof p[k]==='string'&&p[k].trim().length>=10&&p[k].length<=350)}
// Prospective research measurement, separate from real executed-trade P&L.
export function evaluateResearchOutcome(a,stock,benchmark,now=Date.now()){
 const m=a.measurement,base={id:a.id,title:a.title,symbol:m?.symbol,publishedAt:a.publishedAt,registeredAt:m?.registeredAt};
 if(!m||m.version!==1)return {...base,state:'Legacy · not registered'};
 if(m.direction!=='long')return {...base,state:'Watch only'};
 const published=Date.parse(a.publishedAt),registered=Date.parse(m.registeredAt);
 if(!Number.isFinite(published)||published!==registered||published>now)return {...base,state:'Invalid registration'};
 if(stock?.stale||stock?.error||benchmark?.stale||benchmark?.error)return {...base,state:'Data unavailable or stale'};
 const p=stock?.value,b=benchmark?.value,cutoff=new Date(now).toISOString().slice(0,10);
 if(!p||!b||p.currency!=='USD'||b.currency!=='USD'||!['EQUITY','ETF'].includes(p.instrument))return {...base,state:'Comparable USD stock history needed'};
 const good=n=>Number.isFinite(n)&&n>0;
 const dates=Object.keys(b.closes||{}).filter(d=>day(d)&&d>a.publishedAt.slice(0,10)&&d<=cutoff&&d<=b.asOf&&good(b.closes[d])).sort(),entry=dates[0];
 if(!entry)return {...base,state:'Awaiting entry close'};
 if(Date.parse(entry)-Date.parse(a.publishedAt.slice(0,10))>7*86400000)return {...base,state:'Entry history missing'};
 const end=dates[20],span=dates.slice(0,21);
 if(span.some(d=>!good(p.closes?.[d])||d>p.asOf))return {...base,state:'Stock history incomplete',entry};
 if(!end)return {...base,state:'Measuring',entry,sessions:Math.max(0,span.length-1)};
 const net=(start,finish,bps)=>(finish*(1-bps/10000)/(start*(1+bps/10000))-1)*100;
 const result=net(p.closes[entry],p.closes[end],10),benchmarkReturn=net(b.closes[entry],b.closes[end],10);
 let peak=p.closes[entry],drawdown=0;for(const d of span){peak=Math.max(peak,p.closes[d]);drawdown=Math.min(drawdown,(p.closes[d]/peak-1)*100)}
 return {...base,state:'Completed',entry,end,sessions:20,entryPrice:p.closes[entry],exitPrice:p.closes[end],netReturn:result,benchmarkReturn,excess:result-benchmarkReturn,costStressReturn:net(p.closes[entry],p.closes[end],25),drawdown,measuredAt:new Date(now).toISOString(),source:p.source||null};
}
export function summarizeResearchOutcomes(rows){
 const done=rows.filter(r=>r.state==='Completed'),mean=k=>done.length?done.reduce((s,r)=>s+r[k],0)/done.length:null;
 return {completed:done.length,winners:done.filter(r=>r.netReturn>0).length,losers:done.filter(r=>r.netReturn<0).length,flat:done.filter(r=>r.netReturn===0).length,winRate:done.length?100*done.filter(r=>r.netReturn>0).length/done.length:null,meanNet:mean('netReturn'),meanExcess:mean('excess'),costStress:mean('costStressReturn'),worstDrawdown:done.length?Math.min(...done.map(r=>r.drawdown)):null};
}
async function researchScorecard(env,priceLoader){
 const archive=await dailyArchive(env),all=archive.editions.flatMap(e=>e.articles),registered=all.filter(a=>a.measurement?.version===1).sort((a,b)=>a.publishedAt.localeCompare(b.publishedAt)),selected=registered.slice(0,200),rows=[],memo=new Map();
 const quote=async symbol=>{if(!memo.has(symbol))memo.set(symbol,readResearch(env,'pif/v1/prices-v4/'+symbol).then(q=>q?{...q,stale:!!q.error||Date.now()-Number(q.checkedAt)>36*RHOUR}:null));return memo.get(symbol)};
 for(const a of selected){
  const key='poor/research/outcomes-v1/'+a.id,saved=await readResearch(env,key);
  if(saved){rows.push({...saved,lastReview:a.reviews?.at(-1)?.verdict||'Pending'});continue}
  const stock=a.measurement.direction==='long'?await quote(a.measurement.symbol):null,benchmark=a.measurement.direction==='long'?await quote('SPY'):null;
  const row=evaluateResearchOutcome(a,stock,benchmark);if(row.state==='Completed')await env.BUCKET.put(key,JSON.stringify(row));
  rows.push({...row,lastReview:a.reviews?.at(-1)?.verdict||'Pending'});
 }
 return {status:'Edge not established',protocol:'research-v1',updatedAt:new Date().toISOString(),registered:registered.length,legacy:all.length-registered.length,omitted:Math.max(0,registered.length-selected.length),summary:summarizeResearchOutcomes(rows),rows:rows.reverse(),method:'New explicitly long research theses only; primary USD stock/ETF, first close strictly after publication UTC date, exit 20 S&P 500 proxy sessions later. Fixed 10 basis points per side; stress case 25 per side. Same-date SPY price-return comparison with the same cost assumption. Completed observations are frozen; losses and invalidated theses remain. Research outcomes are not executed trades. Entry triggers are not simulated. No dividends, taxes, intraday stops or options. Overlapping theses are not independent; averages are not portfolio returns. Legacy articles and watch-only theses do not enter return statistics.'};
}
export function validInvestigation(b){
 const x=b.item;return x&&/^[a-f0-9]{24}$/.test(x.id)&&['stock','contract','briefing'].includes(x.type)&&['finding','challenge'].includes(x.phase)&&['supported','wait','rejected','unverified'].includes(x.verdict)&&typeof x.target==='string'&&(x.type==='stock'?/^[A-Z][A-Z0-9.-]{0,11}$/.test(x.target):x.type==='contract'?/^\d{1,20}$/.test(x.target):x.target==='daily')&&['title','whyNow','entry','risk','nextCheck','reason'].every(k=>typeof x[k]==='string'&&x[k].trim()&&x[k].length<=400)&&Array.isArray(x.sources)&&x.sources.length<=5&&x.sources.every(u=>{try{const v=new URL(u);return u.length<1500&&v.protocol==='https:'&&!v.username&&!v.password}catch{return false}})&&(x.verdict==='unverified'||x.sources.some(u=>!/(^|\.)(x\.com|twitter\.com|polymarket\.com)$/.test(new URL(u).hostname)))&&typeof x.fingerprint==='string'&&/^[a-f0-9]{64}$/.test(x.fingerprint)&&(!x.attempt||/^[a-f0-9]{24}$/.test(x.attempt))&&(!x.rules||typeof x.rules==='string'&&x.rules.length<=16000);
}
async function ingestInvestigation(b,env){
 if(!validInvestigation(b))return {status:400,body:{error:'Invalid investigation'}};
 const x=b.item,key='poor/research/investigations/'+x.id+'/'+x.phase+(x.phase==='challenge'?'/'+(x.attempt||'initial'):'');
 const prior=await readResearch(env,key);if(prior)return {status:200,body:{ok:true,duplicate:true}};
 const finding=x.phase==='challenge'?await readResearch(env,'poor/research/investigations/'+x.id+'/finding'):null;
 if(x.phase==='challenge'&&(!finding||finding.target!==x.target||finding.fingerprint!==x.fingerprint||finding.rules!==x.rules))return {status:400,body:{error:'Challenge must match the original case'}};
 const item=Object.fromEntries(['id','type','target','phase','verdict','title','whyNow','entry','risk','nextCheck','reason','sources','fingerprint','rules','attempt'].filter(k=>x[k]!==undefined).map(k=>[k,x[k]]));item.publishedAt=new Date().toISOString();
 item.decisiveEvidenceRetrieved=x.decisiveEvidenceRetrieved===true;
 if(x.phase==='finding'){
  item.protocol='investigations-v1';
  if(x.type==='stock')item.measurement={version:1,symbol:x.target,direction:x.verdict==='supported'&&item.decisiveEvidenceRetrieved?'long':'watch',registeredAt:item.publishedAt};
  if(x.type==='contract')item.marketAtPublication=await captureContract(x.target,x.rules);
 }
 await env.BUCKET.put(key,JSON.stringify(item));
 const index=await readResearch(env,'poor/research/activity-index')||{items:[]};index.items=[item,...index.items.filter(i=>i.id!==item.id||i.phase!==item.phase||i.attempt!==item.attempt)].slice(0,150);await env.BUCKET.put('poor/research/activity-index',JSON.stringify(index));
 return {status:200,body:{ok:true}};
}

// Immutable findings are authoritative; the short activity index is only a recent-feed cache.
export async function investigationLedger(env,cursor){
 if(cursor&&cursor.length>2048)return {error:'Invalid archive cursor'};
 if(!env.BUCKET.list)return {items:(await readResearch(env,'poor/research/activity-index'))?.items||[],cursor:null,partial:true};
 const page=await env.BUCKET.list({prefix:'poor/research/investigations/',limit:50,...(cursor?{cursor}:{})});
 const items=(await Promise.all(page.objects.map(o=>readResearch(env,o.key)))).filter(Boolean).sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt));
 return {items,cursor:page.truncated?page.cursor:null,order:'Archive pages; dates sorted within each page',partial:false};
}
export async function coverageReport(env){
 const [feed,collector,pipeline]=await Promise.all(['pif/v1/congress-universe-v4','poor/research/collector','poor/research/pipeline-status'].map(k=>readResearch(env,k)));
 const rows=mapPoliticalRows(feed),dated=rows.filter(r=>day(r.disclosed||r.filed)),dates=dated.map(r=>r.disclosed||r.filed).sort(),linked=rows.filter(r=>/^https:\/\//.test(r.source||''));
 return {checkedAt:feed?.checkedAt?new Date(feed.checkedAt).toISOString():null,stale:!feed?.checkedAt||!!feed.error||Date.now()-feed.checkedAt>6*RHOUR||feed?.value?.providerCurrent===false||!feed?.value?.sourceUpdatedAt||Date.now()-Date.parse(feed.value.sourceUpdatedAt)>48*RHOUR,rows:rows.length,people:new Set(rows.map(r=>r.person)).size,linked:linked.length,dated:dated.length,first:dates[0]||null,last:dates.at(-1)||null,skipped:feed?.value?.skipped??null,partial:true,coverage:feed?.value?.coverage||'Only saved curated records are available; live coverage unknown.',collectorAt:collector?.lastRun||null,pipelineAt:pipeline?.checkedAt||null,method:'Loaded coverage, not all filings or all holdings. Source links can be aggregators; inspect the original filing. Missing dates, exclusions and reporting delays limit what can be copied.'};
}
export async function captureContract(id,rules,fetcher=fetch){
 const get=async url=>{const r=await fetcher(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('Unavailable');return r.json()};
 try{
  const m=await get('https://gamma-api.polymarket.com/markets/'+id);
  if(String(m.id)!==id||String(m.description||'')!==rules)return {state:'Rules changed or unavailable',checkedAt:new Date().toISOString()};
  const array=x=>Array.isArray(x)?x:JSON.parse(x||'[]'),labels=array(m.outcomes),tokens=array(m.clobTokenIds),prices=array(m.outcomePrices);
  const outcomes=await Promise.all(labels.slice(0,2).map(async(label,i)=>{
   const raw=prices[i]===null||prices[i]===undefined?NaN:Number(prices[i]);const o={label:String(label),price:Number.isFinite(raw)&&raw>=0&&raw<=1?raw:null,bid:null,ask:null,spread:null};
   if(!/^\d{1,100}$/.test(String(tokens[i])))return o;
   try{const b=await get('https://clob.polymarket.com/book?token_id='+tokens[i]),at=Number(b.timestamp);
    if(String(b.asset_id)!==String(tokens[i])||!Number.isFinite(at)||Date.now()-at>120000||at>Date.now()+30000)return o;
    const levels=a=>(a||[]).filter(x=>Number(x.size)>0).map(x=>Number(x.price)).filter(n=>Number.isFinite(n)&&n>0&&n<=1),bids=levels(b.bids),asks=levels(b.asks);
    o.bid=bids.length?Math.max(...bids):null;o.ask=asks.length?Math.min(...asks):null;o.spread=o.ask!==null&&o.bid!==null&&o.ask>=o.bid?o.ask-o.bid:null;o.bookAt=new Date(at).toISOString();
   }catch{}return o;
  }));
  return {state:'Observed',checkedAt:new Date().toISOString(),rules,resolutionSource:m.resolutionSource||null,end:m.endDate||null,closed:m.closed===true,resolved:m.umaResolutionStatus==='resolved',feesEnabled:m.feesEnabled===true,outcomes,url:'https://polymarket.com/market/'+encodeURIComponent(m.slug||id)};
 }catch{return {state:'Quote unavailable',checkedAt:new Date().toISOString()}}
}
export async function investigationResult(env,id){
 if(!/^[a-f0-9]{24}$/.test(id||''))return {error:'Invalid investigation'};
 const a=await readResearch(env,'poor/research/investigations/'+id+'/finding');if(!a)return {error:'Finding not found'};
 if(a.type==='contract'){
  const old=a.marketAtPublication,current=await captureContract(a.target,a.rules);
  return {id,type:a.type,originalVerdict:a.verdict,publishedAt:a.publishedAt,original:{rules:a.rules,...(old||{state:'No publication quote was recorded'})},current,method:'Real provider odds and two-sided quotes. Movement is not profit. No position, fill or settlement payout is inferred; fees and depth affect execution. Original rules and quotes remain unchanged.'};
 }
 if(a.type!=='stock')return {id,state:'News briefing; no stock outcome registered'};
 if(!a.measurement)return {id,state:'Legacy finding; no prospective result registered'};
 const key='poor/research/investigation-outcomes-v1/'+id,saved=await readResearch(env,key);if(saved)return saved;
 const quote=async s=>{const q=await readResearch(env,'pif/v1/prices-v4/'+s);return q?{...q,stale:!!q.error||!q.checkedAt||Date.now()-q.checkedAt>36*RHOUR}:null};
 const [stock,benchmark]=await Promise.all([quote(a.target),quote('SPY')]);
 const result={...evaluateResearchOutcome(a,stock,benchmark),originalVerdict:a.verdict,method:'First close after publication UTC date → 20 S&P 500 proxy sessions. 10 bps per side; stress 25 bps per side. Same-date SPY price returns, excluding dividends and taxes. Hypothetical long-stock observation, not a filled trade; textual entry triggers and intraday stops are not simulated. Every originally supported, evidence-backed finding stays included, even if later rejected.'};
 if(result.state==='Completed')await env.BUCKET.put(key,JSON.stringify(result));return result;
}

async function investigationScorecard(env){
 const items=(await readResearch(env,'poor/research/activity-index'))?.items||[],findings=items.filter(a=>a.phase==='finding'&&a.type==='stock'&&a.measurement?.direction==='long');
 const rows=[];for(const a of findings)rows.push(await investigationResult(env,a.id));
 return {rows,summary:summarizeResearchOutcomes(rows),registered:findings.length,method:'Recent activity window only (up to 150 findings and reviews). Every originally supported stock case in this window is counted, including later rejections. Full permanent history is available in the archive. Observations can overlap and are not independent trades or portfolio returns. Edge not established.'};
}

const ANALYST_BANKS=['Morgan Stanley','Goldman Sachs','JPMorgan','Bank of America','Citi','UBS','Barclays','Deutsche Bank','Wells Fargo','Jefferies','RBC Capital Markets','Bernstein'];
export function analystTargetValid(x,now=Date.now()){
 const source=u=>{try{const p=new URL(u);return p.protocol==='https:'&&!p.username&&!p.password&&!['x.com','twitter.com'].includes(p.hostname)&&u.length<1500}catch{return false}};
 return x&&ANALYST_BANKS.includes(x.institution)&&/^[A-Z][A-Z0-9.-]{0,11}$/.test(x.ticker||'')&&x.currency==='USD'&&day(x.published)&&Date.parse(x.published)<=now&&now-Date.parse(x.published)<8*86400000&&[x.oldTarget,x.newTarget].every(n=>Number.isFinite(n)&&n>0&&n<100000)&&x.oldTarget!==x.newTarget&&['analyst','rating','horizon','reason'].every(k=>typeof x[k]==='string'&&x[k].length<=500)&&Array.isArray(x.sources)&&x.sources.length>0&&x.sources.length<=6&&x.sources.every(source);
}
async function ingestAnalystTargets(b,env){
 if(!Array.isArray(b.items)||b.items.length>12||b.items.some(x=>!analystTargetValid(x)))return {status:400,body:{error:'Invalid analyst target revision'}};
 const ledger=await readResearch(env,'poor/analyst-targets/ledger')||{items:[]};let added=0,conflicts=0;
 for(const x of b.items){
  const id=await researchId([x.institution,x.analyst.toLowerCase(),x.ticker,x.published,x.newTarget,x.currency].join('|'));
  const old=ledger.items.find(r=>r.id===id);
  if(old){if(old.oldTarget!==x.oldTarget)conflicts++;continue;}
  if(ledger.items.length>=2000)return {status:409,body:{error:'Target ledger full; archive required before accepting more'}};
  const cached=await readResearch(env,'pif/v1/prices-v4/'+x.ticker),p=cached?.value;
  const anchor=p?.currency===x.currency&&p.latest>0?{date:p.asOf,price:p.latest}:null;
  const item=Object.fromEntries(['ticker','institution','analyst','published','currency','oldTarget','newTarget','rating','horizon','reason','sources'].map(k=>[k,x[k]]));
  ledger.items.push({...item,id,observedAt:new Date().toISOString(),anchor});added++;
 }
 ledger.checkedAt=new Date().toISOString();ledger.status=String(b.status||'Checked').slice(0,200);ledger.coveredSymbols=(b.coveredSymbols||[]).filter(s=>/^[A-Z][A-Z0-9.-]{0,11}$/.test(s)).slice(0,30);
 await env.BUCKET.put('poor/analyst-targets/ledger',JSON.stringify(ledger));return {status:200,body:{ok:true,added,conflicts}};
}
export function analystTargetResult(r,p,spy,now=Date.now()){
 const base={revisionPct:(r.newTarget/r.oldTarget-1)*100};
 if(!p||p.currency!==r.currency||!p.closes)return {...base,state:'Price history unavailable'};
 if(r.anchor&&(!(p.closes[r.anchor.date]>0)||Math.abs(p.closes[r.anchor.date]/r.anchor.price-1)>.01))return {...base,state:'Price basis changed; split/correction review needed'};
 const fresh=p.latest>0&&day(p.asOf)&&Date.parse(p.asOf)<=now&&now-Date.parse(p.asOf)<5*86400000;
 const observed=r.observedAt.slice(0,10),dates=Object.keys(p.closes).filter(d=>d>observed&&d<=p.asOf&&p.closes[d]>0).sort();
 const current=fresh?{latest:p.latest,priceDate:p.asOf,impliedUpside:(r.newTarget/p.latest-1)*100}:{};
 if(!dates.length)return {...base,...current,state:'Awaiting first close after observation'};
 const entry=dates[0],end=dates[Math.min(20,dates.length-1)],entryPrice=p.closes[entry],returnPct=(p.closes[end]/entryPrice-1)*100,direction=Math.sign(r.newTarget-entryPrice);
 const complete=dates.length>=21,window=dates.slice(0,21),excess=spy?.currency===p.currency&&spy?.closes?.[entry]>0&&spy?.closes?.[end]>0?returnPct-(spy.closes[end]/spy.closes[entry]-1)*100:null;
 return {...base,...current,state:complete?'20 sessions complete':'Tracking',entry,end,entryPrice,sessions:Math.min(20,dates.length-1),returnPct,excess,complete,direction,directionalReturn:direction?direction*returnPct:null,targetTouched:direction!==0&&window.some(d=>direction>0?p.closes[d]>=r.newTarget:p.closes[d]<=r.newTarget)};
}
export function analystTrackRecords(items){
 const groups=new Map();
 for(const row of items){for(const [kind,name] of [['institution',row.institution],...(row.analyst&&row.analyst!=='Unknown'?[['analyst',row.institution+' · '+row.analyst]]:[])]){const key=kind+name;if(!groups.has(key))groups.set(key,{kind,name,observed:0,completed:0,wins:0,totalReturn:0,totalExcess:0,excessCount:0,touched:0});const g=groups.get(key);g.observed++;const r=row.performance;if(r?.complete&&r.direction!==0){g.completed++;g.wins+=r.directionalReturn>0?1:0;g.totalReturn+=r.returnPct;if(r.excess!==null){g.totalExcess+=r.excess;g.excessCount++;}g.touched+=r.targetTouched?1:0;}}}
 return [...groups.values()].map(g=>({...g,winRate:g.completed?g.wins/g.completed*100:null,meanReturn:g.completed?g.totalReturn/g.completed:null,meanExcess:g.excessCount?g.totalExcess/g.excessCount:null,label:g.completed>=10?'Descriptive sample':'Building track record'}));
}
async function analystTargetsArchive(env){
 const ledger=await readResearch(env,'poor/analyst-targets/ledger')||{items:[]},symbols=[...new Set(ledger.items.map(r=>r.ticker).concat('SPY'))],prices={};
 await Promise.all(symbols.map(async s=>{prices[s]=(await readResearch(env,'pif/v1/prices-v4/'+s))?.value}));
 const items=ledger.items.map(r=>({...r,performance:analystTargetResult(r,prices[r.ticker],prices.SPY)})).sort((a,b)=>b.observedAt.localeCompare(a.observedAt));
 return {...ledger,items,trackRecords:analystTrackRecords(items),method:'Prospective: entry is first daily close strictly after poor first recorded the revision. Fixed 20 subsequent trading sessions; long-stock price return and matched SPY excess exclude dividends and costs. Directional win follows whether the target was above or below entry. Target touch uses closing prices only, within this same window; not an evaluation of the full stated target horizon. Revisions remain separate, potentially correlated observations. Split/correction basis changes suspend comparison.'};
}
