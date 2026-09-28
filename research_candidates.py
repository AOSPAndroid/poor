"""Bounded, model-free candidate selection from cached public map evidence."""
import datetime, hashlib, json, re

def buying_clusters(rows,today):
    """Dated disclosure overlap, not inferred friendships or confirmed holdings."""
    import networkx as nx
    graph=nx.Graph();by_stock={};cutoff=str(today-datetime.timedelta(days=90))
    for r in rows:
        if r.get('quality')=='User-provided' or r.get('type')!='Purchase' or r.get('asset') not in ('Stock','ADR','Call options') or not r.get('person') or not str(r.get('source','')).startswith('https://'):continue
        if not cutoff<=str(r.get('traded',''))<=str(today) or not str(r.get('filed',''))<=str(today):continue
        try:
            at=datetime.date.fromisoformat(r['traded']);datetime.date.fromisoformat(r['filed'])
        except (ValueError,KeyError):continue
        symbol=r.get('ticker','')
        if not re.fullmatch(r'[A-Z][A-Z0-9.-]{0,11}',symbol):continue
        by_stock.setdefault(symbol,[]).append((at,r['person']))
        graph.add_edge(('person',r['person']),('stock',symbol))
    result={}
    for symbol,events in by_stock.items():
        best=None
        for start,_ in sorted(events):
            end=start+datetime.timedelta(days=30)
            people=sorted({person for at,person in events if start<=at<=end})
            score=(len(people),start)
            if best is None or score>best[0]:best=(score,people,start,min(end,today))
        shared={}
        for person in best[1]:
            for node in graph.neighbors(('person',person)):
                if node[1]!=symbol:shared.setdefault(node[1],set()).add(person)
        result[symbol]={'households':len(best[1]),'people':best[1],'start':str(best[2]),'end':str(best[3]),'otherSharedStocks':sorted(k for k,v in shared.items() if len(v)>=2),'method':'Distinct named political households buying within an inclusive 30-day window; past 90 days. Incomplete public coverage; no inferred personal relationship.'}
    return result

def select_candidates(rows, editions, today, fetch_map):
    cutoff=str(today-datetime.timedelta(days=365))
    buys=[r for r in rows if r.get('type')=='Purchase' and r.get('asset') in ('Stock','ADR','Call options') and cutoff<=str(r.get('traded',''))<=str(today) and str(r.get('filed',''))<=str(today) and re.fullmatch(r'[A-Z][A-Z0-9.-]{0,11}',r.get('ticker',''))]
    buys.sort(key=lambda r:str(r.get('filed','')),reverse=True)
    clusters=buying_clusters(rows,today)
    recent=list(dict.fromkeys(r['ticker'] for r in buys))
    recent.sort(key=lambda t:clusters.get(t,{}).get('households',0),reverse=True)
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
        packets.append({'ticker':ticker,'disclosures':selected,'catalysts':events[:3],'buyingCluster':clusters.get(ticker)})
    packets.sort(key=lambda p:(bool(p['catalysts']),max((e['date'] for e in p['catalysts']),default=''),max((r.get('filed','') for r in p['disclosures']),default='')),reverse=True)
    return packets[:4]

def research_fingerprint(packets):
    # Price changes alone don't justify re-writing a sourced thesis.
    return hashlib.sha256(json.dumps(packets,sort_keys=True,default=str).encode()).hexdigest()
