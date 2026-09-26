'use strict';
// Reviewed 2026-09-26 against the publisher's annual portfolio charts.
// Values are disclosure-based estimates, not audited or copy-trading results.
const ROSTER_SOURCES={2024:'https://unusualwhales.com/images/report/portfolio_change_member1_percent.webp',2025:'https://unusualwhales.com/congress_images_2025/01_Hall_of_Fame_active.png'};
const ROSTER={
 'Nancy Pelosi':{chamber:'House',party:'D',state:'CA',returns:{2024:70.9,2025:20.1}},
 'Debbie Wasserman Schultz':{chamber:'House',party:'D',state:'FL',returns:{2024:142.3,2025:28.0}},
 'Tom Suozzi':{chamber:'House',party:'D',state:'NY',returns:{2024:62.7,2025:33.8}},
 'Dwight Evans':{chamber:'House',party:'D',state:'PA',returns:{2024:41.9,2025:41.9}},
 'Markwayne Mullin':{chamber:'Senate',party:'R',state:'OK',returns:{2024:28.0,2025:18.6}}
};
function rosterName(name){const n=name.toLowerCase().replace(/[^a-z]/g,'');return Object.keys(ROSTER).find(p=>n===p.toLowerCase().replace(/[^a-z]/g,'')||(p==='Debbie Wasserman Schultz'&&n==='debbieschultz')||(p==='Tom Suozzi'&&['thomassuozzi','thomasrsuozzi'].includes(n)))||null}
function selectedRecords(records){return records.filter(r=>rosterName(r.person)).map(r=>({...r,person:rosterName(r.person)}))}
function annualRecord(person){const p=ROSTER[person];if(!p)return '';return `<div class="annual-record"><strong>Beat report benchmark · 2 / 2 years</strong><div>${Object.entries(p.returns).map(([year,value])=>`<a href="${ROSTER_SOURCES[year]}" target="_blank" rel="noopener">${year} <b>+${value.toFixed(1)}%</b> ↗</a>`).join('')}</div><small>Estimated stock portfolios · 2024–2025 · Unusual Whales</small></div>`}
