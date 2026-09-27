'use strict';
// Reviewed 2026-09-26 against the publisher's annual portfolio charts.
// Values are disclosure-based estimates, not audited or copy-trading results.
const ROSTER_SOURCES={2024:'https://unusualwhales.com/images/report/portfolio_change_member1_percent.webp',2025:'https://unusualwhales.com/congress_images_2025/01_Hall_of_Fame_active.png'};
const ROSTER={
 'Nancy Pelosi':{chamber:'House',party:'D',state:'CA',returns:{2024:70.9,2025:20.1}},
 'Debbie Wasserman Schultz':{chamber:'House',party:'D',state:'FL',returns:{2024:142.3,2025:28.0}},
 'Tom Suozzi':{chamber:'House',party:'D',state:'NY',returns:{2024:62.7,2025:33.8}},
 'Dwight Evans':{chamber:'House',party:'D',state:'PA',returns:{2024:41.9,2025:41.9}},
 'Markwayne Mullin':{chamber:'Senate',party:'R',state:'OK',returns:{2024:28.0,2025:18.6}},
 'Ron Wyden':{chamber:'Senate',party:'D',state:'OR',coverageOnly:true,returns:{2024:123.8}},
 'Susan Collins':{chamber:'Senate',party:'R',state:'ME',coverageOnly:true,returns:{2024:77.5}},
 'Dan Sullivan':{chamber:'Senate',party:'R',state:'AK',coverageOnly:true,returns:{2024:47.5}},
 'Rick Scott':{chamber:'Senate',party:'R',state:'FL',coverageOnly:true,returns:{2025:54.8}}
};
function rosterName(name){const n=name.toLowerCase().replace(/[^a-z]/g,''),aliases={ronlwyden:'Ron Wyden',ronaldwyden:'Ron Wyden',susanmcollins:'Susan Collins',danielsullivan:'Dan Sullivan',danielssullivan:'Dan Sullivan',richardlscott:'Rick Scott',ricklscott:'Rick Scott',debbieschultz:'Debbie Wasserman Schultz',thomassuozzi:'Tom Suozzi',thomasrsuozzi:'Tom Suozzi'};return aliases[n]||Object.keys(ROSTER).find(p=>n===p.toLowerCase().replace(/[^a-z]/g,''))||null}
function selectedRecords(records){return records.filter(r=>rosterName(r.person)).map(r=>({...r,person:rosterName(r.person)}))}
function annualRecord(person){const p=ROSTER[person];if(!p)return '';return `<div class="annual-record"><strong>${p.coverageOnly?'Tracking · consistency not established':'Beat report benchmark · 2 / 2 years'}</strong><div>${Object.entries(p.returns).map(([year,value])=>`<a href="${ROSTER_SOURCES[year]}" target="_blank" rel="noopener">${year} <b>+${value.toFixed(1)}%</b> ↗</a>`).join('')}</div><small>Estimated stock portfolios · Unusual Whales${p.coverageOnly?' · other year not verified':''}</small></div>`}

// Current offices verified against official sources on 2026-09-27.
// Historical transaction chamber fields retain the office associated with the filing.
const POLITICIAN_ROLES={"Nancy Pelosi": {"title": "U.S. Representative, California", "source": "https://pelosi.house.gov/biography"}, "Debbie Wasserman Schultz": {"title": "U.S. Representative, Florida", "source": "https://www.house.gov/representatives"}, "Tom Suozzi": {"title": "U.S. Representative, New York", "source": "https://www.house.gov/representatives"}, "Dwight Evans": {"title": "U.S. Representative, Pennsylvania", "source": "https://evans.house.gov/"}, "Markwayne Mullin": {"title": "Homeland Security Secretary", "source": "https://www.whitehouse.gov/releases/2026/03/secretary-markwayne-mullin-is-ready-to-deliver-on-president-trumps-agenda/"}, "Ron Wyden": {"title": "U.S. Senator, Oregon", "source": "https://www.wyden.senate.gov/"}, "Susan Collins": {"title": "U.S. Senator, Maine", "source": "https://www.collins.senate.gov/"}, "Dan Sullivan": {"title": "U.S. Senator, Alaska", "source": "https://www.sullivan.senate.gov/"}, "Rick Scott": {"title": "U.S. Senator, Florida", "source": "https://www.rickscott.senate.gov/"}};
function politicianTitle(person){const chamber=(typeof signalData!=='undefined'?signalData:[]).find(r=>r.person===person)?.chamber;return POLITICIAN_ROLES[person]?.title||(chamber==='Senate'?'Senate disclosure filer':chamber==='Executive'?'Executive disclosure filer':'House disclosure filer')}
function politicianRole(person){return `<span class="politician-role" title="${POLITICIAN_ROLES[person]?'Current role · checked September 27, 2026':'Role recorded in filings; current office not verified'}">${esc(politicianTitle(person))}</span>${typeof ratingBadge==='function'?ratingBadge(person):''}`}
