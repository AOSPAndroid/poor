import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const c=vm.createContext({Date,Set});
vm.runInContext(fs.readFileSync('dist/investigations.js','utf8'),c);
const now=Date.parse('2026-09-28T12:00:00Z');
const base={id:'a',type:'stock',target:'AAPL',phase:'finding',verdict:'supported',decisiveEvidenceRetrieved:true,sources:['https://www.sec.gov/filing'],publishedAt:new Date(now-1000).toISOString()};
const review={...base,phase:'challenge'};
const feed=items=>c.researchFeed(items,now);
assert.equal(feed([{...base,verdict:'unverified'}]).research.length,0);
assert.equal(feed([{...base,decisiveEvidenceRetrieved:false}]).research.length,0);
assert.equal(feed([base]).home.length,0); // No second review.
assert.equal(feed([base,review]).home.length,1);
assert.equal(feed([base,{...review,decisiveEvidenceRetrieved:false}]).home.length,0); // An unverified second opinion cannot promote a trade.
assert.equal(feed([base,{...review,verdict:'wait'}]).home.length,0);
assert.equal(feed([base,{...review,verdict:'rejected'}]).research.length,1); // Keep counterevidence.
assert.equal(feed([{...base,type:'briefing'}]).home.length,1);
const newer={...base,id:'b',verdict:'unverified',publishedAt:new Date(now).toISOString()};
assert.equal(feed([base,review,newer]).home.length,0); // Never resurface superseded optimism.
assert.equal(feed([base,review,newer]).earlier.length,1);
assert.equal(feed([{...base,publishedAt:new Date(now-4*86400000).toISOString()},review]).home.length,0);
assert.equal(feed([{...base,publishedAt:new Date(now+86400000).toISOString()},review]).home.length,0);
console.log('Research feed gates: evidence, review, freshness, failed follow-ups and retained history passed.');
