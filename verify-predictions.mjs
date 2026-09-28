import assert from 'node:assert/strict';
import {normalizePrediction,predictionsRoute,validPredictionInsight} from './server/predictions.mjs';
const raw={id:'42',question:'Will the federal tariff bill pass?',slug:'tariff-bill',description:'Resolves Yes if enacted.',outcomes:'["Yes","No"]',outcomePrices:'["0.4","0.6"]',clobTokenIds:'["123","456"]',active:true,closed:false,acceptingOrders:true,enableOrderBook:true,endDate:'2099-01-01'};
assert.equal(normalizePrediction({...raw,outcomes:'{}'}),null);
assert.equal(normalizePrediction({...raw,outcomes:'["yes","no"]'}).outcomes[0].label,'Yes');
assert.equal(normalizePrediction({...raw,outcomePrices:'[null,"bad"]'}).outcomes[0].price,null);
const memory=new Map(),env={RESEARCH_INGEST_TOKEN:'test-only',BUCKET:{get:async k=>memory.has(k)?{json:async()=>JSON.parse(memory.get(k))}:null,put:async(k,v)=>memory.set(k,v)}},original=globalThis.fetch;
const cached=async(_e,_k,_ttl,fn)=>({value:await fn(),checkedAt:Date.now(),stale:false});
let book={asset_id:'123',timestamp:Date.now(),asks:[{price:'.5',size:'20'},{price:'.4',size:'10'},{price:'.1',size:'bad'}],bids:[{price:'.3',size:'30'}]};
globalThis.fetch=async url=>new Response(JSON.stringify(String(url).includes('/book?')?book:String(url).includes('/tags/')?{id:'2'}:String(url).includes('/events?')?[{markets:[raw]}]:raw));
const req=path=>new Request('https://poor.test/api/predictions'+path);
const insight={marketId:'42',rules:raw.description,thesis:'A conditional sourced connection.',against:'The vote could still fail.',pricedIn:'The current price may reflect this.',watch:'Check the published vote schedule.',sources:['https://polymarket.com/event/tariff-bill','https://www.congress.gov/bill/test']};
try{
 for(const path of ['/journal','/score'])assert.equal((await predictionsRoute(req(path),env,cached)).status,410);
 let q=await predictionsRoute(req('/quote?id=42&outcome=Yes'),env,cached);assert.equal(q.body.ask,.4);assert.equal(q.body.book.asks.length,2);assert.equal(q.body.book.asks[0].price,.4);
 book.timestamp=Date.now()-121000;await assert.rejects(()=>predictionsRoute(req('/quote?id=42&outcome=Yes'),env,cached),/stale/);
 assert(validPredictionInsight(insight));assert(!validPredictionInsight({...insight,sources:['http://evil.test','https://x.com/test']}));
 const post=auth=>new Request('https://poor.test/api/predictions/insights',{method:'POST',headers:{Authorization:auth,'Content-Type':'application/json'},body:JSON.stringify({items:[insight],status:'complete'})});
 assert.equal((await predictionsRoute(post('bad'),env,cached)).status,401);
 assert.equal((await predictionsRoute(post('Bearer test-only'),env,cached)).body.published,1);
 assert.equal((await predictionsRoute(req(''),env,cached)).body.value.markets[0].insight.thesis,insight.thesis);
 raw.description='Changed rules';assert.equal((await predictionsRoute(req(''),env,cached)).body.value.markets[0].insight,null);
 console.log('Prediction checks passed: real books, stale rejection, retired routes, authenticated assessments and changed-rule exclusion.');
}finally{globalThis.fetch=original}
