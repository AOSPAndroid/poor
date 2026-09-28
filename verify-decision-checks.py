import datetime as dt
import unittest
from decision_checks import stock_snapshot, screen_case, order_candidates, contract_rank, guidance, price_condition, decisive_evidence_retrieved
from research_engine import source_priority

class DecisionTests(unittest.TestCase):
    today=dt.date(2026,9,28)
    url='https://www.sec.gov/Archives/example'
    def fixture(self):
        finding=dict(verdict='supported',title='Test',whyNow='Dated catalyst',entry='Original condition',risk='Risk',nextCheck='Event',reason='Hypothesis',sources=[self.url])
        assessment={'decisiveSources':[self.url],'catalystDate':'2026-10-01','levelBasis':'Conditional range breakout using the supplied completed closes.', 'stock':{'trigger':'above','entry':100,'stop':95,'target':125}}
        report={'case':{'assessment':assessment},'_diagnostics':{'retrievedSources':[self.url]}}
        candidate={'type':'stock','context':{'market':{'available':True,'close':101,'asOf':'2026-09-25','average20DollarTurnover':2000000}}}
        return report,finding,candidate
    def test_missing_primary_and_stale_price_cannot_pass(self):
        r,f,c=self.fixture();r['_diagnostics']['retrievedSources']=[];c['context']['market']={'available':False}
        out=screen_case(r,f,c,{self.url},today=self.today)
        self.assertEqual(out['verdict'],'wait');self.assertIn('Decisive',out['reason']);self.assertIn('Fresh',out['reason'])
    def test_publication_requires_actual_decisive_retrieval_even_for_wait(self):
        r,f,c=self.fixture();f['verdict']='wait'
        self.assertTrue(decisive_evidence_retrieved(r,f,{self.url}))
        r['_diagnostics']['retrievedSources']=[]
        self.assertFalse(decisive_evidence_retrieved(r,f,{self.url}))
        r['_diagnostics']['retrievedSources']=[self.url];f['sources']=[]
        self.assertFalse(decisive_evidence_retrieved(r,f,{self.url}))
    def test_entry_and_risk_math(self):
        r,f,c=self.fixture()
        out=screen_case(r,f,c,{self.url},today=self.today)
        self.assertEqual(out['verdict'],'supported');self.assertIn('3.84:1',out['entry'])
        c['context']['market']['close']=99
        self.assertEqual(screen_case(r,f,c,{self.url},today=self.today)['verdict'],'wait')
        c['context']['market']['close']=124
        self.assertIn('below the 2:1',screen_case(r,f,c,{self.url},today=self.today)['reason'])
        c['context']['market']['close']=94
        self.assertIn('already crossed',screen_case(r,f,c,{self.url},today=self.today)['reason'])
    def test_contract_margin_not_claimed_as_net_edge(self):
        r,f,c=self.fixture();c={'type':'contract','context':{'quotes':{'Yes':{'available':True,'ask':.6,'bid':.58}}}}
        r['case']['assessment']['contract']={'outcome':'Yes','rulesVerified':True,'probabilityLow':.65,'probabilityHigh':.8,'probabilityMethod':'Explicit empirical sample and assumptions with a reproducible calculation and source.'}
        out=screen_case(r,f,c,{self.url},today=self.today)
        self.assertEqual(out['verdict'],'wait');self.assertIn('5.0pp before fees',out['entry']);self.assertIn('calibration',out['reason'])
    def test_snapshot_matching_missing_and_stale(self):
        closes={str(self.today-dt.timedelta(days=21-i)):100+i for i in range(21)}
        last=max(closes);v={'currency':'USD','instrument':'EQUITY','asOf':last,'closes':closes,'bars':{d:{'volume':10000} for d in closes}}
        r=stock_snapshot({'value':v},{'value':v},self.today)
        self.assertTrue(r['available']);self.assertEqual(r['excess20SPYPctPoints'],0)
        self.assertFalse(stock_snapshot({'value':v,'stale':True},{'value':v},self.today)['available'])
        self.assertFalse(stock_snapshot({'value':{**v,'currency':'EUR'}},{},self.today)['available'])
        self.assertIsNone(stock_snapshot({'value':v},{},self.today)['excess20SPYPctPoints'])
    def test_news_has_budget_slot_and_extremes_do_not_dominate(self):
        candidates=[{'type':'stock','priority':10,'target':str(i)} for i in range(4)]+[{'type':'contract','priority':7},{'type':'briefing','priority':1}]
        self.assertEqual([c['type'] for c in order_candidates(candidates)[:3]],['stock','contract','briefing'])
        def m(price):return {'rules':'rules','resolutionSource':'source','outcomes':[{'label':'Yes','price':price}],'liquidity':2000}
        self.assertGreater(contract_rank(m(.5)),contract_rank(m(.003)))
    def test_guides_and_source_priority(self):
        self.assertIn('Independent challenger',guidance('contract',True));self.assertIn('Swing stocks',guidance('stock'))
        original='https://portwatch.imf.org/data'
        self.assertLess(source_priority(original,{original}),source_priority('https://en.wikipedia.org/wiki/Event'))
    def test_price_crossing_states(self):
        r,f,c=self.fixture();a=r['case']['assessment'];m=c['context']['market']
        self.assertEqual(price_condition(a,m),'entry met')
        self.assertEqual(price_condition(a,{**m,'close':99}),'waiting for entry')
        self.assertEqual(price_condition(a,{**m,'close':94}),'invalidation crossed')
        self.assertEqual(price_condition(a,{**m,'close':126}),'scenario target crossed')
        self.assertIsNone(price_condition(a,{'available':False}))

if __name__=='__main__':unittest.main()
