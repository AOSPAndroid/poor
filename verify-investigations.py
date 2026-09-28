import unittest
from unittest.mock import patch
import investigations as p
import research_engine as e
class Tests(unittest.TestCase):
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
