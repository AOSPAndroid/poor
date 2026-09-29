import unittest
import datetime
from unittest.mock import patch
import investigations as p
import research_engine as e
class Tests(unittest.TestCase):
 def test_collector_reserves_morning_budget_in_paris(self):
  for month,utc_hour in ((7,6),(1,7)):
   morning=datetime.datetime(2026,month,15,utc_hour,tzinfo=datetime.timezone.utc)
   self.assertFalse(p.c.collector_monitor_only(morning))
   self.assertTrue(p.c.collector_monitor_only(morning-datetime.timedelta(seconds=1)))
 def test_sources_diversify_without_index_pages(self):
  filings=['https://disclosures-clerk.house.gov/public_disc/'+str(i)+'.pdf' for i in range(5)]
  news='https://investors.example.com/news/earnings-release'
  contrary='https://www.sec.gov/Archives/company-risk.htm'
  selected=e.select_source_urls(filings+[news,contrary,'https://disclosures-clerk.house.gov/FinancialDisclosure','https://x.com/tracker/status/1'],filings,4)
  self.assertEqual(len(selected),4)
  self.assertIn(news,selected);self.assertIn(contrary,selected)
  self.assertEqual(len(set(selected)&set(filings)),2)
 def test_sources_fill_remaining_slots_when_only_one_host(self):
  urls=['https://www.sec.gov/Archives/'+str(i) for i in range(4)]
  self.assertEqual(set(e.select_source_urls(urls,limit=4)),set(urls))
 def test_budget_persists_before_work(self):
  state={};saved=[]
  for _ in range(3):self.assertTrue(p.reserve(state,'investigations','2026-09-28',lambda s:saved.append(dict(s))))
  self.assertFalse(p.reserve(state,'investigations','2026-09-28',lambda s:None));self.assertEqual(len(saved),3)
  self.assertTrue(p.reserve(state,'investigations','2026-09-29',lambda s:None));self.assertEqual(state['investigations'],1)
  for _ in range(2):self.assertTrue(p.reserve(state,'challenges','2026-09-29',lambda s:None))
  self.assertFalse(p.reserve(state,'challenges','2026-09-29',lambda s:None))
 def test_material_odds_and_rules(self):
  context={'rules':'Exact rule','outcomes':[{'label':'Yes','price':.4}]};a=p.changed_candidate('contract','1',context)
  prior={'anchor':a['anchor']}
  b=p.changed_candidate('contract','1',{**context,'outcomes':[{'label':'Yes','price':.42}]},prior)
  self.assertEqual(a['fingerprint'],b['fingerprint'])
  c=p.changed_candidate('contract','1',{**context,'outcomes':[{'label':'Yes','price':.47}]},prior)
  self.assertNotEqual(a['fingerprint'],c['fingerprint'])
  self.assertNotEqual(a['fingerprint'],p.changed_candidate('contract','1',{**context,'rules':'Changed rule'},prior)['fingerprint'])
 def test_citations_and_independence(self):
  x=dict(verdict='supported',title='Title',whyNow='New facts',entry='Confirm first',risk='Counterargument',nextCheck='Next release',reason='Test rationale',sources=['https://www.sec.gov/filing'])
  with self.assertRaises(ValueError):p.validate_case({'case':x},set())
  self.assertEqual(p.validate_case({'review':x},set(x['sources']),'challenge',x)['verdict'],'wait')
  x['sources']=['https://www.house.gov/new'];self.assertEqual(p.validate_case({'review':x},set(x['sources']),'challenge',{'sources':['https://www.sec.gov/filing']})['verdict'],'supported')
 def test_reviewer_profile_and_only_retrieved_sources(self):
  with patch.object(e,'invoke',return_value='{"review":{}}') as invoke,patch.object(e,'discovered_evidence',return_value=[]),patch.object(e,'extract_page',return_value={'kind':'unavailable'}):
   _,allowed=e.run_report('test',{'https://www.sec.gov/blocked'},profile=p.PROFILE.parent/'athena',verified_only=True)
   self.assertFalse(allowed);self.assertEqual(invoke.call_args.args[3].name,'athena')
if __name__=='__main__':unittest.main()
