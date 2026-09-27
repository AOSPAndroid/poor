import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const ctx=vm.createContext({console});
vm.runInContext(fs.readFileSync('dist/people-map.js','utf8')+`
function disclosedDate(r){return r.disclosed}
function tickerValid(s){return /^[A-Z]+$/.test(s)}
const mk=(person,ticker,traded,id,extra={})=>({person,ticker,traded,id,type:'Purchase',quality:'Primary',disclosed:'2026-01-25',...extra});
const fixture=[mk('Nancy Pelosi','BE','2026-01-01','a'),mk('Nancy Pelosi','BE','2026-01-10','b'),mk('Peer','BE','2026-01-15','c'),mk('Peer','NVDA','2026-01-20','d'),mk('Nancy Pelosi','NVDA','2026-01-22','e'),mk('Imported','BE','2026-01-20','f',{quality:'User-provided'}),mk('Seller','BE','2026-01-20','g',{type:'Sale'}),mk('Future','BE','2099-01-01','h'),mk('Unpublished','BE','2026-01-01','i',{disclosed:null})];
globalThis.api={rows:peopleMapRows(fixture),tree:()=>peopleTree(peopleMapRows(fixture)),expand:id=>peopleExpanded.add(id),overlap:peopleOverlap};`,ctx);
const api=ctx.api;
assert.equal(api.rows.length,5,'Exclude imports, sales, future and unpublished records');
let tree=api.tree();assert.equal(tree.root.children.length,2,'Group repeated purchases by ticker');
const be=tree.root.children.find(n=>n.name==='BE');assert.equal(be.rows.length,2);assert.equal(be.rows[0].id,'b','Latest transaction displayed');
api.expand(be.id);tree=api.tree();const peer=tree.nodes.find(n=>n.name==='Peer');assert.ok(peer);assert.equal(peer.referenceRows.length,2);
assert.equal(api.overlap(peer.rows,peer.referenceRows).gap,5,'Use nearest disclosed purchase, not latest other trade');
assert.equal(api.overlap(peer.rows,peer.referenceRows,3),null);
api.expand(peer.id);tree=api.tree();const nvda=tree.nodes.find(n=>n.parent?.name==='Peer'&&n.name==='NVDA');assert.ok(nvda);api.expand(nvda.id);tree=api.tree();assert.equal(tree.nodes.filter(n=>n.name==='Nancy Pelosi').length,1,'No cycle back to an ancestor');
assert.ok(tree.nodes.every(n=>Number.isFinite(n.x)&&Number.isFinite(n.y)));
for(let i=0;i<tree.nodes.length;i++)for(let j=i+1;j<tree.nodes.length;j++){const a=tree.nodes[i],b=tree.nodes[j];assert.ok(Math.abs(a.x-b.x)>=310||Math.abs(a.y-b.y)>=280,'Expanded cards cannot overlap')}
console.log('Politician map: disclosure filtering, grouped transactions, timing, cycles and layout passed.');
