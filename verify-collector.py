import importlib.util,json,types,unittest
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('collector','collect-research.py');c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)
class FallbackTests(unittest.TestCase):
 def test_health(self):
  self.assertEqual(c.feed_problem({'value':{'unavailable':True}}),'not connected')
  self.assertTrue(c.feed_problem({'INTC':{'stale':True,'value':{'latest':10}}}))
  self.assertTrue(c.feed_problem({'value':{'providerCurrent':False}}))
  self.assertIsNone(c.feed_problem({'value':{'items':[]}}))
 def test_provenance_and_cooldown(self):
  url='https://www.sec.gov/Archives/example';report={'symbol':'INTC','items':[{'title':'Filing','summary':'Intel source lead','url':url,'published':'2026-01-01'},{'title':'Invented','summary':'Bad','url':'https://evil.example/','published':None}]}
  result=types.SimpleNamespace(returncode=0,stdout=json.dumps(report),stderr='session_id: 20260927_090000_abc')
  state={};failures=['/api/research?symbol=INTC&source=sec']
  with patch.object(c.subprocess,'run',return_value=result) as agent,patch.object(c,'cited_urls',return_value={url,'https://evil.example/'}),patch.object(c,'request') as send:
   self.assertIn('1 primary-source leads',c.fallback_research(failures,state,'https://test','test-ingest-secret-123'))
   self.assertEqual(len(send.call_args.args[2]['items']),1)
   self.assertNotIn('test-ingest-secret-123',agent.call_args.kwargs['input'])
   self.assertIn('No eligible',c.fallback_research(failures,state,'https://test','test-ingest-secret-123'));self.assertEqual(agent.call_count,1)
 def test_no_citations_no_publish(self):
  r=types.SimpleNamespace(returncode=0,stdout=json.dumps({'symbol':'INTC','items':[{'title':'x','summary':'x','url':'https://www.sec.gov/x','published':None}]}),stderr='')
  with patch.object(c.subprocess,'run',return_value=r),patch.object(c,'request') as send:
   self.assertIn('0 primary-source leads',c.fallback_research(['/api/research?symbol=INTC&source=sec'],{},'https://test','test-ingest-secret-123'));send.assert_not_called()
 def test_failure(self):
  with patch.object(c.subprocess,'run',side_effect=TimeoutError):self.assertIn('unsuccessful',c.fallback_research(['/api/research?symbol=INTC&source=sec'],{},'https://test','test-ingest-secret-123'))
if __name__=='__main__':unittest.main()

