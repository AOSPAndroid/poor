const fs=require('node:fs'),path=require('node:path');
require('./check-encoding.cjs').auditEncoding();
const files={};
const curated=require('node:vm').runInNewContext(fs.readFileSync('dist/roster.js','utf8')+'\n'+fs.readFileSync('dist/data.js','utf8')+'\nselectedRecords(SEED)');
for(const name of fs.readdirSync('dist'))if(/\.(html|css|js)$/.test(name)){files['/'+name]={body:fs.readFileSync(path.join('dist',name),'utf8'),type:name.endsWith('.html')?'text/html; charset=utf-8':name.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8'}}
fs.mkdirSync('dist/server',{recursive:true});fs.mkdirSync('dist/.openai',{recursive:true});
fs.writeFileSync('dist/server/index.js','const FILES='+JSON.stringify(files)+';\nconst STATIC_RESEARCH_ROWS='+JSON.stringify(curated)+';\n'+fs.readFileSync('server/research.mjs','utf8').replace(/export /g,'')+'\n'+fs.readFileSync('server/worker.mjs','utf8').replace("import {researchRoute,researchIngest} from './research.mjs';",''));
fs.copyFileSync('.openai/hosting.json','dist/.openai/hosting.json');
console.log('Built poor Worker and embedded '+Object.keys(files).length+' public assets.');
