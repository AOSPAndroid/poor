import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const c={pmSelected:null,esc:s=>String(s).replaceAll('<','&lt;'),pmCents:n=>Number.isFinite(n)?(n*100).toFixed(1)+'c':'—',pmPercent:n=>Number.isFinite(n)?(n*100).toFixed(1)+'%':'—',date:s=>s,Intl};vm.createContext(c);vm.runInContext(fs.readFileSync('dist/prediction-cards.js','utf8'),c);
assert.equal(c.pmSplit(.5,.5),50);assert.equal(c.pmSplit(1,0),100);assert.equal(c.pmSplit(0,1),0);assert.equal(c.pmSplit(null,.5),null);assert.equal(c.pmSplit(NaN,.5),null);assert.equal(c.pmSplit(.6,.6),50);
const m={id:'1',question:'<test>',outcomes:[{label:'Yes',price:.5},{label:'No',price:.5}],change:-.03,volume:null,liquidity:2500,connections:[]};const html=c.predictionCard(m);assert(html.includes('width:50.0000%'));assert(html.includes('&lt;test>'));assert(html.includes('↓ 3.0 pp'));assert(!html.includes('$0'));
assert(c.pmCardChart({data:{value:{points:[{t:1,p:.5},{t:2,p:.6}]}}}).includes('50.0% to 60.0%'));assert(c.pmCardChart({data:null}).includes('unavailable'));
console.log('Contract card checks passed: equal/extreme/missing prices, proportional scaling, escaping and chart states.');
