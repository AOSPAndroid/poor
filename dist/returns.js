'use strict';
function priceReturn(r){
 if(!['Purchase','Exercise'].includes(r.type))return null;
 const p=PRICES[r.ticker.trim().toUpperCase()];
 if(!p||p.error||!['Stock','ADR','ETF','Call options','Partnership units'].includes(r.asset))return null;
 const then=p.closes[r.traded];
 if(!(then>0)||!(p.latest>0)||p.asOf<r.traded)return null;
 return {then,latest:p.latest,pct:(p.latest/then-1)*100,asOf:p.asOf,source:p.source,currency:p.currency,stale:p.stale,checkedAt:p.checkedAt,underlying:r.asset==='Call options'};
}
function money(n,currency='USD'){return new Intl.NumberFormat('en-US',{style:'currency',currency,minimumFractionDigits:2,maximumFractionDigits:2}).format(n)}
function priceCells(r){const p=priceReturn(r);if(!p)return '<td class="price-then muted">—</td><td class="price-now muted">—</td><td class="return-cell muted" title="No comparable purchase price data">—</td>';
 return `<td class="price-then">${money(p.then,p.currency)}</td><td class="price-now" title="Close ${esc(p.asOf)}">${money(p.latest,p.currency)}<small>${esc(p.asOf)}${p.stale?' · stale':''}</small></td><td class="return-cell ${p.pct>=0?'gain':'loss'}"><strong>${p.pct>=0?'+':''}${p.pct.toFixed(1)}%</strong>${p.underlying?'<small>stock only</small>':''}</td>`;
}
function returnDetails(r){const p=priceReturn(r);if(!p)return '<p class="muted">Price return unavailable for this transaction.</p>';
 return `<div class="return-detail"><strong class="${p.pct>=0?'gain':'loss'}">${p.pct>=0?'+':''}${p.pct.toFixed(2)}% ${p.underlying?'underlying stock change':'price change'}</strong><p>${money(p.then,p.currency)} on ${date(r.traded)} → ${money(p.latest,p.currency)} on ${date(p.asOf)}. <a href="${esc(p.source)}" target="_blank" rel="noopener">Yahoo price history ↗</a></p><p class="muted">Split-adjusted daily closes; excludes dividends, fees and taxes. Trade-day close is a benchmark, not the execution price. ${p.underlying?'This is not the option’s return. Option premiums are unavailable.':r.type==='Exercise'?'Measured from the exercise-day market close, not the option strike or original cost.':'Assumes holding through the latest dated close; not the politician’s realized profit.'}</p></div>`;
}
