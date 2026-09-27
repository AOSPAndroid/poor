'use strict';
function mapPriceSeries(p){
 if(!p?.asOf)return [];
 const end=Date.parse(p.asOf.slice(0,10)+'T00:00:00Z');if(!Number.isFinite(end))return [];
 const start=end-30*86400000;
 return Object.entries(p.closes||{}).filter(([d,v])=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&Date.parse(d+'T00:00:00Z')>=start&&Date.parse(d+'T00:00:00Z')<=end&&Number.isFinite(v)&&v>0).sort(([a],[b])=>a.localeCompare(b));
}
function mapPriceHTML(symbol){
 const p=PRICES[symbol],points=mapPriceSeries(p),state=marketHistoryState.get(symbol);
 if(points.length<2)return `<div class="map-mini-empty">${p?.latest>0?`<strong>${esc(money(p.latest,p.currency))}</strong>`:''}<small>${state==='error'?'Price history unavailable · use Refresh evidence':state==='ready'?'Not enough recent price history':'Loading price history…'}</small></div>`;
 const first=points[0],last=points.at(-1),change=(last[1]/first[1]-1)*100,values=points.map(([,v])=>v),low=Math.min(...values),high=Math.max(...values),span=high-low;
 const xy=points.map(([,v],i)=>[4+i/(points.length-1)*252,span?70-(v-low)/span*62:39]),path=xy.map(([x,y],i)=>(i?'L':'M')+x.toFixed(2)+' '+y.toFixed(2)).join(' '),color=change>0?'#198666':change<0?'#c74a56':'#63756e';
 return `<div class="map-mini-quote"><strong>${esc(money(last[1],p.currency))}</strong><span style="color:${color}">${esc(signed(change))}<small> · 1M</small></span></div><svg class="map-mini-chart" viewBox="0 0 260 78" role="img" aria-label="${esc(symbol)} closing prices, ${esc(date(first[0]))} to ${esc(date(last[0]))}, ${esc(signed(change))}"><path d="${path} L256 77 L4 77 Z" fill="${color}" opacity=".09"/><path d="${path}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/><circle cx="256" cy="${xy.at(-1)[1].toFixed(2)}" r="3.5" fill="${color}"/></svg><small class="map-mini-asof">Daily close ${esc(date(last[0]))}${p.stale?' · stale':''}</small>`;
}
function renderMapPrice(){const el=$('#mapMiniPrice');if(view==='map'&&mapMode==='stock'&&el?.dataset.symbol===mapTicker)el.innerHTML=mapPriceHTML(mapTicker)}
async function refreshMapPrice(){const symbol=mapTicker;const request=loadMarketPrices([symbol]);renderMapPrice();await request;if(mapTicker===symbol)renderMapPrice()}
