const fs=require('node:fs'),path=require('node:path');
// UTF-8 interpreted as Windows-1252: punctuation, emoji and Latin accents.
const suspicious=/\uFFFD|[\u0080-\u009F]|\u00C2[\u00A0-\u00BF]|\u00C3[\u0080-\u00BF]|\u00E2[\u20AC\u2020\u02C6]|\u00F0\u0178|\u00EF\u00BB\u00BF/;
function auditEncoding(){
 const names=[...fs.readdirSync('dist').filter(n=>/\.(html|css|js|json)$/.test(n)).map(n=>path.join('dist',n)),...fs.readdirSync('server').filter(n=>/\.mjs$/.test(n)).map(n=>path.join('server',n))];
 for(const name of names){let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(fs.readFileSync(name))}catch{throw Error('Invalid UTF-8: '+name)}const hit=suspicious.exec(text);if(hit)throw Error('Corrupted text: '+name+':'+(text.slice(0,hit.index).split('\n').length));}
 console.log('Encoding audit passed: '+names.length+' frontend and server source files.');
}
module.exports={auditEncoding};
if(require.main===module)auditEncoding();
