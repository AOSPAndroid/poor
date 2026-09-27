"""Bounded, model-free candidate selection from cached public map evidence."""
import datetime, hashlib, json, re

def select_candidates(rows, editions, today, fetch_map):
    cutoff=str(today-datetime.timedelta(days=365))
    buys=[r for r in rows if r.get('type')=='Purchase' and r.get('asset') in ('Stock','ADR','Call options') and cutoff<=str(r.get('traded',''))<=str(today) and str(r.get('filed',''))<=str(today) and re.fullmatch(r'[A-Z][A-Z0-9.-]{0,11}',r.get('ticker',''))]
    buys.sort(key=lambda r:str(r.get('filed','')),reverse=True)
    recent=list(dict.fromkeys(r['ticker'] for r in buys))
    tracked=list(dict.fromkeys(t for e in editions[:7] for a in e.get('articles',[]) if a.get('format')==2 for t in a.get('tickers',[]) if t in recent))
    # Include older positions on a rotating schedule without crawling the whole market.
    older=recent[4:]
    rotated=[] if not older else [older[(today.toordinal()*2+i)%len(older)] for i in range(min(2,len(older)))]
    symbols=list(dict.fromkeys(tracked[:2]+recent[:4]+rotated))[:8]
    packets=[]
    for ticker in symbols:
        try:
            graph=fetch_map(ticker)
            events=[{k:n.get(k) for k in ('kind','label','detail','date','url','status')} for n in graph.get('nodes',[]) if n.get('kind') in ('award','contract','company','policy','bill','earnings','insider') and n.get('status') in ('record','sourced') and str(today-datetime.timedelta(days=7))<=str(n.get('date',''))<=str(today) and str(n.get('url','')).startswith('https://')]
        except Exception:
            events=[]
        selected=[{k:r.get(k) for k in ('person','ticker','type','asset','owner','traded','filed','amount','source')} for r in buys if r['ticker']==ticker][:4]
        packets.append({'ticker':ticker,'disclosures':selected,'catalysts':events[:3]})
    packets.sort(key=lambda p:(bool(p['catalysts']),max((e['date'] for e in p['catalysts']),default=''),max((r.get('filed','') for r in p['disclosures']),default='')),reverse=True)
    return packets[:4]

def research_fingerprint(packets):
    # Price changes alone don't justify re-writing a sourced thesis.
    return hashlib.sha256(json.dumps(packets,sort_keys=True,default=str).encode()).hexdigest()
