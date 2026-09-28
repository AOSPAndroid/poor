// Account-scoped chat queue; only the authenticated local worker can claim work.
const CHAT_KEY='poor/chat/queue-v1';
async function chatState(env){const obj=await env.BUCKET.get(CHAT_KEY);return {obj,state:obj?await obj.json():{jobs:[],heartbeat:0}}}
async function chatUpdate(env,fn){for(let i=0;i<5;i++){const {obj,state}=await chatState(env),result=await fn(state);if(result.skip)return result;const saved=await env.BUCKET.put(CHAT_KEY,JSON.stringify(state),{onlyIf:obj?{etagMatches:obj.etag}:{etagDoesNotMatch:'*'}});if(saved)return result}return {status:409,body:{error:'Chat is busy; try again.'}}}
export async function chatRoute(request,env){
 const url=new URL(request.url),worker=url.pathname==='/api/chat/worker',now=Date.now();
 if(worker){
  if(!env.RESEARCH_INGEST_TOKEN||request.headers.get('Authorization')!=='Bearer '+env.RESEARCH_INGEST_TOKEN)return {status:401,body:{error:'Unauthorized'}};
  if(request.method!=='POST')return {status:405,body:{error:'POST required'}};
  const raw=await request.text();if(raw.length>16000)return {status:413,body:{error:'Too large'}};let b;try{b=JSON.parse(raw)}catch{return {status:400,body:{error:'Invalid JSON'}}}
  return chatUpdate(env,s=>{s.heartbeat=now;s.jobs=s.jobs.filter(j=>now-j.created<7*86400000);for(const j of s.jobs)if(['queued','working'].includes(j.status)&&now-j.created>6*60000){j.status='failed';j.answer='The request timed out. Please try again.'}
   if(b.op==='claim'){const j=s.jobs.find(j=>j.status==='queued');if(j){j.status='working';j.claim=crypto.randomUUID();return {status:200,body:{job:{id:j.id,claim:j.claim,message:j.message,symbol:j.symbol,context:j.context||'',history:s.jobs.slice(0,s.jobs.indexOf(j)).filter(x=>x.owner===j.owner&&(x.thread||'legacy')===(j.thread||'legacy')&&x.status==='done').slice(-3).map(x=>({question:x.message,answer:x.answer}))}}}}}
   else if(b.op==='finish'){const j=s.jobs.find(j=>j.id===b.id&&j.claim===b.claim&&j.status==='working');if(!j)return {status:409,body:{error:'Claim expired'}};j.status=b.failed?'failed':'done';j.answer=typeof b.answer==='string'?b.answer.slice(0,10000):'No answer available.';j.finished=now}
   else if(b.op!=='heartbeat')return {skip:true,status:400,body:{error:'Invalid operation'}};
   return {status:200,body:{ok:true,job:null}};
  });
 }
 const id=request.headers.get('oai-authenticated-user-id'),email=request.headers.get('oai-authenticated-user-email');
 if(!id||!email)return {status:401,body:{error:'Sign in to chat with poor.'}};
 const owner=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(id)))).map(v=>v.toString(16).padStart(2,'0')).join('');
 if(request.method==='GET'){const {state}=await chatState(env);return {status:200,body:{online:now-state.heartbeat<180000,messages:state.jobs.filter(j=>j.owner===owner).slice(-35).map(j=>({id:j.id,thread:j.thread||'legacy',symbol:j.symbol,message:j.message,answer:j.answer||'',status:['queued','working'].includes(j.status)&&now-j.created>6*60000?'failed':j.status,created:j.created}))}}}
 if(request.method!=='POST'||request.headers.get('Origin')!==url.origin||!request.headers.get('Content-Type')?.startsWith('application/json'))return {status:403,body:{error:'Same-origin JSON required'}};
 const raw=await request.text();if(raw.length>9000)return {status:413,body:{error:'Message too long'}};let b;try{b=JSON.parse(raw)}catch{return {status:400,body:{error:'Invalid JSON'}}}
 if(b.context!==undefined&&(typeof b.context!=='string'||b.context.length>3000))return {status:400,body:{error:'Page context is too long.'}};
 if(b.thread!==undefined&&b.thread!=='legacy'&&(typeof b.thread!=='string'||!/^[-a-f0-9]{36}$/.test(b.thread)))return {status:400,body:{error:'Invalid conversation'}};
 if(typeof b.message!=='string'||!b.message.trim()||b.message.length>1800||b.symbol&&!/^[A-Z][A-Z0-9.-]{0,11}$/.test(b.symbol))return {status:400,body:{error:'Use a message under 1,800 characters and a valid ticker.'}};
 return chatUpdate(env,s=>{const fail=(status,error)=>({skip:true,status,body:{error}});if(now-s.heartbeat>180000)return fail(503,'Research chat is offline. Please return later.');const mine=s.jobs.filter(j=>j.owner===owner),day=new Date(now).toISOString().slice(0,10),today=s.jobs.filter(j=>new Date(j.created).toISOString().slice(0,10)===day);if(mine.some(j=>['queued','working'].includes(j.status)&&now-j.created<6*60000))return fail(409,'An answer is already in progress.');if(today.filter(j=>j.owner===owner).length>=5||today.length>=30)return fail(429,'Daily chat budget reached. Please return tomorrow.');const job={id:crypto.randomUUID(),owner,thread:b.thread||'legacy',message:b.message.trim(),context:b.context||'',symbol:b.symbol||'',status:'queued',created:now};s.jobs.push(job);return {status:202,body:{id:job.id,status:'queued'}}});
}
