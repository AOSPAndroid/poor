"""Scheduled analyst-target discovery and verification through poor and Athena."""
import datetime as dt, hashlib, json, math, os, re, sys, time
from urllib.parse import urlparse
from pathlib import Path
from zoneinfo import ZoneInfo
from research_engine import PROFILE, run_report
from investigations import c
STATE=PROFILE/'poor-analyst-targets-state.json'
BANKS=['Morgan Stanley','Goldman Sachs','JPMorgan','Bank of America','Citi','UBS','Barclays','Deutsche Bank','Wells Fargo','Jefferies','RBC Capital Markets','Bernstein']
SOURCE_DOMAINS=('morganstanley.com','goldmansachs.com','jpmorgan.com','jpmorganresearch.com','bankofamerica.com','bofa.com','citi.com','ubs.com','barclays.com','db.com','wellsfargo.com','jefferies.com','rbccm.com','bernsteinresearch.com','reuters.com','bloomberg.com','cnbc.com','wsj.com','barrons.com','marketscreener.com','investing.com','benzinga.com')
def trusted_source(url):
    host=(urlparse(url).hostname or '').lower()
    return any(host==d or host.endswith('.'+d) for d in SOURCE_DOMAINS)
GUIDE=Path(__file__).with_name('agent-guides')/'ANALYST-TARGETS.md'
def save(s):
    temp=STATE.with_suffix('.tmp');temp.write_text(json.dumps(s,ensure_ascii=False),encoding='utf-8');os.replace(temp,STATE)
def validate_items(report,allowed,today,symbols):
    result=[]
    for item in report.get('items',[])[:12]:
        try:
            if item['institution'] not in BANKS or item['ticker'] not in symbols:continue
            published=dt.date.fromisoformat(item['published'])
            if not 0<=(today-published).days<=7:continue
            if item.get('currency')!='USD':continue
            old,new=item.get('oldTarget'),item.get('newTarget')
            if any(isinstance(v,bool) or not isinstance(v,(int,float)) or not math.isfinite(v) or not 0<v<100000 for v in (old,new)) or old==new:continue
            if not isinstance(item.get('sources'),list) or not item['sources'] or not all(u in allowed and u.startswith('https://') and trusted_source(u) for u in item['sources']):continue
            if not all(isinstance(item.get(k),str) and len(item[k])<=500 for k in ('analyst','rating','horizon','reason')):continue
            clean={k:item[k] for k in ('ticker','institution','analyst','published','currency','oldTarget','newTarget','rating','horizon','reason','sources')}
            result.append(clean)
        except (KeyError,ValueError,TypeError):continue
    return result

