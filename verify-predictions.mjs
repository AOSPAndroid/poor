import assert from 'node:assert/strict';
import {normalizePrediction,predictionFill,predictionScore,predictionConnections,predictionsRoute} from './server/predictions.mjs';
const raw={id:'42',question:'Will the federal tariff bill pass?',slug:'tariff-bill',description:'Resolves Yes if enacted by the deadline.',outcomes:'["Yes","No"]',outcomePrices:'["0.4","0.6"]',clobTokenIds:'["123","456"]',active:true,closed:false,acceptingOrders:true,enableOrderBook:true,endDate:'2099-01-01',umaResolutionStatus:'proposed'};
const market=normalizePrediction(raw);assert.equal(market.outcomes[1].token,'456');assert.equal(normalizePrediction({...raw,outcomes:'["A","B","C"]'}),null);
const fill=predictionFill([{price:'.5',size:'200'},{price:'.4',size:'50'}],100);assert.equal(fill.cash,100);assert.equal(fill.shares,210);assert.equal(fill.complete,true);assert.equal(predictionFill([{price:'.5',size:'1'}],100).complete,false);
const sell=predictionFill([{price:'.3',size:100},{price:'.6',size:100}],150,'sell');assert.equal(sell.cash,75);
const forecast={outcome:'Yes',probability:.7,shares:200,fee:.02};assert.equal(predictionScore(forecast,{...market,closed:true,resolved:false,outcomes:[{label:'Yes',price:1}]}).pnl,null);
const settled=predictionScore(forecast,{...market,resolved:true,outcomes:[{label:'Yes',price:0}]});assert.equal(settled.pnl,-100);assert(Math.abs(settled.brier-.49)<1e-9);
assert.equal(predictionScore(forecast,market,{bids:[{price:'.5',size:200}]}).pnl,-2);
assert.equal(predictionConnections([market],[{title:'The federal tariff vote',summary:'New negotiations',sources:[],date:'2026-09-28'}])[0].connections.length,1);
const memory=new Map(),env={BUCKET:{get:async k=>memory.has(k)?{etag:'v',json:async()=>JSON.parse(memory.get(k))}:null,put:async(k,v)=>{memory.set(k,v);return {etag:'v'}}}},original=globalThis.fetch;
const cached=async(_e,_k,_ttl,fn)=>({value:await fn(),checkedAt:Date.now(),stale:false});
globalThis.fetch=async url=>new Response(JSON.stringify(String(url).includes('/book?')?{asset_id:String(url).endsWith('123')?'123':'456',timestamp:String(Date.now()),asks:[{price:'.4',size:'1000'}],bids:[{price:'.39',size:'1000'}]}:raw),{status:200});
const request=(body,user='u',origin='https://poor.test')=>new Request('https://poor.test/api/predictions/journal',{method:body?'POST':'GET',headers:{...(user?{'oai-authenticated-user-id':user,'oai-authenticated-user-email':'test@example.com'}:{}),Origin:origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
const data={marketId:'42',outcome:'Yes',probability:.6,fee:.02,maxPrice:.4,thesis:'A sourced change in the legislative vote count.',invalidation:'The bill loses its majority.',sources:['https://www.congress.gov/bill/test'],entry:.001,createdAt:'2000-01-01'};
try{
 assert.equal((await predictionsRoute(request(null,null),env,cached)).status,401);
 assert.equal((await predictionsRoute(request(data,'u','https://other.test'),env,cached)).status,403);
 assert.equal((await predictionsRoute(request({...data,maxPrice:.3}),env,cached)).status,409);
 assert.equal((await predictionsRoute(request({...data,sources:['javascript:alert(1)']}),env,cached)).status,400);
 const saved=await predictionsRoute(request(data),env,cached);assert.equal(saved.status,201);assert.equal(saved.body.row.entry,.4);assert.equal(saved.body.row.cost,100);assert.notEqual(saved.body.row.createdAt,data.createdAt);assert(Math.abs(saved.body.row.shares-100/1.02/.4)<1e-8);
 assert.equal((await predictionsRoute(request(data),env,cached)).status,409);
 assert.equal((await predictionsRoute(request(null,'another-user'),env,cached)).body.rows.length,0);
 globalThis.fetch=async url=>new Response(JSON.stringify(String(url).includes('/book?')?{asset_id:'123',timestamp:'1',asks:[],bids:[]}:raw));
 assert.equal((await predictionsRoute(request(data,'new-user'),env,cached)).status,503);
}finally{globalThis.fetch=original}
console.log('Passed: depth-aware fills, estimated costs, losses, confirmed resolution, calibration, authentication, account isolation, immutable timestamps, duplicate and stale-entry rejection.');
