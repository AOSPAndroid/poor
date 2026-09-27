import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import worker,{cached,congressRows,executiveRows,chartPrices} from './server/worker.mjs';
class Bucket{
 constructor(){this.values=new Map();this.version=0}
 async get(key){const v=this.values.get(key);return v?{etag:v.etag,json:async()=>JSON.parse(v.text)}:null}
 async put(key,text,options={}){const old=this.values.get(key),cond=options.onlyIf;if(cond?.etagMatches&&old?.etag!==cond.etagMatches||cond?.etagDoesNotMatch==='*'&&old)return null;const etag=String(++this.version);this.values.set(key,{text,etag});return {etag}}
}
const env={BUCKET:new Bucket()};let calls=0;const now=Date.now();
await cached(env,'test',1000,async()=>{calls++;return {ok:true}},now);
await cached(env,'test',1000,async()=>{calls++;return {}},now+500);assert.equal(calls,1);
const failed=await cached(env,'test',1000,async()=>{throw Error('Provider down')},now+2000);assert.equal(failed.value.ok,true);assert.equal(failed.stale,true);assert.match(failed.error,/Provider down/);
await cached(env,'test',1000,async()=>{calls++;return {}},now+2500);assert.equal(calls,1);
const results=await Promise.all([cached(env,'concurrent',1000,async()=>{calls++;await new Promise(r=>setTimeout(r,10));return 'one'}),cached(env,'concurrent',1000,async()=>{calls++;return 'two'})]);assert.equal(results[0].value,results[1].value);assert.equal(calls,2);
const sample={member:'Nancy Pelosi',chamber:'House',trade_type:'buy',amount:'$1,001 - $15,000',tx_date:'2026-07-01',disclosed:'2026-07-15',asset:'Test Common Stock',ticker:'TEST',link:'https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/123.pdf'};
const c=congressRows({trades:[sample,{...sample,link:'javascript:alert(1)'},{...sample,tx_date:'2099-01-01'}],last_updated:new Date().toISOString()});assert.equal(c.rows.length,1);assert.equal(c.rows[0].owner,'Not specified');assert.equal(c.rows[0].asset,'Stock');
const close=chartPrices({chart:{result:[{meta:{symbol:'TEST',currency:'USD',currentTradingPeriod:{regular:{end:Date.parse('2026-07-02T20:00:00Z')/1000}}},timestamp:[Date.parse('2026-07-01T13:30:00Z')/1000,Date.parse('2026-07-02T13:30:00Z')/1000],indicators:{quote:[{close:[100,110]}]}}]}},'TEST',Date.parse('2026-07-02T15:00:00Z'));assert.equal(close.latest,100);assert.equal(close.asOf,'2026-07-01');
assert.equal((await worker.fetch(new Request('http://local/api/prices?symbols=https://bad.example'),env)).status,400);
assert.equal((await worker.fetch(new Request('http://local/api/prices?symbols=BE',{method:'POST'}),env)).status,405);
if(process.argv.includes('--network')){
 for(const path of ['/api/feed/congress','/api/feed/executive','/api/prices?symbols=BE,INTC']){
  const response=await worker.fetch(new Request('http://local'+path),env);const result=await response.json();assert.equal(response.status,200);
  if(path.includes('prices')){assert.ok(result.BE.value?.latest>0);assert.ok(result.INTC.value?.latest>0);console.log('Live prices:',result.BE.value.asOf,result.INTC.value.asOf)}else{assert.ok(result.value?.rows.length>0,result.error);console.log(path,result.value.rows.length,'rows;',result.value.sourceUpdatedAt)}
 }
}
console.log('Passed: cache reuse, durable fallback, retry cooldown, concurrent refresh, row validation, daily close selection, API input and method restrictions.');

const senators=congressRows({trades:['Ron L Wyden','Susan Collins','Dan Sullivan','Rick Scott','Austin Scott','Scott Franklin'].map(member=>({...sample,member,chamber:'Senate',link:'https://efdsearch.senate.gov/search/view/ptr/test/'}))}).rows;
assert.deepEqual(senators.map(r=>r.person),['Ron Wyden','Susan Collins','Dan Sullivan','Rick Scott','Austin Scott','Scott Franklin']);assert.equal(senators[0].state,'OR');assert.equal(senators[3].state,'FL');
console.log('Passed: senator aliases and no Rick Scott surname collisions.');
