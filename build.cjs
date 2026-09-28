const fs=require('node:fs'),path=require('node:path');
fs.writeFileSync('dist/personal-math.js',fs.readFileSync('server/holdings.mjs','utf8').replace(/export /g,''));
require('./check-encoding.cjs').auditEncoding();
const files={};
const curated=require('node:vm').runInNewContext(fs.readFileSync('dist/roster.js','utf8')+'\n'+fs.readFileSync('dist/data.js','utf8')+'\nselectedRecords(SEED)');
for(const name of fs.readdirSync('dist'))if(/\.(html|css|js)$/.test(name)){files['/'+name]={body:fs.readFileSync(path.join('dist',name),'utf8'),type:name.endsWith('.html')?'text/html; charset=utf-8':name.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8'}}
// Fetch scripts concurrently while preserving their separate global scopes and order.
// Content-addressed URLs make long-lived caching safe across every deployment.
const hash=body=>require('node:crypto').createHash('sha256').update(body).digest('hex').slice(0,16);
let html=files['/index.html'].body;
const css=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map(m=>files['/'+m[1].replace(/^\//,'')].body).join('\n');
const cssPath='/assets/styles.'+hash(css)+'.css';files[cssPath]={body:css,type:'text/css; charset=utf-8',immutable:true};
let firstStyle=true;html=html.replace(/<link rel="stylesheet" href="[^"]+">/g,()=>{if(!firstStyle)return '';firstStyle=false;return '<link rel="stylesheet" href="'+cssPath+'">'});
html=html.replace(/<script src="([^"]+)"><\/script>/g,(_,src)=>{const original='/'+src.replace(/^\//,''),file=files[original],asset='/assets/'+path.basename(original,'.js')+'.'+hash(file.body)+'.js';files[asset]={...file,immutable:true};return '<script defer src="'+asset+'"></script>'});
files['/index.html'].body=html;
for(const file of Object.values(files))file.etag='"'+hash(file.body)+'"';
fs.mkdirSync('dist/server',{recursive:true});fs.mkdirSync('dist/.openai',{recursive:true});
fs.writeFileSync('dist/server/index.js','const FILES='+JSON.stringify(files)+';\nconst STATIC_RESEARCH_ROWS='+JSON.stringify(curated)+';\n'+fs.readFileSync('server/predictions.mjs','utf8').replace(/export /g,'')+'\n'+fs.readFileSync('server/chat.mjs','utf8').replace(/export /g,'')+'\n'+fs.readFileSync('server/research.mjs','utf8').replace(/export /g,'')+'\n'+fs.readFileSync('server/holdings.mjs','utf8').replace(/export /g,'')+'\n'+fs.readFileSync('server/worker.mjs','utf8').replace("import {personalValidate,personalPositions} from './holdings.mjs';",'').replace("import {researchRoute,researchIngest} from './research.mjs';",'').replace("import {chatRoute} from './chat.mjs';",'').replace("import {predictionsRoute} from './predictions.mjs';",''));
fs.copyFileSync('.openai/hosting.json','dist/.openai/hosting.json');
console.log('Built poor Worker and embedded '+Object.keys(files).length+' public assets.');
