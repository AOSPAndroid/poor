import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import worker,{validateWorkspaceAction} from './server/worker.mjs';
class Bucket{
 constructor(){this.data=new Map();this.n=0}
 async get(k){const v=this.data.get(k);return v?{etag:v.etag,json:async()=>JSON.parse(v.text)}:null}
 async put(k,text,o={}){const old=this.data.get(k),c=o.onlyIf;if(c?.etagMatches&&old?.etag!==c.etagMatches||c?.etagDoesNotMatch==='*'&&old)return null;const etag=String(++this.n);this.data.set(k,{text,etag});return {etag}}
}
const env={BUCKET:new Bucket()},source=fs.readFileSync('dist/terminal.js','utf8'),code=source.slice(source.indexOf('let workspaceQueue='),source.indexOf('function ruleLabel'));
function client(account,legacy=[],owner=null){
 const cache={'cl-follows':legacy,'poor-follows-legacy-owner':owner},messages=[];
 const c=vm.createContext({Set,Promise,console,workspaceReady:false,workspaceBusy:false,workspaceState:{},follows:new Set(legacy),
  read:(k,d)=>cache[k]??d,persist:(k,v)=>{cache[k]=v;return true},renderPeople(){},renderRows(){},renderTerminal(){},notify:m=>messages.push(m),$:()=>({textContent:''}),
  fetch:async(path,options={})=>worker.fetch(new Request('https://poor.test'+path,{...options,headers:{...options.headers,origin:'https://poor.test','oai-authenticated-user-id':account,'oai-authenticated-user-email':account+'@example.test'}}),env)});
 vm.runInContext(code,c);return {c,cache,messages};
}
const first=client('A',['Nancy Pelosi']);assert.equal(await first.c.workspaceAction(),true);assert(first.c.follows.has('Nancy Pelosi'));
const second=client('A');await second.c.workspaceAction();assert(second.c.follows.has('Nancy Pelosi')); // New browser restores account state.
await second.c.workspaceAction({kind:'followPolitician',person:'Nancy Pelosi',enabled:false});
const stale=client('A',['Nancy Pelosi']);await stale.c.workspaceAction();assert(!stale.c.follows.has('Nancy Pelosi')); // Old local cache cannot resurrect removal.
await Promise.all([second.c.workspaceAction(),second.c.workspaceAction({kind:'followPolitician',person:'Nancy Pelosi',enabled:true}),second.c.workspaceAction({kind:'followPolitician',person:'Ron Wyden',enabled:true})]);
const reloaded=client('A');await reloaded.c.workspaceAction();assert(reloaded.c.follows.has('Nancy Pelosi'));assert(reloaded.c.follows.has('Ron Wyden'));
const other=client('B',['Nancy Pelosi'],'account:A@example.test');await other.c.workspaceAction();assert.equal(other.c.follows.size,0);
reloaded.c.fetch=async()=>{throw Error('Offline')};assert.equal(await reloaded.c.workspaceAction({kind:'followPolitician',person:'Nancy Pelosi',enabled:false}),false);assert(reloaded.c.follows.has('Nancy Pelosi'));assert.match(reloaded.messages.at(-1),/not saved/);
for(const action of [{kind:'followPolitician',person:'<script>',enabled:true},{kind:'followPolitician',person:'Nancy Pelosi',enabled:'yes'},{kind:'importFollows',people:Array(101).fill('Nancy Pelosi')}])assert.throws(()=>validateWorkspaceAction(action));
console.log('Follows: migration, account restoration, stale-cache removal, queued actions, account isolation and offline failure passed.');
