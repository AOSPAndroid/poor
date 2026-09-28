export function personalValidate(t,now=Date.now()){
 if(!t||typeof t.id!=='string'||!/^[-a-zA-Z0-9]{1,80}$/.test(t.id)||!['buy','sell','dividend'].includes(t.type)||!/^([A-Z][A-Z0-9.-]{0,11})$/.test(t.symbol)||!['USD','EUR','GBP','CAD','CHF','JPY','AUD'].includes(t.currency))throw Error('Invalid transaction');
 if(typeof t.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(t.date)||!Number.isFinite(Date.parse(t.date))||new Date(t.date).toISOString().slice(0,10)!==t.date||t.date<'1970-01-01'||t.date>new Date(now).toISOString().slice(0,10))throw Error('Use a valid purchase/payment date, not a future date');
 for(const k of ['quantity','price','fees'])if(!Number.isFinite(t[k])||t[k]<0||t[k]>1e10)throw Error('Invalid quantity, price or fee');
 if(t.price<=0||(t.type!=='dividend'&&t.quantity<=0)||t.quantity*t.price>1e13)throw Error('Enter positive shares and price');
 if(typeof t.notes!=='string'||t.notes.length>500)throw Error('Notes must be at most 500 characters');
 return {id:t.id,type:t.type,symbol:t.symbol,currency:t.currency,date:t.date,quantity:t.type==='dividend'?0:t.quantity,price:t.price,fees:t.fees,notes:t.notes};
}
export function personalPositions(transactions){
 const positions=new Map();let realized=0,dividends=0,fees=0;
 for(const t of [...transactions].sort((a,b)=>a.date.localeCompare(b.date)||(a.order||0)-(b.order||0))){const key=t.symbol+'|'+t.currency;
  if(!positions.has(key))positions.set(key,{symbol:t.symbol,currency:t.currency,quantity:0,cost:0,firstBuy:null,realized:0,dividends:0});
  const p=positions.get(key);fees+=t.fees;
  if(t.type==='buy'){p.quantity+=t.quantity;p.cost+=t.quantity*t.price+t.fees;p.firstBuy??=t.date}
  if(t.type==='sell'){if(t.quantity>p.quantity+1e-8)throw Error('Sale exceeds recorded holdings for '+t.symbol+' on '+t.date);const basis=p.quantity?t.quantity/p.quantity*p.cost:0,gain=t.quantity*t.price-t.fees-basis;p.quantity-=t.quantity;p.cost-=basis;p.realized+=gain;realized+=gain;if(p.quantity<1e-8){p.quantity=0;p.cost=0}}
  if(t.type==='dividend'){p.dividends+=t.price-t.fees;dividends+=t.price-t.fees}
 }
 return {positions:[...positions.values()],realized,dividends,fees};
}
export function personalValuation(transactions,prices,currency){
 const ledger=personalPositions(transactions.filter(t=>t.currency===currency));let value=0,cost=0,missing=0;const rows=ledger.positions.filter(p=>p.quantity>0).map(p=>{const q=prices[p.symbol],valid=q&&!q.error&&q.currency===currency&&Number.isFinite(q.latest)&&q.latest>0&&q.asOf>=(transactions.filter(t=>t.symbol===p.symbol&&t.currency===currency&&t.type!=='dividend').map(t=>t.date).sort().at(-1)||'');const worth=valid?p.quantity*q.latest:null;cost+=p.cost;if(worth===null)missing++;else value+=worth;return {...p,average:p.cost/p.quantity,value:worth,profit:worth===null?null:worth-p.cost,quote:q,stale:!!q?.stale}});
 return {...ledger,rows,cost,value:missing?null:value,pricedValue:value,missing,unrealized:missing?null:value-cost,total:missing?null:value-cost+ledger.realized+ledger.dividends};
}
export function personalHistory(transactions,prices,currency){
 const tx=transactions.filter(t=>t.currency===currency);if(!tx.length)return [];
 const start=tx.map(t=>t.date).sort()[0],days=[...new Set(tx.flatMap(t=>Object.keys(prices[t.symbol]?.closes||{})))].filter(d=>d>=start&&d<=new Date().toISOString().slice(0,10)).sort().slice(-365),points=[];
 for(const day of days){const ledger=personalPositions(tx.filter(t=>t.date<=day));let profit=ledger.realized+ledger.dividends,valid=true;
  for(const p of ledger.positions.filter(p=>p.quantity>0)){const q=prices[p.symbol],close=q?.currency===currency&&day<=q.asOf?q.closes?.[day]:null;if(!(close>0)){valid=false;break}profit+=p.quantity*close-p.cost}
  if(valid)points.push({date:day,value:profit});
 }
 return points;
}
