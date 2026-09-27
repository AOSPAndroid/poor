'use strict';
function transactionLabel(r){return r.type==='Sale'?'Sold on':r.type==='Exercise'?'Exercised on':'Bought on'}
function disclosedDate(r){
 if(r.disclosed&&/^\d{4}-\d{2}-\d{2}$/.test(r.disclosed))return r.disclosed;
 if(r.chamber!=='Executive')return r.filed;
 // OGE publication date verified for this report; other signature dates are not publication dates.
 if(r.source.includes('E590116FC9631E9885258E7A002DE209'))return '2026-09-22';
 return null;
}
function disclosureDelay(r){const d=disclosedDate(r);return d?Math.round((Date.parse(d)-Date.parse(r.traded))/86400000):null}
function disclosureReturn(r){const p=priceReturn(r),d=disclosedDate(r),basis=PRICES[r.ticker.trim().toUpperCase()]?.closes?.[d];return p&&d&&d<=p.asOf&&basis>0?{...p,then:basis,pct:(p.latest/basis-1)*100,basisDate:d}:null}
function percent(p){return `${p.pct>=0?'+':''}${p.pct.toFixed(1)}%`}
function priceReturn(r){
 if(!['Purchase','Exercise'].includes(r.type))return null;
 const p=PRICES[r.ticker.trim().toUpperCase()];
 if(!p||p.error||!['Stock','ADR','ETF','Call options','Partnership units'].includes(r.asset))return null;
 const then=p.closes[r.traded];
 if(!(then>0)||!(p.latest>0)||p.asOf<r.traded)return null;
 return {then,latest:p.latest,pct:(p.latest/then-1)*100,asOf:p.asOf,source:p.source,currency:p.currency,stale:p.stale,checkedAt:p.checkedAt,underlying:r.asset==='Call options'};
}
function money(n,currency='USD'){return new Intl.NumberFormat('en-US',{style:'currency',currency,minimumFractionDigits:2,maximumFractionDigits:2}).format(n)}
function priceCells(r){const p=priceReturn(r),d=disclosureReturn(r);if(!p)return '<td class="price-then muted"><span class="mobile-label">Trade-day close</span>Unavailable</td><td class="price-now muted"><span class="mobile-label">Latest close</span>Unavailable</td><td class="return-cell muted"><span class="mobile-label">Since trade</span>—</td><td class="public-return muted"><span class="mobile-label">Since disclosure</span>—</td>';
 return `<td class="price-then"><span class="mobile-label">Trade-day close</span>${money(p.then,p.currency)}<small>${p.underlying?'Underlying stock':'Market close'}</small></td><td class="price-now" title="Close ${date(p.asOf)}"><span class="mobile-label">Latest close</span>${money(p.latest,p.currency)}<small>${date(p.asOf)}${p.stale?' · stale':''}</small></td><td class="return-cell ${p.pct>=0?'gain':'loss'}"><span class="mobile-label">Since trade</span><strong>${percent(p)}</strong>${p.underlying?'<small>stock only</small>':''}</td><td class="public-return ${d?(d.pct>=0?'gain':'loss'):'muted'}"><span class="mobile-label">Since disclosure</span><strong>${d?percent(d):'—'}</strong><small>${d?'From disclosed-day close':'Price/date unavailable'}</small></td>`;
}
function returnDetails(r){const p=priceReturn(r);if(!p)return '<p class="muted">Price return unavailable for this transaction.</p>';
 const d=disclosureReturn(r);
 return `<div class="return-detail"><strong class="${p.pct>=0?'gain':'loss'}">${p.pct>=0?'+':''}${p.pct.toFixed(2)}% ${p.underlying?'underlying stock change':'price change'} since trade</strong><p>Trade-day close: ${money(p.then,p.currency)} · ${date(r.traded)}<br>Latest close: ${money(p.latest,p.currency)} · ${date(p.asOf)}<br>${d?`Disclosed-day close: ${money(d.then,d.currency)} · ${date(d.basisDate)}<br>Change since disclosure: <strong>${percent(d)}</strong>`:'Change since disclosure: price or publication date unavailable.'}<br><a href="${esc(p.source)}" target="_blank" rel="noopener">Yahoo price history ↗</a></p><p class="muted">Split-adjusted daily closes; excludes dividends, fees and taxes. Trade-day close is a benchmark, not the execution price. ${p.underlying?'This is not the option’s return. Option premiums are unavailable.':r.type==='Exercise'?'Measured from the exercise-day market close, not the option strike or original cost.':'Assumes holding through the latest dated close; not the politician’s realized profit.'} Disclosure-day close is a comparison benchmark, not a guarantee that the filing was available before market close.</p></div>`;
}
