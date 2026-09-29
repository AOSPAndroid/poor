import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const now=Date.parse('2026-09-29T10:00:00Z');
const row={id:'a',person:'Strong',ticker:'AAA',chamber:'House',asset:'Stock',quality:'Official filing',type:'Purchase',traded:'2026-08-01',filed:'2026-09-01'};
const prices={AAA:{latest:80,closes:{'2026-08-01':100},currency:'USD',asOf:'2026-09-28'}};
const ctx=vm.createContext({Date,disclosedDate:r=>r.filed,politicianRating:p=>({score:p==='Strong'?70:null}),rows:[row],prices,now});
const s=fs.readFileSync('dist/home.js','utf8');vm.runInContext(s.slice(s.indexOf('function homeTrackPriority'),s.indexOf('function renderBelowPurchases')),ctx);
const run=rows=>{ctx.rows=rows;return vm.runInContext('belowPurchaseRows(rows,now,prices,s=>prices[s])',ctx)};
assert(Math.abs(run([row])[0].gap+20)<1e-8);
assert.equal(run([{...row,person:'Other'},row])[0].r.person,'Strong');
assert.equal(run([row,{...row,type:'Sale',traded:'2026-09-15',filed:'2026-09-20'}]).length,0);
for(const delta of [{asset:'Call options'},{chamber:'Executive'},{quality:'User-provided'},{filed:'2026-10-01'}])assert.equal(run([{...row,...delta}]).length,0);
prices.AAA.stale=true;assert.equal(run([row]).length,0);prices.AAA.stale=false;
prices.AAA.asOf='2026-09-01';assert.equal(run([row]).length,0);prices.AAA.asOf='2026-09-28';
prices.AAA.latest=110;assert.equal(run([row]).length,0);
console.log('Passed below-purchase price math, ranking, later sales, instruments, public dates and stale-price exclusions.');

