'use strict';
function inferredPortfolio(person,records=data){
 const today=new Date().toISOString().slice(0,10),rows=records.filter(r=>r.person===person&&r.quality!=='User-provided'&&r.traded<=today&&disclosedDate(r)&&disclosedDate(r)<=today),groups=new Map();
 const equity=r=>['Stock','ADR','ETF','Partnership units'].includes(r.asset),knownOwner=r=>r.owner&&r.owner!=='Not specified';
 for(const r of rows){if(!['Purchase','Exercise','Sale'].includes(r.type))continue;const key=JSON.stringify([r.ticker,r.ticker==='—'?r.company:'',r.asset,r.owner||'Not specified']);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r)}
 const held=[],uncertain=[];
 for(const group of groups.values()){
  group.sort((a,b)=>b.traded.localeCompare(a.traded)||disclosedDate(b).localeCompare(disclosedDate(a)));
  const r=group[0],buys=group.filter(x=>x.type==='Purchase'||x.type==='Exercise'&&equity(x)),buy=buys[0];
  // An unspecified owner or instrument cannot safely close a particular position.
  const sales=rows.filter(x=>x.type==='Sale'&&x.ticker===r.ticker&&(r.ticker!=='—'||x.company===r.company)&&(!knownOwner(x)||!knownOwner(r)||x.owner===r.owner)&&(x.asset===r.asset||x.asset==='Unclassified'||r.asset==='Unclassified')).sort((a,b)=>b.traded.localeCompare(a.traded)||disclosedDate(b).localeCompare(disclosedDate(a)));
  const laterSale=buy&&sales.find(x=>x.traded>=buy.traded),validTicker=/^[A-Z][A-Z0-9.-]{0,11}$/.test(r.ticker);
  const presumed=!!buy&&equity(r)&&validTicker&&!laterSale;
  const last=laterSale||r,status=presumed?'Presumed held':!validTicker?'Ticker unresolved':!equity(r)?'Instrument / contract status unknown':laterSale?'Sale disclosed; balance unknown':'Sale only; balance unknown';
  (presumed?held:uncertain).push({ticker:r.ticker,company:r.company,asset:r.asset,owner:r.owner||'Not specified',buy,last,status,presumed});
 }
 const sort=(a,b)=>b.last.traded.localeCompare(a.last.traded)||a.ticker.localeCompare(b.ticker);
 return {held:held.sort(sort),uncertain:uncertain.sort(sort),asOf:rows.map(disclosedDate).sort().at(-1)};
}
function portfolioRow(p){const r=p.last,source=/^https:\/\//.test(r.source)?`<a href="${esc(r.source)}" target="_blank" rel="noopener">Filing ↗</a>`:'Source unavailable';return `<div class="holding-row"><div class="holding-top"><button class="ticker-link" data-ticker="${esc(p.ticker)}">${esc(p.ticker)}</button><span>${esc(p.asset)} · ${esc(p.owner)}</span></div><div class="holding-company">${esc(p.company)}</div><div class="holding-dates">${p.buy?`${p.buy.type==='Exercise'?'Shares acquired':'Last buy'} ${date(p.buy.traded)}`:'No purchase in loaded history'}${r.type==='Sale'?` · Last sale ${date(r.traded)}`:''}<br>Disclosed ${date(disclosedDate(r))} · ${source}</div><div class="holding-status ${p.presumed?'':'muted'}">${p.presumed?'Presumed held · no later sale found':esc(p.status)}</div><small>Last ${r.type==='Sale'?'sale':'acquisition'} amount: ${esc(r.amount)} <span class="muted">(transaction, not position value)</span></small></div>`}
function portfolioCard(person){const p=inferredPortfolio(person),rows=p.held;return `<section class="politician-portfolio" aria-label="${esc(person)} portfolio"><h3>Portfolio <span>${rows.length} presumed</span></h3><p class="portfolio-note">Inferred from loaded filings${p.asOf?' through '+date(p.asOf):''}. Undisclosed sales and older holdings may be missing. Quantities and current value unknown.</p>${rows.slice(0,4).map(portfolioRow).join('')||'<p class="muted">No holdings can be inferred from the loaded purchases. This does not mean an empty portfolio.</p>'}${rows.length>4?`<details><summary>${rows.length-4} more presumed holdings</summary>${rows.slice(4).map(portfolioRow).join('')}</details>`:''}${p.uncertain.length?`<details class="uncertain-holdings"><summary>Sales, options & unresolved positions (${p.uncertain.length})</summary>${p.uncertain.map(portfolioRow).join('')}</details>`:''}</section>`}
