"""Deterministic research screens. No model calls, trades or profit claims."""
import datetime as dt
import math
from pathlib import Path
from urllib.parse import urlparse

GUIDES = Path(__file__).with_name('agent-guides')

def guidance(kind, challenge=False):
    names = ['RESEARCH', 'CHALLENGER' if challenge else 'INVESTIGATOR']
    if kind in ('stock', 'contract'): names.append('STOCKS' if kind == 'stock' else 'CONTRACTS')
    return '\n\n'.join((GUIDES / (name + '.md')).read_text(encoding='utf-8') for name in names)

def number(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x)

def stock_snapshot(raw, benchmark, today=None):
    today = today or dt.datetime.now(dt.timezone.utc).date()
    v = raw.get('value') or {}; b = (benchmark or {}).get('value') or {}
    try:
        age = (today - dt.date.fromisoformat(v['asOf'])).days
        if raw.get('stale') or raw.get('error') or not 0 <= age <= 4: raise ValueError()
        if v.get('currency') != 'USD' or v.get('instrument') not in ('EQUITY', 'ETF'): raise ValueError()
        closes = {d:p for d,p in v.get('closes', {}).items() if number(p) and p > 0 and d <= str(today)}
        days = sorted(closes)
        if len(days) < 21 or days[-1] != v['asOf']: raise ValueError()
        last = closes[days[-1]]; bars = v.get('bars') or {}
        turnover = [closes[d] * bars[d]['volume'] for d in days[-20:] if number(bars.get(d, {}).get('volume')) and bars[d]['volume'] >= 0]
        matched = sorted(set(closes) & set(b.get('closes', {})))
        excess = None
        if not benchmark.get('stale') and not benchmark.get('error') and len(matched) >= 21 and matched[-1] == days[-1]:
            a,z=matched[-21],matched[-1]; bv=b['closes']
            if number(bv[a]) and number(bv[z]) and min(bv[a],bv[z])>0: excess=(last/closes[a]-bv[z]/bv[a])*100
        return {'available':True, 'asOf':v['asOf'], 'close':last, 'currency':'USD', 'source':v.get('source'),
                'return20Pct':(last/closes[days[-21]]-1)*100, 'excess20SPYPctPoints':excess,
                'low20Close':min(closes[d] for d in days[-20:]), 'high20Close':max(closes[d] for d in days[-20:]),
                'average20DollarTurnover':sum(turnover)/20 if len(turnover)==20 else None,
                'method':'Completed daily closes; SPY price-return proxy; no dividends. Turnover = close times volume.'}
    except (KeyError, TypeError, ValueError):
        return {'available':False, 'reason':'Fresh USD equity/ETF history with 21 completed closes unavailable.'}

def contract_rank(m):
    yes=next((o.get('price') for o in m.get('outcomes',[]) if o.get('label')=='Yes'),None)
    return (bool(m.get('rules') and m.get('resolutionSource')), number(yes) and .05 <= yes <= .95, m.get('liquidity') or 0)

def price_condition(assessment, market):
    plan=assessment.get('stock') or {}
    if not market.get('available') or not all(number(plan.get(k)) for k in ('entry','stop','target')) or plan.get('trigger') not in ('above','below'): return None
    close=market['close']
    if close<=plan['stop']:return 'invalidation crossed'
    if close>=plan['target']:return 'scenario target crossed'
    met=close>=plan['entry'] if plan['trigger']=='above' else close<=plan['entry']
    return 'entry met' if met else 'waiting for entry'

def order_candidates(candidates):
    ordered=sorted(candidates,key=lambda x:x['priority'],reverse=True)
    # Reserve room for one daily news brief and one contract, without raising the budget.
    chosen=[]
    for kind in ('stock','contract','briefing'):
        item=next((x for x in ordered if x['type']==kind),None)
        if item: chosen.append(item)
    return chosen+[x for x in ordered if x not in chosen]

