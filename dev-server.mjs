import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
const root=path.resolve('.sites-runtime/local-r2');await fs.mkdir(root,{recursive:true});
const filename=key=>path.join(root,crypto.createHash('sha256').update(key).digest('hex')+'.json');
const bucket={async get(key){try{const text=await fs.readFile(filename(key),'utf8');return {etag:crypto.createHash('sha256').update(text).digest('hex'),json:async()=>JSON.parse(text)}}catch(e){if(e.code==='ENOENT')return null;throw e}},async put(key,text,options={}){const current=await this.get(key),condition=options.onlyIf;if(condition?.etagMatches&&current?.etag!==condition.etagMatches||condition?.etagDoesNotMatch==='*'&&current)return null;await fs.writeFile(filename(key),text);return {etag:crypto.createHash('sha256').update(text).digest('hex')}}};
http.createServer(async(req,res)=>{try{const entry=path.resolve('dist/server/index.js'),version=(await fs.stat(entry)).mtimeMs,{default:worker}=await import(pathToFileURL(entry).href+'?v='+version);const chunks=[];for await(const c of req)chunks.push(c);const request=new Request('http://127.0.0.1:4185'+req.url,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});const result=await worker.fetch(request,{BUCKET:bucket});res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()))}catch(e){console.error(e);res.writeHead(500);res.end('Local preview error')}}).listen(4185,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4185'));
