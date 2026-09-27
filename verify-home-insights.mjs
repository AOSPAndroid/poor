import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const ctx=vm.createContext({URL,console,read:()=>null,validDate:d=>/^\d{4}-\d{2}-\d{2}$/.test(d),disclosedDate:r=>r.filed,tickerValid:s=>/^[A-Z]+$/.test(s),politicianRating:()=>({score:null,stale:false})});
vm.runInContext(fs.readFileSync('dist/home-insights.js','utf8'),ctx);
const now=Date.parse('2026-09-27T12:00:00Z'),row={person:'Test Person',ticker:'TEST',type:'Purchase',asset:'Stock',owner:'Self',traded:'2026-07-01',filed:'2026-08-01',source:'https://house.gov/filing'},article={format:2,id:'a',tickers:['TEST'],publishedAt:'2026-09-26T12:00:00Z',sources:['https://house.gov/filing','https://sec.gov/new'],evidence:[{kind:'political',date:'2026-08-01',url:'https://house.gov/filing'},{kind:'company',date:'2026-09-25',url:'https://sec.gov/new'}],watch:'Confirm contract',invalidation:'Contract cancelled'},price={latest:100,volume:50000,currency:'USD',asOf:'2026-09-25',closes:Object.fromEntries(Array.from({length:25},(_,i)=>['2026-09-'+String(i+1).padStart(2,'0'),100]))};
function candidates(rows=[row],articles=[article],p=price){ctx.args={rows,articles,prices:{TEST:p},now};return vm.runInContext('homeCandidates(args.rows,args.articles,args.prices,args.now)',ctx)}
assert.equal(candidates()[0].qualified,true,'Old disclosed buy plus new catalyst can qualify');assert.equal(candidates()[0].newClock,true);
assert.equal(candidates([row,{...row}])[0].buys.length,1,'Duplicate trades do not inflate counts');
assert.equal(candidates([{...row,quality:'User-provided'}]).length,0);
assert.equal(candidates([{...row,filed:'2026-10-01'}]).length,0);
assert.equal(candidates([row,{...row,type:'Sale',traded:'2026-08-05',filed:'2026-08-06'}])[0].qualified,false);
assert.equal(candidates([row],[{...article,reviews:[{verdict:'invalidated'}]}])[0].qualified,false);
assert.equal(candidates([row],[{...article,evidence:article.evidence.map(e=>({...e,date:'2026-09-01'}))}])[0].qualified,false);
assert.equal(candidates([row],[article],{...price,stale:true})[0].qualified,false);
assert.equal(candidates([row],[article],{...price,volume:0})[0].qualified,false);
assert.equal(candidates([row],[])[0].qualified,false);
ctx.current={trades:['new','new'],buyers:[],catalysts:[],reviews:['invalidated']};ctx.baseline={trades:[],buyers:[],catalysts:[],reviews:[]};assert.equal(vm.runInContext('homeChangeCounts(current,baseline).trades',ctx),1);assert.equal(vm.runInContext('homeChangeCounts(current,null)',ctx),null);
console.log('Passed: fresh-catalyst qualification, old buys, deduplication, imports/future dates, later sales, invalidations, stale prices, liquidity and visit changes.');
