const HOUSE='https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/';
const SENATE='https://efdsearch.senate.gov/search/view/ptr/b2bdf363-af39-43c8-ae93-13ed14aa3752/';
const SECONDARY='https://coldpine.io/filings/thomas-h-tuberville-ptr-2026-01-15-237';
const SEED=[];
const PERFORMANCE_SOURCE='https://www.benzinga.com/news/politics/26/01/49980468/top-10-congress-stock-traders-2025-nancy-pelosi-marjorie-taylor-greene-both-bet-big-on-nvda-but-who';
const PERFORMANCE={'Warren Davidson':78.8,'Donald Norcross':70.8,'Terri Sewell':67.9,'Bryan Steil':62.5};
const TRUMP_SOURCE='https://open-cabinet.org/officials/trump-donald-j';
const TRUMP_PDF='https://extapps2.oge.gov/201/Presiden.nsf/PAS%2BIndex/E590116FC9631E9885258E7A002DE209/%24FILE/Donald-J-Trump-09.8.2026-278T.pdf';
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
add('Donald Trump','Executive','R','US','Not specified','2026-09-08',TRUMP_PDF,'Secondary source',[
['ABT','Abbott Laboratories','Purchase','Stock','2026-07-31','$100K–$250K'],
['ABBV','AbbVie','Purchase','Stock','2026-07-31','$50K–$100K'],
['ACN','Accenture','Purchase','Stock','2026-07-31','$50K–$100K'],
['AVGO','Broadcom','Purchase','Stock','2026-07-31','$250K–$500K'],
['CSCO','Cisco','Purchase','Stock','2026-07-31','$250K–$500K'],
['HD','Home Depot','Purchase','Stock','2026-07-31','$250K–$500K'],
['META','Meta Platforms','Purchase','Stock','2026-07-31','$100K–$250K'],
['CVX','Chevron','Sale','Stock','2026-07-31','$15K–$50K']]);
SEED.filter(r=>r.person==='Donald Trump').forEach(r=>{r.summarySource=TRUMP_SOURCE;r.notes='Selected July 31 transactions transcribed from Open Cabinet; brackets are rounded. Report signed September 8, 2026 and posted by OGE September 22. Filed uses the signature date (39 days after trade); public availability was 53 days after trade. Ownership was not independently verified from the PDF.'});
add('Warren Davidson','House','R','OH','Not specified','2026-03-25',HOUSE+'20034223.pdf','Official filing',[
['GEHC','GE HealthCare','Sale','Stock','2026-03-23','$1,001–$15,000','Owner column is blank. Filing reports 75 shares sold for $5,416.50.']]);
add('Terri Sewell','House','D','AL','Not specified','2026-04-21',HOUSE+'20034384.pdf','Official filing',[
['GEHC','GE HealthCare','Sale','Stock','2026-03-25','$1,001–$15,000','Owner column is blank.'],
['TPR','Tapestry','Sale','Stock','2026-03-25','$15,001–$50,000','Owner column is blank.']]);
add('Donald Norcross','House','D','NJ','Self (IRA)','2025-09-04','https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2025/20030894.pdf','Official filing',[
['TD','Toronto-Dominion Bank','Sale','Stock','2024-06-04','$15,001–$50,000','Historical sale from the Donald W. Norcross IRA; proceeds remained in the IRA. Notification date August 7, 2025.']]);
add('Bryan Steil','House','R','WI','Not specified','2019-07-22','https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2019/20012040.pdf','Official filing',[
['ASB','Associated Banc-Corp','Sale','Stock','2019-07-12','$1,001–$15,000'],
['BMO','Bank of Montreal','Sale','Stock','2019-07-12','$1,001–$15,000'],
['FIS','Fidelity National Information Services','Sale','Stock','2019-07-12','$15,001–$50,000'],
['FISV','Fiserv','Sale','Stock','2019-07-12','$50,001–$100,000'],
['JPM','JPMorgan Chase','Sale','Stock','2019-07-12','$1,001–$15,000'],
['MRK','Merck','Sale','Stock','2019-07-12','$1,001–$15,000'],
['USB','U.S. Bancorp','Sale','Stock','2019-07-12','$1,001–$15,000']]);
SEED.filter(r=>r.person==='Bryan Steil').forEach(r=>r.notes='Historical amended filing: July 12, 2019 trade date replaces July 22 in original report 20012039. JPMorgan brokerage account; owner column blank. Ticker as reported. These are not recent trades.');
