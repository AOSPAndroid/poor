import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const calls=[],state={modal:false,typing:false};
const ctx=vm.createContext({console,setTimeout,clearTimeout,document:{querySelector(){return state.modal?{}:null}},notify(){},openStock:s=>calls.push(['chart',s]),openResearchMap:s=>calls.push(['stock-map',s]),openPeopleMap:p=>calls.push(['person-map',p]),changeView:v=>calls.push(['page',v]),chartOptions:()=>({buys:true}),setChartOption:(k,v)=>calls.push(['layer',k,v])});
vm.runInContext("let view='market',marketSymbol='NVDA',mapMode='stock',mapTicker='BE',selectedPolitician='Nancy Pelosi',peopleRoot='Dan Sullivan';"+fs.readFileSync('dist/navigation.js','utf8'),ctx);
function key(key,extra={}){const e={key,target:{closest:()=>state.typing?{}:null},preventDefault(){this.defaultPrevented=true},...extra};ctx.e=e;vm.runInContext('handlePoorShortcut(e)',ctx);return e}
key('g');key('r');assert.deepEqual(calls.pop(),['page','daily']);
key('m',{ctrlKey:true});assert.deepEqual(calls.pop(),['stock-map','NVDA']);
vm.runInContext("view='map'",ctx);key('g');key('t');assert.deepEqual(calls.pop(),['chart','BE'],'Stock map retains its own ticker');
vm.runInContext("view='politicians'",ctx);key('m',{ctrlKey:true});assert.deepEqual(calls.pop(),['person-map','Nancy Pelosi']);
vm.runInContext("view='map';mapMode='people'",ctx);key('m',{ctrlKey:true});assert.deepEqual(calls.pop(),['person-map','Dan Sullivan']);
vm.runInContext("view='market'",ctx);key('x');key('b');assert.deepEqual(calls.pop(),['layer','buys',false]);
state.typing=true;key('g');key('t');key('m',{ctrlKey:true});assert.equal(calls.length,0);state.typing=false;
state.modal=true;key('g');key('t');assert.equal(calls.length,0);state.modal=false;
key('g');key('Escape');key('t');assert.equal(calls.length,0);
key('g',{repeat:true});key('t');assert.equal(calls.length,0);
key('g',{isComposing:true});key('t');assert.equal(calls.length,0);
console.log('Passed: page shortcuts, stock/person context, chart layers, typing/modal guards, repeat/composition guards and Escape cancellation.');
