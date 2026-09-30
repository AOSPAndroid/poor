import assert from 'node:assert/strict';import {webcrypto} from 'node:crypto';
import {analystTargetValid,analystTargetResult,analystTrackRecords,researchIngest} from './server/research.mjs';
globalThis.crypto??=webcrypto;
const now=Date.parse('2026-09-30T16:00:00Z'),r={ticker:'NVDA',institution:'Morgan Stanley',analyst:'Example',published:'2026-09-29',currency:'USD',oldTarget:100,newTarget:120,rating:'Overweight',horizon:'Unknown',reason:'Test',sources:['https://example.com/report'],observedAt:'2026-08-01T12:00:00Z',anchor:{date:'2026-07-31',price:100}};
assert(analystTargetValid(r,now));assert(!analystTargetValid({...r,oldTarget:null},now));assert(!analystTargetValid({...r,sources:['https://x.com/lead']},now));
const closes={'2026-07-31':100},bench={};for(let i=0;i<=20;i++){const d='2026-08-'+String(i+2).padStart(2,'0');closes[d]=100+i;bench[d]=100+i/2;}
const p={currency:'USD',asOf:'2026-09-29',latest:120,closes},spy={currency:'USD',closes:bench};let v=analystTargetResult(r,p,spy,now);
assert.equal(v.entry,'2026-08-02');assert.equal(v.sessions,20);assert(v.complete);assert(Math.abs(v.returnPct-20)<1e-9);assert(Math.abs(v.excess-10)<1e-9);assert(v.targetTouched);assert.equal(v.impliedUpside,0);
assert(analystTargetResult({...r,observedAt:'2026-09-30T12:00:00Z'},p,spy,now).state.includes('Awaiting'));
assert(analystTargetResult(r,{...p,closes:{...closes,'2026-07-31':50}},spy,now).state.includes('basis changed'));
assert.equal(analystTargetResult(r,p,null,now).excess,null);
const down=analystTargetResult({...r,newTarget:80},p,spy,now);assert(down.directionalReturn<0);assert(!down.targetTouched);
const groups=analystTrackRecords([{...r,performance:v},{...r,performance:{state:'Tracking'}}]);assert.equal(groups[0].completed,1);assert.equal(groups[0].observed,2);assert.equal(groups[0].label,'Building track record');
const store=new Map(),env={RESEARCH_INGEST_TOKEN:'test-only',BUCKET:{get:async k=>store.has(k)?{json:async()=>JSON.parse(store.get(k))}:null,put:async(k,v)=>store.set(k,v)}};
const send=items=>researchIngest(new Request('https://example.com/api/research/ingest',{method:'POST',headers:{Authorization:'Bearer test-only','Content-Type':'application/json'},body:JSON.stringify({kind:'analyst-targets',items})}),env);
const live={...r,published:new Date().toISOString().slice(0,10)};
assert.equal((await send([live])).body.added,1);const first=JSON.parse(store.get('poor/analyst-targets/ledger')).items[0];assert.equal((await send([live])).body.added,0);assert.equal(JSON.parse(store.get('poor/analyst-targets/ledger')).items[0].observedAt,first.observedAt);
assert.equal((await send([{...live,oldTarget:90}])).body.conflicts,1);assert.equal(JSON.parse(store.get('poor/analyst-targets/ledger')).items[0].oldTarget,100);
console.log('Passed validation, prospective entry, fixed horizon, benchmark matching, target touch, price basis guards, pending samples and immutable deduplication.');
