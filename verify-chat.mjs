import assert from 'node:assert/strict';import {chatRoute} from './server/chat.mjs';
let value=null,etag=0;const env={RESEARCH_INGEST_TOKEN:'secret',BUCKET:{get:async()=>value?{etag:String(etag),json:async()=>JSON.parse(value)}:null,put:async(k,v,o)=>{if(value&&o.onlyIf.etagMatches!==String(etag)||!value&&!o.onlyIf.etagDoesNotMatch)return null;value=v;etag++;return {etag:String(etag)}}}};
const req=(who,body,worker=false)=>new Request('https://test/api/chat'+(worker?'/worker':''),{method:body?'POST':'GET',headers:worker?{Authorization:'Bearer secret'}:{'oai-authenticated-user-id':who,'oai-authenticated-user-email':who+'@test','Origin':'https://test','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
assert.equal((await chatRoute(new Request('https://test/api/chat'),env)).status,401);
assert.equal((await chatRoute(req('a',{message:'Hello'}),env)).status,503);
await chatRoute(req('',{op:'heartbeat'},true),env);
assert.equal((await chatRoute(req('a',{message:'Question one',symbol:'BE'}),env)).status,202);
assert.equal((await chatRoute(req('a',{message:'Duplicate'}),env)).status,409);
assert.equal((await chatRoute(req('b'),env)).body.messages.length,0);
const claim=(await chatRoute(req('',{op:'claim'},true),env)).body.job;assert.equal(claim.message,'Question one');assert.equal(claim.history.length,0);
assert.equal((await chatRoute(req('',{op:'finish',id:claim.id,claim:'bad',answer:'bad'},true),env)).status,409);
await chatRoute(req('',{op:'finish',id:claim.id,claim:claim.claim,answer:'Sourced answer'},true),env);
assert.equal((await chatRoute(req('a'),env)).body.messages[0].answer,'Sourced answer');assert.equal((await chatRoute(req('b'),env)).body.messages.length,0);
for(let i=0;i<4;i++){await chatRoute(req('a',{message:'Next'}),env);const j=(await chatRoute(req('',{op:'claim'},true),env)).body.job;await chatRoute(req('',{op:'finish',id:j.id,claim:j.claim,answer:'Reply'},true),env)}
assert.equal((await chatRoute(req('a',{message:'Over budget'}),env)).status,429);
console.log('Passed: sign-in, offline state, account isolation, one pending request, worker claim validation and daily budget.');