def screen_case(report, finding, candidate, allowed, challenge=False, today=None):
    """Downgrade unsupported entries; URL membership is provenance, not fact verification."""
    if finding['verdict'] != 'supported' or candidate['type']=='briefing': return finding
    today=today or dt.datetime.now(dt.timezone.utc).date()
    raw=report.get('review' if challenge else 'case',{})
    a=raw.get('assessment') or {}; reasons=[]; entry=finding['entry']
    decisive=a.get('decisiveSources')
    retrieved=set(report.get('_diagnostics',{}).get('retrievedSources',[]))
    excluded={'x.com','twitter.com','polymarket.com','wikipedia.org'}
    def primary_eligible(u):
        host=urlparse(u).hostname or ''
        return not any(host==d or host.endswith('.'+d) for d in excluded)
    if not isinstance(decisive,list) or not decisive or not all(isinstance(u,str) and u in allowed and u in finding['sources'] and u in retrieved and primary_eligible(u) for u in decisive):
        reasons.append('Decisive documents are not retrieved and cited.')
    try:
        date=dt.date.fromisoformat(a.get('catalystDate','')); days=(date-today).days
        if not 0<=days<=90: raise ValueError()
    except (ValueError,TypeError): reasons.append('No verified catalyst within 90 calendar days.')
    context=candidate['context']
    if candidate['type']=='stock':
        market=context.get('market',{}); plan=a.get('stock') or {}
        values=[plan.get(k) for k in ('entry','stop','target')]
        if not market.get('available'): reasons.append('Fresh price history unavailable.')
        elif not number(market.get('average20DollarTurnover')) or market['average20DollarTurnover']<1000000:
            reasons.append('20-session dollar-turnover screen not met ($1m).')
        if not all(number(v) and v>0 for v in values) or plan.get('trigger') not in ('above','below') or len(str(a.get('levelBasis',''))) < 30:
            reasons.append('Evidence-based entry, stop and target are incomplete.')
        elif market.get('available'):
            proposed,stop,target=values; close=market['close']; paid=max(close,proposed)
            if not stop<min(close,proposed)<target or target<=paid:
                reasons.append('Stop or target already crossed, or levels inconsistent.')
            else:
                reward=target*.999-paid*1.001; risk=paid*1.001-stop*.999
                rr=reward/risk
                met=close>=proposed if plan['trigger']=='above' else close<=proposed
                entry=f"{'Entry condition met at last close' if met else 'Wait for entry'}: {plan['trigger']} ${proposed:g}; stop ${stop:g}; scenario target ${target:g}. Reward/risk {rr:.2f}:1 at worse of entry/close, 10 bps/side; {market['asOf']}. No fill assumed."
                if rr<2: reasons.append('Reward/risk below the 2:1 research screen after assumed costs.')
                if not met: reasons.append('Entry condition not met at the completed close.')
    else:
        plan=a.get('contract') or {}; outcome=plan.get('outcome'); quote=context.get('quotes',{}).get(outcome,{})
        lo,hi=plan.get('probabilityLow'),plan.get('probabilityHigh')
        if plan.get('rulesVerified') is not True: reasons.append('Exact resolution rules not verified.')
        if not all(number(v) for v in (lo,hi)) or not 0<=lo<=hi<=1 or len(str(plan.get('probabilityMethod','')))<60:
            reasons.append('No defensible, sourced probability interval.')
        elif quote.get('available'):
            ask,bid=quote['ask'],quote['bid']; margin=(lo-ask)*100
            entry=f"{outcome} ask {ask*100:.1f}c / bid {bid*100:.1f}c. Research probability range {lo*100:.1f}-{hi*100:.1f}%; lower-bound margin {margin:.1f}pp before fees. Uncalibrated estimate; net edge unverified."
            if margin<=0: reasons.append('Lower probability bound does not exceed the executable ask.')
            if ask-bid>.05: reasons.append('Spread exceeds five percentage points.')
        else: reasons.append('Fresh two-sided executable quote unavailable.')
        # Current quote API does not expose fee schedules: never claim net edge.
        reasons.append('Fees and probability calibration are not verified; no net edge established.')
    result={**finding,'entry':entry[:400]}
    if reasons: result.update(verdict='wait',reason=('Checks: '+' '.join(reasons))[:400])
    return result
