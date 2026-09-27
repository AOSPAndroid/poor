'use strict';
const PAGE_KEYS={c:['chat','Ask poor'],h:['home','Home'],t:['market','Terminal'],d:['trades','Political trades'],p:['politicians','Politicians'],w:['watchlist','Watchlist'],a:['alerts','Alerts'],m:['map','Research map'],r:['daily','poor’s research'],s:['sources','Sources']};
const LAYER_KEYS={b:['buys','Buy markers'],s:['sales','Sale markers'],d:['disclosures','Disclosures'],n:['labels','Names & returns'],a:['activity','Activity details'],i:['benchmark','S&P 500'],p:['priceOnly','Price only']};
let shortcutPrefix='',shortcutTimer,visibleCommandItems=[];
function contextStock(){return view==='map'&&mapMode==='stock'?mapTicker:marketSymbol}
function contextPerson(){return view==='map'&&mapMode==='people'?peopleRoot:selectedPolitician}
function goConnected(action){
 const symbol=contextStock(),person=contextPerson();
 if(action==='chat'){changeView('chat');$('#chatSymbol').value=symbol;return}
 if(action==='chart')return openStock(symbol);
 if(action==='stock-map')return openResearchMap(symbol);
 if(action==='person-map')return person?openPeopleMap(person):openPeopleMap();
 if(action==='profile')return person?openPolitician(person):changeView('politicians');
 if(action==='stock-trades'||action==='person-trades'){clear();$('#search').value=action==='stock-trades'?'$'+symbol:person||'';changeView('trades');renderRows();return}
 if(action==='evidence'){openStock(symbol);$('#researchPanel').scrollIntoView({block:'start'});return}
 if(action==='briefs'){dailySymbolFilter=symbol;changeView('daily');renderDailyFilter();return}
 if(action==='help')return showShortcutHelp();
 if(action==='map')return (view==='politicians'||view==='map'&&mapMode==='people')?goConnected('person-map'):goConnected('stock-map');
}
function renderConnections(){
 const el=$('#connectionBar');if(!el)return;
 el.hidden=view==='home'||view==='chat';if(el.hidden){el.innerHTML='';return}
 const symbol=contextStock(),person=contextPerson(),button=(action,label)=>`<button data-connect="${action}">${label}</button>`;
 el.innerHTML=`<span class="connection-stock"><b>${esc(symbol)}</b>${button('chart','Chart')}${button('stock-map','Map')}${button('stock-trades','Trades')}${button('evidence','Evidence')}${button('briefs','Research')}${button('chat','Ask poor')}</span>${person?`<span class="connection-person"><b>${esc(person)}</b>${button('profile','Profile & timeline')}${button('person-map','Map')}${button('person-trades','Trades')}</span>`:''}<button class="shortcut-help" data-connect="help" title="Keyboard shortcuts (?)">Shortcuts <kbd>?</kbd></button>`;
}
function showShortcutHelp(){
 if(document.querySelector('dialog[open]'))return;
 const rows=(items)=>items.map(([key,label])=>`<div><span>${label}</span><kbd>${key}</kbd></div>`).join('');
 $('#shortcutContent').innerHTML=`<h2>Keyboard shortcuts</h2><p>Press keys in sequence: <kbd>G</kbd>, then <kbd>T</kbd>. Shortcuts pause while typing. Tab and Enter work on every control.</p><section><h3>Anywhere</h3>${rows([['Ctrl / ⌘ K','Search stocks, people, pages & controls'],['/','Open search'],['?','This guide'],['Ctrl M','Open contextual map'],['Esc','Close dialog / cancel sequence']])}</section><section><h3>Go to a page</h3>${rows(Object.entries(PAGE_KEYS).map(([key,[,label]])=>['G '+key.toUpperCase(),label]))}</section><section><h3>Current stock · terminal</h3>${rows([['W','Watch / unwatch'],['A','Create alert'],...Object.entries(LAYER_KEYS).map(([key,[,label]])=>['X '+key.toUpperCase(),label])])}</section><section><h3>Map · focus the canvas first</h3>${rows([['Arrow keys','Pan'],['+ / −','Zoom'],['F','Fit all']])}<p>Use Ctrl / ⌘ K to find any visible button, switch, filter, chart period, or map action by name.</p></section>`;
 $('#shortcutDialog').showModal();
}
function collectVisibleCommands(){
 const found=[];
 for(const el of document.querySelectorAll('button,input:not([type=hidden]),select,summary')){
  if(el.disabled||el.closest('dialog,[hidden]')||!el.getClientRects().length||el.id==='commandButton')continue;
  const label=(el.getAttribute('aria-label')||el.labels?.[0]?.textContent||el.textContent||el.getAttribute('title')||el.placeholder||'').trim().replace(/\s+/g,' ');
  if(!label)continue;
  const field=el.matches('select,input:not([type=checkbox]):not([type=radio])');
  found.push({kind:'control',key:'control-'+found.length,label:(field?'Focus ':el.matches('input')?(el.checked?'Turn off ':'Turn on '):'')+label,detail:'On this page',search:label+' '+(field?'filter search input':'button action toggle'),element:el,field});
 }
 return found;
}
function runVisibleCommand(item){const el=item.element;if(!el?.isConnected||el.disabled)return;el.scrollIntoView({block:'nearest'});el.focus();if(!item.field)el.click()}
function handlePoorShortcut(e){
 if(e.isComposing||e.repeat||e.defaultPrevented)return;
 const key=e.key.toLowerCase(),typing=e.target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]');
 if(key==='escape'){shortcutPrefix='';clearTimeout(shortcutTimer);return}
 if(typing||document.querySelector('dialog[open]'))return;
 if((e.ctrlKey||e.metaKey)&&!e.altKey&&!e.shiftKey&&key==='m'){e.preventDefault();goConnected('map');return}
 if(e.ctrlKey||e.metaKey||e.altKey)return;
 if(key==='?'||key==='/'){e.preventDefault();shortcutPrefix='';key==='?'?showShortcutHelp():openCommands();return}
 if(shortcutPrefix){const prefix=shortcutPrefix;shortcutPrefix='';clearTimeout(shortcutTimer);if(prefix==='g'&&PAGE_KEYS[key]){e.preventDefault();const dest=PAGE_KEYS[key][0];if(dest==='map')goConnected('map');else if(dest==='market')goConnected('chart');else changeView(dest);return}if(prefix==='x'&&view==='market'&&LAYER_KEYS[key]){e.preventDefault();const layer=LAYER_KEYS[key][0];setChartOption(layer,!chartOptions()[layer]);return}}
 if(key==='g'||key==='x'&&view==='market'){e.preventDefault();shortcutPrefix=key;clearTimeout(shortcutTimer);shortcutTimer=setTimeout(()=>shortcutPrefix='',1500);notify(key==='g'?'Go to: H home · T terminal · D trades · P politicians · W watchlist · A alerts · M map · R research · S sources':'Chart: B buys · S sales · D disclosures · N names · A activity · I index · P price only');return}
 if(view==='market'&&(key==='w'||key==='a')){e.preventDefault();$('#'+(key==='w'?'watchStock':'addStockAlert')).click()}
}
function renderDailyFilter(){const el=$('#dailyStockFilter');if(el)el.innerHTML=dailySymbolFilter?`<span>Research mentioning <b>${esc(dailySymbolFilter)}</b></span><button id="clearDailyFilter">Show all research</button><button data-map="${esc(dailySymbolFilter)}">Open map ↗</button>`:'<span>All research</span>';$('#dailyArticles').innerHTML=dailyArticlesHTML(dailyEditions);fillArticlePerformance()}
if(typeof window!=='undefined'){
 document.addEventListener('keydown',handlePoorShortcut);
 // Close the current inspector before following a connection into another page.
 document.addEventListener('click',e=>{if(e.target.closest('[data-connect],[data-ticker],[data-profile],[data-people-root],[data-map],[data-person]'))e.target.closest('dialog')?.close()},true);
 document.addEventListener('click',e=>{const b=e.target.closest('[data-connect]');if(b)goConnected(b.dataset.connect);if(e.target.closest('#clearDailyFilter')){dailySymbolFilter='';renderDailyFilter()}});
 for(const [key,[page,label]]of Object.entries(PAGE_KEYS))for(const el of document.querySelectorAll(`.nav[data-view="${page}"]`))el.title=label+' (G then '+key.toUpperCase()+')';
 renderConnections();renderDailyFilter();
}

if(typeof window!=='undefined'){
 const toggle=$('#utilityToggle');
 function closeUtilities(){document.querySelector('.appbar').classList.remove('utilities-open');toggle.setAttribute('aria-expanded','false')}
 toggle.onclick=()=>{const on=toggle.getAttribute('aria-expanded')!=='true';document.querySelector('.appbar').classList.toggle('utilities-open',on);toggle.setAttribute('aria-expanded',String(on))};
 document.addEventListener('click',e=>{if(!e.target.closest('.app-actions')||e.target.closest('#exportButton,#importButton'))closeUtilities()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&toggle.getAttribute('aria-expanded')==='true'){closeUtilities();toggle.focus()}});
}
