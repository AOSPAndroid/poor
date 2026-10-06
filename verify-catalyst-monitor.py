import datetime as dt, unittest
from catalyst_monitor import article_links,issuer_names,match_document,news_candidates
from investigations import retry_eligible,pipeline_health
class Tests(unittest.TestCase):
 def test_official_links_stay_on_source(self):
  self.assertEqual(article_links('<a href="/articles/loan">a</a><a href="https://evil.test/articles/loan">b</a>','https://www.energy.gov/newsroom'),['https://www.energy.gov/articles/loan'])
 def test_old_purchase_matches_new_catalyst(self):
  rows=[{'ticker':'VST','company':'Vistra Corp.','asset':'Stock','traded':'2020-01-01'}]
  names=issuer_names(rows);doc={'url':'https://www.energy.gov/articles/loan','title':'Nuclear loan','text':'Vistra receives conditional financing.','date':'2026-10-05'}
  self.assertEqual(match_document(doc,names,dt.date(2026,10,6))[0]['ticker'],'VST')
  doc['date']='2026-10-07';self.assertEqual(match_document(doc,names,dt.date(2026,10,6)),[])
 def test_scan_rotation_visits_all(self):
  rows=[{'ticker':s,'company':s+' company','asset':'Stock'} for s in ['AAA','BBB','CCC']]
  fetch=lambda s:{'value':{'items':[]}}
  _,a=news_candidates(rows,fetch,dt.date.today(),0,2);_,b=news_candidates(rows,fetch,dt.date.today(),a['nextOffset'],2)
  self.assertEqual(set(a['scanned']+b['scanned']),{'AAA','BBB','CCC'})
 def test_generic_words_do_not_become_company_matches(self):
  names=issuer_names([{'ticker':'SCI','company':'Service Corporation International Common Stock','asset':'Stock'},{'ticker':'MSTR','company':'Strategy','asset':'Stock'}])
  self.assertNotIn('MSTR',names)
  self.assertEqual(match_document({'url':'https://home.treasury.gov/news/press-releases/test','date':'2026-10-06','text':'Public service strategy targets fraud.'},names,dt.date(2026,10,6)),[])
 def test_failed_retries_cool_down_but_new_evidence_bypasses(self):
  candidate={'type':'stock','target':'VST','fingerprint':'a'};old={'fingerprint':'a','date':'2026-10-05','ok':False}
  cases={str(i):{'candidate':candidate.copy(),'finding':{'verdict':'unverified'}} for i in range(2)}
  self.assertFalse(retry_eligible(candidate,old,cases,'2026-10-06'))
  self.assertTrue(retry_eligible({**candidate,'fingerprint':'b'},old,cases,'2026-10-06'))
 def test_empty_verification_is_degraded(self):
  stamp=dt.datetime(2026,10,6,12,tzinfo=dt.timezone.utc).timestamp()
  cases={str(i):{'createdAt':stamp,'finding':{'verdict':'unverified'}} for i in range(2)}
  self.assertTrue(pipeline_health({'cases':cases},'2026-10-06')['degraded'])
  self.assertFalse(pipeline_health({'cases':{}},'2026-10-06')['degraded'])
if __name__=='__main__':unittest.main()
