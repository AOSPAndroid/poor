import assert from 'node:assert/strict';
import {investigationLedger,investigationResult,coverageReport,captureContract,researchIngest} from './server/research.mjs';
const storage=new Map(),env={RESEARCH_INGEST_TOKEN:'test',BUCKET:{get:async k=>storage.has(k)?{json:async()=>JSON.parse(storage.get(k))}:null,put:async(k,v)=>storage.set(k,v),list:async({prefix,cursor,limit})=>{const keys=[...storage.keys()].filter(k=>k.startsWith(prefix)).sort(),offset=Number(cursor||0);return {objects:keys.slice(offset,offset+limit).map(key=>({key})),truncated:keys.length>offset+limit,cursor:String(offset+limit)}}}};
const put=(k,v)=>storage.set(k,JSON.stringify(v)),id='a'.repeat(24),base={id,type:'stock',target:'XYZ',phase:'finding',verdict:'supported',title:'Test',whyNow:'New evidence',entry:'Condition',risk:'Risk',nextCheck:'Check',reason:'Evidence',sources:['https://www.sec.gov/'],fingerprint:'b'.repeat(64),decisiveEvidenceRetrieved:true};
const send=x=>researchIngest(new Request('https://test/api/research/ingest',{method:'POST',headers:{Authorization:'Bearer test','Content-Type':'application/json'},body:JSON.stringify({kind:'investigation',item:x})}),env);
assert.equal((await send(base)).status,200);const saved=JSON.parse(storage.get('poor/research/investigations/'+id+'/finding'));assert.equal(saved.measurement.registeredAt,saved.publishedAt);assert.equal(saved.measurement.direction,'long');
await send({...base,title:'Rewrite'});assert.equal(JSON.parse(storage.get('poor/research/investigations/'+id+'/finding')).title,'Test');
assert.match((await investigationResult(env,id)).state,/history needed/);
const days=[];for(let t=Date.parse('2026-01-02');days.length<22;t+=86400000){const d=new Date(t);if(d.getUTCDay()%6)days.push(d.toISOString().slice(0,10))}
saved.publishedAt='2026-01-01T12:00:00Z';saved.measurement.registeredAt=saved.publishedAt;put('poor/research/investigations/'+id+'/finding',saved);
for(const symbol of ['XYZ','SPY'])put('pif/v1/prices-v4/'+symbol,{checkedAt:Date.now(),value:{currency:'USD',instrument:'EQUITY',asOf:days.at(-1),closes:Object.fromEntries(days.map((d,i)=>[d,symbol==='SPY'?100:100-i]))}});
const result=await investigationResult(env,id);assert.equal(result.state,'Completed');assert(result.netReturn<0);assert(result.excess<0);assert(result.costStressReturn<result.netReturn);
storage.delete('pif/v1/prices-v4/XYZ');assert.deepEqual(await investigationResult(env,id),result,'Completed loss must remain frozen');
for(let n=1;n<60;n++)put('poor/research/investigations/'+n.toString(16).padStart(24,'0')+'/finding',{...saved,id:n.toString(16).padStart(24,'0'),verdict:'unverified'});
const one=await investigationLedger(env);assert.equal(one.items.length,50);assert(one.cursor);const two=await investigationLedger(env,one.cursor);assert.equal(two.items.length,10);assert.equal(two.cursor,null);
const coverage=await coverageReport(env);assert(coverage.partial);assert(coverage.stale);assert.equal(coverage.rows,0);
const fetcher=async url=>new Response(JSON.stringify(String(url).includes('/markets/')?{id:'42',description:'Rules',outcomes:['Yes','No'],outcomePrices:['.4','.6'],clobTokenIds:['123','456']}:{asset_id:String(url).endsWith('123')?'123':'456',timestamp:String(Date.now()),bids:[{price:'.38',size:'10'}],asks:[{price:'.42',size:'20'}]}));
const q=await captureContract('42','Rules',fetcher);assert.equal(q.state,'Observed');assert.equal(q.outcomes[0].bid,.38);assert(Math.abs(q.outcomes[0].spread-.04)<1e-8);assert.equal((await captureContract('42','Changed',fetcher)).state,'Rules changed or unavailable');
console.log('Accountability: immutable findings and losses, cost stress, archive pagination, missing coverage and real-quote schema passed.');

