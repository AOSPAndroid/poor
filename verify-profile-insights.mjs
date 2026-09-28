import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';import {politicianFilingEvents} from './server/worker.mjs';
const context=vm.createContext({Date,Set,Map,Number,disclosedDate:r=>r.filed,disclosureDelay:r=>(Date.parse(r.filed)-Date.parse(r.traded))/86400000,medianTrack:a=>a.sort((x,y)=>x-y)[Math.floor(a.length/2)]});
vm.runInContext(fs.readFileSync('dist/profile-insights.js','utf8'),context);
const days=[];for(let t=Date.parse('2026-01-02');days.length<65;t+=86400000){const d=new Date(t);if(d.getUTCDay()%6)days.push(d.toISOString().slice(0,10))}
const row={id:'1',person:'Test',ticker:'ABC',asset:'Stock',owner:'Spouse',type:'Purchase',traded:days[0],filed:days[3],amount:'$1,001–$15,000',source:'https://example.test/filing'},now=Date.parse('2026-06-01');
const price=step=>({currency:'USD',latest:100+64*step,asOf:days.at(-1),closes:Object.fromEntries(days.map((d,i)=>[d,100+i*step]))}),prices={ABC:price(1),SPY:price(0)};
let m=context.profileComparison([row,row],prices,20,now);assert.equal(m.count,1);assert.equal(m.eligible,1);assert(m.purchase>m.disclosure);assert(m.disclosureBenchmark<0,'Benchmark includes costs');
assert.equal(context.profileComparison([row],{...prices,ABC:{...prices.ABC,stale:true}},20,now).count,0);
const missing=structuredClone(prices);delete missing.ABC.closes[days[8]];assert.equal(context.profileComparison([row],missing,20,now).count,0);
assert.equal(context.profileComparison([{...row,asset:'Call options'}],prices,20,now).eligible,0);
assert.equal(context.profileComparison([row],prices,60,now).count,1);
assert.equal(context.profileStats([row,row]).batches,1);
const state={followedPoliticians:['Test']};assert.equal(politicianFilingEvents(state,[row],now).length,0,'Baseline must be silent');
const buy={...row,id:'2',traded:days[10],filed:days[15]},sale={...buy,id:'3',type:'Sale',traded:days[11]};
let alerts=politicianFilingEvents(state,[row,buy,sale],now);assert.equal(alerts.length,2);assert.match(alerts[0].detail,/Repeat purchase/);assert.match(alerts[1].detail,/remaining balance unknown/);
assert.equal(politicianFilingEvents(state,[row,buy,sale],now).length,0,'Do not repeat alerts');
politicianFilingEvents(state,[row],now);assert.equal(politicianFilingEvents(state,[row,buy,sale],now).length,0,'Rows disappearing and returning must not alert again');
assert.equal(politicianFilingEvents(state,[{...buy,id:'future',filed:'2099-01-01'}],now).length,0);
console.log('Profile comparison: paired samples, costs, stale/missing history, options; filing alerts: silent baseline, repeats, sales, deduplication and future exclusion passed.');
// Keep dollar brackets literal when replacing the old portfolio section.
const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,{value:'',innerHTML:'',hidden:false,scrollTop:0,open:false});return elements.get(id)};
const renderContext=vm.createContext({Date,Map,Set,Number,$:get,ROSTER:{Test:{}},signalData:[],selectedPolitician:null,esc:x=>x,politicianTitle:()=>'',card:()=>'<section class="politician-portfolio">Old</section>',profileOverview:()=>'',profilePortfolio:()=>'<section>$1,000,001–$5,000,000</section>',profileHoldingType:'all',profileHoldingOwner:'all',loadProfileResearch(){},disclosedDate:r=>r.filed});
vm.runInContext(fs.readFileSync('dist/politicians.js','utf8').split("document.addEventListener('click'")[0]+"\nselectedPolitician='Test';renderPoliticianBrowser();",renderContext);
assert(get('#politicianProfile').innerHTML.includes('$1,000,001–$5,000,000'));assert(!get('#politicianProfile').innerHTML.includes('>Old<'));
console.log('Profile rendering preserves literal amount brackets.');
