import assert from 'node:assert/strict';
import {personalValidate,personalPositions,personalValuation,personalHistory} from './server/holdings.mjs';
import worker from './server/worker.mjs';
const t=(id,type,quantity,price,fees=0,date='2026-01-02',currency='USD')=>({id,type,quantity,price,fees,date,currency,symbol:'TEST',notes:'',order:Number(id)});
const tx=[t('1','buy',10,100,10),t('2','buy',10,200,0,'2026-01-03'),t('3','sell',5,180,5,'2026-01-04'),t('4','dividend',0,50,1,'2026-01-05')];
const q={TEST:{latest:220,currency:'USD',asOf:'2026-01-06',closes:{'2026-01-02':110,'2026-01-03':200,'2026-01-04':180,'2026-01-05':200,'2026-01-06':220}}};
const v=personalValuation(tx,q,'USD');assert.equal(v.rows[0].quantity,15);assert.equal(v.rows[0].average,150.5);assert.equal(v.realized,142.5);assert.equal(v.unrealized,1042.5);assert.equal(v.dividends,49);assert.equal(v.total,1234);assert.equal(personalHistory(tx,q,'USD').at(-1).value,1234);assert.equal(personalValuation(tx,{},'USD').value,null);assert.equal(personalValuation(tx,{TEST:{...q.TEST,currency:'EUR'}},'USD').value,null);assert.equal(personalValuation(tx,q,'EUR').cost,0);assert.throws(()=>personalPositions([t('1','sell',1,100)]));assert.throws(()=>personalValidate(t('1','buy',1,100,0,'2026-02-30')));assert.throws(()=>personalValidate(t('1','buy',-1,100)));assert.throws(()=>personalValidate({...tx[0],notes:'x'.repeat(501)}));
class Bucket{constructor(){this.data=new Map();this.n=0}async get(k){const v=this.data.get(k);return v?{etag:v.etag,json:async()=>JSON.parse(v.text)}:null}async put(k,text,o={}){const v=this.data.get(k);if(o.onlyIf?.etagMatches&&v?.etag!==o.onlyIf.etagMatches||o.onlyIf?.etagDoesNotMatch==='*'&&v)return null;const etag=String(++this.n);this.data.set(k,{text,etag});return {etag}}}
const env={BUCKET:new Bucket()},url='https://poor.test/api/workspace',identity={'oai-authenticated-user-id':'portfolio-test-a','oai-authenticated-user-email':'a@example.test'};
const post=async(action,headers=identity)=>worker.fetch(new Request(url,{method:'POST',headers:{...headers,origin:'https://poor.test','content-type':'application/json'},body:JSON.stringify(action)}),env);
let r=await post({kind:'portfolioSave',revision:0,transaction:tx[0]});assert.equal(r.status,200);let saved=await r.json();assert.equal(saved.portfolioTransactions.length,1);assert.equal(saved.portfolioRevision,1);
assert.equal((await post({kind:'portfolioSave',revision:0,transaction:tx[1]})).status,409);
r=await post({kind:'portfolioSave',revision:1,transaction:{...tx[0],quantity:12}});saved=await r.json();assert.equal(saved.portfolioTransactions.length,1);assert.equal(saved.portfolioTransactions[0].quantity,12);
const other=await (await worker.fetch(new Request(url,{headers:{'oai-authenticated-user-id':'portfolio-test-b','oai-authenticated-user-email':'b@example.test'}}),env)).json();assert.equal(other.portfolioTransactions,undefined);
const reload=await (await worker.fetch(new Request(url,{headers:identity}),env)).json();assert.equal(reload.portfolioTransactions[0].quantity,12);
assert.equal((await post({kind:'portfolioSave',revision:2,transaction:t('5','sell',99,100)})).status,400);
const removed=await (await post({kind:'portfolioDelete',revision:2,id:'1'})).json();assert.equal(removed.portfolioTransactions.length,0);
assert.equal((await worker.fetch(new Request(url,{method:'POST',headers:{...identity,origin:'https://evil.test','content-type':'application/json'},body:JSON.stringify({kind:'portfolioDelete',revision:3,id:'1'})}),env)).status,403);
console.log('Passed: weighted cost, fees, partial sales, dividends, P/L history, missing/FX quotes, validation, overselling, durable account isolation, edit/delete, revision conflicts and CSRF.');
