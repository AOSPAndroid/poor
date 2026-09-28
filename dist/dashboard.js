'use strict';
// The dashboard reuses existing feeds and actions. It never creates a separate refresh loop.
function dashboardSnapshot(rows,prices,now=Date.now()){
 const publicRows=homePublicRows(rows,now),cutoff=new Date(now-7*86400000).toISOString().slice(0,10),recent=publicRows.filter(r=>disclosedDate(r)>=cutoff);
 const universe=[...new Set([...HOME_STOCKS,...workspaceState.symbols])];
 const quotes=universe.map(symbol=>({symbol,p:prices[symbol]})).filter(x=>x.p&&!x.p.error&&!x.p.stale&&validDate(x.p.asOf)&&Date.parse(x.p.asOf)<=now&&now-Date.parse(x.p.asOf)<=5*86400000&&x.p.latest>0&&x.p.previousClose>0).map(x=>({...x,change:(x.p.latest/x.p.previousClose-1)*100}));
 const latestSession=quotes.map(x=>x.p.asOf).sort().at(-1),matched=quotes.filter(x=>x.p.asOf===latestSession).sort((a,b)=>b.change-a.change);
 return {recent,people:new Set(recent.map(r=>r.person)).size,buys:recent.filter(r=>r.type==='Purchase').length,sales:recent.filter(r=>r.type==='Sale').length,latest:publicRows[0]?disclosedDate(publicRows[0]):null,matched,latestSession,total:universe.length};
}
function renderDashboard(){
 const el=document.querySelector('#dashboardPulse');if(!el)return;
 const s=dashboardSnapshot(signalData,PRICES),metric=(label,value,target,sub)=>`<button data-view="${target}"><span>${label}</span><strong>${value}</strong><small>${sub}</small></button>`;
 el.innerHTML=metric('Disclosed buys',s.buys,'trades','Past 7 days · loaded records')+metric('Disclosed sales',s.sales,'trades','Past 7 days · loaded records')+metric('Active households',s.people,'politicians','Disclosed in the past 7 days')+metric('Latest disclosure',s.latest?date(s.latest):'—','trades','In available coverage');
 const rows=s.matched,adv=rows.filter(x=>x.change>0).length,dec=rows.filter(x=>x.change<0).length,flat=rows.length-adv-dec;
 $('#dashboardBreadth').innerHTML=`<div class="dash-breadth-head"><strong>${rows.length?`${adv} rising <span> / </span>${dec} falling`:'Awaiting comparable quotes'}</strong><small>${flat} unchanged · ${rows.length}/${s.total} matched quotes</small></div><div class="dash-breadth-bar" aria-hidden="true"><i style="flex:${adv};background:#258666"></i><i style="flex:${flat};background:#c4cec9"></i><i style="flex:${dec};background:#bd4c58"></i></div><small>Selected stocks + your bookmarks · ${s.latestSession?date(s.latestSession):'Awaiting daily closes'}. Not whole-market breadth.</small>`;
 const extremes=[...rows.filter(x=>x.change>0).slice(0,3),...rows.filter(x=>x.change<0).slice(-3).reverse()];
 $('#dashboardMovers').innerHTML=extremes.map(x=>`<button data-ticker="${esc(x.symbol)}"><b>${esc(x.symbol)}</b><span class="dash-mover-chart">${miniChart(x.p,x.symbol)}</span><strong class="${x.change>=0?'gain':'loss'}">${signed(x.change)}</strong><small>${money(x.p.latest,x.p.currency)} · day</small></button>`).join('')||'<p class="muted">No comparable daily changes available yet.</p>';
 $('#dashboardClock').textContent='Daily closes · '+(PRICES.SPY?.asOf?date(PRICES.SPY.asOf)+(PRICES.SPY.stale?' · stale':''):'prices pending');
}
(()=>{
 const home=$('#homeView');if(!home)return;
 home.classList.add('dashboard-home');
 const heading=document.createElement('div');heading.className='dashboard-heading';heading.innerHTML='<div><span class="dashboard-eyebrow">THE BIG PICTURE</span><h1>Market dashboard</h1></div><div><span id="dashboardClock"></span><button class="secondary" data-view="map">Explore the map ↗</button><button class="primary" data-view="chat">Ask poor ↗</button></div>';home.prepend(heading);
 const market=document.createElement('section');market.className='dashboard-market';market.setAttribute('aria-label','Market overview');heading.after(market);
 const etfs=$('#homeETFs').closest('.home-section');market.append(etfs);etfs.querySelector('h2').textContent='Market pulse';etfs.querySelector('.home-heading>span').textContent='Index & asset ETF proxies · daily closes';
 const tech=document.createElement('section');tech.className='home-section dashboard-tech';tech.innerHTML='<div class="home-heading"><h2>Tech & Nasdaq ETFs</h2><span>Daily closes · 1M charts</span></div><div id="homeTechETFs" class="quote-grid"></div>';market.append(tech);$('#homeTechETFs').innerHTML=HOME_TECH_ETFS.map(quoteCard).join('');
 const conditions=home.querySelector('.home-conditions');market.append(conditions);conditions.querySelector('h2').textContent='Rates, risk & next events';
 const pulse=document.createElement('section');pulse.id='dashboardPulse';pulse.className='dashboard-pulse';pulse.setAttribute('aria-label','Political disclosure activity');market.after(pulse);
 const grid=document.createElement('div');grid.className='dashboard-intelligence';
 const moves=$('#homePurchases').closest('.home-section');moves.before(grid);grid.append(moves);moves.classList.add('dashboard-trades');
 const side=document.createElement('aside');side.className='dashboard-side';side.setAttribute('aria-label','Market movers and shared political buying');grid.append(side);
 const movers=document.createElement('section');movers.className='home-section dashboard-movers';movers.innerHTML='<div class="home-heading"><h2>Stocks in motion</h2><button data-view="market">Workspace ↗</button></div><div id="dashboardBreadth"></div><div id="dashboardMovers"></div>';side.append(movers);
 side.append($('#homeSharedBuys').closest('.home-section'));
 const focus=home.querySelector('.home-focus');const body=document.createElement('div');body.className='dashboard-body';grid.before(body);body.append(grid,focus);focus.querySelector('h1').textContent='Research & catalysts';
 // Keep both independently pausable ribbons together, below the market overview.
 const favorites=home.querySelector('.favorites-ribbon:not(.purchases-ribbon)'),purchases=home.querySelector('.purchases-ribbon');pulse.after(favorites);favorites.after(purchases);
 const stocks=$('#homeStocks').closest('.home-section');body.after(stocks);stocks.querySelector('h2').textContent='Equity watch';
 const macro=home.querySelector('.home-macro');stocks.after(macro);macro.open=true;
 home.querySelector('.home-extra>summary').textContent='Unassessed leads & bookmark management';
 renderDashboard();
})();