def run():
    lock=open(PROFILE/'poor-analyst-targets.lock','a+b');lock.write(b'0');lock.flush();lock.seek(0)
    if os.name=='nt':
        import msvcrt
        try:msvcrt.locking(lock.fileno(),msvcrt.LK_NBLCK,1)
        except OSError:print('Analyst research already running');return
    try:
        config=json.loads(c.CONFIG.read_text());base=config['base'];token=config['token']
        state=json.loads(STATE.read_text()) if STATE.exists() else {}
        # Deliver verified results before new research; failed publication cannot lose them.
        if state.get('pending'):
            c.request(base,'/api/research/ingest',state['pending'],token);state.pop('pending');save(state)
        today=dt.datetime.now(ZoneInfo('Europe/Paris')).date()
        if state.get('date')==str(today):print('Analyst target research already attempted today');return
        state.update(date=str(today),startedAt=time.time(),status='Running');save(state)
        try:
            archive=c.request(base,'/api/research/analyst-targets')
            try:bookmarks=c.request(base,'/api/research/priorities',token=token).get('symbols',[])
            except Exception:bookmarks=[]
            feed=c.request(base,'/api/research/politics').get('value',{}).get('rows',[])
            recent=[r.get('ticker') for r in sorted(feed,key=lambda r:r.get('filed',''),reverse=True) if r.get('type')=='Purchase']
            symbols=[s for s in dict.fromkeys(bookmarks+recent+['NVDA','BE','INTC','AVGO','MSFT','AMZN']) if isinstance(s,str) and re.fullmatch(r'[A-Z][A-Z0-9.-]{0,11}',s)][:18]
            known=[{k:x.get(k) for k in ('ticker','institution','analyst','published','newTarget')} for x in archive.get('items',[])[:80]]
            schema='Return JSON {"items":[{"ticker":"NVDA","institution":"Morgan Stanley","analyst":"name or Unknown","published":"YYYY-MM-DD","currency":"USD","oldTarget":100,"newTarget":120,"rating":"reported rating or Unknown","horizon":"stated horizon or Unknown","reason":"short sourced reason","sources":["exact URLs"]}]}. Example numbers are schema examples only. Empty items if nothing verifies. '
            prompt=GUIDE.read_text(encoding='utf-8')+'\nToday '+str(today)+'. Symbols '+json.dumps(symbols)+'. Eligible institutions '+json.dumps(BANKS)+'. Already recorded (do not repeat): '+json.dumps(known)+'. Find target revisions from the past seven days. '+schema
            report,allowed=run_report(prompt,seconds=150,max_pages=10,writing_seconds=100,search_limit=10,verified_only=True)
            extracted=set(report.get('_diagnostics',{}).get('retrievedSources',[]))
            candidates=validate_items(report,allowed&extracted,today,symbols)
            verified=[]
            if candidates:
                review,review_allowed=run_report(GUIDE.read_text(encoding='utf-8')+'\nIndependently verify these proposed revisions. Check exact analyst/institution attribution, old and new USD targets, actual publication date, share class and split basis. Remove unsupported rows. Do not copy supplied numbers without checking retrieved evidence. '+schema+'\nCandidates: '+json.dumps(candidates),initial_sources={u for x in candidates for u in x['sources']},profile=PROFILE.parent/'athena',seconds=150,max_pages=10,writing_seconds=100,search_limit=10,verified_only=True)
                reviewed=validate_items(review,review_allowed&set(review.get('_diagnostics',{}).get('retrievedSources',[])),today,symbols)
                fields=('ticker','institution','analyst','published','currency','oldTarget','newTarget')
                for item in reviewed:
                    original=next((x for x in candidates if all(x[k]==item[k] for k in fields)),None)
                    if original:verified.append({**item,'sources':list(dict.fromkeys(original['sources']+item['sources']))[:6]})
            # Refresh market history without model calls, including previously tracked targets.
            for ticker in list(dict.fromkeys(symbols+[x['ticker'] for x in archive.get('items',[])]+['SPY']))[:100]:
                try:c.request(base,'/api/prices?symbols='+ticker)
                except Exception:pass
            state['pending']={'kind':'analyst-targets','items':verified,'status':'Checked; '+str(len(verified))+' verified revisions','coveredSymbols':symbols};save(state)
            c.request(base,'/api/research/ingest',state['pending'],token);state.pop('pending');state['status']='Complete';save(state)
            print('Analyst targets: '+str(len(verified))+' verified revisions; '+str(len(symbols))+' symbols targeted')
        except Exception:
            state['status']='Failed; previous verified records retained';save(state)
            try:c.request(base,'/api/research/ingest',{'kind':'analyst-targets','items':[],'status':'Research failed; previous verified records retained','coveredSymbols':[]},token)
            except Exception:pass
            raise RuntimeError('Analyst research failed; inspect local agent run logs') from None
    finally:lock.close()
if __name__=='__main__':
    if '--stdout' in sys.argv:run()
    else:
        from contextlib import redirect_stdout,redirect_stderr
        log=PROFILE/'poor-analyst-targets.log'
        with log.open('w' if log.exists() and log.stat().st_size>1000000 else 'a',encoding='utf-8') as stream,redirect_stdout(stream),redirect_stderr(stream):run()
