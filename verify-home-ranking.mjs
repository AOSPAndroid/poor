import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const today=new Date().toISOString().slice(0,10),older=new Date(Date.now()-30*86400000).toISOString().slice(0,10);
const ratings={Strong:{score:70},Positive:{score:58},Unknown:{score:null},Stale:{score:90,stale:true},Weak:{score:35}};
const ctx=vm.createContext({Date,politicianRating:p=>ratings[p],disclosedDate:r=>r.filed});
const source=fs.readFileSync('dist/home.js','utf8');vm.runInContext(source.slice(source.indexOf('function homeTrackPriority'),source.indexOf('function miniChart')),ctx);
ctx.rows=['Unknown','Unknown','Unknown','Positive','Strong','Strong','Strong','Stale','Weak'].map((person,i)=>({person,ticker:'T'+i,type:'Purchase',quality:'Official filing',filed:person==='Strong'?older:today,traded:older,asset:'Stock'}));
const result=vm.runInContext('latestPurchases(rows)',ctx);
assert.equal(result[0].person,'Strong');assert.equal(result[1].person,'Strong');assert.equal(result[2].person,'Positive');assert.equal(result.filter(r=>r.person==='Unknown').length,2);assert.equal(vm.runInContext("homeTrackPriority('Stale')",ctx),0);assert.equal(vm.runInContext("homeTrackPriority('Weak')",ctx),0);
ctx.rows.push({...ctx.rows[4],filed:'2020-01-01',ticker:'OLD'});assert(!vm.runInContext('latestPurchases(rows)',ctx).some(r=>r.ticker==='OLD'));
console.log('Passed: measured track record before recency, two-per-person cap, stale/weak/unrated no boost, and 90-day disclosure window.');

ctx.rows.push({...ctx.rows[4],type:'Sale',ticker:'SOLD',filed:today});
const moves=vm.runInContext('strongInvestorMoves(rows)',ctx);assert(moves.some(r=>r.type==='Sale'));assert(moves.every(r=>['Strong','Positive'].includes(r.person)));assert(moves.filter(r=>r.person==='Strong').length<=2);
console.log('Passed: rated purchases and sales, unassessed exclusion and per-person limit.');
