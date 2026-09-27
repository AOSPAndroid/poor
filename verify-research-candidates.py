import datetime, unittest
from research_candidates import select_candidates, research_fingerprint

class CandidateTests(unittest.TestCase):
    def test_bounded_and_new_catalyst(self):
        today=datetime.date(2026,9,27)
        rows=[dict(person='Person',ticker='ST'+chr(65+i),type='Purchase',asset='Stock',traded='2026-07-01',filed='2026-08-01',source='https://house.gov/filing') for i in range(15)]
        calls=[]
        def fetch(ticker):
            calls.append(ticker)
            return {'nodes':[dict(kind='company',status='sourced',date='2026-09-26',url='https://sec.gov/new',label='New contract')] if ticker=='STA' else []}
        result=select_candidates(rows,[],today,fetch)
        self.assertLessEqual(len(calls),8);self.assertLessEqual(len(result),4);self.assertEqual(result[0]['ticker'],'STA')
        self.assertEqual(research_fingerprint(result),research_fingerprint(result))
        result[0]['catalysts'][0]['date']='2026-09-27';self.assertNotEqual(research_fingerprint(result),research_fingerprint(select_candidates(rows,[],today,fetch)))
    def test_unverified_and_future_excluded(self):
        today=datetime.date(2026,9,27);rows=[dict(ticker='TEST',type='Purchase',asset='Stock',traded='2026-07-01',filed='2026-08-01')]
        result=select_candidates(rows,[],today,lambda t:{'nodes':[dict(kind='policy',status='candidate',date='2026-09-26',url='https://congress.gov/test'),dict(kind='company',status='sourced',date='2026-10-01',url='https://sec.gov/new')]})
        self.assertEqual(result[0]['catalysts'],[])

if __name__=='__main__':unittest.main()
