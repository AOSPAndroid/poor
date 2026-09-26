const HOUSE='https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/';
const SENATE='https://efdsearch.senate.gov/search/view/ptr/b2bdf363-af39-43c8-ae93-13ed14aa3752/';
const SECONDARY='https://coldpine.io/filings/thomas-h-tuberville-ptr-2026-01-15-237';
const SEED=[];
function add(person,chamber,party,state,owner,filed,source,quality,items){items.forEach((a,i)=>SEED.push({id:source+'#'+i,person,chamber,party,state,owner,filed,source,quality,ticker:a[0],company:a[1],type:a[2],asset:a[3],traded:a[4],amount:a[5],notes:a[6]||''}));}
add('Nancy Pelosi','House','D','CA','Spouse','2026-08-21',HOUSE+'20035143.pdf','Official filing',[
['BE','Bloom Energy','Purchase','Stock','2026-07-24','$1,000,001–$5,000,000','10,000 shares reported.'],
['BE','Bloom Energy','Purchase','Call options','2026-07-24','$1,000,001–$5,000,000','100 calls; $100 strike; expires June 17, 2027.'],
['BE','Bloom Energy','Purchase','Stock','2026-07-28','$500,001–$1,000,000','5,000 shares reported.'],
['BE','Bloom Energy','Purchase','Call options','2026-07-28','$500,001–$1,000,000','100 calls; $100 strike; expires June 17, 2027.'],
['INTC','Intel','Purchase','Call options','2026-07-24','$250,001–$500,000','50 calls; $50 strike; expires June 17, 2027.'],
['INTC','Intel','Purchase','Stock','2026-07-24','$500,001–$1,000,000','10,000 shares reported.']]);
add('Nancy Pelosi','House','D','CA','Spouse','2026-01-23',HOUSE+'20033725.pdf','Official filing',[
['AB','AllianceBernstein','Purchase','Partnership units','2026-01-16','$1,000,001–$5,000,000','25,000 units reported.'],
['GOOGL','Alphabet','Exercise','Stock','2026-01-16','$500,001–$1,000,000','50 calls exercised into 5,000 shares at a $150 strike. Filing codes this as a purchase.'],
['GOOGL','Alphabet','Purchase','Call options','2025-12-30','$250,001–$500,000','20 calls; $150 strike; expires January 15, 2027.'],
['AMZN','Amazon','Purchase','Call options','2025-12-30','$100,001–$250,000','20 calls; $120 strike; expires January 15, 2027.'],
['AMZN','Amazon','Sale','Stock','2025-12-24','$1,000,001–$5,000,000','Partial sale of 20,000 shares.'],
['AAPL','Apple','Sale','Stock','2025-12-24','$5,000,001–$25,000,000','Partial sale of 45,000 shares.'],
['NVDA','NVIDIA','Purchase','Call options','2025-12-30','$100,001–$250,000','20 calls; $100 strike; expires January 15, 2027.'],
['NVDA','NVIDIA','Exercise','Stock','2026-01-16','$250,001–$500,000','50 calls exercised into 5,000 shares at an $80 strike. Filing codes this as a purchase.']]);
add('Josh Gottheimer','House','D','NJ','Joint','2026-01-14',HOUSE+'20033756.pdf','Official filing',[
['APD','Air Products','Sale','Stock','2025-12-08','$15,001–$50,000','Partial sale. Morgan Stanley managed account.'],
['LNG','Cheniere Energy','Sale','Stock','2025-12-12','$1,001–$15,000','Morgan Stanley managed account.'],
['CVLT','Commvault','Sale','Stock','2025-12-05','$1,001–$15,000','Morgan Stanley managed account.'],
['MTHRY','M3','Sale','ADR','2025-12-05','$1,001–$15,000','Morgan Stanley managed account.'],
['SE','Sea Limited','Sale','ADR','2025-12-05','$1,001–$15,000','Morgan Stanley managed account.'],
['NOW','ServiceNow','Sale','Stock','2025-12-17','$1,001–$15,000','Partial sale. Morgan Stanley managed account.'],
['SSMXY','Sysmex','Sale','ADR','2025-12-05','$1,001–$15,000','Partial sale. Morgan Stanley managed account.'],
['UBER','Uber','Sale','Stock','2025-12-11','$1,001–$15,000','Partial sale. Morgan Stanley managed account.'],
['UTZ','Utz Brands','Sale','Stock','2025-12-08','$1,001–$15,000','Morgan Stanley managed account.']]);
add('Tommy Tuberville','Senate','R','AL','Self','2026-01-15',SENATE,'Secondary source',[
['XLU','Utilities Select Sector SPDR','Purchase','ETF','2025-12-17','$15K–$50K','Range as rounded by Coldpine. Historical original report; later amendments not reconciled.'],
['XLP','Consumer Staples Select Sector SPDR','Purchase','ETF','2025-12-17','$15K–$50K','Range as rounded by Coldpine. Historical original report; later amendments not reconciled.'],
['XLV','Health Care Select Sector SPDR','Purchase','ETF','2025-12-17','$15K–$50K','Range as rounded by Coldpine. Historical original report; later amendments not reconciled.'],
['AAPL','Apple','Sale','Stock','2025-12-17','$50K–$100K','Range as rounded by Coldpine. Historical original report; later amendments not reconciled.'],
['GOOGL','Alphabet','Sale','Stock','2025-12-17','$1K–$15K','Range as rounded by Coldpine. Historical original report; later amendments not reconciled.']]);
