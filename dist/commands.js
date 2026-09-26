'use strict';
let commandSelection=0,commandItems=[];
function paletteResults(query,records=data){
 const q=query.trim().toLowerCase(),match=s=>!q||q.split(/\s+/).every(word=>s.toLowerCase().includes(word));
 const commands=[['Terminal','market','Stocks charts prices'],['Political trades','trades','Transactions disclosures'],['Politicians','politicians','Track record performance rankings filters'],['Politician watchlist','watchlist','Following saved people'],['Alerts','alerts','Rules notifications'],['Sources','sources','Coverage freshness methodology'],['Shared buys','clusters','Multiple politicians buying same stock'],['Create stock alert','alert','Price disclosure cluster rule']].map(([label,key,keywords])=>({kind:'command',key,label,detail:'Action',search:label+' '+keywords}));
 const people=[...new Set(records.map(r=>r.person))].sort().map(person=>({kind:'person',key:person,label:person,detail:'Politician · disclosures',search:person}));
 const stocks=new Map();for(const r of records)if(tickerValid(r.ticker)&&!stocks.has(r.ticker))stocks.set(r.ticker,{kind:'stock',key:r.ticker,label:r.ticker,detail:r.company,search:r.ticker+' '+r.company});
 const found=[...commands,...people,...stocks.values()].filter(item=>match(item.search)).sort((a,b)=>Number(b.label.toLowerCase()===q)-Number(a.label.toLowerCase()===q));
 const ticker=q.replace(/^\$/,'').toUpperCase();if(q&&tickerValid(ticker)&&!found.some(i=>i.kind==='stock'&&i.key===ticker))found.push({kind:'stock',key:ticker,label:'Open '+ticker,detail:'Look up stock ticker'});
 return found.slice(0,30);
}
function renderCommands(){commandItems=paletteResults($('#commandInput').value);commandSelection=0;$('#commandResults').innerHTML=commandItems.map((item,i)=>`<div id="command-option-${i}" role="option" aria-selected="false" data-command-index="${i}" class="command-option"><span><strong>${esc(item.label)}</strong><small>${esc(item.detail)}</small></span><span class="command-kind">${item.kind==='stock'?'Stock':item.kind==='person'?'Person':'Go'}</span></div>`).join('')||'<p class="command-empty">No matches. Search a ticker, politician or page.</p>';$('#commandStatus').textContent=commandItems.length+' results';selectCommand(0)}
function selectCommand(index){commandSelection=Math.max(0,Math.min(index,commandItems.length-1));$$('[data-command-index]').forEach((el,i)=>el.setAttribute('aria-selected',String(i===commandSelection)));const selected=$('#command-option-'+commandSelection);if(selected){$('#commandInput').setAttribute('aria-activedescendant',selected.id);selected.scrollIntoView({block:'nearest'})}else $('#commandInput').removeAttribute('aria-activedescendant')}
function openCommands(){if($('#commandPalette').open)return;if(document.querySelector('dialog[open]'))return;$('#commandInput').value='';$('#commandPalette').showModal();renderCommands();$('#commandInput').focus()}
function runCommand(index){const item=commandItems[index];if(!item)return;$('#commandPalette').close();if(item.kind==='stock'){openStock(item.key);return}if(item.kind==='person'){clear();$('#search').value=item.key;changeView('trades');renderRows();return}if(item.key==='alert'){openAlertForm();return}if(item.key==='clusters'){clear();scope='clusters';$$('[data-scope]').forEach(b=>b.classList.toggle('selected',b.dataset.scope===scope));changeView('trades');renderRows();return}changeView(item.key)}
if(typeof window!=='undefined'){
 $('#commandButton').onclick=openCommands;$('#commandClose').onclick=()=>$('#commandPalette').close();
 $('#commandInput').addEventListener('input',renderCommands);
 $('#commandInput').addEventListener('keydown',e=>{if(e.isComposing)return;if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();selectCommand((commandSelection+(e.key==='ArrowDown'?1:-1)+commandItems.length)%Math.max(1,commandItems.length))}else if(e.key==='Enter'){e.preventDefault();runCommand(commandSelection)}});
 $('#commandResults').addEventListener('click',e=>{const row=e.target.closest('[data-command-index]');if(row)runCommand(Number(row.dataset.commandIndex))});
 $('#commandPalette').addEventListener('click',e=>{if(e.target===$('#commandPalette')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close()}});
 document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&!e.altKey&&e.key.toLowerCase()==='k'){e.preventDefault();if($('#commandPalette').open)$('#commandPalette').close();else openCommands()}});
}
