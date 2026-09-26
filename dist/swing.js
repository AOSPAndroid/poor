'use strict';
const CONTEXT_ASSETS=[['TLT','Long Treasuries','Sensitive to long-term yields; falling prices often accompany rising yields.'],['IEF','7–10y Treasuries','Intermediate Treasury price exposure.'],['HYG','High-yield credit','Corporate credit and rate risk; this is not a credit-spread measure.'],['LQD','Investment grade','Corporate bonds: exposed to both credit risk and interest rates.'],['UUP','US dollar','Dollar-futures fund proxy; a stronger dollar can affect overseas earnings.'],['USO','Oil','Oil-futures fund proxy; roll effects mean this is not spot oil.']];
let swingHorizon=read('poor-swing-horizon','short')==='position'?'position':'short';
function closeSeries(p){return Object.entries(p?.closes||{}).filter(([d,v])=>validDate(d)&&d<=p.asOf&&Number.isFinite(v)&&v>0).sort((a,b)=>a[0].localeCompare(b[0]))}
function periodReturn(p,n){const a=closeSeries(p);return a.length>n?(a.at(-1)[1]/a.at(-1-n)[1]-1)*100:null}
function relativeReturn(p,benchmark,n){const a=closeSeries(p);if(a.length<=n)return null;const first=a.at(-1-n),last=a.at(-1),b0=benchmark?.closes?.[first[0]],b1=benchmark?.closes?.[last[0]];return b0>0&&b1>0?(last[1]/first[1]-b1/b0)*100:null}
function technicals(p){
 const series=closeSeries(p),values=series.map(x=>x[1]),len=values.length,last=values.at(-1),avg=a=>a.reduce((s,x)=>s+x,0)/a.length;
 const sma=n=>len>=n?avg(values.slice(-n)):null;let rsi=null,atr=null,relativeVolume=null;
 if(len>=15){let gains=0,losses=0;for(let i=1;i<=14;i++){const d=values[i]-values[i-1];gains+=Math.max(d,0);losses+=Math.max(-d,0)}gains/=14;losses/=14;for(let i=15;i<len;i++){const d=values[i]-values[i-1];gains=(gains*13+Math.max(d,0))/14;losses=(losses*13+Math.max(-d,0))/14}rsi=gains===0&&losses===0?50:losses===0?100:100-100/(1+gains/losses)}
 // Restart the ATR sequence after missing OHLC data; never bridge a missing bar.
 let ranges=[];for(let i=1;i<len;i++){const bar=p.bars?.[series[i][0]];if(!bar||!Number.isFinite(bar.high)||!Number.isFinite(bar.low)){ranges=[];continue}ranges.push(Math.max(bar.high-bar.low,Math.abs(bar.high-values[i-1]),Math.abs(bar.low-values[i-1])))}
 if(ranges.length>=14){atr=avg(ranges.slice(0,14));for(const tr of ranges.slice(14))atr=(atr*13+tr)/14}
 const vols=series.slice(-21).map(([d])=>p.bars?.[d]?.volume);if(vols.length===21&&vols.every(v=>Number.isFinite(v)&&v>=0)){const base=avg(vols.slice(0,-1));if(base>0)relativeVolume=vols.at(-1)/base}
 const prior=values.slice(-21,-1);return {last,sma20:sma(20),sma50:sma(50),sma200:sma(200),rsi,atr,relativeVolume,priorHigh20:prior.length===20?Math.max(...prior):null,asOf:series.at(-1)?.[0]};
}
function setSwingHorizon(value){swingHorizon=value==='position'?'position':'short';persist('poor-swing-horizon',swingHorizon);renderSwing();renderContext();if(typeof renderSector==='function'){renderSector();renderEarnings()}}
function metric(label,value,note){return `<div class="swing-metric"><small>${esc(label)}</small><strong>${esc(value)}</strong><span>${esc(note||'')}</span></div>`}
function renderSwing(){
 if(!$('#swingMetrics'))return;const p=PRICES[marketSymbol],t=technicals(p),n=swingHorizon==='short'?20:60,rs=relativeReturn(p,PRICES.SPY,n),ma=swingHorizon==='short'?t.sma20:t.sma50,fmt=v=>Number.isFinite(v)?money(v,p?.currency||'USD'):'—';
 $('#swingHorizon').value=swingHorizon;
 const distance=ma?(t.last/ma-1)*100:null;
 $('#swingMetrics').innerHTML=metric(swingHorizon==='short'?'20-day average':'50-day average',fmt(ma),distance===null?'More history needed':signed(distance)+' close vs average')+metric('200-day average',fmt(t.sma200),t.sma200?(t.last>=t.sma200?'Close above':'Close below'):'More history needed')+metric('RSI · 14',t.rsi===null?'—':t.rsi.toFixed(1),t.rsi===null?'More history needed':t.rsi>=70?'Elevated momentum':t.rsi<=30?'Weak momentum':'Middle range')+metric('ATR · 14',fmt(t.atr),t.atr&&t.last?(t.atr/t.last*100).toFixed(2)+'% of price · daily range':'OHLC history unavailable')+metric('Volume / prior 20d',t.relativeVolume===null?'—':t.relativeVolume.toFixed(2)+'×','Latest completed session')+metric(`${n}d vs SPY`,rs===null?'—':(rs>=0?'+':'')+rs.toFixed(2)+' pp','Matched start / end dates');
 $('#swingContext').textContent=t.asOf?`Close ${date(t.asOf)}${p.stale?' · stale':''} · ${t.priorHigh20===null?'20-session closing high unavailable':`Prior 20-session closing high ${fmt(t.priorHigh20)} · ${t.last>t.priorHigh20?'close above':'close at/below'}`} · ${swingHorizon==='short'?'2–20 trading days':'several weeks to 3 months'}`:'Waiting for price history';
}
function renderContext(){
 if(!$('#contextAssets'))return;const n=swingHorizon==='short'?5:20;
 $('#contextHorizon').value=swingHorizon;
 $('#contextAssets').innerHTML=CONTEXT_ASSETS.map(([symbol,name,help])=>{const p=PRICES[symbol],r=periodReturn(p,n);return `<button class="context-asset" data-ticker="${symbol}" title="${esc(help)}"><span><b>${symbol}</b><small>${name}</small></span><strong class="${r===null?'muted':r>=0?'gain':'loss'}">${r===null?'—':signed(r)}</strong><small>${n} sessions · ${p?date(p.asOf)+(p.stale?' · stale':''):'unavailable'}</small></button>`}).join('');
 const spy=technicals(PRICES.SPY),spy50=spy.sma50;$('#contextSummary').textContent=spy50?`SPY ${(spy.last/spy50-1)*100>=0?'above':'below'} 50d average · ${date(spy.asOf)}`:'Market history loading';
}
if(typeof window!=='undefined'){
 $('#swingHorizon').onchange=e=>setSwingHorizon(e.target.value);$('#contextHorizon').onchange=e=>setSwingHorizon(e.target.value);
 renderSwing();renderContext();loadMarketPrices(CONTEXT_ASSETS.map(a=>a[0])).then(()=>{renderContext();renderSwing()});
}
